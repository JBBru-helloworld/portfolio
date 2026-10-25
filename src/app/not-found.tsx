import type { Metadata } from "next";
import { departures, destinations, notFound, profile } from "@/content";
import { SiteNav } from "@/components/defer/islands";
import { SiteFooter } from "@/components/footer/SiteFooter";
import { BackToWindow } from "@/components/footer/BackToWindow";
import { HomeLink } from "@/components/work/project/HomeLink";
import tileStyles from "@/components/departures/DeparturesBoard.module.css";
import styles from "./not-found.module.css";

export const metadata: Metadata = {
  title: `${notFound.title} · ${profile.name}`,
  description: notFound.description,
  robots: { index: false },
};

/** "Flight not found": a split-flap row, one line, and the way back (Phase 6). Static: no JavaScript needed. */
export default function NotFound() {
  return (
    <>
      <SiteNav name={profile.name} board={departures} destinations={destinations} flight={{ code: notFound.sign.code, sign: notFound.sign.sign, name: notFound.title }} />
      <main className={styles.page}>
        <h1 className="sr-only">{notFound.title}</h1>
        <p className={`${tileStyles.tiles} ${styles.tiles}`} aria-hidden="true">
          {[...notFound.board].map((c, i) => (
            <span key={i} className={`${tileStyles.tile} ${styles.tile}`} data-target={c}>
              {(["top", "bottom", "flap-top", "flap-bottom"] as const).map((part) => (
                <span key={part} className={tileStyles.half} data-part={part}>
                  <span className={tileStyles.glyph}>{c}</span>
                </span>
              ))}
            </span>
          ))}
        </p>
        <p className={styles.line}>{notFound.line}</p>
        <p className={styles.links}>
          <BackToWindow className={styles.link}>{notFound.backToWindow} ↑</BackToWindow>
          <HomeLink section="all-flights" className={styles.link}>
            {notFound.allFlights} →
          </HomeLink>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
