"use client";

/*
 * Gate 1, "My journey": an open passport visa page with three entry stamps, in date order. The real
 * content is an ordered list (country, years, line); the stamps are decorative.
 *
 * Each stamp is a baked, worn ink mask (scripts/stamps/), tinted with its section ink through mask-image,
 * so nothing is filtered at runtime. As the visitor scrolls in, the stamps land one at a time, in date
 * order, each when it is about 60% into the viewport: a quick press (180 ms, ease-in) from slightly larger
 * and higher, then the ink takes (a very slight spread and darkening over 250 ms), with the thunk on
 * contact if sound is on. They land once per page load (a refresh lands them again; scrolling back up does
 * not). Under reduced motion, or without JavaScript, they are
 * simply on the page.
 */
import { useEffect, useRef, type CSSProperties } from "react";
import type { Destination, JourneyPage, JourneyStamp } from "@/content";
import { loadStamp, stamp as thunk } from "@/lib/sound";
import styles from "./JourneySection.module.css";

const PRESS_MS = 180;
const TAKE_MS = 250;
const GAP_MS = 260; // between one stamp settling and the next landing, when several are due at once

interface Props {
  destination: Destination;
  page: JourneyPage;
  entries: Omit<JourneyStamp, "notes">[];
}

export function JourneySection({ destination, page, entries }: Props) {
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const items = [...list.querySelectorAll<HTMLElement>("[data-entry]")];
    const markAll = () => items.forEach((el) => el.setAttribute("data-landed", ""));

    // The masks load only as the section approaches.
    const near = new IntersectionObserver(
      (es) => {
        if (!es.some((e) => e.isIntersecting)) return;
        items.forEach((el) => el.setAttribute("data-near", ""));
        near.disconnect();
        void loadStamp();
      },
      { rootMargin: "100% 0px" },
    );
    near.observe(list);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      markAll();
      return () => near.disconnect();
    }

    // Due stamps land strictly in date order, one at a time.
    const due = new Set<number>();
    let next = 0;
    let busy = false;
    const timers: number[] = [];
    const anims: Animation[] = [];
    const land = () => {
      if (busy || next >= items.length || !due.has(next)) return;
      busy = true;
      const el = items[next];
      const art = el.querySelector<HTMLElement>("[data-stamp]")!;
      const ink = el.querySelector<HTMLElement>("[data-ink]")!;
      el.setAttribute("data-landing", "");
      const press = art.animate(
        [
          { opacity: 0, transform: "translateY(-10px) scale(1.06)" },
          { opacity: 1, transform: "translateY(0) scale(1)" },
        ],
        { duration: PRESS_MS, easing: "cubic-bezier(0.55, 0, 1, 0.45)", fill: "both" },
      );
      anims.push(press);
      press.onfinish = () => {
        thunk();
        const take = ink.animate(
          [
            { opacity: 0.62, transform: "scale(1)" },
            { opacity: 0.86, transform: "scale(1.008)" },
          ],
          { duration: TAKE_MS, easing: "cubic-bezier(0.23, 1, 0.32, 1)", fill: "forwards" },
        );
        anims.push(take);
        take.onfinish = () => {
          el.setAttribute("data-landed", "");
          el.removeAttribute("data-landing");
          next++;
          busy = false;
          timers.push(window.setTimeout(land, GAP_MS));
        };
      };
    };
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) {
          if (!e.isIntersecting) continue;
          const i = items.indexOf(e.target as HTMLElement);
          // Reaching a later stamp first (a fast scroll, or a restore) lands every earlier one too.
          for (let k = 0; k <= i; k++) due.add(k);
          io.unobserve(e.target);
        }
        land();
      },
      { rootMargin: "0px 0px -40% 0px", threshold: 0 },
    );
    items.forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      near.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
      anims.forEach((a) => a.cancel());
      markAll();
    };
  }, []);

  return (
    <section id={destination.id} aria-labelledby={`${destination.id}-heading`} tabIndex={-1} className={styles.section}>
      <div className={styles.inner}>
        <h2 id={`${destination.id}-heading`} className={styles.heading}>
          {destination.name}
        </h2>
        <div className={styles.page}>
          <p className={styles.pageLabel} aria-hidden="true">
            {page.label}
          </p>
          <ol ref={listRef} className={styles.list}>
            {entries.map((entry) => (
              <li
                key={entry.ink}
                className={styles.entry}
                data-entry=""
                data-ink-name={entry.ink}
                style={{ "--rotate": `${entry.stamp.rotate}deg`, "--mask": `url(/journey/stamp-${entry.ink}.webp)` } as CSSProperties}
              >
                <span className={styles.stamp} data-stamp="" aria-hidden="true">
                  <span className={styles.ink} data-ink="" />
                </span>
                <div className={styles.text}>
                  <h3 className={styles.country}>{entry.country}</h3>
                  <p className={styles.period}>{entry.period}</p>
                  <p className={styles.line}>{entry.line}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
