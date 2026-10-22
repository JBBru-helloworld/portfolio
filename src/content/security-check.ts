import type { ScannerConfig, SecurityCheck } from "./types";
import scanner from "./security-check-scanner.json";

/*
 * The Security check (Gate 3): synthetic passengers scored in advance by the fraud detection model
 * (payments-fraud-detection: `make scanner-grid`, exact explanations), with no live server. The inputs,
 * objects and the passengers' results are in security-check-scanner.json, and the packed bags' results in
 * the grid (security-check-grid.json and public/security-check/grid/), copied by `pnpm security-check:sync`.
 *
 * The model's score is not a calibrated probability, so visitors see its percentile among the validation
 * window's scores. The verdict bands are the repo's cost-based thresholds (review fees 5 and 10).
 */
export const securityCheck: SecurityCheck = {
  projectSlug: "fraud-detection",
  headline: "0.59 PR-AUC on 590K transactions",
  source:
    "payments-fraud-detection README and reports: test PR-AUC 0.5879 on the IEEE-CIS Fraud Detection dataset from Kaggle (590,540 transactions).",
  verdicts: ["CLEARED", "SCREENING", "STOPPED"],
  note: "Synthetic passengers, scored in advance by my fraud model (0.59 PR-AUC on 590K IEEE-CIS transactions). Every result is the model's real output. No real transactions are shown.",
  percentileNote: "Riskier than this share of the transactions the model was validated on.",
  scoreLabel: "Model score",
  precomputedLabel: "Precomputed",
  scanner: scanner as ScannerConfig,
  ui: {
    eyebrow: "SECURITY CHECK",
    lead: "Pick a passenger and watch my fraud model screen their bag.",
    queueLabel: "Passengers",
    passengerPrefix: "Passenger: ",
    pack: "PACK YOUR OWN BAG",
    random: "RANDOM PASSENGER",
    ready: "READY",
    incoming: "INCOMING",
    error: "The scanner could not load. Refresh to try again.",
    prompt: "Choose a passenger from the queue",
    packCaption: "Pack your own bag",
    packNote: "Time bands use the dataset's own clock, not local time. Amounts are in US dollars, as in the dataset.",
    bagLegend: "Bag",
    send: "SEND THROUGH",
    next: "Next passenger →",
    reportLabel: "Screening report",
    riskier: "Riskier than {percent} of transactions",
    validation: "Percentiles come from the model's validation set.",
    repo: "GitHub repo ↗",
    viewFlight: "View flight →",
    productNote: "Product types are anonymised codes in the dataset.",
  },
};
