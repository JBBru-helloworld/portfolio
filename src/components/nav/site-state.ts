"use client";

/*
 * Shared navigation state for the departures board and the corner navigation: which section the visitor
 * is in, which sections they have visited (DEPARTED), which one is boarding, the glide between sections,
 * and the scroll restore on reload.
 *
 * Restore: the inline head script (layout.tsx) turns off the browser's own scroll restoration, takes any
 * URL hash off the address (so the browser does not jump before the scroll sequence exists) and records
 * where to restore to. The scroll sequence restores once its pin is in place (useScrollSequence.ts), then
 * calls markRestored(); Lenis and the section tracker start only after that.
 */
import { useSyncExternalStore } from "react";
import type { Destination, DestinationRemark } from "@/content";
import { destinations } from "@/content/destinations";
import { REDUCED_MOTION, TOUCH_ONLY } from "@/components/scene/media";

declare global {
  interface Window {
    /** Set by the head script: the section to restore to (from the URL hash, or the saved section). */
    __jbRestore?: string;
    /** Set by the head script when the restore target came from the URL hash. */
    __jbHash?: string;
  }
}

export const BOARD_ID = "departures";
const SECTION_KEY = "jbbru:section";
const VISITED_KEY = "jbbru:visited";
/** A section is current once its top passes this share of the viewport height. */
const CURRENT_LINE = 0.4;

