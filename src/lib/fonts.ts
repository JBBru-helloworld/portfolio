import localFont from "next/font/local";

/*
 * Self-hosted, Latin-subset variable fonts (SIL OFL 1.1). Built by scripts/subset-fonts.py
 * from the google/fonts sources; licences sit next to the files in src/fonts/.
 */

/** Display and body. Variable weight 400 to 600, width pinned to 100. */
export const instrumentSans = localFont({
  src: "../fonts/InstrumentSans-Latin-wght400-600.woff2",
  weight: "400 600",
  style: "normal",
  display: "swap",
  variable: "--font-instrument-sans",
});

/** Accent only: one word or short phrase inside a heading. Italic 400, optical size 24 to 72. */
export const newsreader = localFont({
  src: "../fonts/Newsreader-Italic-Latin-wght400-opsz24-72.woff2",
  weight: "400",
  style: "italic",
  display: "swap",
  variable: "--font-newsreader",
  preload: false,
});

/** Data, code and the departures board. Variable weight 400 to 500. Preloaded: the landing's flight deck,
 * passenger number and Scroll cue use it (Phase 6). Newsreader is not needed on the landing. */
export const jetbrainsMono = localFont({
  src: "../fonts/JetBrainsMono-Latin-wght400-500.woff2",
  weight: "400 500",
  style: "normal",
  display: "swap",
  variable: "--font-jetbrains-mono",
  preload: true,
});

export const fontVariables = [instrumentSans.variable, newsreader.variable, jetbrainsMono.variable].join(" ");
