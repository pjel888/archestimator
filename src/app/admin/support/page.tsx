import { Suspense } from "react";

import { AdminSupportInbox } from "@/components/admin/AdminSupportInbox";
import { listSavedReplies } from "@/lib/admin/saved-replies-repository";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { readSupportEmailConfig, supportOutboundConfigured } from "@/lib/email/support-email-config";
import {
  listSupportAttachmentsForConversationInD1,
  listSupportConversations,
  listSupportMessages,
} from "@/lib/repositories/support-conversations-repository";

export const dynamic = "force-dynamic";

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const selectedId = typeof params.c === "string" ? params.c : undefined;
  const status = typeof params.status === "string" ? params.status : undefined;
  const channel = typeof params.channel === "string" ? params.channel : undefined;
  const unreadOnly = params.unread === "1";
  const search = typeof params.q === "string" ? params.q : undefined;

  const conversations = await listSupportConversations({
    status: status === "open" || status === "pending" || status === "resolved" || status === "archived" ? status : null,
    channel: channel === "email" || channel === "in_app" || channel === "all" ? channel : "all",
    unreadOnly,
    search,
    limit: 50,
  });

  const firstConversationId = selectedId && conversations.data.some((row) => row.id === selectedId)
    ? selectedId
    : conversations.data[0]?.id;
  const initialMessages = firstConversationId ? await listSupportMessages(firstConversationId) : { data: [], error: null };
  const db = await getCloudflareD1Database();
  const initialAttachments = firstConversationId && db
    ? await listSupportAttachmentsForConversationInD1(db, firstConversationId).catch(() => [])
    : [];
  const savedReplies = await listSavedReplies(50);
  const supportConfig = readSupportEmailConfig();

  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-2">
      <div>
        <p className="text-[9px] font-medium uppercase leading-3 text-tertiary">Admin</p>
        <h1 className="text-[12px] font-medium leading-5 text-ink">Support</h1>
        <p className="text-[10px] leading-4 text-tertiary">
          Unified in-app and email support inbox. D1 is canonical; Cloudflare acceptance is not final delivery.
        </p>
      </div>
      {conversations.error && <p className="text-[10px] leading-4 text-tertiary">{conversations.error}</p>}
      <Suspense fallback={<p className="text-[10px] text-tertiary">Loading support inbox…</p>}>
        <AdminSupportInbox
          conversations={conversations.data}
          initialMessages={initialMessages.data}
          initialAttachments={initialAttachments}
          savedReplies={savedReplies}
          readiness={{
            outboundConfigured: supportOutboundConfigured(),
            inboundEnabled: supportConfig.inboundEnabled,
            supportFrom: supportConfig.supportFrom,
          }}
        />
      </Suspense>
    </div>
  );
}
