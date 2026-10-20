"use client";

/*
 * The site's one sound system: the board's flap clicks, the corner sign's cabin chime and the passport
 * stamps' thunk. Nothing else makes a sound.
 *
 * - One preference, saved in localStorage, off by default. Nothing plays unless it is on.
 * - One AudioContext, created lazily inside a user gesture (browsers allow audio only after one): switching
 *   the toggle on is that gesture; a preference saved as on from an earlier visit waits, silently, for the
 *   first click, tap or key press anywhere on the page.
 * - The sound files load only once sound is on (never on first load).
 * - A gentle master volume, a cap on simultaneous voices, and silence while the tab is hidden.
 *
 * Flap clicks: real split-flap recordings (CC0, processed by scripts/sound/build.py; credits in
 * docs/CREDITS.md), one click per flip, chosen at random with a slight change of pitch and level. A
 * synthesised click stands in until the files have loaded, and if they cannot be decoded.
 */
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "jbbru:board-sound";
const MASTER = 0.5;
const MAX_VOICES = 8;
/** At most this many clicks start within one burst window, so a full board is a clatter, not a buzz. */
const BURST = { max: 3, ms: 22 };

export type FlapSet = "a" | "b" | "c" | "synth";
export type StampSound = "a" | "b" | "c" | "synth";
export type ChimeSound = "recording" | "synth";

/** The production choices (the owner picks on /dev/sound). */
let flapSet: FlapSet = "a";
let stampSound: StampSound = "a";
/** The owner's chosen Pixabay recording; the synthesised chime plays until it loads, or if it is missing. */
let chimeSound: ChimeSound = "recording";

const CLICKS = 4;
const flapUrls = (set: Exclude<FlapSet, "synth">, ext: string) => ({
  clicks: Array.from({ length: CLICKS }, (_, i) => `/sound/flap-${set}/click-${i + 1}.${ext}`),
  clatter: `/sound/flap-${set}/clatter.${ext}`,
});

// ---------- Preference ----------

let on = false;
let read = false;
const listeners = new Set<() => void>();

function readPreference() {
  if (read || typeof window === "undefined") return;
  read = true;
  try {
    on = window.localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    on = false;
  }
}

export function isSoundOn(): boolean {
  readPreference();
  return on;
}

export function subscribeSound(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The preference, for components (false on the server and in the first client render). */
export function useSoundOn(): boolean {
  return useSyncExternalStore(subscribeSound, isSoundOn, () => false);
}

/**
 * Switches sound on or off. Call it from the toggle's click: switching on is the user gesture that
 * unlocks audio, and a short confirmation flap plays straight away.
 */
export function setSoundOn(value: boolean) {
  readPreference();
  on = value;
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? "on" : "off");
  } catch {
    // Storage unavailable (private mode, blocked): the toggle still works for this visit.
  }
  listeners.forEach((l) => l());
  if (value) {
    unlock();
    void loadAll();
    confirmFlap();
  } else if (ctx?.state === "running") void ctx.suspend();
}

// ---------- Context and unlock ----------

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let voices = 0;
/** Counters for the QA scripts (the voice cap and what was played or dropped). */
const stats = { peak: 0, played: 0, dropped: 0 };
let burstStart = 0;
let burstCount = 0;

function hidden() {
  return typeof document !== "undefined" && document.visibilityState !== "visible";
}

/** Creates or resumes the context. Only ever call this from inside a user gesture. */
export function unlock(): void {
  if (typeof window === "undefined") return;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = MASTER;
    master.connect(ctx.destination);
    document.addEventListener("visibilitychange", () => {
      if (!ctx) return;
      if (hidden()) void ctx.suspend();
      else if (on) void ctx.resume();
    });
  }
  if (ctx.state === "suspended" && !hidden()) void ctx.resume();
}

let booted = false;

/**
 * Called once on page load. With the preference saved as on, audio waits for the visitor's first click,
 * tap or key press anywhere (silently; flips before that simply make no sound).
 */
export function bootSound(): () => void {
  if (booted || typeof window === "undefined") return () => undefined;
  booted = true;
  const onGesture = () => {
    window.removeEventListener("pointerdown", onGesture, true);
    window.removeEventListener("keydown", onGesture, true);
    if (!isSoundOn()) return;
    unlock();
    void loadAll();
  };
  window.addEventListener("pointerdown", onGesture, true);
  window.addEventListener("keydown", onGesture, true);
  return () => {
    booted = false;
    window.removeEventListener("pointerdown", onGesture, true);
    window.removeEventListener("keydown", onGesture, true);
  };
}

