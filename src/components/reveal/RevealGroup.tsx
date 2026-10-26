"use client";

/*
 * Staggered entrances, once per visit: the logbook's rows writing in, the duty-free products settling onto
 * their shelves. Children marked data-reveal start hidden (only with JavaScript, see globals.css) and, as
 * they scroll in, appear in DOM order with a short stagger: a fade and a small rise (or, with a negative
 * --reveal-rise, a drop). Once everything has appeared, the visit remembers it (sessionStorage) and later
 * mounts show it at once. Under reduced motion nothing moves.
 */
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

interface Props {
  /** Names the group in sessionStorage ("logbook", "duty-free"). */
  id: string;
  className?: string;
  /** Between items appearing together, in ms. */
  stagger?: number;
  /** The rise in px (negative: a drop from above). */
  rise?: number;
  children: ReactNode;
}

export function RevealGroup({ id, className, stagger = 90, rise = 8, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const key = `jbbru:reveal-${id}`;
    let seen = false;
    try {
      seen = window.sessionStorage.getItem(key) === "1";
    } catch {
      // Storage unavailable: reveal as on a first visit.
    }
    if (seen || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.dataset.revealGroup = "done";
      return;
    }
    el.dataset.revealGroup = "run";
    const items = [...el.querySelectorAll<HTMLElement>("[data-reveal]")];
    const io = new IntersectionObserver(
      (entries) => {
        // The latest entry per item is its current state (a batch can hold several).
        const latest = new Map<Element, IntersectionObserverEntry>();
        entries.forEach((e) => latest.set(e.target, e));
        const showing = items.filter((item) => latest.get(item)?.isIntersecting && !item.hasAttribute("data-revealed"));
        showing.forEach((item, i) => {
          item.style.setProperty("--reveal-delay", `${i * stagger}ms`);
          item.setAttribute("data-revealed", "");
          io.unobserve(item);
        });
        if (items.every((item) => item.hasAttribute("data-revealed"))) {
          io.disconnect();
          try {
            window.sessionStorage.setItem(key, "1");
          } catch {
            // The next visit simply reveals again.
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    items.forEach((item) => io.observe(item));
    return () => io.disconnect();
  }, [id, stagger]);

  return (
    <div ref={ref} className={className} data-reveal-group="" style={{ "--reveal-rise": `${rise}px` } as CSSProperties}>
      {children}
    </div>
  );
}
