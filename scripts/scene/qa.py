"""Review images for the owner, written to docs/qa/scene/ (gitignored). Run after build.py."""
from __future__ import annotations

import json

import cv2
import numpy as np
from PIL import Image, ImageDraw

from common import MANIFEST, PUBLIC, QA, ROOT

VOID = (10, 10, 10)


def _checker(w: int, h: int, cell: int = 24) -> Image.Image:
    yy, xx = np.indices((h, w))
    tile = (((yy // cell) + (xx // cell)) % 2).astype(np.uint8)
    arr = np.where(tile[..., None] == 1, 205, 150).astype(np.uint8).repeat(3, axis=2)
    return Image.fromarray(arr, "RGB")


def _plate(path: str) -> Image.Image:
    return Image.open(ROOT / "public" / path.lstrip("/")).convert("RGBA")


def _label(img: Image.Image, text: str) -> Image.Image:
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, 8 + 7 * len(text), 20], fill=(0, 0, 0))
    d.text((5, 4), text, fill=(255, 220, 0))
    return img


def _clip_mask(geometry: dict, w: int, h: int) -> Image.Image:
    pts = []
    for seg in geometry["clipPath"].replace("M", "").replace("Z", "").split("L"):
        x, y = (float(v) for v in seg.split())
        pts.append((x * w, y * h))
    big = Image.new("L", (w * 2, h * 2), 0)
    ImageDraw.Draw(big).polygon([(x * 2, y * 2) for x, y in pts], fill=255)
    return big.resize((w, h), Image.Resampling.LANCZOS)


def _video_frame(path: str, t: float) -> Image.Image:
    cap = cv2.VideoCapture(str(ROOT / "public" / path.lstrip("/")))
    cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
    ok, frame = cap.read()
    if not ok:
        raise RuntimeError(f"could not read {path} at {t}s")
    return Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))


def _cover(img: Image.Image, w: int, h: int) -> Image.Image:
    scale = max(w / img.width, h / img.height)
    r = img.resize((round(img.width * scale), round(img.height * scale)), Image.Resampling.LANCZOS)
    x, y = (r.width - w) // 2, (r.height - h) // 2
    return r.crop((x, y, x + w, y + h))


def window_images(m: dict) -> None:
    files = {f["path"]: f for f in m["window"]["files"]}
    plate = _plate("/scene/window/plate-landscape-2880.avif")

    # 1. Graded plate on --void with a checkerboard through the glass, laptop-sized.
    w = 1600
    small = plate.resize((w, round(plate.height * w / plate.width)), Image.Resampling.LANCZOS)
    bg = _checker(small.width, small.height)
    out = Image.new("RGB", (small.width + 80, small.height + 80), VOID)
    bg.paste(small, (0, 0), small)
    out.paste(bg, (40, 40))
    _label(out, "window-graded: plate on --void, checkerboard = transparent glass").save(QA / "window-graded.png")

    # 2. 400% crop of the glass edge from the full-resolution 3840 plate (left edge, mid-height).
    big = _plate("/scene/window/plate-landscape-3840.avif")
    g = m["window"]["glass"]["landscape"]
    ex = round(g["bbox"]["x"] * big.width)
    ey = round((g["bbox"]["y"] + g["bbox"]["height"] / 2) * big.height)
    crop = big.crop((ex - 60, ey - 60, ex + 60, ey + 60))
    green = Image.new("RGB", crop.size, (255, 0, 255))  # magenta behind, so any green fringe stands out
    green.paste(crop, (0, 0), crop)
    zoom = green.resize((crop.width * 4, crop.height * 4), Image.Resampling.NEAREST)
    _label(zoom, "glass edge at 400% over magenta").save(QA / "window-edge-400.png")


def composites(m: dict) -> None:
    loop = m["clouds"]
    poster = next(f["path"] for f in loop["files"] if f["kind"] == "clouds-poster" and f["format"] == "webp")
    frame = Image.open(ROOT / "public" / poster.lstrip("/")).convert("RGB")
    for name, plate_path, geo_key, width in (
        ("composite-desktop", "/scene/window/plate-landscape-2880.avif", "landscape", 1600),
        ("composite-mobile", "/scene/window/plate-portrait-1080.avif", "portrait", 540),
    ):
        plate = _plate(plate_path)
        plate = plate.resize((width, round(plate.height * width / plate.width)), Image.Resampling.LANCZOS)
        g = m["window"]["glass"][geo_key]
        bx, by = g["bbox"]["x"] * plate.width, g["bbox"]["y"] * plate.height
        bw, bh = g["bbox"]["width"] * plate.width, g["bbox"]["height"] * plate.height
        # Cover a slightly larger box than the glass, matching the grown clip path.
        pad = 0.03 * max(bw, bh)
        bx, by, bw, bh = bx - pad, by - pad, bw + 2 * pad, bh + 2 * pad
        canvas = Image.new("RGB", plate.size, VOID)
        sky = _cover(frame, round(bw), round(bh))
        mask = _clip_mask(g, plate.width, plate.height)
        layer = Image.new("RGB", plate.size, VOID)
        layer.paste(sky, (round(bx), round(by)))
        canvas.paste(layer, (0, 0), mask)
        canvas.paste(plate, (0, 0), plate)
        _label(canvas, f"{name}: graded plate + cloud loop poster clipped to glass").save(QA / f"{name}.png")


