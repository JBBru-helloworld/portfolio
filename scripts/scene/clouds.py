"""Cloud loop seen through the window: crop out the plane, grade, slow down, loop seamlessly, encode."""
from __future__ import annotations

import json
import os
import subprocess
import tempfile
from pathlib import Path

import cv2
from PIL import Image

from common import CLOUD_CURVE_X, CLOUD_CURVE_Y, CLOUDS_SRC, PUBLIC, clean_dir, ffmpeg, file_entry, probe

OUT = PUBLIC / "clouds"

# Crop (source 1280x720): the wing never reaches below y 73 and the window edge never past
# x 106 (worst case over all 192 frames); margins cover their motion-blur halo.
CROP = {"x": 176, "y": 96, "w": 1104, "h": 624}
DENOISE = "hqdn3d=1.5:1.5:4:4"
SPEED = 0.5            # 0.5 = half speed, via motion-compensated interpolation
LOOP_XFADE = float(os.environ.get("SCENE_LOOP_XFADE", "1.0"))  # seconds of cross-fade at the loop point
UPSCALE = 1.5          # 1104x624 -> 1656x936
SHARPEN = "unsharp=5:5:0.35:5:5:0.0"
MOBILE_WIDTH = 960
FPS = 24

# Encoder settings (tuned for size targets: desktop < 2.5 MB, mobile < 1.2 MB per file).
H264_CRF_DESKTOP, H264_CRF_MOBILE = 25, 26
AV1_CRF_DESKTOP, AV1_CRF_MOBILE = 40, 42
POSTER_AT = 0.5        # fraction of the loop used for the poster frame
AVIF_QUALITY, WEBP_QUALITY = 70, 82

# Rec. 709 luma to all three channels, so the curve below acts on luminance.
GREY = "colorchannelmixer=rr=0.2126:rg=0.7152:rb=0.0722:gr=0.2126:gg=0.7152:gb=0.0722:br=0.2126:bg=0.7152:bb=0.0722"


def curves_filter() -> str:
    pts = " ".join(f"{x:.3f}/{y:.3f}" for x, y in zip(CLOUD_CURVE_X, CLOUD_CURVE_Y))
    return f"curves=all='{pts}'"


def graded_intermediate(work: Path, speed: float = SPEED) -> tuple[Path, float]:
    """Crop, denoise, grade and slow down into a near-lossless intermediate. Returns (path, duration)."""
    slow = work / f"slow-{speed}.mkv"
    vf = ",".join([
        f"crop={CROP['w']}:{CROP['h']}:{CROP['x']}:{CROP['y']}",
        DENOISE,
        GREY,
        curves_filter(),
        f"setpts={1 / speed:.4f}*PTS",
        f"minterpolate=fps={FPS}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1",
        "format=yuv444p",
    ])
    ffmpeg("-i", str(CLOUDS_SRC), "-vf", vf, "-an", "-c:v", "ffv1", str(slow))
    duration = float(probe(slow)["format"]["duration"])
    return slow, duration


def seamless_loop(slow: Path, duration: float, work: Path, xfade: float = LOOP_XFADE) -> tuple[Path, float]:
    """Cross-fade the tail into the head so the loop point is invisible. Output length = D - T."""
    t = xfade
    out = work / f"loop-{t}.mkv"
    fc = (
        f"[0:v]trim=start={t}:end={duration},setpts=PTS-STARTPTS[a];"
        f"[0:v]trim=start=0:end={t},setpts=PTS-STARTPTS[b];"
        f"[a][b]xfade=transition=fade:duration={t}:offset={duration - 2 * t},"
        f"scale=iw*{UPSCALE}:ih*{UPSCALE}:flags=lanczos,{SHARPEN},format=yuv444p[v]"
    )
    ffmpeg("-i", str(slow), "-filter_complex", fc, "-map", "[v]", "-an", "-c:v", "ffv1", str(out))
    return out, float(probe(out)["format"]["duration"])


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


def encode(loop: Path, entries: list) -> None:
    for tier, width, h264_crf, av1_crf in (
        ("desktop", None, H264_CRF_DESKTOP, AV1_CRF_DESKTOP),
        ("mobile", MOBILE_WIDTH, H264_CRF_MOBILE, AV1_CRF_MOBILE),
    ):
        scale = [] if width is None else ["-vf", f"scale={width}:-2:flags=lanczos"]
        mp4 = OUT / f"clouds-{tier}.mp4"
        ffmpeg("-i", str(loop), *scale, "-an", "-c:v", "libx264", "-preset", "veryslow", "-crf", str(h264_crf),
               "-pix_fmt", "yuv420p", "-profile:v", "high", "-tune", "film", "-movflags", "+faststart", str(mp4))
        webm = OUT / f"clouds-{tier}.webm"
        ffmpeg("-i", str(loop), *scale, "-an", "-c:v", "libsvtav1", "-preset", "5", "-crf", str(av1_crf),
               "-pix_fmt", "yuv420p", str(webm))
        for path, fmt, codec in ((mp4, "mp4", "h264"), (webm, "webm", "av1")):
            info = probe(path)["streams"][0]
            entries.append(file_entry(path, f"clouds-{tier}", format=fmt, codec=codec,
                                      width=info["width"], height=info["height"],
                                      mime=f'video/{fmt}; codecs="{codec_string(path)}"'))


def poster(loop: Path, duration: float, entries: list) -> None:
    cap = cv2.VideoCapture(str(loop))
    cap.set(cv2.CAP_PROP_POS_MSEC, duration * POSTER_AT * 1000)
    ok, frame = cap.read()
    if not ok:
        raise RuntimeError("could not read poster frame")
    im = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    for fmt, ext, opts in (("AVIF", "avif", {"quality": AVIF_QUALITY, "speed": 4}),
                           ("WEBP", "webp", {"quality": WEBP_QUALITY, "method": 6})):
        path = OUT / f"clouds-poster.{ext}"
        im.save(path, fmt, **opts)
        entries.append(file_entry(path, "clouds-poster", format=ext, width=im.width, height=im.height))


def build() -> dict:
    clean_dir(OUT)
    entries: list = []
    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp)
        slow, d = graded_intermediate(work)
        loop, loop_d = seamless_loop(slow, d, work)
        encode(loop, entries)
        poster(loop, loop_d, entries)
    return {
        "durationSeconds": round(loop_d, 3),
        "fps": FPS,
        "speed": SPEED,
        "crossfadeSeconds": LOOP_XFADE,
        "crop": CROP,
        "files": entries,
    }
