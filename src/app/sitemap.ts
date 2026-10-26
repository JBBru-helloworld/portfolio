import type { MetadataRoute } from "next";
import { projects } from "@/content";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${siteUrl}/`, changeFrequency: "monthly", priority: 1 },
    ...projects.map((p) => ({
      url: `${siteUrl}/work/${p.slug}`,
      changeFrequency: "yearly" as const,
      priority: p.featured ? 0.8 : 0.5,
    })),
  ];
}
