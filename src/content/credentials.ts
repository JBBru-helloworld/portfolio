import type { Credential } from "./types";

export const credentials: Credential[] = [
  {
    kind: "degree",
    title: "Bachelor of Software Engineering (Hons)",
    issuer: "Sunway University and Lancaster University",
    date: "Sep 2023 to Aug 2026",
  },
  {
    kind: "academic",
    title: "CGPA 3.95, six-time Dean's List",
    issuer: "Sunway University",
  },
  {
    kind: "scholarship",
    title: "Jeffrey Cheah Entrance Scholarship",
    issuer: "Sunway University and Lancaster University",
    date: "Sep 2023",
    notes: ["CHECK(owner): the date comes from the old CV; the inventory gives no date."],
  },
  {
    kind: "certification",
    title: "Oracle Cloud Infrastructure 2025 Certified Generative AI Professional",
    issuer: "Oracle",
    date: "Aug 2025",
  },
  {
    kind: "award",
    title: "1st Runner-Up and Best Pitch, ImagineHack 2024",
    detail: "For PengYou, a budgeting web app with a virtual-pet reward system. Joshua led the pitch.",
    date: "Jun 2024",
  },
  {
    kind: "community",
    title: "Generative AI Study Jam",
    detail: "Coordinated a five-week Generative AI Study Jam for 900+ participants.",
    date: "TODO(owner): year of the Study Jam",
  },
];
