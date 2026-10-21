import type { ExperienceItem } from "./types";

export const experience: ExperienceItem[] = [
  {
    slug: "coral-coders",
    organisation: "Coral Coders",
    role: "Founder and lead tutor",
    dates: { start: "Oct 2026", end: "Present" },
    summary: "Online one-to-one coding lessons for children and adults.",
    highlights: [
      "Founded and runs the business as its lead tutor, and built its website (Next.js on Cloudflare).",
    ],
    stack: ["Next.js", "Cloudflare"],
    links: [{ label: "coralcoders.com", url: "https://coralcoders.com", kind: "live" }],
  },
  {
    slug: "build-a-genius",
    organisation: "Build A Genius",
    role: "Part-time coding tutor",
    dates: { start: "Jun 2026", end: "Present" },
    location: "Remote",
    summary: "One-to-one coding lessons for 14 children.",
    highlights: ["Teaches Scratch, Minecraft Education and Python to 14 children one to one."],
    stack: ["Scratch", "Minecraft Education", "Python"],
    links: [],
  },
  {
    slug: "touch-n-go-digital",
    organisation: "Touch 'n Go Digital",
    role: "Data Scientist Intern",
    dates: { start: "Jan 2026", end: "Apr 2026" },
    summary:
      "Built ChatGPT workflows that automate commercial newsletters and weekly TPV and revenue snapshots for 30+ stakeholders, and answered data requests with SQL.",
    highlights: [
      "Built two ChatGPT workflows, the commercial newsletter and the weekly TPV and revenue performance snapshot, for 30+ stakeholders including the CEO, CFO and CCO: created the templates, cleaned up the data and engineered the prompts.",
      "Saved 7+ hours of manual reporting a week.",
      "Took data requests as tickets, wrote MaxCompute SQL to find the data and reported it back, using exploratory data analysis and feature engineering.",
    ],
    stack: ["MaxCompute SQL", "EDA", "Feature engineering", "ChatGPT"],
    links: [],
    confidentiality: "Internal work: describe the approach only, never confidential data, figures or screenshots.",
  },
  {
    slug: "plandora",
    organisation: "Plandora",
    role: "Junior Software Engineer",
    dates: { start: "Oct 2025", end: "Jan 2026" },
    summary:
      "Built an LLM-as-a-judge pipeline for AI chat quality, and AI product features including voice.",
    highlights: [
      "Built an LLM-as-a-judge pipeline benchmarking AI chat outputs and token limits with LangSmith and DeepEval.",
      "Added llms.txt for AI discoverability.",
      "Built AI trip planner and influencer clone features with ElevenLabs voice.",
      "Worked in React with REST APIs and CI/CD.",
    ],
    stack: ["LangSmith", "DeepEval", "ElevenLabs", "React", "REST APIs", "CI/CD"],
    links: [],
  },
];
