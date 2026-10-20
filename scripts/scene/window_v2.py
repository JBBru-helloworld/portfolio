"""Window plate v2 (owner's Canva composition): separate the frame, the shade and the aperture.

Outputs (public/scene/window-v2/):
  frame plate  - the bezel and wall, monochrome, aperture transparent, wall feathered into the void
  shade layer  - the plate's own shade panel and lip, extended upwards with matching matt texture
Geometry (normalised per framing) goes into the manifest: aperture and glass clip paths, frame box,
and the shade's open (as photographed) and closed (lip at the bottom of the glass) positions.

Layers, back to front: clouds (clipped to aperture) / glass sheen (clipped to glass) / shade (clipped
to aperture) / frame plate. The frame sits on top, so the shade slides behind the bezel.
"""
from __future__ import annotations

import cv2
import numpy as np
from PIL import Image

from common import PUBLIC, WINDOW_V2_SRC, clean_dir, file_entry, luminance, monotone_curve

OUT = PUBLIC / "window-v2"

# Glass key: greenness = G - max(R, B). The Canva fill is pure #00FF00 with a hard edge.
KEY_LO, KEY_HI = 0.06, 0.45
CHOKE_PX = 1
EDGE_SOFTEN_SIGMA = 0.6

# Shade separation (source px, 8-bit luminance). The shade body is a flat, crushed black (L 3) inside a
# recess in the top bezel (L 5..12); its edge crosses L 4 within ~15 px once smoothed.
BODY_SMOOTH_SIGMA = 6.0
BODY_MAX_L = 4.0
SEARCH_ROWS = (300, 1150)  # the body lies between these rows
LIP_SMOOTH_SIGMA = 1.5
LIP_BRIGHT_L = 110.0       # bezel and glass are brighter than this; the lip is darker apart from its rim
LIP_BRIGHT_RUN = 14        # rows of sustained brightness that end the lip (the rim highlight is ~6 rows)
LIP_SNAP_ROWS = 16         # glass this close below the run's start is the lip's true lower edge
LIP_SPIKE_COLS = 31        # opening width that removes gasket spikes from the lip's lower outline
SHADE_EDGE_PX = 4          # the frame's alpha ramps over this many px inside the shade outline
SHADE_JOIN_ROWS = 24       # rows over which the synthesised panel blends into the photographed one
SHADE_PROFILE_ROWS = (700, 760)
TRAVEL_UNDERLAP_PX = 3     # closed: the lip tucks this far under the bottom bezel at its lowest gap
EXTENSION_MARGIN_PX = 24

# The shade's track: the bold dark groove that runs round the bezel and meets the pocket at its top
# corners. Traced as one continuous dark line (black-hat line response, smooth path by dynamic
# programming) on rays from the glass centre, seeded where it is unambiguous: left side, mid-height.
TRACK_SEED_X = 2153          # groove centre at the glass's mid-height on the left (measured)
TRACK_RAY_STEP_DEG = 0.25
TRACK_RAY_RANGE_DEG = (234, -54)  # from the left pocket corner, round the bottom, to the right corner
TRACK_RAY_DEPTH_PX = 320     # how far past the glass edge a ray looks
TRACK_LINE_KERNEL = 25       # black-hat kernel: lines up to ~20 px wide respond, broad shadow does not
TRACK_SMOOTH_COST = 4.0      # path cost per px of radial step
TRACK_MAX_STEP = 3
# Widened shade: the photographed lip is straight in the middle; columns beyond its rounded ends are
# rebuilt from a band just inside them, following the lip's fitted curve, so it reaches into the groove.
SHADE_REF_INSET_PX = 220
SHADE_REF_BAND_PX = 40
SHADE_JOIN_COLS = 30
SHADE_TRACK_MARGIN_PX = 24
INNER_OVERLAP_PX = 12

# The lip's soft cast shadow on the view (the plate has none: its glass is a flat key).
LIP_SHADOW_OPACITY = 0.32
LIP_SHADOW_LENGTH_PX = 30.0

