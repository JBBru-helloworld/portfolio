"use client";

/*
 * The split-flap departures board: the site's introduction and its map. Below the boarding line, each row
 * is a link to one section (destinations.ts). Choosing a row flips its remark to BOARDING, then glides
 * there; sections already visited read DEPARTED the next time the board is on screen.
 *
 * The flap tiles are decorative and aria-hidden: the boarding line has sr-only text, and each row link has
 * its own name ("Gate 1: My journey") and description (flight and remark). Server-rendered tiles already
 * show the final text, so the board reads correctly without JavaScript and under reduced motion; otherwise
 * it flips into place once, when it is about 60% into view.
 */
import { memo, useEffect, useRef, useState, type MouseEvent } from "react";
import { Plane } from "lucide-react";
import type { Departures, Destination, DestinationRemark } from "@/content";
import { getState, glideTo, loadVisited, remarkOf, setBoarding, subscribe, useNavState } from "@/components/nav/site-state";
import { FlapBoard } from "./flap-engine";
import { SoundToggle } from "@/components/sound/SoundToggle";
import { flap, isSoundOn } from "@/lib/sound";
import styles from "./DeparturesBoard.module.css";

/** Columns, in tiles. */
const COLUMNS = { flight: 6, destination: 16, gate: 1, remarks: 8 };
const BOARD_ROWS = 3; // the boarding line's three flap rows come first
/** Wide screens: rows overlap, with a short stagger. */
const DESKTOP = { rowStagger: 120, tileJitter: 90, stepsBefore: [6, 14] as [number, number] };
/** Phones: one row at a time, top to bottom (9 rows, settled in under 3 s), so few tiles move at once. */
const PHONE = { rowStagger: 300, tileJitter: 20, stepsBefore: [2, 4] as [number, number] };
const PHONE_MEDIA = "(max-width: 639px)";
const HINT_KEY = "jbbru:sound-hint";
const HINT_MS = 4000;
/** A remark change: 4 to 6 flips of 70 ms plus a little jitter, 300 to 500 ms in all. */
const REMARK = { rowStagger: 0, tileJitter: 60, stepsBefore: [4, 6] as [number, number] };

const pad = (text: string, length: number) => text.padEnd(length, " ").slice(0, length);

/** Phones, or a touch device with few cores: the lighter, row-by-row flip. */
function lightFlip() {
  if (window.matchMedia(PHONE_MEDIA).matches) return true;
  const touch = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  return touch && (navigator.hardwareConcurrency ?? 8) <= 4;
}

/** A run of flap tiles. Memoised: after mount the flap engine owns their glyphs, so React never redraws them. */
const Tiles = memo(function Tiles({
  text,
  length,
  row,
  tone,
  className,
  remark,
}: {
  text: string;
  length?: number;
  row: number;
  tone?: "amber" | "muted";
  className?: string;
  remark?: string;
}) {
  const cells = [...pad(text, length ?? text.length)];
  return (
    <span
      className={className ? `${styles.tiles} ${className}` : styles.tiles}
      data-flap-row={row}
      data-tone={tone}
      data-remark={remark}
      aria-hidden="true"
    >
      {cells.map((c, i) => (
        <span key={i} className={styles.tile} data-target={c}>
          {(["top", "bottom", "flap-top", "flap-bottom"] as const).map((part) => (
            <span key={part} className={styles.half} data-part={part}>
              <span className={styles.glyph}>{c}</span>
            </span>
          ))}
        </span>
      ))}
    </span>
  );
});

const remarkTiles = (root: HTMLElement, id: string) =>
  [...root.querySelectorAll<HTMLElement>(`[data-remark="${id}"] [data-target]`)];

/** What a row's remark tiles currently read (their targets). */
const shownRemark = (tiles: HTMLElement[]) => tiles.map((t) => t.dataset.target ?? " ").join("").trimEnd();

const sentence = (remark: DestinationRemark) => remark.charAt(0) + remark.slice(1).toLowerCase();

