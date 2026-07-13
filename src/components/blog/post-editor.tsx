"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapImage from "@tiptap/extension-image";
import { marked } from "marked";
import TurndownService from "turndown";
import { toast } from "sonner";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link2,
  ImagePlus,
  ChevronDown,
  Trash2,
} from "lucide-react";
import { createPost, updatePost, deletePost } from "@/actions/post";
import { uploadPhoto } from "@/actions/photos";
import { sanitizePostHtml } from "@/lib/sanitize";
import { BLOG_CATEGORIES, POST_STATUS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

marked.setOptions({ async: false });

export type PostEditorData = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  contentHtml: string;
  coverImageUrl: string | null;
  category: string;
  tags: string;
  status: string;
  seoTitle: string | null;
  seoDescription: string | null;
  isHowTo: boolean;
};

function markdownToHtml(markdown: string): string {
  return marked.parse(markdown) as string;
}

function htmlToMarkdown(html: string): string {
  const turndown = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
  });
  return turndown.turndown(html);
}

function parseTags(tags: string): string {
  try {
    const arr = JSON.parse(tags);
    return Array.isArray(arr) ? arr.join(", ") : "";
  } catch {
    return "";
  }
}

function ToolbarButton({
  onClick,
  active,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "rounded-md p-2 transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function EditorToolbar({
  editor,
  onImageUpload,
  uploading,
}: {
  editor: Editor;
  onImageUpload: () => void;
  uploading: boolean;
}) {
  function setLink() {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previous ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border p-1.5">
      <ToolbarButton
        label="Heading 2"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Heading 3"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list (use for how-to steps)"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton label="Link" active={editor.isActive("link")} onClick={setLink}>
        <Link2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton label="Insert image" onClick={onImageUpload}>
        <ImagePlus className="h-4 w-4" />
      </ToolbarButton>
      {uploading && (
        <span className="ml-2 text-xs text-muted-foreground">Uploading…</span>
      )}
    </div>
  );
}

