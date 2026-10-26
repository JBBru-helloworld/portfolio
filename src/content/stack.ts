import type { StackElement, Zone } from "./types";

/**
 * The tech stack, shown as an aircraft seat map (Gate 4). Zones are categories, not skill levels, front to
 * back (A, nearest the nose, to F). Seat numbers are derived from this order, never stored: rows are
 * numbered from the nose, six seats a row (A B C, aisle, D E F), each zone starting a new row. A
 * technology's stable anchor is its id (`#seat-python`), so links survive changes to the order.
 */
export const zones: Zone[] = [
  { letter: "A", name: "Languages" },
  { letter: "B", name: "Frontend" },
  { letter: "C", name: "Backend" },
  { letter: "D", name: "ML and data" },
  { letter: "E", name: "Cloud and DevOps" },
  { letter: "F", name: "Tools and design" },
];

type ElementDraft = Omit<StackElement, "id">;

/** "Next.js" becomes "next-js", "CI/CD" becomes "ci-cd". */
export const stackId = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// Symbols: one to three characters, unique (check:content). In zone order; within a zone, the order is the
// seat order.
const elements: ElementDraft[] = [
  // Zone A: Languages
  { symbol: "Py", name: "Python", zone: "Languages", usedFor: "Fraud detection, Budget Tracker backend, AWS receipt tool, Plandora evaluation tests" },
  { symbol: "Sq", name: "SQL", zone: "Languages", usedFor: "MaxCompute SQL at Touch 'n Go Digital, MySQL in Recipe Roots" },
  { symbol: "Js", name: "JavaScript", zone: "Languages", usedFor: "EventSphere" },
  { symbol: "Ts", name: "TypeScript", zone: "Languages", usedFor: "Evaluation tests for the LLM-as-a-judge pipeline at Plandora" },
  { symbol: "Jv", name: "Java", zone: "Languages", usedFor: "Pokémon ASCII" },
  { symbol: "Sc", name: "Scala", zone: "Languages", usedFor: "Harvest For All" },
  { symbol: "Ph", name: "PHP", zone: "Languages", usedFor: "Recipe Roots" },
  { symbol: "Ht", name: "HTML", zone: "Languages", usedFor: "EventSphere" },
  { symbol: "Cs", name: "CSS", zone: "Languages", usedFor: "Asia Arts Festival Malaysia website, EventSphere" },
  { symbol: "Da", name: "Dart", zone: "Languages", usedFor: "Mapetite mobile app" },

  // Zone B: Frontend
  { symbol: "Re", name: "React", zone: "Frontend", usedFor: "OCR Budget Tracker, Plandora" },
  { symbol: "Nx", name: "Next.js", zone: "Frontend", usedFor: "Inklusif, Coral Coders website" },
  { symbol: "Sv", name: "Svelte", zone: "Frontend", usedFor: "PengYou (ImagineHack 2024)" },
  { symbol: "Vt", name: "Vite", zone: "Frontend", usedFor: "OCR Budget Tracker" },
  { symbol: "Tw", name: "Tailwind CSS", zone: "Frontend", usedFor: "OCR Budget Tracker" },
  { symbol: "Sf", name: "ScalaFX", zone: "Frontend", usedFor: "Harvest For All" },
  { symbol: "Fl", name: "Flutter", zone: "Frontend", usedFor: "Mapetite mobile app" },
  { symbol: "Sn", name: "shadcn/ui", zone: "Frontend", usedFor: "Set-up and component conventions of jbbru.com (JB 207)" },
  { symbol: "Rx", name: "Radix UI", zone: "Frontend", usedFor: "The corner sign, the group-booking menu and the Security check's menus on jbbru.com (JB 207)" },
  { symbol: "Mo", name: "Motion", zone: "Frontend", usedFor: "The Featured flights gallery on jbbru.com (JB 207)" },
  { symbol: "Gs", name: "GSAP", zone: "Frontend", usedFor: "The window scene's scroll sequence on jbbru.com (JB 207)" },
  { symbol: "Ln", name: "Lenis", zone: "Frontend", usedFor: "Smooth wheel scrolling and section glides on jbbru.com (JB 207)" },
  { symbol: "Sg", name: "SVG", zone: "Frontend", usedFor: "The seat map, the X-ray objects, the luggage tags and the emblems on jbbru.com (JB 207)" },
  { symbol: "Wa", name: "Web Audio API", zone: "Frontend", usedFor: "The split-flap clicks, the cabin chime and the stamp thunk on jbbru.com (JB 207)" },

  // Zone C: Backend
  { symbol: "Fa", name: "FastAPI", zone: "Backend", usedFor: "Fraud detection service, Inklusif, Budget Tracker" },
  { symbol: "Ra", name: "REST APIs", zone: "Backend", usedFor: "FastAPI services for the fraud model, Inklusif and the OCR Budget Tracker; Plandora" },
  { symbol: "Mg", name: "MongoDB", zone: "Backend", usedFor: "OCR Budget Tracker, PengYou" },
  { symbol: "My", name: "MySQL", zone: "Backend", usedFor: "Recipe Roots" },
  { symbol: "Sb", name: "Supabase", zone: "Backend", usedFor: "Inklusif" },
  { symbol: "Fb", name: "Firebase Auth", zone: "Backend", usedFor: "OCR Budget Tracker authentication" },
  { symbol: "Lk", name: "LiveKit", zone: "Backend", usedFor: "Inklusif real-time voice and video" },
  { symbol: "Bv", name: "Brevo", zone: "Backend", usedFor: "Inklusif email" },
  { symbol: "Pg", name: "PostgreSQL", zone: "Backend", usedFor: "Mapetite, with PostGIS and pgvector" },
  { symbol: "Dy", name: "Amazon DynamoDB", zone: "Backend", usedFor: "Automated Receipt Processing Tool" },

  // Zone D: ML and data
  { symbol: "Lg", name: "LightGBM", zone: "ML and data", usedFor: "Fraud detection model" },
  { symbol: "Sh", name: "SHAP", zone: "ML and data", usedFor: "Fraud detection explanations" },
  { symbol: "Op", name: "Optuna", zone: "ML and data", usedFor: "Fraud detection hyperparameter tuning" },
  { symbol: "Mc", name: "MaxCompute", zone: "ML and data", usedFor: "Touch 'n Go Digital reporting workflows" },
  { symbol: "Pd", name: "pandas", zone: "ML and data", usedFor: "Fraud detection data pipeline (payments-fraud-detection: requirements.txt, src/fraud/features.py)" },
  { symbol: "Np", name: "NumPy", zone: "ML and data", usedFor: "Fraud detection features and metrics (payments-fraud-detection: requirements.txt, src/fraud/features.py)" },
  { symbol: "Sk", name: "scikit-learn", zone: "ML and data", usedFor: "Fraud detection baselines and PR-AUC metrics (payments-fraud-detection: requirements.txt, src/fraud/train.py, src/fraud/metrics.py)" },
  { symbol: "Mp", name: "Matplotlib", zone: "ML and data", usedFor: "Fraud detection EDA charts (payments-fraud-detection: requirements.txt, src/fraud/eda.py)" },
  { symbol: "Pa", name: "PyArrow", zone: "ML and data", usedFor: "Fraud detection Parquet data (payments-fraud-detection: requirements.txt, src/fraud/features.py)" },
  // (generative AI)
  { symbol: "Cg", name: "ChatGPT", zone: "ML and data", usedFor: "Newsletter and performance snapshot workflows at Touch 'n Go Digital" },
  { symbol: "Gm", name: "Google Gemini", zone: "ML and data", usedFor: "Inklusif, OCR Budget Tracker, Grab Buddy, PengYou and Mapetite search" },
  { symbol: "Ol", name: "Ollama", zone: "ML and data", usedFor: "Grab Buddy (UMHackathon 2025)" },
  { symbol: "Ms", name: "Mistral 7B", zone: "ML and data", usedFor: "Grab Buddy (UMHackathon 2025)" },
  { symbol: "Ls", name: "LangSmith", zone: "ML and data", usedFor: "LLM-as-a-judge pipeline at Plandora" },
  { symbol: "De", name: "DeepEval", zone: "ML and data", usedFor: "LLM-as-a-judge pipeline at Plandora" },
  { symbol: "El", name: "ElevenLabs", zone: "ML and data", usedFor: "Voice output tested in Plandora's AI clone evaluation" },
  { symbol: "Oc", name: "OCI Generative AI", zone: "ML and data", usedFor: "Oracle Generative AI Professional certification" },
  { symbol: "Cv", name: "OpenCV", zone: "ML and data", usedFor: "Image pipelines on jbbru.com (JB 207): the window plate, the bag cut-outs and X-rays, the passport photo" },

  // Zone E: Cloud and DevOps
  { symbol: "Dk", name: "Docker", zone: "Cloud and DevOps", usedFor: "Fraud detection service, Budget Tracker backend, Recipe Roots, Mapetite" },
  { symbol: "Ci", name: "CI/CD", zone: "Cloud and DevOps", usedFor: "Plandora, Inklusif, Mapetite" },
  { symbol: "La", name: "AWS Lambda", zone: "Cloud and DevOps", usedFor: "Automated Receipt Processing Tool" },
  { symbol: "As", name: "Amazon S3", zone: "Cloud and DevOps", usedFor: "Automated Receipt Processing Tool" },
  { symbol: "Tx", name: "Amazon Textract", zone: "Cloud and DevOps", usedFor: "Automated Receipt Processing Tool" },
  { symbol: "Se", name: "Amazon SES", zone: "Cloud and DevOps", usedFor: "Automated Receipt Processing Tool alerts" },
  { symbol: "Gr", name: "Google Cloud Run", zone: "Cloud and DevOps", usedFor: "Inklusif (migrated from Railway)" },
  { symbol: "Rw", name: "Railway", zone: "Cloud and DevOps", usedFor: "Inklusif, before the move to Cloud Run" },
  { symbol: "Ve", name: "Vercel", zone: "Cloud and DevOps", usedFor: "Inklusif, OCR Budget Tracker frontend" },
  { symbol: "Rn", name: "Render", zone: "Cloud and DevOps", usedFor: "OCR Budget Tracker backend" },
  { symbol: "Cf", name: "Cloudflare", zone: "Cloud and DevOps", usedFor: "Coral Coders website; jbbru.com (JB 207) on Cloudflare Workers" },
  { symbol: "Do", name: "Durable Objects", zone: "Cloud and DevOps", usedFor: "The passenger counter on jbbru.com (JB 207)" },
  { symbol: "On", name: "OpenNext", zone: "Cloud and DevOps", usedFor: "Running Next.js on Cloudflare Workers for jbbru.com (JB 207)" },

  // Zone F: Tools and design
  { symbol: "Gt", name: "Git", zone: "Tools and design", usedFor: "Pokémon ASCII" },
  { symbol: "Gh", name: "GitHub", zone: "Tools and design", usedFor: "English Portfolio" },
  { symbol: "Pt", name: "pytest", zone: "Tools and design", usedFor: "Fraud detection test suite" },
  { symbol: "Fg", name: "Figma", zone: "Tools and design", usedFor: "Grab Buddy, Recipe Roots, Smart Vehicle Performance System" },
  { symbol: "Um", name: "UML", zone: "Tools and design", usedFor: "Smart Vehicle Performance System" },
  { symbol: "Sqs", name: "Squarespace", zone: "Tools and design", usedFor: "Asia Arts Festival Malaysia website" },
  { symbol: "Pw", name: "Playwright", zone: "Tools and design", usedFor: "The browser checks of jbbru.com (JB 207) in Chrome, WebKit and Firefox" },
  { symbol: "Ff", name: "FFmpeg", zone: "Tools and design", usedFor: "The cloud video and the fly-through frames on jbbru.com (JB 207)" },
];

export const stack: StackElement[] = elements.map((element) => ({ id: stackId(element.name), ...element }));

export const stackById = new Map(stack.map((element) => [element.id, element]));

