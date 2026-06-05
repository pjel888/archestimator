import { normalizePublicationImageUrl } from "@/lib/publication/image-url";

export function normalizeEstimateRowImageUrl(value: unknown): string | null {
  return normalizePublicationImageUrl(value);
}

export function sanitizeEstimateRowSourceSnapshot(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const sourceSnapshot = value as Record<string, unknown>;
  const imageUrl = normalizeEstimateRowImageUrl(sourceSnapshot.imageUrl);

  if (imageUrl) return { ...sourceSnapshot, imageUrl };
  if ("imageUrl" in sourceSnapshot) return { ...sourceSnapshot, imageUrl: null };
  return sourceSnapshot;
}
