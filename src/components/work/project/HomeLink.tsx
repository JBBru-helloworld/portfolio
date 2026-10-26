"use client";

import type { MouseEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { setHomeIntent } from "../flight-nav";

/**
 * A link from a project page to a section of the home page (`/#id`). Client-side, it lands on the section
 * directly (covered, no shade intro); a modified click opens the plain URL.
 */
export function HomeLink({ section, className, children }: { section: string; className?: string; children: ReactNode }) {
  const router = useRouter();
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    setHomeIntent({ kind: "section", id: section });
    // The home page's restore does the scroll; Next.js's own scroll and focus would move it again.
    router.push("/", { scroll: false });
  };
  return (
    <a href={`/#${section}`} className={className} onClick={onClick}>
      {children}
    </a>
  );
}
