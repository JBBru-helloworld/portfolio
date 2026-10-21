import { useId } from "react";
import type { Emblem as EmblemData, Livery } from "@/content";
import styles from "./Emblem.module.css";

/*
 * Each project's aircraft tail-fin emblem: one fin in profile (the same for every project), with the
 * project's livery and one or two letters on it. Monochrome; the livery turns amber only when a parent sets
 * --livery (hover, focus or the current page). Decorative: always aria-hidden.
 */

// The fin: the leading edge swept back, a short rounded tip, a near-vertical trailing edge.
const FIN = "M5 44 L23.5 7.5 C24.6 5.4 26 4.5 28.2 4.5 L36.6 4.5 C38.4 4.5 39.5 5.7 39.3 7.5 L36.4 44 Z";

const LIVERIES: Record<Livery, React.ReactNode> = {
  stripe: <path d="M13 46 L31.5 3" strokeWidth="4.5" fill="none" />,
  twin: (
    <>
      <path d="M11 46 L29.5 3" strokeWidth="2.2" fill="none" />
      <path d="M17 46 L35.5 3" strokeWidth="2.2" fill="none" />
    </>
  ),
  chevron: <path d="M4 25 L24 15 L44 25" strokeWidth="3.6" fill="none" />,
  band: <rect x="0" y="11" width="48" height="5.5" stroke="none" />,
  dot: <circle cx="31" cy="15" r="4.6" stroke="none" />,
  arc: <path d="M4 30 C14 14 30 10 46 15" strokeWidth="3" fill="none" />,
};

export function Emblem({ emblem, size = 40, className }: { emblem: EmblemData; size?: number; className?: string }) {
  const clip = useId();
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={`${styles.emblem}${className ? ` ${className}` : ""}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id={clip}>
          <path d={FIN} />
        </clipPath>
      </defs>
      <path d={FIN} className={styles.fin} />
      <g clipPath={`url(#${clip})`} className={styles.livery}>
        {LIVERIES[emblem.livery]}
      </g>
      <path d={FIN} className={styles.edge} />
      <line x1="1" y1="44.5" x2="47" y2="44.5" className={styles.base} />
      <text x="29" y="37.5" textAnchor="middle" className={styles.letters}>
        {emblem.letters}
      </text>
    </svg>
  );
}
