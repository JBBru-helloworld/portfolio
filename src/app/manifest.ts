import type { MetadataRoute } from "next";
import { profile } from "@/content";

/** The web manifest: the JB tail fin in paper on void (`pnpm brand:build`). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: profile.name,
    short_name: "JB Air",
    description: `${profile.name}: ${profile.roleLines.default}.`,
    start_url: "/",
    display: "browser",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
