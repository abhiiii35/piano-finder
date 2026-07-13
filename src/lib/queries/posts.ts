import { prisma } from "@/lib/prisma";
import { POST_STATUS } from "@/lib/constants";

export const POSTS_PER_PAGE = 9;

export async function getPublishedPosts(options: {
  page?: number;
  category?: string;
}) {
  const page = Math.max(1, options.page ?? 1);
  const where = {
    status: POST_STATUS.PUBLISHED,
    ...(options.category && { category: options.category }),
  };

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        coverImageUrl: true,
        category: true,
        publishedAt: true,
        author: { select: { name: true } },
      },
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * POSTS_PER_PAGE,
      take: POSTS_PER_PAGE,
    }),
    prisma.post.count({ where }),
  ]);

  return { posts, total, totalPages: Math.max(1, Math.ceil(total / POSTS_PER_PAGE)) };
}

export async function getPublishedPostBySlug(slug: string) {
  return prisma.post.findFirst({
    where: { slug, status: POST_STATUS.PUBLISHED },
    include: { author: { select: { name: true } } },
  });
}
