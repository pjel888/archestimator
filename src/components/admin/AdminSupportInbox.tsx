"use client";

import dynamic from "next/dynamic";
import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createSupportEmailConversationAndSend,
  forwardSupportConversation,
  markSupportConversationRead,
  replaceSupportTriageLabels,
  sendSupportReply,
  setConversationStatus,
  updateSupportTriage,
} from "@/lib/admin/support-actions";
import { Button } from "@/components/ui/button";
import { SupportMessageCard } from "@/components/admin/support/SupportMessageCard";
import { SupportMailboxRail } from "@/components/admin/support/SupportMailboxRail";
import type { SupportComposerDraft } from "@/components/admin/support/SupportRichComposer";
import { cn } from "@/lib/ui/cn";
import type {
  SupportAttachmentRow,
  SupportChannelFilter,
  SupportConversationRow,
  SupportConversationStatus,
  SupportConversationTriageRow,
  SupportMessageRow,
  SupportMailboxFolder,
} from "@/lib/repositories/support-conversations-d1";
import type { SupportDraftRow } from "@/lib/repositories/support-drafts-d1";
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
    sendIdentities: Array<{ id: "support" | "philip"; fromAddress: string; fromName: string; isDefault: boolean }>;
  };
};

const statuses: SupportConversationStatus[] = ["open", "pending", "resolved", "archived"];
const emptyMailboxCounts: Record<SupportMailboxFolder, number> = {
  inbox: 0, sent: 0, archive: 0, all: 0, starred: 0, snoozed: 0,
};

function createClientMessageId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function isEditableShortcutTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || Boolean(target.closest("input, textarea, select, [contenteditable='true'], [role='dialog']"));
}

function parseDraftRecipientList(value: string | null) {
  if (!value) return "";
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return "";
    return parsed.flatMap((recipient) => (
      recipient && typeof recipient === "object" && typeof (recipient as { email?: unknown }).email === "string"
        ? [(recipient as { email: string }).email]
        : []
    )).join(", ");
  } catch {
    return "";
  }
}

