"use server";

import { cloudinary } from "@/lib/cloudinary";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function uploadPhoto(formData: FormData) {
  const file = formData.get("file") as File | null;
  const folder = (formData.get("folder") as string) || "general";

  if (!file) return { error: "No file provided" };

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "Invalid file type. Only JPEG, PNG, WebP, and PDF are allowed." };
  }

  if (file.size > MAX_SIZE) {
    return { error: "File too large. Maximum size is 5MB." };
  }

  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    return { error: "Photo upload is not configured. Please set Cloudinary environment variables." };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await new Promise<{ secure_url: string; public_id: string }>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: `piano-finder/${folder}`,
            resource_type: "image",
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result as { secure_url: string; public_id: string });
          }
        );
        stream.end(buffer);
      }
    );

    return { url: result.secure_url, publicId: result.public_id };
  } catch (err) {
    console.error("Photo upload error:", err);
    return { error: "Failed to upload photo. Please try again." };
  }
}

export async function deletePhoto(publicId: string) {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    return { error: "Photo service is not configured." };
  }

  try {
    await cloudinary.uploader.destroy(publicId);
    return { success: true };
  } catch (err) {
    console.error("Photo delete error:", err);
    return { error: "Failed to delete photo." };
  }
}
