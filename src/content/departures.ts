import { profile } from "./profile";
import type { Departures } from "./types";

/**
 * The departures board's own copy. Its rows are the site's sections (destinations.ts); the achievements
 * that used to be rows now live in their sections (projects, experience, credentials, journey, the
 * security check).
 */
export const departures: Departures = {
  title: "Departures", // shown in capitals by CSS
  columns: { flight: "FLIGHT", destination: "DESTINATION", gate: "GATE", remarks: "REMARKS" },
  sound: { ariaLabel: "Sound", onWord: "SOUND ON", offWord: "SOUND OFF", hint: "Turn on for the board sound" },
  nav: { ariaLabel: "Site sections", gate: "GATE", board: "DEPARTURES" },
  header: {
    label: "NOW BOARDING",
    name: "JOSHUA BONHAM",
    role: profile.roleLines.board,
  },
};
