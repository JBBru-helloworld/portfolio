---
name: jbbru.com, Window seat
description: Monochrome, cinematic portfolio of a software engineer in ML and data, with one refined amber accent.
colors:
  void: "oklch(14.5% 0 0)"
  cabin: "oklch(19.1% 0 0)"
  graphite-1: "oklch(23.5% 0 0)"
  graphite-2: "oklch(32% 0 0)"
  graphite-3: "oklch(50% 0 0)"
  graphite-4: "oklch(63.3% 0 0)"
  paper: "oklch(96.9% 0.004 106.5)"
  paper-muted: "oklch(80% 0.004 106.5)"
  amber: "oklch(75% 0.088 72)"
  error: "oklch(68% 0.12 27)"
  ink-za: "oklch(52% 0.042 148)"
  ink-mu: "oklch(52% 0.085 27)"
  ink-my: "oklch(52% 0.045 262)"
typography:
  display:
    fontFamily: "Instrument Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(3rem, 1.8333rem + 5.1852vw, 6.5rem)"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.03em"
  h1:
    fontFamily: "Instrument Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 1.8333rem + 2.963vw, 4.5rem)"
    fontWeight: 500
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  h2:
    fontFamily: "Instrument Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2rem, 1.6667rem + 1.4815vw, 3rem)"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  h3:
    fontFamily: "Instrument Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 1.3333rem + 0.7407vw, 2rem)"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  h4:
    fontFamily: "Instrument Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.25rem, 1.1667rem + 0.3704vw, 1.5rem)"
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: "-0.01em"
  lead:
    fontFamily: "Instrument Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.125rem, 1.0833rem + 0.1852vw, 1.25rem)"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "-0.005em"
  body:
    fontFamily: "Instrument Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1rem, 0.9792rem + 0.0926vw, 1.0625rem)"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0em"
  caption:
    fontFamily: "Instrument Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.005em"
  accent:
    fontFamily: "Newsreader, ui-serif, Georgia, serif"
    fontStyle: "italic"
    fontWeight: 400
    letterSpacing: "-0.01em"
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.04em"
rounded:
  sm: "0.225rem"
  md: "0.3rem"
  lg: "0.375rem"
components:
  button-primary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.void}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-secondary:
    backgroundColor: "{colors.void}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-secondary-hover:
    backgroundColor: "{colors.graphite-1}"
---

# Design System: jbbru.com, Window seat

Source of truth for tokens: `src/app/globals.css` (CSS variables, Tailwind `@theme`, shadcn mapping), `src/lib/fonts.ts` and `src/lib/motion.ts`. If this file and the code disagree, fix one of them in the same change.

## Overview

**Window seat.** A monochrome, cinematic portfolio with one refined amber accent. It opens on a photorealistic dark cabin wall with one airplane window; the shade lifts and the scroll pushes the camera through the window and a cloud into the rest of the site. Everything after that is calm, precise and fast: a boarding-pass introduction, a split-flap departures board, passport stamps, selected work, a live fraud-detection demo, a periodic table of the stack, experience and contact.

The mood is a night flight: dark cabin, soft reading light, quiet confidence. Premium and editorial, never cartoonish, never an "AI startup template".

### One signature moment

**The window landing is the only spectacle.** It may be slow, layered and cinematic. Every later section is calm, precise and fast: no scroll-jacking, no pinned sequences longer than the content needs, no competing set pieces. If a later section starts to feel like a second landing, cut it back.

## Colors

Dark is the default and only theme. Contrast ratios are WCAG 2 against `void` (`#0A0A0A`).

### Primary

- **Amber** `oklch(75% 0.088 72)`, `#D1A56F`, 8.79:1 on void, 8.18:1 on cabin. The single accent. Warm and refined, like a softly lit cabin sign: hue 72 sits between honey (about 80) and orange (about 55), and chroma is held low so it never reads as yellow, orange or neon.

### Neutral

| Token | OKLCH | Hex | vs void | Use |
|---|---|---|---|---|
| `void` | `oklch(14.5% 0 0)` | `#0A0A0A` | 1.00 | Page background |
| `cabin` | `oklch(19.1% 0 0)` | `#141414` | 1.07 | Raised surfaces |
| `graphite-1` | `oklch(23.5% 0 0)` | `#1E1E1E` | 1.19 | Hairlines on cabin, hover fills |
| `graphite-2` | `oklch(32% 0 0)` | `#333333` | 1.57 | Dividers, decorative borders |
| `graphite-3` | `oklch(50% 0 0)` | `#636363` | 3.30 | Meaningful borders (inputs, controls). Non-text only |
| `graphite-4` | `oklch(63.3% 0 0)` | `#8A8A8A` | 5.73 | Muted text, table categories, meta |
| `paper-muted` | `oklch(80% 0.004 106.5)` | `#BEBEBB` | 10.63 | Secondary text |
| `paper` | `oklch(96.9% 0.004 106.5)` | `#F5F5F2` | 18.13 | Primary text |
| `error` | `oklch(68% 0.12 27)` | `#D8796F` | 6.49 | Form validation only |

