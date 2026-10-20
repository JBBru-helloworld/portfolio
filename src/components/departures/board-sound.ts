/*
 * Optional board sound: a very soft mechanical tick per flip, synthesised with the Web Audio API (a short
 * burst of band-passed noise with a fast decay), so there are no audio files and no licences. Off by
 * default; it only exists once the visitor switches it on, and never plays on its own: the audio context
 * is created or resumed from that user gesture. Ticks are capped so a whole board reads as a gentle clatter.
 */
const STORAGE_KEY = "jbbru:board-sound";
const MAX_TICKS_PER_WINDOW = 3;
const WINDOW_MS = 24;

let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;
let windowStart = 0;
let windowCount = 0;

export function savedPreference(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

export function savePreference(on: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    // Storage unavailable (private mode, blocked): the toggle still works for this visit.
  }
}

/** Call from a user gesture (the toggle, or any later click or key) so the browser allows audio. */
export function unlock(): void {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    const len = Math.floor(ctx.sampleRate * 0.03);
    noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  }
  if (ctx.state === "suspended") void ctx.resume();
}

export function tick(): void {
  if (!ctx || !noise || ctx.state !== "running") return;
  const now = performance.now();
  if (now - windowStart > WINDOW_MS) {
    windowStart = now;
    windowCount = 0;
  }
  if (windowCount >= MAX_TICKS_PER_WINDOW) return;
  windowCount++;
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.playbackRate.value = 0.9 + Math.random() * 0.25;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 2200 + Math.random() * 900;
  band.Q.value = 1.4;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.045, t + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.028);
  src.connect(band).connect(gain).connect(ctx.destination);
  src.start(t);
  src.stop(t + 0.035);
}

export function suspend(): void {
  if (ctx && ctx.state === "running") void ctx.suspend();
}
