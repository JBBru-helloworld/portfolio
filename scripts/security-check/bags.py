"""
`pnpm bags:build`: the Security check's three bags, from the owner's photos in assets/security-check/bags/.

For each bag:

  - the cut-out: a clean alpha matte with a soft edge (about one pixel at display size), no white halo
    (edge colours are pulled from just inside the bag), and no holes where pale stickers meet the
    background (the background is only what is connected to the photo's border; holes inside are filled);
    the brown case comes already cut out, with its own cast shadow, which is dropped;
  - privacy: the REDACT boxes (in source pixels) are blurred before anything else, so no output holds them;
  - a soft contact shadow, as its own layer (black, in the alpha channel), made from the bag's footprint;
  - the X-ray version, from the photo itself: inverted density as a soft, translucent glow, the frame's
    edges and the metal fittings brought out, the stickers reduced to faint ghosts, monochrome on
    transparency;
  - the packing area: a normalised polygon inside the bag (away from the handle and the edges) where the
    scanner places its objects.

Output: public/security-check/bags/<id>-<photo|xray>-<w>.{avif,webp} at three widths, <id>-shadow.webp,
src/content/security-check-bags.json (sizes, aspect, shadow box, packing polygon), and review images in
docs/qa/security-check/ (the review sheet, 400% edge crops and the blurred label). Metadata is stripped
(the encoders write none, and exiftool checks).
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "assets" / "security-check" / "bags"
OUT = ROOT / "public" / "security-check" / "bags"
MANIFEST = ROOT / "src" / "content" / "security-check-bags.json"
QA = ROOT / "docs" / "qa" / "security-check"

WORK_W = 1920  # working width of the cropped bag
WIDTHS = [360, 640, 960]

BAGS = [
    {"id": "tan-suitcase", "file": "tan-suitcase.png", "name": "Tan leather suitcase", "cut": "white"},
    {"id": "doctors-bag", "file": "doctors-bag.png", "name": "Leather doctor's bag", "cut": "white"},
    {"id": "brown-case", "file": "brown-case.png", "name": "Brown hard case", "cut": "alpha"},
]

# Handwritten personal details, in source pixels: the passenger's name and cabin number on the Polish Ocean
# Lines label (the ship, sailing date and ports are kept; they name no one).
REDACT = {
    "tan-suitcase": [(2640, 2232, 3100, 2352)],
}


def blur_boxes(rgb: np.ndarray, boxes: list[tuple[int, int, int, int]]) -> np.ndarray:
    out = rgb.copy()
    for x0, y0, x1, y1 in boxes:
        region = out[y0:y1, x0:x1]
        # Pixelate then blur, so nothing can be recovered, with a feathered edge into the label.
        h, w = region.shape[:2]
        small = cv2.resize(region, (max(1, w // 18), max(1, h // 18)), interpolation=cv2.INTER_AREA)
        coarse = cv2.resize(small, (w, h), interpolation=cv2.INTER_LINEAR)
        coarse = cv2.GaussianBlur(coarse, (0, 0), 9)
        m = np.zeros((h, w), np.float32)
        m[10:-10, 10:-10] = 1
        m = cv2.GaussianBlur(m, (0, 0), 5)[..., None]
        out[y0:y1, x0:x1] = (coarse * m + region * (1 - m)).astype(out.dtype)
    return out


def cut_white(rgb: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    """The bag on a white backdrop: the backdrop is near-white and connected to the border."""
    f = rgb.astype(np.float32)
    lo, hi = f.min(2), f.max(2)
    # The photo sits on a transparent canvas: transparent pixels are backdrop too.
    whiteish = (((lo > 222) & (hi - lo < 26)) | (alpha < 10)).astype(np.uint8)
    n, labels = cv2.connectedComponents(whiteish, connectivity=4)
    border = set(np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))) - {0}
    bg = np.isin(labels, list(border))
    bag = (~bg).astype(np.uint8)
    # Keep the largest piece (the bag), and fill any holes inside it.
    n, labels, stats, _ = cv2.connectedComponentsWithStats(bag, connectivity=8)
    biggest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    bag = (labels == biggest).astype(np.uint8)
    inv = (1 - bag).astype(np.uint8)
    n, labels, stats, _ = cv2.connectedComponentsWithStats(inv, connectivity=4)
    outside = set(np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]])))
    holes = ~np.isin(labels, list(outside)) & (inv == 1)
    bag[holes] = 1
    # Backdrop enclosed by the bag (inside a handle): flat, pure white areas of some size. Sticker paper is
    # creamier and textured, so it stays.
    flat = cv2.GaussianBlur(f, (0, 0), 2)
    pure = ((flat.min(2) > 232) & (flat.max(2) - flat.min(2) < 13)).astype(np.uint8)
    n, labels, stats, _ = cv2.connectedComponentsWithStats(pure, connectivity=4)
    big = np.zeros(n, bool)
    big[1:] = stats[1:, cv2.CC_STAT_AREA] > rgb.shape[0] * rgb.shape[1] * 0.00002
    enclosed_backdrop = cv2.dilate((big[labels] & (pure == 1)).astype(np.uint8), np.ones((3, 3), np.uint8), iterations=2)
    bag[enclosed_backdrop == 1] = 0
    # The photo's edge pixels are part white: pull the edge in by a pixel.
    bag = cv2.erode(bag, np.ones((3, 3), np.uint8), iterations=1)
    return bag.astype(np.float32)


def cut_alpha(alpha: np.ndarray) -> np.ndarray:
    """An existing cut-out: the bag is the opaque core; its cast shadow (dark, part transparent) is dropped."""
    core = (alpha >= 240).astype(np.uint8)
    n, labels, stats, _ = cv2.connectedComponentsWithStats(core, connectivity=8)
    biggest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    core = (labels == biggest).astype(np.uint8)
    near = cv2.dilate(core, np.ones((5, 5), np.uint8), iterations=1).astype(np.float32)
    return np.minimum(alpha.astype(np.float32) / 255, near)


def soften(mask: np.ndarray, sigma: float) -> np.ndarray:
    return np.clip(cv2.GaussianBlur(mask, (0, 0), sigma), 0, 1)


def decontaminate(rgb: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    """Replaces the colours at the edge with colours from just inside, so no backdrop shows through."""
    inner = (alpha > 0.98).astype(np.float32)
    inner = cv2.erode(inner, np.ones((3, 3), np.uint8), iterations=2)
    f = rgb.astype(np.float32)
    w = cv2.GaussianBlur(inner, (0, 0), 4) + 1e-4
    fill = cv2.GaussianBlur(f * inner[..., None], (0, 0), 4) / w[..., None]
    edge = (alpha < 0.98)[..., None] | (inner < 0.5)[..., None] & (alpha > 0)[..., None]
    return np.where(edge, fill, f)


def contact_shadow(alpha: np.ndarray) -> tuple[np.ndarray, dict]:
    """A soft shadow under the bag's footprint: the lowest band of the silhouette, squashed and blurred."""
    h, w = alpha.shape
    solid = alpha > 0.5
    cols = np.where(solid.any(0))[0]
    bottom = np.array([np.where(solid[:, x])[0].max() if solid[:, x].any() else 0 for x in range(w)])
    x0, x1 = cols.min(), cols.max()
    sh_h = int(h * 0.16)
    canvas = np.zeros((sh_h, w), np.float32)
    base = int(sh_h * 0.42)
    for x in range(x0, x1 + 1):
        # Darker where the bag sits lowest (its feet and the bottom edge).
        depth = (bottom[x] - bottom[x0:x1 + 1].min()) / max(1, np.ptp(bottom[x0:x1 + 1]))
        canvas[base - 3 : base + 3, x] = 0.35 + 0.65 * depth
    canvas = cv2.GaussianBlur(canvas, (0, 0), sigmaX=w * 0.018, sigmaY=sh_h * 0.12)
    wide = cv2.GaussianBlur(canvas, (0, 0), sigmaX=w * 0.05, sigmaY=sh_h * 0.25)
    shadow = np.clip(canvas * 2.2 + wide * 1.4, 0, 0.72)
    # The shadow's box relative to the bag's box (its top lines up with the bag's lowest point).
    lowest = bottom[x0:x1 + 1].max()
    box = {"top": round((lowest - base) / h, 4), "height": round(sh_h / h, 4)}
    return shadow, box


