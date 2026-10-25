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
 *
 * On a project page (`flight` set) it is always shown and names the flight ("JB 201 · FRAUD DETECTION";
 * phones "JB 201"); its list links back to the home page's sections, and the wordmark links home.
 */
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { Popover } from "radix-ui";
import { ChevronDown } from "lucide-react";
import type { Departures, Destination } from "@/content";
import { glideTo, loadVisited, remarkOf, startTracking, useNavState, whenRestored } from "./site-state";
import { setHomeIntent } from "@/components/work/flight-nav";
import { FlapBoard } from "@/components/departures/flap-engine";
import tileStyles from "@/components/departures/DeparturesBoard.module.css";
import { SoundToggle } from "@/components/sound/SoundToggle";
import { bootSound, chime, soundStats } from "@/lib/sound";
import { BackToWindow } from "@/components/footer/BackToWindow";
import { JbLogo } from "@/components/brand/JbLogo";
import styles from "./SiteNav.module.css";

const SIGN_TILES = 28; // "SEAT 12A · OCI GENERATIVE AI" (check:content keeps seat names to 17 characters)
const PHONE_MEDIA = "(max-width: 639px)";
/** A label change: 2 to 4 flips of 70 ms, under 400 ms in all. */
const LABEL_FLIP = { rowStagger: 0, tileJitter: 40, stepsBefore: [2, 4] as [number, number] };

interface Props {
  name: string;
  board: Departures;
  destinations: Destination[];
  /** On a project page: its flight code, its seat-sign name and its name. */
  flight?: { code: string; sign: string; name: string };
}

function SignTiles({ text }: { text: string }) {
  return (
    <span className={`${tileStyles.tiles} ${styles.tiles}`} aria-hidden="true" data-sign-tiles="">
      {[...text.padEnd(SIGN_TILES, " ")].map((c, i) => (
        <span key={i} className={`${tileStyles.tile} ${styles.tile}`} data-target={c}>
          {(["top", "bottom", "flap-top", "flap-bottom"] as const).map((part) => (
            <span key={part} className={tileStyles.half} data-part={part}>
              <span className={tileStyles.glyph} data-glyph={c} />
            </span>
          ))}
        </span>
      ))}
    </span>
  );
}

export function SiteNav({ name, board, destinations, flight }: Props) {
  const nav = useNavState();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(false);
  const tilesRef = useRef<HTMLSpanElement>(null);
  const engine = useRef<FlapBoard | null>(null);
  const wasVisible = useRef(false);
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    let stop: (() => void) | undefined;
    // A project page shows the remarks (DEPARTED) but does not track sections.
    if (flight) loadVisited();
    const cancel = flight ? () => undefined : whenRestored(() => (stop = startTracking()));
    // Sound saved as on from an earlier visit waits for the first click, tap or key press.
    const unboot = bootSound();
    (window as Window & { __soundStats?: typeof soundStats }).__soundStats = soundStats;
    return () => {
      cancel();
      stop?.();
      unboot();
    };
  }, [flight]);

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

  const visible = flight ? true : nav.current !== null;
  const here = flight ? undefined : destinations.find((d) => d.id === nav.current);
  // The label follows the current section (while hidden, the tiles keep what they show: see below).
  const label = flight
    ? phone
      ? flight.code
      : `${flight.code} · ${flight.sign}`
    : !here
      ? board.nav.board
      : here.id === "stack" && nav.seat
        ? phone
          ? `SEAT ${nav.seat.code}`
          : `SEAT ${nav.seat.code} · ${nav.seat.name}`
        : phone
          ? `${board.nav.gate} ${here.gate}`
          : `${board.nav.gate} ${here.gate} · ${here.destination}`;

  // Flips the tiles to the label; as the sign fades in, the label is simply set.
  useEffect(() => {
    // Hidden (fading out): the tiles keep their last label; the next one is set as the sign fades in.
    if (!visible) {
      wasVisible.current = false;
      return;
    }
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

  const go = (e: MouseEvent<HTMLAnchorElement>, id: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    setOpen(false); // focus returns to the button
    if (flight) {
      // Home, straight to that section (covered, no intro).
      setHomeIntent({ kind: "section", id });
      router.push("/", { scroll: false }); // the home page's restore does the scroll
      return;
    }
    glideTo(id, { focus: false });
  };

  const currentName = flight
    ? `${flight.code}: ${flight.name}`
    : here
      ? `Gate ${here.gate}: ${here.name}`
      : "Departures board";

  return (
    <header className={styles.bar} data-visible={visible}>
      {/* The JB monogram: home, replaying the landing, like "Back to the window". */}
      <BackToWindow className={styles.wordmark} ariaLabel={`${name}, home`}>
        <JbLogo className={styles.logo} />
      </BackToWindow>
      <nav aria-label="Site" className={styles.nav}>
        {/* A hidden sign is never open. */}
        <Popover.Root open={open && visible} onOpenChange={onOpenChange}>
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
                const current = !flight && d.id === nav.current;
                return (
                  <li key={d.id}>
                    <a
                      href={flight ? `/#${d.id}` : `#${d.id}`}
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

