import type { Passport } from "./types";

/*
 * "My journey" as an open, two-page passport (Phase 5d): the data page on the left, the visas (the three
 * stamps from journey.ts) on the right. Clearly playful and not an imitation of a real passport: no crest,
 * no passport number, no date of birth, and a machine-readable zone with nothing that looks like real data.
 */
export const passport: Passport = {
  header: "Passport · Passeport",
  issuer: "JB Air",
  photoAlt: "Passport photo of Joshua Bonham",
  fields: [
    { label: "Surname", labelFr: "Nom", value: "BONHAM" },
    { label: "Given names", labelFr: "Prénoms", value: "JOSHUA" },
    { label: "Nationality", labelFr: "Nationalité", value: "INDIAN OCEAN (MOSTLY)" },
    { label: "Occupation", labelFr: "Profession", value: "SOFTWARE & ML ENGINEER" },
    { label: "Height", labelFr: "Taille", value: "TALL ENOUGH FOR THE OVERHEAD BIN" },
    { label: "Languages", labelFr: "Langues", value: "ENGLISH · FRENCH · AFRIKAANS" },
    { label: "Interests", labelFr: "Intérêts", value: "GYM · MATCHA · VIDEOGRAPHY · SLEEPING · LARPING" },
    { label: "Issued by", labelFr: "Autorité", value: "JB AIR" },
  ],
  // Exactly 44 characters each (check:content checks), A to Z and "<" only.
  mrz: ["P<JBABONHAM<<JOSHUA<<<<<<<<<<<<<<<<<<<<<<<<<", "SOFTWARE<ML<ENGINEER<<INDIAN<OCEAN<<<<<<<<<<"],
  visasLabel: "Visas",
  pageNumbers: { data: "2", visas: "3" },
};
