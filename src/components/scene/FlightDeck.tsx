"use client";

/*
 * The flight-deck block, top right (the logo is top left): a greeting from the flight deck in the languages of the
 * owner's journey (picked by the visitor's own clock), the flight and cruising lines, the visitor's local
 * time, and an altimeter tape holding 38,000 ft on its outer edge.
 *
 * - The server cannot know the visitor's time, so it renders "Welcome aboard", kept invisible while
 *   JavaScript runs (shown only without it); the browser then shows the greeting for the time of day, so
 *   nothing visibly swaps on a refresh. Each change re-mounts the line (no element moves, so no layout shift).
 * - The word transition is adapted from Skiper UI 8 ("Words preloader"): the old word cuts away and the new
 *   one fades in (here 300 ms, the site's ease-out), each held about 2 s, English always first.
 * - The cycle pauses while the landing is off screen or the tab is hidden; under reduced motion only the
 *   English greeting shows. Screen readers get one static line; the cycling line is aria-hidden.
 * - The local time is the visitor's own, in 24-hour HH:MM, updated each minute. Nothing about the owner's
 *   location is shown, and the browser is never asked for the visitor's location.
 */
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import type { FlightDeck as FlightDeckContent } from "@/content";
import styles from "./FlightDeck.module.css";

const HOLD_MS = 2000;

// ---------- The visitor's clock, as a minute-by-minute store (null on the server) ----------

let minuteKey: string | null = null;
const clockListeners = new Set<() => void>();
let clockTimer = 0;

function readClock() {
  const d = new Date();
  minuteKey = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function subscribeClock(listener: () => void) {
  clockListeners.add(listener);
  if (clockListeners.size === 1) {
    const tick = () => {
      readClock();
      clockListeners.forEach((l) => l());
      clockTimer = window.setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50);
    };
    clockTimer = window.setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50);
  }
  return () => {
    clockListeners.delete(listener);
    if (clockListeners.size === 0) window.clearTimeout(clockTimer);
  };
}

const clockSnapshot = () => {
  if (minuteKey === null) readClock();
  return minuteKey;
};

/** The visitor's local time as "HH:MM", or null on the server and in the first client render. */
function useLocalTime(): string | null {
  return useSyncExternalStore(subscribeClock, clockSnapshot, () => null);
}

type Period = "morning" | "afternoon" | "evening";

function periodOf(time: string, hours: FlightDeckContent["hours"]): Period {
  const h = Number(time.slice(0, 2));
  if (h >= hours.morning && h < hours.afternoon) return "morning";
  if (h >= hours.afternoon && h < hours.evening) return "afternoon";
  return "evening";
}

// ---------- The block ----------

