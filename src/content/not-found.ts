import type { NotFoundCopy } from "./types";

/** The 404 page, "Flight not found" (Phase 6). */
export const notFound: NotFoundCopy = {
  title: "Flight not found",
  description: "This flight isn't on today's board.",
  board: "FLIGHT NOT FOUND",
  sign: { code: "JB 404", sign: "NOT FOUND" },
  line: "This flight isn't on today's board. It may have been renumbered, or it never left the gate.",
  backToWindow: "Back to the window",
  allFlights: "All flights",
};
