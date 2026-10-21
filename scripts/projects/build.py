"""
Project images: `pnpm projects:build`.

Reads the owner's screenshots in assets/projects/ (flat files named `<prefix>-<n>`, `<prefix>-1` always the
main image), maps each prefix to its project slug, and writes for every image:

  public/projects/<slug>/<n>-<width>.avif and .webp at a few widths (never wider than the original),

plus a tiny blurred placeholder (an inline data URI) and, for projects with a YouTube video, the video's
thumbnail (fetched once into assets/projects/video-<id>.jpg, then encoded like the rest), so no request
ever goes to YouTube until the visitor presses play.

Every output is re-encoded from bare pixels converted to sRGB: no EXIF, XMP, ICC, GPS or any other
metadata survives. Images are shipped in colour; the site shows them greyscale at rest with CSS.

The manifest (src/content/project-media.json) lists what was built; check:content compares it with the
image texts in projects.ts. Originals are never committed (assets/ is ignored).
"""
from __future__ import annotations

import base64
import io
import json
import re
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image, ImageCms, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "assets" / "projects"
OUT = ROOT / "public" / "projects"
MANIFEST = ROOT / "src" / "content" / "project-media.json"

# File prefix -> project slug. Owner files first, then the images found in legacy/.
PREFIXES = {
    "fraud": "fraud-detection",
    "inklusif": "inklusif",
    "tng": "touch-n-go-reporting",
    "pengyou": "pengyou",
    "mapetite": "mapetite",
    "coralcoders": "coral-coders-website",
    "budget": "budget-tracker",
    "harvest": "harvest-for-all",
    "aws": "aws-receipt-processing",
    "grabbuddy": "grab-buddy",
    "svps": "smart-vehicle-performance-system",
    "reciperoots": "recipe-roots",
    "eventsphere": "eventsphere",
    "pokemon": "pokemon-ascii",
    "aaf": "asia-arts-festival",
    "english": "english-portfolio",
}

# Areas blurred before export, in original pixels (left, top, right, bottom): teammates' names, on the
# English Portfolio screenshot and on its video's thumbnail.
REDACT = {
    "english-1": [(140, 925, 1650, 1050)],
    "video-vYpOvoLaCM4": [(80, 362, 1010, 422)],
}

# The gallery's open strip and the page header show main images at 16:10. A main image of another shape is
# extended to it with its own background colour (only where the edges being extended are one flat colour),
# so nothing is cropped or stretched. The images named in FEATHER_TO_BLACK are dark title slides whose
# edges are not flat (a glow runs off them): they are extended with black instead, their own edges feathered
# into it so the join never shows. Everything else (photographs, busy screenshots) is left as it is.
MAIN_RATIO = 16 / 10
FLAT_EDGE_STD = 10.0
FEATHER_TO_BLACK = {"tng-1"}
FEATHER = 0.06  # of the image's extended dimension

WIDTHS = [480, 800, 1200, 1800]
VIDEO_WIDTHS = [480, 960]
AVIF_QUALITY = 58
WEBP_QUALITY = 80
SRGB = ImageCms.createProfile("sRGB")


