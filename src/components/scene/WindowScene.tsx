"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { SceneData, PlateSet } from "./scene-data";
import styles from "./WindowScene.module.css";

type Phase = "closed" | "lifting" | "open";

interface Props {
  data: SceneData;
  name: string;
  role: string;
  sceneLabel: string;
  scrollCue: string;
}

const INTRO_CAP_MS = 2500; // never wait longer than this for the plate and video
const INTRO_PAUSE_MS = 300; // beat between "ready" and the shade moving
const LIFT_MS = 1600; // shade travel; matches --duration in the CSS module
const SMALL_SCREEN = "(max-width: 767px), (max-height: 500px), (max-aspect-ratio: 1/1)";

const pct = (n: number) => `${(n * 100).toFixed(4)}%`;

/** Glass geometry and plate aspect as CSS custom properties, one set per orientation. */
function geometryVars(prefix: "l" | "p", p: PlateSet): Record<string, string> {
  const g = p.glass;
  return {
    [`--${prefix}-aspect`]: p.aspect.toFixed(6),
    [`--${prefix}-gx`]: pct(g.bbox.x),
    [`--${prefix}-gy`]: pct(g.bbox.y),
    [`--${prefix}-gw`]: pct(g.bbox.width),
    [`--${prefix}-gh`]: pct(g.bbox.height),
    [`--${prefix}-cx`]: pct(g.centre.x),
    [`--${prefix}-cy`]: pct(g.centre.y),
  };
}

function isConstrainedNetwork(): boolean {
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (!conn) return false;
  return Boolean(conn.saveData) || ["slow-2g", "2g", "3g"].includes(conn.effectiveType ?? "");
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function decodeImage(img: HTMLImageElement | null) {
  if (!img) return;
  try {
    await img.decode();
  } catch {
    // A failed decode must not block the intro; the cap below still applies.
  }
}

function canPlay(video: HTMLVideoElement) {
  return new Promise<void>((resolve) => {
    if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) return resolve();
    video.addEventListener("canplay", () => resolve(), { once: true });
  });
}

