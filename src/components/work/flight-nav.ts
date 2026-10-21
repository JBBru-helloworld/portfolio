"use client";

/*
 * Moving between the home page and the project pages (/work/<slug>), client-side.
 *
 * - Origin: opening a project from the gallery or the manifest stores where the visitor was (the strip or
 *   row's id and its distance from the top of the viewport) in sessionStorage, so Back to all flights and
 *   the browser's back button land exactly there, with the scene already covered (site-state's restore).
 * - Intent: why the home page is being entered. "origin" (the default: Back to all flights, or the back
 *   button), "section" (a corner-sign or stack-chip link to a home section), or "top" (the wordmark).
 * - The flight: the clicked strip's image grows into the project page's header with the View Transitions
 *   API. Browsers without it get a quick fade; reduced motion gets neither.
 */
import { armRestore, consumeFirstPage } from "@/components/nav/site-state";

const ORIGIN_KEY = "jbbru:work-origin";
export const HERO_NAME = "flight-hero";
/** Longest wait for the new page before the transition carries on regardless. */
const ARRIVAL_CAP_MS = 900;

type Intent = { kind: "origin" } | { kind: "section"; id: string } | { kind: "top" };
let intent: Intent = { kind: "origin" };

export function setHomeIntent(next: Intent) {
  intent = next;
}

interface Origin {
  id: string;
  offset: number;
}

export function rememberOrigin(el: HTMLElement) {
  try {
    const origin: Origin = { id: el.id, offset: Math.round(el.getBoundingClientRect().top) };
    window.sessionStorage.setItem(ORIGIN_KEY, JSON.stringify(origin));
  } catch {
    // Storage unavailable: Back to all flights lands on the section instead.
  }
}

export function readOrigin(): Origin | null {
  try {
    const raw = window.sessionStorage.getItem(ORIGIN_KEY);
    return raw ? (JSON.parse(raw) as Origin) : null;
  } catch {
    return null;
  }
}

/** True once this visit to the home page has been set up (React may run effects twice in development). */
let homeEntered = false;

/** A project page has mounted: the next home page mount is a new visit. */
export function leftHome() {
  homeEntered = false;
}

/** The home page as it mounts (layout effect): on a client-side return, arm the restore for this entry. */
export function enterHome() {
  if (homeEntered) return;
  homeEntered = true;
  const first = consumeFirstPage();
  const why = intent;
  intent = { kind: "origin" };
  if (first) return; // a full load: the head script has set the restore up already
  window.scrollTo({ top: 0, behavior: "instant" });
  if (why.kind === "top") return armRestore(null);
  if (why.kind === "section") return armRestore(why.id, { hash: why.id });
  const origin = readOrigin();
  if (origin && document.getElementById(origin.id)) armRestore(origin.id, { offset: origin.offset });
  else armRestore("work", { hash: null });
}

// ---------- The flight (view transition) ----------

let arrived: (() => void) | null = null;

/** Called by the project page once its header image is ready: the transition captures the new page. */
export function landed() {
  arrived?.();
  arrived = null;
}

/** True once, on the project page that a fade (no View Transitions API) should bring in. */
let fadeNext = false;
export function takeFade(): boolean {
  const f = fadeNext;
  fadeNext = false;
  return f;
}

/**
 * Opens a project page. With the View Transitions API the hero (the strip's image) is named so it grows into
 * the page's header image; the old page is held until the new one has landed (or the cap passes).
 */
export function flyTo(navigate: () => void, hero: HTMLElement | null) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return navigate();
  if (typeof document.startViewTransition !== "function") {
    fadeNext = true;
    return navigate();
  }
  if (hero) hero.style.viewTransitionName = HERO_NAME;
  document.documentElement.dataset.flight = hero ? "hero" : "page";
  const transition = document.startViewTransition(
    () =>
      new Promise<void>((resolve) => {
        arrived = resolve;
        // The old page is captured by now: the strip gives the name up, so only the header carries it.
        if (hero) hero.style.viewTransitionName = "";
        navigate();
        window.setTimeout(landed, ARRIVAL_CAP_MS);
      }),
  );
  transition.finished.finally(() => delete document.documentElement.dataset.flight);
}