def xray(rgb: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    """The airport X-ray version, as an intensity (0 to 1) on transparency."""
    f = rgb.astype(np.float32) / 255
    lab = cv2.cvtColor(f, cv2.COLOR_RGB2LAB)
    L, A, B = lab[..., 0] / 100, lab[..., 1], lab[..., 2]
    chroma = np.hypot(A, B)
    solid = alpha > 0.5
    w = rgb.shape[1]

    # The leather: its typical colour, and how far each pixel is from it (stickers and fittings are far).
    la, lb = np.median(A[solid]), np.median(B[solid])
    off_leather = np.hypot(A - la, B - lb)
    off_leather = cv2.GaussianBlur(off_leather, (0, 0), w * 0.003)
    ll = np.median(L[solid])
    paper = (np.abs(L - ll) > 0.22) | (off_leather > 16)
    paper = cv2.morphologyEx(paper.astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8)).astype(np.float32)
    # Metal: bright, colourless and small (big pale areas are paper).
    metal = ((L > 0.62) & (chroma < 14)).astype(np.uint8)
    n, labels, stats, _ = cv2.connectedComponentsWithStats(metal, connectivity=8)
    small = np.zeros(n, bool)
    small[1:] = stats[1:, cv2.CC_STAT_AREA] < (w * w) * 0.0009
    metal = small[labels].astype(np.float32) * metal
    # Fittings sit on plain leather; white lettering sits inside coloured print, so it is not metal.
    printed = cv2.GaussianBlur(np.hypot(A - la, B - lb), (0, 0), w * 0.01) > 12
    metal = metal * (~printed)
    stickers = np.clip(paper - metal, 0, 1).astype(np.uint8)
    # Close over the printing (dark lettering on a sticker is still sticker) and fill what is enclosed.
    k = max(3, int(w * 0.014)) | 1
    stickers = cv2.morphologyEx(stickers, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))
    inv = (1 - stickers).astype(np.uint8)
    n, labels, stats, _ = cv2.connectedComponentsWithStats(inv, connectivity=4)
    enclosed = np.zeros(n, bool)
    enclosed[1:] = stats[1:, cv2.CC_STAT_AREA] < (w * w) * 0.004
    stickers = np.maximum(stickers, enclosed[labels] & (inv == 1)).astype(np.float32) * solid
    stickers = soften(stickers, w * 0.003)

    # Density: the leather is a soft glow, thicker (brighter) where it is darker in the photo.
    # Paper barely stops the beam: under a sticker, the density is the leather's.
    density = soften((1 - L) * (1 - stickers) + (1 - ll) * stickers, w * 0.006)
    body = 0.1 + 0.2 * density
    # Inner structure: edges of the frame at two scales (seams, hinges, corners, rivets).
    g = cv2.GaussianBlur(L, (0, 0), 1.2)
    e1 = np.hypot(cv2.Sobel(g, cv2.CV_32F, 1, 0, ksize=3), cv2.Sobel(g, cv2.CV_32F, 0, 1, ksize=3))
    g2 = cv2.GaussianBlur(L, (0, 0), 3.5)
    e2 = np.hypot(cv2.Sobel(g2, cv2.CV_32F, 1, 0, ksize=3), cv2.Sobel(g2, cv2.CV_32F, 0, 1, ksize=3))
    edges = np.clip(e1 * 1.6 + e2 * 2.4, 0, 1)
    edges = edges * (1 - 0.94 * stickers)  # stickers become ghosts
    # The silhouette: a bright rim, as the beam passes through more material at the edges.
    rim = np.clip(soften(alpha, w * 0.003) - soften(cv2.erode(alpha, np.ones((3, 3), np.uint8), iterations=7), w * 0.006), 0, 1)
    rim = np.clip(rim * 2.2, 0, 1)

    # Stickers keep the leather's density (paper barely shows on an X-ray), with only a faint trace.
    ghost = 0.05 * stickers * soften(1 - L, 2)
    i = body + ghost + 0.6 * edges + 0.9 * soften(metal, 1.5) + 0.55 * rim
    i = np.clip(i, 0, 1) * alpha
    return i


