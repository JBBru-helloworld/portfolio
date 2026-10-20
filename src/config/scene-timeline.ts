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

  /**
   * Fly-through frames: frame 1 to the near-whiteout frame over [start, whiteoutAt], then on through the
   * last misty frames (`lastFrame`, a share of the source sequence) more slowly until `end`, so the mist
   * keeps drifting while the white darkens. The dark emergence frames after that are never used.
   */
  fly: { start: 0.2, whiteoutAt: 0.72, end: 1, lastFrame: 0.714 },

  /** Soft white overlay: rises to a near-whiteout that still lets the mist's texture through. */
  white: { rise: [0.58, 0.72], peak: 0.85 },

  /**
   * Dusk inside the cloud: the white thins while --void rises over the still-drifting mist, and the canvas
   * pushes in very slightly, so the screen darkens through moving mist rather than flat grey.
   */
  dusk: { start: 0.84, end: 1, push: 1.05, pushFrom: 0.72 },

  /**
   * The pin releases this share of the sequence before the screen reaches black, so the next section's
   * heading is already rising while the last of the mist fades.
   */
  overlap: 0.06,

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
