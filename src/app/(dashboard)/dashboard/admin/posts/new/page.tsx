import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { PostEditor } from "@/components/blog/post-editor";

export default async function NewPostPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== ROLES.ADMIN) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold text-foreground">New Post</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Write a new article for the blog
      </p>
      <div className="mt-8">
        <PostEditor />
      </div>
    </div>
  );
}
