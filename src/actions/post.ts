"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES, POST_STATUS } from "@/lib/constants";
import { sanitizePostHtml } from "@/lib/sanitize";
import { postSchema } from "@/lib/validations/post";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function tagsToJson(tags?: string): string {
  if (!tags) return "[]";
  return JSON.stringify(
    tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
  );
}

async function uniqueSlug(base: string, excludePostId?: string): Promise<string> {
  let slug = base;
  for (let i = 2; ; i++) {
    const existing = await prisma.post.findUnique({ where: { slug } });
    if (!existing || existing.id === excludePostId) return slug;
    slug = `${base}-${i}`;
  }
}

function revalidateBlog(slug: string) {
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  revalidatePath("/sitemap.xml");
}

export async function createPost(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== ROLES.ADMIN) {
    return { error: "Only admins can manage posts" };
  }

  const raw = Object.fromEntries(formData.entries());
  const result = postSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const data = result.data;
  const base = slugify(data.slug || data.title);
  if (!base) return { error: "Title must contain letters or numbers" };
  const slug = await uniqueSlug(base);

  const post = await prisma.post.create({
    data: {
      slug,
      title: data.title,
      excerpt: data.excerpt,
      contentHtml: sanitizePostHtml(data.contentHtml),
      coverImageUrl: data.coverImageUrl || null,
      category: data.category,
      tags: tagsToJson(data.tags),
      status: data.status,
      authorId: session.user.id,
      publishedAt: data.status === POST_STATUS.PUBLISHED ? new Date() : null,
      seoTitle: data.seoTitle || null,
      seoDescription: data.seoDescription || null,
      isHowTo: data.isHowTo,
    },
  });

  revalidateBlog(slug);
  return { success: true, postId: post.id, slug };
}

export async function updatePost(postId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== ROLES.ADMIN) {
    return { error: "Only admins can manage posts" };
  }

  const existing = await prisma.post.findUnique({ where: { id: postId } });
  if (!existing) return { error: "Post not found" };

  const raw = Object.fromEntries(formData.entries());
  const result = postSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const data = result.data;
  const base = slugify(data.slug || data.title);
  if (!base) return { error: "Title must contain letters or numbers" };
  const slug = await uniqueSlug(base, postId);

  await prisma.post.update({
    where: { id: postId },
    data: {
      slug,
      title: data.title,
      excerpt: data.excerpt,
      contentHtml: sanitizePostHtml(data.contentHtml),
      coverImageUrl: data.coverImageUrl || null,
      category: data.category,
      tags: tagsToJson(data.tags),
      status: data.status,
      publishedAt:
        data.status === POST_STATUS.PUBLISHED
          ? existing.publishedAt ?? new Date()
          : null,
      seoTitle: data.seoTitle || null,
      seoDescription: data.seoDescription || null,
      isHowTo: data.isHowTo,
    },
  });

  revalidateBlog(existing.slug);
  if (slug !== existing.slug) revalidateBlog(slug);
  return { success: true, postId, slug };
}

export async function deletePost(postId: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== ROLES.ADMIN) {
    return { error: "Only admins can manage posts" };
  }

  const existing = await prisma.post.findUnique({ where: { id: postId } });
  if (!existing) return { error: "Post not found" };

  await prisma.post.delete({ where: { id: postId } });

  revalidateBlog(existing.slug);
  return { success: true };
}
