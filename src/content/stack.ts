import type { StackCategory, StackElement } from "./types";

/** Category order for the periodic table; element numbers follow this order. */
export const stackCategories: StackCategory[] = [
  "ML and Data",
  "GenAI",
  "Languages",
  "Frontend",
  "Backend",
  "Cloud and DevOps",
  "Tools",
];

type ElementDraft = Omit<StackElement, "number" | "id">;

/** "Next.js" becomes "next-js", "CI/CD" becomes "ci-cd". */
export const stackId = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const elements: ElementDraft[] = [
  // ML and Data
  { symbol: "Lg", name: "LightGBM", category: "ML and Data", usedFor: "Fraud detection model" },
  { symbol: "Sh", name: "SHAP", category: "ML and Data", usedFor: "Fraud detection explanations" },
  { symbol: "Op", name: "Optuna", category: "ML and Data", usedFor: "Fraud detection hyperparameter tuning" },
  { symbol: "Mc", name: "MaxCompute", category: "ML and Data", usedFor: "Touch 'n Go Digital reporting workflows" },
  { symbol: "Pd", name: "pandas", category: "ML and Data", usedFor: "Fraud detection data pipeline (payments-fraud-detection: requirements.txt, src/fraud/features.py)" },
  { symbol: "Np", name: "NumPy", category: "ML and Data", usedFor: "Fraud detection features and metrics (payments-fraud-detection: requirements.txt, src/fraud/features.py)" },
  { symbol: "Sk", name: "scikit-learn", category: "ML and Data", usedFor: "Fraud detection baselines and PR-AUC metrics (payments-fraud-detection: requirements.txt, src/fraud/train.py, src/fraud/metrics.py)" },
  { symbol: "Mp", name: "Matplotlib", category: "ML and Data", usedFor: "Fraud detection EDA charts (payments-fraud-detection: requirements.txt, src/fraud/eda.py)" },
  { symbol: "Pa", name: "PyArrow", category: "ML and Data", usedFor: "Fraud detection Parquet data (payments-fraud-detection: requirements.txt, src/fraud/features.py)" },

  // GenAI
  { symbol: "Cg", name: "ChatGPT", category: "GenAI", usedFor: "Newsletter and performance snapshot workflows at Touch 'n Go Digital" },
  { symbol: "Gm", name: "Google Gemini", category: "GenAI", usedFor: "Inklusif, OCR Budget Tracker, Grab Buddy, PengYou and Mapetite search" },
  { symbol: "Ol", name: "Ollama", category: "GenAI", usedFor: "Grab Buddy (UMHackathon 2025)" },
  { symbol: "Ms", name: "Mistral 7B", category: "GenAI", usedFor: "Grab Buddy (UMHackathon 2025)" },
  { symbol: "Ls", name: "LangSmith", category: "GenAI", usedFor: "LLM-as-a-judge pipeline at Plandora" },
  { symbol: "De", name: "DeepEval", category: "GenAI", usedFor: "LLM-as-a-judge pipeline at Plandora" },
  { symbol: "El", name: "ElevenLabs", category: "GenAI", usedFor: "Voice features at Plandora" },
  { symbol: "Oc", name: "OCI Generative AI", category: "GenAI", usedFor: "Oracle Generative AI Professional certification" },

  // Languages
  { symbol: "Py", name: "Python", category: "Languages", usedFor: "Fraud detection, Budget Tracker backend, AWS receipt tool, Plandora evaluation tests" },
  { symbol: "Sq", name: "SQL", category: "Languages", usedFor: "MaxCompute SQL at Touch 'n Go Digital, MySQL in Recipe Roots" },
  { symbol: "Js", name: "JavaScript", category: "Languages", usedFor: "EventSphere" },
  { symbol: "Ts", name: "TypeScript", category: "Languages", usedFor: "Evaluation tests for the LLM-as-a-judge pipeline at Plandora" },
  { symbol: "Jv", name: "Java", category: "Languages", usedFor: "Pokémon ASCII" },
  { symbol: "Sc", name: "Scala", category: "Languages", usedFor: "Harvest For All" },
  { symbol: "Ph", name: "PHP", category: "Languages", usedFor: "Recipe Roots" },
  { symbol: "Ht", name: "HTML", category: "Languages", usedFor: "EventSphere" },
  { symbol: "Cs", name: "CSS", category: "Languages", usedFor: "Asia Arts Festival Malaysia website, EventSphere" },
  { symbol: "Da", name: "Dart", category: "Languages", usedFor: "Mapetite mobile app" },

  // Frontend
  { symbol: "Re", name: "React", category: "Frontend", usedFor: "OCR Budget Tracker, Plandora" },
  { symbol: "Nx", name: "Next.js", category: "Frontend", usedFor: "Inklusif, Coral Coders website" },
  { symbol: "Sv", name: "Svelte", category: "Frontend", usedFor: "PengYou (ImagineHack 2024)" },
  { symbol: "Vt", name: "Vite", category: "Frontend", usedFor: "OCR Budget Tracker" },
  { symbol: "Tw", name: "Tailwind CSS", category: "Frontend", usedFor: "OCR Budget Tracker" },
  { symbol: "Sf", name: "ScalaFX", category: "Frontend", usedFor: "Harvest For All" },
  { symbol: "Fl", name: "Flutter", category: "Frontend", usedFor: "Mapetite mobile app" },

  // Backend
  { symbol: "Fa", name: "FastAPI", category: "Backend", usedFor: "Fraud detection service, Inklusif, Budget Tracker" },
  { symbol: "Ra", name: "REST APIs", category: "Backend", usedFor: "Plandora" },
  { symbol: "Mg", name: "MongoDB", category: "Backend", usedFor: "OCR Budget Tracker, PengYou" },
  { symbol: "My", name: "MySQL", category: "Backend", usedFor: "Recipe Roots" },
  { symbol: "Sb", name: "Supabase", category: "Backend", usedFor: "Inklusif" },
  { symbol: "Fb", name: "Firebase Auth", category: "Backend", usedFor: "OCR Budget Tracker authentication" },
  { symbol: "Lk", name: "LiveKit", category: "Backend", usedFor: "Inklusif real-time voice and video" },
  { symbol: "Bv", name: "Brevo", category: "Backend", usedFor: "Inklusif email" },
  { symbol: "Pg", name: "PostgreSQL", category: "Backend", usedFor: "Mapetite, with PostGIS and pgvector" },
  { symbol: "Dy", name: "Amazon DynamoDB", category: "Backend", usedFor: "Automated Receipt Processing Tool" },

  // Cloud and DevOps
  { symbol: "Dk", name: "Docker", category: "Cloud and DevOps", usedFor: "Fraud detection service, Budget Tracker backend, Recipe Roots, Mapetite" },
  { symbol: "Ci", name: "CI/CD", category: "Cloud and DevOps", usedFor: "Plandora" },
  { symbol: "La", name: "AWS Lambda", category: "Cloud and DevOps", usedFor: "Automated Receipt Processing Tool" },
  { symbol: "As", name: "Amazon S3", category: "Cloud and DevOps", usedFor: "Automated Receipt Processing Tool" },
  { symbol: "Tx", name: "Amazon Textract", category: "Cloud and DevOps", usedFor: "Automated Receipt Processing Tool" },
  { symbol: "Se", name: "Amazon SES", category: "Cloud and DevOps", usedFor: "Automated Receipt Processing Tool alerts" },
  { symbol: "Gr", name: "Google Cloud Run", category: "Cloud and DevOps", usedFor: "Inklusif (migrated from Railway)" },
  { symbol: "Rw", name: "Railway", category: "Cloud and DevOps", usedFor: "Inklusif, before the move to Cloud Run" },
  { symbol: "Ve", name: "Vercel", category: "Cloud and DevOps", usedFor: "Inklusif, OCR Budget Tracker frontend" },
  { symbol: "Rn", name: "Render", category: "Cloud and DevOps", usedFor: "OCR Budget Tracker backend" },
  { symbol: "Cf", name: "Cloudflare", category: "Cloud and DevOps", usedFor: "Coral Coders website" },

  // Tools
  { symbol: "Gt", name: "Git", category: "Tools", usedFor: "Pokémon ASCII" },
  { symbol: "Gh", name: "GitHub", category: "Tools", usedFor: "English Portfolio" },
  { symbol: "Pt", name: "pytest", category: "Tools", usedFor: "Fraud detection test suite" },
  { symbol: "Fg", name: "Figma", category: "Tools", usedFor: "Grab Buddy, Recipe Roots, Smart Vehicle Performance System" },
  { symbol: "Um", name: "UML", category: "Tools", usedFor: "Smart Vehicle Performance System" },
  { symbol: "Sqs", name: "Squarespace", category: "Tools", usedFor: "Asia Arts Festival Malaysia website" },
];

export const stack: StackElement[] = elements.map((element, index) => ({
  id: stackId(element.name),
  number: index + 1,
  ...element,
}));

export const stackById = new Map(stack.map((element) => [element.id, element]));
