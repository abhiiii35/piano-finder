import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  prismaMock,
  mockAdminSession,
  mockCustomerSession,
  fixtures,
  makeFormData,
} from "../helpers/mocks";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { createPost, updatePost, deletePost } from "@/actions/post";

const mockGetSession = vi.mocked(getServerSession);

function validPostForm(overrides: Record<string, string> = {}) {
  return makeFormData({
    title: "How Often Should You Tune Your Piano?",
    excerpt: "Most pianos need tuning twice a year. Here's why.",
    contentHtml: "<h2>Tuning frequency</h2><p>Twice a year is typical.</p>",
    category: "Tuning",
    tags: "tuning, maintenance",
    status: "DRAFT",
    ...overrides,
  });
}

describe("createPost", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a draft with a slug generated from the title", async () => {
    mockGetSession.mockResolvedValue(mockAdminSession());
    prismaMock.post.findUnique.mockResolvedValue(null);
    prismaMock.post.create.mockResolvedValue({ id: "new-post" });

    const result = await createPost(validPostForm());
    expect(result.success).toBe(true);
    expect(result.slug).toBe("how-often-should-you-tune-your-piano");

    const call = prismaMock.post.create.mock.calls[0][0];
    expect(call.data.slug).toBe("how-often-should-you-tune-your-piano");
    expect(call.data.status).toBe("DRAFT");
    expect(call.data.publishedAt).toBeNull();
    expect(call.data.authorId).toBe("admin-1");
    expect(call.data.tags).toBe(JSON.stringify(["tuning", "maintenance"]));
    expect(call.data.isHowTo).toBe(false);
  });

  it("rejects a non-admin user", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    const result = await createPost(validPostForm());
    expect(result.error).toContain("Only admins");
    expect(prismaMock.post.create).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated user", async () => {
    mockGetSession.mockResolvedValue(null);
    const result = await createPost(validPostForm());
    expect(result.error).toContain("Only admins");
  });

  it("strips script tags and event handlers from content", async () => {
    mockGetSession.mockResolvedValue(mockAdminSession());
    prismaMock.post.findUnique.mockResolvedValue(null);
    prismaMock.post.create.mockResolvedValue({ id: "new-post" });

    await createPost(
      validPostForm({
        contentHtml:
          '<p onclick="steal()">Hello</p><script>alert("xss")</script>' +
          '<img src="x" onerror="steal()"><a href="javascript:steal()">link</a>',
      })
    );

    const html = prismaMock.post.create.mock.calls[0][0].data.contentHtml;
    expect(html).not.toContain("<script");
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("onerror");
    expect(html).not.toContain("javascript:");
    expect(html).toContain("<p>Hello</p>");
  });

  it("sets publishedAt when creating as published", async () => {
    mockGetSession.mockResolvedValue(mockAdminSession());
    prismaMock.post.findUnique.mockResolvedValue(null);
    prismaMock.post.create.mockResolvedValue({ id: "new-post" });

    await createPost(validPostForm({ status: "PUBLISHED" }));

    const call = prismaMock.post.create.mock.calls[0][0];
    expect(call.data.status).toBe("PUBLISHED");
    expect(call.data.publishedAt).toBeInstanceOf(Date);
  });

  it("appends a suffix when the slug is taken", async () => {
    mockGetSession.mockResolvedValue(mockAdminSession());
    prismaMock.post.findUnique
      .mockResolvedValueOnce(fixtures.post) // base slug taken
      .mockResolvedValueOnce(null); // "-2" available
    prismaMock.post.create.mockResolvedValue({ id: "new-post" });

    const result = await createPost(validPostForm());
    expect(result.slug).toBe("how-often-should-you-tune-your-piano-2");
  });

  it("uses a provided slug instead of the title", async () => {
    mockGetSession.mockResolvedValue(mockAdminSession());
    prismaMock.post.findUnique.mockResolvedValue(null);
    prismaMock.post.create.mockResolvedValue({ id: "new-post" });

    const result = await createPost(validPostForm({ slug: "custom-slug" }));
    expect(result.slug).toBe("custom-slug");
  });

  it("returns a validation error for a missing title", async () => {
    mockGetSession.mockResolvedValue(mockAdminSession());
    const result = await createPost(validPostForm({ title: "" }));
    expect(result.error).toBeDefined();
    expect(prismaMock.post.create).not.toHaveBeenCalled();
  });

  it("parses the isHowTo checkbox value", async () => {
    mockGetSession.mockResolvedValue(mockAdminSession());
    prismaMock.post.findUnique.mockResolvedValue(null);
    prismaMock.post.create.mockResolvedValue({ id: "new-post" });

    await createPost(validPostForm({ isHowTo: "true" }));
    expect(prismaMock.post.create.mock.calls[0][0].data.isHowTo).toBe(true);
  });
});

