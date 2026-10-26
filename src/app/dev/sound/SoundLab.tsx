"use client";

import { useEffect, useRef, useState } from "react";
import { FlapBoard } from "@/components/departures/flap-engine";
import tileStyles from "@/components/departures/DeparturesBoard.module.css";
import {
  audition,
  chime,
  clatter,
  flap,
  loadChime,
  loadFlapSet,
  loadStamp,
  setSoundOn,
  stamp,
  unlock,
  useSoundOn,
  type FlapSet,
  type StampSound,
} from "@/lib/sound";

export interface Candidate {
  key: string;
  title: string;
  author: string;
  page: string;
}

const MOCK = ["NOW BOARDING", "JB 101  MY JOURNEY       1  BOARDING", "JB 102  SELECTED WORK    2  ON TIME"];

function MockBoard({ onRef }: { onRef: (el: HTMLDivElement | null) => void }) {
  return (
    <div ref={onRef} className={tileStyles.board} style={{ display: "grid", gap: 6 }}>
      {MOCK.map((line, r) => (
        <span key={r} className={tileStyles.tiles} data-flap-row={r} style={{ "--tw": "1.1rem" } as React.CSSProperties}>
          {[...line].map((c, i) => (
            <span key={i} className={tileStyles.tile} data-target={c}>
              {(["top", "bottom", "flap-top", "flap-bottom"] as const).map((part) => (
                <span key={part} className={tileStyles.half} data-part={part}>
                  <span className={tileStyles.glyph} data-glyph={c} />
                </span>
              ))}
            </span>
          ))}
        </span>
      ))}
    </div>
  );
}

const LETTERS = "ABCDEFGH";

export function SoundLab({ flaps, stamps, licence }: { flaps: Candidate[]; stamps: Candidate[]; licence: string }) {
  const on = useSoundOn();
  const boardEl = useRef<HTMLDivElement | null>(null);
  const engine = useRef<FlapBoard | null>(null);
  const [phone, setPhone] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => () => engine.current?.stop(), []);

  const runBoard = async (set: FlapSet) => {
    unlock();
    audition({ flaps: set });
    setStatus(`Loading ${set}...`);
    await loadFlapSet(set);
    setStatus(`Playing flap set ${set}`);
    const el = boardEl.current;
    if (!el) return;
    const rows = [...el.querySelectorAll<HTMLElement>("[data-flap-row]")].map((r) => [...r.querySelectorAll<HTMLElement>("[data-target]")]);
    engine.current?.stop();
    const e = new FlapBoard(rows, {
      ...(phone ? { rowStagger: 300, tileJitter: 20, stepsBefore: [2, 4] as [number, number] } : { rowStagger: 120, tileJitter: 90, stepsBefore: [6, 14] as [number, number] }),
      onFlip: () => flap(set),
    });
    engine.current = e;
    e.prepare();
    e.run();
  };

  const playStamp = async (s: StampSound) => {
    unlock();
    audition({ stamp: s });
    await loadStamp(s);
    stamp(s);
  };

  const flapCandidates: { key: FlapSet; label: string; detail: string; page?: string }[] = [
    ...flaps.map((f, i) => ({ key: f.key as FlapSet, label: LETTERS[i], detail: `${f.title} by ${f.author}`, page: f.page })),
    { key: "synth", label: LETTERS[flaps.length], detail: "Improved synthesised click (fallback, no files)" },
  ];
  const stampCandidates: { key: StampSound; label: string; detail: string; page?: string }[] = [
    ...stamps.map((f, i) => ({ key: f.key as StampSound, label: LETTERS[i], detail: `${f.title} by ${f.author}`, page: f.page })),
    { key: "synth", label: LETTERS[stamps.length], detail: "Synthesised thump with a little paper noise" },
  ];

  return (
    <main style={{ maxWidth: 880, margin: "0 auto", padding: "3rem 1rem", display: "grid", gap: "2rem" }}>
      <header>
        <h1 className="text-2xl font-medium">Sound candidates</h1>
        <p className="mt-2 text-paper-muted">
          Development only. All recordings are {licence}, processed by <code>pnpm sound:build</code>. Candidate A is
          wired up by default.
        </p>
      </header>

      <section style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" className="rounded border border-graphite-3 px-3 py-2" aria-pressed={on} onClick={() => setSoundOn(!on)}>
          Sound is {on ? "on" : "off"} (click to switch)
        </button>
        <label className="text-paper-muted">
          <input type="checkbox" checked={phone} onChange={(e) => setPhone(e.target.checked)} /> Phone timing (one row at a
          time)
        </label>
        <span className="font-mono text-xs text-graphite-4">{status}</span>
      </section>

      <MockBoard onRef={(el) => (boardEl.current = el)} />

      <section>
        <h2 className="text-xl font-medium">Flap sets</h2>
        <ul style={{ display: "grid", gap: "0.75rem", marginTop: "1rem" }}>
          {flapCandidates.map((c) => (
            <li key={c.key} style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
              <strong className="font-mono">{c.label}</strong>
              <button type="button" className="rounded border border-graphite-3 px-3 py-1" disabled={!on} onClick={() => runBoard(c.key)}>
                Flip the board
              </button>
              <button
                type="button"
                className="rounded border border-graphite-3 px-3 py-1"
                disabled={!on}
                onClick={async () => {
                  unlock();
                  await loadFlapSet(c.key);
                  clatter(c.key);
                }}
              >
                Clatter burst
              </button>
              <span className="text-sm text-paper-muted">
                {c.page ? <a href={c.page} className="underline">{c.detail}</a> : c.detail}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-medium">Stamp thunk</h2>
        <ul style={{ display: "grid", gap: "0.75rem", marginTop: "1rem" }}>
          {stampCandidates.map((c) => (
            <li key={c.key} style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
              <strong className="font-mono">{c.label}</strong>
              <button type="button" className="rounded border border-graphite-3 px-3 py-1" disabled={!on} onClick={() => playStamp(c.key)}>
                Play
              </button>
              <span className="text-sm text-paper-muted">
                {c.page ? <a href={c.page} className="underline">{c.detail}</a> : c.detail}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-medium">Cabin chime</h2>
        <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
          <button
            type="button"
            className="rounded border border-graphite-3 px-3 py-1"
            disabled={!on}
            onClick={async () => {
              unlock();
              await loadChime();
              chime("recording");
            }}
          >
            Recording (Pixabay, owner&apos;s choice)
          </button>
          <button type="button" className="rounded border border-graphite-3 px-3 py-1" disabled={!on} onClick={() => chime("synth")}>
            Synthesised (fallback)
          </button>
        </div>
      </section>
    </main>
  );
}
