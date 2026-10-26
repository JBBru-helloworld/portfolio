"use client";

import { useLayoutEffect } from "react";
import { consumeFirstPage, restoreNow } from "@/components/nav/site-state";
import { leftHome, takeFade } from "../flight-nav";
import { cssEase, duration, ease } from "@/lib/motion";

/**
 * A project page as it mounts: it takes its turn as the document's page (so a later return home is known
 * to be client-side), lets everything waiting on the restore start (Lenis; there is nothing to restore on a
 * project page), and, where the View Transitions API is missing, fades the page in quickly.
 */
export function ProjectEntry() {
  useLayoutEffect(() => {
    consumeFirstPage();
    leftHome();
    restoreNow();
    if (takeFade()) {
      document.querySelector("main")?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: duration.base * 1000, easing: cssEase(ease.out) });
    }
  }, []);
  return null;
}