# Frame box (source px): outer rim highlight of the frame, measured on the plate (groove at x 2002/3939,
# y 280/3088; rim ~30 px outside it). Layout scales the window by this box.
FRAME_BOX = (1970, 248, 3970, 3115)  # x0, y0, x1, y1 (exclusive)

# Wall feather: the panel's hard edges dissolve into --void (#0A0A0A) with a wide smoothstep.
VOID_L = 10 / 255
FEATHER_X_PX = 420  # panel side margin to the frame rim is ~470 px
FEATHER_Y_PX = 200  # top and bottom margins are ~228 and ~240 px

# Grade: neutral monochrome (the Canva render is warm: wall RGB 11/9/8, bezel 189/187/185). Blacks lift
# from the render's crushed L 3 to just under the void so the feather is invisible; the bezel stays
# clearly the lightest thing, highlights eased slightly.
GRADE_X = np.array([0.000, 0.012, 0.030, 0.080, 0.250, 0.600, 0.800, 1.000])
GRADE_Y = np.array([0.030, 0.034, 0.046, 0.088, 0.245, 0.565, 0.720, 0.850])

LANDSCAPE_WIDTHS = (1920, 2880, 3840)
PORTRAIT_WIDTHS = (1080, 1620)
SHADE_WIDTHS = (480, 720, 960)

AVIF_QUALITY = 62
WEBP_QUALITY = 84
SIMPLIFY_EPS_SRC = 1.3
CLIP_GROW_SRC = 8
NOISE_SEED = 20261020


