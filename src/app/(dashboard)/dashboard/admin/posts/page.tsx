import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ROLES, POST_STATUS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { FileText, Plus } from "lucide-react";
import { format } from "date-fns";

export default async function AdminPostsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== ROLES.ADMIN) redirect("/dashboard");

  const posts = await prisma.post.findMany({
    select: {
      id: true,
      slug: true,
      title: true,
      category: true,
      status: true,
      updatedAt: true,
      author: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Blog Posts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Write and publish articles for the public blog
          </p>
        </div>
        <Link
          href="/dashboard/admin/posts/new"
          className="flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Post
        </Link>
      </div>

      <div className="mt-8">
        {posts.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">
              No posts yet. Write your first one!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div
                key={post.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/dashboard/admin/posts/${post.id}/edit`}
                    className="font-semibold text-foreground hover:underline"
                  >
                    {post.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {post.category} · {post.author.name} · Updated{" "}
                    {format(post.updatedAt, "MMM d, yyyy")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {post.status === POST_STATUS.PUBLISHED && (
                    <Link
                      href={`/blog/${post.slug}`}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      View
                    </Link>
                  )}
                  <span
                    className={
                      post.status === POST_STATUS.PUBLISHED
                        ? "rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground"
                        : "rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground"
                    }
                  >
                    {post.status.toLowerCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