const store = {
  get: (key: string): string | null => {
    try {
      return window.sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key: string, value: string) => {
    try {
      window.sessionStorage.setItem(key, value);
    } catch {
      // Storage unavailable (private mode, blocked): the site works without it.
    }
  },
};

export interface NavState {
  /** The board's id or a destination id once the sequence is over; null during the window sequence. */
  current: string | null;
  visited: ReadonlySet<string>;
  /** The destination being glided to, if any. */
  boarding: string | null;
  /** The seat chosen on the Tech stack seat map, for the corner sign ("SEAT 3A · PYTHON"). */
  seat: { code: string; name: string } | null;
}

const INITIAL: NavState = { current: null, visited: new Set(), boarding: null, seat: null };
let state: NavState = INITIAL;
const listeners = new Set<() => void>();

function update(next: Partial<NavState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getState = () => state;

export function useNavState(): NavState {
  return useSyncExternalStore(subscribe, getState, () => INITIAL);
}

/** The remark the board and the panel show for a destination. */
export function remarkOf(d: Destination, s: NavState = state): DestinationRemark {
  if (s.visited.has(d.id)) return "DEPARTED";
  if (s.boarding === d.id) return "BOARDING";
  return d.remark;
}

export function setBoarding(id: string | null) {
  if (state.boarding !== id) update({ boarding: id });
}

export function setSeat(seat: NavState["seat"]) {
  if (state.seat?.code !== seat?.code) update({ seat });
}

// ---------- Restore ----------

let restored = false;
const restoreListeners = new Set<() => void>();
let restoreTarget: string | null | undefined;
/** Pixels between the viewport top and the restore target (to land a gallery strip exactly where it was). */
let restoreOffset = 0;
let firstPage = true;

/**
 * True for the first page rendered in this document (its restore was set up by the head script); every
 * later client-side page mount gets false. Each page calls this once as it mounts.
 */
export function consumeFirstPage(): boolean {
  const first = firstPage;
  firstPage = false;
  return first;
}

/** True once a page has mounted in this document: any page rendering now is a client-side navigation. */
export const isClientNavigation = () => !firstPage;

/**
 * Arms the restore again for a client-side return to the home page (the head script only runs on a full
 * load): back from a project page to the gallery or manifest row the visitor left, or on to a section.
 * Called in a layout effect, before the scroll sequence and Lenis mount. `hash` is put back in the address
 * once restored.
 */
export function armRestore(target: string | null, { offset = 0, hash = null }: { offset?: number; hash?: string | null } = {}) {
  restored = false;
  restoreTarget = undefined;
  restoreOffset = offset;
  window.__jbRestore = target ?? undefined;
  window.__jbHash = hash ?? undefined;
  if (target) document.documentElement.setAttribute("data-restore", "");
}

/** The section to restore to on this load (validated against the page), or null for the top. */
export function pendingRestore(): string | null {
  if (restoreTarget !== undefined) return restoreTarget;
  const id = typeof window === "undefined" ? undefined : window.__jbRestore;
  restoreTarget = id && id !== "top" && document.getElementById(id) ? id : null;
  if (!restoreTarget) document.documentElement.removeAttribute("data-restore");
  return restoreTarget;
}

/** A section's top in page coordinates (for the board, its solid panel below the feathered edge). */
export function sectionTop(id: string): number | null {
  const el = document.getElementById(id);
  if (!el) return null;
  return el.getBoundingClientRect().top + window.scrollY;
}

/**
 * Where a restore to `id` should scroll. Most targets go to the top of the screen (less the origin offset);
 * an element marked data-restore-center (a seat) is centred, and one that is not shown (a seat while the
 * list view is up) restores to its section instead.
 */
function restoreTop(id: string): number | null {
  const el = document.getElementById(id);
  if (!el) return null;
  if (el.hasAttribute("data-restore-center")) {
    const r = el.getBoundingClientRect();
    if (!r.height) {
      const section = el.closest("section[id]");
      return section ? sectionTop(section.id) : null;
    }
    return r.top + window.scrollY - (window.innerHeight - r.height) / 2;
  }
  const top = sectionTop(id);
  return top === null ? null : top - restoreOffset;
}

/**
 * Jumps (instantly) to the restore target, if any, and starts everything that waits for the restore.
 * Called once the scroll sequence's pin exists (or straight away when there is no sequence).
 */
/** The last jump (target and time): repeated if the scroll sequence is set up again at once. */
let lastJump: { id: string; at: number } | null = null;
const REJUMP_MS = 1000;

export function restoreNow(afterJump?: () => void) {
  if (restored) {
    // The sequence was torn down and rebuilt straight after the jump (React runs effects twice in
    // development): its pin spacing went and came back, so jump again.
    if (lastJump && performance.now() - lastJump.at < REJUMP_MS) {
      const top = restoreTop(lastJump.id);
      if (top !== null) window.scrollTo({ top: Math.max(0, top), behavior: "instant" });
      afterJump?.();
    }
    return;
  }
  const id = pendingRestore();
  lastJump = null;
  if (id) {
    const top = restoreTop(id);
    if (top !== null) window.scrollTo({ top: Math.max(0, top), behavior: "instant" });
    lastJump = { id, at: performance.now() };
    afterJump?.();
    if (window.__jbHash) history.replaceState(history.state, "", `#${window.__jbHash}`);
  } else if (window.__jbHash) {
    // A hash that is not a section: put it back as it was.
    history.replaceState(history.state, "", `#${window.__jbHash}`);
  }
  document.documentElement.removeAttribute("data-restore");
  restored = true;
  restoreListeners.forEach((l) => l());
  restoreListeners.clear();
}

/** Runs fn once the restore is done (at once if it already is). Returns a cancel function. */
export function whenRestored(fn: () => void): () => void {
  if (restored) {
    fn();
    return () => undefined;
  }
  restoreListeners.add(fn);
  return () => restoreListeners.delete(fn);
}

// ---------- Section tracking ----------

/** True once the window sequence is over: the board has fully risen (or, without the sequence, reached). */
function sequenceOver(): boolean {
  const scene = document.querySelector<HTMLElement>("section[data-phase]");
  const covered = scene?.dataset.boardCovered;
  if (covered !== undefined) return covered === "true";
  const board = document.getElementById(BOARD_ID);
  return !!board && board.getBoundingClientRect().top <= window.innerHeight * CURRENT_LINE;
}

function computeCurrent(): string | null {
  if (!sequenceOver()) return null;
  let current: string = BOARD_ID;
  const line = window.innerHeight * CURRENT_LINE;
  for (const d of destinations) {
    const el = document.getElementById(d.id);
    if (el && el.getBoundingClientRect().top <= line) current = d.id;
  }
  return current;
}

let tracking = false;
let loaded = false;
/** While a glide passes other sections, only its destination counts as visited. */
let gliding: string | null = null;

/** Reads the visited sections saved earlier in this browser session (once). */
export function loadVisited() {
  if (loaded) return;
  loaded = true;
  const saved = store.get(VISITED_KEY);
  if (saved) update({ visited: new Set(saved.split(",").filter(Boolean)) });
}

/** Starts following the scroll: the current section, the saved section and the visited set. */
export function startTracking(): () => void {
  if (tracking) return () => undefined;
  tracking = true;
  loadVisited();

  let raf = 0;
  let first = true;
  const check = () => {
    raf = 0;
    const current = computeCurrent();
    if (current === state.current && !first) return;
    first = false;
    store.set(SECTION_KEY, current ?? "top");
    const next: Partial<NavState> = { current };
    if (current && current !== BOARD_ID && !state.visited.has(current) && (!gliding || gliding === current)) {
      const v = new Set(state.visited).add(current);
      store.set(VISITED_KEY, [...v].join(","));
      next.visited = v;
      if (state.boarding === current) next.boarding = null;
    }
    update(next);
  };
  const onScroll = () => {
    if (!raf) raf = requestAnimationFrame(check);
  };
  check();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  // The scene's covered flag changes inside ScrollTrigger callbacks; follow it too.
  const scene = document.querySelector("section[data-phase]");
  const mo = scene ? new MutationObserver(onScroll) : null;
  mo?.observe(scene!, { attributes: true, attributeFilter: ["data-board-covered"] });
  return () => {
    tracking = false;
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
    mo?.disconnect();
  };
}

// ---------- Glide ----------

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * Glides to a section: Lenis on desktop, native smooth scrolling on touch, an instant jump under reduced
 * motion. Updates the hash, and moves focus to the section once there (unless `focus` is false).
 */
export function glideTo(id: string, { focus = true }: { focus?: boolean } = {}) {
  const el = document.getElementById(id);
  const top = sectionTop(id);
  if (!el || top === null) return;
  history.replaceState(history.state, "", `#${id}`);
  gliding = id;
  const arrive = () => {
    gliding = null;
    if (focus) el.focus({ preventScroll: true });
  };
  if (window.matchMedia(REDUCED_MOTION).matches) {
    if (window.__lenis) window.__lenis.scrollTo(top, { immediate: true, force: true });
    else window.scrollTo({ top, behavior: "instant" });
    arrive();
    return;
  }
  const lenis = window.__lenis;
  if (lenis && !window.matchMedia(TOUCH_ONLY).matches) {
    const distance = Math.abs(top - window.scrollY);
    const duration = Math.min(1.6, Math.max(0.8, distance / 2400));
    lenis.scrollTo(top, { duration, easing: easeInOutCubic, force: true, onComplete: arrive });
    return;
  }
  window.scrollTo({ top, behavior: "smooth" });
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    window.removeEventListener("scrollend", finish);
    arrive();
  };
  window.addEventListener("scrollend", finish, { once: true });
  window.setTimeout(finish, 1500); // Safari before 26 has no scrollend
}

/** Back to the very top of the page (the landing), instantly: the sequence is not replayed backwards. */
export function jumpToTop() {
  if (window.__lenis) window.__lenis.scrollTo(0, { immediate: true, force: true });
  else window.scrollTo({ top: 0, behavior: "instant" });
  history.replaceState(history.state, "", window.location.pathname + window.location.search);
}
