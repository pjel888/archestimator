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
import {
  insertSupportAttachmentInD1,
  updateSupportMessageAttachmentCountInD1,
  type D1DatabaseLike,
  type SupportAttachmentRow,
} from "@/lib/repositories/support-conversations-d1";

export type SupportDraftAttachmentMeta = {
  draftId: string;
  r2Key: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
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

export async function materializeDraftAttachmentsForMessage(input: {
  db: D1DatabaseLike;
  r2: SupportR2BucketLike;
  adminUserId: string;
  conversationId: string;
  messageId: string;
  drafts: SupportDraftAttachmentMeta[];
}): Promise<{ attachments: SupportAttachmentRow[]; emailAttachments: EmailAttachmentInput[] }> {
  const config = readSupportEmailConfig();
  const drafts = input.drafts.slice(0, config.maxAttachments);
  if (drafts.length === 0) return { attachments: [], emailAttachments: [] };

  let totalBytes = 0;
  const attachments: SupportAttachmentRow[] = [];
  const emailAttachments: EmailAttachmentInput[] = [];

  for (const draft of drafts) {
    assertDraftOwnedByAdmin(draft.r2Key, input.adminUserId);
    if (draft.sizeBytes > config.maxAttachmentBytes) {
      throw new Error(`Attachment ${draft.filename} exceeds size limit.`);
    }
    totalBytes += draft.sizeBytes;
    if (totalBytes > config.maxTotalAttachmentBytes) {
      throw new Error("Total attachment size exceeds limit.");
    }

    const decision = classifyInboundAttachment({
      filename: draft.filename,
      contentType: draft.contentType,
    });
    if (decision.blocked) {
      throw new Error(`Attachment type blocked: ${decision.sanitizedFilename}`);
    }

    const object = await input.r2.get(draft.r2Key);
    if (!object) throw new Error(`Draft attachment missing: ${draft.filename}`);
    const bytes = new Uint8Array(await object.arrayBuffer());
    const digest = await sha256Hex(bytes);
    const finalKey = buildSupportAttachmentR2Key({
      conversationId: input.conversationId,
      messageId: input.messageId,
      attachmentId: crypto.randomUUID(),
      filename: decision.sanitizedFilename,
    });

    await input.r2.put(finalKey, bytes, {
      httpMetadata: {
        contentType: decision.safeContentType,
        cacheControl: "private, max-age=31536000",
      },
    });

    const row = await insertSupportAttachmentInD1(input.db, {
      messageId: input.messageId,
      r2Key: finalKey,
      filename: decision.sanitizedFilename,
      contentType: decision.safeContentType,
      sizeBytes: bytes.byteLength,
      disposition: "attachment",
      sha256: digest,
      storageStatus: "stored",
    });

    attachments.push(row);
    emailAttachments.push({
      filename: decision.sanitizedFilename,
      content: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
      type: decision.safeContentType,
      disposition: "attachment",
    });

    try {
      await input.r2.delete?.(draft.r2Key);
    } catch {
      // Draft cleanup is best-effort.
    }
  }

  await updateSupportMessageAttachmentCountInD1(input.db, input.messageId, attachments.length);
  return { attachments, emailAttachments };
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
