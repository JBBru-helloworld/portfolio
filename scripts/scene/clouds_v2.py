"""Cloud loop v2 (owner's naturally blue clip): crop the black border, restore brightness, grade to a soft,
muted, cool look, retime, loop seamlessly, encode. The view is the landing's one colour exception.

Settings below (or env SCENE_CLOUD_SATURATION, SCENE_CLOUD_HUE, SCENE_CLOUD_SPEED) control the look.
"""
from __future__ import annotations

import os
import subprocess
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image

from common import CLOUDS_V2_SRC, PUBLIC, clean_dir, codec_string, ffmpeg, file_entry, monotone_curve, probe

OUT = PUBLIC / "clouds-v2"

# Source 3840x2160 has a constant black border; the picture is x 441..3398, y 148..2011 (all 880 frames).
# A 4 px inset keeps the border's soft edge out. The window only ever shows a ~0.79 aspect view, so a
# centred 4:5 crop of the picture is encoded (nothing visible is lost; half the pixels are saved).
PICTURE = {"x": 445, "y": 152, "w": 2950, "h": 1856}
ASPECT = 4 / 5
CROP_X_BIAS = 0.5      # 0 = left edge of the picture, 1 = right edge
DESKTOP_SIZE = (960, 1200)
MOBILE_SIZE = (640, 800)
DENOISE = "hqdn3d=1:1:3:3"

# Brightness: the export peaks at luma 182 of 255 (whites dimmed to ~71%). Levels map 184 -> 255, so
# nothing clips, then a soft curve: lifted blacks, rolled-off whites (max 0.93), dreamy rather than crisp.
WHITE_IN = 184 / 255
LUMA_X = np.array([0.00, 0.20, 0.45, 0.70, 0.90, 1.00])
LUMA_Y = np.array([0.10, 0.26, 0.50, 0.72, 0.87, 0.93])
# Colour: chroma kept as a fraction of the source's (0.25..0.40 is the intended range), optional hue turn.
SATURATION = float(os.environ.get("SCENE_CLOUD_SATURATION", "0.40"))  # owner chose 40% (Phase 2c)
HUE_SHIFT_DEG = float(os.environ.get("SCENE_CLOUD_HUE", "0"))
SATURATION_SHEET = (0.25, 0.32, 0.40)

SPEED = float(os.environ.get("SCENE_CLOUD_SPEED", "0.75"))  # 1.0 = as shot; 0.75 = calmer drift
FPS = 24
LOOP_XFADE = float(os.environ.get("SCENE_LOOP_XFADE", "1.0"))

# Encoder settings (old targets: desktop < 2.5 MB, mobile < 1.2 MB per file).
H264_CRF_DESKTOP, H264_CRF_MOBILE = 27, 27
AV1_CRF_DESKTOP, AV1_CRF_MOBILE = 42, 43
POSTER_AT = 0.5
AVIF_QUALITY, WEBP_QUALITY = 70, 82
TINT_BINS = 32

# Intermediates: near-lossless 10-bit 4:4:4 H.264 (a lossless 16-bit chain needs several GB of disk).
# Every RGB/YUV conversion is explicitly BT.709, so colour cannot shift between stages.
BT709 = ["-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-color_range", "tv"]
INTERMEDIATE = ["-c:v", "libx264", "-preset", "fast", "-crf", "4", "-pix_fmt", "yuv444p10le", *BT709]


def crop_box() -> dict:
    w = int(round(PICTURE["h"] * ASPECT / 2) * 2)
    x = PICTURE["x"] + int(round((PICTURE["w"] - w) * CROP_X_BIAS))
    return {"x": x, "y": PICTURE["y"], "w": w, "h": PICTURE["h"]}


