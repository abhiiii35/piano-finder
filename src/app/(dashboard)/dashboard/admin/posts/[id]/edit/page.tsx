import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { PostEditor } from "@/components/blog/post-editor";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== ROLES.ADMIN) redirect("/dashboard");

  const { id } = await params;
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold text-foreground">Edit Post</h1>
      <p className="mt-1 text-sm text-muted-foreground">{post.title}</p>
      <div className="mt-8">
        <PostEditor post={post} />
      </div>
    </div>
  );
}