const ready = () => on && ctx !== null && master !== null && ctx.state === "running" && !hidden();

/** For one-off sounds (chime, stamp): plays at once, or as soon as a just-unlocked context resumes. */
function whenRunning(fn: () => void) {
  if (ready()) fn();
  else if (on && ctx && master && !hidden() && ctx.state === "suspended") void ctx.resume().then(() => ready() && fn());
}

// ---------- Loading ----------

interface FlapBuffers {
  clicks: AudioBuffer[];
  clatter: AudioBuffer | null;
}
const flapBuffers = new Map<FlapSet, FlapBuffers>();
const stampBuffers = new Map<StampSound, AudioBuffer>();
let chimeBuffer: AudioBuffer | null = null;
const loading = new Map<string, Promise<void>>();
/** Opus (WebM) first; AAC (M4A) for browsers that cannot decode it (older Safari). */
let format: "webm" | "m4a" | null = null;

async function decodeFile(url: string): Promise<AudioBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const data = await res.arrayBuffer();
  return await ctx!.decodeAudioData(data);
}

/** Decodes one file in the working format, settling the format on first use. */
async function decodeAny(webm: string, m4a: string): Promise<AudioBuffer> {
  if (format === "m4a") return decodeFile(m4a);
  try {
    const buffer = await decodeFile(webm);
    format = "webm";
    return buffer;
  } catch {
    format = "m4a";
    return decodeFile(m4a);
  }
}

function once(key: string, job: () => Promise<void>) {
  if (!loading.has(key)) {
    loading.set(
      key,
      job().catch(() => {
        loading.delete(key); // a failed load can be retried
      }),
    );
  }
  return loading.get(key)!;
}

export function loadFlapSet(set: FlapSet = flapSet): Promise<void> {
  if (set === "synth" || !ctx) return Promise.resolve();
  return once(`flap-${set}`, async () => {
    const first = await decodeAny(flapUrls(set, "webm").clicks[0], flapUrls(set, "m4a").clicks[0]); // settles the format
    const urls = flapUrls(set, format!);
    const rest = await Promise.all(urls.clicks.slice(1).map(decodeFile));
    const clatter = await decodeFile(urls.clatter).catch(() => null);
    flapBuffers.set(set, { clicks: [first, ...rest], clatter });
  });
}

export function loadStamp(sound: StampSound = stampSound): Promise<void> {
  if (sound === "synth" || !ctx) return Promise.resolve();
  return once(`stamp-${sound}`, async () => {
    stampBuffers.set(sound, await decodeAny(`/sound/stamp-${sound}.webm`, `/sound/stamp-${sound}.m4a`));
  });
}

export function loadChime(): Promise<void> {
  if (!ctx) return Promise.resolve();
  return once("chime", async () => {
    chimeBuffer = await decodeAny("/sound/chime.webm", "/sound/chime.m4a");
  });
}

function loadAll() {
  return Promise.all([loadFlapSet(), loadStamp(), loadChime()]);
}

// ---------- Playing ----------

function voice(source: AudioScheduledSourceNode) {
  voices++;
  stats.peak = Math.max(stats.peak, voices);
  source.onended = () => voices--;
}

/** Plays a buffer through the master gain, with a pitch and level change. */
function play(buffer: AudioBuffer, gain: number, rate = 1, when = 0) {
  const c = ctx!;
  const src = c.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = rate;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(g).connect(master!);
  voice(src);
  src.start(c.currentTime + when);
}

/** The synthesised click: a short band-passed noise burst over a low body knock. */
let noise: AudioBuffer | null = null;
function synthClick(level: number) {
  const c = ctx!;
  if (!noise) {
    const len = Math.floor(c.sampleRate * 0.04);
    noise = c.createBuffer(1, len, c.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  }
  const t = c.currentTime;
  const src = c.createBufferSource();
  src.buffer = noise;
  src.playbackRate.value = 0.92 + Math.random() * 0.16;
  const band = c.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 1700 + Math.random() * 700;
  band.Q.value = 0.9;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.5 * level, t + 0.0015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
  src.connect(band).connect(g).connect(master!);
  voice(src);
  src.start(t);
  src.stop(t + 0.045);
  // the plastic flap landing: a very short low knock
  const knock = c.createOscillator();
  knock.frequency.setValueAtTime(260 + Math.random() * 60, t);
  knock.frequency.exponentialRampToValueAtTime(120, t + 0.02);
  const kg = c.createGain();
  kg.gain.setValueAtTime(0.0001, t);
  kg.gain.exponentialRampToValueAtTime(0.18 * level, t + 0.002);
  kg.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);
  knock.connect(kg).connect(master!);
  voice(knock);
  knock.start(t);
  knock.stop(t + 0.03);
}

