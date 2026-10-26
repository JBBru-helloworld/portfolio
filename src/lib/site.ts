const DEFAULT_SITE_URL = "https://jbbru.com";

/** Canonical origin of the site, without a trailing slash. */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL
).replace(/\/+$/, "");

/** The share cards (`pnpm og:build`, 1200 x 630 PNG), named for what they show. */
export const HOME_CARD = "/og/joshua-bonham-software-ml-engineer.png";
export const projectCard = (slug: string) => `/og/joshua-bonham-${slug}.png`;
