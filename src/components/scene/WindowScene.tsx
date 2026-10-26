"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { pendingRestore } from "@/components/nav/site-state";
import { PORTRAIT_MEDIA, REDUCED_MOTION, SMALL_SCREEN, isConstrainedNetwork } from "./media";
import type { SceneData, PlateSet } from "./scene-data";
import { useScrollSequence } from "./useScrollSequence";
import { BackToWindow } from "@/components/footer/BackToWindow";
import { JbLogo } from "@/components/brand/JbLogo";
import type { FlightDeck as FlightDeckContent } from "@/content";
import { FlightDeck } from "./FlightDeck";
import { PassengerNumber } from "./PassengerNumber";
import styles from "./WindowScene.module.css";

type Phase = "closed" | "lifting" | "open";

interface Props {
  data: SceneData;
  name: string;
  role: string;
  sceneLabel: string;
  scrollCue: string;
  /** The flight-deck block and the passenger number (Phase 5d). */
  flightDeck: FlightDeckContent;
  passenger: { label: string; srTemplate: string };
}

const INTRO_CAP_MS = 2500; // never wait longer than this for the plate and video
const INTRO_PAUSE_MS = 300; // beat between "ready" and the shade moving
const LIFT_MS = 1600; // shade travel; matches --duration in the CSS module
// Frame height as a share of the viewport height. Mirrors --window-scale-* in the CSS module (the CSS
// variables are the source of truth); used here only to tell the browser which image width to fetch.
const WINDOW_SCALE = { landscape: 0.65, portrait: 0.575 };

/** The closed-shade darkness, inline so it covers the screen even before the stylesheet applies. */
const DARK_COVER: CSSProperties = { position: "absolute", inset: 0, background: "#0a0a0a", opacity: 1 };

const pct = (n: number) => `${(n * 100).toFixed(4)}%`;
const num = (n: number) => n.toFixed(6);

/** Glass, frame and shade geometry and plate aspect as CSS custom properties, one set per orientation. */
function geometryVars(prefix: "l" | "p", p: PlateSet): Record<string, string> {
  const g = p.glass;
  const s = p.shade.box;
  const i = p.inner;
  return {
    [`--${prefix}-aspect`]: num(p.aspect),
    [`--${prefix}-gx`]: pct(g.bbox.x),
    [`--${prefix}-gy`]: pct(g.bbox.y),
    [`--${prefix}-gw`]: pct(g.bbox.width),
    [`--${prefix}-gh`]: pct(g.bbox.height),
    [`--${prefix}-cx`]: pct(g.centre.x),
    [`--${prefix}-cy`]: pct(g.centre.y),
    [`--${prefix}-fx-n`]: num(p.frame.x),
    [`--${prefix}-fy-n`]: num(p.frame.y),
    [`--${prefix}-fw-n`]: num(p.frame.width),
    [`--${prefix}-fh-n`]: num(p.frame.height),
    [`--${prefix}-sx`]: pct(s.x),
    [`--${prefix}-sy`]: pct(s.y),
    [`--${prefix}-sw`]: pct(s.width),
    [`--${prefix}-sh`]: pct(s.height),
    [`--${prefix}-ix`]: pct(i.x),
    [`--${prefix}-iy`]: pct(i.y),
    [`--${prefix}-iw`]: pct(i.width),
    [`--${prefix}-ih`]: pct(i.height),
    [`--${prefix}-shade-closed`]: num(p.shade.closed - p.shade.open),
    [`--${prefix}-glass-mask`]: p.glassMask,
  };
}