export function DeparturesBoard({ board, destinations }: { board: Departures; destinations: Destination[] }) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [hint, setHint] = useState(false);
  const nav = useNavState();
  /** The main flip, and one engine per remark that is changing. */
  const main = useRef<FlapBoard | null>(null);
  const remarkEngines = useRef(new Map<string, FlapBoard>());
  const onScreen = useRef(false);

  /**
   * Flips one row's remark to `remark` (no motion under reduced motion). Resolves when it has settled.
   */
  const flipRemark = (id: string, remark: DestinationRemark) =>
    new Promise<void>((resolve) => {
      const el = boardRef.current;
      if (!el) return resolve();
      const tiles = remarkTiles(el, id);
      if (shownRemark(tiles) === remark) return resolve();
      remarkEngines.current.get(id)?.stop();
      const engine = new FlapBoard([tiles], {
        ...REMARK,
        onFlip: () => flap(),
        onDone: () => {
          remarkEngines.current.delete(id);
          resolve();
        },
      });
      remarkEngines.current.set(id, engine);
      engine.retarget(pad(remark, COLUMNS.remarks));
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        engine.settle();
        remarkEngines.current.delete(id);
        resolve();
      } else engine.run();
    });

  // The one-time hint under the sound toggle, after the board first settles (only with sound off).
  const showHint = () => {
    if (isSoundOn()) return;
    try {
      if (window.sessionStorage.getItem(HINT_KEY)) return;
      window.sessionStorage.setItem(HINT_KEY, "1");
    } catch {
      // Storage unavailable: show it anyway, once for this page.
    }
    setHint(true);
    window.setTimeout(() => setHint(false), HINT_MS);
  };

  // Brings every remark in line with the navigation state (DEPARTED after a visit), while on screen.
  const syncRemarks = () => {
    const el = boardRef.current;
    if (!el || !onScreen.current || main.current?.running) return;
    const s = getState();
    for (const d of destinations) {
      if (remarkEngines.current.has(d.id)) continue;
      void flipRemark(d.id, remarkOf(d, s));
    }
  };

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Remarks already known on this load (DEPARTED from earlier in the session) are the starting targets.
    loadVisited();
    const s = getState();
    for (const d of destinations) {
      remarkTiles(el, d.id).forEach((t, i) => (t.dataset.target = pad(remarkOf(d, s), COLUMNS.remarks)[i]));
    }
    const groups = new Map<number, HTMLElement[]>();
    el.querySelectorAll<HTMLElement>("[data-flap-row]").forEach((t) => {
      const row = Number(t.dataset.flapRow);
      const tiles = [...t.querySelectorAll<HTMLElement>("[data-target]")];
      groups.set(row, [...(groups.get(row) ?? []), ...tiles]);
    });
    const rows = [...groups.keys()].sort((a, b) => a - b).map((k) => groups.get(k)!);
    const light = lightFlip();
    const engine = new FlapBoard(rows, {
      ...(light ? PHONE : DESKTOP),
      onFlip: () => flap(),
      onDone: (ms) => {
        el.setAttribute("data-settled", "true");
        el.removeAttribute("data-running");
        el.setAttribute("data-settle-ms", String(Math.round(ms)));
        syncRemarks();
        showHint();
      },
    });
    main.current = engine;
    el.dataset.flip = light ? "rows" : "board";
    if (reduce) engine.settle();
    else {
      // Off screen until the curtain rise, so showing the starting characters now is never seen as a jump.
      engine.prepare();
      el.setAttribute("data-settled", "false");
    }
    let first = true;
    const io = new IntersectionObserver(
      (entries) => {
        // Several changes can arrive in one batch: the last entry is the current state.
        const entry = entries[entries.length - 1];
        onScreen.current = entry.isIntersecting;
        if (!entry.isIntersecting) return;
        if (first && !reduce) {
          first = false;
          el.setAttribute("data-running", "true");
          engine.run();
          return;
        }
        syncRemarks();
      },
      { rootMargin: "0px 0px -40% 0px", threshold: 0 },
    );
    io.observe(el);
    const unsubscribe = subscribe(syncRemarks);
    const engines = remarkEngines.current;
    return () => {
      io.disconnect();
      unsubscribe();
      engine.stop();
      engines.forEach((e) => e.stop());
      engines.clear();
      engine.settle();
      main.current = null;
    };
    // syncRemarks and flipRemark only read refs and the store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinations]);

  const choose = (e: MouseEvent<HTMLAnchorElement>, d: Destination) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return; // new tab or window
    e.preventDefault();
    // The board's own first flip gives way, so the remark can change at once.
    if (main.current?.running) {
      main.current.stop();
      main.current.settle();
      boardRef.current?.setAttribute("data-settled", "true");
      boardRef.current?.removeAttribute("data-running");
    }
    // The flip starts first, so the store update below finds this row already changing.
    const boarded = flipRemark(d.id, "BOARDING");
    setBoarding(d.id);
    void boarded.then(() => glideTo(d.id));
  };

  const { header, columns } = board;
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
            <div className={styles.soundSlot}>
              <SoundToggle ariaLabel={board.sound.ariaLabel} onWord={board.sound.onWord} offWord={board.sound.offWord} />
              <p className={styles.hint} data-shown={hint} aria-hidden={!hint}>
                {board.sound.hint}
              </p>
            </div>
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
                <Tiles className={styles.role} text={header.role} row={2} />
              </span>
            </p>

            {/* Column labels for sighted visitors; each row link carries its own full name. */}
            <div className={`${styles.row} ${styles.labels}`} aria-hidden="true">
              <span className={styles.colFlight}>{columns.flight}</span>
              <span className={styles.colDest}>{columns.destination}</span>
              <span className={styles.colGate}>{columns.gate}</span>
              <span className={styles.colRemarks}>{columns.remarks}</span>
            </div>
            <ol className={styles.list}>
              {destinations.map((d, i) => (
                <li key={d.id}>
                  <a
                    href={`#${d.id}`}
                    className={`${styles.row} ${styles.link}`}
                    aria-label={`Gate ${d.gate}: ${d.name}`}
                    aria-describedby={`departure-${d.id}`}
                    onClick={(e) => choose(e, d)}
                  >
                    <Tiles className={styles.colFlight} text={d.flight} length={COLUMNS.flight} row={BOARD_ROWS + i} />
                    <Tiles className={styles.colDest} text={d.destination} length={COLUMNS.destination} row={BOARD_ROWS + i} />
                    <Tiles className={styles.colGate} text={d.gate} length={COLUMNS.gate} row={BOARD_ROWS + i} />
                    <Tiles
                      className={styles.colRemarks}
                      text={d.remark}
                      length={COLUMNS.remarks}
                      row={BOARD_ROWS + i}
                      tone="muted"
                      remark={d.id}
                    />
                  </a>
                  <span id={`departure-${d.id}`} hidden>
                    {`${d.flight}, ${sentence(remarkOf(d, nav))}`}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