`paper` is very slightly warm (chroma 0.004) so long reading never feels clinical against the neutral greys.

### Section-scoped: passport stamp inks

| Token | OKLCH | Hex | vs void | Country |
|---|---|---|---|---|
| `ink-za` | `oklch(52% 0.042 148)` | `#59705B` | 3.67 | South Africa, faded bottle green |
| `ink-mu` | `oklch(52% 0.085 27)` | `#94554E` | 3.46 | Mauritius, soft worn red |
| `ink-my` | `oklch(52% 0.045 262)` | `#5B6983` | 3.58 | Malaysia, faded navy |

All three share one lightness (52%) so no country shouts louder than another, with low chroma (0.04 to 0.085) so they read as real, slightly faded stamp ink rather than digital colour.

### Section-scoped: the view through the window

The clouds seen through the landing's window keep their own soft, muted, cool blue: the photographed sky graded to 40% of its natural saturation (the owner's choice, at the top of the 25 to 40% range, so it reads clearly as a soft blue when the shade opens) with lifted blacks and rolled-off whites. When the shade opens, the view is the only natural colour on the landing. It is photography, not a palette colour: no token, no UI element and no gradient takes its hue. The fly-through starts in the same soft blue and drains towards grey as it flies into the cloud; the landing then goes white and fades to black, so the rest of the site arrives in greys.

### Named Rules

- **The Single Accent Rule.** Amber is used only for focus rings, at most one highlight per section, and the top driver in the fraud demo. Never as a large fill, a glow, a gradient, a background wash or a decorative border.
- **Amber contrast.** Amber meets 3:1 for focus rings and 4.5:1 for text on `void` and `cabin` (it measures 8.79:1 and 8.18:1). Re-check if it is ever placed on any other surface.
- **The Window View Rule.** The cloud loop and the opening of the fly-through are the only other colour, and only as photography inside the window (and the push through it). Nothing is ever sampled from them.
- **The Stamp Ink Rule.** `ink-za`, `ink-mu` and `ink-my` may be used only inside the passport stamp section. Nowhere else, for anything. They clear 3:1 as graphics; stamp text set in them must be large (at least 24px, or 18.66px bold) and the same information must also exist as real text in `paper` or `paper-muted`.
- **shadcn naming.** shadcn's `--accent` is a hover fill mapped to `graphite-1`; it is not the amber accent. Amber is reached through `--ring` and the `amber` utilities only.
- **Muted text floor.** Small text never uses anything darker than `graphite-4`. `graphite-3` and darker are for borders and surfaces.
- **Surface pairing.** `graphite-3` borders and the stamp inks sit on `void` or `cabin` only. On `graphite-1` they fall below 3:1 (`graphite-3` 2.77, `ink-mu` 2.91).

## Typography

- **Display and body:** Instrument Sans (variable, weight 400 to 600, width 100).
- **Accent:** Newsreader Italic (weight 400, optical size 24 to 72) for **one word or a short phrase inside a heading**, never whole sentences, never body copy. Use the `accent-serif` utility.
- **Data, code and the departures board:** JetBrains Mono (variable, weight 400 to 500). Use tabular figures (`tabular-nums`) for any numbers that change or align.

All three are self-hosted, Latin-subset WOFF2 files in `src/fonts/` (SIL OFL 1.1), loaded with `next/font/local`.

### Hierarchy

Fluid between 360px and 1440px viewports. Tracking tightens as size grows; leading tightens as size grows.

| Role | Size | Weight | Leading | Tracking | Tailwind |
|---|---|---|---|---|---|
| Display | 48 to 104px | 500 | 1.0 | -0.03em | `text-display` |
| H1 | 40 to 72px | 500 | 1.05 | -0.025em | `text-4xl` |
| H2 | 32 to 48px | 500 | 1.1 | -0.02em | `text-3xl` |
| H3 | 24 to 32px | 500 | 1.2 | -0.015em | `text-2xl` |
| H4 | 20 to 24px | 500 | 1.35 | -0.01em | `text-xl` |
| Lead | 18 to 20px | 400 | 1.55 | -0.005em | `text-lg` |
| Body | 16 to 17px | 400 | 1.6 | 0 | `text-base` |
| Caption | 14px | 400 | 1.5 | 0.005em | `text-sm` |
| Mono label | 12px | 400 | 1.5 | 0.04em | `font-mono text-xs` |

