"""Film-grain tile for the runtime grain overlay (not derived from the originals; deterministic)."""
from __future__ import annotations

import cv2
import numpy as np
from PIL import Image

from common import PUBLIC, file_entry

SIZE = 256
SEED = 2026
SIGMA = 0.6  # a touch of softness so the grain reads as film, not digital noise
WEBP_QUALITY = 70


def build() -> dict:
    rng = np.random.default_rng(SEED)
    noise = rng.normal(0.0, 1.0, (SIZE, SIZE)).astype(np.float32)
    # Blur with wrap-around so the tile repeats seamlessly.
    padded = np.pad(noise, 8, mode="wrap")
    padded = cv2.GaussianBlur(padded, (0, 0), SIGMA)
    noise = padded[8:-8, 8:-8]
    noise = (noise - noise.mean()) / noise.std()
    grey = np.clip(128 + noise * 34, 0, 255).astype(np.uint8)  # mean mid-grey: neutral under overlay blending
    (PUBLIC / "grain.png").unlink(missing_ok=True)  # earlier versions wrote a PNG
    path = PUBLIC / "grain.webp"
    # Lossy is fine for noise (no detail to preserve): 24 KB against 57 KB as PNG.
    Image.fromarray(grey, "L").save(path, "WEBP", quality=WEBP_QUALITY, method=6)
    return {"files": [file_entry(path, "grain", format="webp", width=SIZE, height=SIZE)]}
