// src/services/companyLogoService.ts
import { supabase } from "../lib/supabaseClient";

const BUCKET_NAME = "company-logos";
const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
];

/**
 * Returns the public URL for a company logo based on its fixed path.
 */
export function getCompanyLogoUrl(companyId: string): string {
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(`${companyId}/logo/current`);

  return data.publicUrl;
}

/**
 * Uploads/overwrites the company logo at the fixed path `${companyId}/logo/current`.
 */
export async function uploadCompanyLogo(
  companyId: string,
  file: File,
): Promise<string> {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(
      "Invalid file type. Please upload PNG, JPEG, WebP, or SVG.",
    );
  }

  const filePath = `${companyId}/logo/current`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      contentType: file.type,
      upsert: true, // Overwrites existing logo automatically
    });

  if (error) throw error;

  // Append timestamp parameter to force browser cache refresh
  return `${getCompanyLogoUrl(companyId)}?t=${Date.now()}`;
}

/**
 * Deletes the company logo from the fixed path.
 */
export async function removeCompanyLogo(companyId: string): Promise<void> {
  const filePath = `${companyId}/logo/current`;

  const { error } = await supabase.storage.from(BUCKET_NAME).remove([filePath]);

  if (error) throw error;
}