def _smoothstep(e0: float, e1: float, x: np.ndarray) -> np.ndarray:
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def _run(v: np.ndarray, k: int, fn) -> np.ndarray:
    p = np.pad(v, k // 2, mode="edge")
    return np.array([fn(p[i : i + k]) for i in range(len(v))])


def _grade(lum: np.ndarray) -> np.ndarray:
    return monotone_curve(lum, GRADE_X, GRADE_Y).astype(np.float32)


def key_glass(rgb: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Returns (hard glass mask uint8, soft frame alpha over the glass edge, 1 = opaque)."""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    greenness = g - np.maximum(r, b)
    hard = (greenness > 0.5).astype(np.uint8)
    _, lab, stats, _ = cv2.connectedComponentsWithStats(hard, 8)
    hard = (lab == 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))).astype(np.uint8)
    contours, _ = cv2.findContours(hard, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    hard = np.zeros_like(hard)
    cv2.drawContours(hard, contours, -1, 1, thickness=cv2.FILLED)
    alpha = 1.0 - _smoothstep(KEY_LO, KEY_HI, greenness)
    alpha[hard.astype(bool) & (cv2.erode(hard, np.ones((5, 5), np.uint8)) > 0)] = 0.0
    alpha = cv2.erode(alpha, np.ones((2 * CHOKE_PX + 1,) * 2, np.uint8))
    alpha = np.clip(cv2.GaussianBlur(alpha, (0, 0), EDGE_SOFTEN_SIGMA), 0, 1)
    return hard, alpha


def clean_luminance(rgb: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    """Despilled luminance; partly keyed pixels borrow the nearest fully opaque pixel's value."""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    lum = luminance(np.dstack([r, np.minimum(g, np.maximum(r, b)), b]))
    opaque = (alpha > 0.985).astype(np.uint8)
    _, labels = cv2.distanceTransformWithLabels(1 - opaque, cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
    ys, xs = np.nonzero(opaque)
    lookup = np.zeros(labels.max() + 1, dtype=np.float32)
    lookup[labels[ys, xs]] = lum[ys, xs]
    return np.where(opaque.astype(bool), lum, lookup[labels]).astype(np.float32)


def find_shade(rgb: np.ndarray, glass: np.ndarray) -> dict:
    """Shade outline as photographed: per column, the body's top row and the lip's bottom row."""
    lum = luminance(rgb)
    lum[glass.astype(bool)] = 1.0
    l6 = cv2.GaussianBlur(lum, (0, 0), BODY_SMOOTH_SIGMA) * 255
    l2 = cv2.GaussianBlur(lum, (0, 0), LIP_SMOOTH_SIGMA) * 255

    body = (l6 < BODY_MAX_L).astype(np.uint8)
    body[: SEARCH_ROWS[0]] = 0
    body[SEARCH_ROWS[1] :] = 0
    # Seed: straight above the glass's top-centre, inside the dark body.
    gy, gx = np.nonzero(glass)
    cx = int(np.median(gx))
    dark = np.nonzero(body[: int(gy[gx == cx].min()), cx])[0]
    if not len(dark):
        raise RuntimeError("shade body not found above the glass")
    seed_y = int(np.median(dark))
    _, lab = cv2.connectedComponents(body, connectivity=4)
    body = (lab == lab[seed_y, cx]).astype(np.uint8)

    cols = np.nonzero(body.any(0))[0]
    top = np.array([np.nonzero(body[:, c])[0].min() for c in cols])
    body_bottom = np.array([np.nonzero(body[:, c])[0].max() for c in cols])
    bright = l2 > LIP_BRIGHT_L
    bottom = np.zeros(len(cols), int)
    for i, c in enumerate(cols):
        cs = np.concatenate([[0], np.cumsum(bright[:, c].astype(np.int32))])
        y = body_bottom[i]
        while y < SEARCH_ROWS[1] + 250 and cs[y + LIP_BRIGHT_RUN] - cs[y] < LIP_BRIGHT_RUN:
            y += 1
        # The rim highlight plus the glass can read as one bright run; snap to the glass if it follows.
        near = np.nonzero(glass[max(y - 3, 0) : y + LIP_SNAP_ROWS, c])[0]
        bottom[i] = max(y - 3, 0) + near[0] if len(near) else y
    # Opening removes narrow downward spikes where a column ran down a dark gasket line.
    opened = _run(_run(bottom, LIP_SPIKE_COLS, np.min), LIP_SPIKE_COLS, np.max)
    bottom = np.minimum(bottom, opened)
    bottom = np.round(_run(bottom, 5, np.median)).astype(int)  # single-column jitter at the lip's ends

    mask = np.zeros_like(body)
    for i, c in enumerate(cols):
        mask[top[i] : bottom[i], c] = 1
    mask |= body
    return {"mask": mask, "cols": cols, "top": top, "bottom": bottom}


def find_track(rgb: np.ndarray, glass: np.ndarray, shade_mask: np.ndarray) -> np.ndarray:
    """The shade's track (uint8 mask): everything inside the bezel's groove, plus the pocket and glass."""
    lum = luminance(rgb)
    lum[glass.astype(bool) | shade_mask.astype(bool)] = 1.0
    l1 = cv2.GaussianBlur(lum, (0, 0), 1.0) * 255
    line = cv2.morphologyEx(l1, cv2.MORPH_BLACKHAT,
                            cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (TRACK_LINE_KERNEL,) * 2))
    gy, gx = np.nonzero(glass)
    cx, cy = gx.mean(), gy.mean()
    a0, a1 = TRACK_RAY_RANGE_DEG
    ths = np.deg2rad(np.arange(a0, a1 - 1e-6, -TRACK_RAY_STEP_DEG))
    k = TRACK_RAY_DEPTH_PX
    r0 = np.zeros(len(ths))
    cost = np.zeros((len(ths), k), np.float32)
    for i, th in enumerate(ths):
        dx, dy = np.cos(th), np.sin(th)
        r = 0
        while glass[int(round(cy + dy * r)), int(round(cx + dx * r))]:
            r += 1
        r0[i] = r
        rr = r + np.arange(k)
        cost[i] = -line[np.round(cy + dy * rr).astype(int), np.round(cx + dx * rr).astype(int)]

    seed = int(np.argmin(np.abs(ths - np.pi)))
    k_seed = int(round((cx - TRACK_SEED_X) - r0[seed]))

    def trace(order: list[int]) -> list[int]:
        acc = np.full(k, 1e9)
        acc[k_seed - 2 : k_seed + 3] = cost[order[0], k_seed - 2 : k_seed + 3]
        back = []
        for i in order[1:]:
            best = np.full(k, 1e9)
            arg = np.zeros(k, int)
            for d in range(-TRACK_MAX_STEP, TRACK_MAX_STEP + 1):
                sh = np.roll(acc, d)
                if d > 0:
                    sh[:d] = 1e9
                elif d < 0:
                    sh[d:] = 1e9
                c = sh + TRACK_SMOOTH_COST * abs(d)
                m = c < best
                best[m], arg[m] = c[m], d
            acc = best + cost[i]
            back.append(arg)
        j = int(np.argmin(acc))
        path = [j]
        for arg in reversed(back):
            j -= arg[j]
            path.append(j)
        return path[::-1]

    offset = np.zeros(len(ths), int)
    for order in (list(range(seed, len(ths))), list(range(seed, -1, -1))):
        for i, j in zip(order, trace(order)):
            offset[i] = j
    rad = r0 + offset
    pts = np.stack([cx + np.cos(ths) * rad, cy + np.sin(ths) * rad], 1)
    track = np.zeros_like(glass)
    cv2.fillPoly(track, [np.round(pts).astype(np.int32)], 1)
    track |= glass | shade_mask
    return cv2.morphologyEx(track, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))


def lip_curve(shade: dict) -> np.ndarray:
    """Quadratic fit of the lip's lower edge over its straight middle (np.polyval coefficients)."""
    cols, bottom = shade["cols"], shade["bottom"]
    mid = (cols > cols.min() + SHADE_REF_INSET_PX) & (cols < cols.max() - SHADE_REF_INSET_PX)
    return np.polyfit(cols[mid], bottom[mid], 2)


def shade_travel(glass: np.ndarray, track: np.ndarray, curve: np.ndarray) -> int:
    """Rows the shade moves from open to closed: the lip comes to rest in the groove at the bottom of the
    track, and never leaves any of the glass uncovered."""
    gy, gx = np.nonzero(glass)
    cx, half = gx.mean(), (gx.max() - gx.min()) / 2
    need = 0.0
    for c in range(gx.min(), gx.max() + 1):
        lip = np.polyval(curve, c)
        g = np.nonzero(glass[:, c])[0]
        need = max(need, g.max() + 1 - lip)  # cover the glass
        if abs(c - cx) < 0.3 * half:
            t = np.nonzero(track[:, c])[0]
            need = max(need, t.max() + 1 - lip)  # rest in the groove
    return int(np.ceil(need)) + TRAVEL_UNDERLAP_PX


def _panel_noise(shape: tuple[int, int], std: float, rng: np.random.Generator) -> np.ndarray:
    n = cv2.GaussianBlur(rng.standard_normal(shape).astype(np.float32), (0, 0), 0.8)
    return n / max(float(n.std()), 1e-6) * std


def build_shade(lum_graded: np.ndarray, key_alpha: np.ndarray, shade: dict, track: np.ndarray,
                curve: np.ndarray, travel: int) -> tuple[np.ndarray, dict]:
    """RGBA shade layer: the plate's own panel and lip, extended upwards, and widened so its edges run in
    the groove. Returns the layer and its source box."""
    cols, top, bottom = shade["cols"], shade["top"], shade["bottom"]
    x0, x1 = int(cols.min()), int(cols.max()) + 1
    tx = np.nonzero(track.any(0))[0]
    X0, X1 = int(tx.min()) - SHADE_TRACK_MARGIN_PX, int(tx.max()) + 1 + SHADE_TRACK_MARGIN_PX
    ext = travel + EXTENSION_MARGIN_PX
    y_top = int(top.min()) - ext
    y_bot = int(bottom.max()) + int(LIP_SHADOW_LENGTH_PX * 4)
    h, w = y_bot - y_top, x1 - x0

    def crop(a: np.ndarray, fill: float) -> np.ndarray:
        """Rows above the source image (the extension reaches past it) are filled."""
        out = np.full((h, w), fill, a.dtype)
        out[max(0, -y_top) :] = a[max(0, y_top) : y_bot, x0:x1]
        return out

    # Photographed panel, its horizontal profile (side shading) and its grain.
    src = crop(lum_graded, 0.0)
    band = lum_graded[SHADE_PROFILE_ROWS[0] : SHADE_PROFILE_ROWS[1], x0:x1]
    inside = shade["mask"][SHADE_PROFILE_ROWS[0] : SHADE_PROFILE_ROWS[1], x0:x1].astype(bool)
    profile = np.array([band[inside[:, i], i].mean() if inside[:, i].any() else np.nan for i in range(w)])
    valid = ~np.isnan(profile)
    profile = np.interp(np.arange(w), np.nonzero(valid)[0], profile[valid])
    profile = cv2.GaussianBlur(profile.reshape(1, -1).astype(np.float32), (0, 0), 6).ravel()
    flat = band[inside] - np.repeat(profile.reshape(1, -1), band.shape[0], 0)[inside]
    grain_std = float(flat.std())
    rng = np.random.default_rng(NOISE_SEED)
    synth = profile.reshape(1, -1) + _panel_noise((h, w), grain_std, rng)

    rows = np.arange(h).reshape(-1, 1)
    t = (top - y_top).reshape(1, -1)
    b = (bottom - y_top).reshape(1, -1)
    # Above the photographed top: synthesised panel. Inside the outline: the photograph, with the first
    # SHADE_JOIN_ROWS cross-fading from the synthesised panel so no join can show.
    join = _smoothstep(0, SHADE_JOIN_ROWS, rows - t)
    in_shape = crop(shade["mask"], 0).astype(bool)
    lum = np.where(in_shape, synth * (1 - join) + src * join, synth)
    # Opaque down to the lip's lower edge; along the glass that edge takes the key's soft alpha, so it
    # is anti-aliased exactly like the photograph (b is the first glass row, where the key is ~0).
    alpha = ((rows < b) * crop(key_alpha, 1.0)).astype(np.float32)

    # Widen to the track. Beyond each reference band (just inside the lip's rounded end) every column is
    # the band's straightened average column, moved up or down to follow the lip's curve, with fresh
    # grain; the last SHADE_JOIN_COLS columns cross-fade into the photograph.
    W = X1 - X0
    wl = np.zeros((h, W), np.float32)
    wa = np.zeros((h, W), np.float32)
    wl[:, x0 - X0 : x1 - X0] = lum
    wa[:, x0 - X0 : x1 - X0] = alpha
    yy = np.arange(h, dtype=np.float32).reshape(-1, 1)
    mx = np.zeros((h, 1), np.float32)

    def shifted(col: np.ndarray, dy: float) -> np.ndarray:
        return cv2.remap(col.reshape(-1, 1).astype(np.float32), mx, (yy - dy).astype(np.float32),
                         cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)[:, 0]

    for side in ("left", "right"):
        if side == "left":
            ref0 = x0 + SHADE_REF_INSET_PX
            ref = (ref0, ref0 + SHADE_REF_BAND_PX)
            targets = np.arange(X0, ref0 + SHADE_JOIN_COLS)
        else:
            ref0 = x1 - SHADE_REF_INSET_PX
            ref = (ref0 - SHADE_REF_BAND_PX, ref0)
            targets = np.arange(ref0 - SHADE_JOIN_COLS, X1)
        centre = np.polyval(curve, (ref[0] + ref[1]) / 2)
        # Straighten the band along the lip's curve before averaging, so the thin rim stays sharp.
        band_cols = range(ref[0], ref[1])
        col_l = np.mean([shifted(lum[:, c - x0], centre - np.polyval(curve, c)) for c in band_cols], 0)
        col_a = np.mean([shifted(alpha[:, c - x0], centre - np.polyval(curve, c)) for c in band_cols], 0)
        noise = _panel_noise((h, len(targets)), grain_std, rng)
        for j, xc in enumerate(targets):
            dy = np.polyval(curve, xc) - centre
            sl, sa = shifted(col_l, dy), shifted(col_a, dy)
            sl = sl + noise[:, j] * (sa > 0.5)
            # Cross-fade into the photograph over the join columns (inside the original's own range).
            inner_dist = (xc - ref0) if side == "left" else (ref0 - xc)
            f = float(np.clip(inner_dist / SHADE_JOIN_COLS, 0, 1)) if inner_dist > 0 else 0.0
            f = f * f * (3 - 2 * f)
            k = xc - X0
            wl[:, k] = sl * (1 - f) + wl[:, k] * f
            wa[:, k] = sa * (1 - f) + wa[:, k] * f
    lum, alpha, w = wl, wa, W

    # Soft cast shadow below the lip, following its curve across the whole width.
    lip_rows = (np.polyval(curve, np.arange(X0, X1)) - y_top).reshape(1, -1)
    d = (rows - lip_rows).astype(np.float32)
    shadow = LIP_SHADOW_OPACITY * np.exp(-np.clip(d, 0, None) / LIP_SHADOW_LENGTH_PX) * (d >= 0)
    shadow = cv2.GaussianBlur(shadow.astype(np.float32), (0, 0), 4)
    out_a = alpha + shadow * (1 - alpha)
    out_l = np.where(out_a > 0, lum * alpha / np.maximum(out_a, 1e-6), 0)  # the shadow is black

    rgba = np.dstack([out_l, out_l, out_l, out_a])
    rgba = np.round(np.clip(rgba, 0, 1) * 255).astype(np.uint8)
    return rgba, {"x": X0, "y": y_top, "width": w, "height": h, "extension": ext}


def build_inner(lum_graded: np.ndarray, key_alpha: np.ndarray, glass: np.ndarray, track: np.ndarray) -> tuple[np.ndarray, dict]:
    """The inner bezel (between the groove and the glass), from the photograph: it sits under the shade
    and above the view, so the closing shade covers it as it would on a real window."""
    # Reaches INNER_OVERLAP_PX past the track, under the opaque frame, so the two layers overlap instead
    # of meeting edge to edge (two soft edges at one boundary would let the view show through).
    region = cv2.dilate(track, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * INNER_OVERLAP_PX + 1,) * 2))
    ys, xs = np.nonzero(region)
    x0, x1, y0, y1 = int(xs.min()), int(xs.max()) + 1, int(ys.min()), int(ys.max()) + 1
    lum = lum_graded[y0:y1, x0:x1]
    a = (region[y0:y1, x0:x1] * key_alpha[y0:y1, x0:x1]).astype(np.float32)
    rgba = np.round(np.clip(np.dstack([lum, lum, lum, a]), 0, 1) * 255).astype(np.uint8)
    return rgba, {"x": x0, "y": y0, "width": x1 - x0, "height": y1 - y0}