export function WindowScene({ data, name, role, sceneLabel, scrollCue }: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [phase, setPhase] = useState<Phase>("closed");
  const videoActive = useRef(false); // true once the intro has started the video
  const inView = useRef(true);

  // Intro: decode the plate, then start loading the video, then lift the shade.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      // Shade already open (CSS), poster only, light at full strength.
      setPhase("open");
      return;
    }

    const lite = isConstrainedNetwork();
    const tier = window.matchMedia(SMALL_SCREEN).matches ? data.video.mobile : data.video.desktop;
    const source = video.canPlayType(tier.av1.type) ? tier.av1 : tier.h264;
    video.dataset.source = lite ? "poster-only" : source.src;

    const ready = (async () => {
      await decodeImage(imgRef.current);
      if (lite || cancelled) return;
      // The video only starts loading once the plate has decoded, so it can never delay it.
      video.preload = "auto";
      video.src = source.src;
      video.load();
      await canPlay(video);
    })();

    (async () => {
      await Promise.race([ready, wait(INTRO_CAP_MS)]);
      if (cancelled) return;
      await wait(INTRO_PAUSE_MS);
      if (cancelled) return;
      // Start the clouds just before the shade moves; if the video is not ready by now, keep the poster.
      if (!lite && video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
        videoActive.current = true;
        await video.play().catch(() => {
          videoActive.current = false;
        });
      } else if (!lite) {
        video.removeAttribute("src");
        video.load();
        video.dataset.source = "poster-fallback";
      }
      requestAnimationFrame(() => {
        if (!cancelled) setPhase("lifting");
      });
      await wait(LIFT_MS);
      if (!cancelled) setPhase("open");
    })();

    return () => {
      cancelled = true;
    };
  }, [data]);

  // Pause the video and the grain when the scene is off screen or the tab is hidden.
  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    if (!section || !video) return;

    const sync = () => {
      const active = inView.current && document.visibilityState === "visible";
      section.dataset.inview = active ? "true" : "false";
      if (!videoActive.current) return;
      if (active && video.paused) video.play().catch(() => {});
      if (!active && !video.paused) video.pause();
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        inView.current = entry.isIntersecting;
        sync();
      },
      { threshold: 0 },
    );
    io.observe(section);
    document.addEventListener("visibilitychange", sync);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  const style = {
    ...geometryVars("l", data.landscape),
    ...geometryVars("p", data.portrait),
    "--grain": `url(${data.grain})`,
  } as CSSProperties;

  return (
    <section ref={sectionRef} className={styles.scene} data-phase={phase} data-inview="true" style={style}>
      <svg className={styles.defs} aria-hidden="true" focusable="false">
        <defs>
          <clipPath id="glass-clip-landscape" clipPathUnits="objectBoundingBox">
            <path d={data.landscape.glass.clipPath} />
          </clipPath>
          <clipPath id="glass-clip-portrait" clipPathUnits="objectBoundingBox">
            <path d={data.portrait.glass.clipPath} />
          </clipPath>
        </defs>
      </svg>

      <div className={styles.stage} role="img" aria-label={sceneLabel}>
        {/* 1-3: the view, the glass and the shade, all clipped to the glass shape */}
        <div className={styles.view} aria-hidden="true">
          <video
            ref={videoRef}
            className={styles.video}
            poster={data.poster}
            muted
            loop
            playsInline
            preload="metadata"
            disablePictureInPicture
            disableRemotePlayback
            tabIndex={-1}
            aria-hidden="true"
          />
          <div className={styles.glass} />
          <div className={styles.shade}>
            <div className={styles.lip} />
          </div>
        </div>

        {/* 4: the window and wall plate; the browser picks the orientation by aspect ratio */}
        <picture>
          <source
            media="(max-aspect-ratio: 1/1)"
            type="image/avif"
            srcSet={data.portrait.avifSrcSet}
            sizes="100vw"
            width={data.portrait.width}
            height={data.portrait.height}
          />
          <source
            media="(max-aspect-ratio: 1/1)"
            type="image/webp"
            srcSet={data.portrait.webpSrcSet}
            sizes="100vw"
            width={data.portrait.width}
            height={data.portrait.height}
          />
          <source type="image/avif" srcSet={data.landscape.avifSrcSet} sizes="max(100vw, 177.97svh)" />
          <source type="image/webp" srcSet={data.landscape.webpSrcSet} sizes="max(100vw, 177.97svh)" />
          <img
            ref={imgRef}
            className={styles.plate}
            src={data.landscape.fallback}
            width={data.landscape.width}
            height={data.landscape.height}
            alt=""
            fetchPriority="high"
            decoding="async"
            draggable={false}
          />
        </picture>

        {/* 5: window light on the wall; rises as the shade opens, then stays still */}
        <div className={styles.light} aria-hidden="true" />
        {/* Portrait only: soft fades into --void above and below the plate */}
        <div className={styles.fadeTop} aria-hidden="true" />
        <div className={styles.fadeBottom} aria-hidden="true" />
      </div>

      {/* 7 and 6: vignette and grain over the whole scene */}
      <div className={styles.vignette} aria-hidden="true" />
      <div className={styles.grainWrap} aria-hidden="true">
        <div className={styles.grain} />
      </div>

      <p className={`${styles.wordmark} text-sm font-medium tracking-[0.01em] text-paper-muted`}>{name}</p>
      <div className={styles.title}>
        <h1 className={`${styles.h1} text-2xl font-medium text-paper`}>{name}</h1>
        <p className={`${styles.role} text-base text-pretty text-paper-muted`}>{role}</p>
      </div>
      <div className={styles.cue} aria-hidden="true">
        <span className="font-mono text-xs uppercase tracking-[0.18em] text-graphite-4">{scrollCue}</span>
        <span className={styles.cueTrack}>
          <span className={styles.cueLine} />
        </span>
      </div>
    </section>
  );
}
