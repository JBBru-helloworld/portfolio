"""Shared paths and helpers for the window-scene pipeline.

Reads only from assets/window-scene/ and writes only to public/scene/ and
src/content/scene-manifest.json (QA images go to docs/qa/scene/ via qa.py).
"""
from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
ORIGINALS = ROOT / "assets" / "window-scene"
PUBLIC = ROOT / "public" / "scene"
MANIFEST = ROOT / "src" / "content" / "scene-manifest.json"
QA = ROOT / "docs" / "qa" / "scene"

WINDOW_V2_SRC = ORIGINALS / "window-v2.png"  # owner's Canva plate with a real shade (window_v2.py)
CLOUDS_V2_SRC = ORIGINALS / "clouds-v2.mp4"  # naturally blue loop (clouds_v2.py)
FLY_SRC = ORIGINALS / "fly-through.mp4"
ORIGINAL_FILES = (WINDOW_V2_SRC, CLOUDS_V2_SRC, FLY_SRC)


def run(cmd: list[str]) -> None:
    """Run a command, failing loudly with its output."""
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"command failed: {' '.join(cmd)}\n{proc.stderr[-4000:]}")


def ffmpeg(*args: str) -> None:
    run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *args])


def probe(path: Path) -> dict:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration,size:stream=width,height,r_frame_rate,nb_frames,codec_name",
         "-of", "json", str(path)],
        capture_output=True, text=True, check=True,
    )
    return json.loads(out.stdout)


# Shared monochrome grade for both cloud sources, so the cut from the window view to the
# fly-through is seamless. Input and output are luminance in 0..1 (sRGB-encoded).
# A gentle S-curve: lifted blacks (no crush), soft shoulder (no clipped whites).
CLOUD_CURVE_X = np.array([0.00, 0.10, 0.25, 0.45, 0.62, 0.78, 0.90, 1.00])
CLOUD_CURVE_Y = np.array([0.06, 0.10, 0.20, 0.40, 0.58, 0.74, 0.84, 0.90])


def monotone_curve(x: np.ndarray, xs: np.ndarray, ys: np.ndarray) -> np.ndarray:
    """Monotone cubic (Fritsch-Carlson) interpolation through control points."""
    h = np.diff(xs)
    d = np.diff(ys) / h
    m = np.zeros_like(ys)
    m[1:-1] = np.where(d[:-1] * d[1:] > 0, 2 / (1 / d[:-1] + 1 / d[1:]), 0.0)
    m[0], m[-1] = d[0], d[-1]
    x = np.clip(x, xs[0], xs[-1])
    i = np.clip(np.searchsorted(xs, x) - 1, 0, len(h) - 1)
    t = (x - xs[i]) / h[i]
    t2, t3 = t * t, t * t * t
    return (
        (2 * t3 - 3 * t2 + 1) * ys[i]
        + (t3 - 2 * t2 + t) * h[i] * m[i]
        + (-2 * t3 + 3 * t2) * ys[i + 1]
        + (t3 - t2) * h[i] * m[i + 1]
    )


def lut_curve(xs: np.ndarray, ys: np.ndarray) -> np.ndarray:
    """256-entry uint8 lookup table for a monotone curve."""
    x = np.linspace(0, 1, 256)
    return np.clip(np.round(monotone_curve(x, xs, ys) * 255), 0, 255).astype(np.uint8)


def luminance(rgb: np.ndarray) -> np.ndarray:
    """Rec. 709 luma of an sRGB float image in 0..1."""
    return rgb[..., 0] * 0.2126 + rgb[..., 1] * 0.7152 + rgb[..., 2] * 0.0722


def file_entry(path: Path, kind: str, **extra) -> dict:
    rel = "/" + path.relative_to(ROOT / "public").as_posix()
    return {"path": rel, "kind": kind, "bytes": path.stat().st_size, **extra}


def clean_dir(path: Path) -> None:
    if path.exists():
        shutil.rmtree(path)
    path.mkdir(parents=True, exist_ok=True)


def codec_string(path: Path) -> str:
    """RFC 6381 codec string for canPlayType: avc1.PPCCLL for H.264, av01.P.LLT.DD for AV1."""
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                          "stream=codec_name,profile,level,pix_fmt", "-of", "json", str(path)],
                         capture_output=True, text=True, check=True)
    st = json.loads(out.stdout)["streams"][0]
    if st["codec_name"] == "h264":
        profile_idc = {"Baseline": 0x42, "Constrained Baseline": 0x42, "Main": 0x4D, "High": 0x64}[st["profile"]]
        return f"avc1.{profile_idc:02X}00{int(st['level']):02X}"
    if st["codec_name"] == "av1":
        profile = {"Main": 0, "High": 1, "Professional": 2}[st["profile"]]
        depth = 10 if "10" in st["pix_fmt"] else 8
        return f"av01.{profile}.{int(st['level']):02d}M.{depth:02d}"
    raise ValueError(f"unexpected codec {st['codec_name']}")