export function FlightDeck({ content }: { content: FlightDeckContent }) {
  const time = useLocalTime();
  const period = time ? periodOf(time, content.hours) : null;
  const [index, setIndex] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  // The cycle: one greeting every HOLD_MS, once the shade is open, only while the landing is on screen and
  // the tab visible, never under reduced motion. It always starts from English.
  useEffect(() => {
    const el = ref.current;
    if (!el || !period) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let inView = true;
    let timer = 0;
    // The block appears with the Scroll cue once the shade is open: the cycle starts then, so English is the
    // first greeting anyone sees.
    const scene = el.closest<HTMLElement>("section[data-phase]");
    let started = !scene || scene.dataset.phase === "open";
    const phaseWatch = new MutationObserver(() => {
      if (started || scene?.dataset.phase !== "open") return;
      started = true;
      phaseWatch.disconnect();
      schedule();
    });
    if (!started && scene) phaseWatch.observe(scene, { attributes: true, attributeFilter: ["data-phase"] });
    const schedule = () => {
      window.clearTimeout(timer);
      if (!started || !inView || document.visibilityState !== "visible") return;
      timer = window.setTimeout(() => {
        setIndex((i) => (i + 1) % content.greetings.length);
        schedule();
      }, HOLD_MS);
    };
    const io = new IntersectionObserver((es) => {
      inView = es.some((e) => e.isIntersecting);
      schedule();
    });
    io.observe(el);
    const onVisibility = () => schedule();
    document.addEventListener("visibilitychange", onVisibility);
    schedule();
    return () => {
      window.clearTimeout(timer);
      phaseWatch.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [period, content.greetings.length]);

  const english = content.greetings[0];
  const greeting = period ? content.greetings[index][period] : content.serverGreeting;
  const language = period ? content.greetings[index].language : "English";
  const spoken = content.srTemplate.replace("{greeting}", period ? english[period] : content.serverGreeting);
  // The block's width never changes: wide enough for the longest greeting line in any language and period
  // (a full-width character counts as one and a half).
  const chars =
    Math.max(content.serverGreeting.length, ...content.greetings.flatMap((g) => [g.morning, g.afternoon, g.evening].map(columns))) +
    1 +
    content.suffix.length;

  return (
    <div ref={ref} className={styles.deck}>
      <div className={styles.lines} style={{ "--chars": chars } as CSSProperties}>
        <p className="sr-only">{spoken}</p>
        {/* Re-mounted on every change (the key), so the new greeting fades in and nothing shifts. */}
        <p key={`${period ?? "server"}-${index}`} className={styles.greeting} aria-hidden="true">
          {/* Until the browser knows the time, the server's "Welcome aboard" holds the line's place unseen
              (shown only without JavaScript), so the first greeting anyone sees is the right one. */}
          <span
            className={styles.word}
            lang={langOf(language)}
            data-cjk={CJK.has(language) ? language.toLowerCase() : undefined}
            data-pending={period ? undefined : ""}
          >
            {greeting}
          </span>{" "}
          {content.suffix}
        </p>
        <p className={styles.line}>{content.lines.flight}</p>
        <p className={styles.line}>{content.lines.cruising}</p>
        <p className={styles.line}>
          {content.lines.localTime}{" "}
          <span key={time ?? "server"} className={styles.time} data-pending={time ? undefined : ""}>
            {time ?? "--:--"}
          </span>
        </p>
      </div>
      <Altimeter altitude={content.altitude} />
    </div>
  );
}

const LANG: Record<string, string> = {
  English: "en",
  French: "fr",
  Afrikaans: "af",
  "Mauritian Creole": "mfe",
  Malay: "ms",
  Mandarin: "zh-Hans",
  isiZulu: "zu",
  German: "de",
  Japanese: "ja",
  Korean: "ko",
  Spanish: "es",
};

/** Languages set in a system CJK face at the mono capitals' visual size. */
const CJK = new Set(["Mandarin", "Japanese", "Korean"]);

/**
 * The width of a word in mono columns. A full-width character (CJK, Hangul, kana), at 0.95em with 0.12em
 * spacing, takes about 1.5 columns of the mono capitals (0.6em plus their spacing).
 */
const columns = (word: string) => Math.ceil([...word].reduce((n, c) => n + (/[\u1100-\u11ff\u3000-\u9fff\uac00-\ud7af\uff00-\uffef]/.test(c) ? 1.5 : 1), 0));
const langOf = (language: string) => LANG[language] ?? "en";

/**
 * The altimeter tape: hairline ticks every 100 ft, numbers every 500 ft, a boxed readout in the middle. The
 * ticks drift a few pixels up and down around the readout, very slowly, as a cruising aircraft holds its
 * altitude (static under reduced motion, paused off screen).
 */
function Altimeter({ altitude }: { altitude: number }) {
  const marks = [-1500, -1000, -500, 0, 500, 1000, 1500].map((d) => altitude + d);
  return (
    <div className={styles.tape} aria-hidden="true">
      <div className={styles.tapeDrift}>
        <div className={styles.ticks} />
        {marks.map((m, i) => (
          <span key={m} className={styles.mark} style={{ top: `calc(50% + ${(3 - i) * 5} * var(--step))` }}>
            {m.toLocaleString("en-GB")}
          </span>
        ))}
      </div>
      <span className={styles.readout}>{altitude.toLocaleString("en-GB")}</span>
    </div>
  );
}
