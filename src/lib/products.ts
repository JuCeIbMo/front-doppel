import { apiFetch, getBrowserSessionStore } from "@/lib/api-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

/** One row of `GET /dashboard/products`. */
export interface Product {
  code: string;
  name: string;
  unit_price: string;
  stock: number;
  /** Units on the shelf already promised to Orders not delivered yet. */
  reserved: number;
  archived: boolean;
  /** A link that stops working after an hour. */
  signed_url: string | null;
}

/** The files the API accepts as a Product photo, mirrored so the Owner hears it at once. */
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

/** Why this file cannot be a Product photo, or null when it can. */
export function photoProblem(file: File): string | null {
  if (!PHOTO_TYPES.includes(file.type)) return "La foto debe ser JPG, PNG o WEBP.";
  if (file.size > PHOTO_MAX_BYTES) return "La foto pesa más de 5 MB.";
  return null;
}

/** Stores the file and answers the code add_product and change_product_photo accept. */
export async function uploadProductPhoto(file: File): Promise<string> {
  const uploaded = await apiFetch<{ photo_upload_code: string }>("/dashboard/product-photos", {
    baseUrl: API_URL,
    session: getBrowserSessionStore(),
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  });
  return uploaded.photo_upload_code;
}

/** A price as the API wants it: two decimals, dot separated. Null when it is not a price. */
export function priceInput(value: string): string | null {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Number(normalized).toFixed(2);
}

/** A count of units, or null when it is not a whole number from zero up. */
export function stockInput(value: string): number | null {
  const trimmed = value.trim();
  return /^\d+$/.test(trimmed) ? Number(trimmed) : null;
}