def projects() -> list[dict]:
    """The projects' slugs and videos, read from projects.ts by Node (type stripping)."""
    code = (
        "const { projects } = await import('./src/content/projects.ts');"
        "console.log(JSON.stringify(projects.map(p => ({ slug: p.slug, video: p.video ?? null, images: p.images.length }))));"
    )
    out = subprocess.run(
        ["node", "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "--input-type=module", "-e", code],
        cwd=ROOT, check=True, capture_output=True, text=True,
    )
    return json.loads(out.stdout)


def clean(im: Image.Image) -> Image.Image:
    """Bare sRGB pixels: the ICC profile applied, transparency flattened on white, no metadata at all."""
    icc = im.info.get("icc_profile")
    if im.mode in ("P", "LA", "L"):
        im = im.convert("RGBA")
    if icc:
        try:
            src = ImageCms.ImageCmsProfile(io.BytesIO(icc))
            mode = "RGBA" if im.mode == "RGBA" else "RGB"
            im = ImageCms.profileToProfile(im.convert(mode), src, SRGB, outputMode=mode)
        except ImageCms.PyCMSError:
            pass
    if im.mode == "RGBA":
        flat = Image.new("RGB", im.size, (255, 255, 255))
        flat.paste(im, mask=im.getchannel("A"))
        im = flat
    im = im.convert("RGB")
    bare = Image.new("RGB", im.size)
    bare.frombytes(im.tobytes())
    return bare


def redact(im: Image.Image, boxes: list[tuple[int, int, int, int]]) -> Image.Image:
    for box in boxes:
        region = im.crop(box)
        # Pixelate, then blur: the text is gone, the band still reads as part of the page.
        small = region.resize((max(1, region.width // 40), max(1, region.height // 40)), Image.Resampling.BILINEAR)
        region = small.resize(region.size, Image.Resampling.BILINEAR).filter(ImageFilter.GaussianBlur(12))
        im.paste(region, box)
    return im


def fit_ratio(im: Image.Image, name: str) -> Image.Image:
    """Extends a main image to 16:10 with its flat edge colour (top and bottom, or the sides)."""
    w, h = im.size
    if abs(w / h - MAIN_RATIO) < 0.01:
        return im
    px = np.asarray(im, dtype=np.float32)
    ring = 6
    if w / h > MAIN_RATIO:
        edges = np.concatenate([px[:ring].reshape(-1, 3), px[-ring:].reshape(-1, 3)])
        size = (w, round(w / MAIN_RATIO))
    else:
        edges = np.concatenate([px[:, :ring].reshape(-1, 3), px[:, -ring:].reshape(-1, 3)])
        size = (round(h * MAIN_RATIO), h)
    spread = float(edges.std(axis=0).max())
    at = ((size[0] - w) // 2, (size[1] - h) // 2)
    if spread <= FLAT_EDGE_STD:
        colour = tuple(int(c) for c in np.median(edges, axis=0))
        canvas = Image.new("RGB", size, colour)
        canvas.paste(im, at)
        print(f"projects: {name} extended from {w / h:.2f}:1 to 16:10 with rgb{colour}")
        return canvas
    if name in FEATHER_TO_BLACK:
        # Feather the edges being extended into black.
        vertical = w / h > MAIN_RATIO
        n = max(1, round((h if vertical else w) * FEATHER))
        ramp = np.linspace(0.0, 1.0, n, dtype=np.float32) ** 1.5
        mask = np.ones((h, w), np.float32)
        if vertical:
            mask[:n] *= ramp[:, None]
            mask[-n:] *= ramp[::-1][:, None]
        else:
            mask[:, :n] *= ramp[None, :]
            mask[:, -n:] *= ramp[::-1][None, :]
        canvas = Image.new("RGB", size, (0, 0, 0))
        canvas.paste(im, at, Image.fromarray(np.round(mask * 255).astype(np.uint8), "L"))
        print(f"projects: {name} extended from {w / h:.2f}:1 to 16:10 with black, edges feathered")
        return canvas
    print(f"projects: {name} is {w / h:.2f}:1 with varied edges (spread {spread:.0f}); left as it is")
    return im


def encode(im: Image.Image, base: Path, widths: list[int]) -> list[int]:
    """AVIF and WebP at each width up to the original's; returns the widths written."""
    done = []
    for w in sorted({min(w, im.width) for w in widths}):
        h = round(im.height * w / im.width)
        frame = im if w == im.width else im.resize((w, h), Image.Resampling.LANCZOS)
        frame.save(f"{base}-{w}.avif", "AVIF", quality=AVIF_QUALITY, speed=4)
        frame.save(f"{base}-{w}.webp", "WEBP", quality=WEBP_QUALITY, method=6)
        done.append(w)
    return done


def placeholder(im: Image.Image) -> str:
    """A 24 px wide, blurred WebP as a data URI (a few hundred bytes), shown while the image loads."""
    small = im.resize((24, max(1, round(im.height * 24 / im.width))), Image.Resampling.LANCZOS)
    small = small.filter(ImageFilter.GaussianBlur(1))
    buf = io.BytesIO()
    small.save(buf, "WEBP", quality=40)
    return "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()


def video_thumb(video_id: str) -> Path | None:
    """The video's thumbnail, fetched once and kept with the originals (maxres when it exists)."""
    path = SRC / f"video-{video_id}.jpg"
    if path.exists():
        return path
    for name in ("maxresdefault", "hqdefault"):
        try:
            with urllib.request.urlopen(f"https://i.ytimg.com/vi/{video_id}/{name}.jpg", timeout=20) as r:
                path.write_bytes(r.read())
            print(f"projects: fetched the thumbnail for {video_id} ({name})")
            return path
        except Exception:  # noqa: BLE001 - try the next size
            continue
    return None


def main() -> None:
    if not SRC.exists():
        print("projects:build: assets/projects/ not found; keeping the committed outputs.")
        return
    files: dict[str, list[tuple[int, Path]]] = {}
    for f in sorted(SRC.iterdir()):
        m = re.fullmatch(r"([a-z]+)-(\d+)\.(png|jpe?g|webp)", f.name)
        if not m:
            continue
        prefix, n = m.group(1), int(m.group(2))
        if prefix not in PREFIXES:
            if prefix != "video":
                sys.exit(f"projects:build: no project for the prefix '{prefix}' ({f.name})")
            continue
        files.setdefault(PREFIXES[prefix], []).append((n, f))

    if OUT.exists():
        shutil.rmtree(OUT)
    manifest: dict[str, dict] = {}
    total = 0
    for p in projects():
        slug = p["slug"]
        entry: dict = {"images": []}
        numbered = sorted(files.get(slug, []))
        if [n for n, _ in numbered] != list(range(1, len(numbered) + 1)):
            sys.exit(f"projects:build: {slug} images are not numbered 1 to n: {[f.name for _, f in numbered]}")
        if numbered:
            (OUT / slug).mkdir(parents=True, exist_ok=True)
        for n, f in numbered:
            im = clean(Image.open(f))
            key = f.stem
            if key in REDACT:
                im = redact(im, REDACT[key])
            if n == 1:
                im = fit_ratio(im, key)
            widths = encode(im, OUT / slug / str(n), WIDTHS)
            entry["images"].append({
                "n": n,
                "width": im.width,
                "height": im.height,
                "widths": widths,
                "placeholder": placeholder(im),
            })
        if p["video"]:
            thumb = video_thumb(p["video"]["id"])
            if thumb:
                (OUT / slug).mkdir(parents=True, exist_ok=True)
                im = clean(Image.open(thumb))
                if thumb.stem in REDACT:
                    im = redact(im, REDACT[thumb.stem])
                # hqdefault is letterboxed to 4:3; keep the 16:9 picture.
                if abs(im.width / im.height - 4 / 3) < 0.01:
                    band = round(im.width * 9 / 16)
                    top = (im.height - band) // 2
                    im = im.crop((0, top, im.width, top + band))
                entry["video"] = {
                    "width": im.width,
                    "height": im.height,
                    "widths": encode(im, OUT / slug / "video", VIDEO_WIDTHS),
                    "placeholder": placeholder(im),
                }
            else:
                print(f"projects: no thumbnail for {slug}'s video; the facade falls back to the poster")
        manifest[slug] = entry
        size = sum(x.stat().st_size for x in (OUT / slug).glob("*")) if (OUT / slug).exists() else 0
        total += size
        print(f"projects: {slug:34s} {len(entry['images'])} image(s){' + video' if 'video' in entry else ''}  {size / 1024:7.0f} KB")

    MANIFEST.write_text(json.dumps({"base": "/projects", "projects": manifest}, indent=2) + "\n")
    print(f"projects: {total / 1024 / 1024:.2f} MB in public/projects/; manifest {MANIFEST.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
