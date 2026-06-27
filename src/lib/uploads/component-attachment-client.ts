export type UploadedComponentAttachment = {
  bucket: string;
  path: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadSessionId?: string;
  assetId?: string;
  scanStatus?: string;
};

type SignedUploadCreateResponse = UploadedComponentAttachment & {
  provider: string;
  uploadMode: "signed_single_part";
  uploadSessionId: string;
  uploadUrl: string;
  method: "PUT";
  finalizeUrl?: string;
  expiresAt?: string;
  requiresFinalizeRpc?: boolean;
};

type UploadComponentAttachmentOptions = {
  fetchImpl?: typeof fetch;
  serverMediatedMaxBytes?: number;
  signedDirectMaxBytes?: number;
};

type AttachmentValidationResult =
  | { ok: true; contentType: string; uploadMode: "server_mediated" | "signed_single_part" }
  | { ok: false; message: string };

export const COMPONENT_ATTACHMENT_UPLOAD_ROUTE = "/api/component-library/attachments";
export const COMPONENT_ATTACHMENT_DIRECT_UPLOAD_ROUTE = "/api/component-library/attachments/direct-upload";
export const SERVER_MEDIATED_COMPONENT_ATTACHMENT_MAX_BYTES = 20 * 1024 * 1024;
export const SIGNED_DIRECT_COMPONENT_ATTACHMENT_MAX_BYTES = 64 * 1024 * 1024 - 1;

