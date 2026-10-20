"use client";

/*
 * Lenis smooth scrolling for wheel and trackpad, driven by GSAP's ticker so ScrollTrigger and Lenis share
 * one clock (the integration from the Lenis README). Touch-first devices and reduced motion keep native
 * scrolling. Keyboard scrolling stays native in every case; Lenis follows it. Lenis starts only after the
 * scroll restore (site-state.ts), so a reload on a later section never animates there.
 */
import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { REDUCED_MOTION, TOUCH_ONLY } from "@/components/scene/media";
import { whenRestored } from "@/components/nav/site-state";

gsap.registerPlugin(ScrollTrigger);

declare global {
  interface Window {
    __lenis?: Lenis;
  }
}

export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia(REDUCED_MOTION).matches || window.matchMedia(TOUCH_ONLY).matches) return;
    let lenis: Lenis | null = null;
    const tick = (time: number) => lenis?.raf(time * 1000);
    const cancel = whenRestored(() => {
      lenis = new Lenis({ smoothWheel: true, syncTouch: false });
      window.__lenis = lenis;
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
    });
    return () => {
      cancel();
      if (!lenis) return;
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33); // GSAP's default
      lenis.destroy();
      delete window.__lenis;
    };
  }, []);
  return null;
}
