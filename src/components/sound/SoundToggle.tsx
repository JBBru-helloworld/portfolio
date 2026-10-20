"use client";

/*
 * The sound toggle: a small flap label reading SOUND OFF or SOUND ON, flipped with the board's own
 * mechanics when it changes. A <button aria-pressed> named "Board sound". Used in the board's header and
 * at the foot of the corner sign's panel; both share the one preference (src/lib/sound.ts).
 */
import { useEffect, useRef } from "react";
import { FlapBoard } from "@/components/departures/flap-engine";
import tileStyles from "@/components/departures/DeparturesBoard.module.css";
import { flap, setSoundOn, useSoundOn } from "@/lib/sound";
import styles from "./SoundToggle.module.css";

const FLIP = { rowStagger: 0, tileJitter: 40, stepsBefore: [3, 5] as [number, number] };

interface Props {
  ariaLabel: string;
  onWord: string;
  offWord: string;
  className?: string;
}

export function SoundToggle({ ariaLabel, onWord, offWord, className }: Props) {
  const on = useSoundOn();
  const length = Math.max(onWord.length, offWord.length);
  const tilesRef = useRef<HTMLSpanElement>(null);
  const engine = useRef<FlapBoard | null>(null);
  const first = useRef(true);

  useEffect(() => {
    const el = tilesRef.current;
    if (!el) return;
    const tiles = [...el.querySelectorAll<HTMLElement>("[data-target]")];
    engine.current?.stop();
    const e = new FlapBoard([tiles], { ...FLIP, onFlip: () => flap() });
    engine.current = e;
    e.retarget((on ? onWord : offWord).padEnd(length, " "));
    if (first.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) e.settle();
    else e.run();
    first.current = false;
    return () => e.stop();
  }, [on, onWord, offWord, length]);

  return (
    <button
      type="button"
      className={className ? `${styles.toggle} ${className}` : styles.toggle}
      aria-pressed={on}
      aria-label={ariaLabel}
      onClick={() => setSoundOn(!on)}
    >
      <span ref={tilesRef} className={`${tileStyles.tiles} ${styles.tiles}`} aria-hidden="true">
        {[...offWord.padEnd(length, " ")].map((c, i) => (
          <span key={i} className={`${tileStyles.tile} ${styles.tile}`} data-target={c}>
            {(["top", "bottom", "flap-top", "flap-bottom"] as const).map((part) => (
              <span key={part} className={tileStyles.half} data-part={part}>
                <span className={tileStyles.glyph}>{c}</span>
              </span>
            ))}
          </span>
        ))}
      </span>
    </button>
  );
}
