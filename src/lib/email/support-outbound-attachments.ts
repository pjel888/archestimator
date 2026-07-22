/**
 * Outbound support attachment helpers: draft R2 keys + final message binding.
 */

import {
  buildSupportAttachmentR2Key,
  classifyInboundAttachment,
  sha256Hex,
} from "@/lib/email/support-email-attachments";
import { readSupportEmailConfig } from "@/lib/email/support-email-config";
import type { EmailAttachmentInput } from "@/lib/email/cloudflare-email-client";
import { runRequiredD1Batch } from "@/lib/cloudflare/d1-batch";
import {
  listSupportAttachmentsForMessageInD1,
  type D1DatabaseLike,
  type SupportAttachmentRow,
} from "@/lib/repositories/support-conversations-d1";
import {
  supportPrivacyWriteGateSql,
  supportPrivacyWriteGateValues,
  type SupportPrivacyWriteGate,
} from "@/lib/support/privacy-fence";
import {
  forgetSupportSubjectR2Object,
  markSupportSubjectR2ObjectStoredStatement,
  reserveOpenSupportSubjectR2Object,
} from "@/lib/support/subject-r2-registry";

export type SupportDraftAttachmentMeta = {
  draftId: string;
  r2Key: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  sha256: string | null;
};

type R2ObjectLike = {
  arrayBuffer: () => Promise<ArrayBuffer>;
  body?: ReadableStream | null;
  httpMetadata?: { contentType?: string };
  size?: number;
};

export type SupportR2BucketLike = {
  get(key: string): Promise<R2ObjectLike | null>;
  put(
    key: string,
    value: ArrayBuffer | Uint8Array | ReadableStream | string,
    options?: { httpMetadata?: { contentType?: string; cacheControl?: string } },
  ): Promise<unknown>;
  delete?(keys: string | string[]): Promise<unknown>;
};

export function buildSupportDraftR2Key(input: {
  adminUserId: string;
  draftId: string;
  filename: string;
}) {
  const safeAdmin = input.adminUserId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
  const safeDraft = input.draftId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
  const decision = classifyInboundAttachment({
    filename: input.filename,
    contentType: "application/octet-stream",
  });
  return `support-email/drafts/${safeAdmin}/${safeDraft}/${decision.sanitizedFilename}`;
}

export function assertDraftOwnedByAdmin(r2Key: string, adminUserId: string) {
  const safeAdmin = adminUserId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
  const prefix = `support-email/drafts/${safeAdmin}/`;
  if (!r2Key.startsWith(prefix)) {
    throw new Error("Draft attachment does not belong to this admin.");
  }
}

async function persistMaterializedAttachments(input: {
  db: D1DatabaseLike;
  messageId: string;
  privacyGate: SupportPrivacyWriteGate;
  rows: Array<{
    contentType: string;
    filename: string;
    id: string;
    r2Key: string;
    sha256: string;
    sizeBytes: number;
  }>;
}) {
  const now = new Date().toISOString();
  const inserts = input.rows.map((row) => input.db.prepare(
    `INSERT INTO support_message_attachments (
       id, message_id, r2_key, filename, content_type, size_bytes,
       content_id, disposition, sha256, storage_status, created_at
     ) SELECT ?, ?, ?, ?, ?, ?, NULL, 'attachment', ?, 'stored', ?
     WHERE ${supportPrivacyWriteGateSql("materialize_fence")}`,
  ).bind(
    row.id,
    input.messageId,
    row.r2Key,
    row.filename,
    row.contentType,
    row.sizeBytes,
    row.sha256,
    now,
    ...supportPrivacyWriteGateValues(input.privacyGate),
  ));
  const updateCount = input.db.prepare(
    `UPDATE support_messages SET attachment_count = ?
     WHERE id = ? AND ${supportPrivacyWriteGateSql("materialize_count_fence")}`,
  ).bind(
    input.rows.length,
    input.messageId,
    ...supportPrivacyWriteGateValues(input.privacyGate),
  );
  const privacyGate = input.privacyGate;
  const registryUpdates = privacyGate
    ? input.rows.map((row) => markSupportSubjectR2ObjectStoredStatement({
        database: input.db,
        r2Key: row.r2Key,
        sourceId: row.id,
        sourceKind: "outbound_attachment",
        storedAt: now,
        userId: privacyGate.userId,
      }))
    : [];
  const results = await runRequiredD1Batch(
    input.db,
    [...inserts, ...registryUpdates, updateCount],
    "Support attachments could not be materialized.",
  );
  if (
    inserts.some((_, index) => (results[index]?.meta?.changes ?? 0) !== 1)
    || registryUpdates.some((_, index) => (results[inserts.length + index]?.meta?.changes ?? 0) !== 1)
    || (results.at(-1)?.meta?.changes ?? 0) !== 1
  ) {
    throw new Error("support_subject_fenced");
  }
  const attachments = await listSupportAttachmentsForMessageInD1(input.db, input.messageId);
  const ids = new Set(input.rows.map((row) => row.id));
  return attachments.filter((attachment) => ids.has(attachment.id));
}

