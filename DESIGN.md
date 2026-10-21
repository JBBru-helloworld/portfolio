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
- **The Project Image Rule (colour exception, Phase 4a).** Project screenshots are the third place colour appears, and only as the owner's own images. On the site they show in **greyscale at rest** (the gallery's closed strips, `filter: grayscale(1)`) and in **full colour when expanded or on their own page** (the open strip, the project page's header and screenshots, the full-screen view, video thumbnails), like the view through the window. The change is CSS only (a 420 ms `--ease-out` filter transition; instant under reduced motion), never separate files. Nothing is ever sampled from the images for UI colour.
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
- **Scroll sequence (Phase 2c):** the landing is pinned for 280vh (200vh on touch screens) and every beat is scrubbed, so it plays backwards too; all beats live in `src/config/scene-timeline.ts`. The text fades and drifts up (0 to 10%); the camera pushes into the window, scaling about the glass on `--ease-cinematic` until the viewport sits inside the visible view (5 to 55%, exact at every size); the fly-through fades in *inside the window* early (15 to 30%), so the cloud video is never magnified, and flies forward into the cloud (20 to 70%); the screen goes near-white (58 to 72%), and dusk falls inside the cloud (84 to 100%): the white thins while black rises over the still-drifting mist, with a very slight push, to a deep, dim dusk (about 20% brightness, never black). Then the **curtain rise**: the scene stays pinned for one more screen while the departures section slides up over the drifting mist, through a soft 22vh feathered top edge (no card edge, no corners); once it covers the scene, the scene stops drawing. Scrolling back reverses everything. The dark emergence frames are not used. Lenis smooths wheel and trackpad only; touch and keyboard scrolling stay native. Reduced motion: no pin, no zoom, no frames; the next section fades in.
- **Film grain:** static (no movement), one texel per device pixel (a 256 px tile shown at 256 / devicePixelRatio CSS px, so it never clumps on Retina screens), **soft-light at 2%** over the whole landing and **1%** inside the glass. At this strength it is at the edge of perception: it changes pixels by about one grey level and never greys the blacks.

### Departures board (built in Phase 3a, the site map since the Phase 3a tweak)

- **Look:** a physical split-flap board, rendered with restraint. Each character is a flap tile (charcoal between `--cabin` and `--graphite-1`, a very slight top-to-bottom gradient, a hairline hinge across the middle, a faint top-edge highlight, a tiny gap between tiles), JetBrains Mono in `--paper`; remarks in `--paper-muted`; "NOW BOARDING" is the section's one amber highlight. No glow, no neon, no reflections. Header: "DEPARTURES" in small mono capitals with a quiet aeroplane icon and a hairline rule.
- **Content:** the boarding line (NOW BOARDING, the name, the role), then one row per site section from `src/content/destinations.ts`: FLIGHT, DESTINATION, GATE, REMARKS (JB 101 MY JOURNEY, gate 1, BOARDING; the rest ON TIME).
- **Navigation:** each row is one link to its section ("Gate 1: My journey"). Hover lifts the row's tiles a shade and shows a faint `--graphite-1` panel behind it; keyboard focus is the amber ring. Choosing a row flips its remark to BOARDING (300 to 500 ms), then glides there (Lenis on desktop, native smooth scrolling on touch, an instant jump under reduced motion) and updates the hash. Sections visited in this browser session read DEPARTED the next time the board is on screen.
- **Mechanics:** a fixed flap order (blank, A to Z, 0 to 9, `. , : + - / ' ·`; `check:content` fails on any other character). One flip is 70 ms: the top half folds down about the hinge (ease-in), then the next character's bottom half falls into place (ease-out). The fold is drawn as its projection (`scaleY(cos angle)` from the hinge), which avoids one compositor layer per flap. Blank tiles that stay blank never move. Wide screens: each tile starts 6 to 14 steps before its target, rows 120 ms apart with up to 90 ms per tile, settled in about 2.1 s. Phones (under 640 px, or touch with four cores or fewer): one row at a time, top to bottom, 2 to 4 steps, rows 300 ms apart, settled in about 2.7 s. One time-based `requestAnimationFrame` loop drives every tile. It flips once, when about 60% into view.
- **Layout:** wide screens, four columns in one line; phones, flight and remarks on the first line, destination and gate on the second. Tiles size from the board's width, so every row fits at 360 px.
- **Sound:** optional and off by default. The toggle sits right-aligned in the board's header: a small flap label reading SOUND OFF or SOUND ON, which flips when pressed. The first time the board settles in a visit, a quiet `graphite-4` hint ("Turn on for the board sound") appears below it and fades after about 4 s. It is never amber. With sound on, each flipping tile plays one real split-flap click (CC0 recordings, four variations, ±4% pitch, slight level change), capped at 8 voices and 3 per 22 ms, so a full board is a cascading clatter.
- **Accessibility and fallbacks:** the boarding line has sr-only text; the rows are an ordered list of links with their own names and descriptions (flight and remark); the tiles are hidden from assistive tech. Reduced motion and no-JavaScript show the settled board, and the row links work as plain anchors.

### Sound (Phase 3b)

- **One system** (`src/lib/sound.ts`) and one preference, off by default. Only three things make a sound: the board's flaps, the corner sign's chime on opening, and the passport stamps landing. Nothing on hover, links or ordinary buttons.
- **Gestures:** switching the toggle on unlocks audio and plays a short confirmation flap. A preference saved as on waits silently for the first click, tap or key press. Scrolling alone never starts audio (a browser rule).
- **Weight:** sound files load only once sound is on: Opus in WebM, with AAC in M4A as a fallback. The chosen set is about 19 KB. The master volume is gentle, and nothing plays while the tab is hidden.
- **The chime:** the owner's recorded two-tone cabin PA chime, as recorded (about 2 s). A synthesised two-tone chime is the fallback.

### Passport stamps (Gate 1, Phase 3b)

- **The page:** an open visa page on `--cabin`, the only surface where the inks keep 3:1. It has a faint guilloche pattern, a hairline fold with a soft shadow along the binding, and "VISAS" in small JetBrains Mono capitals. The `<h2>` is "My journey".
- **The stamps:** three border posts, three shapes. South Africa is a double-ringed circle, Mauritius a rounded rectangle, Malaysia an octagon. Each shows the country, port code, word (ADMITTED, ENTRY, or DEPARTED for South Africa, where no arrival year is known) and year, in JetBrains Mono capitals. The worn ink (uneven pressure, broken edges, dry speckle, slight bleed) is baked into a static mask by `pnpm stamps:build`. CSS tints it with `--ink-za`, `--ink-mu` and `--ink-my` at 86%, with a slight rotation (within ±6°) and a little overlap. No runtime filters.
- **Motion:** the stamps land one at a time in date order, each at about 60% into the viewport: a 180 ms ease-in press from 1.06 scale and a few pixels higher, then the ink takes (a slight spread and darkening over 250 ms). The thunk plays on contact if sound is on. They land once per page load. Under reduced motion they are simply there.
- **Layout and text:** scattered across the page on wider screens, reading top left to bottom right; stacked one per row on phones. The real content is an ordered list (country `h3`, years in mono `graphite-4`, the line in `paper-muted`). The stamp art is `aria-hidden`.

### Seat sign (corner navigation, Phase 3a tweak)

- **Look:** a fixed top-right pill like an illuminated cabin sign: near-black, hairline `--graphite-2` border, small flap tiles in JetBrains Mono capitals ("GATE 2 · SELECTED WORK"; phones "GATE 2"; on the board, "DEPARTURES"), and a small chevron. The pill fits its label. The wordmark sits top left, exactly where the landing's wordmark is, and links back to the top.
- **Behaviour:** hidden through the whole window sequence; it fades in once the curtain rise is complete and out again on scrolling back into the sequence. The label flips on small tiles in under 400 ms. It opens a compact departures list (a Radix Popover): gate, destination, remark (matching the board), the current one in amber. Opening it plays the cabin chime when sound is on (closing is silent), and its foot carries the same sound toggle as the board. Choosing one glides there; Escape, an outside click or a choice closes it with focus back on the button. No motion under reduced motion. Inside the safe areas, and inside the board's and sections' top padding.

### Selected work (Gate 2, Phase 4a)

- **Featured flights:** six strips in a row (JB 201 to 206), adapted from Skiper UI 52 (ExpandOnHover) with `motion/react` (the slim `m` build) and `spring.soft`. Hover or keyboard focus opens a strip (flex-grow 10 to 1) while the others narrow; the open strip's image box is exactly 16:10, the screenshots' shape, so the image shows whole, with the emblem (livery in amber), flight code, name, summary (two lines) and "View flight →" in a band below. Closed strips are the image, full height and darkened, with the code and name running up them; no bar. The image inside never resizes while the strips move: it is as wide as an open strip and only revealed. Clicking opens the project page. Phones: the strips stack (76 px closed); the first tap opens one (its image at full width, the details below, height to fit), the second tap or View flight opens the page. Nothing depends on hover. Reduced motion: no expand animation, the detail swaps instantly. An ordered list of links named "JB 201: Payments fraud detection", described by the summary.
- **Main images at 16:10:** `pnpm projects:build` extends a main image of another shape to 16:10 with its own flat edge colour (or, for the Touch 'n Go title slide, black with its edges feathered), so it is never cropped or stretched. Photographs and busy screenshots are left as they are.
- **All flights:** the other eleven (JB 207 onwards, newest first) as a flight manifest under "ALL FLIGHTS" in small mono capitals: code, emblem and a small plane glyph, name, the top three stack items, year and an arrow, with the summary below the name. The board's hover (a faint `graphite-1` panel) and the amber focus ring. Phones: code and year, then the emblem and name; nothing scrolls sideways at 360 px.
- **Emblems:** one tail fin in profile (`cabin` fill, `graphite-3` hairline) for every project, with a livery from a small set (stripe, twin stripes, chevron, band, dot, arc) and one or two letters in JetBrains Mono; no two projects match (`check:content`). The livery is `graphite-4`, and amber only on hover, focus or the current page. No real airline liveries or logos. Generated from `emblem: { letters, livery }` in `projects.ts`.
- **Posters:** where a project has no screenshot, a generated poster in the greys (emblem, flight code, name), so nothing looks broken.

### Project pages (/work/<slug>, Phase 4a)

- **Layout:** emblem and flight code, the name as the `h1`, role, context and dates in mono `graphite-4`, the summary; link buttons (live site, GitHub, design, the video on YouTube; only those that exist, opening in a new tab); the header image in colour; the stack as chips linking to the Tech stack section; the figures large in JetBrains Mono; the case study (Problem, What I did, Result; any field still an owner question is not shown); a flowchart where there is one; the other screenshots in colour with captions, each opening a full-screen view (a modal `dialog`); the video; then Previous flight and Next flight (site order, wrapping around) and Back to all flights.
- **The flight:** opening a featured project, the strip's image grows into the page's header image with the View Transitions API (520 ms, `--ease-out`; the rest cross-fades in 220 ms). Without the API, a 200 ms fade; under reduced motion, nothing.
- **Returning:** Back to all flights and the browser's back button land on the exact strip or row the visitor left (its distance from the top of the screen), with the scene already covered and no shade intro; the strip they opened is open again. Corner-sign links go straight to their section. The seat sign on a project page reads "JB 201 · FRAUD DETECTION" (phones "JB 201"); the wordmark goes home to the landing.
- **Flowcharts:** hairline boxes and arrows, JetBrains Mono labels, monochrome, amber only on an outcome. A flow is steps in order, optionally forking into a pair side by side and joining again (Touch 'n Go has two charts: data requests, and the ChatGPT workflows; Plandora has its evaluation pipeline). Left to right on wide screens, with boxes sized to their labels and the drawing never larger than its natural size, so every chart's text matches; top to bottom on phones. The arrows draw in step by step as it scrolls into view (static under reduced motion); screen readers get the steps as a list and a description. Generic labels only.
- **Videos:** a click-to-play facade (a self-hosted thumbnail and a play button); the `youtube-nocookie.com` player loads only when pressed.

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
