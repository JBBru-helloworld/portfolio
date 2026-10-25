"use client";

/*
 * Gate 1, "My journey": an open, two-page passport (Phase 5d). The left page is a playful data page (the
 * owner's photo in greyscale with its faint ghost, bilingual fields, a machine-readable zone); the right page
 * holds the visas: three entry stamps, in date order. The real content is a definition list and an ordered
 * list; the photo's ghost, the MRZ, the guilloche, the cover and the crease are decorative.
 *
 * The opening (once per visit, wide screens): as the section comes into view the dark cover, lying over the
 * right page, swings open from the spine, and the data page (its inside) comes down on the left: 3D rotations
 * about the spine, 700 ms in all (an ease-in lift, then an ease-out fall: the cinematic curve split at the
 * spine). Then the stamps land as before. On phones the pages
 * stack (data page first) and there is no cover; under reduced motion the passport is simply open.
 *
 * The stamps: each is a baked, worn ink mask (scripts/stamps/), tinted with its section ink through
 * mask-image, so nothing is filtered at runtime. They land one at a time, in date order, each when it is
 * about 60% into the viewport: a quick press (180 ms, ease-in) from slightly larger and higher, then the ink
 * takes (a very slight spread and darkening over 250 ms), with the thunk on contact if sound is on. They land
 * once per page load. Under reduced motion, or without JavaScript, they are simply on the page.
 */
import { useEffect, useRef, type CSSProperties } from "react";
import type { Destination, JourneyPage, JourneyStamp, Passport } from "@/content";
import photo from "@/content/passport-photo.json";
import { loadStamp, stamp as thunk } from "@/lib/sound";
import { cssEase, ease } from "@/lib/motion";
import styles from "./JourneySection.module.css";

const PRESS_MS = 180;
const TAKE_MS = 250;
const GAP_MS = 260; // between one stamp settling and the next landing, when several are due at once
const OPEN_KEY = "jbbru:passport-open";
const SPREAD_MEDIA = "(min-width: 900px)";

interface Props {
  destination: Destination;
  page: JourneyPage;
  entries: Omit<JourneyStamp, "notes">[];
  passport: Passport;
}

const PHOTO = photo as { available: boolean; widths?: number[]; ghostWidth?: number };

function Photo({ alt }: { alt: string }) {
  if (!PHOTO.available || !PHOTO.widths) {
    // No portrait yet: a simple silhouette in the photo's frame.
    return (
      <svg className={styles.photo} viewBox="0 0 35 45" role="img" aria-label={alt}>
        <rect width="35" height="45" className={styles.photoBg} />
        <circle cx="17.5" cy="17" r="7.2" className={styles.silhouette} />
        <path d="M4.5 45 C 5.5 33, 11 29, 17.5 29 C 24 29, 29.5 33, 30.5 45 Z" className={styles.silhouette} />
      </svg>
    );
  }
  const set = (ext: string) => PHOTO.widths!.map((w) => `/passport/photo-${w}.${ext} ${w}w`).join(", ");
  return (
    <picture>
      <source type="image/avif" srcSet={set("avif")} sizes="(min-width: 900px) 9rem, 7.5rem" />
      <img
        className={styles.photo}
        src={`/passport/photo-${PHOTO.widths[0]}.webp`}
        srcSet={set("webp")}
        sizes="(min-width: 900px) 9rem, 7.5rem"
        width={PHOTO.widths[0]}
        height={Math.round(PHOTO.widths[0] / (35 / 45))}
        alt={alt}
        loading="lazy"
        decoding="async"
      />
    </picture>
  );
}

function Ghost() {
  if (!PHOTO.available || !PHOTO.ghostWidth) {
    return (
      <svg className={styles.ghost} viewBox="0 0 35 45" aria-hidden="true">
        <circle cx="17.5" cy="17" r="7.2" className={styles.silhouette} />
        <path d="M4.5 45 C 5.5 33, 11 29, 17.5 29 C 24 29, 29.5 33, 30.5 45 Z" className={styles.silhouette} />
      </svg>
    );
  }
  return (
    <picture>
      <source type="image/avif" srcSet={`/passport/photo-ghost-${PHOTO.ghostWidth}.avif`} />
      <img className={styles.ghost} src={`/passport/photo-ghost-${PHOTO.ghostWidth}.webp`} alt="" aria-hidden="true" loading="lazy" decoding="async" />
    </picture>
  );
}

