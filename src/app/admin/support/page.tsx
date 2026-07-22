import { Suspense } from "react";
import nextDynamic from "next/dynamic";

import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { requireAdminContext } from "@/lib/admin/require-admin";
import { listSavedReplies } from "@/lib/admin/saved-replies-repository";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { readSupportEmailConfig, supportOutboundConfigured } from "@/lib/email/support-email-config";
import { listClientSupportSendIdentities } from "@/lib/email/support-send-identities";
import {
  listSupportAttachmentsForConversationInD1,
  listSupportMailbox,
  listSupportMessages,
} from "@/lib/repositories/support-conversations-repository";

export const dynamic = "force-dynamic";

const AdminSupportInbox = nextDynamic(
  () => import("@/components/admin/AdminSupportInbox").then((module) => module.AdminSupportInbox),
  {
    loading: () => (
      <div
        className="min-h-[24rem] flex-1 animate-pulse rounded-xs border border-hairline bg-surfaceMuted/40"
        aria-busy="true"
        aria-label="Loading support inbox"
      />
    ),
  },
);

const mailboxFolders = ["inbox", "sent", "archive", "all", "starred", "snoozed"] as const;

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const admin = await requireAdminContext();
  const selectedId = typeof params.c === "string" ? params.c : undefined;
  const folder = typeof params.folder === "string" && mailboxFolders.includes(params.folder as (typeof mailboxFolders)[number])
    ? params.folder as (typeof mailboxFolders)[number]
    : "inbox";
  const status = typeof params.status === "string" ? params.status : undefined;
  const channel = typeof params.channel === "string" ? params.channel : undefined;
  const unreadOnly = params.unread === "1";
  const search = typeof params.q === "string" ? params.q : undefined;
  const label = typeof params.label === "string" ? params.label : undefined;
  const assigneeUserId = params.assignee === "me" ? admin.userId : undefined;

  const mailbox = await listSupportMailbox({
    folder,
    status: status === "open" || status === "pending" || status === "resolved" || status === "archived" ? status : null,
    channel: channel === "email" || channel === "in_app" || channel === "all" ? channel : "all",
    unreadOnly,
    search,
    label,
    assigneeUserId,
    limit: 50,
  });

  const firstConversationId = selectedId && mailbox.data.conversations.some((row) => row.id === selectedId)
    ? selectedId
    : mailbox.data.conversations[0]?.id;
  const db = await getCloudflareD1Database();
  const [initialMessages, initialAttachments, savedReplies] = await Promise.all([
    firstConversationId ? listSupportMessages(firstConversationId) : Promise.resolve({ data: [], error: null }),
    firstConversationId && db
      ? listSupportAttachmentsForConversationInD1(db, firstConversationId).catch(() => [])
      : Promise.resolve([] as Awaited<ReturnType<typeof listSupportAttachmentsForConversationInD1>>),
    listSavedReplies(50),
  ]);
  const supportConfig = readSupportEmailConfig();

  return (
    <AdminPage className="h-full gap-1.5 overflow-hidden">
      <AdminPageHeader
        eyebrow="Admin"
        title="Support inbox"
        description="Review, triage, and reply to every customer conversation without leaving the workspace."
        className="shrink-0"
      />
      {mailbox.error && (
        <p role="alert" className="shrink-0 rounded-xs border border-dangerSoft bg-dangerSoft/40 px-2 py-1.5 text-[10px] leading-4 text-danger">
          {mailbox.error}
        </p>
      )}
      <Suspense fallback={<p className="text-[10px] text-tertiary">Loading support inbox…</p>}>
        <AdminSupportInbox
          conversations={mailbox.data.conversations}
          initialMessages={initialMessages.data}
          initialAttachments={initialAttachments}
          savedReplies={savedReplies}
          readiness={{
            outboundConfigured: supportOutboundConfigured(),
            inboundEnabled: supportConfig.inboundEnabled,
            supportFrom: supportConfig.supportFrom,
            sendIdentities: listClientSupportSendIdentities(supportConfig),
          }}
        />
      </Suspense>
    </AdminPage>
  );
}
