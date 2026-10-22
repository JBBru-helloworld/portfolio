import type { WorkCopy } from "./types";

/** Labels for Selected work (Gate 2) and the project pages. */
export const work: WorkCopy = {
  featuredLabel: "Featured flights",
  allFlights: "ALL FLIGHTS",
  viewFlight: "View flight",
  backToAll: "Back to all flights",
  previous: "Previous flight",
  next: "Next flight",
  headings: {
    stack: "Stack",
    metrics: "In numbers",
    caseStudy: "Case study",
    problem: "Problem",
    did: "What I did",
    result: "Result",
    screenshots: "Screenshots",
    video: "Video",
  },
  watchOnYouTube: "Watch on YouTube",
  playVideo: "Play video",
  enlarge: "View full screen",
  close: "Close",
  credit: { label: "Components adapted from Skiper UI", url: "https://skiper-ui.com/" },
  // Project flowcharts: generic labels only (no internal systems, teams or people).
  flows: {
    "touch-n-go-reporting": [
      {
        heading: "Data requests",
        caption: "How a data request was answered, from the ticket to the reply.",
        description:
          "A data request arrives as a ticket. SQL is written against the data warehouse to find the data, and the data is reported back to whoever asked.",
        before: [
          { title: "Ticket", note: "a data request" },
          { title: "SQL", note: "data warehouse" },
          { title: "Find the data" },
          { title: "Report back" },
        ],
      },
      {
        heading: "The AI workflows",
        caption: "How the two ChatGPT workflows run, from the templates to the readers.",
        description:
          "Templates are created and the data cleaned up, then the prompts are engineered for two ChatGPT workflows side by side: the newsletter and the performance snapshot. Both go to 30+ stakeholders, saving 7+ hours of manual reporting a week.",
        before: [{ title: "Templates" }, { title: "Data clean-up" }, { title: "Prompt engineering", note: "ChatGPT" }],
        pair: [
          { title: "Newsletter", note: "AI workflow" },
          { title: "Performance snapshot", note: "AI workflow" },
        ],
        after: [{ title: "30+ stakeholders" }],
        outcome: "7+ hours saved a week",
      },
    ],
    "plandora-llm-judge": [
      {
        heading: "How the evaluation runs",
        caption: "How the evaluation runs, from the chat outputs to the benchmarks.",
        description:
          "AI chat outputs go through evaluation tests written in Python and TypeScript. The tests check two things side by side: output quality, judged by an LLM, and token limits, benchmarked. DeepEval scores the results, and the benchmarks are tracked in LangSmith.",
        before: [{ title: "AI chat outputs" }, { title: "Evaluation tests", note: "Python, TypeScript" }],
        pair: [
          { title: "Output quality", note: "judged by an LLM" },
          { title: "Token limits", note: "benchmarked" },
        ],
        after: [
          { title: "Scores", note: "DeepEval" },
          { title: "Benchmarks", note: "LangSmith" },
        ],
      },
    ],
  },
};