### Named Rules

- **Measure.** Body copy sits at about 60 to 75 characters (`measure` utility, `max-width: 68ch`).
- **Weight before size.** Build hierarchy from weight, size and leading together; emphasise with weight 500 or 600 before reaching for a bigger size.
- **Balance and pretty.** Headings use `text-balance`; paragraphs use `text-pretty`.
- **No Inter.** And no other default system-UI look-alike as a brand face.

## Layout

- Mobile first, with a 16px side gutter at phone width and no horizontal page scroll.
- Content column up to `max-w-6xl`; reading content constrained by `measure`.
- Spacing in `rem` so the layout scales with the user's text size.
- Generous vertical rhythm between sections (`gap-16` and up); tight, consistent spacing inside components.

## Elevation & Depth

Depth comes from tone, not shadow: `void` is the floor, `cabin` is raised, `graphite-1` hairlines separate. No drop shadows on cards, no glassmorphism, no glows. The only photographic depth is the window landing.

## Shapes

Small radii (`--radius: 0.375rem`). Buttons and inputs use `rounded-md`. No pills unless a component is genuinely a tag. No blobs, no organic shapes outside the landing photography.

## Components

### Buttons

- **Primary:** `paper` fill, `void` text, weight 500. Hover dims to 90% opacity.
- **Secondary:** transparent, `graphite-3` border, `paper` text. Hover fills `graphite-1`.
- **Press:** `scale(0.97)` on `:active` over 120 to 150ms with `--ease-out` (mark with `data-motion="press"` so reduced motion can strip it).
- **Focus:** a 2px `amber` outline with a 3px offset on `:focus-visible` only. Never on mouse click.

### Inputs / Fields

`graphite-3` border (3.30:1, meets the 3:1 non-text minimum), `paper` text, `graphite-4` placeholder, amber focus ring, `error` text and border for validation messages.

### Window landing (built in Phase 2b, v2 plate)

All values live at the top of `src/components/scene/WindowScene.module.css`, so they can be tuned in one place.

