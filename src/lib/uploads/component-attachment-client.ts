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

type TusResumableCreateResponse = UploadedComponentAttachment & {
  provider: string;
  uploadMode: "tus_resumable";
  uploadSessionId: string;
  endpoint: string;
  uploadToken: string;
  uploadMetadata: string;
  chunkSizeBytes: number;
  finalizeUrl?: string;
  expiresAt?: string;
  requiresFinalizeRpc?: boolean;
};

export type UploadComponentAttachmentOptions = {
  fetchImpl?: typeof fetch;
  serverMediatedMaxBytes?: number;
  signedDirectMaxBytes?: number;
  resumableMaxBytes?: number;
  projectId?: string | null;
  projectComponentId?: string | null;
};

type AttachmentValidationResult =
  | { ok: true; contentType: string; uploadMode: "server_mediated" | "signed_single_part" | "tus_resumable" }
  | { ok: false; message: string };

export const COMPONENT_ATTACHMENT_UPLOAD_ROUTE = "/api/component-library/attachments";
export const COMPONENT_ATTACHMENT_DIRECT_UPLOAD_ROUTE = "/api/component-library/attachments/direct-upload";
export const SERVER_MEDIATED_COMPONENT_ATTACHMENT_MAX_BYTES = 20 * 1024 * 1024;
export const SIGNED_DIRECT_COMPONENT_ATTACHMENT_MAX_BYTES = 64 * 1024 * 1024 - 1;
export const RESUMABLE_COMPONENT_ATTACHMENT_MAX_BYTES = 512 * 1024 * 1024;

const ATTACHMENT_TYPE_ERROR = "Use a PDF, XLS, or XLSX file.";
const ATTACHMENT_SIZE_ERROR = "Choose an attachment no larger than 512 MB.";
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
    resumableMaxBytes: options.resumableMaxBytes ?? RESUMABLE_COMPONENT_ATTACHMENT_MAX_BYTES,
  };
}

function getFileExtension(name: string) {
  const match = /\.([^.]+)$/.exec(name.trim().toLowerCase());
  return match?.[1] ?? "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function attachmentTargetPayload(options: UploadComponentAttachmentOptions) {
  const projectId = options.projectId?.trim() ?? "";
  const projectComponentId = options.projectComponentId?.trim() ?? "";
  if (!projectId && !projectComponentId) return {};
  if (!projectId || !projectComponentId) {
    throw new Error("Project attachment uploads require project and component identifiers.");
  }
  return { projectId, projectComponentId };
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

function asTusResumableCreateResponse(value: unknown): TusResumableCreateResponse {
  const result = asUploadedComponentAttachment(value);
  if (!isRecord(value)) throw new Error("Resumable upload session response was incomplete.");
  const uploadSessionId = typeof value.uploadSessionId === "string" ? value.uploadSessionId : "";
  const endpoint = typeof value.endpoint === "string" ? value.endpoint : "";
  const uploadToken = typeof value.uploadToken === "string" ? value.uploadToken : "";
  const uploadMetadata = typeof value.uploadMetadata === "string" ? value.uploadMetadata : "";
  const uploadMode = typeof value.uploadMode === "string" ? value.uploadMode : "";
  const chunkSizeBytes = typeof value.chunkSizeBytes === "number" ? value.chunkSizeBytes : Number.NaN;
  if (
    !uploadSessionId
    || !endpoint
    || !uploadToken
    || !uploadMetadata
    || uploadMode !== "tus_resumable"
    || !Number.isSafeInteger(chunkSizeBytes)
    || chunkSizeBytes <= 0
  ) {
    throw new Error("Resumable upload session response was incomplete.");
  }
  return result as TusResumableCreateResponse;
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

  const { serverMediatedMaxBytes, signedDirectMaxBytes, resumableMaxBytes } = getAttachmentThresholds(options);
  if (file.size > resumableMaxBytes) return { ok: false, message: ATTACHMENT_SIZE_ERROR };

  return {
    ok: true,
    contentType,
    uploadMode: file.size <= serverMediatedMaxBytes
      ? "server_mediated"
      : file.size <= signedDirectMaxBytes
        ? "signed_single_part"
        : "tus_resumable",
  };
}

async function uploadServerMediatedAttachment(
  file: File,
  fetchImpl: typeof fetch,
  target: ReturnType<typeof attachmentTargetPayload>,
): Promise<UploadedComponentAttachment> {
  const formData = new FormData();
  formData.set("file", file);
  if (target.projectId && target.projectComponentId) {
    formData.set("projectId", target.projectId);
    formData.set("projectComponentId", target.projectComponentId);
  }
  const response = await fetchImpl(COMPONENT_ATTACHMENT_UPLOAD_ROUTE, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Could not upload attachment."));
  }
  return asUploadedComponentAttachment(await readJsonRecord(response));
}

async function finalizeDirectUploadAttachment(
  fetchImpl: typeof fetch,
  uploadSessionId: string,
  finalizeUrl?: string,
): Promise<UploadedComponentAttachment> {
  const finalizeResponse = await fetchImpl(finalizeUrl ?? COMPONENT_ATTACHMENT_DIRECT_UPLOAD_ROUTE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "finalize",
      uploadSessionId,
    }),
  });
  if (!finalizeResponse.ok) {
    throw new Error(await readErrorMessage(finalizeResponse, "Could not finalize attachment upload."));
  }

  return asUploadedComponentAttachment(await readJsonRecord(finalizeResponse));
}

