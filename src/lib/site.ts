const DEFAULT_SITE_URL = "https://jbbru.com";

/** Canonical origin of the site, without a trailing slash. */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL
).replace(/\/+$/, "");
