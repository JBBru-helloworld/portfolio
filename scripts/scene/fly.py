"""Fly-through image sequence (scrubbed by scroll): segment, fisheye fix, crop, grade, export frames."""
from __future__ import annotations

import tempfile
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

from common import CLOUD_CURVE_X, CLOUD_CURVE_Y, FLY_SRC, PUBLIC, clean_dir, ffmpeg, file_entry, monotone_curve

OUT = PUBLIC / "fly"

# Segment (source frames at 24 fps): in = 16 (sun hidden behind the cloud wall, entering the cloud),
# out = 78 (just emerged above the clouds, sun still in mist; it becomes a hard disc from frame 82).
SEGMENT = (16, 78)

# Radial fisheye correction applied to the full frame before cropping (gentle; k1 > 0 straightens
# this lens's barrel curve; measured on the emergence frames).
FISHEYE_K1 = 0.06

# Crops in corrected source pixels. Propeller blade tips reach x ~220 (left) and ~1000 (right); the
# drone body starts at y ~636. Desktop is 16:9 and holds the horizon and sun at emergence.
CROP_DESKTOP = {"x": 280, "y": 128, "w": 680, "h": 382}
CROP_MOBILE = {"x": 444, "y": 14, "w": 352, "h": 586}

DESKTOP_FRAMES = 84    # 63 source frames interpolated to 84
MOBILE_FRAMES = 48     # sampled evenly from the 63 source frames
DESKTOP_SIZE = (1920, 1078)
MOBILE_SIZE = (650, 1080)

DEBLOCK_PASSES = 2     # light, edge-preserving denoise (bilateral)
DEBLOCK_SIGMA_COLOUR = 0.035
BLOOM_THRESHOLD = 0.86 # source luminance above this is treated as hard sun and softened
AVIF_QUALITY, WEBP_QUALITY = 66, 80

# Colour: with the v2 cloud loop the sequence opens in the loop's soft blue (its average chroma per
# luminance level, measured by clouds_v2) and fades to monochrome; fully grey from this fraction on.
TINT_GONE_AT = 0.85


def _undistort(img: np.ndarray, k1: float) -> np.ndarray:
    h, w = img.shape[:2]
    cx, cy = w / 2, h / 2
    r0 = np.hypot(cx, cy)
    yy, xx = np.indices((h, w), dtype=np.float32)
    dx, dy = (xx - cx) / r0, (yy - cy) / r0
    f = 1 + k1 * (dx * dx + dy * dy)
    return cv2.remap(img, (cx + dx * f * r0).astype(np.float32), (cy + dy * f * r0).astype(np.float32),
                     cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REFLECT)


def read_segment() -> list[np.ndarray]:
    cap = cv2.VideoCapture(str(FLY_SRC))
    frames = []
    i = 0
    while True:
        ok, f = cap.read()
        if not ok:
            break
        if SEGMENT[0] <= i <= SEGMENT[1]:
            frames.append(f)
        i += 1
    if len(frames) != SEGMENT[1] - SEGMENT[0] + 1:
        raise RuntimeError(f"expected {SEGMENT[1] - SEGMENT[0] + 1} frames, read {len(frames)}")
    return frames


def crop(frame: np.ndarray, c: dict) -> np.ndarray:
    return frame[c["y"]: c["y"] + c["h"], c["x"]: c["x"] + c["w"]]


def grade(bgr: np.ndarray, size: tuple[int, int], rng: np.random.Generator,
          tint: np.ndarray | None = None, amount: float = 0.0) -> Image.Image:
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB).astype(np.float32) / 255
    lum = rgb[..., 0] * 0.2126 + rgb[..., 1] * 0.7152 + rgb[..., 2] * 0.0722
    # Deblock: an edge-preserving smooth flattens the source's H.264 macroblock steps in the sky
    # (small intensity differences) while keeping cloud edges (large ones).
    for _ in range(DEBLOCK_PASSES):
        lum = cv2.bilateralFilter(lum, d=9, sigmaColor=DEBLOCK_SIGMA_COLOUR, sigmaSpace=6)
    # Soften the sun: replace the hottest area with a heavily blurred version of itself, plus a faint bloom.
    hot = np.clip((lum - BLOOM_THRESHOLD) / (1 - BLOOM_THRESHOLD), 0, 1)
    weight = np.clip(cv2.GaussianBlur(hot, (0, 0), 10) * 2.5, 0, 1)
    soft = cv2.GaussianBlur(lum, (0, 0), 14)
    lum = lum * (1 - weight) + soft * weight
    lum = np.clip(lum + cv2.GaussianBlur(hot, (0, 0), 30) * 0.08, 0, 1)  # faint bloom around it
    # Curve and upscale in float, then a sub-level (TPDF, +-1 LSB peak) dither so gradients cannot band.
    lum = monotone_curve(lum, CLOUD_CURVE_X, CLOUD_CURVE_Y).astype(np.float32)
    up = cv2.resize(lum, size, interpolation=cv2.INTER_LANCZOS4)
    if tint is None or amount <= 0:
        dither = (rng.random(up.shape, dtype=np.float32) - rng.random(up.shape, dtype=np.float32)) / 255
        grey = np.clip(np.round((up + dither) * 255), 0, 255).astype(np.uint8)
        return Image.fromarray(grey, "L").convert("RGB")
    bins = np.linspace(0, 1, len(tint), endpoint=False) + 0.5 / len(tint)
    chroma = np.dstack([np.interp(up, bins, tint[:, ch]) for ch in range(3)]).astype(np.float32)
    rgb = up[..., None] + chroma * amount
    dither = (rng.random(rgb.shape, dtype=np.float32) - rng.random(rgb.shape, dtype=np.float32)) / 255
    return Image.fromarray(np.clip(np.round((rgb + dither) * 255), 0, 255).astype(np.uint8), "RGB")


