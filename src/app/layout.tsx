import type { Metadata, Viewport } from "next";
import { profile } from "@/content";
import { fontVariables } from "@/lib/fonts";
import { siteUrl } from "@/lib/site";
import "lenis/dist/lenis.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: profile.name,
  description: `${profile.name}: ${profile.roleLines.default}.`,
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  colorScheme: "dark",
};

// Runs before first paint: lets CSS start the shade closed only when JavaScript will open it.
const jsFlag = "document.documentElement.classList.add('js')";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The background is also inline, so the very first paint is dark even before the stylesheet applies.
    <html lang="en-GB" className={fontVariables} style={{ backgroundColor: "#0a0a0a" }} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: jsFlag }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