def grade(rgb: np.ndarray, saturation: float = SATURATION, hue_deg: float = HUE_SHIFT_DEG) -> np.ndarray:
    """Float RGB 0..1 in, graded float RGB out. Luma follows the curve; chroma is scaled (and turned)."""
    rgb = rgb / WHITE_IN
    y = rgb @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    chroma = rgb - y[..., None]
    if hue_deg:
        # Rotate chroma about the grey axis (Rodrigues; axis (1,1,1)/sqrt3, chroma is orthogonal to it).
        k = np.ones(3, np.float32) / np.sqrt(3)
        t = np.deg2rad(hue_deg)
        chroma = chroma * np.cos(t) + np.cross(k, chroma) * np.sin(t)
    y2 = monotone_curve(y, LUMA_X, LUMA_Y).astype(np.float32)
    # Keep chroma proportionate to the new luma so lifted shadows do not read as grey haze.
    gain = np.where(y > 1e-3, y2 / np.maximum(y, 1e-3), 1.0)[..., None] ** 0.5
    return np.clip(y2[..., None] + chroma * saturation * gain, 0, 1)


def _frames(size: tuple[int, int]):
    """Yield cropped, scaled float RGB frames (16-bit pipe, so the levels lift cannot band)."""
    c = crop_box()
    w, h = size
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(CLOUDS_V2_SRC), "-an", "-vf",
           f"crop={c['w']}:{c['h']}:{c['x']}:{c['y']},{DENOISE},"
           f"scale={w}:{h}:flags=lanczos:in_color_matrix=bt709:in_range=tv,format=rgb48le",
           "-f", "rawvideo", "-"]
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    n = w * h * 3 * 2
    try:
        while True:
            buf = proc.stdout.read(n)
            if len(buf) < n:
                break
            yield np.frombuffer(buf, np.uint16).reshape(h, w, 3).astype(np.float32) / 65535
    except GeneratorExit:  # a caller that only needs a few frames: stop the decoder quietly
        proc.kill()
        proc.wait()
        raise
    if proc.wait() != 0:
        raise RuntimeError("ffmpeg decode of clouds-v2 failed")


def graded_intermediate(work: Path) -> tuple[Path, np.ndarray]:
    """Grade every frame into a 10-bit intermediate at source rate. Returns (path, tint LUT)."""
    w, h = DESKTOP_SIZE
    fps = probe(CLOUDS_V2_SRC)["streams"][0]["r_frame_rate"]
    out = work / "graded.mkv"
    enc = subprocess.Popen(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "rawvideo",
                            "-pix_fmt", "rgb48le", "-s", f"{w}x{h}", "-r", fps, "-i", "-",
                            "-vf", "scale=out_color_matrix=bt709:out_range=tv", *INTERMEDIATE, str(out)],
                           stdin=subprocess.PIPE)
    sums = np.zeros((TINT_BINS, 3)); counts = np.zeros(TINT_BINS)
    for i, f in enumerate(_frames(DESKTOP_SIZE)):
        g = grade(f)
        if i % 30 == 0:
            y = g @ np.array([0.2126, 0.7152, 0.0722])
            b = np.clip((y * TINT_BINS).astype(int), 0, TINT_BINS - 1).ravel()
            np.add.at(sums, b, (g - y[..., None]).reshape(-1, 3))
            np.add.at(counts, b, 1)
        enc.stdin.write(np.round(g * 65535).astype(np.uint16).tobytes())
    enc.stdin.close()
    if enc.wait() != 0:
        raise RuntimeError("ffv1 encode of graded clouds-v2 failed")
    # Average chroma per graded-luma bin: the loop's "soft blue", reused to tint the fly-through.
    tint = np.where(counts[:, None] > 0, sums / np.maximum(counts[:, None], 1), 0)
    idx = np.nonzero(counts > 50)[0]
    for ch in range(3):
        tint[:, ch] = np.interp(np.arange(TINT_BINS), idx, tint[idx, ch])
    return out, tint.astype(np.float32)


def retime(graded: Path, work: Path, speed: float = SPEED) -> tuple[Path, float]:
    out = work / f"speed-{speed}.mkv"
    vf = [f"setpts={1 / speed:.5f}*PTS"]
    vf.append(f"minterpolate=fps={FPS}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1" if speed != 1.0
              else f"fps={FPS}")
    ffmpeg("-i", str(graded), "-vf", ",".join(vf), "-an", *INTERMEDIATE, str(out))
    graded.unlink()
    return out, float(probe(out)["format"]["duration"])