const ATTACHMENT_TYPE_ERROR = "Use a PDF, XLS, or XLSX file.";
const ATTACHMENT_SIZE_ERROR = "Choose an attachment under 64 MB.";
const ALLOWED_ATTACHMENT_EXTENSION_PATTERN = /\.(pdf|xls|xlsx)$/i;
const CONTENT_TYPE_BY_EXTENSION = new Map([
  ["pdf", "application/pdf"],
  ["xls", "application/vnd.ms-excel"],
  ["xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
]);

export const ALLOWED_COMPONENT_ATTACHMENT_TYPES = new Set(CONTENT_TYPE_BY_EXTENSION.values());

function getAttachmentThresholds(options: UploadComponentAttachmentOptions = {}) {
  return {
    serverMediatedMaxBytes: options.serverMediatedMaxBytes ?? SERVER_MEDIATED_COMPONENT_ATTACHMENT_MAX_BYTES,
    signedDirectMaxBytes: options.signedDirectMaxBytes ?? SIGNED_DIRECT_COMPONENT_ATTACHMENT_MAX_BYTES,
  };
}

function getFileExtension(name: string) {
  const match = /\.([^.]+)$/.exec(name.trim().toLowerCase());
  return match?.[1] ?? "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

async function readJsonRecord(response: Response) {
  const result = await response.json().catch(() => null);
  return isRecord(result) ? result : null;
}

async function readErrorMessage(response: Response, fallbackMessage: string) {
  const result = await readJsonRecord(response);
  return typeof result?.error === "string" ? result.error : fallbackMessage;
}

function asUploadedComponentAttachment(value: unknown): UploadedComponentAttachment {
  if (!isRecord(value)) throw new Error("Attachment upload response was incomplete.");
  const bucket = typeof value.bucket === "string" ? value.bucket : "";
  const path = typeof value.path === "string" ? value.path : "";
  const fileName = typeof value.fileName === "string" ? value.fileName : "";
  const contentType = typeof value.contentType === "string" ? value.contentType : "";
  const sizeBytes = typeof value.sizeBytes === "number" ? value.sizeBytes : Number.NaN;
  if (!bucket || !path || !fileName || !contentType || !Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    throw new Error("Attachment upload response was incomplete.");
  }
  return value as UploadedComponentAttachment;
}

function asSignedUploadCreateResponse(value: unknown): SignedUploadCreateResponse {
  const result = asUploadedComponentAttachment(value);
  if (!isRecord(value)) throw new Error("Direct upload session response was incomplete.");
  const uploadSessionId = typeof value.uploadSessionId === "string" ? value.uploadSessionId : "";
  const uploadUrl = typeof value.uploadUrl === "string" ? value.uploadUrl : "";
  const method = typeof value.method === "string" ? value.method : "";
  const uploadMode = typeof value.uploadMode === "string" ? value.uploadMode : "";
  if (!uploadSessionId || !uploadUrl || method !== "PUT" || uploadMode !== "signed_single_part") {
    throw new Error("Direct upload session response was incomplete.");
  }
  return result as SignedUploadCreateResponse;
}

export function hasAllowedComponentAttachmentExtension(name: string) {
  return ALLOWED_ATTACHMENT_EXTENSION_PATTERN.test(name);
}

export function resolveComponentAttachmentContentType(file: File) {
  if (ALLOWED_COMPONENT_ATTACHMENT_TYPES.has(file.type)) return file.type;
  const inferred = CONTENT_TYPE_BY_EXTENSION.get(getFileExtension(file.name));
  return inferred ?? null;
}

export function validateComponentAttachmentFile(
  file: File,
  options: UploadComponentAttachmentOptions = {},
): AttachmentValidationResult {
  const contentType = resolveComponentAttachmentContentType(file);
  if (!contentType) return { ok: false, message: ATTACHMENT_TYPE_ERROR };

  const { serverMediatedMaxBytes, signedDirectMaxBytes } = getAttachmentThresholds(options);
  if (file.size > signedDirectMaxBytes) return { ok: false, message: ATTACHMENT_SIZE_ERROR };

  return {
    ok: true,
    contentType,
    uploadMode: file.size <= serverMediatedMaxBytes ? "server_mediated" : "signed_single_part",
  };
}

async function uploadServerMediatedAttachment(
  file: File,
  fetchImpl: typeof fetch,
): Promise<UploadedComponentAttachment> {
  const formData = new FormData();
  formData.set("file", file);
  const response = await fetchImpl(COMPONENT_ATTACHMENT_UPLOAD_ROUTE, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Could not upload attachment."));
  }
  return asUploadedComponentAttachment(await readJsonRecord(response));
}

async function uploadSignedDirectAttachment(
  file: File,
  fetchImpl: typeof fetch,
  contentType: string,
): Promise<UploadedComponentAttachment> {
  const createResponse = await fetchImpl(COMPONENT_ATTACHMENT_DIRECT_UPLOAD_ROUTE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "create",
      fileName: file.name,
      contentType,
      sizeBytes: file.size,
    }),
  });
  if (!createResponse.ok) {
    throw new Error(await readErrorMessage(createResponse, "Could not create attachment upload session."));
  }

  const createResult = asSignedUploadCreateResponse(await readJsonRecord(createResponse));
  const providerResponse = await fetchImpl(createResult.uploadUrl, {
    method: createResult.method,
    headers: { "Content-Type": createResult.contentType },
    body: file,
  });
  if (!providerResponse.ok) {
    throw new Error("Could not upload attachment to storage.");
  }

  const finalizeResponse = await fetchImpl(createResult.finalizeUrl ?? COMPONENT_ATTACHMENT_DIRECT_UPLOAD_ROUTE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "finalize",
      uploadSessionId: createResult.uploadSessionId,
    }),
  });
  if (!finalizeResponse.ok) {
    throw new Error(await readErrorMessage(finalizeResponse, "Could not finalize attachment upload."));
  }

  return asUploadedComponentAttachment(await readJsonRecord(finalizeResponse));
}

export async function uploadComponentAttachment(
  file: File,
  options: UploadComponentAttachmentOptions = {},
): Promise<UploadedComponentAttachment> {
  const validation = validateComponentAttachmentFile(file, options);
  if (!validation.ok) throw new Error(validation.message);

  const fetchImpl = options.fetchImpl ?? fetch;
  if (validation.uploadMode === "server_mediated") {
    return uploadServerMediatedAttachment(file, fetchImpl);
  }

  return uploadSignedDirectAttachment(file, fetchImpl, validation.contentType);
}