async function retireMaterializedObject(input: {
  database: D1DatabaseLike;
  privacyGate: SupportPrivacyWriteGate;
  r2: SupportR2BucketLike;
  r2Key: string;
}) {
  if (!input.r2.delete) return;
  await input.r2.delete(input.r2Key);
  const remaining = await input.r2.get(input.r2Key);
  if (remaining) {
    await remaining.body?.cancel().catch(() => undefined);
    throw new Error("support_r2_delete_unconfirmed");
  }
  if (input.privacyGate) {
    await forgetSupportSubjectR2Object({
      database: input.database,
      r2Key: input.r2Key,
      userId: input.privacyGate.userId,
    });
  }
}

async function cleanupMaterializedObjects(input: {
  database: D1DatabaseLike;
  privacyGate: SupportPrivacyWriteGate;
  r2: SupportR2BucketLike;
  r2Keys: string[];
}) {
  for (const r2Key of input.r2Keys) {
    await retireMaterializedObject({ ...input, r2Key }).catch(() => undefined);
  }
}

export async function materializeDraftAttachmentsForMessage(input: {
  db: D1DatabaseLike;
  r2: SupportR2BucketLike;
  adminUserId: string;
  conversationId: string;
  messageId: string;
  drafts: SupportDraftAttachmentMeta[];
  privacyGate?: SupportPrivacyWriteGate;
}): Promise<{ attachments: SupportAttachmentRow[]; emailAttachments: EmailAttachmentInput[] }> {
  const config = readSupportEmailConfig();
  const drafts = input.drafts.slice(0, config.maxAttachments);
  if (drafts.length === 0) return { attachments: [], emailAttachments: [] };

  let totalBytes = 0;
  const prepared: Array<{
    bytes: Uint8Array;
    decision: ReturnType<typeof classifyInboundAttachment>;
    digest: string;
    draft: SupportDraftAttachmentMeta;
  }> = [];

  for (const draft of drafts) {
    assertDraftOwnedByAdmin(draft.r2Key, input.adminUserId);
    if (draft.sizeBytes > config.maxAttachmentBytes) {
      throw new Error(`Attachment ${draft.filename} exceeds size limit.`);
    }
    totalBytes += draft.sizeBytes;
    if (totalBytes > config.maxTotalAttachmentBytes) {
      throw new Error("Total attachment size exceeds limit.");
    }

    const decision = classifyInboundAttachment({ filename: draft.filename, contentType: draft.contentType });
    if (decision.blocked) throw new Error(`Attachment type blocked: ${decision.sanitizedFilename}`);
    const object = await input.r2.get(draft.r2Key);
    if (!object) throw new Error(`Draft attachment missing: ${draft.filename}`);
    const bytes = new Uint8Array(await object.arrayBuffer());
    if (bytes.byteLength !== draft.sizeBytes) throw new Error(`Draft attachment changed after upload: ${draft.filename}`);
    const digest = await sha256Hex(bytes);
    if (draft.sha256 && draft.sha256 !== digest) throw new Error(`Draft attachment failed integrity validation: ${draft.filename}`);
    prepared.push({ draft, decision, bytes, digest });
  }

  const emailAttachments: EmailAttachmentInput[] = [];
  const finalKeys: string[] = [];
  const rows: Parameters<typeof persistMaterializedAttachments>[0]["rows"] = [];
  const privacyGate = input.privacyGate ?? null;

  try {
    for (const { decision, bytes, digest } of prepared) {
      const attachmentId = crypto.randomUUID();
      const finalKey = buildSupportAttachmentR2Key({
        conversationId: input.conversationId,
        messageId: input.messageId,
        attachmentId,
        filename: decision.sanitizedFilename,
      });
      if (privacyGate) {
        await reserveOpenSupportSubjectR2Object({
          database: input.db,
          privacyGate,
          r2Key: finalKey,
          sourceId: attachmentId,
          sourceKind: "outbound_attachment",
        });
      }
      await input.r2.put(finalKey, bytes, {
        httpMetadata: { contentType: decision.safeContentType, cacheControl: "private, max-age=31536000" },
      });
      finalKeys.push(finalKey);
      rows.push({
        contentType: decision.safeContentType,
        filename: decision.sanitizedFilename,
        id: attachmentId,
        r2Key: finalKey,
        sha256: digest,
        sizeBytes: bytes.byteLength,
      });
      emailAttachments.push({
        filename: decision.sanitizedFilename,
        content: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
        type: decision.safeContentType,
        disposition: "attachment",
      });
    }
    const attachments = await persistMaterializedAttachments({
      db: input.db,
      messageId: input.messageId,
      privacyGate,
      rows,
    });
    await cleanupMaterializedObjects({
      database: input.db,
      privacyGate,
      r2: input.r2,
      r2Keys: prepared.map(({ draft }) => draft.r2Key),
    });
    return { attachments, emailAttachments };
  } catch (error) {
    await cleanupMaterializedObjects({
      database: input.db,
      privacyGate,
      r2: input.r2,
      r2Keys: finalKeys,
    });
    throw error;
  }
}