def _sheet(frames: list[tuple[str, Image.Image]], cols: int, w: int) -> Image.Image:
    tiles = []
    for label, im in frames:
        im = im.convert("RGB").resize((w, round(im.height * w / im.width)), Image.Resampling.LANCZOS)
        tiles.append(_label(im, label))
    th = tiles[0].height
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * (w + 4), rows * (th + 4)), (0, 0, 0))
    for k, t in enumerate(tiles):
        sheet.paste(t, ((k % cols) * (w + 4), (k // cols) * (th + 4)))
    return sheet


def clouds_sheet(m: dict) -> None:
    loop = m["clouds"]
    mp4 = next(f["path"] for f in loop["files"] if f["kind"] == "clouds-desktop" and f["format"] == "mp4")
    d = loop["durationSeconds"]
    times = [d * i / 12 for i in range(12)]
    # Either side of the loop join: last frames, then the first frames again.
    join = [d - 0.25, d - 1 / 24, 0.0, 1 / 24]
    frames = [(f"t={t:.2f}s", _video_frame(mp4, t)) for t in times]
    frames += [(f"join {t:.2f}s", _video_frame(mp4, t)) for t in join]
    _sheet(frames, 4, 420).save(QA / "clouds-loop-sheet.png")


def fly_sheet(m: dict) -> None:
    fly = [f for f in m["fly"]["files"] if f["kind"] == "fly-desktop" and f["format"] == "avif"]
    frames = [(f["path"].rsplit("/", 1)[-1], Image.open(ROOT / "public" / f["path"].lstrip("/"))) for f in fly[::8]]
    _sheet(frames, 4, 420).save(QA / "fly-through-sheet.png")


def main() -> None:
    QA.mkdir(parents=True, exist_ok=True)
    m = json.loads(MANIFEST.read_text())
    window_images(m)
    if "clouds" in m:
        composites(m)
        clouds_sheet(m)
    if "fly" in m:
        fly_sheet(m)
    print(f"QA images written to {QA.relative_to(ROOT)}")


if __name__ == "__main__":
    main()


def plane_check(margin: int = 24) -> dict:
    """Automatic check that no plane or drone part reaches inside any crop, on every source frame used.

    Plane and drone parts always enter from the edges of the full source frame (wing: top right;
    window edge: bottom left; propellers: left and right; drone body: bottom). For each frame we find
    dark shapes connected to those source edges, grow their bounding box by `margin` px to cover
    motion-blurred tips, and record any frame where a box overlaps the crop. Natural cloud shadows
    inside the frame are not connected to the edges and are ignored.
    """
    import clouds as cl
    import fly as fl

    def edge_parts(bgr: np.ndarray, sides: dict, v_max: int, s_max: int) -> list:
        # Aircraft parts are neutral (unsaturated) and dark; blue sky and tinted cloud shadow are not.
        hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
        v, s = hsv[..., 2], hsv[..., 1]
        dark = ((v < v_max) & (s < s_max)).astype(np.uint8)
        n, lab, stats, _ = cv2.connectedComponentsWithStats(dark, 8)
        h, w = v.shape
        found = []
        for k in range(1, n):
            x, y, bw, bh, area = stats[k]
            if area < 60:
                continue
            touches = {
                "left": x == 0, "right": x + bw == w, "top": y == 0, "bottom": y + bh == h,
            }
            for name, (side, region) in sides.items():
                x0, y0, x1, y1 = region
                cx, cy = x + bw / 2, y + bh / 2
                if touches[side] and x0 <= cx <= x1 and y0 <= cy <= y1:
                    grown = cv2.dilate((lab == k).astype(np.uint8), kernel)
                    found.append((name, grown))
        return found

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * margin + 1, 2 * margin + 1))

    def overlaps(part, c) -> bool:
        _, grown = part
        return bool(grown[c["y"]: c["y"] + c["h"], c["x"]: c["x"] + c["w"]].any())

    results: dict = {"fly-desktop": [], "fly-mobile": [], "clouds": [], "partsSeen": {}}
    fly_sides = {
        "left propeller": ("left", (0, 200, 640, 720)),
        "right propeller": ("right", (640, 200, 1280, 720)),
        "drone body": ("bottom", (300, 360, 980, 720)),
    }
    for i, f in enumerate(fl.read_segment(), fl.SEGMENT[0]):
        f = fl._undistort(f, fl.FISHEYE_K1)
        parts = edge_parts(f, fly_sides, v_max=90, s_max=55)
        for p in parts:
            results["partsSeen"][p[0]] = results["partsSeen"].get(p[0], 0) + 1
        for tier, c in (("fly-desktop", fl.CROP_DESKTOP), ("fly-mobile", fl.CROP_MOBILE)):
            hits = [p[0] for p in parts if overlaps(p, c)]
            if hits:
                results[tier].append((i, hits))
    # The wing is mid-dark grey against blue sky; the window edge is near black (the grey sea and haze
    # between the clouds is also neutral but much lighter), so each gets its own threshold.
    wing_side = {"wing": ("top", (640, 0, 1280, 360))}
    edge_side = {"window edge": ("left", (0, 360, 640, 720)), "window edge (bottom)": ("bottom", (0, 360, 640, 720))}
    cap = cv2.VideoCapture(str(cl.CLOUDS_SRC))
    i = 0
    while True:
        ok, f = cap.read()
        if not ok:
            break
        parts = edge_parts(f, wing_side, v_max=95, s_max=45) + edge_parts(f, edge_side, v_max=45, s_max=60)
        for p in parts:
            results["partsSeen"][p[0]] = results["partsSeen"].get(p[0], 0) + 1
        hits = [p[0] for p in parts if overlaps(p, cl.CROP)]
        if hits:
            results["clouds"].append((i, hits))
        i += 1
    return results
