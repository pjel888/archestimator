"use client";

import dynamic from "next/dynamic";
import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { EnvelopeSimple, MagnifyingGlass, Plus } from "@phosphor-icons/react";

import {
  createSupportEmailConversationAndSend,
  markSupportConversationRead,
  sendSupportReply,
  setConversationStatus,
} from "@/lib/admin/support-actions";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { SupportMessageCard } from "@/components/admin/support/SupportMessageCard";
import type { SupportComposerDraft } from "@/components/admin/support/SupportRichComposer";
import { cn } from "@/lib/ui/cn";
import type {
  SupportAttachmentRow,
  SupportChannelFilter,
  SupportConversationRow,
  SupportConversationStatus,
  SupportMessageRow,
} from "@/lib/repositories/support-conversations-d1";
import type { StatusBadgeStatus } from "@/components/ui/status-badge";
import styles from "@/components/admin/support/support-composer.module.css";

const SupportRichComposer = dynamic(
  () => import("@/components/admin/support/SupportRichComposer").then((mod) => mod.SupportRichComposer),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xs border border-hairline p-3 text-[10px] leading-4 text-tertiary">
        Loading editor…
      </div>
    ),
  },
);

type SavedReplyOption = {
  id: string;
  label: string;
  body: string;
};

type AdminSupportInboxProps = {
  conversations: SupportConversationRow[];
  initialMessages: SupportMessageRow[];
  initialAttachments?: SupportAttachmentRow[];
  savedReplies: SavedReplyOption[];
  readiness: {
    outboundConfigured: boolean;
    inboundEnabled: boolean;
    supportFrom: string;
  };
};

const statuses: SupportConversationStatus[] = ["open", "pending", "resolved", "archived"];
const channelFilters: Array<{ id: SupportChannelFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "email", label: "Email" },
  { id: "in_app", label: "In-app" },
];

function toBadgeStatus(status: SupportConversationStatus): StatusBadgeStatus {
  if (status === "open") return "active";
  if (status === "resolved") return "approved";
  if (status === "archived") return "inactive";
  return "review";
}

function formatListTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return new Intl.DateTimeFormat(undefined, sameDay
    ? { hour: "numeric", minute: "2-digit" }
    : { month: "short", day: "numeric" }).format(date);
}

