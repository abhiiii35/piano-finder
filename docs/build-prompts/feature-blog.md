# Build prompt: Blog + SEO (Feature 4)

Paste the block below into Claude Code from the repo root. Run at high effort.

---

I'm adding an SEO content section to Piano Finder, a Next.js 16 marketplace for piano technicians. Non-technical staff must be able to write and publish posts from inside the app without touching code or markdown, and posts must rank well in search.

Build a database-backed blog with an in-dashboard rich-text editor and fully SEO-optimized public pages.

First read, and follow the conventions in, `CLAUDE.md` and `AGENTS.md`. Then read `prisma/schema.prisma`, one existing domain end to end (`src/actions/job.ts`, `src/lib/validations/job.ts`, `src/app/(public)/jobs`), and how `src/lib/cloudinary.ts` is used, so the blog matches existing patterns exactly.

Scope:
- Prisma `Post` model: id, slug (unique), title, excerpt, contentHtml, coverImageUrl (optional), category, tags (JSON text), status (DRAFT | PUBLISHED), authorId, publishedAt (optional), seoTitle (optional), seoDescription (optional), isHowTo (Boolean), createdAt, updatedAt. Add the migration.
- Authoring is restricted to ADMIN role. Reuse the existing role checks used by `dashboard/admin`.
- Editor: default to a no-code WYSIWYG editor (Tiptap is the recommended choice for React 19 + Next 16) with a toolbar for headings, bold, italic, ordered and unordered lists, links, and image upload through the existing Cloudinary path, so non-technical staff never see markup. Add a toggle to a markdown editing mode for technical authors who prefer it, with a live preview. Both modes are two views of the same document: markdown is converted to HTML on save and the toolbar edits round-trip cleanly, so switching modes never loses content. For how-to posts, the editor must support an ordered step list in both modes.
- Store content as HTML. Sanitize it server-side on save (for example with `sanitize-html`) so a compromised or careless author cannot inject scripts. Never render unsanitized author HTML.
- Public routes in the `(public)` group: `/blog` (paginated index with category filter) and `/blog/[slug]` (single post, published only). Dashboard routes: list, new, and edit under the admin area.
- SEO: per-post `generateMetadata` with title, description, canonical URL, and Open Graph tags; JSON-LD `Article` structured data on every post and `HowTo` structured data when `isHowTo` is true; App Router `sitemap.ts` and `robots.ts` that include published posts.

Before writing SEO markup, confirm the current App Router conventions for `sitemap.ts`, `robots.ts`, and `generateMetadata` against `node_modules/next/dist/docs/` rather than relying on older Next.js knowledge.

Don't add features, refactor unrelated code, or introduce abstractions beyond what this needs. Do the simplest thing that works and matches the existing structure.

Never render unsanitized HTML, and never expose DRAFT posts on any public route or in its JSON payload.

Before reporting done, verify:
- A logged-out visitor sees only PUBLISHED posts at `/blog` and `/blog/[slug]`; DRAFT posts 404 publicly.
- An ADMIN can create a post in the WYSIWYG editor, upload an image, save a draft, publish it, and edit it, and a technical author can switch to markdown mode and back without losing content.
- A published post appears in `sitemap.xml`, has a canonical tag and OG tags, and passes a structured-data validator for `Article` (and `HowTo` where used).
- Vitest unit tests cover the post server actions with mocked Prisma, plus one Playwright path from create to public view.
- Each completion claim maps to a real command output this session; if a check fails, say so with the output.

Lead with the outcome when you report back: first sentence says what shipped and whether tests pass, then anything you need from me.
