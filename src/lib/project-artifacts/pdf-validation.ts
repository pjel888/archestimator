import { ProjectArtifactError } from "./errors";

const PDF_CONTENT_TYPE = "application/pdf";
const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d] as const;
const DEFAULT_PROJECT_ARTIFACT_PDF_MAX_BYTES = 25 * 1024 * 1024;
const MINIMUM_PDF_BYTES = 9;

export type ProjectArtifactPdfValidationOptions = {
  declaredContentType?: string | null;
  maxBytes?: number;
};

export function validateProjectArtifactPdf(
  bytes: Uint8Array,
  options: ProjectArtifactPdfValidationOptions = {},
) {
  const declaredContentType = options.declaredContentType?.trim().toLowerCase() ?? "";
  if (declaredContentType && declaredContentType !== PDF_CONTENT_TYPE) {
    throw new ProjectArtifactError("project_artifact_invalid_file", "Project artifact must be a PDF.");
  }

  const maxBytes = options.maxBytes ?? DEFAULT_PROJECT_ARTIFACT_PDF_MAX_BYTES;
  if (!Number.isSafeInteger(maxBytes) || maxBytes < MINIMUM_PDF_BYTES) {
    throw new ProjectArtifactError("project_artifact_invalid_input", "Project artifact PDF size limit is invalid.");
  }
  if (bytes.byteLength > maxBytes) {
    throw new ProjectArtifactError("project_artifact_invalid_file", "Project artifact PDF is too large.");
  }
  if (bytes.byteLength < MINIMUM_PDF_BYTES) {
    throw new ProjectArtifactError("project_artifact_invalid_file", "Project artifact PDF is empty or truncated.");
  }
  if (PDF_SIGNATURE.some((byte, index) => bytes[index] !== byte)) {
    throw new ProjectArtifactError("project_artifact_invalid_file", "Project artifact PDF signature is invalid.");
  }

  return { contentType: PDF_CONTENT_TYPE, sizeBytes: bytes.byteLength } as const;
}

export async function computeProjectArtifactSha256(bytes: Uint8Array) {
  const input = new Uint8Array(bytes).buffer;
  const digest = await crypto.subtle.digest("SHA-256", input);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
