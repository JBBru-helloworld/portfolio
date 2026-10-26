"""Review images for the owner, written to docs/qa/scene/v2/ (local only). Run after build.py."""
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


V2 = QA / "v2"


def _framing_plate(m: dict, framing: str, width: int) -> Image.Image:
    """Frame plate for a framing, from the largest export, at `width`."""
    kind = f"window-{framing}"
    f = max((f for f in m["window"]["files"] if f["kind"] == kind and f["format"] == "webp"), key=lambda f: f["width"])
    plate = _plate(f["path"])
    return plate.resize((width, round(plate.height * width / plate.width)), Image.Resampling.LANCZOS)


def _shade(m: dict) -> Image.Image:
    f = max((f for f in m["window"]["files"] if f["kind"] == "window-shade" and f["format"] == "webp"), key=lambda f: f["width"])
    return _plate(f["path"])


def _inner(m: dict) -> Image.Image:
    f = max((f for f in m["window"]["files"] if f["kind"] == "window-inner" and f["format"] == "webp"), key=lambda f: f["width"])
    return _plate(f["path"])


def _poster(m: dict) -> Image.Image:
    p = next(f["path"] for f in m["clouds"]["files"] if f["kind"] == "clouds-poster" and f["format"] == "webp")
    return Image.open(ROOT / "public" / p.lstrip("/")).convert("RGB")


def compose(m: dict, framing: str, width: int, lowered: float, view: Image.Image | None = None,
            glass_light: bool = False) -> Image.Image:
    """The scene's layer stack, as the page builds it: view clipped to the aperture, inner bezel, shade
    (moved down by `lowered`, 0 open .. 1 closed) clipped to the aperture, then the frame plate. On --void."""
    fr = m["window"][framing]
    plate = _framing_plate(m, framing, width)
    w, h = plate.size
    aperture = _clip_mask(fr["aperture"], w, h)
    view = view or _poster(m)
    g = fr["glass"]["bbox"]
    pad = 0.02
    bx, by = (g["x"] - pad) * w, (g["y"] - pad) * h
    bw, bh = (g["width"] + 2 * pad) * w, (g["height"] + 2 * pad) * h
    canvas = Image.new("RGB", (w, h), VOID)
    sky = Image.new("RGB", (w, h), VOID)
    sky.paste(_cover(view, round(bw), round(bh)), (round(bx), round(by)))
    canvas.paste(sky, (0, 0), aperture)
    ib = fr["inner"]
    inner = _inner(m).resize((round(ib["width"] * w), round(ib["height"] * h)), Image.Resampling.LANCZOS)
    canvas.paste(inner, (round(ib["x"] * w), round(ib["y"] * h)), inner)
    sb = fr["shade"]["box"]
    shade = _shade(m).resize((round(sb["width"] * w), round(sb["height"] * h)), Image.Resampling.LANCZOS)
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    dy = (fr["shade"]["open"] + (fr["shade"]["closed"] - fr["shade"]["open"]) * lowered) * h
    layer.paste(shade, (round(sb["x"] * w), round(sb["y"] * h + dy)))
    la = np.asarray(layer.split()[3], np.float32) * (np.asarray(aperture, np.float32) / 255)
    layer.putalpha(Image.fromarray(la.astype(np.uint8)))
    canvas.paste(layer, (0, 0), layer)
    canvas.paste(plate, (0, 0), plate)
    return canvas


def _frame_crop(m: dict, framing: str, img: Image.Image, margin: float = 0.08) -> Image.Image:
    f = m["window"][framing]["frame"]
    w, h = img.size
    return img.crop((round((f["x"] - margin * f["width"]) * w), round((f["y"] - margin * f["height"] * 0.5) * h),
                     round((f["x"] + f["width"] * (1 + margin)) * w), round((f["y"] + f["height"] * (1 + margin * 0.5)) * h)))


