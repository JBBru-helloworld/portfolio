import type { ScannerConfig, SecurityCheck } from "./types";
import scanner from "./security-check-scanner.json";

/*
 * The Security check (Gate 3): synthetic passengers scored live by the fraud detection model
 * (payments-fraud-detection, api/). The scanner's inputs, objects, presets and their cached results come
 * from security-check-scanner.json, copied from the scanner API by `pnpm security-check:sync`.
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
  note: "Synthetic passengers, scored live by my IEEE-CIS fraud model. No real transactions are shown.",
  percentileNote: "Riskier than this share of the transactions the model was validated on.",
  scanner: scanner as ScannerConfig,
};
