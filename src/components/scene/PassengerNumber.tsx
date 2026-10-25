"use client";

/*
 * "You are passenger Nº": bottom right of the landing, mirroring the flight-deck block. The number comes from
 * the passenger counter (POST /api/passenger, a Durable Object in cloudflare/worker.ts) and flips up on the
 * board's split-flap tiles, padded to four digits (five past 9,999).
 *
 * Each browser is counted once: the number is saved in localStorage and a returning visitor sees their own
 * number again without a new call. If storage is unavailable, or the call fails, the element stays hidden
 * (nothing is counted again and no error is shown).
 */
import { useEffect, useRef, useState } from "react";
import { FlapBoard } from "@/components/departures/flap-engine";
import tileStyles from "@/components/departures/DeparturesBoard.module.css";
import styles from "./PassengerNumber.module.css";

const KEY = "jbbru:passenger";
const FLIP = { rowStagger: 0, tileJitter: 90, stepsBefore: [6, 11] as [number, number] };

/** The saved number, or "ask" when this browser has none and can save one, or null when storage is blocked. */
function savedNumber(): number | "ask" | null {
  try {
    const saved = window.localStorage.getItem(KEY);
    if (saved && /^\d+$/.test(saved) && Number(saved) > 0) return Number(saved);
    // Only ask if the answer can be kept; otherwise every visit would count again.
    window.localStorage.setItem(`${KEY}:probe`, "1");
    window.localStorage.removeItem(`${KEY}:probe`);
    return "ask";
  } catch {
    return null;
  }
}

export function PassengerNumber({ label, srTemplate }: { label: string; srTemplate: string }) {
  const [n, setN] = useState<number | null>(null);
  const tilesRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const saved = savedNumber();
    if (saved === null) return;
    if (saved !== "ask") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read from localStorage after hydration
      setN(saved);
      return;
    }
    const ctrl = new AbortController();
    fetch("/api/passenger", { method: "POST", credentials: "same-origin", signal: ctrl.signal })
      .then((res) => {
        if (res.ok) return res.json() as Promise<{ passenger?: unknown }>;
        // A refusal's body is never read: cancel it, or the request stays open and the page never goes idle.
        void res.body?.cancel().catch(() => undefined);
        return null;
      })
      .then((data) => {
        const p = data?.passenger;
        if (typeof p !== "number" || !Number.isInteger(p) || p < 1) return;
        try {
          window.localStorage.setItem(KEY, String(p));
        } catch {
          return;
        }
        setN(p);
      })
      .catch(() => undefined);
    return () => ctrl.abort();
  }, []);

  const digits = n === null ? "" : String(n).padStart(4, "0");

  // The tiles flip up from blank to the number (at once under reduced motion).
  useEffect(() => {
    const el = tilesRef.current;
    if (!el || !digits) return;
    const tiles = [...el.querySelectorAll<HTMLElement>("[data-target]")];
    const board = new FlapBoard([tiles], FLIP);
    board.retarget(digits);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) board.settle();
    else board.run();
    return () => board.stop();
  }, [digits]);

  if (n === null) return null;
  return (
    <div className={styles.passenger}>
      <p className="sr-only">{srTemplate.replace("{n}", String(n))}</p>
      <p className={styles.label} aria-hidden="true">
        {label}
      </p>
      <span ref={tilesRef} className={`${tileStyles.tiles} ${styles.tiles}`} aria-hidden="true">
        {[...digits].map((_, i) => (
          <span key={i} className={`${tileStyles.tile} ${styles.tile}`} data-target=" ">
            {(["top", "bottom", "flap-top", "flap-bottom"] as const).map((part) => (
              <span key={part} className={tileStyles.half} data-part={part}>
                <span className={tileStyles.glyph}> </span>
              </span>
            ))}
          </span>
        ))}
      </span>
    </div>
  );
}
