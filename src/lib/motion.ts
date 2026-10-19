/*
 * Motion tokens. CSS mirrors live in src/app/globals.css (--ease-*, --duration-*).
 * See DESIGN.md: interface feedback is fast ease-out, interactive elements use a soft
 * critically damped spring, and only scroll-driven scenes use the slow cinematic ease.
 */

export type CubicBezier = [number, number, number, number];

export const ease = {
  /** Interface feedback, enters and exits (150 to 250 ms). */
  out: [0.23, 1, 0.32, 1] as CubicBezier,
  /** Things already on screen moving or morphing. */
  inOut: [0.77, 0, 0.175, 1] as CubicBezier,
  /** Slow, scroll-driven scenes (the window landing). Never for UI feedback. */
  cinematic: [0.65, 0.05, 0.36, 1] as CubicBezier,
} as const;

/** Durations in seconds (Motion's unit). CSS uses the same values in ms. */
export const duration = {
  press: 0.12,
  fast: 0.15,
  base: 0.2,
  slow: 0.25,
  cinematic: 1.2,
  /** Opacity-only fades under reduced motion. Must stay under 0.2. */
  reduced: 0.15,
} as const;

/** Motion spring configs (Apple-style: bounce ~ 1 - damping ratio, visualDuration ~ response). */
export const spring = {
  /** Soft spring for interactive elements: critically damped, no overshoot. */
  soft: { type: "spring", bounce: 0, visualDuration: 0.4 },
  /** Only after a gesture carried momentum (a flick or drag release). */
  momentum: { type: "spring", bounce: 0.2, visualDuration: 0.4 },
} as const;

/** GSAP ease strings for ScrollTrigger scenes (CSS-equivalent curves need CustomEase). */
export const gsapEase = {
  out: "power3.out",
  inOut: "power3.inOut",
  cinematic: "sine.inOut",
} as const;

/** Reduced-motion fallback transition: opacity only, short. */
export const reducedTransition = { duration: duration.reduced, ease: "linear" } as const;

/** True when the user asks for reduced motion. Safe on the server (returns false). */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
