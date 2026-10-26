/*
 * A vintage luggage tag, in HTML and SVG: aged cream card with a clipped top, a reinforced eyelet with a
 * loop of string, the line name in capitals, small printed labels in Newsreader Italic, typed values in
 * JetBrains Mono, hairline rules, a tag number in the margin and a dotted tear-off strip. The verdict is
 * stamped diagonally across it (the passport stamps' worn ink, see scripts/stamps/).
 *
 * The same card holds the editable form for "Pack your own bag" (children replace the typed fields).
 */
import type { ReactNode, Ref } from "react";
import type { GridVerdict } from "@/lib/security-check-grid";
import type { TagField } from "./format";
import styles from "./SecurityCheck.module.css";

interface Props {
  fields?: TagField[];
  tagNo: string;
  /** The verdict stamped on the tag, and whether it is landing now (animated) or already there. */
  stamp?: { verdict: GridVerdict; landing: boolean } | null;
  children?: ReactNode;
  /** Shown above the fields (the editable tag's heading). */
  caption?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

export function LuggageTag({ fields, tagNo, stamp, children, caption, className, ref }: Props) {
  return (
    <div ref={ref} className={`${styles.tagWrap} ${className ?? ""}`}>
      {/* The string loops through the eyelet, outside the card's clipped shape. */}
      <svg className={styles.tagString} viewBox="0 0 40 60" aria-hidden="true" focusable="false">
        <path d="M20 58 C 8 44, 6 22, 14 8 C 18 2, 24 2, 26 8 C 32 24, 30 44, 20 58" />
      </svg>
      <div className={styles.tag}>
        <span className={styles.eyelet} aria-hidden="true" />
        <p className={styles.tagLine}>JB AIR · BAGGAGE CHECK</p>
        {caption ? <p className={styles.tagCaption}>{caption}</p> : null}
        {fields ? (
          <dl className={styles.tagFields}>
            {fields.map((f) => (
              <div key={f.label} className={styles.tagField}>
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
            <div className={styles.tagField}>
              <dt>No. of pieces</dt>
              <dd>1</dd>
            </div>
          </dl>
        ) : null}
        {children}
        <p className={styles.tagNo} aria-hidden="true">
          {tagNo}
        </p>
        <div className={styles.tearOff} aria-hidden="true">
          <span>{tagNo}</span>
        </div>
        {stamp ? (
          <span className={styles.tagStamp} data-verdict={stamp.verdict} data-landing={stamp.landing ? "" : undefined} aria-hidden="true">
            <span className={styles.tagStampInk} />
          </span>
        ) : null}
      </div>
    </div>
  );
}
