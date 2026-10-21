"use client";

/*
 * Featured flights: six tall strips that expand on hover or focus, based on Skiper UI 52 (ExpandOnHover,
 * https://skiper-ui.com, free version: credited in the footer and docs/CREDITS.md). Adapted to the site:
 * motion/react with the soft spring from src/lib/motion.ts, the site's greys (images greyscale at rest, in
 * colour when expanded), links instead of divs, keyboard focus expanding the strip, and a stacked layout on
 * phones where the first tap expands and the second opens the page.
 *
 * Wide screens (768 px and up): the strips sit in a row and the active one grows (flex-grow) while the
 * others narrow. The image inside never resizes (it is as wide as an expanded strip and simply revealed),
 * so only the strips' widths change per frame. The open strip shows its screenshot whole (a 16:10 image box,
 * the details in a band below). Phones: the strips stack and the open one grows to its image and details.
 * Before hydration, and without JavaScript, CSS lays the same out with the first strip open.
 */
import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { useRouter } from "next/navigation";
// The slim Motion build: the m component with only the animation features it needs.
import { LazyMotion, domAnimation, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { ArrowRight } from "lucide-react";
import type { Emblem as EmblemData } from "@/content";
import { spring } from "@/lib/motion";
import { Emblem } from "./Emblem";
import { FlightPoster } from "./FlightPoster";
import { ProjectPicture } from "./ProjectPicture";
import { isClientNavigation } from "@/components/nav/site-state";
import { flyTo, readOrigin, rememberOrigin } from "./flight-nav";
import type { Picture } from "./media";
import styles from "./FeaturedFlights.module.css";

export interface FeaturedFlight {
  slug: string;
  flight: string;
  name: string;
  summary: string;
  emblem: EmblemData;
  image: { picture: Picture; alt: string } | null;
}

const WIDE = "(min-width: 768px)";
/** The open strip's share in a row: GROW times a closed strip. Mirrors --grow in the CSS. */
const GROW = 10;
/** A closed strip's height on phones, in px (mirrors --closed-h); an open one fits its image and details. */
const CLOSED_H = 76;

export function FeaturedFlights({
  flights,
  label,
  viewLabel,
}: {
  flights: FeaturedFlight[];
  label: string;
  viewLabel: string;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [layout, setLayout] = useState<"row" | "col" | null>(null);
  // Back from a project page (a client-side return), the strip the visitor opened is open again from the
  // first render, so the restore lands on the layout the visitor left. A full load starts on the first.
  const [active, setActive] = useState(() => {
    if (typeof window === "undefined" || !isClientNavigation()) return 0;
    const origin = readOrigin();
    return Math.max(0, origin ? flights.findIndex((f) => `flight-${f.slug}` === origin.id) : 0);
  });
  const activeRef = useRef(active);
  // Kept in step after each render (read by the pointer handlers), never written during render.
  useLayoutEffect(() => {
    activeRef.current = active;
  });
  const tap = useRef<{ pointer: string; wasActive: boolean }>({
    pointer: "",
    wasActive: false,
  });
  // Each strip's visible image box: the hero that grows into the project page's header.
  const heroes = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const mq = window.matchMedia(WIDE);
    const apply = () => setLayout(mq.matches ? "row" : "col");
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const transition = reduce ? { duration: 0 } : spring.soft;

  const onPointerDown = (e: PointerEvent, i: number) => {
    tap.current = {
      pointer: e.pointerType,
      wasActive: activeRef.current === i,
    };
  };

  const onClick = (e: MouseEvent<HTMLAnchorElement>, i: number) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    // Touch: the first tap opens the strip, the second (or View flight) opens the page.
    if (tap.current.pointer === "touch" && !tap.current.wasActive) {
      setActive(i);
      tap.current.wasActive = true;
      return;
    }
    const li = e.currentTarget.closest("li");
    if (li) rememberOrigin(li);
    const href = e.currentTarget.getAttribute("href")!;
    flyTo(() => router.push(href), heroes.current[i]);
  };

  return (
    <LazyMotion features={domAnimation} strict>
      <div className={styles.gallery}>
        <ol className={styles.list} aria-label={label} data-layout={layout ?? undefined}>
          {flights.map((f, i) => {
            const on = i === active;
            const animate =
              layout === "row"
                ? { flexGrow: on ? GROW : 1 }
                : layout === "col"
                  ? { height: on ? "auto" : CLOSED_H }
                  : undefined;
            return (
              <m.li
                // A new layout starts clean (no inline width or height left from the other one).
                key={`${f.slug}-${layout ?? "css"}`}
                id={`flight-${f.slug}`}
                className={styles.strip}
                data-active={on || undefined}
                initial={false}
                animate={animate}
                transition={transition}
              >
                <a
                  href={`/work/${f.slug}`}
                  className={styles.link}
                  aria-label={`${f.flight}: ${f.name}`}
                  aria-describedby={`flight-${f.slug}-summary`}
                  onPointerEnter={(e) => e.pointerType === "mouse" && setActive(i)}
                  onPointerDown={(e) => onPointerDown(e, i)}
                  onFocus={() => setActive(i)}
                  onClick={(e) => onClick(e, i)}
                >
                  <div
                    className={styles.media}
                    ref={(el) => {
                      heroes.current[i] = el;
                    }}
                  >
                    {f.image ? (
                      <ProjectPicture
                        picture={f.image.picture}
                        alt=""
                        sizes="(min-width: 1260px) 50rem, (min-width: 768px) 64vw, 100vw"
                        className={styles.picture}
                        imgClassName={styles.img}
                      />
                    ) : (
                      <FlightPoster project={f} className={styles.poster} />
                    )}
                  </div>
                  <div className={styles.shade} aria-hidden="true" />
                  <p className={styles.collapsed} aria-hidden="true">
                    <span className={styles.code}>{f.flight}</span>
                    <span className={styles.collapsedName}>{f.name}</span>
                  </p>
                  <div className={styles.details}>
                    <Emblem emblem={f.emblem} size={44} className={styles.emblem} />
                    <p className={styles.code} aria-hidden="true">
                      {f.flight}
                    </p>
                    <p className={styles.name} aria-hidden="true">
                      {f.name}
                    </p>
                    <p id={`flight-${f.slug}-summary`} className={styles.summary}>
                      {f.summary}
                    </p>
                    <span className={styles.view} aria-hidden="true">
                      {viewLabel} <ArrowRight size={16} strokeWidth={1.5} />
                    </span>
                  </div>
                </a>
              </m.li>
            );
          })}
        </ol>
      </div>
    </LazyMotion>
  );
}