/** Displayed width of an image that spans `share` of the plate width, in svh at the default scale. */
function sizesFor(p: PlateSet, scale: number, share = 1) {
  return `${((scale / p.frame.height) * p.aspect * share * 100).toFixed(1)}svh`;
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

export function WindowScene({ data, name, role, sceneLabel, scrollCue, flightDeck, passenger }: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const lightRef = useRef<HTMLDivElement>(null);
  const vignetteRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const whiteRef = useRef<HTMLDivElement>(null);
  const fadeRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("closed");
  // The view (video and poster) stays hidden until the frame plate has decoded, so nothing inside the
  // window is ever seen without the frame around it.
  const [viewReady, setViewReady] = useState(false);
  const videoActive = useRef(false); // true once the intro has started the video
  const videoHeld = useRef(false); // true while the fly-through has taken over from the video
  const introSkipped = useRef(false);
  const inView = useRef(true);

  // The visitor scrolled before the intro finished (or reloaded mid-sequence): open the shade now.
  const openNow = useCallback(() => {
    introSkipped.current = true;
    setPhase("open");
  }, []);

  const refs = useMemo(
    () => ({
      section: sectionRef,
      camera: cameraRef,
      video: videoRef,
      plate: imgRef,
      light: lightRef,
      vignette: vignetteRef,
      hud: hudRef,
      canvas: canvasRef,
      white: whiteRef,
      fade: fadeRef,
    }),
    [],
  );
  // Loads the cloud video and starts it (unless the fly-through holds it). Returns once it can play.
  const startVideo = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.getAttribute("src")) return;
    const tier = window.matchMedia(SMALL_SCREEN).matches ? data.video.mobile : data.video.desktop;
    const source = video.canPlayType(tier.av1.type) ? tier.av1 : tier.h264;
    video.dataset.source = source.src;
    video.preload = "auto";
    video.src = source.src;
    video.load();
    await canPlay(video);
  }, [data]);

  // After a restore to a later section, the video loads only once the visitor scrolls back up.
  const wakeVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video || isConstrainedNetwork() || window.matchMedia(REDUCED_MOTION).matches) return;
    void startVideo().then(() => {
      videoActive.current = true;
      if (!videoHeld.current && inView.current) video.play().catch(() => (videoActive.current = false));
    });
  }, [startVideo]);

  useScrollSequence(refs, data, { open: phase === "open", openNow, videoActive, videoHeld, wakeVideo });

  // Intro: decode the plate, then start loading the video, then lift the shade.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;

    const reduce = window.matchMedia(REDUCED_MOTION).matches;
    // Restored to the board or a later section: the shade is already open and nothing plays (the scene
    // is covered); the video waits for the visitor to scroll back up (wakeVideo).
    if (reduce || pendingRestore() !== null) {
      // Shade open (CSS), poster only, light at full strength; the view appears with the decoded frame.
      // Set here, not at render: the server HTML (and the first client render) must be the closed shade,
      // and whether to open at once is known only in the browser (reduced motion, or a restore).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhase("open");
      decodeImage(imgRef.current).then(() => !cancelled && setViewReady(true));
      return () => {
        cancelled = true;
      };
    }

    const lite = isConstrainedNetwork();
    if (lite) video.dataset.source = "poster-only";

    const ready = (async () => {
      await decodeImage(imgRef.current);
      if (!cancelled) setViewReady(true);
      if (lite || cancelled) return;
      // The video only starts loading once the plate has decoded, so it can never delay it.
      await startVideo();
    })();

    (async () => {
      await Promise.race([ready, wait(INTRO_CAP_MS)]);
      if (cancelled) return;
      await wait(INTRO_PAUSE_MS);
      if (cancelled) return;
      // Start the clouds just before the shade moves; if the video is not ready by now, keep the poster.
      if (!lite && video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
        videoActive.current = true;
        if (!videoHeld.current) {
          // Never let a pending play() hold the shade (Phase 6): the lift goes ahead after 800 ms at most.
          await Promise.race([
            video.play().catch(() => {
              videoActive.current = false;
            }),
            wait(800),
          ]);
        }
      } else if (!lite) {
        video.removeAttribute("src");
        video.load();
        video.dataset.source = "poster-fallback";
      }
      if (introSkipped.current) return; // already opened by scrolling
      requestAnimationFrame(() => {
        if (!cancelled && !introSkipped.current) setPhase("lifting");
      });
      await wait(LIFT_MS);
      if (!cancelled && !introSkipped.current) setPhase("open");
    })();

    return () => {
      cancelled = true;
    };
  }, [data, startVideo]);

  // Grain at one texel per device pixel (crisp, never clumped): 256 px tile / devicePixelRatio.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const apply = () => section.style.setProperty("--grain-size", `${256 / (window.devicePixelRatio || 1)}px`);
    apply();
    const mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Pause the video (and the cue) when the scene is off screen or the tab is hidden.
  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    if (!section || !video) return;

    const sync = () => {
      const active = inView.current && document.visibilityState === "visible";
      section.dataset.inview = active ? "true" : "false";
      if (!videoActive.current || videoHeld.current) return;
      if (active && video.paused) video.play().catch(() => {});
      if (!active && !video.paused) video.pause();
    };

    const io = new IntersectionObserver(
      (entries) => {
        // Several changes can arrive in one batch: the last entry is the current state.
        const entry = entries[entries.length - 1];
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

  const { landscape, portrait, shade, inner } = data;
  const landscapeSizes = sizesFor(landscape, WINDOW_SCALE.landscape);
  const portraitSizes = sizesFor(portrait, WINDOW_SCALE.portrait);
  const shadeSizes =
    `${PORTRAIT_MEDIA} ${sizesFor(portrait, WINDOW_SCALE.portrait, portrait.shade.box.width)}, ` +
    sizesFor(landscape, WINDOW_SCALE.landscape, landscape.shade.box.width);

  const style = {
    ...geometryVars("l", landscape),
    ...geometryVars("p", portrait),
    "--grain": `url(${data.grain})`,
  } as CSSProperties;

  return (
    <section ref={sectionRef} className={styles.scene} data-phase={phase} data-inview="true" style={style}>
      <svg className={styles.defs} aria-hidden="true" focusable="false">
        <defs>
          <clipPath id="aperture-clip-landscape" clipPathUnits="objectBoundingBox">
            <path d={landscape.aperture.clipPath} />
          </clipPath>
          <clipPath id="aperture-clip-portrait" clipPathUnits="objectBoundingBox">
            <path d={portrait.aperture.clipPath} />
          </clipPath>
          <clipPath id="glass-clip-landscape" clipPathUnits="objectBoundingBox">
            <path d={landscape.glass.clipPath} />
          </clipPath>
          <clipPath id="glass-clip-portrait" clipPathUnits="objectBoundingBox">
            <path d={portrait.glass.clipPath} />
          </clipPath>
        </defs>
      </svg>

      <div className={styles.stage} role="img" aria-label={sceneLabel}>
        {/* The camera: the scroll push moves and scales this layer (the stage keeps its CSS placement) */}
        <div ref={cameraRef} className={styles.camera}>
        {/* 1: the view, clipped to the glass */}
        {/* Hidden in the server HTML (inline, so no stylesheet is needed) until the frame plate decodes */}
        <div
          className={styles.view}
          aria-hidden="true"
          data-scene-view=""
          style={viewReady ? undefined : { visibility: "hidden" }}
        >
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
        </div>

        {/* 2: glass sheen and inner shadow, clipped to the glass */}
        <div className={styles.glass} aria-hidden="true">
          <div className={styles.sheen} />
        </div>

        {/* 3: the inner bezel, between the groove and the glass; the closing shade covers it */}
        <picture>
          <source type="image/avif" srcSet={inner.avifSrcSet} sizes={shadeSizes} />
          <source type="image/webp" srcSet={inner.webpSrcSet} sizes={shadeSizes} />
          <img
            className={styles.inner}
            src={inner.fallback}
            width={inner.width}
            height={inner.height}
            alt=""
            decoding="async"
            draggable={false}
          />
        </picture>

        {/* 4: the plate's own shade, clipped to its track (inside the groove), so it runs under the bezel */}
        <div className={styles.shadeClip} aria-hidden="true">
          <picture>
            <source type="image/avif" srcSet={shade.avifSrcSet} sizes={shadeSizes} />
            <source type="image/webp" srcSet={shade.webpSrcSet} sizes={shadeSizes} />
            <img
              className={styles.shade}
              src={shade.fallback}
              width={shade.width}
              height={shade.height}
              alt=""
              decoding="async"
              draggable={false}
            />
          </picture>
        </div>

        {/* 5: the frame plate (outer bezel and wall); the browser picks the framing by aspect ratio */}
        <picture>
          <source
            media={PORTRAIT_MEDIA}
            type="image/avif"
            srcSet={portrait.avifSrcSet}
            sizes={portraitSizes}
            width={portrait.width}
            height={portrait.height}
          />
          <source
            media={PORTRAIT_MEDIA}
            type="image/webp"
            srcSet={portrait.webpSrcSet}
            sizes={portraitSizes}
            width={portrait.width}
            height={portrait.height}
          />
          <source type="image/avif" srcSet={landscape.avifSrcSet} sizes={landscapeSizes} />
          <source type="image/webp" srcSet={landscape.webpSrcSet} sizes={landscapeSizes} />
          <img
            ref={imgRef}
            className={styles.plate}
            src={landscape.fallback}
            width={landscape.width}
            height={landscape.height}
            alt=""
            fetchPriority="high"
            decoding="async"
            draggable={false}
          />
        </picture>

        {/* 6: window light on the wall; rises as the shade opens, then stays still (fades in the push) */}
        <div ref={lightRef} className={styles.lightLayer} aria-hidden="true">
          <div className={styles.light} />
        </div>
        </div>
      </div>

      {/* Scroll sequence: the fly-through canvas, the white of the cloud and the fade into --void */}
      <canvas ref={canvasRef} className={styles.fly} aria-hidden="true" />
      <div ref={whiteRef} className={styles.white} aria-hidden="true" />

      {/* 7: still film grain over the whole scene; inside the glass at half strength */}
      <div className={styles.grain} aria-hidden="true" />
      <div className={styles.grainGlass} aria-hidden="true" />

      {/* 8: vignette */}
      <div ref={vignetteRef} className={styles.vignette} aria-hidden="true" />
      <div ref={fadeRef} className={styles.fade} aria-hidden="true" />
      {/* 9: darkness: with the shade down no daylight reaches the cabin; it lifts with the shade */}
      <div
        className={styles.dark}
        aria-hidden="true"
        data-scene-cover=""
        // Opaque in the server HTML from the very first paint, before any stylesheet has applied (the
        // dev server delivers CSS late); once the shade starts lifting the stylesheet takes over.
        style={phase === "closed" ? DARK_COVER : undefined}
      />
      {/* Without JavaScript the shade is open: drop the cover and show the view (inline styles above). */}
      <noscript
        dangerouslySetInnerHTML={{
          __html: "<style>[data-scene-cover]{opacity:0!important}[data-scene-view]{visibility:visible!important}</style>",
        }}
      />

      {/* Text: fades out and drifts up as the push begins */}
      <div ref={hudRef} className={styles.hud}>
        {/* The JB monogram: home, replaying the landing (the name stays on the page in the <h1>). */}
        <BackToWindow className={styles.wordmark} ariaLabel={`${name}, home`}>
          <JbLogo className={styles.logo} />
        </BackToWindow>
        <div className={styles.title}>
          <h1 className={`${styles.h1} text-2xl font-medium text-paper`}>{name}</h1>
          <p className={`${styles.role} text-base text-pretty text-paper-muted`}>{role}</p>
        </div>
        {/* One thing per corner: the logo top left, the flight deck top right, the name bottom left and the
            passenger number bottom right. */}
        <PassengerNumber label={passenger.label} srTemplate={passenger.srTemplate} />
        <FlightDeck content={flightDeck} />
        <div className={styles.cue} aria-hidden="true">
          <span className="font-mono text-xs uppercase tracking-[0.18em] text-graphite-4">{scrollCue}</span>
          <span className={styles.cueTrack}>
            <span className={styles.cueLine} />
          </span>
        </div>
      </div>
    </section>
  );
}
