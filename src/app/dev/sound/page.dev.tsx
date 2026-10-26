/*
 * /dev/sound: the owner's listening page for the board and stamp sounds. Development only: the
 * `.dev.tsx` extension is a page only under `next dev` (next.config.ts), so production builds never
 * contain it, and it is kept out of search engines regardless.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import { SoundLab, type Candidate } from "./SoundLab";

export const metadata: Metadata = { title: "Sound candidates (dev)", robots: { index: false, follow: false } };

interface Manifest {
  flaps: Record<string, { title: string; author: string; page: string }>;
  stamps: Record<string, { title: string; author: string; page: string }>;
  licence: string;
}

function manifest(): Manifest | null {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), "assets", "sound", "manifest.json"), "utf8"));
  } catch {
    return null;
  }
}

export default function SoundPage() {
  const m = manifest();
  const list = (group: Manifest["flaps"] | undefined): Candidate[] =>
    Object.entries(group ?? {}).map(([key, s]) => ({ key, title: s.title, author: s.author, page: s.page }));
  return <SoundLab flaps={list(m?.flaps)} stamps={list(m?.stamps)} licence={m?.licence ?? "CC0"} />;
}
