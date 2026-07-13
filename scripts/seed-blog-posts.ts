/**
 * Script to seed trigger-moment guide blog posts into the database.
 *
 * Usage:
 *   npx tsx scripts/seed-blog-posts.ts [--publish]
 *
 * Flags:
 *   --publish  : Publish posts immediately (default: draft status)
 *
 * This script creates blog posts for Pillar 2 (Trigger-moment guides) of the content pipeline.
 * Posts are tagged with their ICP (Ideal Customer Profile) for targeting.
 *
 * Safety: checks if posts already exist by slug before creating.
 */

import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { SEED_POSTS } from "../src/lib/seed-posts";

const args = process.argv.slice(2);
const shouldPublish = args.includes("--publish");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "..", "dev.db");

const adapter = new PrismaBetterSqlite3({
  url: `file:${dbPath}`,
});

const prisma = new PrismaClient({
  adapter,
});

async function seedBlogPosts(): Promise<void> {
  console.log("[seed-blog-posts] Starting...\n");

  const adminUser = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });

  if (!adminUser) {
    console.error(
      "[seed-blog-posts] ERROR: No admin user found. Ensure database is seeded with users first."
    );
    process.exit(1);
  }

  console.log(`[seed-blog-posts] Using admin user: ${adminUser.email}\n`);

  let created = 0;
  let skipped = 0;

  for (const seedPost of SEED_POSTS) {
    const existing = await prisma.post.findUnique({
      where: { slug: seedPost.slug },
      select: { id: true, status: true },
    });

    if (existing) {
      console.log(`[seed-blog-posts] SKIP: "${seedPost.title}" (already exists)`);
      skipped++;
      continue;
    }

    await prisma.post.create({
      data: {
        slug: seedPost.slug,
        title: seedPost.title,
        excerpt: seedPost.excerpt,
        contentHtml: seedPost.contentHtml,
        category: seedPost.category,
        tags: JSON.stringify(seedPost.tags),
        status: shouldPublish ? "PUBLISHED" : "DRAFT",
        authorId: adminUser.id,
        publishedAt: shouldPublish ? new Date() : null,
        seoTitle: seedPost.seoTitle,
        seoDescription: seedPost.seoDescription,
        isHowTo: seedPost.isHowTo,
      },
    });

    const statusLabel = shouldPublish ? "PUBLISHED" : "DRAFT";
    console.log(
      `[seed-blog-posts] CREATE: "${seedPost.title}" (${statusLabel})`
    );
    created++;
  }

  console.log(
    `\n[seed-blog-posts] Done. Created: ${created}, Skipped: ${skipped}`
  );

  if (shouldPublish) {
    console.log("[seed-blog-posts] All posts published and ready to view on /blog");
  } else {
    console.log(
      "[seed-blog-posts] Posts created as DRAFT. Review in admin dashboard before publishing."
    );
    console.log("[seed-blog-posts] Rerun with --publish flag to create them published.");
  }
}

seedBlogPosts()
  .catch((error) => {
    console.error("[seed-blog-posts] FATAL:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
