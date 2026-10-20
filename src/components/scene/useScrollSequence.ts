"use client";

/*
 * The landing's signature moment: the pinned, scrubbed scroll sequence (camera push through the window,
 * hand-over to the fly-through, whiteout inside the cloud, emergence into --void). All beats and values
 * come from src/config/scene-timeline.ts.
 */
import { useEffect, useRef, type MutableRefObject, type RefObject } from "react";
import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CINEMATIC_EASE, sceneTimeline as T } from "@/config/scene-timeline";
import { FlyFrames, drawCover } from "./fly-frames";
import { PORTRAIT_MEDIA, REDUCED_MOTION, SMALL_SCREEN, TOUCH_ONLY, isConstrainedNetwork } from "./media";
import { pushTarget, type Point, type PushTarget } from "./push-geometry";
import { pendingRestore, restoreNow } from "@/components/nav/site-state";
import type { PlateSet, SceneData } from "./scene-data";

gsap.registerPlugin(ScrollTrigger, CustomEase);

export interface SequenceRefs {
  section: RefObject<HTMLElement | null>;
  camera: RefObject<HTMLDivElement | null>;
  video: RefObject<HTMLVideoElement | null>;
  plate: RefObject<HTMLImageElement | null>;
  light: RefObject<HTMLDivElement | null>;
  vignette: RefObject<HTMLDivElement | null>;
  hud: RefObject<HTMLDivElement | null>;
  canvas: RefObject<HTMLCanvasElement | null>;
  white: RefObject<HTMLDivElement | null>;
  fade: RefObject<HTMLDivElement | null>;
}

interface Options {
  /** True once the shade has finished opening. */
  open: boolean;
  /** Opens the shade at once (the visitor scrolled before the intro finished, or reloaded mid-way). */
  openNow: () => void;
  /** True while the intro's video is playing (set by the intro). */
  videoActive: MutableRefObject<boolean>;
  /** Set here while the fly-through has taken over, so the visibility logic keeps the video paused. */
  videoHeld: MutableRefObject<boolean>;
  /**
   * After a restore to a later section the video and fly-through frames are not loaded; this starts the
   * video once the visitor scrolls back up into the sequence (the frames are started here).
   */
  wakeVideo: () => void;
}

