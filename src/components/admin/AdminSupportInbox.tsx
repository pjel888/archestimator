"use client";

import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  createSupportEmailConversationAndSend,
  markSupportConversationRead,
  sendSupportReply,
  setConversationStatus,
} from "@/lib/admin/support-actions";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/ui/cn";
import type {
  SupportAttachmentRow,
  SupportChannelFilter,
  SupportConversationRow,
  SupportConversationStatus,
  SupportMessageRow,
} from "@/lib/repositories/support-conversations-d1";
import type { StatusBadgeStatus } from "@/components/ui/status-badge";

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

function sendStatusLabel(status: SupportMessageRow["send_status"], transport: SupportMessageRow["transport"]) {
  if (transport !== "email") return status === "sent" ? "Recorded" : status;
  if (status === "sent") return "Accepted";
  if (status === "pending") return "Pending";
  if (status === "send_failed") return "Failed";
  return status;
}

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
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
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedId, setSelectedId] = useState(
    searchParams.get("c") || initialConversations[0]?.id || "",
  );
  const [statusFilter, setStatusFilter] = useState<SupportConversationStatus | "all">(
    (searchParams.get("status") as SupportConversationStatus | null) ?? "all",
  );
  const [channelFilter, setChannelFilter] = useState<SupportChannelFilter>(
    (searchParams.get("channel") as SupportChannelFilter | null) ?? "all",
  );
  const [unreadOnly, setUnreadOnly] = useState(searchParams.get("unread") === "1");
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, SupportMessageRow[]>>(
    initialConversations[0] ? { [initialConversations[0].id]: initialMessages } : {},
  );
  const [attachmentsByConversation, setAttachmentsByConversation] = useState<
    Record<string, SupportAttachmentRow[]>
  >(initialConversations[0] ? { [initialConversations[0].id]: initialAttachments } : {});
  const [reply, setReply] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showNewEmail, setShowNewEmail] = useState(false);
  const [newTo, setNewTo] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newBody, setNewBody] = useState("");
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
  const hasConversations = filteredConversations.length > 0;

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

  useEffect(() => {
    if (!selected?.id) return;
    if (messagesByConversation[selected.id]) {
      startTransition(async () => {
        await markSupportConversationRead({ conversationId: selected.id });
      });
      return;
    }
    let active = true;
    fetch(`/api/admin/support/conversations/${selected.id}/messages`, { cache: "no-store" })
      .then((response) => response.json() as Promise<{
        messages?: SupportMessageRow[];
        attachments?: SupportAttachmentRow[];
        error?: string | null;
      }>)
      .then((payload) => {
        if (!active) return;
        if (payload.error) setNotice("Messages could not be loaded.");
        setMessagesByConversation((current) => ({ ...current, [selected.id]: payload.messages ?? [] }));
        setAttachmentsByConversation((current) => ({ ...current, [selected.id]: payload.attachments ?? [] }));
        void markSupportConversationRead({ conversationId: selected.id });
      })
      .catch(() => {
        if (active) setNotice("Messages could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, [messagesByConversation, selected?.id]);

  function handleReply() {
    if (!selected || !reply.trim()) return;
    const body = reply;
    const clientMessageId = replyAttemptIdRef.current;
    setNotice(null);
    startTransition(async () => {
      const result = await sendSupportReply({
        conversationId: selected.id,
        body,
        clientMessageId,
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
      setReply("");
      replyAttemptIdRef.current = createClientMessageId("admin-reply");
      setMessagesByConversation((current) => ({
        ...current,
        [selected.id]: [...(current[selected.id] ?? []), result.data.message],
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
          : "Reply recorded.",
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

  function handleNewEmail() {
    if (!newTo.trim() || !newSubject.trim() || !newBody.trim()) return;
    const clientMessageId = newEmailAttemptIdRef.current;
    setNotice(null);
    startTransition(async () => {
      const result = await createSupportEmailConversationAndSend({
        to: newTo,
        subject: newSubject,
        body: newBody,
        clientMessageId,
      });
      if (!result.ok) {
        setNotice(
          result.error === "email_send_failed"
            ? "Conversation saved, but email send failed."
            : result.error === "validation"
              ? "Check recipient, subject, and body."
              : "New email could not be created.",
        );
        return;
      }
      setConversations((current) => [result.data.conversation, ...current.filter((c) => c.id !== result.data.conversation.id)]);
      setMessagesByConversation((current) => ({
        ...current,
        [result.data.conversation.id]: [result.data.message],
      }));
      setSelectedId(result.data.conversation.id);
      setShowNewEmail(false);
      setNewTo("");
      setNewSubject("");
      setNewBody("");
      newEmailAttemptIdRef.current = createClientMessageId("admin-new");
      setNotice("New email accepted for sending by Cloudflare (not final delivery proof).");
    });
  }

  function insertSavedReply(body: string) {
    setReply((current) => (current ? `${current}\n\n${body}` : body));
  }

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[260px_1fr] overflow-hidden rounded-xs border border-hairline bg-white">
      <section className="min-h-0 border-r border-hairline" aria-label="Support conversations">
        <div className="border-b border-hairline p-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-medium leading-4 text-ink">Inbox</p>
              <p className="text-[9px] leading-3 text-tertiary">
                {readiness.outboundConfigured ? `From ${readiness.supportFrom}` : "Outbound email not configured"}
                {" · "}
                {readiness.inboundEnabled ? "Inbound code ready" : "Inbound disabled"}
              </p>
            </div>
            <Button type="button" variant="outline" size="xs" onClick={() => setShowNewEmail((value) => !value)}>
              New email
            </Button>
          </div>
          <label className="mt-2 block text-[9px] font-medium uppercase leading-3 text-tertiary" htmlFor="support-search">
            Search
          </label>
          <input
            id="support-search"
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            className="mt-1 w-full rounded-xs border border-hairline bg-white px-1.5 py-1 text-[10px] leading-4 text-ink"
            placeholder="Sender, name, or subject"
          />
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
        <div className="flex max-h-full flex-col gap-1 overflow-auto p-1.5">
          {filteredConversations.map((thread) => (
            <button
              key={thread.id}
              type="button"
              onClick={() => setSelectedId(thread.id)}
              className={cn(
                "rounded-xs p-2 text-left transition",
                selected?.id === thread.id ? "bg-surfaceMuted" : "hover:bg-surfaceMuted",
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="truncate text-[10px] font-medium leading-4 text-ink">{thread.subject ?? "Support request"}</span>
                <StatusBadge status={toBadgeStatus(thread.status)} className="min-w-0 px-1 py-1">
                  {thread.status}
                </StatusBadge>
              </div>
              <p className="truncate text-[9px] leading-3 text-tertiary">
                {thread.requester_email ?? thread.requester_name ?? thread.user_id ?? "External sender"}
              </p>
              <div className="mt-1 flex items-center justify-between gap-1 text-[9px] leading-3 text-secondary">
                <span className="uppercase">{thread.channel}</span>
                <span>{thread.unread_for_admin ? "Unread" : thread.last_message_at}</span>
              </div>
            </button>
          ))}
          {!hasConversations && (
            <div className="rounded-xs border border-dashed border-hairline p-2 text-[9px] leading-4 text-tertiary">
              {channelFilter === "email"
                ? "No email conversations yet."
                : "No support conversations match these filters."}
            </div>
          )}
        </div>
      </section>

      <section className="flex min-h-0 flex-col" aria-label="Support thread">
        {showNewEmail && (
          <div className="border-b border-hairline p-2" aria-label="New support email">
            <p className="text-[11px] font-medium leading-4 text-ink">New email</p>
            <p className="text-[9px] leading-3 text-tertiary">Sends from {readiness.supportFrom} only.</p>
            <label className="mt-2 block text-[9px] font-medium uppercase leading-3 text-tertiary" htmlFor="new-email-to">To</label>
            <input id="new-email-to" value={newTo} onChange={(e) => setNewTo(e.currentTarget.value)} className="mt-1 w-full rounded-xs border border-hairline px-1.5 py-1 text-[10px]" />
            <label className="mt-2 block text-[9px] font-medium uppercase leading-3 text-tertiary" htmlFor="new-email-subject">Subject</label>
            <input id="new-email-subject" value={newSubject} onChange={(e) => setNewSubject(e.currentTarget.value)} className="mt-1 w-full rounded-xs border border-hairline px-1.5 py-1 text-[10px]" />
            <label className="mt-2 block text-[9px] font-medium uppercase leading-3 text-tertiary" htmlFor="new-email-body">Body</label>
            <textarea id="new-email-body" value={newBody} onChange={(e) => setNewBody(e.currentTarget.value)} className="mt-1 min-h-20 w-full rounded-xs border border-hairline p-2 text-[10px]" />
            <div className="mt-2 flex justify-end gap-1">
              <Button type="button" variant="ghost" size="xs" onClick={() => setShowNewEmail(false)}>Cancel</Button>
              <Button type="button" variant="outline" size="xs" disabled={isPending || !newTo.trim() || !newSubject.trim() || !newBody.trim()} onClick={handleNewEmail}>
                {isPending ? "Sending" : "Send email"}
              </Button>
            </div>
          </div>
        )}

        <div className="border-b border-hairline p-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[11px] font-medium leading-4 text-ink">{selected?.subject ?? "Select a conversation"}</p>
              <p className="text-[9px] leading-3 text-tertiary">
                {selected
                  ? `${selected.requester_name ? `${selected.requester_name} · ` : ""}${selected.requester_email ?? selected.user_id ?? "unknown"} · ${selected.channel}${selected.mailbox_address ? ` · ${selected.mailbox_address}` : ""}`
                  : "No active thread"}
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
          {!readiness.outboundConfigured && (
            <p className="mt-1 text-[9px] leading-3 text-tertiary">Email delivery is not configured for this environment.</p>
          )}
          {!readiness.inboundEnabled && (
            <p className="mt-1 text-[9px] leading-3 text-tertiary">Inbound routing is code-ready but feature-gated off until enabled.</p>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-2">
          {messages.map((message) => {
            const messageAttachments = attachments.filter((attachment) => attachment.message_id === message.id);
            let warning: { flags?: string[] } | null = null;
            if (message.warning_flags_json) {
              try {
                warning = JSON.parse(message.warning_flags_json) as { flags?: string[] };
              } catch {
                warning = null;
              }
            }
            return (
              <div key={message.id} className="mb-1 rounded-xs border border-hairline bg-surfaceMuted/60 p-2 text-[10px] leading-4 text-secondary">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-[9px] leading-3 text-tertiary">
                  <span>
                    {message.sender_role}
                    {message.direction !== "internal" ? ` · ${message.direction}` : ""}
                    {` · ${message.transport}`}
                  </span>
                  <span>{sendStatusLabel(message.send_status, message.transport)} · {message.created_at}</span>
                </div>
                <pre className="whitespace-pre-wrap font-sans text-[10px] leading-4 text-ink">{message.body_text}</pre>
                {warning?.flags && warning.flags.length > 0 && (
                  <p className="mt-1 text-[9px] leading-3 text-tertiary">
                    Warning: {warning.flags.join(", ")}
                  </p>
                )}
                {messageAttachments.length > 0 && (
                  <ul className="mt-2 space-y-1" aria-label="Attachments">
                    {messageAttachments.map((attachment) => (
                      <li key={attachment.id} className="text-[9px] leading-3">
                        {attachment.storage_status === "stored" ? (
                          <a
                            className="underline"
                            href={`/api/admin/support/attachments/${attachment.id}`}
                          >
                            {attachment.filename} ({formatBytes(attachment.size_bytes)})
                          </a>
                        ) : (
                          <span className="text-tertiary">
                            {attachment.filename} — {attachment.storage_status}
                            {attachment.storage_status === "blocked" ? " (unsafe type blocked)" : ""}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
          {selected && messages.length === 0 && (
            <div className="rounded-xs border border-dashed border-hairline p-2 text-[10px] leading-4 text-tertiary">
              No messages loaded for this conversation.
            </div>
          )}
        </div>

        <form className="border-t border-hairline p-2" aria-label="Support reply composer" onSubmit={(event) => event.preventDefault()}>
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <label className="text-[9px] font-medium uppercase leading-3 text-tertiary" htmlFor="support-reply">
              Reply as {readiness.supportFrom}
            </label>
            {savedReplies.length > 0 && (
              <label className="text-[9px] leading-3 text-tertiary" htmlFor="saved-reply-insert">
                Saved reply
                <select
                  id="saved-reply-insert"
                  className="ml-1 rounded-xs border border-hairline bg-white px-1 py-0.5 text-[10px]"
                  defaultValue=""
                  onChange={(event) => {
                    const replyBody = event.currentTarget.value;
                    if (replyBody) insertSavedReply(replyBody);
                    event.currentTarget.value = "";
                  }}
                >
                  <option value="">Insert…</option>
                  {savedReplies.map((saved) => (
                    <option key={saved.id} value={saved.body}>{saved.label}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <textarea
            id="support-reply"
            className="mt-1 min-h-20 w-full resize-none rounded-xs border border-hairline bg-white p-2 text-[10px] leading-4 text-ink outline-none placeholder:text-tertiary focus-visible:ring-1 focus-visible:ring-focus"
            value={reply}
            onChange={(event) => setReply(event.currentTarget.value)}
            placeholder={selected ? "Write a reply..." : "Select a conversation first."}
            disabled={!selected || isPending}
            aria-describedby={notice ? noticeId : undefined}
          />
          <div className="mt-2 flex justify-end">
            <Button type="button" variant="outline" size="xs" disabled={!selected || !reply.trim() || isPending} onClick={handleReply}>
              {isPending ? "Sending" : "Send reply"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
