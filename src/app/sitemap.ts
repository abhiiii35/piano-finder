import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { POST_STATUS } from "@/lib/constants";
import { siteUrl } from "@/lib/site";
import { CITY_COSTS } from "@/lib/seo/city-cost-data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await prisma.post.findMany({
    where: { status: POST_STATUS.PUBLISHED },
    select: { slug: true, updatedAt: true },
    orderBy: { publishedAt: "desc" },
  });

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/search`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/blog`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/jobs`,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/piano-tuning-cost`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/piano-tuning-cost/pitch-raise`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  const cityRoutes: MetadataRoute.Sitemap = CITY_COSTS.map((city) => ({
    url: `${siteUrl}/piano-tuning-cost/${city.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const postRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${siteUrl}/blog/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...cityRoutes, ...postRoutes];
}
