"use client";

import { MagnifyingGlass, Plus } from "@phosphor-icons/react";

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
  { id: "all", label: "All" },
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
}) {
  return (
    <section className={cn("min-h-0 flex-col border-r border-hairline md:flex", mobileThreadOpen ? "hidden" : "flex")} aria-label="Support conversations">
      <div className="border-b border-hairline p-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium leading-4 text-ink">{folders.find((item) => item.id === folder)?.label}</p>
            <p className="truncate text-[9px] leading-3 text-tertiary">{outboundConfigured ? supportFrom : "Outbound not configured"} · {mailboxCounts[folder]} conversations</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button type="button" variant="outline" size="xs" className="min-h-8 sm:min-h-0" onClick={onCompose}>
              <Plus size={10} className="mr-1" />Compose
            </Button>
            <Button type="button" variant="ghost" size="xs" className="min-h-8 sm:min-h-0" onClick={onToggleDrafts}>
              Drafts
            </Button>
          </div>
        </div>
        <label className="relative mt-2 block" htmlFor="support-search">
          <span className="sr-only">Search</span>
          <MagnifyingGlass size={11} className="pointer-events-none absolute left-1.5 top-1.5 text-tertiary" />
          <input id="support-search" value={search} onChange={(event) => onSearchChange(event.currentTarget.value)} className="w-full rounded-xs border border-hairline bg-white py-1 pl-5 pr-1.5 text-[10px] leading-4 text-ink" placeholder="Search sender or subject" />
        </label>
        <div className="mt-2 flex flex-wrap gap-1">
          {folders.map((item) => <button key={item.id} type="button" className={cn("rounded-xs border px-1.5 py-1 text-[9px] leading-3", folder === item.id ? "border-ink bg-surfaceMuted text-ink" : "border-hairline text-tertiary")} onClick={() => onFolderChange(item.id)}>{item.label} {mailboxCounts[item.id]}</button>)}
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {channels.map((filter) => <button key={filter.id} type="button" className={cn("rounded-xs border px-1.5 py-1 text-[9px] leading-3", channelFilter === filter.id ? "border-ink bg-surfaceMuted text-ink" : "border-hairline text-tertiary")} onClick={() => onChannelChange(filter.id)}>{filter.label}</button>)}
          <button type="button" className={cn("rounded-xs border px-1.5 py-1 text-[9px] leading-3", unreadOnly ? "border-ink bg-surfaceMuted text-ink" : "border-hairline text-tertiary")} onClick={onUnreadOnlyChange}>Unread</button>
          <button type="button" className={cn("rounded-xs border px-1.5 py-1 text-[9px] leading-3", assignedToMe ? "border-ink bg-surfaceMuted text-ink" : "border-hairline text-tertiary")} onClick={onAssignedToMeChange}>Mine</button>
        </div>
        <label className="mt-2 block text-[9px] font-medium uppercase leading-3 text-tertiary" htmlFor="support-label-filter">Label</label>
        <input id="support-label-filter" value={labelFilter} onChange={(event) => onLabelChange(event.currentTarget.value)} className="mt-1 w-full rounded-xs border border-hairline bg-white px-1.5 py-1 text-[10px] leading-4 text-ink" placeholder="Exact label" />
        <label className="mt-2 block text-[9px] font-medium uppercase leading-3 text-tertiary" htmlFor="support-status-filter">Status</label>
        <select id="support-status-filter" value={statusFilter} onChange={(event) => onStatusChange(event.currentTarget.value as SupportConversationStatus | "all")} className="mt-1 w-full rounded-xs border border-hairline bg-white px-1.5 py-1 text-[10px] leading-4 text-ink">
          <option value="all">all</option>
          {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
        {showDrafts && (
          <div className="mt-2 rounded-xs border border-hairline p-1.5" aria-label="Saved drafts">
            {draftsLoading ? <p className="text-[9px] text-tertiary">Loading drafts…</p> : null}
            {draftsError ? <p role="status" className="text-[9px] text-danger">Drafts could not be loaded.</p> : null}
            {!draftsLoading && !draftsError && drafts?.length === 0 ? <p className="text-[9px] text-tertiary">No saved drafts.</p> : null}
            {drafts?.map((draft) => <button key={draft.id} type="button" onClick={() => onResumeDraft(draft)} className="block w-full rounded-xs px-1 py-1 text-left text-[9px] text-secondary hover:bg-surfaceMuted">{draft.kind === "reply" ? "Reply" : "New email"} · {draft.subject || draft.body_text || "Untitled draft"}</button>)}
          </div>
        )}
      </div>
      <SupportConversationList conversations={conversations} selectedId={selectedId} channelFilter={channelFilter} mailboxError={mailboxError} onSelect={onSelect} />
    </section>
  );
}