def frame_alpha(panel_alpha: np.ndarray, track: np.ndarray) -> np.ndarray:
    """Frame plate alpha: wall feathered into the void; the track (inside the groove) transparent, with a
    short ramp so the shade's edge slips softly under the groove's outer half."""
    d_in = cv2.distanceTransform(track, cv2.DIST_L2, 5)
    a = 1 - _smoothstep(0, SHADE_EDGE_PX, d_in)

    ys, xs = np.nonzero(panel_alpha > 0.5)
    px0, px1, py0, py1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    yy, xx = np.indices(panel_alpha.shape, dtype=np.float32)
    fx = _smoothstep(0, FEATHER_X_PX, np.minimum(xx - px0, px1 - 1 - xx))
    fy = _smoothstep(0, FEATHER_Y_PX, np.minimum(yy - py0, py1 - 1 - yy))
    return (a * panel_alpha * fx * fy).astype(np.float32), (int(px0), int(py0), int(px1), int(py1))


def visible_view(glass: np.ndarray, frame_a: np.ndarray, shade_rgba: np.ndarray, shade_box: dict) -> np.ndarray:
    """The view that is actually seen with the shade open: glass not covered by the frame or the lip. The
    scroll push scales the window until the viewport fits inside this region (uint8 mask)."""
    h, w = glass.shape
    shade_a = np.zeros((h, w), np.float32)
    y0 = shade_box["y"]
    ys0, ys1 = max(0, y0), min(h, y0 + shade_box["height"])
    shade_a[ys0:ys1, shade_box["x"] : shade_box["x"] + shade_box["width"]] = shade_rgba[ys0 - y0 : ys1 - y0, :, 3] / 255.0
    view = (glass > 0) & (frame_a < 0.5) & (shade_a < 0.5)
    # Largest piece only, holes filled, so the outline is one clean polygon.
    n, lab, stats, _ = cv2.connectedComponentsWithStats(view.astype(np.uint8), 8)
    view = (lab == 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))).astype(np.uint8)
    contours, _ = cv2.findContours(view, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    out = np.zeros_like(view)
    cv2.drawContours(out, contours, -1, 1, thickness=cv2.FILLED)
    return out


def separate() -> dict:
    src = np.asarray(Image.open(WINDOW_V2_SRC).convert("RGBA"), dtype=np.float32) / 255.0
    rgb, panel_alpha = src[..., :3], src[..., 3]
    glass, key_alpha = key_glass(rgb)
    shade = find_shade(rgb, glass)
    track = find_track(rgb, glass, shade["mask"])
    curve = lip_curve(shade)
    travel = shade_travel(glass, track, curve)
    lum = _grade(clean_luminance(rgb, key_alpha))
    fa, panel_box = frame_alpha(panel_alpha, track)
    # Outside the panel the plate is transparent; give those pixels the void so resampling cannot pull
    # in Canva's black or white.
    lum = np.where(panel_alpha > 0.5, lum, VOID_L)
    frame = np.round(np.clip(np.dstack([lum, lum, lum, fa]), 0, 1) * 255).astype(np.uint8)
    shade_rgba, shade_box = build_shade(lum, key_alpha, shade, track, curve, travel)
    inner_rgba, inner_box = build_inner(lum, key_alpha, glass, track)
    return {
        "frame": frame,
        "glass": glass,
        "aperture": track,
        "view": visible_view(glass, fa, shade_rgba, shade_box),
        "shade_mask": shade["mask"],
        "shade": shade_rgba,
        "shade_box": shade_box,
        "inner": inner_rgba,
        "inner_box": inner_box,
        "travel": travel,
        "panel_box": panel_box,
    }


def _resize_rgba(img: Image.Image, width: int) -> Image.Image:
    height = round(img.height * width / img.width)
    return img.convert("RGBa").resize((width, height), Image.Resampling.LANCZOS).convert("RGBA")


def _save(img: Image.Image, stem: str, entries: list, kind: str) -> None:
    for fmt, ext, opts in (
        ("AVIF", "avif", {"quality": AVIF_QUALITY, "speed": 4}),
        ("WEBP", "webp", {"quality": WEBP_QUALITY, "method": 6, "alpha_quality": 100}),
    ):
        path = OUT / f"{stem}.{ext}"
        img.save(path, fmt, **opts)
        entries.append(file_entry(path, kind, format=ext, width=img.width, height=img.height))


def _path(mask: np.ndarray, w: int, h: int, grow: int) -> tuple[str, int]:
    m = mask
    if grow:
        m = cv2.dilate(mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * grow + 1,) * 2))
    contours, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    poly = cv2.approxPolyDP(max(contours, key=cv2.contourArea), SIMPLIFY_EPS_SRC, True)[:, 0, :].astype(float)
    return "M" + " L".join(f"{x / w:.5f} {y / h:.5f}" for x, y in poly) + " Z", len(poly)


