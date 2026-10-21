/*
 * The built project images (src/content/project-media.json, written by `pnpm projects:build`), as plain
 * <picture> sources: AVIF and WebP srcsets at the built widths, with a tiny blurred placeholder. Server
 * side only: pages pass just what a component shows, so the manifest never reaches the client bundle.
 */
import manifest from "@/content/project-media.json";
import type { Project } from "@/content";

export interface Picture {
  avif: string;
  webp: string;
  /** The smallest WebP, as the <img> fallback src. */
  src: string;
  width: number;
  height: number;
  placeholder: string;
}

interface Built {
  width: number;
  height: number;
  widths: number[];
  placeholder: string;
}

const media = manifest.projects as Record<string, { images: (Built & { n: number })[]; video?: Built }>;

function picture(slug: string, name: string, b: Built): Picture {
  const at = (ext: string) => b.widths.map((w) => `${manifest.base}/${slug}/${name}-${w}.${ext} ${w}w`).join(", ");
  return {
    avif: at("avif"),
    webp: at("webp"),
    src: `${manifest.base}/${slug}/${name}-${b.widths[0]}.webp`,
    width: b.width,
    height: b.height,
    placeholder: b.placeholder,
  };
}

/** A project's screenshots in number order (the first is the main image). */
export function projectPictures(slug: string): Picture[] {
  return (media[slug]?.images ?? []).map((b) => picture(slug, String(b.n), b));
}

/** The video's thumbnail for the click-to-play facade, if built. */
export function videoPicture(slug: string): Picture | null {
  const v = media[slug]?.video;
  return v ? picture(slug, "video", v) : null;
}

/** The main image and its alt text, or null (the poster is shown instead). */
export function mainPicture(project: Project): { picture: Picture; alt: string } | null {
  const first = projectPictures(project.slug)[0];
  return first && project.images[0] ? { picture: first, alt: project.images[0].alt } : null;
}