/** Runs fn when the browser is idle (Safari has no requestIdleCallback). Returns a cancel function. */
function idle(fn: () => void): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(fn, { timeout: 2000 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(fn, 200);
  return () => window.clearTimeout(id);
}

interface Measured {
  target: PushTarget;
  /** The visible view outline and the camera's transform-origin, in untransformed screen pixels. */
  view: Point[];
  origin: Point;
}

/** The view outline and glass centre in screen pixels, from the stage's layout box (the camera's parent). */
function measure(camera: HTMLDivElement, plate: PlateSet, vw: number, vh: number, margin: number): Measured {
  const stage = camera.parentElement as HTMLElement;
  const w = stage.offsetWidth;
  const h = stage.offsetHeight;
  // .stage is placed at left: 50% with translate(-50% + frame shift); offsetLeft/Top ignore transforms.
  const dx = (0.5 - plate.frame.x - plate.frame.width / 2) * w;
  const left = stage.offsetLeft - w / 2 + dx;
  const top = stage.offsetTop;
  const view = plate.viewPoints.map(([x, y]) => ({ x: left + x * w, y: top + y * h }));
  const origin = { x: left + plate.glass.centre.x * w, y: top + plate.glass.centre.y * h };
  return { target: pushTarget(view, origin, vw, vh, margin), view, origin };
}

/** The view outline on screen for the camera's current transform, as a CSS polygon(). */
function viewClip(m: Measured, camera: HTMLDivElement): string {
  const x = Number(gsap.getProperty(camera, "x"));
  const y = Number(gsap.getProperty(camera, "y"));
  const s = Number(gsap.getProperty(camera, "scale"));
  const { origin: o } = m;
  return `polygon(${m.view.map((p) => `${(o.x + x + s * (p.x - o.x)).toFixed(1)}px ${(o.y + y + s * (p.y - o.y)).toFixed(1)}px`).join(",")})`;
}

export function useScrollSequence(refs: SequenceRefs, data: SceneData, opts: Options) {
  const frames = useRef<FlyFrames | null>(null);
  const plateUpgrade = useRef<{ ready: boolean; applied: boolean; sizes: string } | null>(null);
  const { openNow, videoActive, videoHeld, wakeVideo } = opts;
  const openRef = useRef(opts.open);
  openRef.current = opts.open;
  // True while media loading is deferred (restored to a later section, not yet back in the sequence).
  const deferred = useRef(false);

  // After the intro, when the browser is idle: the largest plate (for the push) and the fly-through frames.
  useEffect(() => {
    if (!opts.open || deferred.current || window.matchMedia(REDUCED_MOTION).matches || isConstrainedNetwork()) return;
    return idle(() => {
      frames.current?.load();
      const img = refs.plate.current;
      if (!img || plateUpgrade.current) return;
      const portrait = window.matchMedia(PORTRAIT_MEDIA).matches;
      const plate = portrait ? data.portrait : data.landscape;
      const dpr = window.devicePixelRatio || 1;
      const large = portrait || window.innerWidth * dpr >= 1600;
      if (!large || img.naturalWidth >= plate.largest.width) return;
      const url = img.currentSrc.endsWith(".avif") ? plate.largest.avif : plate.largest.webp;
      const pre = new Image();
      pre.src = url;
      plateUpgrade.current = { ready: false, applied: false, sizes: `${Math.ceil(plate.largest.width / dpr)}px` };
      pre.decode().then(
        () => plateUpgrade.current && (plateUpgrade.current.ready = true),
        () => undefined,
      );
    });
  }, [opts.open, data, refs.plate]);

  useEffect(() => {
    const section = refs.section.current;
    const camera = refs.camera.current;
    const canvas = refs.canvas.current;
    if (!section || !camera || !canvas) return;

    CustomEase.create("cinematic", CINEMATIC_EASE);
    ScrollTrigger.config({ ignoreMobileResize: true });
    const mm = gsap.matchMedia();
    // A reload on the board or a later section (or a section hash) lands there covered: no intro, and the
    // video and frames wait until the visitor scrolls back up into the sequence.
    deferred.current = pendingRestore() !== null;
    const wake = () => {
      if (!deferred.current) return;
      deferred.current = false;
      wakeVideo();
      if (!isConstrainedNetwork()) frames.current?.load();
    };

    mm.add({ motion: "(prefers-reduced-motion: no-preference)", touch: TOUCH_ONLY }, (ctx) => {
      const { motion, touch } = ctx.conditions as { motion: boolean; touch: boolean };

      if (!motion) {
        // Reduced motion: no pin, no zoom, no frames. The next section simply fades in.
        const next = section.nextElementSibling as HTMLElement | null;
        if (!next) return;
        restoreNow();
        if (next.getBoundingClientRect().top < window.innerHeight) return; // restored to it, or below
        next.style.opacity = "0";
        next.style.transition = "opacity 400ms ease";
        const io = new IntersectionObserver(([e]) => {
          if (e.isIntersecting) {
            next.style.opacity = "1";
            io.disconnect();
          }
        }, { threshold: 0.15 });
        io.observe(next);
        return () => {
          io.disconnect();
          next.style.opacity = "";
          next.style.transition = "";
        };
      }

      const lite = isConstrainedNetwork();
      const tier = window.matchMedia(SMALL_SCREEN).matches ? data.fly.mobile : data.fly.desktop;
      const avif = (refs.plate.current?.currentSrc ?? "").endsWith(".avif");
      const ctx2d = canvas.getContext("2d", { alpha: false });
      let lastDrawn = -2;
      let wanted = 0;
      let rafId = 0;
      let m: Measured = { target: { x: 0, y: 0, scale: 1 }, view: [], origin: { x: 0, y: 0 } };

      const draw = () => {
        rafId = 0;
        if (!ctx2d) return;
        const f = frames.current;
        const bmp = f?.nearest(wanted) ?? f?.still ?? null;
        const key = bmp ? wanted : -1;
        if (key === lastDrawn && bmp) return;
        lastDrawn = key;
        if (bmp) drawCover(ctx2d, bmp, canvas.width, canvas.height);
        else {
          ctx2d.fillStyle = "#e9edf1"; // never blank: the soft white of the cloud until a frame arrives
          ctx2d.fillRect(0, 0, canvas.width, canvas.height);
        }
      };
      const requestDraw = () => {
        if (!rafId) rafId = requestAnimationFrame(draw);
      };

      if (!lite && !frames.current) {
        frames.current = new FlyFrames(avif ? tier.avif : tier.webp, avif ? tier.whiteout.avif : tier.whiteout.webp, () => {
          lastDrawn = -2;
          requestDraw();
        });
        if (openRef.current && !deferred.current) idle(() => frames.current?.load());
      }

      const sizeCanvas = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, T.maxCanvasDpr);
        canvas.width = Math.round(section.clientWidth * dpr);
        canvas.height = Math.round(section.clientHeight * dpr);
        lastDrawn = -2;
        requestDraw();
      };

      const portraitNow = () => (window.matchMedia(PORTRAIT_MEDIA).matches ? data.portrait : data.landscape);
      const remeasure = () => {
        m = measure(camera, portraitNow(), section.clientWidth, section.clientHeight, T.push.margin);
        sizeCanvas();
      };
      remeasure();

      let pushing = false;
      let covered = false;
      let live = false; // true once the restore has run (creating the triggers reports progress 0 first)
      let settle = 0;
      const onProgress = (p: number) => {
        // While the scroll moves, the camera is its own layer (cheap scaling); when it rests, the hint is
        // dropped so the browser re-rasterises the window sharply at the current scale.
        camera.style.willChange = "transform";
        window.clearTimeout(settle);
        settle = window.setTimeout(() => (camera.style.willChange = ""), 180);
        if (p > T.skipIntroAt && !openRef.current) openNow();
        if (p < 1 && live) wake();
        const up = plateUpgrade.current;
        if (up && up.ready && !up.applied && p > T.sharpPlateAt) {
          up.applied = true;
          const img = refs.plate.current;
          img?.parentElement?.querySelectorAll("source").forEach((s) => s.setAttribute("sizes", up.sizes));
          img?.setAttribute("sizes", up.sizes);
        }
        const nowPushing = p > T.push.start;
        if (nowPushing !== pushing) {
          pushing = nowPushing;
          section.dataset.pushing = String(nowPushing);
        }
        // Until the push ends the fly-through is seen through the window: clip the canvas to the view.
        if (!lite) canvas.style.clipPath = p < T.push.end && m.view.length ? viewClip(m, camera) : "none";
        const nowCovered = !lite && p >= T.push.end;
        if (nowCovered !== covered) {
          covered = nowCovered;
          section.dataset.covered = String(nowCovered);
        }
        // The video rests once the fly-through has taken over, and resumes below that point.
        const video = refs.video.current;
        const hold = p >= T.videoPauseAt;
        if (video && hold !== videoHeld.current) {
          videoHeld.current = hold;
          if (hold) video.pause();
          else if (videoActive.current) video.play().catch(() => {});
        }
        if (lite) return;
        if (p > T.handover.start - 0.1 && !deferred.current) frames.current?.load(); // reached early (fast scroll or reload)
        if (p >= T.handover.start) {
          // Frame 1 to the near-whiteout frame, then slowly on through the last misty frames.
          const w = tier.whiteoutIndex;
          const last = tier.avif.length - 1;
          const clamp = (v: number) => Math.min(Math.max(v, 0), 1);
          wanted =
            p <= T.fly.whiteoutAt
              ? Math.round(clamp((p - T.fly.start) / (T.fly.whiteoutAt - T.fly.start)) * w)
              : Math.round(w + clamp((p - T.fly.whiteoutAt) / (T.fly.end - T.fly.whiteoutAt)) * (last - w));
          if (wanted !== lastDrawn) requestDraw();
        }
      };

      const white = lite ? T.lite.white : T.white;
      const distance = () => (touch ? T.distance.touch : T.distance.desktop) * section.clientHeight;
      // Curtain rise: the scene stays pinned for the sequence plus one screen plus the feather, while the
      // next section (the departures board) is pulled up by the same amount, so it starts rising exactly as
      // the sequence ends and slides over the dusk mist. Its feathered top edge is set here too.
      const riseDistance = () => section.clientHeight * (1 + T.rise.featherVh / 100);
      const curtain = document.querySelector<HTMLElement>("[data-curtain]");
      const placeCurtain = () => {
        if (!curtain) return;
        curtain.style.setProperty("--feather", `${section.clientHeight * (T.rise.featherVh / 100)}px`);
        curtain.style.marginTop = `${-riseDistance()}px`;
      };
      placeCurtain();
      ScrollTrigger.addEventListener("refreshInit", placeCurtain);
      const pin = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: () => `+=${distance() + riseDistance()}`,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      });
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          // Absolute positions from the pin's own start: a relative end here would be pushed further down
          // by the pin's scroll length (ScrollTrigger offsets later triggers by pin spacing).
          start: () => pin.start,
          end: () => pin.start + distance(),
          scrub: true,
          invalidateOnRefresh: true,
          onRefreshInit: remeasure,
          onRefresh: (self) => onProgress(self.progress),
          onUpdate: (self) => onProgress(self.progress),
        },
      });
      const span = (b: { start: number; end: number }) => b.end - b.start;
      tl.set({}, {}, 1); // fixes the timeline's length at 1, so positions are progress
      tl.fromTo(refs.hud.current, { opacity: 1, y: 0 }, { opacity: 0, y: -T.hud.rise, duration: span(T.hud), ease: "power1.out" }, T.hud.start);
      tl.fromTo(
        camera,
        { x: 0, y: 0, scale: 1 },
        { x: () => m.target.x, y: () => m.target.y, scale: () => m.target.scale, duration: span(T.push), ease: "cinematic" },
        T.push.start,
      );
      tl.fromTo([refs.light.current, refs.vignette.current], { opacity: 1 }, { opacity: 0, duration: span(T.lightFade) }, T.lightFade.start);
      if (!lite) tl.fromTo(canvas, { opacity: 0 }, { opacity: 1, duration: span(T.handover) }, T.handover.start);
      tl.fromTo(refs.white.current, { opacity: 0 }, { opacity: white.peak, duration: white.rise[1] - white.rise[0], ease: "sine.inOut" }, white.rise[0]);
      // Dusk inside the cloud: the white thins while black rises over the still-drifting mist (black starts
      // slowly, so the midpoint is dim mist, not flat grey), and the mist pushes in very slightly.
      tl.to(refs.white.current, { opacity: 0, duration: span(T.dusk), ease: "sine.inOut" }, T.dusk.start);
      tl.fromTo(refs.fade.current, { opacity: 0 }, { opacity: T.dusk.floor, duration: span(T.dusk), ease: "power2.in" }, T.dusk.start);
      if (!lite) {
        tl.fromTo(canvas, { scale: 1 }, { scale: T.dusk.push, duration: T.dusk.end - T.dusk.pushFrom }, T.dusk.pushFrom);
      }

      // During the rise the mist keeps drifting (a slow push); once the board covers it, nothing draws.
      const rise = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          start: () => pin.start + distance(),
          end: () => pin.start + distance() + riseDistance(),
          scrub: true,
          invalidateOnRefresh: true,
          // Hidden once the rise is complete (from its very end, where a restore to the board lands); the
          // enter/leave callbacks fire even on a large jump.
          onUpdate: (self) => {
            const full = String(self.progress >= 1);
            if (section.dataset.boardCovered !== full) section.dataset.boardCovered = full;
          },
          onLeave: () => (section.dataset.boardCovered = "true"),
          onEnterBack: () => {
            section.dataset.boardCovered = "false";
            if (live) wake();
          },
          onLeaveBack: () => (section.dataset.boardCovered = "false"),
          onRefresh: (self) => (section.dataset.boardCovered = String(self.progress >= 1 && self.scroll() >= self.end)),
        },
      });
      if (!lite) rise.fromTo(canvas, { scale: T.dusk.push }, { scale: T.rise.drift, duration: 1, immediateRender: false });
      else rise.set({}, {}, 1);

      // Everything is in place: restore the saved section (or hash) now, before Lenis starts.
      restoreNow(() => ScrollTrigger.update());
      live = true;

      const onResize = () => sizeCanvas();
      window.addEventListener("resize", onResize);
      return () => {
        pin.kill();
        ScrollTrigger.removeEventListener("refreshInit", placeCurtain);
        curtain?.style.removeProperty("--feather");
        curtain?.style.removeProperty("margin-top");
        delete section.dataset.boardCovered;
        window.removeEventListener("resize", onResize);
        if (rafId) cancelAnimationFrame(rafId);
        window.clearTimeout(settle);
        camera.style.willChange = "";
        delete section.dataset.pushing;
        delete section.dataset.covered;
        canvas.style.clipPath = "";
        videoHeld.current = false;
      };
    });

    return () => {
      mm.revert(); // kills the ScrollTrigger and timeline and restores inline styles
      frames.current?.dispose();
      frames.current = null;
    };
  }, [data, refs, openNow, videoActive, videoHeld, wakeVideo]);
}

