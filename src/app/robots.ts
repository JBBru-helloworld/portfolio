import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/** robots.txt: everything may be crawled; the sitemap lists the home page and every project page. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
