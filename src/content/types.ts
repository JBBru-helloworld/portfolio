/*
 * Content model. Every component and all metadata read content only from src/content/.
 *
 * Open items are written inline in strings, prefixed TODO(owner) (missing, the owner must
 * supply it) or CHECK(owner) (present but needs the owner's confirmation). The content check
 * script lists them as warnings until launch.
 */

export type LinkKind = "repo" | "live" | "video" | "design" | "case-study" | "other";

export interface Link {
  label: string;
  /** Absolute URL, mailto: link, site path, or a TODO(owner) marker when not yet known. */
  url: string;
  kind: LinkKind;
}

/** Owner notes attached to a record: TODO(owner) or CHECK(owner) items. Never rendered. */
export type OwnerNotes = string[];

/** A month-level date range, written for display ("Apr 2025", "Present"). */
export interface DateRange {
  start: string;
  end?: string;
}

export interface Profile {
  name: string;
  /** Role line options; `roleLines.default` is used unless a surface asks for another. */
  roleLines: {
    default: string;
    pointOfView: string;
    /** For the departures board: capitals, at most 32 characters. */
    board: string;
  };
  bio: string;
  languages: { name: string; level?: string }[];
  notes?: OwnerNotes;
}

export interface SiteLinks {
  github: Link;
  linkedin: Link;
  instagram: Link;
  email: Link;
  resume: Link;
}

/** Board remarks. BOARDING and DEPARTED are also set live (on choosing a row, and after a visit). */
export type DestinationRemark = "BOARDING" | "ON TIME" | "DEPARTED";

export interface DepartureHeader {
  /** "NOW BOARDING" */
  label: string;
  name: string;
  role: string;
}

/** One section of the site: a row on the departures board and an entry in the corner navigation. */
export interface Destination {
  /** Flight code on the flaps, for example "JB 101". */
  flight: string;
  /** Destination on the flaps, in capitals. */
  destination: string;
  /** Gate number (one character). */
  gate: string;
  /** Remark shown before the visitor has been there. */
  remark: DestinationRemark;
  /** The section's element id (its anchor). */
  id: string;
  /** Sentence-case name, for link labels ("Gate 1: My journey") and the section heading. */
  name: string;
}

/** The live security check (fraud demo): the model behind it and its headline result. */
export interface SecurityCheck {
  /** Slug of the project in projects.ts. */
  projectSlug: string;
  headline: string;
  source: string;
}

export interface Departures {
  /** Section heading (the board's title), in capitals. */
  title: string;
  /** Column labels, in capitals. */
  columns: { flight: string; destination: string; gate: string; remarks: string };
  /** The sound toggle: its accessible name, the two words on its flaps, and the one-time hint. */
  sound: { ariaLabel: string; onWord: string; offWord: string; hint: string };
  /** The corner navigation: its accessible name, the gate prefix on its sign ("GATE") and its label on the board. */
  nav: { ariaLabel: string; gate: string; board: string };
  header: DepartureHeader;
}

/** Section-scoped stamp inks from DESIGN.md. */
export type StampInk = "za" | "mu" | "my";

export interface JourneyStamp {
  country: string;
  ink: StampInk;
  years: DateRange;
  /** Short stamp label in capitals, for example "MAURITIUS · 2019". */
  label: string;
  /** One sentence about this chapter. */
  line: string;
  /** The years as shown beside the stamp, for example "2019 to 2023". */
  period: string;
  /** The passport stamp: the airport code, its word and its year (arrival, or departure when no arrival year is known). */
  stamp: {
    port: string;
    word: "ADMITTED" | "ENTRY" | "DEPARTED";
    year: string;
    /** Rotation on the page, in degrees (within ±6). */
    rotate: number;
  };
  notes?: OwnerNotes;
}

/** The "My journey" section's passport page. */
export interface JourneyPage {
  /** The page label, in capitals ("VISAS"). */
  label: string;
}

export interface ExperienceItem {
  slug: string;
  organisation: string;
  role: string;
  dates: DateRange;
  location?: string;
  summary: string;
  highlights: string[];
  stack: string[];
  links: Link[];
  /** For internal work: describe the approach only, never confidential data. */
  confidentiality?: string;
  notes?: OwnerNotes;
}

/** The livery painted on a project's tail-fin emblem; with the letters, no two projects match. */
export type Livery = "stripe" | "chevron" | "dot" | "band" | "twin" | "arc";

/** Each project's small aircraft tail-fin emblem, as if each project were an airline. */
export interface Emblem {
  /** One or two capital letters. */
  letters: string;
  livery: Livery;
}

/** A YouTube video, shown behind a click-to-play facade (youtube-nocookie.com, loaded only on click). */
export interface ProjectVideo {
  id: string;
  /** The playlist it sits in, and its position there, when the owner linked it that way. */
  list?: string;
  index?: number;
}

/** A headline figure, shown large in JetBrains Mono. */
export interface ProjectMetric {
  value: string;
  label: string;
}

