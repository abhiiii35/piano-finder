import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

const PUBLISHED_TITLE = "E2E Published Post";
const PUBLISHED_SLUG = "e2e-published-post";
const DRAFT_TITLE = "E2E Draft Post";
const DRAFT_SLUG = "e2e-draft-post";

test.describe.serial("blog", () => {
  test("admin creates a post in the WYSIWYG editor, round-trips markdown, and publishes", async ({
    page,
  }) => {
    await signIn(page, "admin@test.com", "password123");

    await page.goto("/dashboard/admin/posts");
    await page.getByRole("link", { name: "New Post" }).click();
    await page.waitForURL(/\/dashboard\/admin\/posts\/new/);

    await page.locator('input[name="title"]').fill(PUBLISHED_TITLE);
    await page.locator('select[name="category"]').selectOption("Tuning");
    await page.locator('input[name="tags"]').fill("e2e, tuning");
    await page
      .locator('textarea[name="excerpt"]')
      .fill("An end-to-end test post about piano tuning.");

    // Type in the WYSIWYG editor (contenteditable)
    const editor = page.locator('[data-testid="post-content"]');
    await editor.click();
    await page.keyboard.type("Pianos drift out of tune as seasons change.");

    // Switch to markdown mode — typed content must survive
    await page.getByRole("button", { name: "Edit as Markdown" }).click();
    const markdown = page.locator("#markdown");
    await expect(markdown).toHaveValue(/Pianos drift out of tune/);

    // Extend the document in markdown, then switch back — nothing lost
    await markdown.fill(
      "Pianos drift out of tune as seasons change.\n\n## Tuning schedule\n\n1. Book a spring tuning\n2. Book a fall tuning"
    );
    await page.getByRole("button", { name: "Back to Visual Editor" }).click();
    await expect(editor).toContainText("Pianos drift out of tune");
    await expect(editor.locator("h2")).toHaveText("Tuning schedule");
    await expect(editor.locator("ol li")).toHaveCount(2);

    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await page.waitForURL(/\/dashboard\/admin\/posts$/);
    const row = page
      .locator("div", { has: page.getByRole("link", { name: PUBLISHED_TITLE }) })
      .last();
    await expect(row.getByText("published")).toBeVisible();
  });

  test("admin can edit the published post", async ({ page }) => {
    await signIn(page, "admin@test.com", "password123");
    await page.goto("/dashboard/admin/posts");
    await page.getByRole("link", { name: PUBLISHED_TITLE }).click();
    await page.waitForURL(/\/edit$/);

    // Saved content loads back into the editor
    const editor = page.locator('[data-testid="post-content"]');
    await expect(editor).toContainText("Pianos drift out of tune");

    await page
      .locator('textarea[name="excerpt"]')
      .fill("An end-to-end test post about piano tuning, updated.");
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await page.waitForURL(/\/dashboard\/admin\/posts$/);
  });

  test("admin saves a draft", async ({ page }) => {
    await signIn(page, "admin@test.com", "password123");
    await page.goto("/dashboard/admin/posts/new");

    await page.locator('input[name="title"]').fill(DRAFT_TITLE);
    await page.locator('select[name="category"]').selectOption("News");
    await page.locator('textarea[name="excerpt"]').fill("A draft that must stay private.");
    const editor = page.locator('[data-testid="post-content"]');
    await editor.click();
    await page.keyboard.type("Draft content not for public eyes.");

    await page.getByRole("button", { name: "Save Draft" }).click();
    await page.waitForURL(/\/dashboard\/admin\/posts$/);
    const row = page
      .locator("div", { has: page.getByRole("link", { name: DRAFT_TITLE }) })
      .last();
    await expect(row.getByText("draft")).toBeVisible();
  });

  test("logged-out visitor sees the published post with SEO markup; draft 404s", async ({
    page,
  }) => {
    // Index lists only the published post
    await page.goto("/blog");
    await expect(page.getByRole("heading", { name: "Piano Care Blog" })).toBeVisible();
    await expect(page.getByText(PUBLISHED_TITLE)).toBeVisible();
    await expect(page.getByText(DRAFT_TITLE)).toHaveCount(0);

    // Published post renders with canonical, OG tags, and Article JSON-LD
    const response = await page.goto(`/blog/${PUBLISHED_SLUG}`);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: PUBLISHED_TITLE })).toBeVisible();
    await expect(page.getByText("Pianos drift out of tune")).toBeVisible();

    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute("href", new RegExp(`/blog/${PUBLISHED_SLUG}$`));
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute("content", PUBLISHED_TITLE);
    const jsonLd = await page
      .locator('script[type="application/ld+json"]')
      .first()
      .textContent();
    expect(JSON.parse(jsonLd!)["@type"]).toBe("Article");

    // Draft is not reachable publicly
    const draftResponse = await page.goto(`/blog/${DRAFT_SLUG}`);
    expect(draftResponse?.status()).toBe(404);

    // Published post is in the sitemap; the draft is not
    const sitemap = await page.request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    const xml = await sitemap.text();
    expect(xml).toContain(`/blog/${PUBLISHED_SLUG}`);
    expect(xml).not.toContain(DRAFT_SLUG);
  });
});