function createClientMessageId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function AdminSupportInbox({
  conversations: initialConversations,
  initialMessages,
  initialAttachments = [],
  savedReplies,
  readiness,
}: AdminSupportInboxProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const noticeId = useId();
  const threadEndRef = useRef<HTMLDivElement>(null);
  const initialSelectedId =
    searchParams.get("c") && initialConversations.some((thread) => thread.id === searchParams.get("c"))
      ? searchParams.get("c")!
      : initialConversations[0]?.id || "";
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedId, setSelectedId] = useState(initialSelectedId);
  const [statusFilter, setStatusFilter] = useState<SupportConversationStatus | "all">(
    (searchParams.get("status") as SupportConversationStatus | null) ?? "all",
  );
  const [channelFilter, setChannelFilter] = useState<SupportChannelFilter>(
    (searchParams.get("channel") as SupportChannelFilter | null) ?? "all",
  );
  const [unreadOnly, setUnreadOnly] = useState(searchParams.get("unread") === "1");
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, SupportMessageRow[]>>(
    initialSelectedId ? { [initialSelectedId]: initialMessages } : {},
  );
  const [attachmentsByConversation, setAttachmentsByConversation] = useState<
    Record<string, SupportAttachmentRow[]>
  >(initialSelectedId ? { [initialSelectedId]: initialAttachments } : {});
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showNewEmail, setShowNewEmail] = useState(false);
  const [newTo, setNewTo] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [composerEpoch, setComposerEpoch] = useState(0);
  const [newComposerEpoch, setNewComposerEpoch] = useState(0);
  const replyAttemptIdRef = useRef(createClientMessageId("admin-reply"));
  const newEmailAttemptIdRef = useRef(createClientMessageId("admin-new"));

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    return conversations.filter((thread) => {
      if (statusFilter !== "all" && thread.status !== statusFilter) return false;
      if (channelFilter !== "all" && thread.channel !== channelFilter) return false;
      if (unreadOnly && thread.unread_for_admin !== 1) return false;
      if (!query) return true;
      const haystack = `${thread.subject ?? ""} ${thread.requester_email ?? ""} ${thread.requester_name ?? ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [channelFilter, conversations, search, statusFilter, unreadOnly]);

  const selected = filteredConversations.find((thread) => thread.id === selectedId)
    ?? conversations.find((thread) => thread.id === selectedId)
    ?? filteredConversations[0]
    ?? null;
  const messages = selected ? messagesByConversation[selected.id] ?? [] : [];
  const attachments = selected ? attachmentsByConversation[selected.id] ?? [] : [];
  const attachmentsByMessage = useMemo(() => {
    const map = new Map<string, SupportAttachmentRow[]>();
    for (const attachment of attachments) {
      const list = map.get(attachment.message_id);
      if (list) list.push(attachment);
      else map.set(attachment.message_id, [attachment]);
    }
    return map;
  }, [attachments]);
  const hasConversations = filteredConversations.length > 0;
  const unreadCount = conversations.filter((thread) => thread.unread_for_admin === 1).length;

  useEffect(() => {
    const params = new URLSearchParams();
    if (selected?.id) params.set("c", selected.id);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (channelFilter !== "all") params.set("channel", channelFilter);
    if (unreadOnly) params.set("unread", "1");
    if (search.trim()) params.set("q", search.trim());
    const next = params.toString();
    router.replace(next ? `/admin/support?${next}` : "/admin/support", { scroll: false });
  }, [channelFilter, router, search, selected?.id, statusFilter, unreadOnly]);

  const selectedThreadId = selected?.id ?? "";
  const hasCachedThread = Boolean(selectedThreadId && messagesByConversation[selectedThreadId]);

  const threadQuery = useQuery({
    queryKey: ["admin", "support", "messages", selectedThreadId],
    enabled: Boolean(selectedThreadId) && !hasCachedThread,
    staleTime: 30_000,
    queryFn: async () => {
      const response = await fetch(`/api/admin/support/conversations/${selectedThreadId}/messages`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        messages?: SupportMessageRow[];
        attachments?: SupportAttachmentRow[];
        error?: string | null;
      };
      if (!response.ok || payload.error) {
        throw new Error(payload.error || "Messages could not be loaded.");
      }
      return {
        messages: payload.messages ?? [],
        attachments: payload.attachments ?? [],
      };
    },
  });

  useEffect(() => {
    if (!selectedThreadId || !threadQuery.data) return;
    setMessagesByConversation((current) => ({
      ...current,
      [selectedThreadId]: threadQuery.data.messages,
    }));
    setAttachmentsByConversation((current) => ({
      ...current,
      [selectedThreadId]: threadQuery.data.attachments,
    }));
  }, [selectedThreadId, threadQuery.data]);

  useEffect(() => {
    if (threadQuery.isError) setNotice("Messages could not be loaded.");
  }, [threadQuery.isError]);

  useEffect(() => {
    if (!selectedThreadId || !hasCachedThread) return;
    startTransition(async () => {
      const result = await markSupportConversationRead({ conversationId: selectedThreadId });
      if (result.ok) {
        setConversations((current) =>
          current.map((thread) =>
            thread.id === selectedThreadId ? { ...thread, unread_for_admin: 0 } : thread,
          ),
        );
      }
    });
  }, [hasCachedThread, selectedThreadId]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, selected?.id]);

  function handleReply(payload: { html: string; text: string; drafts: SupportComposerDraft[] }) {
    if (!selected) return;
    const clientMessageId = replyAttemptIdRef.current;
    setNotice(null);
    startTransition(async () => {
      const result = await sendSupportReply({
        conversationId: selected.id,
        body: payload.text,
        html: payload.html,
        clientMessageId,
        drafts: payload.drafts,
      });
      if (!result.ok) {
        const nextNotice = result.error === "email_send_failed"
          ? "Reply saved, but email send failed. You can retry this failed message."
          : result.error === "delivery_pending"
            ? "Reply delivery is pending and will not be resent automatically."
            : result.error === "delivery_uncertain"
              ? "Delivery uncertain. Reconcile before retrying."
              : "Reply could not be sent.";
        setNotice(nextNotice);
        if (result.message) {
          const returnedMessage = result.message;
          setMessagesByConversation((current) => ({
            ...current,
            [selected.id]: (current[selected.id] ?? []).some((message) => message.id === returnedMessage.id)
              ? (current[selected.id] ?? []).map((message) =>
                message.id === returnedMessage.id ? returnedMessage : message)
              : [...(current[selected.id] ?? []), returnedMessage],
          }));
        }
        return;
      }
      replyAttemptIdRef.current = createClientMessageId("admin-reply");
      setComposerEpoch((value) => value + 1);
      setMessagesByConversation((current) => ({
        ...current,
        [selected.id]: [...(current[selected.id] ?? []), result.data.message],
      }));
      setAttachmentsByConversation((current) => ({
        ...current,
        [selected.id]: [...(current[selected.id] ?? []), ...result.data.attachments],
      }));
      setConversations((current) =>
        current.map((thread) =>
          thread.id === selected.id
            ? { ...thread, last_message_at: result.data.message.created_at, unread_for_admin: 0 }
            : thread,
        ),
      );
      setNotice(
        result.data.message.transport === "email"
          ? "Reply accepted for sending by Cloudflare (not final delivery proof)."
          : "In-app reply posted to the conversation.",
      );
    });
  }

  function handleStatus(status: SupportConversationStatus) {
    if (!selected) return;
    setNotice(null);
    startTransition(async () => {
      const result = await setConversationStatus({ conversationId: selected.id, status });
      if (result.ok) {
        setConversations((current) =>
          current.map((thread) => (thread.id === selected.id ? { ...thread, status } : thread)),
        );
      }
      setNotice(result.ok ? `Status set to ${status}.` : "Status could not be updated.");
    });
  }

  function handleNewEmail(payload: { html: string; text: string; drafts: SupportComposerDraft[] }) {
    if (!newTo.trim() || !newSubject.trim()) {
      setNotice("Recipient and subject are required.");
      return;
    }
    const clientMessageId = newEmailAttemptIdRef.current;
    setNotice(null);
    startTransition(async () => {
      const result = await createSupportEmailConversationAndSend({
        to: newTo,
        subject: newSubject,
        body: payload.text,
        html: payload.html,
        clientMessageId,
        drafts: payload.drafts,
      });
      if (!result.ok) {
        setNotice(
          result.error === "email_send_failed"
            ? "Conversation saved, but email send failed."
            : result.error === "validation"
              ? "Check recipient, subject, body, and attachments."
              : "New email could not be created.",
        );
        return;
      }
      setConversations((current) => [result.data.conversation, ...current.filter((c) => c.id !== result.data.conversation.id)]);
      setMessagesByConversation((current) => ({
        ...current,
        [result.data.conversation.id]: [result.data.message],
      }));
      setAttachmentsByConversation((current) => ({
        ...current,
        [result.data.conversation.id]: result.data.attachments,
      }));
      setSelectedId(result.data.conversation.id);
      setShowNewEmail(false);
      setNewTo("");
      setNewSubject("");
      setNewComposerEpoch((value) => value + 1);
      newEmailAttemptIdRef.current = createClientMessageId("admin-new");
      setNotice("New email accepted for sending by Cloudflare (not final delivery proof).");
    });
  }

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[280px_minmax(0,1fr)] overflow-hidden rounded-xs border border-hairline bg-white shadow-[0_1px_0_rgba(0,0,0,0.03)]">
      <section className="flex min-h-0 flex-col border-r border-hairline" aria-label="Support conversations">
        <div className="border-b border-hairline p-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-medium leading-4 text-ink">Inbox</p>
              <p className="truncate text-[9px] leading-3 text-tertiary">
                {readiness.outboundConfigured ? readiness.supportFrom : "Outbound not configured"}
                {" · "}
                {unreadCount} unread
              </p>
            </div>
            <Button type="button" variant="outline" size="xs" onClick={() => setShowNewEmail((value) => !value)}>
              <Plus size={10} className="mr-1" />
              Compose
            </Button>
          </div>

          <label className="relative mt-2 block" htmlFor="support-search">
            <span className="sr-only">Search</span>
            <MagnifyingGlass size={11} className="pointer-events-none absolute left-1.5 top-1.5 text-tertiary" />
            <input
              id="support-search"
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              className="w-full rounded-xs border border-hairline bg-white py-1 pl-5 pr-1.5 text-[10px] leading-4 text-ink"
              placeholder="Search sender or subject"
            />
          </label>

          <div className="mt-2 flex flex-wrap gap-1">
            {channelFilters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                className={cn(
                  "rounded-xs border px-1.5 py-1 text-[9px] leading-3",
                  channelFilter === filter.id ? "border-ink bg-surfaceMuted text-ink" : "border-hairline text-tertiary",
                )}
                onClick={() => setChannelFilter(filter.id)}
              >
                {filter.label}
              </button>
            ))}
            <button
              type="button"
              className={cn(
                "rounded-xs border px-1.5 py-1 text-[9px] leading-3",
                unreadOnly ? "border-ink bg-surfaceMuted text-ink" : "border-hairline text-tertiary",
              )}
              onClick={() => setUnreadOnly((value) => !value)}
            >
              Unread
            </button>
          </div>

          <label className="mt-2 block text-[9px] font-medium uppercase leading-3 text-tertiary" htmlFor="support-status-filter">
            Status
          </label>
          <select
            id="support-status-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.currentTarget.value as SupportConversationStatus | "all")}
            className="mt-1 w-full rounded-xs border border-hairline bg-white px-1.5 py-1 text-[10px] leading-4 text-ink"
          >
            <option value="all">all</option>
            {statuses.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-1.5">
          {filteredConversations.map((thread) => {
            const active = selected?.id === thread.id;
            return (
              <button
                key={thread.id}
                type="button"
                onClick={() => {
                  setSelectedId(thread.id);
                  setShowNewEmail(false);
                }}
                className={cn(
                  "mb-1 w-full rounded-xs border p-2 text-left transition",
                  active ? "border-ink/20 bg-surfaceMuted" : "border-transparent hover:bg-surfaceMuted/70",
                  thread.unread_for_admin ? "font-medium" : "",
                )}
              >
                <div className="flex items-start justify-between gap-1">
                  <span className="truncate text-[10px] leading-4 text-ink">{thread.subject ?? "Support request"}</span>
                  <span className="shrink-0 text-[9px] leading-3 text-tertiary">{formatListTime(thread.last_message_at)}</span>
                </div>
                <p className="mt-0.5 truncate text-[9px] leading-3 text-tertiary">
                  {thread.requester_email ?? thread.requester_name ?? thread.user_id ?? "External sender"}
                </p>
                <div className="mt-1.5 flex items-center justify-between gap-1">
                  <span className="inline-flex items-center gap-1 text-[9px] uppercase leading-3 text-secondary">
                    {thread.channel === "email" ? <EnvelopeSimple size={10} /> : null}
                    {thread.channel}
                    {thread.unread_for_admin ? " · unread" : ""}
                  </span>
                  <StatusBadge status={toBadgeStatus(thread.status)} className="min-w-0 px-1 py-0.5">
                    {thread.status}
                  </StatusBadge>
                </div>
              </button>
            );
          })}
          {!hasConversations && (
            <div className="rounded-xs border border-dashed border-hairline p-3 text-[10px] leading-4 text-tertiary">
              {channelFilter === "email"
                ? "No email conversations yet. Compose one to start."
                : "No support conversations match these filters."}
            </div>
          )}
        </div>
      </section>

      <section className="flex min-h-0 flex-col" aria-label="Support thread">
        {showNewEmail ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="border-b border-hairline px-3 py-2">
              <p className="text-[11px] font-medium leading-4 text-ink">New email</p>
              <p className="text-[9px] leading-3 text-tertiary">Sends from {readiness.supportFrom} only.</p>
              <div className="mt-2 grid gap-1.5">
                <label className="grid grid-cols-[48px_1fr] items-center gap-2 text-[9px] uppercase text-tertiary" htmlFor="new-email-to">
                  To
                  <input
                    id="new-email-to"
                    value={newTo}
                    onChange={(e) => setNewTo(e.currentTarget.value)}
                    className="rounded-xs border border-hairline px-1.5 py-1 text-[10px] normal-case text-ink"
                    placeholder="customer@example.com"
                    autoFocus
                  />
                </label>
                <label className="grid grid-cols-[48px_1fr] items-center gap-2 text-[9px] uppercase text-tertiary" htmlFor="new-email-subject">
                  Subject
                  <input
                    id="new-email-subject"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.currentTarget.value)}
                    className="rounded-xs border border-hairline px-1.5 py-1 text-[10px] normal-case text-ink"
                    placeholder="How can we help?"
                  />
                </label>
              </div>
              {notice && (
                <p id={noticeId} role="status" aria-live="polite" className="mt-1 text-[9px] leading-3 text-tertiary">
                  {notice}
                </p>
              )}
            </div>
            <div className={cn("min-h-0 flex-1 overflow-auto p-2", styles.composer)}>
              <SupportRichComposer
                key={`new-${newComposerEpoch}`}
                id="support-new-email"
                fromLabel={readiness.supportFrom}
                savedReplies={savedReplies}
                disabled={!readiness.outboundConfigured}
                isPending={isPending}
                submitLabel="Send email"
                onSubmit={handleNewEmail}
              />
              <div className="mt-2 flex justify-end">
                <Button type="button" variant="ghost" size="xs" onClick={() => setShowNewEmail(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="border-b border-hairline px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-[11px] font-medium leading-4 text-ink">
                      {selected?.subject ?? "Select a conversation"}
                    </p>
                    {selected && (
                      <span className="rounded-xs border border-hairline px-1 py-0.5 text-[9px] uppercase leading-3 text-secondary">
                        {selected.channel === "email" ? "Email" : "In-app"}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-[9px] leading-3 text-tertiary">
                    {selected
                      ? `${selected.requester_name ? `${selected.requester_name} · ` : ""}${selected.requester_email ?? selected.user_id ?? "unknown"}${selected.mailbox_address ? ` · ${selected.mailbox_address}` : ""}`
                      : "Choose a thread from the inbox"}
                  </p>
                </div>
                {selected && (
                  <select
                    value={selected.status}
                    onChange={(event) => handleStatus(event.currentTarget.value as SupportConversationStatus)}
                    disabled={isPending}
                    className="rounded-xs border border-hairline bg-white px-1.5 py-1 text-[10px] leading-4 text-ink"
                    aria-label="Conversation status"
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                )}
              </div>
              {notice && (
                <p id={noticeId} role="status" aria-live="polite" className="mt-1 text-[9px] leading-3 text-tertiary">
                  {notice}
                </p>
              )}
              {selected?.channel === "email" && !readiness.outboundConfigured && (
                <p className="mt-1 text-[9px] leading-3 text-tertiary">Email delivery is not configured for this environment.</p>
              )}
              {selected?.channel === "email" && !readiness.inboundEnabled && (
                <p className="mt-1 text-[9px] leading-3 text-tertiary">Inbound routing is code-ready but feature-gated off until enabled.</p>
              )}
              {selected?.channel === "in_app" && (
                <p className="mt-1 text-[9px] leading-3 text-tertiary">
                  In-app thread from a signed-in user. Replies stay in the product inbox (not emailed).
                </p>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-auto bg-[linear-gradient(180deg,#fafafa_0%,#ffffff_48px)] px-3 py-2">
              {messages.map((message) => (
                <SupportMessageCard
                  key={message.id}
                  message={message}
                  attachments={attachmentsByMessage.get(message.id) ?? []}
                />
              ))}
              {selected && messages.length === 0 && (
                <div className="rounded-xs border border-dashed border-hairline p-3 text-[10px] leading-4 text-tertiary">
                  No messages loaded for this conversation.
                </div>
              )}
              {!selected && (
                <div className="flex h-full min-h-40 items-center justify-center rounded-xs border border-dashed border-hairline p-4 text-center text-[10px] leading-4 text-tertiary">
                  Select a conversation or compose a new email.
                </div>
              )}
              <div ref={threadEndRef} />
            </div>

            <div className={cn("border-t border-hairline p-2", styles.composer)}>
              <SupportRichComposer
                key={`${selected?.id ?? "none"}-${composerEpoch}`}
                id="support-reply"
                fromLabel={
                  selected?.channel === "in_app"
                    ? "In-app support"
                    : readiness.supportFrom
                }
                savedReplies={savedReplies}
                disabled={
                  !selected
                  || (selected.channel === "email" && !readiness.outboundConfigured)
                }
                isPending={isPending}
                placeholder={
                  !selected
                    ? "Select a conversation first."
                    : selected.channel === "in_app"
                      ? "Write an in-app reply…"
                      : "Write a reply…"
                }
                submitLabel={selected?.channel === "in_app" ? "Post reply" : "Send reply"}
                onSubmit={handleReply}
              />
            </div>
          </>
        )}
      </section>
    </div>
  );
}
