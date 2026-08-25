import Link from "next/link";
import type { Metadata } from "next";
import { format } from "date-fns";
import { getPublishedPosts } from "@/lib/queries/posts";
import { BLOG_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Piano Care Blog | Book A Piano Tuner",
  description:
    "Expert advice on piano tuning, maintenance, and repair from professional piano technicians.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Piano Care Blog | Book A Piano Tuner",
    description:
      "Expert advice on piano tuning, maintenance, and repair from professional piano technicians.",
    url: "/blog",
    type: "website",
  },
};

function pageHref(page: number, category?: string) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/blog?${qs}` : "/blog";
}

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const category = params.category;

  const { posts, totalPages } = await getPublishedPosts({ page, category });

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-foreground">Piano Care Blog</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Expert advice on piano tuning, maintenance, and repair
        </p>
      </div>

      {/* Category filter */}
      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href="/blog"
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            !category
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          All
        </Link>
        {BLOG_CATEGORIES.map((c) => (
          <Link
            key={c}
            href={pageHref(1, c)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              category === c
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {c}
          </Link>
        ))}
      </div>

      {/* Posts */}
      <div className="mt-8">
        {posts.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-lg font-medium text-foreground">No posts yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Check back soon for piano care tips and guides
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="group block">
                <article className="h-full overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md">
                  {post.coverImageUrl && (
                    <img
                      src={post.coverImageUrl}
                      alt={post.title}
                      className="aspect-[16/9] w-full object-cover"
                    />
                  )}
                  <div className="p-5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                      {post.category}
                    </span>
                    <h2 className="mt-1.5 font-semibold text-foreground group-hover:underline">
                      {post.title}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-3">
                      {post.excerpt}
                    </p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {post.author.name}
                      {post.publishedAt &&
                        ` · ${format(post.publishedAt, "MMM d, yyyy")}`}
                    </p>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-3">
          {page > 1 ? (
            <Link
              href={pageHref(page - 1, category)}
              className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
            >
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={pageHref(page + 1, category)}
              className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
            >
              Older →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
