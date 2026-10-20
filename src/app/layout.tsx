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

// Runs before first paint. Lets CSS start the shade closed only when JavaScript will open it, and sets up
// the scroll restore (src/components/nav/site-state.ts): the browser's own restoration is off, a URL hash
// is taken off the address until the scroll sequence exists (so the browser does not jump to it first),
// and on a reload the saved section is the target. data-restore hides the landing text meanwhile.
const headScript = `(function(){var d=document.documentElement;d.classList.add('js');
try{history.scrollRestoration='manual'}catch(e){}
var t=null;if(location.hash.length>1){try{t=decodeURIComponent(location.hash.slice(1))}catch(e){}
window.__jbHash=t;history.replaceState(history.state,'',location.pathname+location.search)}
if(!t){try{var n=performance.getEntriesByType('navigation')[0];if(n&&(n.type==='reload'||n.type==='back_forward'))t=sessionStorage.getItem('jbbru:section')}catch(e){}}
if(t&&t!=='top'){window.__jbRestore=t;d.setAttribute('data-restore','')}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The background is also inline, so the very first paint is dark even before the stylesheet applies.
    <html lang="en-GB" className={fontVariables} style={{ backgroundColor: "#0a0a0a" }} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: headScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
