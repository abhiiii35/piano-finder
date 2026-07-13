import { z } from "zod";
import { POST_STATUS } from "@/lib/constants";

export const postSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  slug: z
    .string()
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase letters, numbers, and hyphens")
    .optional()
    .or(z.literal("")),
  excerpt: z.string().min(1, "Excerpt is required").max(500),
  contentHtml: z.string().min(1, "Content is required"),
  coverImageUrl: z.url("Cover image must be a valid URL").optional().or(z.literal("")),
  category: z.string().min(1, "Category is required"),
  tags: z.string().max(500).optional(),
  status: z.enum([POST_STATUS.DRAFT, POST_STATUS.PUBLISHED]),
  seoTitle: z.string().max(70, "SEO title should be 70 characters or fewer").optional().or(z.literal("")),
  seoDescription: z
    .string()
    .max(160, "SEO description should be 160 characters or fewer")
    .optional()
    .or(z.literal("")),
  // Checkbox value — "true"/"on" when checked, absent otherwise.
  // z.coerce.boolean() would turn the string "false" into true, so compare manually.
  isHowTo: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "on"),
});

export type PostInput = z.infer<typeof postSchema>;
