"use client";

/*
 * The split-flap departures board: the site's introduction. The real text is a semantic table (explicit
 * ARIA roles keep its semantics when the phone layout changes how rows display); the flap tiles are
 * decorative and aria-hidden. Server-rendered tiles already show the final text, so the board reads
 * correctly without JavaScript and under reduced motion; otherwise it flips into place once, when it is
 * about 60% into view.
 */
import { useEffect, useRef, useState } from "react";
import { Plane, Volume2, VolumeX } from "lucide-react";
import type { Departures } from "@/content";
import { FlapBoard } from "./flap-engine";
import { savePreference, savedPreference, tick, unlock } from "./board-sound";
import styles from "./DeparturesBoard.module.css";

const ROW_STAGGER_MS = 120;
const TILE_JITTER_MS = 90;
const STEPS_BEFORE: [number, number] = [6, 14];
const COLUMNS = { code: 4, destination: 32, status: 8 };

function Tiles({ text, length, row, tone }: { text: string; length?: number; row: number; tone?: "amber" | "muted" }) {
  const cells = [...text.padEnd(length ?? text.length, " ")];
  return (
    <span className={styles.tiles} data-flap-row={row} data-tone={tone} aria-hidden="true">
      {cells.map((c, i) => (
        <span key={i} className={styles.tile} data-target={i < text.length ? c : undefined}>
          {(["top", "bottom", "flap-top", "flap-bottom"] as const).map((part) => (
            <span key={part} className={styles.half} data-part={part}>
              <span className={styles.glyph}>{c}</span>
            </span>
          ))}
        </span>
      ))}
    </span>
  );
}

export function DeparturesBoard({ board }: { board: Departures }) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [sound, setSound] = useState(false);
  const soundRef = useRef(false);
  soundRef.current = sound;

  // The saved sound preference (off unless the visitor switched it on before).
  useEffect(() => setSound(savedPreference()), []);

  // With sound on, any click or key press lets the browser start audio; it never starts on its own.
  useEffect(() => {
    if (!sound) return;
    const onGesture = () => unlock();
    window.addEventListener("pointerdown", onGesture, { once: true });
    window.addEventListener("keydown", onGesture, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
    };
  }, [sound]);

  useEffect(() => {
    const el = boardRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; // settled, as rendered
    const groups = new Map<number, HTMLElement[]>();
    el.querySelectorAll<HTMLElement>("[data-flap-row]").forEach((t) => {
      const row = Number(t.dataset.flapRow);
      const tiles = [...t.querySelectorAll<HTMLElement>("[data-target]")];
      groups.set(row, [...(groups.get(row) ?? []), ...tiles]);
    });
    const rows = [...groups.keys()].sort((a, b) => a - b).map((k) => groups.get(k)!);
    const engine = new FlapBoard(rows, {
      rowStagger: ROW_STAGGER_MS,
      tileJitter: TILE_JITTER_MS,
      stepsBefore: STEPS_BEFORE,
      onFlip: () => soundRef.current && tick(),
      onDone: (ms) => {
        el.setAttribute("data-settled", "true");
        el.removeAttribute("data-running");
        el.setAttribute("data-settle-ms", String(Math.round(ms)));
      },
    });
    // Off screen until the curtain rise, so showing the starting characters now is never seen as a jump.
    engine.prepare();
    el.setAttribute("data-settled", "false");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        el.setAttribute("data-running", "true");
        engine.run();
      },
      { rootMargin: "0px 0px -40% 0px", threshold: 0 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      engine.stop();
      engine.settle();
    };
  }, []);

  const toggleSound = () => {
    const on = !sound;
    if (on) unlock();
    setSound(on);
    savePreference(on);
  };

  const { header, rows, columns } = board;
  return (
    <section className={styles.section} data-curtain="" aria-labelledby="departures-heading">
      <div className={styles.feather} aria-hidden="true" />
      <div className={styles.solid} id="departures" tabIndex={-1}>
        <div className={styles.inner}>
          <div className={styles.head}>
            <h2 id="departures-heading" className={styles.title}>
              <Plane className={styles.icon} aria-hidden="true" strokeWidth={1.5} />
              {board.title}
            </h2>
            <button
              type="button"
              className={styles.sound}
              aria-pressed={sound}
              aria-label={board.soundLabel}
              onClick={toggleSound}
            >
              {sound ? <Volume2 aria-hidden="true" strokeWidth={1.5} /> : <VolumeX aria-hidden="true" strokeWidth={1.5} />}
            </button>
          </div>
          <div className={styles.rule} aria-hidden="true" />

          <div ref={boardRef} className={styles.board}>
            <p className={styles.boarding}>
              <span className="sr-only">{`${header.label}: ${header.name}, ${header.role}`}</span>
              <span className={styles.boardingLine}>
                <Tiles text={header.label} row={0} tone="amber" />
                <Tiles text={header.name} row={1} />
              </span>
              <span className={styles.boardingLine}>
                <Tiles text={header.role} row={2} />
              </span>
            </p>

            <table className={styles.table} role="table">
              <thead role="rowgroup">
                <tr className={styles.row} role="row">
                  <th className={styles.colCode} role="columnheader" scope="col">
                    {columns.flight}
                  </th>
                  <th className={styles.colDest} role="columnheader" scope="col">
                    {columns.destination}
                  </th>
                  <th className={styles.colStatus} role="columnheader" scope="col">
                    {columns.remarks}
                  </th>
                </tr>
              </thead>
              <tbody role="rowgroup">
                {rows.map((r, i) => (
                  <tr key={r.code} className={styles.row} role="row">
                    <td className={styles.colCode} role="cell">
                      <span className="sr-only">{r.code}</span>
                      <Tiles text={r.code} length={COLUMNS.code} row={3 + i} />
                    </td>
                    <td className={styles.colDest} role="cell">
                      <span className="sr-only">{r.destination}</span>
                      <Tiles text={r.destination} length={COLUMNS.destination} row={3 + i} />
                    </td>
                    <td className={styles.colStatus} role="cell">
                      <span className="sr-only">{r.status}</span>
                      <Tiles text={r.status} length={COLUMNS.status} row={3 + i} tone="muted" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
