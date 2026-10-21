import type { LogbookCopy } from "./types";

/** Labels for the Experience section (Gate 5), a pilot's logbook. */
export const logbook: LogbookCopy = {
  label: "LOGBOOK",
  columns: { date: "Date", aircraft: "Aircraft", duty: "Duty", route: "Route", remarks: "Remarks" },
  present: "Present",
  ratingsTitle: "RATINGS AND ENDORSEMENTS",
  photos: {
    group: "Photos",
    pause: "Pause photos",
    play: "Play photos",
    next: "Next photo",
    of: "of",
  },
};