def packing_polygon(alpha: np.ndarray, top_cut: float) -> list[list[float]]:
    """The inside space for objects: the bag's body (no handle), inset from the edges, simplified."""
    h, w = alpha.shape
    solid = (alpha > 0.5).astype(np.uint8)
    k = max(3, int(w * 0.06)) | 1
    body = cv2.morphologyEx(solid, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))
    ys = np.where(body.any(1))[0]
    y_top = ys.min() + int((ys.max() - ys.min()) * top_cut)
    body[:y_top] = 0
    inset = max(3, int(w * 0.07)) | 1
    inner = cv2.erode(body, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (inset, inset)))
    contours, _ = cv2.findContours(inner, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = max(contours, key=cv2.contourArea)
    poly = cv2.approxPolyDP(c, w * 0.012, True)[:, 0, :]
    return [[round(x / w, 4), round(y / h, 4)] for x, y in poly]


def encode(rgba: np.ndarray, stem: str, widths: list[int], quality: str) -> dict:
    sizes = {}
    img = Image.fromarray(rgba, "RGBA")
    tmp = OUT / f".{stem}.png"
    for wd in widths:
        ht = round(img.height * wd / img.width)
        img.resize((wd, ht), Image.LANCZOS).save(tmp)
        webp = OUT / f"{stem}-{wd}.webp"
        avif = OUT / f"{stem}-{wd}.avif"
        subprocess.run(["cwebp", "-quiet", "-q", "72", "-alpha_q", "75", "-m", "6", "-metadata", "none", str(tmp), "-o", str(webp)], check=True)
        subprocess.run(["avifenc", "-q", quality, "--qalpha", "55", "-s", "4", "--ignore-exif", "--ignore-xmp", "--ignore-icc", str(tmp), str(avif)],
                       check=True, capture_output=True)
        sizes[wd] = {"webp": webp.stat().st_size, "avif": avif.stat().st_size}
    tmp.unlink()
    return sizes


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    QA.mkdir(parents=True, exist_ok=True)
    for old in OUT.iterdir():
        old.unlink()
    manifest = []
    sheet_rows = []
    total_desktop = 0
    for bag in BAGS:
        src = np.asarray(Image.open(SRC / bag["file"]).convert("RGBA"))
        rgb = blur_boxes(src[..., :3], REDACT.get(bag["id"], []))
        if bag["id"] in REDACT:
            x0, y0, x1, y1 = REDACT[bag["id"]][0]
            Image.fromarray(rgb[y0 - 300 : y1 + 450, x0 - 380 : x1 + 220]).save(QA / f"{bag['id']}-label-blurred.jpg", quality=90)
        hard = cut_white(rgb, src[..., 3]) if bag["cut"] == "white" else cut_alpha(src[..., 3])

        # Crop to the bag with a margin, then work at WORK_W.
        ys, xs = np.where(hard > 0.5)
        pad = int((xs.max() - xs.min()) * 0.02)
        x0, x1 = max(0, xs.min() - pad), min(rgb.shape[1], xs.max() + pad)
        y0, y1 = max(0, ys.min() - pad), min(rgb.shape[0], ys.max() + pad)
        crop_rgb, crop_a = rgb[y0:y1, x0:x1], hard[y0:y1, x0:x1]
        scale = WORK_W / crop_rgb.shape[1]
        size = (WORK_W, round(crop_rgb.shape[0] * scale))
        crop_rgb = cv2.resize(crop_rgb, size, interpolation=cv2.INTER_AREA)
        crop_a = cv2.resize(crop_a, size, interpolation=cv2.INTER_AREA)
        # A soft, natural edge: about a pixel at the 960 px output.
        alpha = soften(np.clip((crop_a - 0.5) * 2.2 + 0.5, 0, 1), 1.3)
        colour = decontaminate(crop_rgb, alpha)

        photo = np.dstack([np.clip(colour, 0, 255).astype(np.uint8), np.round(alpha * 255).astype(np.uint8)])
        x = xray(colour.astype(np.uint8), alpha)
        # Monochrome: a faintly cool white, the intensity in the alpha channel (glows on the dark monitor).
        xr = np.zeros((*x.shape, 4), np.uint8)
        xr[..., 0], xr[..., 1], xr[..., 2] = 232, 238, 240
        xr[..., 3] = np.round(np.clip(x, 0, 1) * 255).astype(np.uint8)
        shadow, shadow_box = contact_shadow(alpha)
        sh = np.zeros((*shadow.shape, 4), np.uint8)
        sh[..., 3] = np.round(shadow * 255).astype(np.uint8)

        sizes = {
            "photo": encode(photo, f"{bag['id']}-photo", WIDTHS, "50"),
            "xray": encode(xr, f"{bag['id']}-xray", WIDTHS, "42"),
        }
        shadow_img = Image.fromarray(sh, "RGBA").resize((480, round(480 * sh.shape[0] / sh.shape[1])), Image.LANCZOS)
        shadow_path = OUT / f"{bag['id']}-shadow.webp"
        shadow_img.save(shadow_path, "WEBP", quality=70, alpha_quality=60, method=6)
        desktop = sizes["photo"][960]["avif"] + sizes["xray"][960]["avif"] + shadow_path.stat().st_size
        total_desktop += desktop

        polygon = packing_polygon(alpha, top_cut=0.18 if bag["id"] != "brown-case" else 0.14)
        manifest.append(
            {
                "id": bag["id"],
                "name": bag["name"],
                "width": size[0],
                "height": size[1],
                "aspect": round(size[0] / size[1], 4),
                "widths": WIDTHS,
                "shadow": shadow_box,
                "packing": polygon,
            }
        )
        print(f"bags: {bag['id']} {size[0]}x{size[1]}, desktop set {desktop / 1024:.1f} KB "
              f"(photo {sizes['photo'][960]['avif'] / 1024:.1f}, x-ray {sizes['xray'][960]['avif'] / 1024:.1f}, "
              f"shadow {shadow_path.stat().st_size / 1024:.1f}), packing {len(polygon)} points")
        sheet_rows.append((photo, xr, shadow, shadow_box, polygon))

        # 400% crop of an edge: the bag's left edge at mid height, over black and over the site's paper.
        mid = size[1] // 2
        left = int(np.where(alpha[mid] > 0.5)[0].min())
        cx0, cy0 = max(0, left - 30), mid - 60
        patch = photo[cy0 : cy0 + 120, cx0 : cx0 + 120].astype(np.float32)
        for name, bgc in (("black", (0, 0, 0)), ("light", (236, 232, 222))):
            a = patch[..., 3:] / 255
            comp = patch[..., :3] * a + np.array(bgc, np.float32) * (1 - a)
            Image.fromarray(comp.astype(np.uint8)).resize((480, 480), Image.NEAREST).save(QA / f"{bag['id']}-edge-400-{name}.png")

    MANIFEST.write_text(json.dumps({"about": "Written by pnpm bags:build.", "bags": manifest}, indent=2) + "\n")
    review_sheet(sheet_rows)
    print(f"bags: all three at desktop size (960 px AVIF photo + x-ray + shadow): {total_desktop / 1024:.1f} KB")
    meta = subprocess.run(["exiftool", "-q", "-q", "-EXIF:all", "-XMP:all", "-IPTC:all", "-s", str(OUT)], capture_output=True, text=True)
    print("bags: metadata", "none" if not meta.stdout.strip() else meta.stdout.strip())


def review_sheet(rows) -> None:
    """Photo | cut-out on black | X-ray | packing polygon, one row per bag."""
    cell_w = 560
    out = []
    for photo, xr, shadow, box, polygon in rows:
        h, w = photo.shape[:2]
        ch = round(h * cell_w / w)
        ph = cv2.resize(photo, (cell_w, ch), interpolation=cv2.INTER_AREA).astype(np.float32)
        a = ph[..., 3:] / 255
        on_white = ph[..., :3] * a + 255 * (1 - a)
        # Cut-out on black, with its contact shadow.
        black = np.zeros((ch, cell_w, 3), np.float32) + 8
        sh = cv2.resize(shadow, (cell_w, round(cell_w * shadow.shape[0] / shadow.shape[1])))
        top = round(box["top"] * ch)
        sh_band = sh[: max(0, min(sh.shape[0], ch - top))]
        black[top : top + sh_band.shape[0]] *= (1 - sh_band[..., None] * 0.9)
        black = ph[..., :3] * a + black * (1 - a)
        x = cv2.resize(xr, (cell_w, ch), interpolation=cv2.INTER_AREA).astype(np.float32)
        xa = x[..., 3:] / 255
        mon = np.zeros((ch, cell_w, 3), np.float32) + np.array([10, 12, 13], np.float32)
        mon = x[..., :3] * xa + mon * (1 - xa)
        poly = mon.copy() * 0.6 + black * 0.0
        pts = np.array([[px * cell_w, py * ch] for px, py in polygon], np.int32)
        poly = poly.astype(np.uint8).copy()
        cv2.polylines(poly, [pts], True, (240, 170, 60), 2, cv2.LINE_AA)
        out.append(np.hstack([on_white, black, mon, poly.astype(np.float32)]).astype(np.uint8))
        out.append(np.full((12, cell_w * 4, 3), 40, np.uint8))
    Image.fromarray(np.vstack(out[:-1])).save(QA / "bags-review.jpg", quality=88)
    print(f"bags: review sheet {(QA / 'bags-review.jpg').relative_to(ROOT)}")


if __name__ == "__main__":
    main()
