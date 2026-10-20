/*
 * The landing's scroll sequence: every beat and value, in one place.
 *
 * Progress runs 0..1 across the pinned scroll distance. Each beat is [start, end] in that progress.
 * The timeline is scrubbed (tied directly to the scroll position), so every beat also plays backwards.
 */

/** Cubic-bezier control points, matching --ease-cinematic in globals.css. */
export const CINEMATIC_EASE = "0.65,0.05,0.36,1";

export const sceneTimeline = {
  /** Pinned scroll distance, in viewport heights. Touch screens get a shorter run. */
  distance: { desktop: 2.8, touch: 2.0 },

  /** Name, role, wordmark and scroll cue fade out and drift up (px). */
  hud: { start: 0, end: 0.1, rise: 18 },

  /**
   * The camera push: the stage moves the view's centre to the viewport centre and scales about the glass
   * until the viewport fits inside the visible view (glass not covered by the bezel or the lip), plus a
   * margin. The end scale is computed from the viewport and the manifest's view outline at every refresh.
   */
  push: { start: 0.05, end: 0.55, margin: 0.04 },

  /** Window light and vignette fade as the frame leaves the screen. */
  lightFade: { start: 0.2, end: 0.5 },

  /**
   * Hand-over, early: the fly-through fades in *inside the window* while the camera is still pushing
   * (the canvas is clipped to the visible view on screen until the push ends), so the cloud video is
   * never magnified to full screen.
   */
  handover: { start: 0.15, end: 0.3 },

  /** Fly-through frames, from the first to the near-whiteout frame (the dark emergence is not used). */
  fly: { start: 0.2, end: 0.7 },

  /** Soft white overlay: rises to full white inside the cloud and holds. */
  white: { rise: [0.58, 0.72], peak: 1 },

  /** From white to black: --void rises over the white, then holds until the pin releases. */
  void: { start: 0.8, end: 0.95 },

  /** The cloud video pauses once the fly-through has taken over (and resumes below this). */
  videoPauseAt: 0.3,

  /** The plate switches to its largest image as the push begins (preloaded after the intro). */
  sharpPlateAt: 0.02,

  /** Scrolling past this before the intro has finished opens the shade at once. */
  skipIntroAt: 0.01,

  /** Save-Data and slow connections (no fly-through frames): the poster goes straight to white. */
  lite: { white: { rise: [0.5, 0.65], peak: 1 } },

  /** Canvas resolution cap (device pixels per CSS pixel). */
  maxCanvasDpr: 2,
} as const;

export type SceneTimeline = typeof sceneTimeline;
