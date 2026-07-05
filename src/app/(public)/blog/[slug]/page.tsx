import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { getPublishedPostBySlug } from "@/lib/queries/posts";
import { siteUrl } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) return {};

  const title = post.seoTitle ?? post.title;
  const description = post.seoDescription ?? post.excerpt;

  return {
    title: `${title} | Book A Piano Tuner`,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title,
      description,
      url: `/blog/${post.slug}`,
      type: "article",
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: post.author.name ? [post.author.name] : undefined,
      ...(post.coverImageUrl && { images: [post.coverImageUrl] }),
    },
  };
}

function parseTags(tags: string): string[] {
  try {
    const arr = JSON.parse(tags);
    return Array.isArray(arr) ? arr.filter((t) => typeof t === "string") : [];
  } catch {
    return [];
  }
}

// Extracts the items of the first ordered list for HowTo structured data.
function extractSteps(html: string): string[] {
  const ol = html.match(/<ol[^>]*>([\s\S]*?)<\/ol>/i);
  if (!ol) return [];
  return [...ol[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((m) => m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) notFound();

  const description = post.seoDescription ?? post.excerpt;
  const authorName = post.author.name ?? "Book A Piano Tuner";
  const tags = parseTags(post.tags);

  const jsonLd: object[] = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.title,
      description,
      ...(post.coverImageUrl && { image: [post.coverImageUrl] }),
      datePublished: post.publishedAt?.toISOString(),
      dateModified: post.updatedAt.toISOString(),
      author: { "@type": "Person", name: authorName },
      publisher: { "@type": "Organization", name: "Book A Piano Tuner", url: siteUrl },
      mainEntityOfPage: { "@type": "WebPage", "@id": `${siteUrl}/blog/${post.slug}` },
      ...(tags.length > 0 && { keywords: tags.join(", ") }),
    },
  ];

  if (post.isHowTo) {
    const steps = extractSteps(post.contentHtml);
    if (steps.length > 0) {
      jsonLd.push({
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: post.title,
        description,
        ...(post.coverImageUrl && { image: [post.coverImageUrl] }),
        step: steps.map((text, i) => ({
          "@type": "HowToStep",
          position: i + 1,
          text,
        })),
      });
    }
  }

  return (
    <article className="mx-auto max-w-3xl">
      {jsonLd.map((data, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(data).replace(/</g, "\\u003c"),
          }}
        />
      ))}

      <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to blog
      </Link>

      <header className="mt-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-primary">
          {post.category}
        </span>
        <h1 className="mt-2 text-3xl font-bold text-foreground">{post.title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          By {authorName}
          {post.publishedAt && ` · ${format(post.publishedAt, "MMMM d, yyyy")}`}
        </p>
      </header>

      {post.coverImageUrl && (
        <img
          src={post.coverImageUrl}
          alt={post.title}
          className="mt-6 aspect-[16/9] w-full rounded-xl object-cover"
        />
      )}

      {/* contentHtml is sanitized server-side in the post actions before it is stored */}
      <div
        className="rich-text mt-8"
        dangerouslySetInnerHTML={{ __html: post.contentHtml }}
      />

      {tags.length > 0 && (
        <div className="mt-10 flex flex-wrap gap-2 border-t border-border pt-6">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
