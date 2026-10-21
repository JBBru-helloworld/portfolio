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
    // The owner's resume confirms the scholarship but gives no date; the old CV's "Sep 2023" stays unshown.
    notes: ["TODO(owner): the year of the scholarship, if you want it shown (the old CV says Sep 2023)."],
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
    detail: "For PengYou, a budgeting web app with a virtual-pet reward system. I was the lead presenter.",
    date: "Jun 2024",
  },
  {
    kind: "community",
    title: "Generative AI Study Jam",
    detail: "Coordinated a five-week Generative AI Study Jam for 900+ participants with the Sunway Tech Club (2025).",
    date: "2025",
  },
  {
    kind: "community",
    title: "Portfolio workshop",
    detail: "Co-led a portfolio workshop with the Sunway Tech Club, alongside a speaker from Google (2025).",
    date: "Nov 2025",
  },
];