def _norm_box(x: float, y: float, bw: float, bh: float, w: int, h: int) -> dict:
    return {"x": round(x / w, 6), "y": round(y / h, 6), "width": round(bw / w, 6), "height": round(bh / h, 6)}


def _framing(sep: dict, x0: int, y0: int, w: int, h: int) -> dict:
    glass = sep["glass"][y0 : y0 + h, x0 : x0 + w]
    aperture = sep["aperture"][y0 : y0 + h, x0 : x0 + w]
    gpath, gpts = _path(glass, w, h, CLIP_GROW_SRC)
    apath, apts = _path(aperture, w, h, CLIP_GROW_SRC)
    gx, gy, gw, gh = cv2.boundingRect(glass)
    ax, ay, aw, ah = cv2.boundingRect(aperture)
    m = cv2.moments(glass, binaryImage=True)
    fx0, fy0, fx1, fy1 = FRAME_BOX
    sb, ib = sep["shade_box"], sep["inner_box"]
    return {
        "crop": {"x": x0, "y": y0, "width": w, "height": h},
        "clipPathUnits": "objectBoundingBox",
        "clipPathGrowPx": CLIP_GROW_SRC,
        "aperture": {"clipPath": apath, "points": apts, "bbox": _norm_box(ax, ay, aw, ah, w, h)},
        "glass": {
            "clipPath": gpath,
            "points": gpts,
            "bbox": _norm_box(gx, gy, gw, gh, w, h),
            "centre": {"x": round(m["m10"] / m["m00"] / w, 6), "y": round(m["m01"] / m["m00"] / h, 6)},
        },
        "frame": _norm_box(fx0 - x0, fy0 - y0, fx1 - fx0, fy1 - fy0, w, h),
        "inner": _norm_box(ib["x"] - x0, ib["y"] - y0, ib["width"], ib["height"], w, h),
        "view": dict(zip(("clipPath", "points"), _path(sep["view"][y0 : y0 + h, x0 : x0 + w], w, h, 0))),
        "shade": {
            "box": _norm_box(sb["x"] - x0, sb["y"] - y0, sb["width"], sb["height"], w, h),
            "open": 0,
            "closed": round(sep["travel"] / h, 6),
        },
    }


