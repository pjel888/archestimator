"use client";

import { EnvelopeSimple } from "@phosphor-icons/react";

import { StatusBadge, type StatusBadgeStatus } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { formatAdminListTime } from "@/lib/admin/datetime";
import { cn } from "@/lib/ui/cn";
import type { SupportChannelFilter, SupportConversationRow, SupportConversationStatus } from "@/lib/repositories/support-conversations-d1";

function toBadgeStatus(status: SupportConversationStatus): StatusBadgeStatus {
  if (status === "open") return "active";
  if (status === "resolved") return "approved";
  if (status === "archived") return "inactive";
  return "review";
}

export function SupportConversationList({
  conversations,
  selectedId,
  channelFilter,
  mailboxError,
  hasMore,
  isLoadingMore,
  onSelect,
  onRetry,
  onLoadMore,
}: {
  conversations: SupportConversationRow[];
  selectedId: string | null;
  channelFilter: SupportChannelFilter;
  mailboxError: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  onSelect: (conversation: SupportConversationRow) => void;
  onRetry: () => void;
  onLoadMore: () => void;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-auto p-1.5" aria-live="polite">
      {conversations.map((thread) => (
        <button
          key={thread.id}
          type="button"
          onClick={() => onSelect(thread)}
          aria-pressed={selectedId === thread.id}
          className={cn(
            "mb-1 min-h-[4.5rem] w-full cursor-pointer rounded-xs border p-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
            selectedId === thread.id ? "border-ink/25 bg-surfaceMuted" : "border-transparent hover:border-hairline hover:bg-surfaceMuted/70",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <span className={cn("min-w-0 truncate text-[10px] leading-4 text-ink", thread.unread_for_admin && "font-medium")}>
              {thread.requester_name ?? thread.requester_email ?? thread.user_id ?? "External sender"}
            </span>
            <span className="shrink-0 text-[9px] leading-3 tabular-nums text-tertiary">{formatAdminListTime(thread.last_message_at)}</span>
          </div>
          <p className={cn("mt-0.5 truncate text-[10px] leading-4", thread.unread_for_admin ? "font-medium text-ink" : "text-secondary")}>
            {thread.subject ?? "Support request"}
          </p>
          <div className="mt-1.5 flex items-center justify-between gap-1">
            <span className="inline-flex items-center gap-1 text-[8px] font-medium uppercase leading-3 text-tertiary">
              {thread.unread_for_admin ? <span className="size-1.5 rounded-xs bg-warning" aria-label="Unread" /> : null}
              {thread.channel === "email" ? <EnvelopeSimple size={10} aria-hidden /> : null}
              {thread.channel === "in_app" ? "In-app" : "Email"}
            </span>
            <StatusBadge status={toBadgeStatus(thread.status)} className="min-w-0 px-1 py-0.5">{thread.status}</StatusBadge>
          </div>
        </button>
      ))}
      {conversations.length === 0 && <div className="rounded-xs border border-dashed border-hairline p-3 text-[10px] leading-4 text-tertiary">{channelFilter === "email" ? "No email conversations yet. Compose one to start." : "No support conversations match these filters."}</div>}
      {hasMore ? (
        <Button
          type="button"
          variant="secondary"
          size="xs"
          className="mt-1 min-h-8 w-full"
          disabled={isLoadingMore}
          onClick={onLoadMore}
        >
          {isLoadingMore ? "Loading older conversations…" : "Load older conversations"}
        </Button>
      ) : null}
      {mailboxError && (
        <div role="status" className="flex items-center justify-between gap-2 px-1.5 py-2 text-[9px] leading-3 text-tertiary">
          <span>Mailbox refresh failed; showing the last available list.</span>
          <Button type="button" variant="ghost" size="xs" className="min-h-6 px-1.5" onClick={onRetry}>
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}
