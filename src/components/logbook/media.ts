/*
 * The built experience photos (src/content/experience-media.json, from `pnpm experience:build`) as <picture>
 * sources. Server side only. A photo is used only when it is built and described in experience.ts without an
 * open owner question (the build already holds back the others).
 */
import manifest from "@/content/experience-media.json";
import type { ExperienceItem } from "@/content";
import type { Picture } from "@/components/work/media";
import type { Print } from "./PhotoStack";

interface Built {
  n: number;
  width: number;
  height: number;
  widths: number[];
  placeholder: string;
}

const roles = manifest.roles as Record<string, { photos: Built[] }>;
const open = (notes?: string[]) => (notes ?? []).some((n) => /(TODO|CHECK)\(owner\)/.test(n));
// A fixed tilt per photo (never random on each load), within ±3°.
const TILTS = [-2.4, 1.8, -1.2, 2.6, -2.8, 1.1];

export function prints(item: ExperienceItem): Print[] {
  return (roles[item.slug]?.photos ?? []).flatMap((b, k) => {
    const text = item.photos[b.n - 1];
    if (!text?.alt || open(text.notes)) return [];
    const at = (ext: string) => b.widths.map((w) => `${manifest.base}/${item.slug}/${b.n}-${w}.${ext} ${w}w`).join(", ");
    const picture: Picture = {
      avif: at("avif"),
      webp: at("webp"),
      src: `${manifest.base}/${item.slug}/${b.n}-${b.widths[0]}.webp`,
      width: b.width,
      height: b.height,
      placeholder: b.placeholder,
    };
    return [{ picture, alt: text.alt, rotate: TILTS[(k + item.slug.length) % TILTS.length] }];
  });
}