def build(sep: dict | None = None) -> dict:
    clean_dir(OUT)
    sep = sep or separate()
    full = Image.fromarray(sep["frame"], "RGBA")
    src_h, src_w = sep["glass"].shape
    entries: list = []
    for width in LANDSCAPE_WIDTHS:
        _save(_resize_rgba(full, width), f"frame-landscape-{width}", entries, "window-landscape")

    # Portrait: the panel's own width (the canvas around it is empty), full height.
    px0, _, px1, _ = sep["panel_box"]
    portrait = full.crop((px0, 0, px1, src_h))
    for width in PORTRAIT_WIDTHS:
        _save(_resize_rgba(portrait, width), f"frame-portrait-{width}", entries, "window-portrait")

    shade = Image.fromarray(sep["shade"], "RGBA")
    for width in SHADE_WIDTHS:
        _save(_resize_rgba(shade, width), f"shade-{width}", entries, "window-shade")
    inner = Image.fromarray(sep["inner"], "RGBA")
    for width in SHADE_WIDTHS:
        _save(_resize_rgba(inner, width), f"inner-{width}", entries, "window-inner")

    sb = sep["shade_box"]
    return {
        "source": {"file": WINDOW_V2_SRC.name, "width": src_w, "height": src_h},
        "files": entries,
        "shade": {"sourceBox": sb, "travelPx": sep["travel"], "aspect": round(sb["width"] / sb["height"], 6)},
        "inner": {"sourceBox": sep["inner_box"]},
        "landscape": _framing(sep, 0, 0, src_w, src_h),
        "portrait": _framing(sep, px0, 0, px1 - px0, src_h),
    }