def window_v2_images(m: dict) -> None:
    V2.mkdir(parents=True, exist_ok=True)
    # 1. Frame plate over a checkerboard (transparency: aperture and the feathered wall).
    plate = _framing_plate(m, "landscape", 1600)
    bg = _checker(*plate.size)
    bg.paste(plate, (0, 0), plate)
    _label(bg, "frame plate (landscape) over checkerboard: aperture and feathered wall are transparent").save(V2 / "plate-checker.png")
    plate_p = _framing_plate(m, "portrait", 700)
    bg = _checker(*plate_p.size)
    bg.paste(plate_p, (0, 0), plate_p)
    _label(bg, "frame plate (portrait)").save(V2 / "plate-portrait-checker.png")

    # 2. Shade layer alone.
    shade = _shade(m)
    bg = _checker(*shade.size, cell=16)
    bg.paste(shade, (0, 0), shade)
    _label(bg, "shade layer: plate's panel + lip, extended upwards").save(V2 / "shade-alone.png")

    # 3. Open, half closed, closed over the clouds.
    states = [("open", 0.0), ("half closed", 0.5), ("closed", 1.0)]
    tiles = [(_label(_frame_crop(m, "landscape", compose(m, "landscape", 2400, v)), n), n) for n, v in states]
    for t, n in tiles:
        t.save(V2 / f"shade-{n.replace(' ', '-')}.png")
    tw = 520
    sheet = Image.new("RGB", (tw * 3 + 8, round(tiles[0][0].height * tw / tiles[0][0].width)), VOID)
    for k, (t, _) in enumerate(tiles):
        sheet.paste(t.resize((tw, round(t.height * tw / t.width)), Image.Resampling.LANCZOS), (k * (tw + 4), 0))
    sheet.save(V2 / "shade-states.png")

    # 4. 400% crops from the full 3840 render: the lip (open) and the bezel where the shade passes
    #    behind it (half closed), at the glass's left edge.
    full_open = compose(m, "landscape", 3840, 0.0)
    full_half = compose(m, "landscape", 3840, 0.5)
    fr = m["window"]["landscape"]
    W, H = full_open.size
    sb, g = fr["shade"]["box"], fr["glass"]["bbox"]
    lip_y = round((sb["y"] + sb["height"]) * H) - round(0.012 * H)
    for name, img, cx, cy in (
        ("lip-left-400", full_open, round(g["x"] * W) + 40, lip_y - 30),
        ("lip-centre-400", full_open, round((g["x"] + g["width"] / 2) * W), lip_y - 30),
        ("bezel-shade-left-400", full_half, round(g["x"] * W), round((g["y"] + g["height"] * 0.47) * H)),
        ("bezel-shade-corner-400", full_half, round(g["x"] * W) + 10, round(g["y"] * H) + 10),
    ):
        crop = img.crop((cx - 60, cy - 60, cx + 60, cy + 60))
        _label(crop.resize((480, 480), Image.Resampling.NEAREST), name.replace("-", " ")).save(V2 / f"{name}.png")

    # 5. Wall feather: the plate on --void, then lifted x6 so the falloff is visible.
    plate = _framing_plate(m, "landscape", 1600)
    canvas = Image.new("RGB", plate.size, VOID)
    canvas.paste(plate, (0, 0), plate)
    _label(canvas.copy(), "frame plate on --void (as shipped)").save(V2 / "wall-feather.png")
    lifted = np.clip(np.asarray(canvas, np.float32) * 6, 0, 255).astype(np.uint8)
    _label(Image.fromarray(lifted), "same, brightness x6: the wall panel's edges dissolve into the void").save(V2 / "wall-feather-lifted.png")


def clouds_v2_images(m: dict) -> None:
    """Saturation sheet, speed comparison clip, and old loop vs new loop clipped to the window."""
    import subprocess

    import clouds_v2 as c2

    V2.mkdir(parents=True, exist_ok=True)
    gen = c2._frames((480, 600))
    for i, f in enumerate(gen):
        if i == 440:
            frame = f
            break
    gen.close()
    tiles = [("source (border cropped, as exported)", np.clip(frame, 0, 1))]
    tiles += [(f"saturation {round(s * 100)}%" + (" (default)" if s == c2.SATURATION else ""), c2.grade(frame, s))
              for s in c2.SATURATION_SHEET]
    _sheet([(n, Image.fromarray((t * 255).astype(np.uint8))) for n, t in tiles], 4, 420).save(V2 / "clouds-saturation.png")

    # Same frame at each saturation inside the window.
    views = [(f"{round(s * 100)}%", Image.fromarray((c2.grade(frame, s) * 255).astype(np.uint8))) for s in c2.SATURATION_SHEET]
    _sheet([(n, _frame_crop(m, "landscape", compose(m, "landscape", 1800, 0.0, view=v))) for n, v in views], 3, 420).save(
        V2 / "clouds-saturation-window.png")

    # Speed: the shipped loop (SPEED) beside the same loop played back at 1.0x, 12 s, side by side.
    mp4 = next(f["path"] for f in m["clouds"]["files"] if f["kind"] == "clouds-desktop" and f["format"] == "mp4")
    src = str(ROOT / "public" / mp4.lstrip("/"))
    speed = m["clouds"]["speed"]
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", src, "-i", src, "-filter_complex",
                    f"[0:v]scale=480:-2,trim=0:12,setpts=PTS-STARTPTS[a];"
                    f"[1:v]setpts={speed}*PTS,scale=480:-2,trim=0:12,setpts=PTS-STARTPTS[b];[a][b]hstack[v]",
                    "-map", "[v]", "-c:v", "libx264", "-crf", "20", "-pix_fmt", "yuv420p", "-an",
                    str(V2 / f"clouds-speed-{speed}x-vs-1.0x.mp4")], check=True)


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
    _sheet(frames, 4, 420).save(V2 / "clouds-loop-sheet.png")


def fly_sheet(m: dict) -> None:
    fly = [f for f in m["fly"]["files"] if f["kind"] == "fly-desktop" and f["format"] == "avif"]
    frames = [(f["path"].rsplit("/", 1)[-1], Image.open(ROOT / "public" / f["path"].lstrip("/"))) for f in fly[::8]]
    _sheet(frames, 4, 420).save(V2 / "fly-through-sheet.png")


def main() -> None:
    QA.mkdir(parents=True, exist_ok=True)
    m = json.loads(MANIFEST.read_text())
    window_v2_images(m)
    if m["clouds"].get("pipeline") == "v2":
        clouds_v2_images(m)
    clouds_sheet(m)
    fly_sheet(m)
    print(f"QA images written to {V2.relative_to(ROOT)}")


if __name__ == "__main__":
    main()


def plane_check(margin: int = 24) -> dict:
    """Automatic check that no drone part reaches inside the fly-through crops, on every source frame used.

    Drone parts always enter from the edges of the full source frame (propellers: left and right; drone
    body: bottom). (clouds-v2 has no aircraft in it; its picture is cropped from a plain border.) For each frame we find
    dark shapes connected to those source edges, grow their bounding box by `margin` px to cover
    motion-blurred tips, and record any frame where a box overlaps the crop. Natural cloud shadows
    inside the frame are not connected to the edges and are ignored.
    """
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

    results: dict = {"fly-desktop": [], "fly-mobile": [], "partsSeen": {}}
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
    return results
