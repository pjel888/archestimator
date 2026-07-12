"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { sendSupportReply, setConversationStatus } from "@/lib/admin/support-actions";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/ui/cn";
import type {
  SupportConversationRow,
  SupportConversationStatus,
  SupportMessageRow,
} from "@/lib/repositories/support-conversations-repository";
import type { StatusBadgeStatus } from "@/components/ui/status-badge";

type AdminSupportInboxProps = {
  conversations: SupportConversationRow[];
  initialMessages: SupportMessageRow[];
};

const statuses: SupportConversationStatus[] = ["open", "pending", "resolved", "archived"];

function toBadgeStatus(status: SupportConversationStatus): StatusBadgeStatus {
  if (status === "open") return "active";
  if (status === "resolved") return "approved";
  if (status === "archived") return "inactive";
  return "review";
}

export function AdminSupportInbox({ conversations, initialMessages }: AdminSupportInboxProps) {
  const [selectedId, setSelectedId] = useState(conversations[0]?.id ?? "");
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, SupportMessageRow[]>>(
    conversations[0] ? { [conversations[0].id]: initialMessages } : {},
  );
  const [reply, setReply] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const selected = conversations.find((thread) => thread.id === selectedId) ?? conversations[0] ?? null;
  const messages = selected ? messagesByConversation[selected.id] ?? [] : [];
  const hasConversations = conversations.length > 0;
  const clientMessageId = useMemo(() => `admin-${Date.now()}-${Math.random().toString(36).slice(2)}`, [reply]);

  useEffect(() => {
    if (!selectedId || messagesByConversation[selectedId]) return;
    let active = true;
    fetch(`/api/admin/support/conversations/${selectedId}/messages`, { cache: "no-store" })
      .then((response) => response.json() as Promise<{ messages?: SupportMessageRow[] }>)
      .then((payload) => {
        if (!active) return;
        setMessagesByConversation((current) => ({ ...current, [selectedId]: payload.messages ?? [] }));
      })
      .catch(() => {
        if (active) setNotice("Messages could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, [messagesByConversation, selectedId]);

  function handleReply() {
    if (!selected || !reply.trim()) return;
    const body = reply;
    setNotice(null);
    startTransition(async () => {
      const result = await sendSupportReply({
        conversationId: selected.id,
        body,
        clientMessageId,
      });
      if (!result.ok) {
        const notice = result.error === "email_send_failed"
          ? "Reply saved, but email delivery failed."
          : result.error === "delivery_pending"
            ? "Reply delivery is being reconciled and will not be resent automatically."
            : result.error === "delivery_uncertain"
              ? "Email delivery is uncertain. Reconcile it before retrying."
              : "Reply could not be sent.";
        setNotice(notice);
        if (result.message) {
          const returnedMessage = result.message;
          setMessagesByConversation((current) => ({
            ...current,
            [selected.id]: (current[selected.id] ?? []).some((message) => message.id === returnedMessage.id)
              ? (current[selected.id] ?? []).map((message) => message.id === returnedMessage.id ? returnedMessage : message)
              : [...(current[selected.id] ?? []), returnedMessage],
          }));
        }
        return;
      }
      setReply("");
      setMessagesByConversation((current) => ({
        ...current,
        [selected.id]: [...(current[selected.id] ?? []), result.data.message],
      }));
      setNotice("Reply sent.");
    });
  }

  function handleStatus(status: SupportConversationStatus) {
    if (!selected) return;
    setNotice(null);
    startTransition(async () => {
      const result = await setConversationStatus({ conversationId: selected.id, status });
      setNotice(result.ok ? `Status set to ${status}.` : "Status could not be updated.");
    });
  }

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[240px_1fr] overflow-hidden rounded-xs border border-hairline bg-white">
      <section className="min-h-0 border-r border-hairline" aria-label="Support conversations">
        <div className="border-b border-hairline p-2">
          <p className="text-[11px] font-medium leading-4 text-ink">Inbox</p>
          <p className="text-[9px] leading-3 text-tertiary">{hasConversations ? "D1 conversations." : "No support conversations yet."}</p>
        </div>
        <div className="flex flex-col gap-1 p-1.5">
          {conversations.map((thread) => (
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
              <p className="truncate text-[9px] leading-3 text-tertiary">{thread.requester_email ?? thread.user_id}</p>
              <p className="mt-1 line-clamp-2 text-[9px] leading-3 text-secondary">{thread.last_message_at}</p>
            </button>
          ))}
          {!hasConversations && (
            <div className="rounded-xs border border-dashed border-hairline p-2 text-[9px] leading-4 text-tertiary">
              Support rows will appear here after users start in-app conversations.
            </div>
          )}
        </div>
      </section>

      <section className="flex min-h-0 flex-col" aria-label="Support thread">
        <div className="border-b border-hairline p-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[11px] font-medium leading-4 text-ink">{selected?.subject ?? "Select a conversation"}</p>
              <p className="text-[9px] leading-3 text-tertiary">{selected?.requester_email ?? selected?.user_id ?? "No active thread"}</p>
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
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            )}
          </div>
          {notice && <p className="mt-1 text-[9px] leading-3 text-tertiary">{notice}</p>}
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-2">
          {messages.map((message) => (
            <div key={message.id} className="mb-1 rounded-xs border border-hairline bg-surfaceMuted/60 p-2 text-[10px] leading-4 text-secondary">
              <div className="mb-1 flex items-center justify-between gap-2 text-[9px] leading-3 text-tertiary">
                <span>{message.sender_role}</span>
                <span>{message.send_status}</span>
              </div>
              {message.body_text}
            </div>
          ))}
          {selected && messages.length === 0 && (
            <div className="rounded-xs border border-dashed border-hairline p-2 text-[10px] leading-4 text-tertiary">
              No messages loaded for this conversation.
            </div>
          )}
        </div>
        <form className="border-t border-hairline p-2" aria-label="Support reply composer">
          <label className="text-[9px] font-medium uppercase leading-3 text-tertiary" htmlFor="support-reply">
            Reply composer
          </label>
          <textarea
            id="support-reply"
            className="mt-1 min-h-20 w-full resize-none rounded-xs border border-hairline bg-white p-2 text-[10px] leading-4 text-ink outline-none placeholder:text-tertiary focus-visible:ring-1 focus-visible:ring-focus"
            value={reply}
            onChange={(event) => setReply(event.currentTarget.value)}
            placeholder={selected ? "Write a reply..." : "Select a conversation first."}
            disabled={!selected || isPending}
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