def seamless_loop(src: Path, duration: float, work: Path, xfade: float = LOOP_XFADE) -> tuple[Path, float]:
    """Cross-fade the tail into the head so the loop point is invisible. Output length = D - T."""
    t = xfade
    out = work / f"loop-{src.stem}.mkv"
    fc = (
        f"[0:v]trim=start={t}:end={duration},setpts=PTS-STARTPTS[a];"
        f"[0:v]trim=start=0:end={t},setpts=PTS-STARTPTS[b];"
        f"[a][b]xfade=transition=fade:duration={t}:offset={duration - 2 * t}[v]"
    )
    ffmpeg("-i", str(src), "-filter_complex", fc, "-map", "[v]", "-an", *INTERMEDIATE, str(out))
    return out, float(probe(out)["format"]["duration"])


def encode(loop: Path, entries: list) -> None:
    for tier, size, h264_crf, av1_crf in (
        ("desktop", DESKTOP_SIZE, H264_CRF_DESKTOP, AV1_CRF_DESKTOP),
        ("mobile", MOBILE_SIZE, H264_CRF_MOBILE, AV1_CRF_MOBILE),
    ):
        scale = [] if size == DESKTOP_SIZE else ["-vf", f"scale={size[0]}:{size[1]}:flags=lanczos"]
        # (4:4:4 10-bit to 4:2:0 8-bit stays in YUV, so the BT.709 matrix carries through unchanged.)
        mp4 = OUT / f"clouds-{tier}.mp4"
        ffmpeg("-i", str(loop), *scale, "-an", "-c:v", "libx264", "-preset", "veryslow", "-crf", str(h264_crf),
               "-pix_fmt", "yuv420p", "-profile:v", "high", "-tune", "film", "-movflags", "+faststart",
               "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", str(mp4))
        webm = OUT / f"clouds-{tier}.webm"
        ffmpeg("-i", str(loop), *scale, "-an", "-c:v", "libsvtav1", "-preset", "5", "-crf", str(av1_crf),
               "-pix_fmt", "yuv420p", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
               str(webm))
        for path, fmt, codec in ((mp4, "mp4", "h264"), (webm, "webm", "av1")):
            info = probe(path)["streams"][0]
            entries.append(file_entry(path, f"clouds-{tier}", format=fmt, codec=codec,
                                      width=info["width"], height=info["height"],
                                      mime=f'video/{fmt}; codecs="{codec_string(path)}"'))


def poster(loop: Path, duration: float, entries: list) -> None:
    png = loop.with_suffix(".poster.png")
    ffmpeg("-ss", f"{duration * POSTER_AT:.3f}", "-i", str(loop), "-frames:v", "1",
           "-vf", "scale=in_color_matrix=bt709:in_range=tv,format=rgb24", str(png))
    im = Image.open(png).convert("RGB")
    for fmt, ext, opts in (("AVIF", "avif", {"quality": AVIF_QUALITY, "speed": 4}),
                           ("WEBP", "webp", {"quality": WEBP_QUALITY, "method": 6})):
        path = OUT / f"clouds-poster.{ext}"
        im.save(path, fmt, **opts)
        entries.append(file_entry(path, "clouds-poster", format=ext, width=im.width, height=im.height))


def build(work_dir: Path | None = None) -> dict:
    """work_dir: keep intermediates there (QA reuses them); otherwise a temporary directory."""
    clean_dir(OUT)
    entries: list = []
    with tempfile.TemporaryDirectory() as tmp:
        work = work_dir or Path(tmp)
        work.mkdir(parents=True, exist_ok=True)
        graded, tint = graded_intermediate(work)
        timed, d = retime(graded, work)
        loop, loop_d = seamless_loop(timed, d, work)
        timed.unlink()
        encode(loop, entries)
        poster(loop, loop_d, entries)
    return {
        "pipeline": "v2",
        "durationSeconds": round(loop_d, 3),
        "fps": FPS,
        "speed": SPEED,
        "crossfadeSeconds": LOOP_XFADE,
        "crop": crop_box(),
        "grade": {"whiteIn": round(WHITE_IN, 4), "saturation": SATURATION, "hueShiftDeg": HUE_SHIFT_DEG},
        "tint": [[round(float(v), 5) for v in row] for row in tint],
        "files": entries,
    }
