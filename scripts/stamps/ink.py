"""
Passport stamps, step 2: wears each clean stamp (assets/stamps/clean-*.png, from render.mjs) into a real,
well-used ink impression, baked once so it costs nothing at runtime:

  - uneven pressure: one side of the stamp pressed harder, plus broad patches of lighter coverage;
  - broken edges: the outline nudged by a little noise, with stretches of the edge missing;
  - speckle: small dry spots where the ink did not take;
  - a slight bleed into the paper.

Output: public/journey/stamp-<ink>.webp, white with the ink in the alpha channel, at 2x the stamp's
CSS size. The page tints it with the section's ink token through mask-image, so the colours stay in
globals.css. Seeded, so a rebuild gives the same stamps.
"""
from __future__ import annotations

import math
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "assets" / "stamps"
OUT = ROOT / "public" / "journey"
RENDER_SCALE = 3
OUT_SCALE = 2
SEEDS = {"za": 11, "mu": 23, "my": 37}


def noise(rng: np.random.Generator, h: int, w: int, cell: int) -> np.ndarray:
    small = rng.random((h // cell + 3, w // cell + 3)).astype(np.float32)
    big = cv2.resize(small, (w + 3 * cell, h + 3 * cell), interpolation=cv2.INTER_CUBIC)
    return big[cell : cell + h, cell : cell + w]


def norm(x: np.ndarray) -> np.ndarray:
    return (x - x.min()) / max(float(x.max() - x.min()), 1e-6)


def wear(alpha: np.ndarray, seed: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    h, w = alpha.shape

    # Broken edges: nudge the outline by up to ~1.5 px (at render scale) of smooth noise.
    dx = (noise(rng, h, w, 18) - 0.5) * 3.2
    dy = (noise(rng, h, w, 18) - 0.5) * 3.2
    xs, ys = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
    a = cv2.remap(alpha, xs + dx, ys + dy, cv2.INTER_LINEAR, borderValue=0)

    # Stretches of the outer edge where the ink did not reach.
    eroded = cv2.erode(a, np.ones((3, 3), np.uint8), iterations=2)
    edge = np.clip(a - eroded, 0, 1)
    gaps = norm(noise(rng, h, w, 40)) > 0.66
    a = a - edge * gaps * 0.9

    # Uneven pressure: harder along one side, with broad lighter patches.
    angle = rng.uniform(0, 2 * math.pi)
    side = norm(xs * math.cos(angle) + ys * math.sin(angle))
    patches = norm(noise(rng, h, w, 150) * 0.6 + noise(rng, h, w, 60) * 0.4)
    pressure = np.clip(0.52 + 0.3 * side + 0.42 * (patches - 0.5), 0.22, 1.0)
    a = a * pressure

    # Dry speckle: small spots, more of them where the pressure was light.
    fine = norm(noise(rng, h, w, 4) * 0.55 + noise(rng, h, w, 9) * 0.45)
    holes = fine > (0.7 + 0.16 * pressure)
    a = np.where(holes, a * 0.18, a)

    # A slight bleed into the paper.
    a = cv2.GaussianBlur(a, (0, 0), 0.7)
    return np.clip(a * 1.08, 0, 0.94)


def guilloche() -> None:
    """The passport page's faint security pattern: interlaced sine waves, one seamless 480x160 tile."""
    w, h = 480, 160
    paths = []
    for k in range(14):
        phase = k * math.pi / 7
        amp = 22 + 10 * math.sin(k * 0.9)
        pts = []
        for x in range(0, w + 1, 6):
            t = 2 * math.pi * x / w
            y = h / 2 + amp * math.sin(2 * t + phase) + 14 * math.sin(5 * t - phase * 2)
            pts.append(f"{x},{y:.1f}")
        paths.append(f'<polyline points="{" ".join(pts)}"/>')
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">'
        f'<g fill="none" stroke="#fff" stroke-opacity="0.016" stroke-width="0.8">{"".join(paths)}</g></svg>'
    )
    path = OUT / "guilloche.svg"
    path.write_text(svg)
    print(f"stamps: {path.relative_to(ROOT)} {path.stat().st_size / 1024:.1f} KB")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    guilloche()
    for ink, seed in SEEDS.items():
        rgba = np.asarray(Image.open(SRC / f"clean-{ink}.png").convert("RGBA")).astype(np.float32) / 255
        worn = wear(rgba[..., 3], seed)
        h, w = worn.shape
        size = (round(w * OUT_SCALE / RENDER_SCALE), round(h * OUT_SCALE / RENDER_SCALE))
        small = cv2.resize(worn, size, interpolation=cv2.INTER_AREA)
        out = np.zeros((size[1], size[0], 4), np.uint8)
        out[..., :3] = 255
        out[..., 3] = np.round(small * 255).astype(np.uint8)
        path = OUT / f"stamp-{ink}.webp"
        Image.fromarray(out, "RGBA").save(path, "WEBP", quality=82, alpha_quality=80, method=6)
        print(f"stamps: {path.relative_to(ROOT)} {size[0]}x{size[1]} {path.stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    main()
