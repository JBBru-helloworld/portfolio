"use client";

/*
 * All flights: every project not in the gallery, as a compact flight manifest. Each row is one link to its
 * project page, with the departures board's hover and focus styles. Opening one records the row as the
 * origin, so Back to all flights (and the back button) return to it.
 */
import type { MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Plane } from "lucide-react";
import type { Emblem as EmblemData } from "@/content";
import { Emblem } from "./Emblem";
import { flyTo, rememberOrigin } from "./flight-nav";
import styles from "./AllFlights.module.css";

export interface ManifestFlight {
  slug: string;
  flight: string;
  name: string;
  year: string;
  /** The first three stack items, by name. */
  stack: string[];
  summary: string;
  emblem: EmblemData;
}

export function AllFlights({ flights, label }: { flights: ManifestFlight[]; label: string }) {
  const router = useRouter();

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    const li = e.currentTarget.closest("li");
    if (li) rememberOrigin(li);
    const href = e.currentTarget.getAttribute("href")!;
    flyTo(() => router.push(href), null);
  };

  return (
    <div id="all-flights" className={styles.manifest}>
      <p className={styles.label} id="all-flights-label">
        {label}
      </p>
      <ol className={styles.list} aria-labelledby="all-flights-label">
        {flights.map((f) => (
          <li key={f.slug} id={`flight-${f.slug}`} className={styles.item}>
            <a
              href={`/work/${f.slug}`}
              className={styles.row}
              aria-label={`${f.flight}: ${f.name}, ${f.year}`}
              aria-describedby={`flight-${f.slug}-line`}
              onClick={onClick}
            >
              <span className={styles.code} aria-hidden="true">
                {f.flight}
              </span>
              <span className={styles.marks} aria-hidden="true">
                <Emblem emblem={f.emblem} size={30} />
                <Plane className={styles.plane} size={14} strokeWidth={1.5} />
              </span>
              <span className={styles.name} aria-hidden="true">
                {f.name}
              </span>
              <span className={styles.year} aria-hidden="true">
                {f.year}
              </span>
              <span className={styles.stack} aria-hidden="true">
                {f.stack.join(" · ")}
              </span>
              <span id={`flight-${f.slug}-line`} className={styles.summary}>
                {f.summary}
              </span>
              <ArrowRight className={styles.arrow} size={18} strokeWidth={1.5} aria-hidden="true" />
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}
