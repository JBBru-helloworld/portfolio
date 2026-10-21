"""
Experience photos: `pnpm experience:build`.

Reads the owner's photos in assets/experience/ (jpg, jpeg, png, webp or heic). The first word of the file
name is the role's `photoPrefix` in src/content/experience.ts (coralcoders, buildagenius, tng, plandora); an
optional trailing number sets the order ("tng-1.jpg", "tng-pic-2.png" and "plandora-pic.jpg" all work), and
the photos are numbered 1, 2, 3... in that order. For Touch 'n Go, the approved title slide assets/projects/tng-1.png is used while no tng photos
exist. For every photo:

  public/experience/<slug>/<n>-<width>.avif and .webp at a few widths (prints are small), and a tiny
  blurred placeholder (an inline data URI) in the manifest.

The camera's rotation is applied first, then every output is re-encoded from bare sRGB pixels: no EXIF, XMP,
ICC, GPS or other metadata survives (the same cleaning as projects:build). HEIC files are converted with
macOS `sips` first. Photos are shipped in colour; the site fades them with CSS.

Only photos that are described in experience.ts and have no open TODO(owner) or CHECK(owner) note are
exported: a photo waiting for the owner's confirmation (other people's faces, names, internal screens) is
held back and never reaches public/, so it cannot be fetched from the site either. The manifest
is src/content/experience-media.json. Originals are never committed (assets/ is ignored).
"""
from __future__ import annotations

import importlib.util
import io
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageCms, ImageOps

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "assets" / "experience"
FALLBACK = {"tng": [ROOT / "assets" / "projects" / "tng-1.png"]}
OUT = ROOT / "public" / "experience"
MANIFEST = ROOT / "src" / "content" / "experience-media.json"
WIDTHS = [320, 640, 960]

# The cleaning, encoding and placeholders are shared with the project images.
_spec = importlib.util.spec_from_file_location("projects_build", ROOT / "scripts" / "projects" / "build.py")
_projects = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_projects)
clean, encode, placeholder, redact = _projects.clean, _projects.encode, _projects.placeholder, _projects.redact

# Areas blurred before export, in the original's pixels after rotation (left, top, right, bottom), by source
# file name. tng-pic-7: the three screens on the desk (the owner asked for them blurred). bac-pic-1: the
# student's Zoom camera tile with their name, and their Scratch username. coralcoders-pic-1: the WhatsApp number.
HDR_PROFILE = re.compile(r"HLG|PQ|2100", re.I)

REDACT = {
    "tng-pic-7": [(1405, 1145, 2280, 1660), (1005, 1785, 1775, 2280), (1995, 1860, 2875, 2435)],
    "bac-pic-1": [(505, 490, 965, 752), (830, 748, 1080, 800)],
    "coralcoders-pic-1": [(1540, 3680, 2060, 3810)],
}


def roles() -> list[dict]:
    """Each role's slug, photo prefix, and whether each described photo is cleared to publish (by Node)."""
    code = (
        "const { experience } = await import('./src/content/experience.ts');"
        "const open = (n) => (n ?? []).some((x) => /(TODO|CHECK)\\(owner\\)/.test(x));"
        "console.log(JSON.stringify(experience.map(e => ({ slug: e.slug, prefix: e.photoPrefix,"
        " described: e.photos.length, cleared: e.photos.map((p) => !!p.alt && !open(p.notes)) }))));"
    )
    out = subprocess.run(
        ["node", "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "--input-type=module", "-e", code],
        cwd=ROOT, check=True, capture_output=True, text=True,
    )
    return json.loads(out.stdout)


def open_photo(path: Path, tmp: Path) -> Image.Image:
    if path.suffix.lower() == ".heic":
        converted = tmp / f"{path.stem}.jpg"
        subprocess.run(["sips", "-s", "format", "jpeg", str(path), "--out", str(converted)], check=True, capture_output=True)
        path = converted
    im = Image.open(path)
    # Apply the camera's orientation before the metadata (and the orientation tag with it) is dropped.
    im = ImageOps.exif_transpose(im)
    # HDR frames (a phone's HLG or PQ screen recording, e.g. bac-pic-1): converting their profile to sRGB
    # blows the colours out, while macOS shows the pixels much as they are. Read those pixels as sRGB.
    icc = im.info.get("icc_profile")
    if icc and HDR_PROFILE.search(ImageCms.getProfileDescription(ImageCms.ImageCmsProfile(io.BytesIO(icc)))):
        del im.info["icc_profile"]
    return im


def main() -> None:
    known = {r["prefix"]: r for r in roles()}
    found: dict[str, list[tuple[int, Path]]] = {}
    if SRC.exists():
        ordered: dict[str, list[tuple[int, str, Path]]] = {}
        for f in sorted(SRC.iterdir()):
            m = re.fullmatch(r"([a-z]+)(?:[-_][a-z0-9]+?)*?(?:[-_](\d+))?\.(jpe?g|png|webp|heic)", f.name, re.IGNORECASE)
            if not m:
                if not f.name.startswith("."):
                    print(f"experience: skipped {f.name} (start the name with the role: tng-2.jpg, plandora-pic.jpg)")
                continue
            prefix = m.group(1).lower()
            if prefix not in known:
                sys.exit(f"experience:build: no role has the prefix '{prefix}' ({f.name}); use one of {', '.join(known)}")
            ordered.setdefault(prefix, []).append((int(m.group(2) or 0), f.name.lower(), f))
        # The trailing number orders them (unnumbered first, by name); they are then numbered 1, 2, 3...
        for prefix, items in ordered.items():
            found[prefix] = [(k + 1, f) for k, (_, _, f) in enumerate(sorted(items))]
    for prefix, files in FALLBACK.items():
        if prefix in known and prefix not in found:
            found[prefix] = [(n + 1, f) for n, f in enumerate(files) if f.exists()]

    if OUT.exists():
        shutil.rmtree(OUT)
    manifest: dict[str, dict] = {}
    total = 0
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)
        for prefix, role in known.items():
            files = sorted(found.get(prefix, []))
            photos = []
            (OUT / role["slug"]).mkdir(parents=True, exist_ok=True)
            held = []
            for n, f in files:
                if n > role["described"] or not role["cleared"][n - 1]:
                    held.append(f"{f.name} ({'needs alt text' if n > role['described'] else 'waiting for CHECK(owner)'})")
                    continue
                im = clean(open_photo(f, tmp))
                if f.stem in REDACT:
                    im = redact(im, REDACT[f.stem])
                widths = encode(im, OUT / role["slug"] / str(n), WIDTHS)
                photos.append({"n": n, "source": f.name, "width": im.width, "height": im.height, "widths": widths, "placeholder": placeholder(im)})
            manifest[role["slug"]] = {"photos": photos}
            size = sum(x.stat().st_size for x in (OUT / role["slug"]).glob("*"))
            if not photos:
                (OUT / role["slug"]).rmdir()
            total += size
            note = f"  held back: {', '.join(held)}" if held else ""
            print(f"experience: {role['slug']:20s} {len(photos)} photo(s) {size / 1024:6.0f} KB{note}")

    MANIFEST.write_text(json.dumps({"base": "/experience", "roles": manifest}, indent=2) + "\n")
    print(f"experience: {total / 1024:.0f} KB in public/experience/; manifest {MANIFEST.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