- **Plate:** the owner's window composition, separated into a frame plate (outer bezel and wall), the inner bezel (between the groove and the glass), the plate's own shade (panel and lip, extended upwards with matching matt texture and widened so its edges run in the groove) and the track and glass outlines. Graded to neutral monochrome; the bezel is clearly the lightest object, the shade dark matt with its lip catching the light. The wall panel feathers into `--void` on every side; there is no invented wall.
- **Window scale:** the frame is **65%** of the viewport height on landscape screens, centred at 46% (slightly above the middle), and **57.5%** on portrait screens (3:4 or narrower), centred at 42%, so the title and the scroll cue sit on the dark background below and beside it.
- **Layers, back to front:** cloud loop (clipped to the glass), glass sheen and inner shadow (clipped to the glass), inner bezel, shade (clipped to its track, so it runs in the bezel's dark groove like a real slider), frame plate, window light (very slightly cool white, subtle), grain, vignette, darkness.
- **Shade:** opens once on load, from closed (lip resting in the groove at the bottom) to the photographed position, over 1.6 s on `--ease-cinematic`; the clouds start just before it moves. The frame is lit only by the window: with the shade down the landing is black (only the name and role show), and the bezel's glow and the window light return with the shade, on the same duration and curve. Reduced motion shows it open and lit.
- **Scroll sequence (Phase 2c):** the landing is pinned for 280vh (200vh on touch screens) and every beat is scrubbed, so it plays backwards too; all beats live in `src/config/scene-timeline.ts`. The text fades and drifts up (0 to 10%); the camera pushes into the window, scaling about the glass on `--ease-cinematic` until the viewport sits inside the visible view (5 to 55%, exact at every size); the fly-through fades in *inside the window* early (15 to 30%), so the cloud video is never magnified, and flies forward into the cloud (20 to 70%); the screen goes fully white (58 to 72%), then fades to `--void` (80 to 95%) before the next section rises. The dark emergence frames are not used. Lenis smooths wheel and trackpad only; touch and keyboard scrolling stay native. Reduced motion: no pin, no zoom, no frames; the next section fades in.
- **Film grain:** static (no movement), one texel per device pixel (a 256 px tile shown at 256 / devicePixelRatio CSS px, so it never clumps on Retina screens), **soft-light at 2%** over the whole landing and **1%** inside the glass. At this strength it is at the edge of perception: it changes pixels by about one grey level and never greys the blacks.

### Signature components (to be built)

- **Window landing:** photographic layers (the owner's window composition separated into frame, inner bezel and shade; two cloud videos), shade lift, scroll push through the window and a cloud. The only place `--ease-cinematic` and long durations are allowed.
- **Split-flap departures board:** JetBrains Mono, tabular figures, `paper` on `cabin`; amber at most on one cell.
- **Passport stamps:** the only place the stamp inks appear.
- **Periodic table of the stack:** `graphite-4` category labels, `paper` symbols.
- **Fraud "security check" demo:** the top driver may be amber; everything else monochrome.

## Motion

Tokens live in `src/lib/motion.ts` (Motion and GSAP) and as CSS variables in `globals.css`.

| Token | Value | Use |
|---|---|---|
| `--ease-out` / `ease.out` | `cubic-bezier(0.23, 1, 0.32, 1)` | Interface feedback, enters and exits, 150 to 250ms |
| `--ease-in-out` / `ease.inOut` | `cubic-bezier(0.77, 0, 0.175, 1)` | Elements already on screen moving or morphing |
| `--ease-cinematic` / `ease.cinematic` | `cubic-bezier(0.65, 0.05, 0.36, 1)` | Scroll-driven scenes only (the window landing) |
| `--ease-spring` / `spring.soft` | critically damped, response 0.4s (`bounce: 0, visualDuration: 0.4`) | Interactive elements |
| `spring.momentum` | `bounce: 0.2, visualDuration: 0.4` | Only after a flick or drag release |
| `--duration-press` | 120ms | Press feedback |
| `--duration-fast` / `-base` / `-slow` | 150 / 200 / 250ms | UI transitions |
| `--duration-cinematic` | 1200ms | Landing scene beats |
| `--duration-reduced` | 150ms | Opacity fades under reduced motion |

### Reduced motion

Under `prefers-reduced-motion: reduce`, movement and scaling are removed everywhere, but short opacity fades (150ms, under 200ms) remain so state changes stay visible. The global rule in `globals.css` limits every transition to `opacity` (colour changes apply instantly), collapses keyframe animations to their end state, and drops `data-motion="press"` and `data-motion="lift"` transforms. In Motion, wrap the app in `MotionConfig reducedMotion="user"`; in GSAP, gate scenes with `gsap.matchMedia()`. The window landing must offer a calm, static path (a still composite and a fade) under reduced motion.

## Principles

From **apple-design**:

- **Respond instantly.** Feedback on pointer-down, never only on release.
- **Interruptible by default.** Anything a user touches can be grabbed and reversed mid-flight; springs, not keyframes, for interactive motion.
- **Critically damped unless momentum was given.** Bounce only after a flick.
- **Spatial consistency.** Things leave the way they came; popovers grow from their trigger.
- **Type changes shape with size.** Negative tracking on display sizes, near zero for body, tight leading on headings.
- **Reduced motion is a gentler equivalent, not nothing.**
- **Purpose and restraint.** Every element earns its place; delight is the result of getting the rest right.

From **emil-design-eng**:

- **Decide whether to animate at all.** Frequent actions (hover lists, keyboard actions) get little or no animation.
- **Ease-out for entering and exiting, never ease-in for UI.** Use the custom curves above, not the browser defaults.
- **UI stays under 300ms.** Only the landing is allowed to be slow.
- **Animate only `transform` and `opacity`.** Name exact transition properties; never `transition: all`.
- **Never from `scale(0)`.** Start from 0.95 or more with opacity.
- **Gate hover effects** behind `(hover: hover) and (pointer: fine)` (Tailwind's `hover:` already does).
- **Exits faster than enters; short staggers** (30 to 80ms) that never block interaction.

## Do's and Don'ts

### Do:

- Keep everything monochrome; let amber appear once per section at most.
- Put the role, proof and contact within the first seconds, even during the landing (skip control from the first frame).
- Use real photography and real project artefacts only.
- Use tabular figures for numbers, mono for data.

### Don't:

- No purple or blue gradients, no glassmorphism, no neon glows, no emoji.
- No generic three-column icon grids.
- No Inter.
- No stock imagery.
- No motion without a purpose, and no second spectacle after the landing.
- No amber fills, glows or gradients. No stamp inks outside the stamp section.
- No em dashes in site copy; UK English throughout.