/** One screenshot, in file order (`<prefix>-1` first: the strip image and the page header). */
export interface ProjectImage {
  alt: string;
  caption: string;
}

export interface CaseStudy {
  problem: string;
  /** What Joshua did, one point per item. */
  did: string[];
  result: string;
}

export interface Project {
  slug: string;
  /** Flight code: featured JB 201 to 206 in gallery order, then JB 207 onwards (newest first). */
  flight: string;
  /** Featured flights are the six gallery strips; the rest are in All flights. */
  featured: boolean;
  /** The project's name, as shown on the site (the page's h1). */
  name: string;
  /** Short name for the seat sign's flaps, in capitals (at most 15 flap characters). */
  sign: string;
  /** The full descriptive title, for metadata. */
  title: string;
  date: DateRange;
  /** Context such as "Solo capstone project" or "UMHackathon 2025 entry". */
  context?: string;
  /** Joshua's own role, especially on team projects. */
  role: string;
  /** One line. */
  summary: string;
  /** Ids from stack.ts, most characteristic first (All flights shows the first three). */
  stack: string[];
  /** Live site, GitHub, design and other links (the video is in `video`). */
  links: Link[];
  video?: ProjectVideo;
  metrics: ProjectMetric[];
  caseStudy: CaseStudy;
  /** Alt text and captions for the screenshots in assets/projects/, in number order. Empty: a poster. */
  images: ProjectImage[];
  emblem: Emblem;
  notes?: OwnerNotes;
}

/** One box of a project flowchart: its title and an optional small note below it. */
export interface FlowNode {
  title: string;
  note?: string;
}

/**
 * A project flowchart: steps in order, optionally forking into two steps side by side (the pair) and
 * joining again, with an optional outcome (the one amber element) below the last step.
 */
export interface FlowCopy {
  /** The section heading on the project page. */
  heading: string;
  caption: string;
  /** The whole flow in a sentence or two, for screen readers. */
  description: string;
  /** The steps before the pair (or all of them, for a straight flow). At least one. */
  before: FlowNode[];
  pair?: [FlowNode, FlowNode];
  /** The steps after the pair joins. */
  after?: FlowNode[];
  outcome?: string;
}

/** Labels for Selected work and the project pages (src/content/work.ts). */
export interface WorkCopy {
  featuredLabel: string;
  /** Small mono capitals above the manifest. */
  allFlights: string;
  viewFlight: string;
  backToAll: string;
  previous: string;
  next: string;
  headings: {
    stack: string;
    metrics: string;
    caseStudy: string;
    problem: string;
    did: string;
    result: string;
    screenshots: string;
    video: string;
  };
  watchOnYouTube: string;
  playVideo: string;
  enlarge: string;
  close: string;
  credit: { label: string; url: string };
  /** Flowcharts on project pages, by project slug (shown in order). */
  flows: Record<string, FlowCopy[]>;
}

/** The seat map's zones, front to back. Categories, never skill levels. */
export type StackZone = "Languages" | "Frontend" | "Backend" | "ML and data" | "Cloud and DevOps" | "Tools and design";

export interface Zone {
  /** A (nearest the nose) to F. */
  letter: "A" | "B" | "C" | "D" | "E" | "F";
  name: StackZone;
}

export interface StackElement {
  /** Stable id (the name in kebab case): referenced by projects, and the seat's anchor (#seat-<id>). */
  id: string;
  /** One to three characters (Py, Ts, Nx). Unique. */
  symbol: string;
  name: string;
  zone: StackZone;
  /** One line naming the project or role it came from. */
  usedFor: string;
}

/** Labels for the Tech stack section's seat map (src/content/seat-map.ts). */
export interface SeatMapCopy {
  /** Small mono label above the heading. */
  label: string;
  intro: string;
  /** The cabin's accessible name. */
  cabinLabel: string;
  groupBooking: string;
  groupPlaceholder: string;
  /** The dropdown's first option, which clears the booking. */
  groupNone: string;
  /** The dropdown's two groups. */
  groupHeadings: { featured: string; all: string };
  /** "6 seats booked" */
  booked: string;
  clear: string;
  viewFlight: string;
  views: { map: string; list: string };
  legend: { title: string; selected: string; empty: string };
  card: { seat: string; zone: string; usedIn: string; alsoAt: string; close: string; none: string };
  projectCount: { one: string; many: string };
}

export type CredentialKind = "degree" | "academic" | "scholarship" | "certification" | "award" | "community";

export interface Credential {
  kind: CredentialKind;
  title: string;
  issuer?: string;
  date?: string;
  detail?: string;
  notes?: OwnerNotes;
}

export interface Landing {
  /** Accessible description of the window scene (role="img" label). */
  sceneLabel: string;
  /** Small cue under the scene. */
  scrollCue: string;
  /** Visually hidden link (shown on focus) that jumps past the landing sequence. */
  skipIntro: string;

}