export async function materializeStoredSupportAttachmentsForMessage(input: {
  db: D1DatabaseLike;
  r2: SupportR2BucketLike;
  conversationId: string;
  messageId: string;
  attachments: SupportAttachmentRow[];
  privacyGate?: SupportPrivacyWriteGate;
}): Promise<{ attachments: SupportAttachmentRow[]; emailAttachments: EmailAttachmentInput[] }> {
  const config = readSupportEmailConfig();
  if (input.attachments.length > config.maxAttachments) throw new Error("Too many forwarded attachments.");

  let totalBytes = 0;
  const prepared: Array<{ source: SupportAttachmentRow; bytes: Uint8Array; decision: ReturnType<typeof classifyInboundAttachment>; digest: string }> = [];
  for (const source of input.attachments) {
    if (source.storage_status !== "stored") throw new Error(`Attachment ${source.filename} is unavailable.`);
    if (source.size_bytes > config.maxAttachmentBytes) throw new Error(`Attachment ${source.filename} exceeds size limit.`);
    totalBytes += source.size_bytes;
    if (totalBytes > config.maxTotalAttachmentBytes) throw new Error("Total attachment size exceeds limit.");
    const decision = classifyInboundAttachment({ filename: source.filename, contentType: source.content_type || "application/octet-stream" });
    if (decision.blocked) throw new Error(`Attachment type blocked: ${decision.sanitizedFilename}`);
    const object = await input.r2.get(source.r2_key);
    if (!object) throw new Error(`Attachment ${source.filename} is missing.`);
    const bytes = new Uint8Array(await object.arrayBuffer());
    if (bytes.byteLength !== source.size_bytes) throw new Error(`Attachment ${source.filename} changed after storage.`);
    const digest = await sha256Hex(bytes);
    if (source.sha256 && source.sha256 !== digest) throw new Error(`Attachment ${source.filename} failed integrity validation.`);
    prepared.push({ source, bytes, decision, digest });
  }

  const emailAttachments: EmailAttachmentInput[] = [];
  const finalKeys: string[] = [];
  const rows: Parameters<typeof persistMaterializedAttachments>[0]["rows"] = [];
  const privacyGate = input.privacyGate ?? null;
  try {
    for (const { bytes, decision, digest } of prepared) {
      const attachmentId = crypto.randomUUID();
      const finalKey = buildSupportAttachmentR2Key({
        conversationId: input.conversationId,
        messageId: input.messageId,
        attachmentId,
        filename: decision.sanitizedFilename,
      });
      if (privacyGate) {
        await reserveOpenSupportSubjectR2Object({
          database: input.db,
          privacyGate,
          r2Key: finalKey,
          sourceId: attachmentId,
          sourceKind: "outbound_attachment",
        });
      }
      await input.r2.put(finalKey, bytes, {
        httpMetadata: { contentType: decision.safeContentType, cacheControl: "private, max-age=31536000" },
      });
      finalKeys.push(finalKey);
      rows.push({
        contentType: decision.safeContentType,
        filename: decision.sanitizedFilename,
        id: attachmentId,
        r2Key: finalKey,
        sha256: digest,
        sizeBytes: bytes.byteLength,
      });
      emailAttachments.push({
        filename: decision.sanitizedFilename,
        content: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
        type: decision.safeContentType,
        disposition: "attachment",
      });
    }
    const attachments = await persistMaterializedAttachments({
      db: input.db,
      messageId: input.messageId,
      privacyGate,
      rows,
    });
    return { attachments, emailAttachments };
  } catch (error) {
    await cleanupMaterializedObjects({
      database: input.db,
      privacyGate,
      r2: input.r2,
      r2Keys: finalKeys,
    });
    throw error;
  }
}

export async function getSupportUploadsR2(): Promise<SupportR2BucketLike | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const context = (await getCloudflareContext({ async: true })) as {
      env?: { ARCH_UPLOADS_R2?: SupportR2BucketLike };
    };
    return context.env?.ARCH_UPLOADS_R2 ?? null;
  } catch {
    return null;
  }
}
