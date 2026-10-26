"""
Board and stamp sounds: from CC0 Freesound recordings to small web files. Run with `pnpm sound:build`.

For each source (listed below with its page, author and licence, each checked on the sound's own page):
  1. download the public HQ preview into assets/sound/ (originals are never committed);
  2. decode to mono 48 kHz, high-pass away rumble and remove the noise floor (ffmpeg afftdn, with a noise
     profile taken from the recording's quietest stretch);
  3. flap sets: find the transients, keep the most isolated single-flap clicks (four, chosen to differ in
     brightness) and the densest 0.6 s as a clatter burst; stamp sounds: the strongest single press;
  4. normalise (peak -3 dBFS, clicks matched in loudness), fade the edges, and export Opus in WebM plus an
     AAC (M4A) fallback for Safari to public/sound/.

Prints the sizes, so the chosen set can be kept under about 60 KB.
"""
from __future__ import annotations

import json
import subprocess
import sys
import urllib.request
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "assets" / "sound"
OUT = ROOT / "public" / "sound"
SR = 48000

FLAPS = {
    "a": {
        "page": "https://freesound.org/people/ngruber/sounds/261244/",
        "preview": "https://cdn.freesound.org/previews/261/261244_2736862-hq.mp3",
        "author": "ngruber",
        "title": "Split Flap Display",
    },
    "b": {
        "page": "https://freesound.org/people/pfp2000/sounds/415662/",
        "preview": "https://cdn.freesound.org/previews/415/415662_2493330-hq.mp3",
        "author": "pfp2000",
        "title": "Train Station Display Board.wav",
    },
    "c": {
        "page": "https://freesound.org/people/Moulaythami/sounds/856513/",
        "preview": "https://cdn.freesound.org/previews/856/856513_10196790-hq.mp3",
        "author": "Moulaythami",
        "title": "Mechanical roller for display panels",
    },
}
STAMPS = {
    "a": {
        "page": "https://freesound.org/people/kermite607/sounds/362622/",
        "preview": "https://cdn.freesound.org/previews/362/362622_3165091-hq.mp3",
        "author": "kermite607",
        "title": "Stamp",
    },
    "b": {
        "page": "https://freesound.org/people/I.fekry/sounds/470710/",
        "preview": "https://cdn.freesound.org/previews/470/470710_9906084-hq.mp3",
        "author": "I.fekry",
        "title": "traditional stamp.wav",
    },
    "c": {
        "page": "https://freesound.org/people/whammy/sounds/514486/",
        "preview": "https://cdn.freesound.org/previews/514/514486_22858-hq.mp3",
        "author": "whammy",
        "title": "Office stamp",
    },
}
LICENCE = "CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/)"

# The cabin chime: chosen by the owner, downloaded by hand from Pixabay (scripted downloads are refused)
# into assets/sound/chime-pixabay.mp3. Pixabay Content License, not CC0: fine inside the site, never
# redistributed on its own.
CHIME = {
    "file": "chime-pixabay.mp3",
    "page": "https://pixabay.com/sound-effects/film-special-effects-airbus-cabin-pa-beep-tone-passenger-announcement-chime-358248/",
    "author": "arunangshubanerjee",
    "title": "Airbus Cabin PA Beep Tone (Passenger Announcement Chime)",
    "licence": "Pixabay Content License (https://pixabay.com/service/license-summary/)",
}


def run(*args: str) -> bytes:
    return subprocess.run(args, check=True, capture_output=True).stdout


def fetch(url: str, dest: Path) -> Path:
    if not dest.exists():
        dest.parent.mkdir(parents=True, exist_ok=True)
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (jbbru.com sound build)"})
        with urllib.request.urlopen(req) as r:
            dest.write_bytes(r.read())
    return dest