async function uploadSignedDirectAttachment(
  file: File,
  fetchImpl: typeof fetch,
  contentType: string,
  target: ReturnType<typeof attachmentTargetPayload>,
): Promise<UploadedComponentAttachment> {
  const createResponse = await fetchImpl(COMPONENT_ATTACHMENT_DIRECT_UPLOAD_ROUTE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "create",
      fileName: file.name,
      contentType,
      sizeBytes: file.size,
      ...target,
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

  return finalizeDirectUploadAttachment(fetchImpl, createResult.uploadSessionId, createResult.finalizeUrl);
}

function resolveTusUploadLocation(endpoint: string, location: string) {
  const trimmed = location.trim();
  if (!trimmed) throw new Error("Resumable upload did not return an upload location.");
  return new URL(trimmed, endpoint).toString();
}

async function uploadTusResumableAttachment(
  file: File,
  fetchImpl: typeof fetch,
  contentType: string,
  target: ReturnType<typeof attachmentTargetPayload>,
): Promise<UploadedComponentAttachment> {
  const createResponse = await fetchImpl(COMPONENT_ATTACHMENT_DIRECT_UPLOAD_ROUTE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "create",
      fileName: file.name,
      contentType,
      sizeBytes: file.size,
      ...target,
    }),
  });
  if (!createResponse.ok) {
    throw new Error(await readErrorMessage(createResponse, "Could not create attachment upload session."));
  }

  const createResult = asTusResumableCreateResponse(await readJsonRecord(createResponse));
  const firstChunkEnd = Math.min(createResult.chunkSizeBytes, file.size);
  const tusCreateResponse = await fetchImpl(createResult.endpoint, {
    method: "POST",
    headers: {
      "Tus-Resumable": "1.0.0",
      "Upload-Length": String(file.size),
      "Upload-Metadata": createResult.uploadMetadata,
      "Content-Type": "application/offset+octet-stream",
      "x-signature": createResult.uploadToken,
      "x-upsert": "false",
    },
    body: file.slice(0, firstChunkEnd),
  });
  if (!tusCreateResponse.ok) {
    throw new Error("Could not create resumable storage upload.");
  }

  const location = resolveTusUploadLocation(createResult.endpoint, tusCreateResponse.headers.get("Location") ?? "");
  const initialOffset = Number(tusCreateResponse.headers.get("Upload-Offset") ?? firstChunkEnd);
  let offset = Number.isSafeInteger(initialOffset) && initialOffset > 0 ? initialOffset : firstChunkEnd;
  while (offset < file.size) {
    const end = Math.min(offset + createResult.chunkSizeBytes, file.size);
    const chunkResponse = await fetchImpl(location, {
      method: "PATCH",
      headers: {
        "Tus-Resumable": "1.0.0",
        "Upload-Offset": String(offset),
        "Content-Type": "application/offset+octet-stream",
        "x-signature": createResult.uploadToken,
      },
      body: file.slice(offset, end),
    });
    if (!chunkResponse.ok) {
      throw new Error("Could not upload resumable attachment chunk.");
    }

    const nextOffset = Number(chunkResponse.headers.get("Upload-Offset") ?? end);
    offset = Number.isSafeInteger(nextOffset) && nextOffset > offset ? nextOffset : end;
  }

  return finalizeDirectUploadAttachment(fetchImpl, createResult.uploadSessionId, createResult.finalizeUrl);
}

export async function uploadComponentAttachment(
  file: File,
  options: UploadComponentAttachmentOptions = {},
): Promise<UploadedComponentAttachment> {
  const validation = validateComponentAttachmentFile(file, options);
  if (!validation.ok) throw new Error(validation.message);

  const fetchImpl = options.fetchImpl ?? fetch;
  const target = attachmentTargetPayload(options);
  if (validation.uploadMode === "server_mediated") {
    return uploadServerMediatedAttachment(file, fetchImpl, target);
  }
  if (validation.uploadMode === "tus_resumable") {
    return uploadTusResumableAttachment(file, fetchImpl, validation.contentType, target);
  }

  return uploadSignedDirectAttachment(file, fetchImpl, validation.contentType, target);
}
