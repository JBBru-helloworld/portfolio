import type { SiteLinks } from "./types";

export const links: SiteLinks = {
  github: { label: "GitHub", url: "https://github.com/JBBru-helloworld", kind: "other" },
  linkedin: { label: "LinkedIn", url: "https://www.linkedin.com/in/joshuabonham03/", kind: "other" },
  instagram: { label: "Instagram", url: "https://www.instagram.com/jb_bru/", kind: "other" },
  // Kept in two parts and joined only in the browser, so the address never appears whole in the HTML.
  email: { label: "Email", user: "jb.brubusiness3", domain: "gmail.com" },
  // Built by `pnpm resume:build` from the owner's PDF in assets/resume/; the shelf hides it until it exists.
  resume: { label: "Resume (PDF)", url: "/resume/joshua-bonham-resume.pdf", kind: "other" },
};