def _tint_amount(position: float) -> float:
    """1 at the first frame, 0 from TINT_GONE_AT on (position is 0..1 along the sequence)."""
    t = min(max(position / TINT_GONE_AT, 0.0), 1.0)
    return 1.0 - t * t * (3 - 2 * t)


def _save(im: Image.Image, folder: Path, stem: str, kind: str, entries: list) -> None:
    for fmt, ext, opts in (("AVIF", "avif", {"quality": AVIF_QUALITY, "speed": 5}),
                           ("WEBP", "webp", {"quality": WEBP_QUALITY, "method": 6})):
        path = folder / f"{stem}.{ext}"
        im.save(path, fmt, **opts)
        entries.append(file_entry(path, kind, format=ext, width=im.width, height=im.height))


def _interpolate(frames: list[np.ndarray], n_out: int, work: Path) -> list[np.ndarray]:
    """Motion-compensated interpolation of a short crop sequence to n_out frames."""
    src = work / "src"
    src.mkdir()
    # Pad with copies of the last frame: minterpolate stops at the last input timestamp.
    for i, f in enumerate(frames + [frames[-1]] * 3):
        cv2.imwrite(str(src / f"{i:04d}.png"), f)
    fps = 24 * n_out / len(frames)  # ffmpeg counts the clip by duration: len(frames) / 24 s
    dst = work / "dst"
    dst.mkdir()
    ffmpeg("-framerate", "24", "-i", str(src / "%04d.png"),
           "-vf", f"minterpolate=fps={fps:.5f}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1",
           "-frames:v", str(n_out), str(dst / "%04d.png"))
    out = [cv2.imread(str(p)) for p in sorted(dst.glob("*.png"))]
    if len(out) < n_out:
        raise RuntimeError(f"interpolation produced {len(out)} frames, expected {n_out}")
    return out[:n_out]


def build(tint: list | None = None) -> dict:
    """tint: the cloud loop's chroma-per-luminance table (clouds_v2); None keeps the sequence grey."""
    lut = None if tint is None else np.asarray(tint, np.float32)
    clean_dir(OUT)
    for sub in ("desktop", "mobile", "stills"):
        (OUT / sub).mkdir()
    rng = np.random.default_rng(2026)  # fixed seed: reproducible output
    corrected = [_undistort(f, FISHEYE_K1) for f in read_segment()]
    entries: list = []

    with tempfile.TemporaryDirectory() as tmp:
        desk_src = _interpolate([crop(f, CROP_DESKTOP) for f in corrected], DESKTOP_FRAMES, Path(tmp))
    desktop = [grade(f, DESKTOP_SIZE, rng, lut, _tint_amount(i / (len(desk_src) - 1)))
               for i, f in enumerate(desk_src)]
    for i, im in enumerate(desktop, 1):
        _save(im, OUT / "desktop", f"fly-{i:04d}", "fly-desktop", entries)

    idx = np.round(np.linspace(0, len(corrected) - 1, MOBILE_FRAMES)).astype(int)
    mobile = [grade(crop(corrected[i], CROP_MOBILE), MOBILE_SIZE, rng, lut, _tint_amount(i / (len(corrected) - 1)))
              for i in idx]
    for i, im in enumerate(mobile, 1):
        _save(im, OUT / "mobile", f"fly-{i:04d}", "fly-mobile", entries)

    # Stills for reduced motion: the brightest mist frame from the middle third, and the final frame.
    third = len(desktop) // 3
    mids = [np.asarray(im.convert("L"), dtype=np.float32).mean() for im in desktop[third: 2 * third]]
    w_desk = third + int(np.argmax(mids))
    w_mob = int(round(w_desk * (MOBILE_FRAMES - 1) / (DESKTOP_FRAMES - 1)))
    for tier, seq, wi in (("desktop", desktop, w_desk), ("mobile", mobile, w_mob)):
        _save(seq[wi], OUT / "stills", f"whiteout-{tier}", "fly-still", entries)
        _save(seq[-1], OUT / "stills", f"final-{tier}", "fly-still", entries)

    return {
        "segment": {"inFrame": SEGMENT[0], "outFrame": SEGMENT[1], "sourceFps": 24},
        "fisheyeK1": FISHEYE_K1,
        "crop": {"desktop": CROP_DESKTOP, "mobile": CROP_MOBILE},
        "frames": {"desktop": len(desktop), "mobile": len(mobile)},
        "pattern": {"desktop": "/scene/fly/desktop/fly-{n}.avif", "mobile": "/scene/fly/mobile/fly-{n}.avif",
                    "pad": 4, "fallbackExtension": "webp"},
        "whiteoutIndex": {"desktop": w_desk + 1, "mobile": w_mob + 1},
        "tint": None if lut is None else {"from": "clouds-v2", "goneAt": TINT_GONE_AT},
        "files": entries,
    }