/** One flip of one tile. Capped: a burst of flips in the same instant plays as a few clicks. */
export function flap(set: FlapSet = flapSet): void {
  if (!ready()) return;
  const now = performance.now();
  if (now - burstStart > BURST.ms) {
    burstStart = now;
    burstCount = 0;
  }
  if (burstCount >= BURST.max || voices >= MAX_VOICES) {
    stats.dropped++;
    return;
  }
  burstCount++;
  stats.played++;
  const level = 0.55 + Math.random() * 0.3;
  const buffers = set === "synth" ? null : flapBuffers.get(set);
  if (!buffers?.clicks.length) {
    synthClick(level);
    return;
  }
  const buffer = buffers.clicks[Math.floor(Math.random() * buffers.clicks.length)];
  play(buffer, level, 0.96 + Math.random() * 0.08);
}

/** A short clatter burst (the confirmation when sound is switched on, and the dev page). */
export function clatter(set: FlapSet = flapSet): void {
  if (!ready()) return;
  const buffer = set === "synth" ? null : flapBuffers.get(set)?.clatter;
  if (buffer) {
    play(buffer, 0.7);
    return;
  }
  for (let i = 0; i < 4; i++) window.setTimeout(() => flap(set), i * 45);
}

/** The confirmation when the toggle switches sound on: three quick flaps (once the context runs). */
function confirmFlap() {
  const go = () => {
    burstStart = 0;
    for (let i = 0; i < 3; i++) window.setTimeout(() => flap(), i * 70);
  };
  if (ctx?.state === "running") go();
  else void ctx?.resume().then(go);
}

/**
 * The synthesised cabin chime (the fallback for the owner's recording): two gentle sine tones (high, then low), a soft attack
 * and a long decay, with a quiet octave above each for warmth. Under a second.
 */
export function chime(sound: ChimeSound = chimeSound): void {
  whenRunning(() => {
    if (sound === "recording" && chimeBuffer) play(chimeBuffer, 0.6);
    else playChime();
  });
}

function playChime() {
  const c = ctx!;
  const tone = (freq: number, at: number) => {
    const t = c.currentTime + at;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.025);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.62);
    g.connect(master!);
    for (const [f, level] of [[freq, 1], [freq * 2, 0.12]] as const) {
      const o = c.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      const og = c.createGain();
      og.gain.value = level;
      o.connect(og).connect(g);
      voice(o);
      o.start(t);
      o.stop(t + 0.65);
    }
  };
  tone(740, 0); // F#5
  tone(587.3, 0.3); // D5
}

/** The ink-stamp thunk: a recording, or the synthesised low, soft thump with a little paper noise. */
export function stamp(sound: StampSound = stampSound): void {
  whenRunning(() => voices < MAX_VOICES && playStamp(sound));
}

function playStamp(sound: StampSound) {
  const buffer = sound === "synth" ? null : stampBuffers.get(sound);
  if (buffer) {
    play(buffer, 0.8, 0.98 + Math.random() * 0.04);
    return;
  }
  const c = ctx!;
  const t = c.currentTime;
  const o = c.createOscillator();
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(58, t + 0.12);
  const og = c.createGain();
  og.gain.setValueAtTime(0.0001, t);
  og.gain.exponentialRampToValueAtTime(0.5, t + 0.004);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  o.connect(og).connect(master!);
  voice(o);
  o.start(t);
  o.stop(t + 0.2);
  const len = Math.floor(c.sampleRate * 0.09);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
  const n = c.createBufferSource();
  n.buffer = buf;
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 1800;
  const ng = c.createGain();
  ng.gain.value = 0.12;
  n.connect(lp).connect(ng).connect(master!);
  voice(n);
  n.start(t);
}

// ---------- The dev page (/dev/sound) ----------

/** For /dev/sound only: switch the flap set and stamp sound being auditioned. */
export function audition(next: { flaps?: FlapSet; stamp?: StampSound; chime?: ChimeSound }) {
  if (next.flaps) flapSet = next.flaps;
  if (next.stamp) stampSound = next.stamp;
  if (next.chime) chimeSound = next.chime;
}

/** For the QA scripts: voices now, the peak, clicks played and clicks dropped by the cap, and the format. */
export function soundStats() {
  return { voices, ...stats, maxVoices: MAX_VOICES, format, state: ctx?.state ?? "none" };
}
