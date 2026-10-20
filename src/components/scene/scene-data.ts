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

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Framing {
  aperture: { clipPath: string; bbox: Box };
  glass: { clipPath: string; bbox: Box; centre: { x: number; y: number } };
  frame: Box;
  /** The inner bezel (between the groove and the glass); it sits under the shade. */
  inner: Box;
  shade: { box: Box; open: number; closed: number };
}

/** One framing of the frame plate (landscape or portrait). All geometry is normalised to the plate. */
export interface PlateSet extends Framing {
  /** Plate aspect ratio (width / height). */
  aspect: number;
  width: number;
  height: number;
  avifSrcSet: string;
  webpSrcSet: string;
  fallback: string;
  /** SVG mask (data URI) that is opaque inside the glass only, stretched to the plate. */
  glassMask: string;
}

export interface ImageSet {
  avifSrcSet: string;
  webpSrcSet: string;
  fallback: string;
  width: number;
  height: number;
}

export interface VideoSource {
  src: string;
  type: string;
}

export interface SceneData {
  landscape: PlateSet;
  portrait: PlateSet;
  shade: ImageSet;
  inner: ImageSet;
  video: { desktop: { av1: VideoSource; h264: VideoSource }; mobile: { av1: VideoSource; h264: VideoSource } };
  poster: string;
  grain: string;
}

const files = (section: { files: FileEntry[] }) => section.files;

function imageSet(kind: string): ImageSet {
  const entries = files(manifest.window).filter((f) => f.kind === kind);
  const byFormat = (fmt: string) =>
    entries.filter((f) => f.format === fmt).sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
  const avif = byFormat("avif");
  const webp = byFormat("webp");
  if (!webp.length) throw new Error(`scene manifest: no ${kind} images`);
  const largest = webp[webp.length - 1];
  const srcSet = (list: FileEntry[]) => list.map((f) => `${f.path} ${f.width}w`).join(", ");
  return {
    avifSrcSet: srcSet(avif),
    webpSrcSet: srcSet(webp),
    fallback: webp[0].path,
    width: largest.width ?? 0,
    height: largest.height ?? 0,
  };
}

function plate(kind: "window-landscape" | "window-portrait", framing: Framing): PlateSet {
  const set = imageSet(kind);
  return {
    ...set,
    aspect: set.width / set.height,
    aperture: framing.aperture,
    glass: framing.glass,
    frame: framing.frame,
    inner: framing.inner,
    shade: framing.shade,
    glassMask: glassMask(framing.glass.clipPath),
  };
}

/** A 0..1 SVG (stretched to the plate) that is opaque inside the glass only. */
function glassMask(glassPath: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1" preserveAspectRatio="none">` +
    `<path fill="#000" d="${glassPath}"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
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
  const w = manifest.window;
  const posters = files(manifest.clouds as { files: FileEntry[] }).filter((f) => f.kind === "clouds-poster");
  const grain = (manifest as unknown as { grain?: { files: FileEntry[] } }).grain?.files[0]?.path ?? "/scene/grain.webp";
  return {
    landscape: plate("window-landscape", w.landscape),
    portrait: plate("window-portrait", w.portrait),
    shade: imageSet("window-shade"),
    inner: imageSet("window-inner"),
    video: { desktop: video("desktop"), mobile: video("mobile") },
    // WebP poster: universally supported and, for this frame, smaller than the AVIF.
    poster: (posters.find((f) => f.format === "webp") ?? posters[0]).path,
    grain,
  };
}