export function PostEditor({ post }: { post?: PostEditorData }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const contentImageRef = useRef<HTMLInputElement>(null);
  const coverImageRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingContent, setUploadingContent] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [mode, setMode] = useState<"wysiwyg" | "markdown">("wysiwyg");
  const [markdown, setMarkdown] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState(post?.coverImageUrl ?? "");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: { openOnClick: false },
      }),
      TiptapImage,
    ],
    content: post?.contentHtml ?? "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "rich-text min-h-[320px] px-4 py-3 focus:outline-none",
        "data-testid": "post-content",
      },
    },
  });

  function currentHtml(): string {
    if (mode === "markdown") return markdownToHtml(markdown);
    return editor?.getHTML() ?? "";
  }

  function toggleMode() {
    if (!editor) return;
    if (mode === "wysiwyg") {
      setMarkdown(htmlToMarkdown(editor.getHTML()));
      setMode("markdown");
    } else {
      editor.commands.setContent(markdownToHtml(markdown));
      setMode("wysiwyg");
    }
  }

  async function upload(file: File, folder: string): Promise<string | null> {
    const fd = new FormData();
    fd.set("file", file);
    fd.set("folder", folder);
    const result = await uploadPhoto(fd);
    if (result.error || !result.url) {
      toast.error(result.error ?? "Upload failed");
      return null;
    }
    return result.url;
  }

  async function handleContentImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !editor) return;
    setUploadingContent(true);
    const url = await upload(file, "blog");
    setUploadingContent(false);
    if (url) editor.chain().focus().setImage({ src: url, alt: file.name }).run();
  }

  async function handleCoverImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingCover(true);
    const url = await upload(file, "blog");
    setUploadingCover(false);
    if (url) setCoverImageUrl(url);
  }

  async function handleSave(status: string) {
    const form = formRef.current;
    if (!form || !form.reportValidity()) return;

    const html = currentHtml();
    if (!html || html === "<p></p>") {
      toast.error("Content is required");
      return;
    }

    setSaving(true);
    const fd = new FormData(form);
    fd.set("contentHtml", html);
    fd.set("status", status);
    fd.set("coverImageUrl", coverImageUrl);
    const result = post ? await updatePost(post.id, fd) : await createPost(fd);
    setSaving(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(status === POST_STATUS.PUBLISHED ? "Post published!" : "Draft saved");
      router.push("/dashboard/admin/posts");
      router.refresh();
    }
  }

  async function handleDelete() {
    if (!post) return;
    if (!window.confirm("Delete this post? This cannot be undone.")) return;
    setDeleting(true);
    const result = await deletePost(post.id);
    setDeleting(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Post deleted");
      router.push("/dashboard/admin/posts");
      router.refresh();
    }
  }

  return (
    <form ref={formRef} onSubmit={(e) => e.preventDefault()} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Post Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              defaultValue={post?.title}
              placeholder="e.g. How Often Should You Tune Your Piano?"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <div className="relative">
                <select
                  id="category"
                  name="category"
                  required
                  defaultValue={post?.category ?? ""}
                  className="w-full appearance-none rounded-lg border border-border bg-card py-2.5 pl-3 pr-8 text-sm text-foreground focus:border-border focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Select a category</option>
                  {BLOG_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                name="tags"
                defaultValue={post ? parseTags(post.tags) : ""}
                placeholder="tuning, upright, humidity"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="excerpt">Excerpt</Label>
            <Textarea
              id="excerpt"
              name="excerpt"
              rows={2}
              defaultValue={post?.excerpt}
              placeholder="A short summary shown on the blog index and in search results"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="coverImage">Cover Image</Label>
            <div className="flex items-center gap-3">
              {coverImageUrl && (
                <img
                  src={coverImageUrl}
                  alt="Cover preview"
                  className="h-16 w-24 rounded-md object-cover"
                />
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => coverImageRef.current?.click()}
                disabled={uploadingCover}
              >
                {uploadingCover
                  ? "Uploading…"
                  : coverImageUrl
                    ? "Replace Image"
                    : "Upload Image"}
              </Button>
              {coverImageUrl && (
                <Button type="button" variant="ghost" onClick={() => setCoverImageUrl("")}>
                  Remove
                </Button>
              )}
              <input
                ref={coverImageRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleCoverImage}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="isHowTo"
              name="isHowTo"
              type="checkbox"
              value="true"
              defaultChecked={post?.isHowTo}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            <Label htmlFor="isHowTo">
              This is a how-to guide (write the steps as a numbered list)
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Content</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={toggleMode}>
            {mode === "wysiwyg" ? "Edit as Markdown" : "Back to Visual Editor"}
          </Button>
        </CardHeader>
        <CardContent>
          {mode === "wysiwyg" ? (
            <div className="rounded-lg border border-border">
              {editor && (
                <EditorToolbar
                  editor={editor}
                  onImageUpload={() => contentImageRef.current?.click()}
                  uploading={uploadingContent}
                />
              )}
              <EditorContent editor={editor} />
              <input
                ref={contentImageRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleContentImage}
              />
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="markdown">Markdown</Label>
                <Textarea
                  id="markdown"
                  rows={16}
                  value={markdown}
                  onChange={(e) => setMarkdown(e.target.value)}
                  className="font-mono text-sm"
                  placeholder={"## Heading\n\nWrite **markdown** here.\n\n1. Step one\n2. Step two"}
                />
              </div>
              <div className="space-y-2">
                <Label>Preview</Label>
                <div
                  className="rich-text min-h-[320px] rounded-lg border border-border px-4 py-3"
                  dangerouslySetInnerHTML={{
                    __html: sanitizePostHtml(markdownToHtml(markdown)),
                  }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SEO</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="slug">URL Slug (optional — generated from title)</Label>
            <Input
              id="slug"
              name="slug"
              defaultValue={post?.slug}
              placeholder="how-often-should-you-tune-your-piano"
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="seoTitle">SEO Title (optional — defaults to post title)</Label>
            <Input
              id="seoTitle"
              name="seoTitle"
              defaultValue={post?.seoTitle ?? ""}
              maxLength={70}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="seoDescription">
              SEO Description (optional — defaults to excerpt)
            </Label>
            <Textarea
              id="seoDescription"
              name="seoDescription"
              rows={2}
              defaultValue={post?.seoDescription ?? ""}
              maxLength={160}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          onClick={() => handleSave(POST_STATUS.PUBLISHED)}
          disabled={saving || deleting}
          className="bg-primary hover:bg-primary/90"
        >
          {saving ? "Saving…" : "Publish"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => handleSave(POST_STATUS.DRAFT)}
          disabled={saving || deleting}
        >
          Save Draft
        </Button>
        {post && (
          <Button
            type="button"
            variant="ghost"
            onClick={handleDelete}
            disabled={saving || deleting}
            className="ml-auto text-destructive hover:text-destructive"
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        )}
      </div>
    </form>
  );
}
