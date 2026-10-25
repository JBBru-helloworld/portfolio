import type { LogbookCopy } from "./types";

/** Labels for the Experience section (Gate 5), a pilot's logbook. */
export const logbook: LogbookCopy = {
  label: "LOGBOOK",
  columns: { date: "Date", aircraft: "Aircraft", duty: "Duty", route: "Route", remarks: "Remarks" },
  present: "Present",
  ratingsTitle: "RATINGS AND ENDORSEMENTS",
  // Beside the ratings heading, only once `pnpm resume:build` has published a resume (Phase 6).
  resumeLink: { label: "FULL LOGBOOK · RESUME (PDF) ↓", ariaLabel: "Full logbook: my resume (PDF, opens in a new tab)" },
  photos: {
    group: "Photos",
    pause: "Pause photos",
    play: "Play photos",
    next: "Next photo",
    of: "of",
  },
  viewFlight: "View flight →",
};
