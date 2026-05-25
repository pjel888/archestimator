export type ProjectImageDraft = {
  bucket?: string;
  url: string;
  thumbnailUrl?: string;
  path?: string;
  thumbnailPath?: string;
  originalBytes?: number;
  optimizedBytes?: number;
};

export type ImageUploadState =
  | { state: "idle" }
  | { state: "uploading"; message: string; progress: number }
  | { state: "uploaded"; message: string }
  | { state: "error"; message: string };

export const MAX_PROJECT_IMAGE_BYTES = 12 * 1024 * 1024;
export const ALLOWED_PROJECT_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export function formatUploadBytes(bytes: number | undefined) {
  if (!bytes || bytes <= 0) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getProjectImageStoragePaths(image: ProjectImageDraft | null | undefined) {
  if (!image) return [];
  return Array.from(new Set([image.path, image.thumbnailPath].filter(Boolean)));
}

export async function removeProjectImageUpload(image: ProjectImageDraft | null | undefined) {
  const paths = getProjectImageStoragePaths(image);
  if (paths.length === 0) return;
  await fetch("/api/projects/images", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paths }),
  }).catch(() => undefined);
}

export function uploadProjectImage(file: File, projectId: string, onProgress: (progress: number) => void): Promise<ProjectImageDraft> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.set("file", file);
    formData.set("projectId", projectId);

    const request = new XMLHttpRequest();
    request.open("POST", "/api/projects/images");
    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress(Math.min(95, Math.max(5, Math.round((event.loaded / event.total) * 95))));
    };
    request.onload = () => {
      const result = request.responseText
        ? (() => {
          try {
            return JSON.parse(request.responseText);
          } catch {
            return null;
          }
        })()
        : null;
      if (request.status < 200 || request.status >= 300) {
        reject(new Error(result && typeof result.error === "string" ? result.error : "Could not upload image."));
        return;
      }
      resolve(result as ProjectImageDraft);
    };
    request.onerror = () => reject(new Error("Could not upload image."));
    request.send(formData);
  });
}
