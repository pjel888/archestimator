import {
  MATERIAL_IMAGE_MAX_BYTES,
  isMaterialImageMimeType,
  materialImageUploadFailure,
  parseMaterialImageUploadResult,
  toMaterialImageAssetDescriptor,
  type MaterialImageAssetDescriptor,
  type MaterialImageUploadFailure,
  type MaterialImageUploadResult,
} from "./material-image-contract";
import {
  postUploadFormData,
  UploadClientError,
} from "./client-upload";

export type MaterialImageFileAdmission =
  | { ok: true; file: File }
  | MaterialImageUploadFailure;

export type MaterialImageUploadFields = Record<string, string | null | undefined>;

export type MaterialImageClientUploadSuccess = {
  result: MaterialImageUploadResult;
  descriptor: MaterialImageAssetDescriptor;
};

export type MaterialImageUploadTransport = <T>(
  url: string,
  formData: FormData,
  options?: {
    signal?: AbortSignal;
    timeoutMs?: number;
    fallbackMessage?: string;
    timeoutMessage?: string;
  },
) => Promise<T>;

export function createMaterialImageUploadAttemptId() {
  return globalThis.crypto?.randomUUID?.()
    ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function admitMaterialImageFile(file: File): MaterialImageFileAdmission {
  if (!Number.isSafeInteger(file.size) || file.size <= 0) {
    return materialImageUploadFailure("empty_file");
  }
  if (file.size > MATERIAL_IMAGE_MAX_BYTES) return materialImageUploadFailure("too_large");
  if (file.type && !isMaterialImageMimeType(file.type)) {
    return materialImageUploadFailure("unsupported_type");
  }
  return { ok: true, file };
}

function createMaterialImageUploadFormData(
  file: File,
  fields: MaterialImageUploadFields = {},
) {
  const formData = new FormData();
  formData.append("file", file);
  for (const [key, value] of Object.entries(fields)) {
    if (value !== null && value !== undefined) formData.append(key, value);
  }
  if (!formData.has("uploadAttemptId")) {
    formData.append("uploadAttemptId", createMaterialImageUploadAttemptId());
  }
  return formData;
}

export async function uploadOriginalMaterialImage(input: {
  endpoint: string;
  file: File;
  fields?: MaterialImageUploadFields;
  signal?: AbortSignal;
  timeoutMs?: number;
  transport?: MaterialImageUploadTransport;
}): Promise<MaterialImageClientUploadSuccess> {
  const admission = admitMaterialImageFile(input.file);
  if (!admission.ok) {
    throw new UploadClientError(admission.error.message, {
      kind: "http",
      retryable: admission.error.retryable,
      status: admission.status,
    });
  }

  const transport = input.transport ?? postUploadFormData;
  const response = await transport<unknown>(
    input.endpoint,
    createMaterialImageUploadFormData(input.file, input.fields),
    {
      signal: input.signal,
      timeoutMs: input.timeoutMs,
      fallbackMessage: "Could not upload image.",
      timeoutMessage: "Image upload timed out. Try again.",
    },
  );
  const result = parseMaterialImageUploadResult(response);
  if (!result) {
    throw new UploadClientError("Upload response was invalid. Try again.", {
      kind: "invalid-response",
      retryable: true,
      status: 502,
    });
  }
  return { result, descriptor: toMaterialImageAssetDescriptor(result) };
}
