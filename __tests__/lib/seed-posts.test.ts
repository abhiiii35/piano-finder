import { describe, it, expect } from "vitest";
import { SEED_POSTS } from "@/lib/seed-posts";

describe("seed-posts", () => {
  it("exports array of seed posts", () => {
    expect(Array.isArray(SEED_POSTS)).toBe(true);
    expect(SEED_POSTS.length).toBeGreaterThan(0);
  });

  it("all posts have required fields", () => {
    for (const post of SEED_POSTS) {
      expect(post.slug).toBeTruthy();
      expect(typeof post.slug).toBe("string");
      expect(post.title).toBeTruthy();
      expect(post.excerpt).toBeTruthy();
      expect(post.contentHtml).toBeTruthy();
      expect(post.category).toBeTruthy();
      expect(Array.isArray(post.tags)).toBe(true);
      expect(post.seoTitle).toBeTruthy();
      expect(post.seoDescription).toBeTruthy();
      expect(typeof post.isHowTo).toBe("boolean");
    }
  });

  it("all slugs are unique", () => {
    const slugs = SEED_POSTS.map((p) => p.slug);
    const unique = new Set(slugs);
    expect(unique.size).toBe(slugs.length);
  });

  it("post categories are valid blog categories", () => {
    const validCategories = [
      "Tuning",
      "Maintenance",
      "Repair",
      "Buying Guides",
      "How-To",
      "News",
    ];

    for (const post of SEED_POSTS) {
      expect(validCategories).toContain(post.category);
    }
  });

  it("SEO descriptions are concise", () => {
    for (const post of SEED_POSTS) {
      expect(post.seoDescription.length).toBeLessThanOrEqual(160);
    }
  });

  it("content HTML contains expected sections", () => {
    for (const post of SEED_POSTS) {
      expect(post.contentHtml).toContain("<h2>");
      expect(post.contentHtml).toContain("</h2>");
      expect(post.contentHtml.length).toBeGreaterThan(200);
    }
  });

  it("includes trigger-moment guides as expected", () => {
    const slugs = SEED_POSTS.map((p) => p.slug);
    expect(slugs).toContain("new-piano-first-year-schedule");
    expect(slugs).toContain("piano-move-tuning-guide");
    expect(slugs).toContain("inherited-piano-worth-tuning");
    expect(slugs).toContain("student-piano-tuning-frequency");
  });
});
