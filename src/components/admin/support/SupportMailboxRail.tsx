"use client";

import { CaretDown, MagnifyingGlass, Plus } from "@phosphor-icons/react";

import { SupportConversationList } from "@/components/admin/support/SupportConversationList";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";
import type {
  SupportChannelFilter,
  SupportConversationRow,
  SupportConversationStatus,
  SupportMailboxFolder,
} from "@/lib/repositories/support-conversations-d1";
import type { SupportDraftRow } from "@/lib/repositories/support-drafts-d1";

const folders: Array<{ id: SupportMailboxFolder; label: string }> = [
  { id: "inbox", label: "Inbox" },
  { id: "sent", label: "Sent" },
  { id: "starred", label: "Starred" },
  { id: "snoozed", label: "Snoozed" },
  { id: "archive", label: "Archive" },
  { id: "all", label: "All" },
];
const channels: Array<{ id: SupportChannelFilter; label: string }> = [
  { id: "all", label: "All channels" },
  { id: "email", label: "Email" },
  { id: "in_app", label: "In-app" },
];
const statuses: SupportConversationStatus[] = ["open", "pending", "resolved", "archived"];

export function SupportMailboxRail({
  folder,
  mailboxCounts,
  conversations,
  selectedId,
  channelFilter,
  statusFilter,
  unreadOnly,
  search,
  labelFilter,
  assignedToMe,
  mailboxError,
  showDrafts,
  drafts,
  draftsLoading,
  draftsError,
  outboundConfigured,
  supportFrom,
  mobileThreadOpen,
  onCompose,
  onToggleDrafts,
  onFolderChange,
  onChannelChange,
  onStatusChange,
  onUnreadOnlyChange,
  onSearchChange,
  onLabelChange,
  onAssignedToMeChange,
  onSelect,
  onResumeDraft,
  onRetryMailbox,
}: {
  folder: SupportMailboxFolder;
  mailboxCounts: Record<SupportMailboxFolder, number>;
  conversations: SupportConversationRow[];
  selectedId: string | null;
  channelFilter: SupportChannelFilter;
  statusFilter: SupportConversationStatus | "all";
  unreadOnly: boolean;
  search: string;
  labelFilter: string;
  assignedToMe: boolean;
  mailboxError: boolean;
  showDrafts: boolean;
  drafts: SupportDraftRow[] | undefined;
  draftsLoading: boolean;
  draftsError: boolean;
  outboundConfigured: boolean;
  supportFrom: string;
  mobileThreadOpen: boolean;
  onCompose: () => void;
  onToggleDrafts: () => void;
  onFolderChange: (folder: SupportMailboxFolder) => void;
  onChannelChange: (channel: SupportChannelFilter) => void;
  onStatusChange: (status: SupportConversationStatus | "all") => void;
  onUnreadOnlyChange: () => void;
  onSearchChange: (search: string) => void;
  onLabelChange: (label: string) => void;
  onAssignedToMeChange: () => void;
  onSelect: (conversation: SupportConversationRow) => void;
  onResumeDraft: (draft: SupportDraftRow) => void;
  onRetryMailbox: () => void;
}) {
  const activeFolder = folders.find((item) => item.id === folder)?.label ?? "Inbox";

  return (
    <section
      className={cn(
        "min-h-0 flex-col border-r border-hairline bg-white md:flex",
        mobileThreadOpen ? "hidden" : "flex",
      )}
      aria-label="Support conversations"
    >
      <div className="border-b border-hairline p-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-medium leading-4 text-ink">{activeFolder}</p>
            <p className="truncate text-[9px] leading-3 text-tertiary">
              {outboundConfigured ? supportFrom : "Outbound not configured"} · {mailboxCounts[folder]} conversations
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button type="button" variant="primary" size="xs" className="min-h-9 min-w-0 px-2 md:min-h-7" onClick={onCompose}>
              <Plus size={12} aria-hidden /> New
            </Button>
            <Button
              type="button"
              variant={showDrafts ? "soft" : "secondary"}
              size="xs"
              className="min-h-9 min-w-0 px-2 md:min-h-7"
              aria-pressed={showDrafts}
              onClick={onToggleDrafts}
            >
              Drafts
            </Button>
          </div>
        </div>

        <label className="relative mt-2 block" htmlFor="support-search">
          <span className="sr-only">Search conversations</span>
          <MagnifyingGlass size={12} className="pointer-events-none absolute left-2 top-2.5 text-tertiary" aria-hidden />
          <input
            id="support-search"
            value={search}
            onChange={(event) => onSearchChange(event.currentTarget.value)}
            className="h-8 w-full rounded-xs border border-hairline bg-white py-1 pl-6 pr-2 text-[10px] leading-4 text-ink outline-none placeholder:text-tertiary focus-visible:ring-2 focus-visible:ring-focus"
            placeholder="Search sender or subject"
          />
        </label>

        <nav className="mt-2 grid grid-cols-3 gap-1" aria-label="Mailbox folders">
          {folders.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-current={folder === item.id ? "page" : undefined}
              className={cn(
                "flex min-h-8 items-center justify-between gap-1 rounded-xs border px-1.5 text-[9px] font-medium leading-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus md:min-h-7",
                folder === item.id
                  ? "border-ink bg-ink text-white"
                  : "border-hairline bg-white text-secondary hover:bg-surfaceMuted hover:text-ink",
              )}
              onClick={() => onFolderChange(item.id)}
            >
              <span>{item.label}</span>
              <span className={cn("tabular-nums", folder === item.id ? "text-white/70" : "text-tertiary")}>{mailboxCounts[item.id]}</span>
            </button>
          ))}
        </nav>

        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <label className="grid gap-1 text-[8px] font-medium uppercase leading-3 text-tertiary" htmlFor="support-channel-filter">
            Channel
            <select
              id="support-channel-filter"
              value={channelFilter}
              onChange={(event) => onChannelChange(event.currentTarget.value as SupportChannelFilter)}
              className="h-8 min-w-0 rounded-xs border border-hairline bg-white px-2 text-[10px] font-normal normal-case text-ink outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              {channels.map((channel) => <option key={channel.id} value={channel.id}>{channel.label}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-[8px] font-medium uppercase leading-3 text-tertiary" htmlFor="support-status-filter">
            Status
            <select
              id="support-status-filter"
              value={statusFilter}
              onChange={(event) => onStatusChange(event.currentTarget.value as SupportConversationStatus | "all")}
              className="h-8 min-w-0 rounded-xs border border-hairline bg-white px-2 text-[10px] font-normal normal-case text-ink outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <option value="all">All statuses</option>
              {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <button
            type="button"
            aria-pressed={unreadOnly}
            className={cn(
              "min-h-8 rounded-xs border px-2 text-[10px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
              unreadOnly ? "border-ink bg-surfaceMuted text-ink" : "border-hairline bg-white text-secondary hover:bg-surfaceMuted",
            )}
            onClick={onUnreadOnlyChange}
          >
            Unread only
          </button>
          <button
            type="button"
            aria-pressed={assignedToMe}
            className={cn(
              "min-h-8 rounded-xs border px-2 text-[10px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
              assignedToMe ? "border-ink bg-surfaceMuted text-ink" : "border-hairline bg-white text-secondary hover:bg-surfaceMuted",
            )}
            onClick={onAssignedToMeChange}
          >
            Assigned to me
          </button>
        </div>

        <details className="group mt-2" open={Boolean(labelFilter)}>
          <summary className="flex min-h-7 cursor-pointer list-none items-center justify-between rounded-xs px-1 text-[9px] font-medium text-secondary hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
            More filters
            <CaretDown size={11} className="transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <label className="mt-1 grid gap-1 text-[8px] font-medium uppercase leading-3 text-tertiary" htmlFor="support-label-filter">
            Exact label
            <input
              id="support-label-filter"
              value={labelFilter}
              onChange={(event) => onLabelChange(event.currentTarget.value)}
              className="h-8 w-full rounded-xs border border-hairline bg-white px-2 text-[10px] font-normal normal-case text-ink outline-none placeholder:text-tertiary focus-visible:ring-2 focus-visible:ring-focus"
              placeholder="billing, onboarding, bug…"
            />
          </label>
        </details>
      </div>

      {showDrafts ? (
        <div className="max-h-44 overflow-auto border-b border-hairline bg-surfaceMuted/45 p-2" aria-label="Saved drafts">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-[9px] font-medium leading-3 text-secondary">Saved drafts</p>
            {!draftsLoading && !draftsError ? <span className="text-[9px] tabular-nums text-tertiary">{drafts?.length ?? 0}</span> : null}
          </div>
          {draftsLoading ? <p className="text-[9px] text-tertiary">Loading drafts…</p> : null}
          {draftsError ? <p role="status" className="text-[9px] text-danger">Drafts could not be loaded.</p> : null}
          {!draftsLoading && !draftsError && drafts?.length === 0 ? <p className="text-[9px] text-tertiary">No saved drafts.</p> : null}
          <div className="space-y-1">
            {drafts?.map((draft) => (
              <button
                key={draft.id}
                type="button"
                onClick={() => onResumeDraft(draft)}
                className="block min-h-8 w-full rounded-xs border border-hairline bg-white px-2 py-1.5 text-left text-[9px] text-secondary hover:bg-surfaceMuted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                <span className="font-medium text-ink">{draft.kind === "reply" ? "Reply" : "New email"}</span>
                <span className="ml-1 line-clamp-1">{draft.subject || draft.body_text || "Untitled draft"}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <SupportConversationList
        conversations={conversations}
        selectedId={selectedId}
        channelFilter={channelFilter}
        mailboxError={mailboxError}
        onSelect={onSelect}
        onRetry={onRetryMailbox}
      />
    </section>
  );
}
