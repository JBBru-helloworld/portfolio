"""Window plate: key the green glass, grade the cabin to deep charcoal, export plates and glass geometry."""
from __future__ import annotations

import cv2
import numpy as np
from PIL import Image

from common import PUBLIC, WINDOW_SRC, clean_dir, file_entry, luminance, monotone_curve

OUT = PUBLIC / "window"

# Key: greenness = G - max(R, B). Pure screen green is ~0.93; the frame is ~0.
KEY_LO, KEY_HI = 0.06, 0.45
CHOKE_PX = 1  # pull the alpha edge in by one source pixel to drop the last contaminated row
EDGE_SOFTEN_SIGMA = 0.6

# Grade (luminance in -> luminance out, sRGB-encoded). Wall (L 0.36..0.55) lands on
# #151515..#292929; frame highlights (0.86..0.95) stay clearly the brightest thing at 0.52..0.63.
# One global monotone curve: no glow or light spill is baked in.
GRADE_X = np.array([0.00, 0.29, 0.36, 0.458, 0.55, 0.62, 0.76, 0.86, 0.95, 1.00])
GRADE_Y = np.array([0.02, 0.062, 0.082, 0.118, 0.160, 0.215, 0.37, 0.52, 0.63, 0.67])
SHADOW_BLUE = 0.016  # cool the deepest wall tones towards #16161A

LANDSCAPE_WIDTHS = (1920, 2880, 3840)
PORTRAIT_WIDTHS = (1080, 1620)
PORTRAIT_ASPECT = 2 / 3  # 9:16 would cut through the frame; see docs/WINDOW-ASSETS.md

AVIF_QUALITY = 62
WEBP_QUALITY = 84
SIMPLIFY_EPS_SRC = 1.3  # source px; ~1 px at 3840 wide (5250 / 3840 = 1.37)
CLIP_GROW_SRC = 8       # source px the clip path extends under the frame (~6 px at 3840 wide)