def decode(path: Path, filters: str = "") -> np.ndarray:
    chain = "highpass=f=120" + (f",{filters}" if filters else "")
    raw = run("ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(SR), "-af", chain, "-f", "f32le", "-")
    return np.frombuffer(raw, dtype=np.float32).copy()


def envelope(x: np.ndarray, ms: float = 1.0) -> np.ndarray:
    n = int(SR * ms / 1000)
    frames = len(x) // n
    return np.sqrt((x[: frames * n].reshape(frames, n) ** 2).mean(axis=1))


def denoised(path: Path) -> np.ndarray:
    """Removes the noise floor: afftdn with a noise profile learnt from the quietest 300 ms."""
    x = decode(path)
    env = envelope(x, 10)
    win = 30
    sums = np.convolve(env, np.ones(win), "valid")
    quiet = int(np.argmin(sums)) * 10 / 1000
    return decode(
        path,
        f"asendcmd=c='{quiet:.3f} afftdn@n sn start; {quiet + 0.3:.3f} afftdn@n sn stop',afftdn@n=nr=18:nf=-60",
    )


def onsets(x: np.ndarray, min_gap_ms: float = 35) -> list[int]:
    env = envelope(x, 1)
    smooth = np.convolve(env, np.ones(3) / 3, "same")
    rise = np.diff(smooth, prepend=smooth[0])
    thr = np.percentile(smooth, 60) + 0.25 * (smooth.max() - np.percentile(smooth, 60))
    peaks: list[int] = []
    for i in range(2, len(smooth) - 2):
        if smooth[i] >= thr and smooth[i] == smooth[i - 2 : i + 3].max() and rise[i - 1] > 0:
            if not peaks or i - peaks[-1] >= min_gap_ms:
                peaks.append(i)
    return [p * SR // 1000 for p in peaks]


def fade(y: np.ndarray, fin_ms: float, fout_ms: float) -> np.ndarray:
    y = y.copy()
    a, b = int(SR * fin_ms / 1000), int(SR * fout_ms / 1000)
    if a:
        y[:a] *= np.linspace(0, 1, a) ** 2
    if b:
        y[-b:] *= np.linspace(1, 0, b) ** 2
    return y


def normalise(y: np.ndarray, peak_db: float = -3.0) -> np.ndarray:
    return y * (10 ** (peak_db / 20) / max(np.abs(y).max(), 1e-6))


def centroid(y: np.ndarray) -> float:
    spec = np.abs(np.fft.rfft(y * np.hanning(len(y))))
    freqs = np.fft.rfftfreq(len(y), 1 / SR)
    return float((spec * freqs).sum() / max(spec.sum(), 1e-9))


def encode(y: np.ndarray, stem: Path) -> dict[str, int]:
    stem.parent.mkdir(parents=True, exist_ok=True)
    pcm = y.astype(np.float32).tobytes()
    sizes = {}
    for ext, codec in (("webm", ["-c:a", "libopus", "-b:a", "32k", "-application", "audio"]), ("m4a", ["-c:a", "aac", "-b:a", "48k"])):
        out = stem.with_suffix(f".{ext}")
        subprocess.run(
            ["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", *codec,
             "-map_metadata", "-1", "-fflags", "+bitexact", str(out)],
            input=pcm, check=True,
        )
        sizes[ext] = out.stat().st_size
    return sizes


def flap_set(key: str, src: dict) -> dict:
    x = denoised(fetch(src["preview"], SRC / f"flap-{key}.mp3"))
    hits = onsets(x, 15)
    pre = int(SR * 0.004)
    env = envelope(x, 1)
    scored = []
    for j, h in enumerate(hits):
        # A click runs until just before the next flap (25 to 75 ms), so dense recordings still give
        # single clicks rather than a smear of several.
        gap = (hits[j + 1] - h) if j + 1 < len(hits) else int(SR * 0.075)
        post = int(min(max(gap - SR * 0.003, SR * 0.025), SR * 0.075))
        if h - pre < SR // 10 or h + post + SR // 10 > len(x):
            continue
        clip = x[h - pre : h + post]
        ms = h * 1000 // SR
        attack = env[ms : ms + 8].max()
        tail = env[ms + 12 : ms + post * 1000 // SR].mean() if post * 1000 // SR > 14 else attack
        before = env[max(0, ms - 40) : ms - 3].mean()
        # How much the attack stands out from its own tail and from what came before.
        isolation = attack / (0.5 * tail + 0.5 * before + 1e-6)
        scored.append((isolation, h, clip))
    if len(scored) < 4:
        sys.exit(f"sound:build: only {len(scored)} usable clicks in flap set {key}")
    scored.sort(key=lambda s: -s[0])
    best = scored[:16]
    # Four that differ in brightness: spread across the centroid range of the most isolated clicks.
    best.sort(key=lambda s: centroid(s[2]))
    picks = [best[round(i * (len(best) - 1) / 3)] for i in range(4)]
    out: dict = {"clicks": [], "isolation": [round(float(p[0]), 1) for p in picks]}
    rms = [np.sqrt((p[2] ** 2).mean()) for p in picks]
    target = float(np.median(rms))
    for i, p in enumerate(picks):
        y = fade(p[2] * (target / rms[i]), 1.5, len(p[2]) * 400 / SR)
        out["clicks"].append(encode(normalise(y, -3.0), OUT / f"flap-{key}" / f"click-{i + 1}"))
    # The clatter: the 0.6 s with the most onsets.
    win = int(SR * 0.6)
    starts = [h - int(SR * 0.02) for h in hits if h - int(SR * 0.02) > 0 and h + win < len(x)]
    density = [(sum(1 for o in hits if s <= o < s + win), s) for s in starts]
    _, s = max(density)
    out["clatter"] = encode(normalise(fade(x[s : s + win], 5, 180), -4.0), OUT / f"flap-{key}" / "clatter")
    out["clatterOnsets"] = max(density)[0]
    return out


def stamp(key: str, src: dict) -> dict:
    x = denoised(fetch(src["preview"], SRC / f"stamp-{key}.mp3"))
    hits = onsets(x, 120)
    env = envelope(x, 1)
    h = max(hits, key=lambda o: env[min(o * 1000 // SR, len(env) - 1)])
    y = x[max(0, h - int(SR * 0.008)) : h + int(SR * 0.32)]
    # Muffled: a gentle low-pass, as heard through a passport's pages.
    pcm = subprocess.run(
        ["ffmpeg", "-v", "error", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-af", "lowpass=f=3200", "-f", "f32le", "-"],
        input=y.astype(np.float32).tobytes(), capture_output=True, check=True,
    ).stdout
    y = np.frombuffer(pcm, dtype=np.float32)
    return encode(normalise(fade(y, 2, 150), -3.0), OUT / f"stamp-{key}")


def chime() -> dict | None:
    """The recording as it is: both tones and their full natural decay; only the silence before is trimmed."""
    src = SRC / CHIME["file"]
    if not src.exists():
        print(f"chime: {src.relative_to(ROOT)} not found; the synthesised chime stays in use")
        return None
    x = decode(src)
    env = envelope(x, 5)
    db = 20 * np.log10(env + 1e-9)
    loud = np.nonzero(db > db.max() - 70)[0]
    start = max(0, loud[0] * 5 - 10) * SR // 1000
    y = x[start : loud[-1] * 5 * SR // 1000 + SR // 50]
    return encode(normalise(fade(y, 3, 20), -6.0), OUT / "chime")


def main() -> None:
    manifest = {"licence": LICENCE, "flaps": {}, "stamps": {}}
    c = chime()
    if c:
        manifest["chime"] = {**CHIME, **c}
        print(f"chime: {CHIME['title']} by {CHIME['author']}: webm {c['webm'] / 1024:.1f} KB, m4a {c['m4a'] / 1024:.1f} KB")
    total = 0
    for key, src in FLAPS.items():
        res = flap_set(key, src)
        manifest["flaps"][key] = {**src, **res}
        webm = sum(c["webm"] for c in res["clicks"]) + res["clatter"]["webm"]
        m4a = sum(c["m4a"] for c in res["clicks"]) + res["clatter"]["m4a"]
        print(f"flap {key}: {src['title']} by {src['author']}: webm {webm / 1024:.1f} KB, m4a {m4a / 1024:.1f} KB,"
              f" click isolation {res['isolation']}, clatter onsets {res['clatterOnsets']}")
        total += webm
    for key, src in STAMPS.items():
        res = stamp(key, src)
        manifest["stamps"][key] = {**src, **res}
        print(f"stamp {key}: {src['title']} by {src['author']}: webm {res['webm'] / 1024:.1f} KB, m4a {res['m4a'] / 1024:.1f} KB")
    (SRC / "manifest.json").write_text(json.dumps(manifest, indent=2))
    print(f"sound:build: done ({OUT.relative_to(ROOT)})")


if __name__ == "__main__":
    main()
