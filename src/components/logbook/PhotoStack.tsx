"use client";

/*
 * Photos taped into the logbook. One photo is a single print; several are a slightly fanned stack that flicks:
 * every 4 s the top print slides off and tucks under the stack (500 ms, ease-in-out).
 *
 * It only flicks by itself while its entry is at least half in view, the tab is visible, and it is the stack
 * most in view (one stack moves at a time, chosen by the small coordinator below). Hover, keyboard focus or a
 * tap pauses it until the visitor presses play. A click, a tap or the arrow keys flick it by hand. Under
 * reduced motion it never advances by itself, and a manual flick swaps at once.
 */
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent } from "react";
import { Pause, Play } from "lucide-react";
import type { LogbookCopy } from "@/content";
import { ProjectPicture } from "@/components/work/ProjectPicture";
import type { Picture } from "@/components/work/media";
import styles from "./Logbook.module.css";

export interface Print {
  picture: Picture;
  alt: string;
  /** Fixed per photo, within ±3°. */
  rotate: number;
  /** A 4:3 print cropped from the photo; otherwise a 4:5 portrait print. A stack takes its first print's shape. */
  landscape: boolean;
  /** Where the crop sits, from the top of the photo (0) to the bottom (100). */
  focus: number;
}

const INTERVAL = 4000;
const FLICK_MS = 500;

// ---------- One stack at a time: the one most in view (at least half) ----------

const ratios = new Map<string, number>();
const coordinatorListeners = new Set<() => void>();
let activeStack: string | null = null;

function reportRatio(id: string, ratio: number | null) {
  if (ratio === null) ratios.delete(id);
  else ratios.set(id, ratio);
  let best: string | null = null;
  let bestRatio = 0.5;
  ratios.forEach((r, k) => {
    if (r >= bestRatio) {
      best = k;
      bestRatio = r;
    }
  });
  if (best !== activeStack) {
    activeStack = best;
    coordinatorListeners.forEach((l) => l());
  }
}

const subscribeActive = (l: () => void) => {
  coordinatorListeners.add(l);
  return () => coordinatorListeners.delete(l);
};

const subscribeVisibility = (l: () => void) => {
  document.addEventListener("visibilitychange", l);
  return () => document.removeEventListener("visibilitychange", l);
};

const subscribeReduced = (l: () => void) => {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", l);
  return () => mq.removeEventListener("change", l);
};

export function PhotoStack({ prints, label, copy }: { prints: Print[]; label: string; copy: LogbookCopy["photos"] }) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [flicking, setFlicking] = useState<number | null>(null);
  const flickTimer = useRef(0);
  const n = prints.length;

  const isActive = useSyncExternalStore(subscribeActive, () => activeStack === id, () => false);
  const visible = useSyncExternalStore(subscribeVisibility, () => document.visibilityState === "visible", () => false);
  const reduced = useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );

  // Report how much of the entry is in view (the stack's row, or the stack itself).
  useEffect(() => {
    const el = ref.current?.closest("tr, [data-entry]") ?? ref.current;
    if (!el || n < 2) return;
    const io = new IntersectionObserver(
      (entries) => reportRatio(id, entries[entries.length - 1].intersectionRatio),
      { threshold: [0, 0.25, 0.5, 0.6, 0.75, 0.9, 1] },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      reportRatio(id, null);
    };
  }, [id, n]);

  const flick = useCallback(
    (dir: 1 | -1) => {
      if (n < 2) return;
      if (reduced) {
        setIndex((i) => (i + dir + n) % n);
        return;
      }
      window.clearTimeout(flickTimer.current);
      // Forward: the top print slides off and tucks under. Back: the bottom print comes up on top.
      setFlicking(dir === 1 ? index : (index - 1 + n) % n);
      setIndex((i) => (i + dir + n) % n);
      flickTimer.current = window.setTimeout(() => setFlicking(null), FLICK_MS);
    },
    [index, n, reduced],
  );

  useEffect(() => () => window.clearTimeout(flickTimer.current), []);

  // Flicks by itself only while active, visible, playing and moving is allowed.
  const running = n > 1 && isActive && visible && !paused && !reduced;
  useEffect(() => {
    if (!running) return;
    const t = window.setTimeout(() => flick(1), INTERVAL);
    return () => window.clearTimeout(t);
  }, [running, index, flick]);

  if (!n) return null;

  const pos = (i: number) => (i - index + n) % n;
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") flick(1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") flick(-1);
    else return;
    e.preventDefault();
    setPaused(true);
  };

  const landscape = prints[0].landscape;
  const shape = landscape ? styles.landscape : styles.portrait;
  const prints_ = (
    <div className={styles.prints} style={{ "--count": n } as CSSProperties}>
      {prints.map((p, i) => (
        <figure
          key={i}
          className={styles.print}
          data-pos={pos(i)}
          data-flick={flicking === i ? (pos(i) === n - 1 ? "out" : "in") : undefined}
          aria-hidden={pos(i) !== 0 || undefined}
          style={{ "--pos": pos(i), "--rotate": `${p.rotate}deg`, "--focus": `${p.focus}%`, zIndex: n - pos(i) } as CSSProperties}
        >
          <ProjectPicture
            picture={p.picture}
            alt={pos(i) === 0 ? p.alt : ""}
            sizes={landscape ? "14rem" : "9.5rem"}
            className={styles.printPicture}
            imgClassName={styles.printImg}
          />
        </figure>
      ))}
    </div>
  );

  if (n === 1) return <div className={`${styles.stack} ${styles.single} ${shape}`}>{prints_}</div>;

  return (
    <div
      ref={ref}
      className={`${styles.stack} ${shape}`}
      role="group"
      aria-roledescription="photo stack"
      // State for QA and styling: whether this stack is the one allowed to move, and whether it is moving.
      data-active={isActive || undefined}
      data-running={running || undefined}
      data-state={[visible ? "visible" : "hidden", reduced ? "reduced" : "motion", paused ? "paused" : "playing"].join(" ")}
      aria-label={label}
      tabIndex={0}
      onKeyDown={onKey}
      onPointerEnter={(e) => e.pointerType === "mouse" && setPaused(true)}
      // Focus on the stack itself pauses it (not focus reaching its play button, which would undo "play").
      onFocus={(e) => e.target === e.currentTarget && setPaused(true)}
    >
      <button
        type="button"
        className={styles.flickArea}
        tabIndex={-1}
        aria-label={copy.next}
        onClick={() => {
          setPaused(true);
          flick(1);
        }}
      >
        {prints_}
      </button>
      <div className={styles.stackControls}>
        <button
          type="button"
          className={styles.playButton}
          aria-label={paused ? copy.play : copy.pause}
          onClick={(e) => {
            e.stopPropagation();
            setPaused((p) => !p);
          }}
        >
          {paused ? <Play size={14} strokeWidth={1.75} aria-hidden="true" /> : <Pause size={14} strokeWidth={1.75} aria-hidden="true" />}
        </button>
        <span className={styles.counter} aria-live="polite">
          <span aria-hidden="true">{`${index + 1} / ${n}`}</span>
          <span className="sr-only">{`${index + 1} ${copy.of} ${n}`}</span>
        </span>
      </div>
    </div>
  );
}