export function JourneySection({ destination, page, entries, passport }: Props) {
  const listRef = useRef<HTMLOListElement>(null);
  const bookRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    const book = bookRef.current;
    if (!list || !book) return;
    const items = [...list.querySelectorAll<HTMLElement>("[data-entry]")];
    const markAll = () => items.forEach((el) => el.setAttribute("data-landed", ""));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

    // ---------- The opening: once per visit, on the two-page spread only ----------
    let opened = false;
    try {
      opened = window.sessionStorage.getItem(OPEN_KEY) === "1";
    } catch {
      opened = false;
    }
    const spread = window.matchMedia(SPREAD_MEDIA).matches;
    let ready = reduced || opened || !spread;
    const anims: Animation[] = [];
    const timers: number[] = [];
    book.dataset.state = ready ? "open" : "closed";

    if (reduced) {
      markAll();
      return () => near.disconnect();
    }

    const due = new Set<number>();
    let next = 0;
    let busy = false;
    const land = () => {
      if (!ready || busy || next >= items.length || !due.has(next)) return;
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
          { duration: TAKE_MS, easing: cssEase(ease.out), fill: "forwards" },
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

    // The cover swings open from the spine, then the data page comes down on the left (transforms only).
    const open = () => {
      const cover = book.querySelector<HTMLElement>("[data-cover]");
      const left = book.querySelector<HTMLElement>("[data-page='data']");
      if (!cover || !left) {
        ready = true;
        book.dataset.state = "open";
        land();
        return;
      }
      book.dataset.state = "opening";
      const lift = cover.animate([{ transform: "rotateY(0deg)" }, { transform: "rotateY(-90deg)" }], {
        duration: 350,
        easing: "cubic-bezier(0.65, 0.05, 0.9, 0.6)",
        fill: "forwards",
      });
      anims.push(lift);
      lift.onfinish = () => {
        const down = left.animate([{ transform: "rotateY(90deg)" }, { transform: "rotateY(0deg)" }], {
          duration: 350,
          easing: "cubic-bezier(0.1, 0.4, 0.36, 1)",
          fill: "forwards",
        });
        anims.push(down);
        down.onfinish = () => {
          book.dataset.state = "open";
          down.cancel();
          lift.cancel();
          try {
            window.sessionStorage.setItem(OPEN_KEY, "1");
          } catch {
            // Without storage it opens again on the next visit's page loads; nothing else changes.
          }
          ready = true;
          land();
        };
      };
    };

    const opener = new IntersectionObserver(
      (es) => {
        if (!es.some((e) => e.isIntersecting)) return;
        opener.disconnect();
        open();
      },
      { rootMargin: "0px 0px -35% 0px" },
    );
    if (!ready) opener.observe(book);

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
      opener.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
      anims.forEach((a) => a.cancel());
      book.dataset.state = "open";
      markAll();
    };
  }, []);

  return (
    <section id={destination.id} aria-labelledby={`${destination.id}-heading`} tabIndex={-1} className={styles.section}>
      <div className={styles.inner}>
        <h2 id={`${destination.id}-heading`} className={styles.heading}>
          {destination.name}
        </h2>
        <div ref={bookRef} className={styles.book} data-state="open">
          {/* The data page (left on the spread, first on phones). */}
          <div className={`${styles.page} ${styles.dataPage}`} data-page="data">
            <div className={styles.dataHead} aria-hidden="true">
              <span>{passport.header}</span>
              <span>{passport.issuer}</span>
            </div>
            <div className={styles.dataBody}>
              <div className={styles.photoBox}>
                <Photo alt={passport.photoAlt} />
              </div>
              <dl className={styles.fields}>
                {passport.fields.map((f) => (
                  <div key={f.label} className={styles.field}>
                    <dt>
                      {f.label}
                      <span aria-hidden="true"> / {f.labelFr}</span>
                    </dt>
                    <dd>{f.value}</dd>
                  </div>
                ))}
              </dl>
              <div className={styles.ghostBox} aria-hidden="true">
                <Ghost />
              </div>
            </div>
            <div className={styles.mrz} aria-hidden="true">
              <span>{passport.mrz[0]}</span>
              <span>{passport.mrz[1]}</span>
            </div>
            <p className={styles.pageNo} aria-hidden="true">
              {passport.pageNumbers.data}
            </p>
          </div>

          {/* The visas page. */}
          <div className={`${styles.page} ${styles.visasPage}`} data-page="visas">
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
            <p className={styles.pageNo} aria-hidden="true">
              {passport.pageNumbers.visas}
            </p>
          </div>

          {/* The cover: lies over the visas page until the passport opens (wide screens, with motion). */}
          <div className={styles.cover} data-cover="" aria-hidden="true">
            <span className={styles.coverIssuer}>{passport.issuer}</span>
            <span className={styles.coverTitle}>{passport.header}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
