import type { MetadataRoute } from "next";
import { CITY_COSTS } from "@/lib/seo/city-cost-data";

const BASE_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/search`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/piano-tuning-cost`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/piano-tuning-cost/pitch-raise`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  const cityRoutes: MetadataRoute.Sitemap = CITY_COSTS.map((city) => ({
    url: `${BASE_URL}/piano-tuning-cost/${city.slug}`,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...cityRoutes];
}
