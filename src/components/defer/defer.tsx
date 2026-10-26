"use client";

/*
 * Deferred hydration for the sections below the board (Phase 6): their code stays out of the first load.
 *
 * The server renders each section in full, exactly as before. In the browser, an island's code is fetched and
 * hydrated in idle time after load, one island per idle slot, or as soon as its section is about a screen
 * away, whichever comes first; until then React keeps the server's HTML in place (a suspended Suspense boundary during hydration is left as it is). So nothing changes
 * size when the code arrives: glides, restores and returns land exactly as before.
 *
 * - `deferred(load, sectionId)`: hydrates in its idle turn, or when the section is near, or at once when the
 *   load restores into the section (so a #seat- link selects its seat without waiting for the jump).
 * - `deferredIdle(load)`: hydrates in idle time after the page has loaded (the corner sign, hidden until the
 *   landing has passed).
 * - On a client-side render (a return to the home page from a project page) there is no server HTML to keep:
 *   islands whose code has loaded (in idle time, on every page) render at once.
 */
import { lazy, Suspense, useEffect, type ComponentType } from "react";

type Loader<P> = () => Promise<ComponentType<P>>;

const loaded = new Map<Loader<never>, ComponentType<never>>();
const pending = new Set<() => Promise<unknown>>();

function load<P>(loader: Loader<P>): Promise<ComponentType<P>> {
  return loader().then((C) => {
    loaded.set(loader as Loader<never>, C as ComponentType<never>);
    return C;
  });
}

/** Resolves when the element with this id is about a screen away (at once if it is missing). */
function whenNear(id: string): Promise<void> {
  return new Promise((resolve) => {
    const el = document.getElementById(id);
    if (!el || typeof IntersectionObserver === "undefined") return resolve();
    const io = new IntersectionObserver(
      (es) => {
        if (!es.some((e) => e.isIntersecting)) return;
        io.disconnect();
        resolve();
      },
      { rootMargin: "100% 0px" },
    );
    io.observe(el);
  });
}

let idle: Promise<void> | null = null;
/** Resolves in idle time once the page has loaded. */
function whenIdle(): Promise<void> {
  idle ??= new Promise((resolve) => {
    const go = () => {
      const ric = window.requestIdleCallback ?? ((fn: () => void) => window.setTimeout(fn, 200));
      ric(() => resolve(), { timeout: 2500 });
    };
    if (document.readyState === "complete") go();
    else window.addEventListener("load", go, { once: true });
  });
  return idle;
}

function island<P extends object>(loader: Loader<P>, ready: () => Promise<void>) {
  pending.add(() => load(loader));
  const Lazy = lazy(async () => {
    if (typeof window !== "undefined") await ready();
    return { default: await load(loader) };
  });
  function Island(props: P) {
    // The same Suspense boundary on the server and in the browser, always (the server's module cache would
    // otherwise drop it after the first request, and hydration would not match). Only in the browser, and
    // only once the code is here (a client-side render), does the component render directly inside it.
    const Loaded = typeof window === "undefined" ? undefined : (loaded.get(loader as Loader<never>) as ComponentType<P> | undefined);
    return <Suspense fallback={null}>{Loaded ? <Loaded {...props} /> : <Lazy {...props} />}</Suspense>;
  }
  return Island;
}

// Islands hydrate one at a time in idle time after load (each in its own idle slot, so no long task stacks
// up), unless the visitor reaches one first.
let idleQueue: Promise<void> = Promise.resolve();
function whenIdleTurn(): Promise<void> {
  const turn = idleQueue.then(
    () =>
      new Promise<void>((resolve) => {
        void whenIdle().then(() => {
          const ric = window.requestIdleCallback ?? ((fn: () => void) => window.setTimeout(fn, 120));
          ric(() => resolve(), { timeout: 4000 });
        });
      }),
  );
  // The next island waits for this one's turn, plus a frame for its hydration to run.
  idleQueue = turn.then(() => new Promise<void>((r) => window.setTimeout(r, 60)));
  return turn;
}

/**
 * An island that hydrates in idle time after load (one island per idle slot), or as soon as its section (by
 * id) is about a screen away, whichever comes first.
 */
export function deferred<P extends object>(loader: Loader<P>, sectionId: string) {
  return island(loader, () => (restoresInto(sectionId) ? Promise.resolve() : Promise.race([whenNear(sectionId), whenIdleTurn()])));
}

/** True when this load restores to the section or to something inside it (a #seat- link, a saved section). */
function restoresInto(sectionId: string): boolean {
  const target = (window as Window & { __jbRestore?: string }).__jbRestore;
  if (!target) return false;
  if (target === sectionId) return true;
  const el = document.getElementById(target);
  return !!el && !!document.getElementById(sectionId)?.contains(el);
}

/** An island that hydrates in idle time once the page has loaded. */
export function deferredIdle<P extends object>(loader: Loader<P>) {
  return island(loader, whenIdle);
}

/**
 * Fetches every island's code in idle time once the page has loaded, so a later client-side render (a return
 * home from a project page) has it at hand. It does not hydrate anything early.
 */
export function IslandPreloader() {
  useEffect(() => {
    let cancelled = false;
    void whenIdle().then(() => {
      if (cancelled) return;
      for (const fetchCode of pending) void fetchCode().catch(() => undefined);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
