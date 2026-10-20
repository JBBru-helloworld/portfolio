import { profile } from "./profile";
import type { Departures } from "./types";

export const departures: Departures = {
  header: {
    label: "NOW BOARDING",
    name: "JOSHUA BONHAM",
    role: profile.roleLines.board,
  },
  rows: [
    {
      code: "ML",
      destination: "0.59 PR-AUC · 590K TXNS",
      status: "ON TIME",
      source:
        "payments-fraud-detection README and reports: test PR-AUC 0.5879 on the IEEE-CIS dataset (590,540 transactions).",
    },
    {
      code: "TNG",
      destination: "7+ HRS/WEEK SAVED",
      status: "ARRIVED",
      source: "Owner's content inventory: Touch 'n Go Digital internship, AI reporting workflows saving 7+ hours a week.",
    },
    {
      code: "PLD",
      destination: "LLM-AS-A-JUDGE EVALS SHIPPED",
      status: "DEPARTED",
      source: "Owner's content inventory: Plandora, LLM-as-a-judge pipeline with LangSmith and DeepEval.",
    },
    {
      code: "CC",
      destination: "FOUNDED CORAL CODERS",
      status: "ON TIME",
      source: "Owner's content inventory: Coral Coders, founder, Oct 2026 to present (coralcoders.com).",
    },
    {
      code: "UNI",
      destination: "3.95 CGPA · 6X DEAN'S LIST",
      status: "LANDED",
      source: "Owner's content inventory, confirmed final in Phase 2a: CGPA 3.95 and six-time Dean's List.",
    },
    {
      code: "HACK",
      destination: "1ST RUNNER-UP · IMAGINEHACK",
      status: "CLEARED",
      source: "Owner's content inventory and old CV: 1st Runner-Up and Best Pitch, ImagineHack 2024 (PengYou).",
    },
    {
      code: "GEN",
      destination: "900+ STUDY JAM ATTENDEES",
      status: "BOARDED",
      source: "Owner's content inventory and old CV: five-week Generative AI Study Jam for 900+ participants (2025).",
    },
  ],
};
