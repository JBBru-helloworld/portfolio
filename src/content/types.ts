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

export type DepartureStatus = "ON TIME" | "ARRIVED" | "LANDED" | "BOARDED" | "CLEARED" | "DEPARTED";

export interface DepartureHeader {
  /** "NOW BOARDING" */
  label: string;
  name: string;
  role: string;
}

export interface DepartureRow {
  /** 2 to 4 characters. */
  code: string;
  /** The fact, in capitals, under about 32 characters. */
  destination: string;
  status: DepartureStatus;
  /** Where the fact comes from, so it can be verified. Never rendered. */
  source: string;
  notes?: OwnerNotes;
}

export interface Departures {
  header: DepartureHeader;
  rows: DepartureRow[];
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
  notes?: OwnerNotes;
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

export type ProjectStatus = "featured" | "also-built" | "archive";

export interface Project {
  slug: string;
  title: string;
  date: DateRange;
  /** Context such as "Capstone", "UMHackathon 2025 entry" or "Client work". */
  context?: string;
  /** Joshua's own role, especially on team projects. */
  role?: string;
  stack: string[];
  links: Link[];
  status: ProjectStatus;
  /** One line. */
  summary: string;
  /** Featured projects only: the angle the case study takes. */
  caseStudyAngle?: string;
  notes?: OwnerNotes;
}

export type StackCategory =
  | "ML and Data"
  | "GenAI"
  | "Languages"
  | "Frontend"
  | "Backend"
  | "Cloud and DevOps"
  | "Tools";

export interface StackElement {
  /** Assigned in category order. */
  number: number;
  /** 1 to 3 letters, first capitalised (periodic-table style). Unique. */
  symbol: string;
  name: string;
  category: StackCategory;
  /** One line naming the project or role it came from. */
  usedFor: string;
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
