"use client";

import { useLayoutEffect } from "react";
import { enterHome } from "./flight-nav";

/**
 * Arms the scroll restore when the home page is entered client-side (from a project page). A layout
 * effect, so it runs before the scroll sequence, Lenis and the section tracking set themselves up.
 */
export function HomeEntry() {
  useLayoutEffect(() => {
    enterHome();
  }, []);
  return null;
}
