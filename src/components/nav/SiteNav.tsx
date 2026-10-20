"use client";

/*
 * The fixed top bar after the window sequence: the wordmark (back to the top) on the left and, top right,
 * the "seat sign": an illuminated cabin-sign pill naming the current gate on small flap tiles. It opens a
 * compact departures list of every section (a Radix Popover: focus moves in, Escape or an outside click
 * closes it, and focus returns to the button).
 *
 * Hidden throughout the window sequence; it fades in once the curtain rise is over (the board covers the
 * scene) and out again on scrolling back into the sequence. Starts the section tracking after the scroll
 * restore (site-state.ts).
 */
import { useEffect, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { Popover } from "radix-ui";
import { ChevronDown } from "lucide-react";
import type { Departures, Destination } from "@/content";
import { glideTo, jumpToTop, remarkOf, startTracking, useNavState, whenRestored } from "./site-state";
import { FlapBoard } from "@/components/departures/flap-engine";
import tileStyles from "@/components/departures/DeparturesBoard.module.css";
import { SoundToggle } from "@/components/sound/SoundToggle";
import { bootSound, chime, soundStats } from "@/lib/sound";
import styles from "./SiteNav.module.css";

const SIGN_TILES = 24; // "GATE 3 · LIVE FRAUD DEMO"
const PHONE_MEDIA = "(max-width: 639px)";
/** A label change: 2 to 4 flips of 70 ms, under 400 ms in all. */
const LABEL_FLIP = { rowStagger: 0, tileJitter: 40, stepsBefore: [2, 4] as [number, number] };

interface Props {
  name: string;
  board: Departures;
  destinations: Destination[];
}

function SignTiles({ text }: { text: string }) {
  return (
    <span className={`${tileStyles.tiles} ${styles.tiles}`} aria-hidden="true" data-sign-tiles="">
      {[...text.padEnd(SIGN_TILES, " ")].map((c, i) => (
        <span key={i} className={`${tileStyles.tile} ${styles.tile}`} data-target={c}>
          {(["top", "bottom", "flap-top", "flap-bottom"] as const).map((part) => (
            <span key={part} className={tileStyles.half} data-part={part}>
              <span className={tileStyles.glyph}>{c}</span>
            </span>
          ))}
        </span>
      ))}
    </span>
  );
}

export function SiteNav({ name, board, destinations }: Props) {
  const nav = useNavState();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(false);
  const tilesRef = useRef<HTMLSpanElement>(null);
  const engine = useRef<FlapBoard | null>(null);
  const wasVisible = useRef(false);
  const lastLabel = useRef(board.nav.board);
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    let stop: (() => void) | undefined;
    const cancel = whenRestored(() => (stop = startTracking()));
    // Sound saved as on from an earlier visit waits for the first click, tap or key press.
    const unboot = bootSound();
    (window as Window & { __soundStats?: typeof soundStats }).__soundStats = soundStats;
    return () => {
      cancel();
      stop?.();
      unboot();
    };
  }, []);

  // Opening the sign plays the cabin chime (only with sound on); closing it is silent.
  const onOpenChange = (next: boolean) => {
    if (next) chime();
    setOpen(next);
  };

  useEffect(() => {
    const mq = window.matchMedia(PHONE_MEDIA);
    const apply = () => setPhone(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const visible = nav.current !== null;
  const here = destinations.find((d) => d.id === nav.current);
  // The label follows the current section; while hidden it keeps the last one.
  const label = !nav.current
    ? lastLabel.current
    : !here
      ? board.nav.board
      : phone
        ? `${board.nav.gate} ${here.gate}`
        : `${board.nav.gate} ${here.gate} · ${here.destination}`;
  lastLabel.current = label;

  // Flips the tiles to the label; as the sign fades in, the label is simply set.
  useEffect(() => {
    const el = tilesRef.current?.querySelector<HTMLElement>("[data-sign-tiles]");
    if (!el) return;
    const tiles = [...el.querySelectorAll<HTMLElement>("[data-target]")];
    // The pill fits its label: tiles past it are hidden, once a shorter label has finished flipping.
    const fit = () => tiles.forEach((t, i) => t.toggleAttribute("data-off", i >= label.length));
    tiles.forEach((t, i) => i < label.length && t.removeAttribute("data-off"));
    engine.current?.stop();
    const e = new FlapBoard([tiles], { ...LABEL_FLIP, onDone: fit });
    engine.current = e;
    e.retarget(label.padEnd(SIGN_TILES, " "));
    if (!wasVisible.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      e.settle();
      fit();
    } else e.run();
    wasVisible.current = visible;
  }, [label, visible]);

  useEffect(() => {
    if (!visible) setOpen(false);
  }, [visible]);

  const go = (e: MouseEvent<HTMLAnchorElement>, id: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    setOpen(false); // focus returns to the button
    glideTo(id, { focus: false });
  };

  const toTop = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    jumpToTop();
  };

  const currentName = here ? `Gate ${here.gate}: ${here.name}` : "Departures board";

  return (
    <header className={styles.bar} data-visible={visible}>
      <Link href="/" className={styles.wordmark} onClick={toTop}>
        {name}
      </Link>
      <nav aria-label="Site" className={styles.nav}>
        <Popover.Root open={open} onOpenChange={onOpenChange}>
          <Popover.Trigger asChild>
            <button type="button" className={styles.sign} data-current={nav.current ?? undefined}>
              <span className="sr-only">{`${board.nav.ariaLabel}. Now: ${currentName}`}</span>
              <span ref={tilesRef} className={styles.signFace}>
                <SignTiles text={label} />
              </span>
              <ChevronDown className={styles.chevron} aria-hidden="true" strokeWidth={1.5} />
            </button>
          </Popover.Trigger>
          <Popover.Content
            className={styles.panel}
            align="end"
            sideOffset={8}
            collisionPadding={16}
            aria-label={board.nav.ariaLabel}
            onOpenAutoFocus={(e) => {
              // Focus the current destination (or the first) rather than the panel itself.
              e.preventDefault();
              const links = listRef.current?.querySelectorAll<HTMLAnchorElement>("a");
              const current = listRef.current?.querySelector<HTMLAnchorElement>("a[aria-current]");
              (current ?? links?.[0])?.focus();
            }}
          >
            <p className={styles.panelTitle} aria-hidden="true">
              {board.title}
            </p>
            <ol ref={listRef} className={styles.list}>
              {destinations.map((d) => {
                const remark = remarkOf(d, nav);
                const current = d.id === nav.current;
                return (
                  <li key={d.id}>
                    <a
                      href={`#${d.id}`}
                      className={styles.item}
                      aria-current={current ? "location" : undefined}
                      aria-label={`Gate ${d.gate}: ${d.name}, ${remark.toLowerCase()}`}
                      onClick={(e) => go(e, d.id)}
                    >
                      <span className={styles.gate}>{d.gate}</span>
                      <span className={styles.dest}>{d.destination}</span>
                      <span className={styles.remark} data-remark={remark}>
                        {remark}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ol>
            <div className={styles.panelFoot}>
              <span className={styles.panelFootLabel} aria-hidden="true">
                {board.sound.ariaLabel}
              </span>
              <SoundToggle ariaLabel={board.sound.ariaLabel} onWord={board.sound.onWord} offWord={board.sound.offWord} />
            </div>
          </Popover.Content>
        </Popover.Root>
      </nav>
    </header>
  );
}

