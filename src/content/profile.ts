import type { Profile } from "./types";

export const profile: Profile = {
  name: "Joshua Bonham",
  roleLines: {
    default: "Software engineer working across ML, data and AI",
    pointOfView: "Software engineer turning ML and data into shipped products",
    board: "SOFTWARE ENGINEER · ML AND DATA",
  },
  bio:
    "I'm a software engineer working across machine learning, data and AI, with the full-stack skills to ship what I build. " +
    "Recent work includes a leakage-safe fraud detection model, AI reporting workflows at Touch 'n Go Digital and an LLM-as-a-judge evaluation pipeline at Plandora. " +
    "I studied for a Bachelor of Software Engineering (Hons) at Sunway University and Lancaster University.",
  location: "TODO(owner): how you want your current base described",
  languages: [{ name: "English" }, { name: "French" }, { name: "Afrikaans" }],
  notes: [
    "CHECK(owner): Afrikaans is listed on the old CV as conversational; confirm it should appear.",
    "CHECK(owner): the bio says 'I studied' for the degree (Sep 2023 to Aug 2026); confirm the wording, or whether to state the result.",
  ],
};
