"use client";

import { EnvelopeSimple } from "@phosphor-icons/react";

import { StatusBadge, type StatusBadgeStatus } from "@/components/ui/status-badge";
import { cn } from "@/lib/ui/cn";
import type { SupportChannelFilter, SupportConversationRow, SupportConversationStatus } from "@/lib/repositories/support-conversations-d1";

function toBadgeStatus(status: SupportConversationStatus): StatusBadgeStatus {
  if (status === "open") return "active";
  if (status === "resolved") return "approved";
  if (status === "archived") return "inactive";
  return "review";
}

function formatListTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, date.toDateString() === new Date().toDateString()
    ? { hour: "numeric", minute: "2-digit" }
    : { month: "short", day: "numeric" }).format(date);
}

export function SupportConversationList({
  conversations,
  selectedId,
  channelFilter,
  mailboxError,
  onSelect,
}: {
  conversations: SupportConversationRow[];
  selectedId: string | null;
  channelFilter: SupportChannelFilter;
  mailboxError: boolean;
  onSelect: (conversation: SupportConversationRow) => void;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-auto p-1.5">
      {conversations.map((thread) => (
        <button
          key={thread.id}
          type="button"
          onClick={() => onSelect(thread)}
          className={cn(
            "mb-1 w-full rounded-xs border p-2 text-left transition",
            selectedId === thread.id ? "border-ink/20 bg-surfaceMuted" : "border-transparent hover:bg-surfaceMuted/70",
            thread.unread_for_admin ? "font-medium" : "",
          )}
        >
          <div className="flex items-start justify-between gap-1"><span className="truncate text-[10px] leading-4 text-ink">{thread.subject ?? "Support request"}</span><span className="shrink-0 text-[9px] leading-3 text-tertiary">{formatListTime(thread.last_message_at)}</span></div>
          <p className="mt-0.5 truncate text-[9px] leading-3 text-tertiary">{thread.requester_email ?? thread.requester_name ?? thread.user_id ?? "External sender"}</p>
          <div className="mt-1.5 flex items-center justify-between gap-1"><span className="inline-flex items-center gap-1 text-[9px] uppercase leading-3 text-secondary">{thread.channel === "email" ? <EnvelopeSimple size={10} /> : null}{thread.channel}{thread.unread_for_admin ? " · unread" : ""}</span><StatusBadge status={toBadgeStatus(thread.status)} className="min-w-0 px-1 py-0.5">{thread.status}</StatusBadge></div>
        </button>
      ))}
      {conversations.length === 0 && <div className="rounded-xs border border-dashed border-hairline p-3 text-[10px] leading-4 text-tertiary">{channelFilter === "email" ? "No email conversations yet. Compose one to start." : "No support conversations match these filters."}</div>}
      {mailboxError && <p role="status" className="px-1.5 py-2 text-[9px] leading-3 text-tertiary">Mailbox refresh failed; showing the last available list.</p>}
    </div>
  );
}
