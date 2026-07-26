export type UploadSurface =
  | "project-image"
  | "component-image"
  | "component-attachment"
  | "project-artifact"
  | "portal-request-evidence";

export type UploadPolicy = {
  surface: UploadSurface;
  bucket: "project-images" | "component-images" | "component-attachments" | "project-artifacts";
  kind: "image" | "attachment";
  maxBytes: number;
  maxPixels?: number;
  keyPrefix: "project-images" | "project-artifacts" | null;
  publicUrlAllowed: boolean;
  scanRequired: boolean;
  allowedMimeTypes: readonly string[];
};

export const UPLOAD_POLICIES = {
  "project-image": {
    surface: "project-image",
    bucket: "project-images",
    kind: "image",
    maxBytes: 12 * 1024 * 1024,
    maxPixels: 24_000_000,
    keyPrefix: "project-images",
    publicUrlAllowed: false,
    scanRequired: false,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
  },
  "component-image": {
    surface: "component-image",
    bucket: "component-images",
    kind: "image",
    maxBytes: 12 * 1024 * 1024,
    maxPixels: 24_000_000,
    keyPrefix: null,
    publicUrlAllowed: true,
    scanRequired: false,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
  },
  "component-attachment": {
    surface: "component-attachment",
    bucket: "component-attachments",
    kind: "attachment",
    maxBytes: 20 * 1024 * 1024,
    keyPrefix: null,
    publicUrlAllowed: false,
    scanRequired: true,
    allowedMimeTypes: [
      "application/pdf",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
  },
  "project-artifact": {
    surface: "project-artifact",
    bucket: "project-artifacts",
    kind: "attachment",
    maxBytes: 25 * 1024 * 1024,
    keyPrefix: "project-artifacts",
    publicUrlAllowed: false,
    scanRequired: true,
    allowedMimeTypes: ["application/pdf"],
  },
  "portal-request-evidence": {
    surface: "portal-request-evidence",
    bucket: "project-artifacts",
    kind: "attachment",
    maxBytes: 20 * 1024 * 1024,
    keyPrefix: "project-artifacts",
    publicUrlAllowed: false,
    scanRequired: true,
    allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/avif"],
  },
} as const satisfies Record<UploadSurface, UploadPolicy>;

export function getUploadPolicy(surface: UploadSurface) {
  return UPLOAD_POLICIES[surface];
}

export function safeUploadName(name: string, fallback: string) {
  const stem = name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return stem || fallback;
}