describe("updatePost", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a non-admin user", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    const result = await updatePost("post-1", validPostForm());
    expect(result.error).toContain("Only admins");
  });

  it("returns an error when the post does not exist", async () => {
    mockGetSession.mockResolvedValue(mockAdminSession());
    prismaMock.post.findUnique.mockResolvedValue(null);
    const result = await updatePost("missing", validPostForm());
    expect(result.error).toContain("not found");
  });

  it("sets publishedAt the first time a draft is published", async () => {
    mockGetSession.mockResolvedValue(mockAdminSession());
    prismaMock.post.findUnique
      .mockResolvedValueOnce({ ...fixtures.post, status: "DRAFT", publishedAt: null })
      .mockResolvedValueOnce({ ...fixtures.post, status: "DRAFT", publishedAt: null }); // own slug
    prismaMock.post.update.mockResolvedValue({});

    const result = await updatePost("post-1", validPostForm({ status: "PUBLISHED" }));
    expect(result.success).toBe(true);

    const call = prismaMock.post.update.mock.calls[0][0];
    expect(call.data.publishedAt).toBeInstanceOf(Date);
  });

  it("keeps the original publishedAt when an already-published post is edited", async () => {
    const originalDate = new Date("2026-06-01T12:00:00Z");
    mockGetSession.mockResolvedValue(mockAdminSession());
    prismaMock.post.findUnique
      .mockResolvedValueOnce({ ...fixtures.post, publishedAt: originalDate })
      .mockResolvedValueOnce({ ...fixtures.post, publishedAt: originalDate });
    prismaMock.post.update.mockResolvedValue({});

    await updatePost("post-1", validPostForm({ status: "PUBLISHED" }));
    expect(prismaMock.post.update.mock.calls[0][0].data.publishedAt).toBe(originalDate);
  });

  it("clears publishedAt when a post is unpublished back to draft", async () => {
    mockGetSession.mockResolvedValue(mockAdminSession());
    prismaMock.post.findUnique
      .mockResolvedValueOnce(fixtures.post)
      .mockResolvedValueOnce(fixtures.post);
    prismaMock.post.update.mockResolvedValue({});

    await updatePost("post-1", validPostForm({ status: "DRAFT" }));
    expect(prismaMock.post.update.mock.calls[0][0].data.publishedAt).toBeNull();
  });

  it("sanitizes updated content", async () => {
    mockGetSession.mockResolvedValue(mockAdminSession());
    prismaMock.post.findUnique
      .mockResolvedValueOnce(fixtures.post)
      .mockResolvedValueOnce(fixtures.post);
    prismaMock.post.update.mockResolvedValue({});

    await updatePost(
      "post-1",
      validPostForm({ contentHtml: '<p>ok</p><script>alert("xss")</script>' })
    );
    const html = prismaMock.post.update.mock.calls[0][0].data.contentHtml;
    expect(html).not.toContain("<script");
    expect(html).toContain("<p>ok</p>");
  });
});

describe("deletePost", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a non-admin user", async () => {
    mockGetSession.mockResolvedValue(mockCustomerSession());
    const result = await deletePost("post-1");
    expect(result.error).toContain("Only admins");
    expect(prismaMock.post.delete).not.toHaveBeenCalled();
  });

  it("returns an error when the post does not exist", async () => {
    mockGetSession.mockResolvedValue(mockAdminSession());
    prismaMock.post.findUnique.mockResolvedValue(null);
    const result = await deletePost("missing");
    expect(result.error).toContain("not found");
  });

  it("deletes an existing post", async () => {
    mockGetSession.mockResolvedValue(mockAdminSession());
    prismaMock.post.findUnique.mockResolvedValue(fixtures.post);
    prismaMock.post.delete.mockResolvedValue({});

    const result = await deletePost("post-1");
    expect(result.success).toBe(true);
    expect(prismaMock.post.delete).toHaveBeenCalledWith({ where: { id: "post-1" } });
  });
});
