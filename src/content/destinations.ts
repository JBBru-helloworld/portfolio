import type { Destination } from "./types";

/**
 * The site's sections, in page order: the single source for the departures board's rows and the corner
 * navigation. Every id must exist on the page (`pnpm check:content` checks it).
 */
export const destinations: Destination[] = [
  { flight: "JB 101", destination: "MY JOURNEY", gate: "1", remark: "BOARDING", id: "journey", name: "My journey" },
  { flight: "JB 102", destination: "SELECTED WORK", gate: "2", remark: "ON TIME", id: "work", name: "Selected work" },
  { flight: "JB 103", destination: "FRAUD DEMO", gate: "3", remark: "ON TIME", id: "security-check", name: "Fraud demo" },
  { flight: "JB 104", destination: "TECH STACK", gate: "4", remark: "ON TIME", id: "stack", name: "Tech stack" },
  { flight: "JB 105", destination: "EXPERIENCE", gate: "5", remark: "ON TIME", id: "experience", name: "Experience" },
  { flight: "JB 106", destination: "CONTACT", gate: "6", remark: "ON TIME", id: "contact", name: "Contact" },
];
