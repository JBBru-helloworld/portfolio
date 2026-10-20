/** Shared media queries and network checks for the window scene. */

/** Phones and other small screens get the mobile video and fly-through tier. */
export const SMALL_SCREEN = "(max-width: 767px), (max-height: 500px), (max-aspect-ratio: 3/4)";

/** Portrait plate up to 3:4 viewports. Must match the media query in WindowScene.module.css. */
export const PORTRAIT_MEDIA = "(max-aspect-ratio: 3/4)";

/** Touch-first devices keep native scrolling (no Lenis) and get the shorter scroll distance. */
export const TOUCH_ONLY = "(hover: none) and (pointer: coarse)";

export const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/** Save-Data or a 2G/3G connection: no video and no fly-through frames. */
export function isConstrainedNetwork(): boolean {
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (!conn) return false;
  return Boolean(conn.saveData) || ["slow-2g", "2g", "3g"].includes(conn.effectiveType ?? "");
}
