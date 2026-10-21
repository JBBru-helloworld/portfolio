import type { DateRange } from "@/content";

/** "Oct 2025 to Jan 2026", or "Oct 2026" for a single month. */
export function formatDates(d: DateRange): string {
  return d.end && d.end !== d.start ? `${d.start} to ${d.end}` : d.start;
}

/** The year a project ended (or its only year), for the manifest. */
export function yearOf(d: DateRange): string {
  return (d.end ?? d.start).slice(-4);
}

/** False for content that is still an owner question: never rendered. */
export const shown = (text: string | undefined): text is string => !!text && !/(TODO|CHECK)\(owner\)/.test(text);
