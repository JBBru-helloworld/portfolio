import type { JourneyPage, JourneyStamp } from "./types";

export const journeyPage: JourneyPage = { label: "VISAS" };

export const journey: JourneyStamp[] = [
  {
    country: "South Africa",
    ink: "za",
    years: { start: "Birth", end: "2019" },
    label: "SOUTH AFRICA · 2019",
    line: "Born and schooled in South Africa until 2019.",
    period: "Until 2019",
    stamp: { port: "JNB", word: "DEPARTED", year: "2019", rotate: -4 }, // no arrival year: the stamp is the departure
  },
  {
    country: "Mauritius",
    ink: "mu",
    years: { start: "2019", end: "2023" },
    label: "MAURITIUS · 2019",
    line: "Moved to Mauritius for high school, from Grade 10 onwards.",
    period: "2019 to 2023",
    stamp: { port: "MRU", word: "ADMITTED", year: "2019", rotate: 5 },
    notes: ["Years confirmed by the owner (2026-10-21): 2019 to 2023."],
  },
  {
    country: "Malaysia",
    ink: "my",
    years: { start: "2023", end: "2026" },
    label: "MALAYSIA · 2023",
    line: "University in Malaysia: a Bachelor of Software Engineering (Hons) at Sunway University and Lancaster University, with a 3.95 CGPA and six Dean's List awards.",
    period: "2023 to 2026",
    stamp: { port: "KUL", word: "ENTRY", year: "2023", rotate: -2.5 },
  },
];
