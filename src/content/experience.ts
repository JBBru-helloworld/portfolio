import type { ExperienceItem } from "./types";

export const experience: ExperienceItem[] = [
  {
    slug: "coral-coders",
    organisation: "Coral Coders",
    role: "Founder and lead tutor",
    dates: { start: "Oct 2026", end: "Present" },
    location: "Remote", // confirmed by the owner (2026-10-21)
    summary: "Online one-to-one coding lessons for children and adults.",
    highlights: [
      "Founded the business and teach one-to-one as its lead tutor, and built its website (Next.js on Cloudflare).",
    ],
    remarks: [
      "Founded the business and teach one-to-one as lead tutor.",
      "Built its website with Next.js on Cloudflare.",
    ],
    photoPrefix: "coralcoders",
    // coralcoders-pic-1 only (the owner removed the second photo, 2026-10-21). Its WhatsApp number is blurred.
    photos: [
      { alt: "A Coral Coders flyer: Join our coding course, one-to-one online lessons" },
    ],
    stack: ["Next.js", "Cloudflare"],
    links: [{ label: "coralcoders.com", url: "https://coralcoders.com", kind: "live" }],
    project: "coral-coders-website",
  },
  {
    slug: "build-a-genius",
    organisation: "Build A Genius",
    role: "Part-time coding tutor",
    dates: { start: "Jun 2026", end: "Present" },
    location: "Remote",
    summary: "One-to-one coding lessons for 14 children.",
    highlights: ["Teach 14 children one-to-one in Scratch, Minecraft Education and Python."],
    remarks: ["Teach 14 children one-to-one in Scratch, Minecraft Education and Python."],
    photoPrefix: "bac",
    // The student's camera, name and username are blurred by the pipeline.
    photos: [{ alt: "Teaching a Scratch lesson over Zoom, with the student's camera blurred", frame: "landscape", focus: 42 }],
    stack: ["Scratch", "Minecraft Education", "Python"],
    links: [{ label: "buildagenius.com", url: "https://buildagenius.com/", kind: "live" }],
  },
  {
    slug: "touch-n-go-digital",
    organisation: "Touch 'n Go Digital",
    role: "Data Scientist Intern",
    dates: { start: "Jan 2026", end: "Apr 2026" },
    location: "Kuala Lumpur", // from the owner's resume
    summary:
      "Built ChatGPT workflows that automate commercial newsletters and weekly total payment value (TPV) and revenue snapshots for 30+ stakeholders, and answered data requests with SQL.",
    highlights: [
      "Built two ChatGPT workflows, the commercial newsletter and the weekly TPV and revenue performance snapshot, for 30+ stakeholders including the CEO, CFO and CCO: created the templates, cleaned up the data and engineered the prompts.",
      "Saved 7+ hours of manual reporting a week.",
      "Took data requests as tickets, wrote MaxCompute SQL to find the data and reported it back, using exploratory data analysis and feature engineering.",
    ],
    remarks: [
      "Built ChatGPT newsletter and performance snapshot workflows for 30+ stakeholders.",
      "Saved 7+ hours of manual reporting a week.",
      "Answered data requests with MaxCompute SQL.",
    ],
    photoPrefix: "tng",
    // In file order: tng-pic-1 to tng-pic-7 (assets/experience/). A photo with a CHECK(owner) note is never
    // exported (experience:build holds it back) until the owner confirms it.
    photos: [
      { alt: "Me in front of the Touch 'n Go eWallet sign at the office", frame: "landscape", focus: 60 },
      // tng-pic-2 and tng-pic-3: cleared by the owner (2026-10-21); experience:build blurs the staff ID badges.
      { alt: "With the team in front of the Touch 'n Go eWallet sign", frame: "landscape" },
      { alt: "A selfie with the team in front of the Touch 'n Go eWallet sign", frame: "landscape", focus: 45 },
      // Not published: the owner decided (2026-10-21). Its screens show internal work.
      { alt: "Me at my desk in the Touch 'n Go Digital office", publish: false },
      { alt: "Lion dance costumes in front of the Touch 'n Go eWallet sign at the office", frame: "landscape", focus: 52 },
      { alt: "The road outside the office buildings, in low sun", frame: "landscape", focus: 60 },
      // The screens are blurred by experience:build, as the owner asked (2026-10-21).
      { alt: "My desk, with a monitor and two laptops, their screens blurred", frame: "landscape", focus: 63 },
    ],
    stack: ["MaxCompute SQL", "EDA", "Feature engineering", "ChatGPT"],
    links: [{ label: "tngdigital.com.my", url: "https://www.tngdigital.com.my/", kind: "live" }],
    project: "touch-n-go-reporting",
    confidentiality: "Internal work: describe the approach only, never confidential data, figures or screenshots.",
  },
  {
    slug: "plandora",
    organisation: "Plandora",
    role: "Junior Software Engineer",
    dates: { start: "Oct 2025", end: "Jan 2026" },
    location: "Remote", // from the owner's resume
    summary:
      "Built an LLM-as-a-judge pipeline for AI chat quality and UI and UX features such as onboarding, and tested the product as QA.",
    highlights: [
      "Built an LLM-as-a-judge pipeline benchmarking AI chat outputs and token limits with LangSmith and DeepEval.",
      "Added llms.txt for AI discoverability.",
      "Built UI and UX features such as onboarding.",
      "Worked as a QA tester on the AI features, including the influencer clones and their ElevenLabs voice output, flagging and reporting bugs.",
      "Worked in React with REST APIs and CI/CD.",
    ],
    remarks: [
      "Built an LLM-as-a-judge pipeline with LangSmith and DeepEval.",
      "Helped flag 4+ accuracy and safety issues in the AI outputs.",
      "Built UI and UX features such as onboarding; QA tested and reported bugs.",
    ],
    photoPrefix: "plandora",
    // plandora-pic (assets/experience/).
    photos: [
      // Cleared by the owner (2026-10-21): the team's faces are already public on Plandora's own website.
      { alt: "With the Plandora team outdoors", frame: "landscape", focus: 68 },
    ],
    stack: ["LangSmith", "DeepEval", "ElevenLabs", "React", "REST APIs", "CI/CD"],
    links: [{ label: "plandora.com", url: "https://plandora.com/", kind: "live" }],
    project: "plandora-llm-judge",
  },
];
