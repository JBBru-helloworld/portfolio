"use client";

/*
 * Lenis smooth scrolling for wheel and trackpad, driven by GSAP's ticker so ScrollTrigger and Lenis share
 * one clock (the integration from the Lenis README). Touch-first devices and reduced motion keep native
 * scrolling. Keyboard scrolling stays native in every case; Lenis follows it.
 */
import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { REDUCED_MOTION, TOUCH_ONLY } from "@/components/scene/media";

gsap.registerPlugin(ScrollTrigger);

declare global {
  interface Window {
    __lenis?: Lenis;
  }
}

export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia(REDUCED_MOTION).matches || window.matchMedia(TOUCH_ONLY).matches) return;
    const lenis = new Lenis({ smoothWheel: true, syncTouch: false });
    window.__lenis = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33); // GSAP's default
      lenis.destroy();
      delete window.__lenis;
    };
  }, []);
  return null;
}