export function AdminSupportInbox({
  conversations: initialConversations,
  initialMessages,
  initialAttachments = [],
  savedReplies,
  readiness,
}: AdminSupportInboxProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const noticeId = useId();
  const threadEndRef = useRef<HTMLDivElement>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);
  const initialSelectedId =
    searchParams.get("c") && initialConversations.some((thread) => thread.id === searchParams.get("c"))
      ? searchParams.get("c")!
      : initialConversations[0]?.id || "";
  const [selectedId, setSelectedId] = useState(initialSelectedId);
  const [folder, setFolder] = useState<SupportMailboxFolder>(
    (searchParams.get("folder") as SupportMailboxFolder | null) ?? "inbox",
  );
  const [statusFilter, setStatusFilter] = useState<SupportConversationStatus | "all">(
    (searchParams.get("status") as SupportConversationStatus | null) ?? "all",
  );
  const [channelFilter, setChannelFilter] = useState<SupportChannelFilter>(
    (searchParams.get("channel") as SupportChannelFilter | null) ?? "all",
  );
  const [unreadOnly, setUnreadOnly] = useState(searchParams.get("unread") === "1");
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [labelFilter, setLabelFilter] = useState(searchParams.get("label") ?? "");
  const [assignedToMe, setAssignedToMe] = useState(searchParams.get("assignee") === "me");
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, SupportMessageRow[]>>(
    initialSelectedId ? { [initialSelectedId]: initialMessages } : {},
  );
  const [attachmentsByConversation, setAttachmentsByConversation] = useState<
    Record<string, SupportAttachmentRow[]>
  >(initialSelectedId ? { [initialSelectedId]: initialAttachments } : {});
  const [notice, setNotice] = useState<string | null>(null);
  const [realtimeState, setRealtimeState] = useState<"connecting" | "connected" | "reconnecting" | "degraded" | "offline">("offline");
  const [isPending, startTransition] = useTransition();
  const [showNewEmail, setShowNewEmail] = useState(false);
  const [showDrafts, setShowDrafts] = useState(false);
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);
  const [showForward, setShowForward] = useState(false);
  const [fromIdentityId, setFromIdentityId] = useState<"support" | "philip">(
    readiness.sendIdentities.find((identity) => identity.isDefault)?.id ?? "support",
  );
  const [newTo, setNewTo] = useState("");
  const [newCc, setNewCc] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [forwardTo, setForwardTo] = useState("");
  const [forwardCc, setForwardCc] = useState("");
  const [forwardAttachmentIds, setForwardAttachmentIds] = useState<string[]>([]);
  const [composerEpoch, setComposerEpoch] = useState(0);
  const [newComposerEpoch, setNewComposerEpoch] = useState(0);
  const [replyAttemptId, setReplyAttemptId] = useState(() => createClientMessageId("admin-reply"));
  const [newEmailAttemptId, setNewEmailAttemptId] = useState(() => createClientMessageId("admin-new"));
  const [replyDraftId, setReplyDraftId] = useState(() => crypto.randomUUID());
  const [newEmailDraftId, setNewEmailDraftId] = useState(() => crypto.randomUUID());
  const [triageByConversation, setTriageByConversation] = useState<Record<string, SupportConversationTriageRow>>({});
  const [replyAll, setReplyAll] = useState(false);
  const replyDraftFields = useMemo(() => ({ from_identity_id: fromIdentityId }), [fromIdentityId]);
  const newEmailDraftFields = useMemo(() => ({
    to_json: newTo.trim() ? JSON.stringify([{ email: newTo.trim() }]) : null,
    cc_json: newCc.trim() ? JSON.stringify(newCc.split(",").map((email) => ({ email: email.trim() })).filter((recipient) => recipient.email)) : null,
    subject: newSubject.trim() || null,
    from_identity_id: fromIdentityId,
  }), [fromIdentityId, newCc, newSubject, newTo]);

  const mailboxQuery = useQuery({
    queryKey: ["admin", "support", "mailbox", folder, statusFilter, channelFilter, unreadOnly, search.trim(), labelFilter.trim(), assignedToMe],
    queryFn: async () => {
      const params = new URLSearchParams({ folder, channel: channelFilter, limit: "50" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (unreadOnly) params.set("unread", "1");
      if (search.trim()) params.set("q", search.trim());
      if (labelFilter.trim()) params.set("label", labelFilter.trim());
      if (assignedToMe) params.set("assignee", "me");
      const response = await fetch(`/api/admin/support/conversations?${params}`, { cache: "no-store" });
      const payload = (await response.json()) as {
        conversations?: SupportConversationRow[];
        counts?: Record<SupportMailboxFolder, number>;
        error?: string | null;
      };
      if (!response.ok || payload.error) throw new Error(payload.error || "Support conversations could not be loaded.");
      return {
        conversations: payload.conversations ?? [],
        counts: payload.counts ?? emptyMailboxCounts,
      };
    },
  });
  const draftsQuery = useQuery({
    queryKey: ["admin", "support", "drafts"],
    enabled: showDrafts,
    queryFn: async () => {
      const response = await fetch("/api/admin/support/drafts", { cache: "no-store" });
      const payload = await response.json() as { drafts?: SupportDraftRow[]; error?: string | null };
      if (!response.ok || payload.error) throw new Error(payload.error || "Support drafts could not be loaded.");
      return payload.drafts ?? [];
    },
  });
  const conversations = mailboxQuery.data?.conversations ?? initialConversations;
  const mailboxCounts = mailboxQuery.data?.counts ?? emptyMailboxCounts;
  const selected = conversations.find((thread) => thread.id === selectedId)
    ?? conversations[0]
    ?? null;
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
  const messages = selected
    ? messagesByConversation[selected.id] ?? threadQuery.data?.messages ?? []
    : [];
  const triageQuery = useQuery({
    queryKey: ["admin", "support", "triage", selectedThreadId],
    enabled: Boolean(selectedThreadId),
    staleTime: 30_000,
    queryFn: async () => {
      const response = await fetch(`/api/admin/support/conversations/${selectedThreadId}/triage`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        triage?: SupportConversationTriageRow | null;
        error?: string | null;
      };
      if (!response.ok || payload.error) throw new Error(payload.error || "Conversation triage could not be loaded.");
      return payload.triage ?? null;
    },
  });
  const selectedTriage = selectedThreadId
    ? triageByConversation[selectedThreadId] ?? triageQuery.data ?? null
    : null;
  const attachmentsByMessage = useMemo(() => {
    const attachments = selected
      ? attachmentsByConversation[selected.id] ?? threadQuery.data?.attachments ?? []
      : [];
    const map = new Map<string, SupportAttachmentRow[]>();
    for (const attachment of attachments) {
      const list = map.get(attachment.message_id);
      if (list) list.push(attachment);
      else map.set(attachment.message_id, [attachment]);
    }
    return map;
  }, [attachmentsByConversation, selected, threadQuery.data?.attachments]);
  const forwardableAttachments = useMemo(
    () => [...attachmentsByMessage.values()].flat().filter((attachment) => attachment.storage_status === "stored"),
    [attachmentsByMessage],
  );

  useEffect(() => {
    const params = new URLSearchParams();
    if (selected?.id) params.set("c", selected.id);
    if (folder !== "inbox") params.set("folder", folder);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (channelFilter !== "all") params.set("channel", channelFilter);
    if (unreadOnly) params.set("unread", "1");
    if (search.trim()) params.set("q", search.trim());
    if (labelFilter.trim()) params.set("label", labelFilter.trim());
    if (assignedToMe) params.set("assignee", "me");
    const next = params.toString();
    router.replace(next ? `/admin/support?${next}` : "/admin/support", { scroll: false });
  }, [assignedToMe, channelFilter, folder, labelFilter, router, search, selected?.id, statusFilter, unreadOnly]);

  useEffect(() => {
    if (!selectedThreadId || !hasCachedThread) return;
    startTransition(async () => {
      const result = await markSupportConversationRead({ conversationId: selectedThreadId });
      if (result.ok) {
        void queryClient.invalidateQueries({ queryKey: ["admin", "support", "mailbox"] });
      }
    });
  }, [hasCachedThread, queryClient, selectedThreadId]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, selected?.id]);

  useEffect(() => {
    if (!selected || selected.channel !== "in_app") return;
    let socket: WebSocket | null = null;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;
    const backfill = () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "support", "messages", selected.id] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "support", "mailbox"] });
    };
    const reconnect = () => {
      if (cancelled) return;
      setRealtimeState(attempts > 0 ? "reconnecting" : "degraded");
      const delay = Math.min(30_000, 500 * 2 ** Math.min(attempts, 6)) + Math.floor(Math.random() * 250);
      attempts += 1;
      retryTimer = setTimeout(() => void connect(), delay);
    };
    const connect = async () => {
      setRealtimeState(attempts > 0 ? "reconnecting" : "connecting");
      try {
        const response = await fetch(`/api/support/conversations/${selected.id}/realtime-token`, { cache: "no-store" });
        const payload = await response.json() as { roomToken?: string };
        if (!response.ok || !payload.roomToken || cancelled) { reconnect(); return; }
        const url = new URL(`/__cloudflare/support-inbox/${selected.id}`, window.location.origin);
        url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
        url.searchParams.set("token", payload.roomToken);
        socket = new WebSocket(url);
        socket.onopen = () => {
          attempts = 0;
          setRealtimeState("connected");
          backfill();
        };
        socket.onmessage = (event) => {
          try {
            const invalidation = JSON.parse(String(event.data)) as { type?: unknown; conversationId?: unknown; messageId?: unknown };
            if (invalidation.type !== "support_message_created" || invalidation.conversationId !== selected.id || typeof invalidation.messageId !== "string") return;
            backfill();
          } catch {
            // D1 history remains authoritative when an invalidation is malformed.
          }
        };
        socket.onclose = reconnect;
      } catch {
        reconnect();
      }
    };
    const onOnline = () => { backfill(); if (!socket || socket.readyState > WebSocket.OPEN) reconnect(); };
    const onVisibility = () => { if (document.visibilityState === "visible") onOnline(); };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibility);
    void connect();
    return () => {
      cancelled = true;
      setRealtimeState("offline");
      if (retryTimer) clearTimeout(retryTimer);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibility);
      socket?.close();
    };
  }, [queryClient, selected]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || isEditableShortcutTarget(event.target)) return;
      const index = selected ? conversations.findIndex((conversation) => conversation.id === selected.id) : -1;
      if (event.key === "j" && conversations.length > 0) {
        event.preventDefault();
        setSelectedId(conversations[Math.min(conversations.length - 1, Math.max(0, index + 1))]!.id);
      } else if (event.key === "k" && conversations.length > 0) {
        event.preventDefault();
        setSelectedId(conversations[Math.max(0, index - 1)]!.id);
      } else if (event.key === "a" && selected) {
        event.preventDefault();
        startTransition(async () => {
          const result = await setConversationStatus({ conversationId: selected.id, status: "archived" });
          if (result.ok) void queryClient.invalidateQueries({ queryKey: ["admin", "support", "mailbox"] });
          setNotice(result.ok ? "Status set to archived." : "Status could not be updated.");
        });
      } else if (event.key === "/") {
        event.preventDefault();
        document.getElementById("support-search")?.focus();
      } else if (event.key === "r" && selected) {
        event.preventDefault();
        document.getElementById("support-reply")?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [conversations, queryClient, selected]);

  function handleReply(payload: { draftScopeKey: string; html: string; text: string; drafts: SupportComposerDraft[] }) {
    if (!selected) return;
    const clientMessageId = replyAttemptId;
    setNotice(null);
    startTransition(async () => {
      const result = await sendSupportReply({
        conversationId: selected.id,
        body: payload.text,
        html: payload.html,
        clientMessageId,
        fromIdentityId,
        replyAll,
        draftScopeKey: payload.draftScopeKey,
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
      setReplyAttemptId(createClientMessageId("admin-reply"));
      setReplyDraftId(crypto.randomUUID());
      setComposerEpoch((value) => value + 1);
      setMessagesByConversation((current) => ({
        ...current,
        [selected.id]: [...(current[selected.id] ?? []), result.data.message],
      }));
      setAttachmentsByConversation((current) => ({
        ...current,
        [selected.id]: [...(current[selected.id] ?? []), ...result.data.attachments],
      }));
      void queryClient.invalidateQueries({ queryKey: ["admin", "support", "mailbox"] });
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
        void queryClient.invalidateQueries({ queryKey: ["admin", "support", "mailbox"] });
      }
      setNotice(result.ok ? `Status set to ${status}.` : "Status could not be updated.");
    });
  }

  function handleTriage(update: { starredForAdmin?: boolean; snoozedUntil?: string | null; assignToSelf?: boolean }) {
    if (!selected) return;
    const current = triageByConversation[selected.id] ?? triageQuery.data;
    setNotice(null);
    startTransition(async () => {
      const result = await updateSupportTriage({
        conversationId: selected.id,
        expectedRevision: current?.revision ?? 0,
        ...update,
      });
      if (!result.ok) {
        void queryClient.invalidateQueries({ queryKey: ["admin", "support", "triage", selected.id] });
        setNotice("Triage changed elsewhere. Refresh the conversation and try again.");
        return;
      }
      setTriageByConversation((values) => ({ ...values, [selected.id]: result.data.triage }));
      queryClient.setQueryData(["admin", "support", "triage", selected.id], result.data.triage);
      void queryClient.invalidateQueries({ queryKey: ["admin", "support", "mailbox"] });
    });
  }

  function handleLabels() {
    if (!selected) return;
    const labels = labelInputRef.current?.value.split(",") ?? selectedTriage?.labels ?? [];
    const expectedRevision = selectedTriage?.revision ?? 0;
    startTransition(async () => {
      const result = await replaceSupportTriageLabels({ conversationId: selected.id, labels, expectedRevision });
      if (!result.ok) {
        void queryClient.invalidateQueries({ queryKey: ["admin", "support", "triage", selected.id] });
        setNotice("Labels changed elsewhere. Refresh the conversation and try again.");
        return;
      }
      setTriageByConversation((values) => ({ ...values, [selected.id]: result.data.triage }));
      if (labelInputRef.current) labelInputRef.current.value = result.data.triage.labels.join(", ");
      queryClient.setQueryData(["admin", "support", "triage", selected.id], result.data.triage);
      void queryClient.invalidateQueries({ queryKey: ["admin", "support", "mailbox"] });
    });
  }

  function handleNewEmail(payload: { draftScopeKey: string; html: string; text: string; drafts: SupportComposerDraft[] }) {
    if (!newTo.trim() || !newSubject.trim()) {
      setNotice("Recipient and subject are required.");
      return;
    }
    const clientMessageId = newEmailAttemptId;
    setNotice(null);
    startTransition(async () => {
      const result = await createSupportEmailConversationAndSend({
        to: newTo,
        cc: newCc,
        subject: newSubject,
        body: payload.text,
        html: payload.html,
        clientMessageId,
        fromIdentityId,
        draftScopeKey: payload.draftScopeKey,
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
      void queryClient.invalidateQueries({ queryKey: ["admin", "support", "mailbox"] });
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
      setNewCc("");
      setNewSubject("");
      setNewComposerEpoch((value) => value + 1);
      setNewEmailAttemptId(createClientMessageId("admin-new"));
      setNewEmailDraftId(crypto.randomUUID());
      setNotice("New email accepted for sending by Cloudflare (not final delivery proof).");
    });
  }

  function handleForward() {
    if (!selected || !forwardTo.trim()) {
      setNotice("Forward recipient is required.");
      return;
    }
    setNotice(null);
    startTransition(async () => {
      const result = await forwardSupportConversation({
        conversationId: selected.id,
        to: forwardTo,
        cc: forwardCc,
        clientMessageId: createClientMessageId("admin-forward"),
        fromIdentityId,
        attachmentIds: forwardAttachmentIds,
      });
      if (!result.ok) {
        setNotice("Forward could not be sent.");
        return;
      }
      setForwardTo("");
      setForwardCc("");
      setForwardAttachmentIds([]);
      setShowForward(false);
      void queryClient.invalidateQueries({ queryKey: ["admin", "support", "mailbox"] });
      setNotice("Forward accepted for sending by Cloudflare (not final delivery proof).");
    });
  }

  function resumeDraft(draft: SupportDraftRow) {
    setShowDrafts(false);
    if (draft.kind === "reply" && draft.conversation_id) {
      setSelectedId(draft.conversation_id);
      setReplyDraftId(draft.scope_key);
      setComposerEpoch((value) => value + 1);
      setShowNewEmail(false);
      setMobileThreadOpen(true);
      return;
    }
    if (draft.kind === "new_email") {
      setNewEmailDraftId(draft.scope_key);
      setNewSubject(draft.subject ?? "");
      setNewTo(parseDraftRecipientList(draft.to_json));
      setNewCc(parseDraftRecipientList(draft.cc_json));
      setNewComposerEpoch((value) => value + 1);
      setShowNewEmail(true);
      setMobileThreadOpen(true);
    }
  }

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden rounded-xs border border-hairline bg-white shadow-[0_1px_0_rgba(0,0,0,0.03)] md:grid-cols-[280px_minmax(0,1fr)]">
      <SupportMailboxRail
        folder={folder}
        mailboxCounts={mailboxCounts}
        conversations={conversations}
        selectedId={selected?.id ?? null}
        channelFilter={channelFilter}
        statusFilter={statusFilter}
        unreadOnly={unreadOnly}
        search={search}
        labelFilter={labelFilter}
        assignedToMe={assignedToMe}
        mailboxError={mailboxQuery.isError}
        showDrafts={showDrafts}
        drafts={draftsQuery.data}
        draftsLoading={draftsQuery.isLoading}
        draftsError={draftsQuery.isError}
        outboundConfigured={readiness.outboundConfigured}
        supportFrom={readiness.supportFrom}
        mobileThreadOpen={mobileThreadOpen}
        onCompose={() => { setShowNewEmail((value) => !value); setMobileThreadOpen(true); }}
        onToggleDrafts={() => setShowDrafts((visible) => !visible)}
        onFolderChange={setFolder}
        onChannelChange={setChannelFilter}
        onStatusChange={setStatusFilter}
        onUnreadOnlyChange={() => setUnreadOnly((value) => !value)}
        onSearchChange={setSearch}
        onLabelChange={setLabelFilter}
        onAssignedToMeChange={() => setAssignedToMe((value) => !value)}
        onSelect={(thread) => {
          setSelectedId(thread.id);
          setShowNewEmail(false);
          setMobileThreadOpen(true);
          setReplyDraftId(crypto.randomUUID());
        }}
        onResumeDraft={resumeDraft}
      />

      <section className={cn("min-h-0 flex-col md:flex", mobileThreadOpen ? "flex" : "hidden")} aria-label="Support thread">
        {showNewEmail ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="border-b border-hairline px-3 py-2">
              <Button type="button" variant="ghost" size="xs" className="mb-1 md:hidden" onClick={() => { setShowNewEmail(false); setMobileThreadOpen(false); }}>
                Back to inbox
              </Button>
              <p className="text-[11px] font-medium leading-4 text-ink">New email</p>
              <label className="mt-1 flex items-center gap-1 text-[9px] leading-3 text-tertiary">
                From
                <select
                  value={fromIdentityId}
                  onChange={(event) => setFromIdentityId(event.currentTarget.value as "support" | "philip")}
                  className="rounded-xs border border-hairline bg-white px-1 py-0.5 text-[9px] text-ink"
                >
                  {readiness.sendIdentities.map((identity) => (
                    <option key={identity.id} value={identity.id}>{identity.fromName} &lt;{identity.fromAddress}&gt;</option>
                  ))}
                </select>
              </label>
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
                <label className="grid grid-cols-[48px_1fr] items-center gap-2 text-[9px] uppercase text-tertiary" htmlFor="new-email-cc">
                  Cc
                  <input
                    id="new-email-cc"
                    value={newCc}
                    onChange={(e) => setNewCc(e.currentTarget.value)}
                    className="rounded-xs border border-hairline px-1.5 py-1 text-[10px] normal-case text-ink"
                    placeholder="optional@example.com, teammate@example.com"
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
                draftId={newEmailDraftId}
                draftKind="new_email"
                savedReplies={savedReplies}
                disabled={!readiness.outboundConfigured}
                isPending={isPending}
                submitLabel="Send email"
                onSubmit={handleNewEmail}
                draftFields={newEmailDraftFields}
                onDiscard={() => {
                  setNewEmailDraftId(crypto.randomUUID());
                  setNewComposerEpoch((value) => value + 1);
                }}
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
              <div className="flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <Button type="button" variant="ghost" size="xs" className="shrink-0 md:hidden" onClick={() => setMobileThreadOpen(false)}>
                    Back
                  </Button>
                  <div className="min-w-0 flex-1">
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
                </div>
                {selected ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <select
                      value={selected.status}
                      onChange={(event) => handleStatus(event.currentTarget.value as SupportConversationStatus)}
                      disabled={isPending}
                      className="min-h-8 rounded-xs border border-hairline bg-white px-1.5 py-1 text-[10px] leading-4 text-ink sm:min-h-0"
                      aria-label="Conversation status"
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      disabled={isPending}
                      className="min-h-8 sm:min-h-0"
                      onClick={() => handleTriage({ starredForAdmin: !(selectedTriage?.starred_for_admin ?? false) })}
                    >
                      {selectedTriage?.starred_for_admin ? "Unstar" : "Star"}
                    </Button>
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      disabled={isPending}
                      className="min-h-8 sm:min-h-0"
                      onClick={() => handleTriage({ assignToSelf: !selectedTriage?.assignee_user_id })}
                    >
                      {selectedTriage?.assignee_user_id ? "Unassign" : "Assign me"}
                    </Button>
                    <select
                      value=""
                      disabled={isPending}
                      onChange={(event) => {
                        const days = Number(event.currentTarget.value);
                        if (!Number.isFinite(days)) return;
                        handleTriage({
                          snoozedUntil: days > 0
                            ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
                            : null,
                        });
                      }}
                      className="min-h-8 rounded-xs border border-hairline bg-white px-1.5 py-1 text-[10px] leading-4 text-ink sm:min-h-0"
                      aria-label="Snooze conversation"
                    >
                      <option value="" disabled>{selectedTriage?.snoozed_until ? "Change snooze" : "Snooze"}</option>
                      <option value="1">Snooze 1 day</option>
                      <option value="3">Snooze 3 days</option>
                      <option value="7">Snooze 1 week</option>
                      {selectedTriage?.snoozed_until ? <option value="0">Unsnooze</option> : null}
                    </select>
                    <input
                      key={selected.id}
                      ref={labelInputRef}
                      defaultValue={selectedTriage?.labels.join(", ") ?? ""}
                      className="min-h-8 min-w-[7rem] flex-1 rounded-xs border border-hairline px-1.5 py-1 text-[9px] sm:min-h-0 sm:w-24 sm:flex-none sm:px-1 sm:py-0.5"
                      placeholder="labels"
                      aria-label="Conversation labels"
                    />
                    <Button type="button" size="xs" variant="outline" disabled={isPending} className="min-h-8 sm:min-h-0" onClick={handleLabels}>
                      Save labels
                    </Button>
                    {selectedTriage?.labels.length ? (
                      <span className="basis-full text-[9px] leading-3 text-tertiary sm:basis-auto">
                        {selectedTriage.labels.join(", ")}
                      </span>
                    ) : null}
                    {selected.channel === "email" ? (
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        disabled={isPending}
                        className="min-h-8 sm:min-h-0"
                        onClick={() => setShowForward((visible) => !visible)}
                      >
                        Forward
                      </Button>
                    ) : null}
                  </div>
                ) : null}
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
                  In-app thread from a signed-in user. Realtime: {realtimeState}. Replies stay in the product inbox (not emailed).
                </p>
              )}
              {selected?.channel === "email" && showForward && (
                <form
                  className="mt-2 flex flex-wrap items-center gap-1"
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleForward();
                  }}
                >
                  <input value={forwardTo} onChange={(event) => setForwardTo(event.currentTarget.value)} className="min-w-32 flex-1 rounded-xs border border-hairline px-1 py-0.5 text-[9px]" placeholder="Forward to" aria-label="Forward recipient" required />
                  <input value={forwardCc} onChange={(event) => setForwardCc(event.currentTarget.value)} className="min-w-24 flex-1 rounded-xs border border-hairline px-1 py-0.5 text-[9px]" placeholder="CC (optional)" aria-label="Forward carbon-copy recipients" />
                  <Button type="submit" size="xs" variant="outline" disabled={isPending}>Send forward</Button>
                  {forwardableAttachments.length > 0 && (
                    <fieldset className="basis-full pt-1">
                      <legend className="text-[9px] leading-3 text-tertiary">Forward attachments</legend>
                      <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1">
                        {forwardableAttachments.map((attachment) => (
                          <label key={attachment.id} className="flex items-center gap-1 text-[9px] leading-3 text-secondary">
                            <input
                              type="checkbox"
                              checked={forwardAttachmentIds.includes(attachment.id)}
                              onChange={(event) => setForwardAttachmentIds((current) => event.currentTarget.checked
                                ? [...current, attachment.id]
                                : current.filter((id) => id !== attachment.id))}
                            />
                            {attachment.filename}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  )}
                </form>
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
              {selected && threadQuery.isError && (
                <p role="status" className="rounded-xs border border-dashed border-hairline p-3 text-[10px] leading-4 text-tertiary">
                  Messages could not be refreshed. Reconnecting will retry the D1 history.
                </p>
              )}
              {!selected && (
                <div className="flex h-full min-h-40 items-center justify-center rounded-xs border border-dashed border-hairline p-4 text-center text-[10px] leading-4 text-tertiary">
                  Select a conversation or compose a new email.
                </div>
              )}
              <div ref={threadEndRef} />
            </div>

            <div className={cn("border-t border-hairline p-2", styles.composer)}>
              {selected?.channel === "email" && (
                <label className="mb-1 flex items-center gap-1 text-[9px] leading-3 text-tertiary">
                  From
                  <select
                    value={fromIdentityId}
                    onChange={(event) => setFromIdentityId(event.currentTarget.value as "support" | "philip")}
                    className="rounded-xs border border-hairline bg-white px-1 py-0.5 text-[9px] text-ink"
                  >
                    {readiness.sendIdentities.map((identity) => (
                      <option key={identity.id} value={identity.id}>{identity.fromName} &lt;{identity.fromAddress}&gt;</option>
                    ))}
                  </select>
                </label>
              )}
              {selected?.channel === "email" && (
                <label className="mb-1 flex items-center gap-1 text-[9px] leading-3 text-tertiary">
                  <input type="checkbox" checked={replyAll} onChange={(event) => setReplyAll(event.currentTarget.checked)} />
                  Reply all
                </label>
              )}
              <SupportRichComposer
                key={`${selected?.id ?? "none"}-${composerEpoch}`}
                id="support-reply"
                fromLabel={
                  selected?.channel === "in_app"
                    ? "In-app support"
                    : readiness.supportFrom
                }
                draftId={replyDraftId}
                draftKind="reply"
                conversationId={selected?.id}
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
                draftFields={replyDraftFields}
                onDiscard={() => {
                  setReplyDraftId(crypto.randomUUID());
                  setComposerEpoch((value) => value + 1);
                }}
              />
            </div>
          </>
        )}
      </section>
    </div>
  );
}
