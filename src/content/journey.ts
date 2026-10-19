import type { JourneyStamp } from "./types";

export const journey: JourneyStamp[] = [
  {
    country: "South Africa",
    ink: "za",
    years: { start: "Birth", end: "2019" },
    label: "SOUTH AFRICA · 2019",
    line: "Born and schooled in South Africa until 2019.",
  },
  {
    country: "Mauritius",
    ink: "mu",
    years: { start: "2019", end: "2023" },
    label: "MAURITIUS · 2019",
    line: "Moved to Mauritius for high school, from Grade 10 onwards.",
    notes: ["CHECK(owner): the old CV ends this school chapter in Nov 2022; the inventory says 2023. Using 2023."],
  },
  {
    country: "Malaysia",
    ink: "my",
    years: { start: "2023", end: "2026" },
    label: "MALAYSIA · 2023",
    line: "University in Malaysia: a Bachelor of Software Engineering (Hons) at Sunway University and Lancaster University.",
  },
];
