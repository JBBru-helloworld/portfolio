import { useId } from "react";
import type { Emblem as EmblemData, Livery } from "@/content";
import { BASE, FIN, LETTERS, LIVERY_SHAPES } from "./emblem-geometry";
import styles from "./Emblem.module.css";

/*
 * Each project's aircraft tail-fin emblem: one fin in profile (the same for every project), with the
 * project's livery and one or two letters on it. Monochrome; the livery turns amber only when a parent sets
 * --livery (hover, focus or the current page). Decorative: always aria-hidden.
 */

function LiveryShapes({ livery }: { livery: Livery }) {
  return (
    <>
      {LIVERY_SHAPES[livery].map((shape, i) =>
        shape.kind === "path" ? (
          <path key={i} d={shape.d} strokeWidth={shape.strokeWidth} fill="none" />
        ) : shape.kind === "rect" ? (
          <rect key={i} x={shape.x} y={shape.y} width={shape.width} height={shape.height} stroke="none" />
        ) : (
          <circle key={i} cx={shape.cx} cy={shape.cy} r={shape.r} stroke="none" />
        ),
      )}
    </>
  );
}

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
        <LiveryShapes livery={emblem.livery} />
      </g>
      <path d={FIN} className={styles.edge} />
      <line x1={BASE.x1} y1={BASE.y} x2={BASE.x2} y2={BASE.y} className={styles.base} />
      <text x={LETTERS.x} y={LETTERS.y} textAnchor="middle" className={styles.letters}>
        {emblem.letters}
      </text>
    </svg>
  );
}
