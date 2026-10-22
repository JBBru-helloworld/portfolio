"use client";

import type { MouseEvent, ReactNode } from "react";
import Link from "next/link";

/**
 * "Back to the window": the very top, with the landing replayed as on a fresh visit. A full page load of "/"
 * with the saved section reset, so no restore happens and the shade intro plays (from any page).
 */
export function BackToWindow({ className, children, ariaLabel }: { className?: string; children: ReactNode; ariaLabel?: string }) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    try {
      window.sessionStorage.setItem("jbbru:section", "top");
    } catch {
      // Without storage a fresh load starts at the top anyway.
    }
    // Deliberately a full load (not a client-side push): only a fresh document replays the landing's intro.
    window.location.assign(new URL("/", window.location.origin).href);
  };
  return (
    <Link href="/" className={className} onClick={onClick} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}
