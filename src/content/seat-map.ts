import type { SeatMapCopy } from "./types";

/** Labels for the Tech stack section (Gate 4), shown as an aircraft seat map. */
export const seatMap: SeatMapCopy = {
  label: "SEAT MAP",
  intro: "My stack, seated by zone. Choose a seat to see where I used it, or book a group to see one project's stack.",
  cabinLabel: "Seat map of the tech stack",
  groupBooking: "Group booking",
  groupPlaceholder: "Choose a flight",
  groupNone: "No group booking",
  groupHeadings: { featured: "Featured flights", all: "All flights" },
  booked: "seats booked",
  clear: "Clear",
  viewFlight: "View flight",
  views: { map: "Seat map", list: "List" },
  legend: { title: "Zones", selected: "Selected", empty: "Empty" },
  card: { seat: "Seat", zone: "Zone", usedIn: "Used in", alsoAt: "Also at", close: "Close", none: "Not in a project on this site yet." },
  projectCount: { one: "project", many: "projects" },
};
