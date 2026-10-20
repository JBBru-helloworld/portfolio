import type { SecurityCheck } from "./types";

/** The live security check (fraud demo, built in a later phase) runs the fraud detection model. */
export const securityCheck: SecurityCheck = {
  projectSlug: "fraud-detection",
  headline: "0.59 PR-AUC on 590K transactions",
  source:
    "payments-fraud-detection README and reports: test PR-AUC 0.5879 on the IEEE-CIS Fraud Detection dataset from Kaggle (590,540 transactions).",
};
