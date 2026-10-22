"""
`pnpm passport:build`: the passport photo for "My journey", from the owner's portrait in assets/passport/
(portrait.jpg or portrait.png; never committed).

  - every piece of metadata is dropped (EXIF, GPS, XMP, ICC): the pixels are copied into a new image, the
    encoders are told to write none, and exiftool checks the results;
  - the photo is cropped to 35:45 (a passport photo's shape) around the face: FACE_BOX (set from the owner's
    portrait; OpenCV 5 no longer ships the frontal-face detector, which is still used where it exists), so the
    face (brow to chin) fills about 30% of the height, a little below the middle so the hair fits, as on a
    passport photo. CROP_OFFSET nudges the crop (fractions of its width and height) if the owner wants it moved;
  - greyscale, with gentle contrast;
  - AVIF and WebP at two widths, plus the small "ghost" copy (made faint by the page);
  - src/content/passport-photo.json records the sizes, or `available: false` without a portrait (the page
    then shows a silhouette).
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[2]
SRC_DIR = ROOT / "assets" / "passport"
OUT = ROOT / "public" / "passport"
MANIFEST = ROOT / "src" / "content" / "passport-photo.json"

RATIO = 35 / 45
WIDTHS = [280, 560]
GHOST_WIDTH = 120
FACE_SHARE = 0.30  # the face box (brow to chin) as a share of the crop's height: zoomed well out (the owner's choice for this less formal photo)
CROP_OFFSET = (0.0, 0.0)  # the owner's nudge: + moves the crop right / down, as fractions of its width / height
# The face in assets/passport/portrait.png (brow to chin; x, y, width, height in source pixels, after EXIF
# orientation). Set by hand for this portrait; replace it if the portrait changes.
FACE_BOX: tuple[int, int, int, int] | None = (495, 385, 160, 175)


def write_manifest(data: dict) -> None:
    MANIFEST.write_text(json.dumps({"about": "Written by pnpm passport:build.", **data}, indent=2) + "\n")


def find_portrait() -> Path | None:
    for name in ("portrait.jpg", "portrait.jpeg", "portrait.png", "portrait.JPG", "portrait.JPEG", "portrait.PNG"):
        if (SRC_DIR / name).exists():
            return SRC_DIR / name
    return None


def face_box(grey: np.ndarray) -> tuple[int, int, int, int] | None:
    if FACE_BOX is not None:
        return FACE_BOX
    if not hasattr(cv2, "CascadeClassifier"):
        return None
    cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    h, w = grey.shape
    faces = cascade.detectMultiScale(grey, scaleFactor=1.1, minNeighbors=6, minSize=(w // 10, h // 10))
    if len(faces) == 0:
        return None
    return tuple(int(v) for v in max(faces, key=lambda f: f[2] * f[3]))  # the largest face


def encode(img: Image.Image, stem: str, widths: list[int]) -> dict:
    sizes = {}
    tmp = OUT / f".{stem}.png"
    for w in widths:
        img.resize((w, round(w / RATIO)), Image.LANCZOS).save(tmp)
        webp, avif = OUT / f"{stem}-{w}.webp", OUT / f"{stem}-{w}.avif"
        subprocess.run(["cwebp", "-quiet", "-q", "82", "-m", "6", "-metadata", "none", str(tmp), "-o", str(webp)], check=True)
        subprocess.run(["avifenc", "-q", "62", "-s", "4", "--ignore-exif", "--ignore-xmp", "--ignore-icc", str(tmp), str(avif)], check=True, capture_output=True)
        sizes[w] = {"webp": webp.stat().st_size, "avif": avif.stat().st_size}
    tmp.unlink()
    return sizes


def main() -> None:
    src = find_portrait()
    if src is None:
        write_manifest({"available": False})
        print("passport: no portrait in assets/passport/ (portrait.jpg or .png); the page shows a silhouette")
        return
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("photo*"):
        old.unlink()

    # Orientation from EXIF, then the pixels only: a fresh image carries no metadata at all.
    original = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    clean = Image.frombytes("RGB", original.size, original.tobytes())
    w, h = clean.size
    box = face_box(cv2.cvtColor(np.asarray(clean), cv2.COLOR_RGB2GRAY))

    if box is None:
        crop_h = min(h, round(w / RATIO))
        cx, cy = w / 2, crop_h / 2
        print("passport: no face found; a centred crop from the top (adjust CROP_OFFSET)")
    else:
        fx, fy, fw, fh = box
        crop_h = min(h, round(fh / FACE_SHARE))
        cx = fx + fw / 2
        # The face box (brow to chin) sits below the photo's middle, leaving room for the hair and a margin.
        cy = fy + fh / 2 - crop_h * 0.07
    crop_w = round(crop_h * RATIO)
    if crop_w > w:
        crop_w, crop_h = w, round(w / RATIO)
    cx += CROP_OFFSET[0] * crop_w
    cy += CROP_OFFSET[1] * crop_h
    x0 = int(min(max(0, cx - crop_w / 2), w - crop_w))
    y0 = int(min(max(0, cy - crop_h / 2), h - crop_h))
    grey = ImageOps.autocontrast(clean.crop((x0, y0, x0 + crop_w, y0 + crop_h)).convert("L"), cutoff=0.5)

    sizes = encode(grey, "photo", WIDTHS)
    ghost = encode(grey, "photo-ghost", [GHOST_WIDTH])
    meta = subprocess.run(
        ["exiftool", "-q", "-q", "-a", "-G1", "-EXIF:all", "-XMP:all", "-IPTC:all", "-GPS:all", "-ICC_Profile:all", str(OUT)],
        capture_output=True,
        text=True,
    )
    write_manifest({"available": True, "widths": WIDTHS, "ghostWidth": GHOST_WIDTH, "ratio": "35:45"})
    print(f"passport: {src.name} {w}x{h}, face {box}, crop {crop_w}x{crop_h} at ({x0}, {y0})")
    print(f"passport: photo {sizes}, ghost {ghost}; metadata {'none' if not meta.stdout.strip() else meta.stdout.strip()}")


if __name__ == "__main__":
    main()
