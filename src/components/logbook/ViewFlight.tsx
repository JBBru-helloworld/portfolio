"use client";

/*
 * "View flight →" under a logbook entry: opens the role's project page like the gallery does (the flight
 * transition, client-side), and remembers the entry so going back lands on it again.
 */
import type { MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { flyTo, rememberOrigin } from "@/components/work/flight-nav";
import styles from "./Logbook.module.css";

export function ViewFlight({ slug, label, name }: { slug: string; label: string; name: string }) {
  const router = useRouter();
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    const row = e.currentTarget.closest("tr");
    if (row) rememberOrigin(row);
    flyTo(() => router.push(`/work/${slug}`), null);
  };
  return (
    <a href={`/work/${slug}`} className={styles.viewFlight} aria-label={name} onClick={onClick}>
      {label}
    </a>
  );
}
