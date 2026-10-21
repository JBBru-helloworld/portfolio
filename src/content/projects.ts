import type { Project } from "./types";

/*
 * Every project, in site order: the six featured flights (JB 201 to 206, the gallery's order), then All
 * flights (JB 207 onwards, newest first by end date). Previous and Next flight follow this order and wrap.
 *
 * Case studies are written only from facts already in src/content/ and the owner's answers in the content
 * draft. A field that is still a TODO(owner) or CHECK(owner) is never rendered.
 */
export const projects: Project[] = [
  // ---------- Featured flights ----------
  {
    slug: "fraud-detection",
    flight: "JB 201",
    featured: true,
    name: "Payments fraud detection",
    sign: "FRAUD DETECTION",
    title: "Machine Learning Fraud Detection System",
    date: { start: "Oct 2026" },
    context: "Solo project",
    role: "Full stack",
    summary:
      "Leakage-safe fraud model reaching 0.59 PR-AUC on 590K transactions at a 3.5% fraud rate, with a cost-based threshold and 50 tests.",
    stack: ["python", "lightgbm", "shap", "optuna", "scikit-learn", "pandas", "fastapi", "docker", "pytest"],
    links: [
      { label: "GitHub", url: "https://github.com/JBBru-helloworld/payments-fraud-detection", kind: "repo" },
      { label: "Try the security check", url: "/#security-check", kind: "other" },
    ],
    metrics: [
      { value: "0.59", label: "PR-AUC on the test set" },
      { value: "590K", label: "transactions" },
      { value: "3.5%", label: "fraud rate" },
      { value: "50", label: "tests" },
    ],
    caseStudy: {
      problem:
        "At a 3.5% fraud rate, accuracy misleads: a model that never flags fraud is still right 96.5% of the time.",
      did: [
        "Split the data chronologically, with leakage controls, so the model is only ever tested on later transactions.",
        "Measured with PR-AUC instead of accuracy, and tuned LightGBM with Optuna.",
        "Explained the model's decisions with SHAP.",
        "Chose the decision threshold by cost.",
        "Served the model with FastAPI in Docker, covered by 50 tests.",
      ],
      result:
        "A test PR-AUC of 0.59 on 590,540 transactions from the IEEE-CIS Fraud Detection dataset. The same model powers the live security check on this site.",
    },
    images: [
      { alt: "Title card reading Fraud detection, in white on a red panel", caption: "Title card." },
      {
        alt: "Bar chart of validation PR-AUC by model, with the tuned LightGBM model ahead of the baselines",
        caption: "Validation PR-AUC by model, from the tuned LightGBM down to the baselines.",
      },
      {
        alt: "Line chart of validation cost by decision threshold, with the chosen threshold at the lowest cost",
        caption: "Validation cost by decision threshold; the chosen threshold sits at the lowest cost.",
      },
      {
        alt: "Charts of PR-AUC and fraud rate over time across the training, validation and test periods",
        caption: "PR-AUC and fraud rate over time, across the training, validation and test periods.",
      },
      { alt: "Bar chart of mean SHAP values for the strongest features", caption: "Mean SHAP values for the strongest features." },
    ],
    emblem: { letters: "FD", livery: "stripe" },
  },
  {
    slug: "inklusif",
    flight: "JB 202",
    featured: true,
    name: "Inklusif",
    sign: "INKLUSIF",
    title: "Inklusif: AI-powered inclusive employment platform",
    date: { start: "Sep 2025", end: "Aug 2026" },
    context: "Solo capstone project",
    role: "Built it end to end",
    summary:
      "Employment platform with Gemini resume parsing and job matching, Guardian AI that flags ableist language, and real-time text, voice and video messaging.",
    stack: ["next-js", "fastapi", "google-gemini", "supabase", "livekit", "brevo", "vercel", "google-cloud-run", "railway"],
    links: [
      { label: "Live site", url: "https://inklusif.org", kind: "live" },
      { label: "GitHub", url: "https://github.com/JBBru-helloworld/inklusif", kind: "repo" },
    ],
    metrics: [],
    caseStudy: {
      problem: "On most job platforms, accessibility is a checklist. In Inklusif it is the product.",
      did: [
        "Built resume parsing, offer-letter generation, job matching and translations with Google Gemini.",
        "Built Guardian AI, which flags ableist language in job descriptions.",
        "Added real-time text, voice and video messaging with LiveKit.",
        "Designed to WCAG 2.2 AA.",
        "Migrated the hosting from Railway to Google Cloud Run.",
      ],
      result: "Live at inklusif.org, built solo end to end, and graded A in the university report.",
    },
    images: [
      { alt: "Inklusif home page: Find jobs that truly include you, with a job search bar", caption: "The home page." },
      { alt: "Inklusif sign-in page", caption: "Signing in." },
      {
        alt: "Inklusif employer dashboard with the company inclusion score, active jobs and recent applications",
        caption: "The employer dashboard, with the company inclusion score.",
      },
    ],
    emblem: { letters: "IK", livery: "chevron" },
  },
  {
    slug: "touch-n-go-reporting",
    flight: "JB 203",
    featured: true,
    name: "Touch 'n Go AI reporting workflows",
    sign: "TOUCH 'N GO",
    title: "Touch 'n Go AI reporting workflows",
    date: { start: "Jan 2026", end: "Apr 2026" },
    context: "Data Scientist Intern, Touch 'n Go Digital",
    role: "Data Scientist Intern",
    summary:
      "AI workflows automating commercial newsletters and weekly TPV and revenue snapshots for 30+ stakeholders, saving 7+ hours a week.",
    stack: ["maxcompute", "sql", "chatgpt"],
    links: [],
    metrics: [
      { value: "7+", label: "hours saved a week" },
      { value: "30+", label: "stakeholders" },
    ],
    caseStudy: {
      problem: "Recurring commercial reporting for leadership readers was put together by hand, every week.",
      did: [
        "Took data requests as tickets, wrote MaxCompute SQL to find the data, and reported it back.",
        "Built two ChatGPT workflows, the commercial newsletter and the weekly performance snapshot of TPV and revenue: created the templates, cleaned up the data and engineered the prompts.",
        "Used exploratory data analysis and feature engineering along the way.",
      ],
      result:
        "Both now reach 30+ stakeholders, including the CEO, CFO and CCO, and save 7+ hours of manual reporting a week.",
    },
    images: [
      { alt: "Title slide: AI-Integrated Workflow Automation Systems at Touch 'n Go", caption: "Title slide." },
    ],
    emblem: { letters: "TG", livery: "band" },
    notes: [
      "CHECK(owner): the two charts on this page, split as the owner asked (SQL requests; the ChatGPT workflows). Accurate enough, without showing internal detail?",
    ],
  },
  {
    slug: "pengyou",
    flight: "JB 204",
    featured: true,
    name: "PengYou",
    sign: "PENGYOU",
    title: "PengYou",
    date: { start: "Jun 2024" },
    context: "ImagineHack 2024, 1st Runner-Up and Best Pitch",
    role: "Lead presenter; created the pitch deck",
    summary: "Budgeting web app that uses a virtual-pet reward system to build better financial habits.",
    stack: ["svelte", "mongodb", "google-gemini"],
    links: [
      { label: "Live site", url: "https://pengyou.spimy.dev/", kind: "live" },
      { label: "GitHub", url: "https://github.com/JBBru-helloworld/pengyou", kind: "repo" },
    ],
    metrics: [],
    caseStudy: {
      problem: "ImagineHack 2024's problem statement: create a finance-based website.",
      did: ["Was the lead presenter for the team's pitch at ImagineHack 2024.", "Created the pitch slide deck."],
      result: "1st Runner-Up and Best Pitch at ImagineHack 2024.",
    },
    images: [
      { alt: "PengYou home page: your best friend for all things budgeting, with the pet mascot", caption: "The home page." },
      { alt: "PengYou sign-up screen with the pet mascot", caption: "Signing up." },
    ],
    emblem: { letters: "PY", livery: "dot" },
  },
  {
    slug: "mapetite",
    flight: "JB 205",
    featured: true,
    name: "Mapetite",
    sign: "MAPETITE",
    title: "Mapetite",
    date: { start: "May 2026", end: "Aug 2026" },
    context: "Code Camp assignment, group project",
    role: "Lead mobile app designer and integration engineer",
    summary:
      "Mobile app connecting people with nearby merchants through routine matching, location-based discovery and Gemini-powered semantic search.",
    stack: ["flutter", "dart", "postgresql", "google-gemini", "docker"],
    links: [{ label: "GitHub", url: "https://github.com/Spimy/mapetite", kind: "repo" }],
    video: { id: "rTA-m0tBtz0", list: "PLzMKtbh9mp9Dry3d248OlkvlP-zvM33WE", index: 16 },
    metrics: [],
    caseStudy: {
      problem: "The brief: build a smart-city website.",
      did: [
        "Led the mobile app's design.",
        "Worked as the team's integration engineer, on a Flutter and Riverpod app over PostgreSQL with PostGIS and pgvector.",
      ],
      result: "Graded A* in the university report.",
    },
    images: [
      { alt: "A hand holding a phone showing Mapetite's Discover food near you screen", caption: "Discover food near you." },
      {
        alt: "Three Mapetite screens: onboarding, a recommended restaurant and the map",
        caption: "Onboarding, a recommendation and the map.",
      },
      {
        alt: "Three Mapetite screens: nearby grocery stores, recipes to cook in and the budget",
        caption: "Grocery stores nearby, cooking in, and the budget.",
      },
    ],
    emblem: { letters: "MP", livery: "twin" },
  },
  {
    slug: "coral-coders-website",
    flight: "JB 206",
    featured: true,
    name: "Coral Coders",
    sign: "CORAL CODERS",
    title: "Coral Coders website",
    date: { start: "Oct 2026" },
    context: "My own business",
    role: "Founder and lead tutor; built the website",
    summary: "SEO-focused, accessible website for Coral Coders, with a particle coral hero.",
    stack: ["next-js", "cloudflare"],
    links: [
      { label: "Live site", url: "https://coralcoders.com", kind: "live" },
      { label: "GitHub", url: "https://github.com/JBBru-helloworld/coralcoders", kind: "repo" },
    ],
    metrics: [],
    caseStudy: {
      problem:
        "Coral Coders, my online one-to-one coding lessons for children and adults, where I'm the founder and lead tutor, needed a website.",
      did: [
        "Built the site with Next.js on Cloudflare.",
        "Made it SEO-focused and accessible.",
        "Gave it a particle coral hero.",
      ],
      result: "Live at coralcoders.com.",
    },
    images: [
      {
        alt: "Coral Coders home page: Coding lessons for curious minds, beside the particle coral",
        caption: "The home page and its particle coral.",
      },
      { alt: "Coral Coders courses: Python, SQL and AI lessons", caption: "The courses." },
      { alt: "Coral Coders booking section: Book your free lesson, above the footer", caption: "Booking a free lesson." },
    ],
    emblem: { letters: "CC", livery: "arc" },
  },

  // ---------- All flights (newest first) ----------
  {
    slug: "plandora-llm-judge",
    flight: "JB 207",
    featured: false,
    name: "Plandora LLM-as-a-judge pipeline",
    sign: "PLANDORA",
    title: "Plandora LLM-as-a-judge pipeline",
    date: { start: "Oct 2025", end: "Jan 2026" },
    context: "Junior Software Engineer, Plandora",
    role: "Junior Software Engineer",
    summary: "Pipeline benchmarking AI chat outputs and token limits using an LLM as the judge.",
    stack: ["deepeval", "langsmith", "python", "typescript"],
    links: [{ label: "Plandora", url: "https://plandora.com/", kind: "live" }],
    metrics: [{ value: "4+", label: "accuracy and safety issues flagged" }],
    caseStudy: {
      problem:
        "Plandora's AI clones give travel recommendations, so their answers had to be accurate, safe and realistic.",
      did: [
        "Built an LLM-as-a-judge pipeline benchmarking AI chat outputs and token limits, with LangSmith and DeepEval.",
        "Wrote the evaluation tests in Python and TypeScript.",
      ],
      result: "Helped flag 4+ issues in the AI outputs' accuracy and safety.",
    },
    images: [],
    emblem: { letters: "PL", livery: "stripe" },
  },
  {
    slug: "budget-tracker",
    flight: "JB 208",
    featured: false,
    name: "OCR Budget Tracker",
    sign: "BUDGET TRACKER",
    title: "OCR Budget Tracker",
    date: { start: "Apr 2025", end: "Sep 2025" },
    context: "Solo project",
    role: "Full stack",
    summary:
      "Budgeting app with AI receipt OCR that cuts manual entry by 80%, a containerised FastAPI backend and CSRF protection.",
    stack: [
      "react",
      "fastapi",
      "google-gemini",
      "python",
      "mongodb",
      "firebase-auth",
      "docker",
      "vite",
      "tailwind-css",
      "vercel",
      "render",
    ],
    links: [
      { label: "Live site", url: "https://budget-tracker.jbbru.com/", kind: "live" },
      { label: "GitHub", url: "https://github.com/JBBru-helloworld/Budget-Tracker", kind: "repo" },
    ],
    metrics: [
      { value: "80%", label: "less manual entry" },
      { value: ">97%", label: "OCR extraction accuracy" },
    ],
    caseStudy: {
      problem: "Turning a receipt into itemised, shareable expenses usually means typing it in by hand.",
      did: [
        "Read receipts with Google Gemini OCR, from a photo to itemised expenses.",
        "Built a FastAPI and MongoDB backend in Docker.",
        "Added Firebase Auth and CSRF protection.",
        "Deployed the React frontend on Vercel and the backend on Render.",
      ],
      result: "Manual entry cut by 80%, with over 97% OCR extraction accuracy.",
    },
    images: [
      {
        alt: "Budget Tracker dashboard with the monthly budget, total spent, recent transactions and quick actions",
        caption: "The dashboard.",
      },
    ],
    emblem: { letters: "BT", livery: "chevron" },
  },
  {
    slug: "harvest-for-all",
    flight: "JB 209",
    featured: false,
    name: "Harvest For All",
    sign: "HARVEST FOR ALL",
    title: "Harvest For All",
    date: { start: "Jun 2025", end: "Aug 2025" },
    context: "Solo project",
    role: "Full stack",
    summary: "Object-oriented 2D pixel-art farming simulator in Scala, with trading, resource management and save files.",
    stack: ["scala", "scalafx"],
    links: [{ label: "GitHub", url: "https://github.com/JBBru-helloworld/Harvest-For-All", kind: "repo" }],
    video: { id: "HfdJD3vehZk" },
    metrics: [],
    caseStudy: {
      problem: "The brief: build an object-oriented system that supports Sustainable Development Goal 2 (SDG 2), Zero Hunger.",
      did: [
        "Built an object-oriented 2D pixel-art farming simulator in Scala with ScalaFX.",
        "Added trading, resource management and save files.",
      ],
      result: "Graded A in the university report.",
    },
    images: [{ alt: "Harvest For All title card beside a screenshot of the pixel-art farm", caption: "Title card and the farm." }],
    emblem: { letters: "HF", livery: "band" },
  },
  {
    slug: "aws-receipt-processing",
    flight: "JB 210",
    featured: false,
    name: "Automated Receipt Processing Tool",
    sign: "RECEIPT TOOL",
    title: "Automated Receipt Processing Tool",
    date: { start: "May 2025" },
    context: "Solo project, built entirely in AWS; no public repo",
    role: "Full stack",
    summary:
      "Serverless AWS pipeline that runs OCR on receipts with Amazon Textract (>95% extraction accuracy), stores the results in DynamoDB and sends alerts with SES.",
    stack: ["amazon-textract", "aws-lambda", "amazon-dynamodb", "amazon-s3", "amazon-ses", "python"],
    links: [],
    metrics: [{ value: ">95%", label: "extraction accuracy (Amazon Textract)" }],
    caseStudy: {
      problem: "I got tired of reading receipts by hand, so I built a tool to do it for me.",
      did: [
        "Built a serverless pipeline on AWS Lambda and Amazon S3 that runs OCR on receipts with Amazon Textract.",
        "Stored the results in Amazon DynamoDB.",
        "Sent alerts with Amazon SES.",
      ],
      result: "Over 95% extraction accuracy from Amazon Textract.",
    },
    images: [
      {
        alt: "Architecture diagram of a receipt processing pipeline on AWS, from document capture to extraction, verification and storage",
        caption: "The pipeline's architecture.",
      },
    ],
    emblem: { letters: "AR", livery: "dot" },
  },
  {
    slug: "grab-buddy",
    flight: "JB 211",
    featured: false,
    name: "Grab Buddy",
    sign: "GRAB BUDDY",
    title: "Grab Buddy",
    date: { start: "Apr 2025" },
    context: "UMHackathon 2025 entry",
    role: "UI Designer",
    summary: "AI assistant giving Grab merchants plain-language business insights, built for Grab's UMHackathon 2025 challenge.",
    stack: ["figma", "python", "google-gemini", "ollama", "mistral-7b"],
    links: [
      { label: "GitHub", url: "https://github.com/Spimy/UMHackathon", kind: "repo" },
      { label: "Figma", url: "https://www.figma.com/file/1NRKS2Fl2SR0sYbWPWOrhZ/UM-Hackathon", kind: "design" },
    ],
    metrics: [],
    caseStudy: {
      problem: "Grab's UMHackathon 2025 challenge: giving merchants business insights in plain language.",
      did: ["Designed the interface in Figma, as the team's UI designer."],
      result: "TODO(owner): anything you are happy to publish about how the entry was received (it did not win).",
    },
    images: [
      {
        alt: "Grab Buddy merchant dashboard: orders, sales, top merchants, traffic by location and competitor analysis",
        caption: "The merchant dashboard.",
      },
    ],
    emblem: { letters: "GB", livery: "twin" },
  },
  {
    slug: "smart-vehicle-performance-system",
    flight: "JB 212",
    featured: false,
    name: "Smart Vehicle Performance System",
    sign: "SMART VEHICLE",
    title: "Smart Vehicle Performance System",
    date: { start: "Feb 2025", end: "Mar 2025" },
    context: "Solo project",
    role: "Full stack",
    summary: "Mobile app and in-car display design, with UML models for the planning and design phases.",
    stack: ["figma", "uml"],
    links: [{ label: "Figma", url: "https://www.figma.com/file/kaT8ldYAIE1rBzJD4nQuwn/SVPS", kind: "design" }],
    metrics: [],
    caseStudy: {
      problem: "A smart vehicle system needed its interface designed.",
      did: ["Designed a mobile app and an in-car display in Figma.", "Modelled the planning and design phases in UML."],
      result: "Graded A* in the university report.",
    },
    images: [
      {
        alt: "Smart Vehicle Performance System app screen: Drive smarter, perform better, above a silver sports car",
        caption: "The app's opening screen.",
      },
      {
        alt: "In-car display dashboard: speedometer, gear, a navigation prompt, distance, energy use and average speed",
        caption: "The driving dashboard on the in-car display.",
      },
      {
        alt: "In-car display tyre view: a top-down car with the pressure of each wheel",
        caption: "Tyre pressures for each wheel.",
      },
      {
        alt: "In-car display map with a route from the current location and a Hit the road button",
        caption: "Navigation.",
      },
      {
        alt: "In-car display analytics: charts of performance over time and battery usage by month",
        caption: "Analytics: performance and battery usage over time.",
      },
      {
        alt: "In-car display alerts: a weather warning and a puncture warning, each with a support option",
        caption: "Alerts and recommendations.",
      },
    ],
    emblem: { letters: "SV", livery: "arc" },
  },
  {
    slug: "recipe-roots",
    flight: "JB 213",
    featured: false,
    name: "Recipe Roots",
    sign: "RECIPE ROOTS",
    title: "Recipe Roots",
    date: { start: "Nov 2024", end: "Dec 2024" },
    context: "Group project",
    role: "User research and UI design",
    summary: "Recipe-sharing web app on the theme of SDG 2, Zero Hunger, working almost entirely without JavaScript.",
    stack: ["php", "mysql", "docker", "figma"],
    links: [
      { label: "Live site", url: "https://recipe-roots.spimy.dev/", kind: "live" },
      { label: "GitHub", url: "https://github.com/Spimy/recipe-roots", kind: "repo" },
    ],
    metrics: [],
    caseStudy: {
      problem: "A recipe-sharing web app on the theme of SDG 2, Zero Hunger.",
      did: ["Did the user research and the UI design."],
      result: "Graded A* in the university report.",
    },
    images: [{ alt: "Recipe Roots home page: Your kitchen assistant, with a plated dish", caption: "The home page." }],
    emblem: { letters: "RR", livery: "stripe" },
    notes: [
      "CHECK(owner): the collaborator has two repos, recipe-roots and recipe-roots-dockerised. The link uses recipe-roots; which one should it be?",
    ],
  },
  {
    slug: "eventsphere",
    flight: "JB 214",
    featured: false,
    name: "EventSphere",
    sign: "EVENTSPHERE",
    title: "EventSphere",
    date: { start: "Jul 2024" },
    context: "Group project",
    role: "Content and data research",
    summary: "Front-end concept for booking event venues and planners, with simulated sign-in via the Web Crypto API.",
    stack: ["html", "css", "javascript", "figma"],
    links: [{ label: "GitHub", url: "https://github.com/Spimy/eventsphere", kind: "repo" }],
    video: { id: "HNwihPiRfdE", list: "PLzMKtbh9mp9Dry3d248OlkvlP-zvM33WE", index: 4 },
    metrics: [],
    caseStudy: {
      problem: "A marketplace for finding event organisers and planning the logistics of events.",
      did: ["Did the content and data research."],
      result: "Graded A in the university report.",
    },
    images: [{ alt: "EventSphere home page with its venue search form", caption: "The home page." }],
    emblem: { letters: "ES", livery: "chevron" },
  },
  {
    slug: "pokemon-ascii",
    flight: "JB 215",
    featured: false,
    name: "Pokémon ASCII",
    sign: "POKEMON ASCII",
    title: "Pokémon ASCII",
    date: { start: "Jun 2024", end: "Jul 2024" },
    context: "Group project",
    role: "Wrote the game's start and some of its mechanics",
    summary: "Command-line game inspired by Pokémon, with WASD movement and quick-time-event battles.",
    stack: ["java", "git"],
    links: [{ label: "GitHub", url: "https://github.com/Spimy/pokemon-ascii", kind: "repo" }],
    video: { id: "WbBMcOmI7pU", list: "PLzMKtbh9mp9Dry3d248OlkvlP-zvM33WE", index: 3 },
    metrics: [],
    caseStudy: {
      problem: "The brief: make a game that runs in the terminal.",
      did: ["Wrote the start of the game and some of its mechanics."],
      result: "Graded A in the university report.",
    },
    images: [{ alt: "Pokémon ASCII title screen in a terminal, with its controls", caption: "The title screen." }],
    emblem: { letters: "PA", livery: "band" },
  },
  {
    slug: "asia-arts-festival",
    flight: "JB 216",
    featured: false,
    name: "Asia Arts Festival Malaysia 2024",
    sign: "ASIA ARTS FEST",
    title: "Asia Arts Festival Malaysia 2024",
    date: { start: "Apr 2024", end: "Jul 2024" },
    context: "Client work",
    role: "Designed, built and maintained the site",
    summary:
      "The festival's first website, designed, built and maintained for the client: 700+ event registrations and 25% faster load times.",
    stack: ["squarespace", "css"],
    links: [{ label: "Live site", url: "https://www.myasiaartsfestival.com/", kind: "live" }],
    metrics: [
      { value: "700+", label: "event registrations" },
      { value: "25%", label: "faster load times" },
    ],
    caseStudy: {
      problem: "The festival needed its first website.",
      did: ["Designed, built and maintained the site for the client, on Squarespace with CSS."],
      result: "700+ event registrations and 25% faster load times.",
    },
    images: [{ alt: "Asia Arts Festival Malaysia home page, beside a photo of a performer at the piano", caption: "The home page." }],
    emblem: { letters: "AF", livery: "dot" },
  },
  {
    slug: "english-portfolio",
    flight: "JB 217",
    featured: false,
    name: "English Portfolio",
    sign: "ENG PORTFOLIO",
    title: "English Portfolio",
    date: { start: "Sep 2023", end: "Dec 2023" },
    context: "Team coursework",
    role: "UI design support, and author of my own written portfolio within it",
    summary: "Research portfolio on online gambling, built from scratch for full control over the design.",
    stack: ["figma", "mongodb", "github"],
    links: [
      { label: "Live site", url: "https://eng1044.spimy.dev/", kind: "live" },
      { label: "GitHub", url: "https://github.com/Spimy/english_research_paper_portfolio", kind: "repo" },
    ],
    video: { id: "vYpOvoLaCM4", list: "PLzMKtbh9mp9Dry3d248OlkvlP-zvM33WE", index: 1 },
    metrics: [],
    caseStudy: {
      problem: "A research portfolio on online gambling, built from scratch for full control over the design.",
      did: ["Supported the UI design.", "Wrote my own portfolio within it."],
      result: "Graded A in the university report.",
    },
    images: [
      {
        alt: "Title page: International governments should sanction online gambling amongst the youth, over poker chips",
        caption: "The title page (teammates' names blurred).",
      },
    ],
    emblem: { letters: "EP", livery: "arc" },
  },
];

/** A project's position in site order, for Previous and Next flight (wrapping around). */
export function neighbours(slug: string): { previous: Project; next: Project } {
  const i = projects.findIndex((p) => p.slug === slug);
  const n = projects.length;
  return { previous: projects[(i - 1 + n) % n], next: projects[(i + 1) % n] };
}