def _smoothstep(e0: float, e1: float, x: np.ndarray) -> np.ndarray:
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def key_and_grade() -> tuple[np.ndarray, np.ndarray]:
    """Returns (rgba uint8 plate at source size, hard glass mask uint8)."""
    rgb = np.asarray(Image.open(WINDOW_SRC).convert("RGB"), dtype=np.float32) / 255.0
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    greenness = g - np.maximum(r, b)

    # Hard glass mask: the largest green component, holes filled.
    hard = (greenness > 0.5).astype(np.uint8)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(hard, 8)
    biggest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    hard = (lab == biggest).astype(np.uint8)
    contours, _ = cv2.findContours(hard, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    hard = np.zeros_like(hard)
    cv2.drawContours(hard, contours, -1, 1, thickness=cv2.FILLED)

    # Soft alpha from greenness, choked by one pixel, then softened slightly.
    alpha = 1.0 - _smoothstep(KEY_LO, KEY_HI, greenness)
    alpha[hard.astype(bool) & (cv2.erode(hard, np.ones((5, 5), np.uint8)) > 0)] = 0.0
    alpha = cv2.erode(alpha, np.ones((2 * CHOKE_PX + 1, 2 * CHOKE_PX + 1), np.uint8))
    alpha = cv2.GaussianBlur(alpha, (0, 0), EDGE_SOFTEN_SIGMA)
    alpha = np.clip(alpha, 0, 1)

    # Despill, then take luminance. Edge pixels (partly green) borrow the luminance of the
    # nearest fully opaque frame pixel, so no green or dark fringe can survive.
    g_ds = np.minimum(g, np.maximum(r, b))
    lum = luminance(np.dstack([r, g_ds, b]))
    opaque = (alpha > 0.985).astype(np.uint8)
    _, labels = cv2.distanceTransformWithLabels(1 - opaque, cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
    ys, xs = np.nonzero(opaque)
    lookup = np.zeros(labels.max() + 1, dtype=np.float32)
    lookup[labels[ys, xs]] = lum[ys, xs]
    lum = np.where(opaque.astype(bool), lum, lookup[labels])

    # Grade to the dark cabin.
    out_l = monotone_curve(lum, GRADE_X, GRADE_Y).astype(np.float32)
    tint = 1.0 - _smoothstep(0.05, 0.35, out_l)
    plate = np.dstack([out_l, out_l, np.clip(out_l + SHADOW_BLUE * tint, 0, 1), alpha])
    return np.round(plate * 255).astype(np.uint8), hard


def _resize_rgba(img: Image.Image, width: int) -> Image.Image:
    height = round(img.height * width / img.width)
    # Premultiply so transparent pixels never bleed into the edge.
    return img.convert("RGBa").resize((width, height), Image.Resampling.LANCZOS).convert("RGBA")


def _save(img: Image.Image, stem: str, entries: list, kind: str) -> None:
    for fmt, ext, opts in (
        ("AVIF", "avif", {"quality": AVIF_QUALITY, "speed": 4}),
        ("WEBP", "webp", {"quality": WEBP_QUALITY, "method": 6, "alpha_quality": 100}),
    ):
        path = OUT / f"{stem}.{ext}"
        img.save(path, fmt, **opts)
        entries.append(file_entry(path, kind, format=ext, width=img.width, height=img.height))


def _geometry(hard: np.ndarray, x0: int, y0: int, w: int, h: int) -> dict:
    sub = hard[y0 : y0 + h, x0 : x0 + w]
    contours, _ = cv2.findContours(sub, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    contour = max(contours, key=cv2.contourArea)  # the true glass: bbox and centre come from this
    # The clip path is grown a few pixels so the video always runs under the frame; the plate's own
    # soft alpha edge then defines what is visible, and no background can show through a gap.
    grown = cv2.dilate(sub, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * CLIP_GROW_SRC + 1,) * 2))
    gcont, _ = cv2.findContours(grown, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    poly = cv2.approxPolyDP(max(gcont, key=cv2.contourArea), SIMPLIFY_EPS_SRC, True)[:, 0, :].astype(float)
    pts = [(px / w, py / h) for px, py in poly]
    path = "M" + " L".join(f"{x:.5f} {y:.5f}" for x, y in pts) + " Z"
    bx, by, bw, bh = cv2.boundingRect(contour)
    m = cv2.moments(contour)
    return {
        "clipPath": path,
        "clipPathGrowPx": CLIP_GROW_SRC,
        "clipPathUnits": "objectBoundingBox",
        "points": len(pts),
        "bbox": {"x": bx / w, "y": by / h, "width": bw / w, "height": bh / h},
        "centre": {"x": m["m10"] / m["m00"] / w, "y": m["m01"] / m["m00"] / h},
    }


def build() -> dict:
    clean_dir(OUT)
    plate, hard = key_and_grade()
    src_h, src_w = hard.shape
    full = Image.fromarray(plate, "RGBA")
    entries: list = []

    for width in LANDSCAPE_WIDTHS:
        _save(_resize_rgba(full, width), f"plate-landscape-{width}", entries, "window-landscape")

    # Portrait: full height, centred on the glass centre.
    geo_l = _geometry(hard, 0, 0, src_w, src_h)
    cx = geo_l["centre"]["x"] * src_w
    pw = round(src_h * PORTRAIT_ASPECT)
    px0 = int(np.clip(round(cx - pw / 2), 0, src_w - pw))
    portrait = full.crop((px0, 0, px0 + pw, src_h))
    for width in PORTRAIT_WIDTHS:
        _save(_resize_rgba(portrait, width), f"plate-portrait-{width}", entries, "window-portrait")

    return {
        "source": {"width": src_w, "height": src_h},
        "files": entries,
        "glass": {
            "landscape": geo_l,
            "portrait": {**_geometry(hard, px0, 0, pw, src_h), "crop": {"x": px0, "y": 0, "width": pw, "height": src_h}},
        },
        "_plate_rgba": plate,  # for QA only, stripped before writing the manifest
    }
