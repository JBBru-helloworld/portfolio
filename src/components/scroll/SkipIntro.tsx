"use client";

/*
 * "Skip intro": visually hidden until focused, the first focusable element on the page. Jumps past the
 * pinned landing sequence straight to the next section (instantly, so the sequence does not play through)
 * and moves focus there.
 */
import type { MouseEvent } from "react";
import styles from "./SkipIntro.module.css";

export function SkipIntro({ targetId, label }: { targetId: string; label: string }) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById(targetId);
    if (!target) return;
    e.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY;
    if (window.__lenis) window.__lenis.scrollTo(top, { immediate: true, force: true });
    else window.scrollTo({ top, behavior: "instant" });
    target.focus({ preventScroll: true });
    history.replaceState(null, "", `#${targetId}`);
  };
  return (
    <a href={`#${targetId}`} className={styles.skip} onClick={onClick}>
      {label}
    </a>
  );
}
