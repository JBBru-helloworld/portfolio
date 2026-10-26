"use client";

/*
 * The email product. The address is never in the server HTML: it is joined from its two parts in the
 * browser (useSyncExternalStore gives the server, and the first render, no address). Without JavaScript the
 * <noscript> line shows it written out ("jb.brubusiness3 [at] gmail.com").
 *
 * Copy writes the address to the clipboard, and its label flips to COPIED with the board's flap mechanics,
 * then back after a few seconds. No sound (Duty free is silent).
 */
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { FlapBoard } from "@/components/departures/flap-engine";
import tileStyles from "@/components/departures/DeparturesBoard.module.css";
import type { DutyFreeCopy } from "@/content";
import styles from "./DutyFree.module.css";

const FLIP = { rowStagger: 0, tileJitter: 30, stepsBefore: [2, 4] as [number, number] };
const RESET_MS = 2600;
const noop = () => () => undefined;

interface Props {
  user: string;
  domain: string;
  copy: DutyFreeCopy;
  object: ReactNode;
}

export function EmailProduct({ user, domain, copy, object }: Props) {
  const address = useSyncExternalStore(noop, () => `${user}@${domain}`, () => null);
  const [copied, setCopied] = useState(false);
  const tilesRef = useRef<HTMLSpanElement>(null);
  const first = useRef(true);
  const word = copied ? copy.copy.done : copy.copy.idle;
  const length = Math.max(copy.copy.done.length, copy.copy.idle.length);
  const product = copy.products.email;

  useEffect(() => {
    const el = tilesRef.current;
    if (!el) return;
    const tiles = [...el.querySelectorAll<HTMLElement>("[data-target]")];
    const e = new FlapBoard([tiles], FLIP);
    e.retarget(word.padEnd(length, " "));
    if (first.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) e.settle();
    else e.run();
    first.current = false;
    return () => e.stop();
  }, [word, length]);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), RESET_MS);
    return () => window.clearTimeout(t);
  }, [copied]);

  const onCopy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
    } catch {
      // Older browsers: copy through a hidden field.
      const field = document.createElement("textarea");
      field.value = address;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      document.execCommand("copy");
      field.remove();
    }
    setCopied(true);
  };

  return (
    <>
      <a className={styles.product} href={address ? `mailto:${address}` : undefined} aria-label={`${product.name}: ${address ?? ""}`}>
        <span className={styles.object} aria-hidden="true">
          {object}
        </span>
        <span className={styles.tag}>
          <span className={styles.tagName}>{product.tag}</span>{" "}
          <span className={styles.tagAction}>{product.action}</span>
        </span>
      </a>
      <noscript>
        <span className={styles.fallback}>{copy.emailFallback}</span>
      </noscript>
      <button type="button" className={styles.copy} onClick={onCopy} aria-label={copy.copy.label} disabled={!address}>
        <span ref={tilesRef} className={`${tileStyles.tiles} ${styles.copyTiles}`} aria-hidden="true">
          {[...copy.copy.idle.padEnd(length, " ")].map((c, i) => (
            <span key={i} className={`${tileStyles.tile} ${styles.copyTile}`} data-target={c}>
              {(["top", "bottom", "flap-top", "flap-bottom"] as const).map((part) => (
                <span key={part} className={tileStyles.half} data-part={part}>
                  <span className={tileStyles.glyph} data-glyph={c} />
                </span>
              ))}
            </span>
          ))}
        </span>
        <span className="sr-only" aria-live="polite">
          {copied ? copy.copy.done : ""}
        </span>
      </button>
    </>
  );
}
