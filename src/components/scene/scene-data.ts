/*
 * Server-side: picks the few values the window scene needs out of the full scene manifest, so the
 * 288-entry manifest never reaches the client bundle. Import only from server components.
 */
import manifest from "@/content/scene-manifest.json";

interface FileEntry {
  path: string;
  kind: string;
  format: string;
  width?: number;
  height?: number;
  mime?: string;
}

interface Glass {
  clipPath: string;
  bbox: { x: number; y: number; width: number; height: number };
  centre: { x: number; y: number };
}

export interface PlateSet {
  /** Plate aspect ratio (width / height). */
  aspect: number;
  width: number;
  height: number;
  avifSrcSet: string;
  webpSrcSet: string;
  fallback: string;
  glass: Glass;
}

export interface VideoSource {
  src: string;
  type: string;
}

export interface SceneData {
  landscape: PlateSet;
  portrait: PlateSet;
  video: { desktop: { av1: VideoSource; h264: VideoSource }; mobile: { av1: VideoSource; h264: VideoSource } };
  poster: string;
  grain: string;
}

const files = (section: { files: FileEntry[] }) => section.files;

function plate(kind: "window-landscape" | "window-portrait", glass: Glass): PlateSet {
  const entries = files(manifest.window).filter((f) => f.kind === kind);
  const byFormat = (fmt: string) =>
    entries.filter((f) => f.format === fmt).sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
  const avif = byFormat("avif");
  const webp = byFormat("webp");
  const largest = webp[webp.length - 1];
  const srcSet = (list: FileEntry[]) => list.map((f) => `${f.path} ${f.width}w`).join(", ");
  return {
    aspect: (largest.width ?? 1) / (largest.height ?? 1),
    width: largest.width ?? 0,
    height: largest.height ?? 0,
    avifSrcSet: srcSet(avif),
    webpSrcSet: srcSet(webp),
    fallback: webp[0].path,
    glass,
  };
}

function video(tier: "desktop" | "mobile") {
  const entries = files(manifest.clouds as { files: FileEntry[] }).filter((f) => f.kind === `clouds-${tier}`);
  const pick = (fmt: string, fallbackType: string): VideoSource => {
    const f = entries.find((e) => e.format === fmt);
    if (!f) throw new Error(`scene manifest: no ${fmt} for ${tier}`);
    return { src: f.path, type: f.mime ?? fallbackType };
  };
  return {
    av1: pick("webm", 'video/webm; codecs="av01.0.08M.08"'),
    h264: pick("mp4", 'video/mp4; codecs="avc1.640032"'),
  };
}

export function getSceneData(): SceneData {
  const glass = manifest.window.glass;
  const posters = files(manifest.clouds as { files: FileEntry[] }).filter((f) => f.kind === "clouds-poster");
  const grain = (manifest as unknown as { grain?: { files: FileEntry[] } }).grain?.files[0]?.path ?? "/scene/grain.webp";
  return {
    landscape: plate("window-landscape", glass.landscape),
    portrait: plate("window-portrait", glass.portrait),
    video: { desktop: video("desktop"), mobile: video("mobile") },
    // WebP poster: universally supported and, for this frame, smaller than the AVIF.
    poster: (posters.find((f) => f.format === "webp") ?? posters[0]).path,
    grain,
  };
}
