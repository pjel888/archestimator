"use client";

import dynamic from "next/dynamic";
import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createSupportEmailConversationAndSend,
  forwardSupportConversation,
  markSupportConversationRead,
  replaceSupportTriageLabels,
  sendSupportReply,
  setConversationStatus,
  updateSupportTriage,
} from "@/lib/admin/support-actions";
import {
  findSelectedSupportConversation,
  mergeSupportConversationPages,
} from "@/lib/admin/support-mailbox-client";
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
  SupportMessageContextRow,
  SupportMessageRow,
  SupportMailboxFolder,
} from "@/lib/repositories/support-conversations-d1";
import type { SupportDraftRow } from "@/lib/repositories/support-drafts-d1";
import {
  SUPPORT_REALTIME_FIXED_PROTOCOL,
  supportRealtimeProtocols,
} from "@/lib/support/realtime-protocol";
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

type AdminReplyStatus = "pending" | "resolved" | "archived";

type SupportThreadPayload = {
  attachments: SupportAttachmentRow[];
  contexts: SupportMessageContextRow[];
  messages: SupportMessageRow[];
};

type AdminSupportInboxProps = {
  conversations: SupportConversationRow[];
  initialMessages: SupportMessageRow[];
  initialAttachments?: SupportAttachmentRow[];
  initialContexts?: SupportMessageContextRow[];
  savedReplies: SavedReplyOption[];
  readiness: {
    outboundConfigured: boolean;
    inboundEnabled: boolean;
    supportFrom: string;
    sendIdentities: Array<{ id: "support" | "philip"; fromAddress: string; fromName: string; isDefault: boolean }>;
  };
};

const directStatuses: Array<Extract<SupportConversationStatus, "open" | "pending">> = ["open", "pending"];
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
  initialContexts = [],
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
  const [pinnedConversation, setPinnedConversation] = useState<SupportConversationRow | null>(
    initialConversations.find((conversation) => conversation.id === initialSelectedId) ?? null,
  );
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
  const [contextsByConversation] = useState<Record<string, SupportMessageContextRow[]>>(
    initialSelectedId ? { [initialSelectedId]: initialContexts } : {},
  );
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
  const [replyStatus, setReplyStatus] = useState<AdminReplyStatus>("pending");
  const replyDraftFields = useMemo(() => ({ from_identity_id: fromIdentityId }), [fromIdentityId]);
  const newEmailDraftFields = useMemo(() => ({
    to_json: newTo.trim() ? JSON.stringify([{ email: newTo.trim() }]) : null,
    cc_json: newCc.trim() ? JSON.stringify(newCc.split(",").map((email) => ({ email: email.trim() })).filter((recipient) => recipient.email)) : null,
    subject: newSubject.trim() || null,
    from_identity_id: fromIdentityId,
  }), [fromIdentityId, newCc, newSubject, newTo]);

  const mailboxQuery = useInfiniteQuery({
    queryKey: ["admin", "support", "mailbox", folder, statusFilter, channelFilter, unreadOnly, search.trim(), labelFilter.trim(), assignedToMe],
    initialPageParam: "",
    queryFn: async ({ pageParam, signal }) => {
      const params = new URLSearchParams({ folder, channel: channelFilter, limit: "50" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (unreadOnly) params.set("unread", "1");
      if (search.trim()) params.set("q", search.trim());
      if (labelFilter.trim()) params.set("label", labelFilter.trim());
      if (assignedToMe) params.set("assignee", "me");
      if (pageParam) params.set("cursor", pageParam);
      const response = await fetch(`/api/admin/support/conversations?${params}`, {
        cache: "no-store",
        signal,
      });
      const payload = (await response.json()) as {
        conversations?: SupportConversationRow[];
        counts?: Record<SupportMailboxFolder, number>;
        nextCursor?: string | null;
        error?: string | null;
      };
      if (!response.ok || payload.error) throw new Error(payload.error || "Support conversations could not be loaded.");
      return {
        conversations: payload.conversations ?? [],
        counts: payload.counts ?? emptyMailboxCounts,
        nextCursor: payload.nextCursor ?? null,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    refetchInterval: 15_000,
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
  const mailboxConversations = useMemo(
    () => mailboxQuery.data ? mergeSupportConversationPages(mailboxQuery.data.pages) : initialConversations,
    [initialConversations, mailboxQuery.data],
  );
  const conversations = useMemo(() => (
    pinnedConversation
      && !mailboxConversations.some((conversation) => conversation.id === pinnedConversation.id)
      ? [pinnedConversation, ...mailboxConversations]
      : mailboxConversations
  ), [mailboxConversations, pinnedConversation]);
  const mailboxCounts = mailboxQuery.data?.pages[0]?.counts ?? emptyMailboxCounts;
  const selected = findSelectedSupportConversation(conversations, selectedId);
  const selectedThreadId = selected?.id ?? "";
  const threadQuery = useQuery({
    queryKey: ["admin", "support", "messages", selectedThreadId],
    enabled: Boolean(selectedThreadId),
    staleTime: 30_000,
    refetchInterval: realtimeState === "connected" ? false : 15_000,
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/admin/support/conversations/${selectedThreadId}/messages`, {
        cache: "no-store",
        signal,
      });
      const payload = (await response.json()) as {
        messages?: SupportMessageRow[];
        attachments?: SupportAttachmentRow[];
        contexts?: SupportMessageContextRow[];
        error?: string | null;
      };
      if (!response.ok || payload.error) {
        throw new Error(payload.error || "Messages could not be loaded.");
      }
      return {
        messages: payload.messages ?? [],
        attachments: payload.attachments ?? [],
        contexts: payload.contexts ?? [],
      };
    },
  });
  const messages = selected
    ? threadQuery.data?.messages ?? messagesByConversation[selected.id] ?? []
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
      ? threadQuery.data?.attachments ?? attachmentsByConversation[selected.id] ?? []
      : [];
    const map = new Map<string, SupportAttachmentRow[]>();
    for (const attachment of attachments) {
      const list = map.get(attachment.message_id);
      if (list) list.push(attachment);
      else map.set(attachment.message_id, [attachment]);
    }
    return map;
  }, [attachmentsByConversation, selected, threadQuery.data?.attachments]);
  const contextsByMessage = useMemo(() => {
    const contexts = selected
      ? threadQuery.data?.contexts ?? contextsByConversation[selected.id] ?? []
      : [];
    return new Map(contexts.map((context) => [context.message_id, context]));
  }, [contextsByConversation, selected, threadQuery.data?.contexts]);
  const renderedInboundMessageId = [...messages]
    .reverse()
    .find((message) => message.sender_role === "user" || message.direction === "inbound")?.id ?? null;
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
    if (!selectedThreadId || !renderedInboundMessageId || threadQuery.isError) return;
    startTransition(async () => {
      const result = await markSupportConversationRead({
        conversationId: selectedThreadId,
        throughMessageId: renderedInboundMessageId,
      });
      if (result.ok) {
        setPinnedConversation((current) => current?.id === selectedThreadId
          ? { ...current, unread_for_admin: result.data.unread ? 1 : 0 }
          : current);
        void queryClient.invalidateQueries({ queryKey: ["admin", "support", "mailbox"] });
      }
    });
  }, [queryClient, renderedInboundMessageId, selectedThreadId, threadQuery.isError]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, selected?.id]);

  useEffect(() => {
    if (!selectedThreadId) return;
    const conversationId = selectedThreadId;
    let socket: WebSocket | null = null;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;
    const abortController = new AbortController();
    const backfill = () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "support", "messages", conversationId] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "support", "mailbox"] });
    };
    const reconnect = () => {
      if (cancelled || retryTimer) return;
      setRealtimeState(attempts > 0 ? "reconnecting" : "degraded");
      const delay = Math.min(30_000, 500 * 2 ** Math.min(attempts, 6)) + Math.floor(Math.random() * 250);
      attempts += 1;
      retryTimer = setTimeout(() => {
        retryTimer = null;
        void connect();
      }, delay);
    };
    const connect = async () => {
      if (cancelled) return;
      setRealtimeState(attempts > 0 ? "reconnecting" : "connecting");
      try {
        const response = await fetch(`/api/support/conversations/${conversationId}/realtime-token`, {
          cache: "no-store",
          signal: abortController.signal,
        });
        const payload = await response.json() as { roomToken?: string };
        if (!response.ok || !payload.roomToken || cancelled) {
          if (response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429) {
            setRealtimeState("degraded");
            return;
          }
          reconnect();
          return;
        }
        const url = new URL(`/__cloudflare/support-inbox/${conversationId}`, window.location.origin);
        url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
        socket = new WebSocket(url, [...supportRealtimeProtocols(payload.roomToken)]);
        socket.onopen = () => {
          if (socket?.protocol !== SUPPORT_REALTIME_FIXED_PROTOCOL) {
            socket?.close(1008, "Support protocol negotiation failed.");
            return;
          }
          attempts = 0;
          setRealtimeState("connected");
          backfill();
        };
        socket.onmessage = (event) => {
          try {
            const invalidation = JSON.parse(String(event.data)) as { type?: unknown; conversationId?: unknown; messageId?: unknown };
            if (invalidation.conversationId !== conversationId) return;
            if (
              invalidation.type !== "support_conversation_changed"
              && (invalidation.type !== "support_message_created" || typeof invalidation.messageId !== "string")
            ) return;
            backfill();
          } catch {
            // D1 history remains authoritative when an invalidation is malformed.
          }
        };
        socket.onerror = () => setRealtimeState("degraded");
        socket.onclose = () => {
          socket = null;
          reconnect();
        };
      } catch {
        if (!cancelled) reconnect();
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
      abortController.abort();
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibility);
      socket?.close();
    };
  }, [queryClient, selectedThreadId]);

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
        expectedConversationStatus: selected.status,
        expectedConversationUpdatedAt: selected.updated_at,
        renderedInboundMessageId,
        fromIdentityId,
        replyAll,
        statusAfterReply: replyStatus,
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
          queryClient.setQueryData<SupportThreadPayload>(
            ["admin", "support", "messages", selected.id],
            (current) => {
              const existingMessages = current?.messages ?? messages;
              return {
                attachments: current?.attachments ?? [...attachmentsByMessage.values()].flat(),
                contexts: current?.contexts ?? [...contextsByMessage.values()],
                messages: existingMessages.some((message) => message.id === returnedMessage.id)
                  ? existingMessages.map((message) => message.id === returnedMessage.id ? returnedMessage : message)
                  : [...existingMessages, returnedMessage],
              };
            },
          );
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
      setReplyStatus("pending");
      setReplyDraftId(crypto.randomUUID());
      setComposerEpoch((value) => value + 1);
      queryClient.setQueryData<SupportThreadPayload>(
        ["admin", "support", "messages", selected.id],
        (current) => {
          const currentMessages = current?.messages ?? messages;
          const currentAttachments = current?.attachments ?? [...attachmentsByMessage.values()].flat();
          return {
            attachments: [
              ...currentAttachments,
              ...result.data.attachments.filter((attachment) => !currentAttachments.some((item) => item.id === attachment.id)),
            ],
            contexts: current?.contexts ?? [...contextsByMessage.values()],
            messages: currentMessages.some((message) => message.id === result.data.message.id)
              ? currentMessages.map((message) => message.id === result.data.message.id ? result.data.message : message)
              : [...currentMessages, result.data.message],
          };
        },
      );
      setMessagesByConversation((current) => ({
        ...current,
        [selected.id]: (current[selected.id] ?? []).some((message) => message.id === result.data.message.id)
          ? (current[selected.id] ?? []).map((message) => message.id === result.data.message.id ? result.data.message : message)
          : [...(current[selected.id] ?? []), result.data.message],
      }));
      setAttachmentsByConversation((current) => ({
        ...current,
        [selected.id]: [
          ...(current[selected.id] ?? []),
          ...result.data.attachments.filter((attachment) => !(current[selected.id] ?? []).some((item) => item.id === attachment.id)),
        ],
      }));
      setPinnedConversation(result.data.conversation);
      void queryClient.invalidateQueries({ queryKey: ["admin", "support", "messages", selected.id] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "support", "mailbox"] });
      setNotice(
        result.data.message.transport === "email"
          ? "Reply accepted for sending by Cloudflare (not final delivery proof)."
          : result.data.conversation.status === "pending"
            ? "In-app reply posted. The conversation is waiting on the user."
            : result.data.conversation.status === "open"
              ? "In-app reply posted. A newer inbound message kept the conversation open."
              : `In-app reply posted and the conversation was ${result.data.conversation.status}.`,
      );
    });
  }

  function handleStatus(status: SupportConversationStatus) {
    if (!selected) return;
    setNotice(null);
    startTransition(async () => {
      const result = await setConversationStatus({
        conversationId: selected.id,
        expectedStatus: selected.status,
        status,
      });
      if (result.ok) {
        setPinnedConversation(result.data.conversation);
        void queryClient.invalidateQueries({ queryKey: ["admin", "support", "mailbox"] });
      }
      setNotice(
        result.ok
          ? `Status set to ${status}.`
          : result.error === "terminal_reply_required"
            ? "Resolved and archived require an explanatory reply. Choose the close outcome beside the reply editor."
            : "Status could not be updated. Refresh and try again.",
      );
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
      setPinnedConversation(result.data.conversation);
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
    <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden rounded-xs border border-hairline bg-white md:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
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
        hasMore={Boolean(mailboxQuery.hasNextPage)}
        isLoadingMore={mailboxQuery.isFetchingNextPage}
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
          setPinnedConversation(thread);
          setShowNewEmail(false);
          setMobileThreadOpen(true);
          setReplyDraftId(crypto.randomUUID());
        }}
        onResumeDraft={resumeDraft}
        onRetryMailbox={() => void mailboxQuery.refetch()}
        onLoadMore={() => void mailboxQuery.fetchNextPage()}
      />

      <section className={cn("min-h-0 flex-col bg-white md:flex", mobileThreadOpen ? "flex" : "hidden")} aria-label="Support thread">
        {showNewEmail ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="border-b border-hairline px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="xs" className="min-h-8 min-w-0 px-2 md:hidden" onClick={() => { setShowNewEmail(false); setMobileThreadOpen(false); }}>
                  Back
                </Button>
                <div>
                  <p className="text-[11px] font-medium leading-4 text-ink">New conversation</p>
                  <p className="text-[9px] leading-3 text-tertiary">Start an outbound support email.</p>
                </div>
              </div>
              <label className="mt-2 grid gap-1 text-[8px] font-medium uppercase leading-3 text-tertiary sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:items-center">
                From identity
                <select
                  value={fromIdentityId}
                  onChange={(event) => setFromIdentityId(event.currentTarget.value as "support" | "philip")}
                  className="h-8 min-w-0 rounded-xs border border-hairline bg-white px-2 text-[10px] font-normal normal-case text-ink outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  {readiness.sendIdentities.map((identity) => (
                    <option key={identity.id} value={identity.id}>{identity.fromName} &lt;{identity.fromAddress}&gt;</option>
                  ))}
                </select>
              </label>
              <div className="mt-2 grid gap-1.5">
                <label className="grid gap-1 text-[8px] font-medium uppercase text-tertiary sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:items-center" htmlFor="new-email-to">
                  To
                  <input
                    id="new-email-to"
                    value={newTo}
                    onChange={(e) => setNewTo(e.currentTarget.value)}
                    className="h-8 min-w-0 rounded-xs border border-hairline px-2 text-[10px] font-normal normal-case text-ink outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    placeholder="customer@example.com"
                    autoFocus
                  />
                </label>
                <label className="grid gap-1 text-[8px] font-medium uppercase text-tertiary sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:items-center" htmlFor="new-email-subject">
                  Subject
                  <input
                    id="new-email-subject"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.currentTarget.value)}
                    className="h-8 min-w-0 rounded-xs border border-hairline px-2 text-[10px] font-normal normal-case text-ink outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    placeholder="How can we help?"
                  />
                </label>
                <label className="grid gap-1 text-[8px] font-medium uppercase text-tertiary sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:items-center" htmlFor="new-email-cc">
                  Cc
                  <input
                    id="new-email-cc"
                    value={newCc}
                    onChange={(e) => setNewCc(e.currentTarget.value)}
                    className="h-8 min-w-0 rounded-xs border border-hairline px-2 text-[10px] font-normal normal-case text-ink outline-none focus-visible:ring-2 focus-visible:ring-focus"
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
            <div className="border-b border-hairline px-3 py-2.5">
              <div className="flex flex-col gap-2.5">
                <div className="flex items-start gap-2">
                  <Button type="button" variant="ghost" size="xs" className="min-h-8 min-w-0 shrink-0 px-2 md:hidden" onClick={() => setMobileThreadOpen(false)}>
                    Back
                  </Button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h2 className="truncate text-[11px] font-medium leading-4 text-ink">
                        {selected?.subject ?? "Select a conversation"}
                      </h2>
                      {selected && (
                        <span className="rounded-xs border border-hairline bg-surfaceMuted px-1 py-0.5 text-[8px] font-medium uppercase leading-3 text-secondary">
                          {selected.channel === "email" ? "Email" : "In-app"}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-[9px] leading-3 text-tertiary">
                      {selected
                        ? `${selected.requester_name ? `${selected.requester_name} · ` : ""}${selected.requester_email ?? selected.user_id ?? "unknown"}${selected.mailbox_address ? ` · ${selected.mailbox_address}` : ""}`
                        : "Choose a thread from the inbox"}
                    </p>
                  </div>
                </div>
                {selected ? (
                  <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:items-end">
                    <label className="grid gap-1 text-[8px] font-medium uppercase leading-3 text-tertiary">
                      Status
                      <select
                        value={selected.status}
                        onChange={(event) => handleStatus(event.currentTarget.value as SupportConversationStatus)}
                        disabled={isPending}
                        className="h-8 min-w-0 rounded-xs border border-hairline bg-white px-2 text-[10px] font-normal normal-case text-ink outline-none focus-visible:ring-2 focus-visible:ring-focus"
                        aria-label="Conversation status"
                      >
                        {selected.status === "resolved" || selected.status === "archived" ? (
                          <option value={selected.status} disabled>{selected.status} (reply required to change closure)</option>
                        ) : null}
                        {directStatuses.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </label>
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      disabled={isPending}
                      className="min-h-8 min-w-0 px-2"
                      onClick={() => handleTriage({ starredForAdmin: !(selectedTriage?.starred_for_admin ?? false) })}
                    >
                      {selectedTriage?.starred_for_admin ? "Unstar" : "Star"}
                    </Button>
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      disabled={isPending}
                      className="min-h-8 min-w-0 px-2"
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
                      className="h-8 min-w-0 rounded-xs border border-hairline bg-white px-2 text-[10px] leading-4 text-ink outline-none focus-visible:ring-2 focus-visible:ring-focus"
                      aria-label="Snooze conversation"
                    >
                      <option value="" disabled>{selectedTriage?.snoozed_until ? "Change snooze" : "Snooze"}</option>
                      <option value="1">Snooze 1 day</option>
                      <option value="3">Snooze 3 days</option>
                      <option value="7">Snooze 1 week</option>
                      {selectedTriage?.snoozed_until ? <option value="0">Unsnooze</option> : null}
                    </select>
                    {selected.channel === "email" ? (
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        disabled={isPending}
                        className="min-h-8 min-w-0 px-2"
                        onClick={() => setShowForward((visible) => !visible)}
                      >
                        Forward
                      </Button>
                    ) : null}
                  </div>
                ) : null}
                {selected ? (
                  <details className="group rounded-xs border border-hairline bg-surfaceMuted/45 px-2 py-1.5">
                    <summary className="flex min-h-6 cursor-pointer list-none items-center justify-between text-[9px] font-medium leading-3 text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
                      Conversation details
                      <span className="font-normal text-tertiary">
                        {selectedTriage?.labels.length ? selectedTriage.labels.join(", ") : "No labels"}
                      </span>
                    </summary>
                    <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                      <label className="grid gap-1 text-[8px] font-medium uppercase leading-3 text-tertiary">
                        Labels
                        <input
                          key={selected.id}
                          ref={labelInputRef}
                          defaultValue={selectedTriage?.labels.join(", ") ?? ""}
                          className="h-8 min-w-0 rounded-xs border border-hairline bg-white px-2 text-[10px] font-normal normal-case text-ink outline-none focus-visible:ring-2 focus-visible:ring-focus"
                          placeholder="billing, onboarding, bug"
                          aria-label="Conversation labels"
                        />
                      </label>
                      <Button type="button" size="xs" variant="secondary" disabled={isPending} className="min-h-8" onClick={handleLabels}>
                        Save labels
                      </Button>
                    </div>
                  </details>
                ) : null}
              </div>
              {notice && (
                <p id={noticeId} role="status" aria-live="polite" className="mt-2 rounded-xs border border-hairline bg-surfaceMuted/60 px-2 py-1.5 text-[9px] leading-3 text-secondary">
                  {notice}
                </p>
              )}
              {selected?.channel === "email" && !readiness.outboundConfigured && (
                <p className="mt-2 rounded-xs border border-warning/20 bg-warning/10 px-2 py-1.5 text-[9px] leading-3 text-warning">Email delivery is not configured for this environment.</p>
              )}
              {selected?.channel === "email" && !readiness.inboundEnabled && (
                <p className="mt-2 rounded-xs border border-hairline bg-surfaceMuted/60 px-2 py-1.5 text-[9px] leading-3 text-secondary">Inbound routing is code-ready but feature-gated off until enabled.</p>
              )}
              {selected?.channel === "in_app" && (
                <div className="mt-2 flex items-center justify-between gap-2 rounded-xs border border-hairline bg-surfaceMuted/60 px-2 py-1.5 text-[9px] leading-3 text-secondary">
                  <p>
                    {realtimeState === "connected"
                      ? "Live updates are connected. Replies stay in the product inbox (not emailed)."
                      : "Live updates are delayed. Messages are still saved in D1; refresh for the latest history."}
                  </p>
                  {realtimeState !== "connected" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      className="min-h-6 shrink-0 px-1.5"
                      onClick={() => {
                        void threadQuery.refetch();
                        void mailboxQuery.refetch();
                      }}
                    >
                      Refresh
                    </Button>
                  ) : null}
                </div>
              )}
              {selected?.channel === "email" && showForward && (
                <form
                  className="mt-2 grid gap-1.5 rounded-xs border border-hairline bg-surfaceMuted/45 p-2 sm:grid-cols-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleForward();
                  }}
                >
                  <input value={forwardTo} onChange={(event) => setForwardTo(event.currentTarget.value)} className="h-8 min-w-0 rounded-xs border border-hairline bg-white px-2 text-[10px] outline-none focus-visible:ring-2 focus-visible:ring-focus" placeholder="Forward to" aria-label="Forward recipient" required />
                  <input value={forwardCc} onChange={(event) => setForwardCc(event.currentTarget.value)} className="h-8 min-w-0 rounded-xs border border-hairline bg-white px-2 text-[10px] outline-none focus-visible:ring-2 focus-visible:ring-focus" placeholder="CC (optional)" aria-label="Forward carbon-copy recipients" />
                  <Button type="submit" size="xs" variant="secondary" className="justify-self-start" disabled={isPending}>Send forward</Button>
                  {forwardableAttachments.length > 0 && (
                    <fieldset className="sm:col-span-2">
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

            <div className="min-h-0 flex-1 overflow-auto bg-surfaceMuted/35 px-3 py-3 sm:px-4">
              <div className="mx-auto max-w-3xl">
                {messages.map((message) => (
                  <SupportMessageCard
                    key={message.id}
                    message={message}
                    attachments={attachmentsByMessage.get(message.id) ?? []}
                    context={contextsByMessage.get(message.id) ?? null}
                    onRetryAttachments={() => void threadQuery.refetch()}
                  />
                ))}
              {selected && messages.length === 0 && !threadQuery.isError && (
                <div className="rounded-xs border border-dashed border-hairline bg-white p-4 text-center text-[10px] leading-4 text-tertiary">
                  No messages loaded for this conversation.
                </div>
              )}
              {selected && threadQuery.isError && (
                <div role="status" className="flex items-center justify-between gap-2 rounded-xs border border-dashed border-hairline p-3 text-[10px] leading-4 text-tertiary">
                  <span>Messages could not be refreshed. The last rendered history remains available.</span>
                  <Button type="button" variant="ghost" size="xs" className="min-h-6 px-1.5" onClick={() => void threadQuery.refetch()}>
                    Retry
                  </Button>
                </div>
              )}
              {!selected && (
                <div className="flex min-h-72 flex-col items-center justify-center rounded-xs border border-dashed border-hairline bg-white p-6 text-center">
                  <p className="text-[11px] font-medium leading-4 text-ink">No conversation selected</p>
                  <p className="mt-1 max-w-xs text-[10px] leading-4 text-tertiary">Choose a conversation from the inbox, or start a new outbound email.</p>
                </div>
              )}
              <div ref={threadEndRef} />
              </div>
            </div>

            {selected ? (
            <div className={cn("border-t border-hairline bg-white p-2.5", styles.composer)}>
              {selected.channel === "email" && (
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1.5 text-[9px] leading-3 text-tertiary">
                    From
                  <select
                    value={fromIdentityId}
                    onChange={(event) => setFromIdentityId(event.currentTarget.value as "support" | "philip")}
                    className="h-7 rounded-xs border border-hairline bg-white px-2 text-[10px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    {readiness.sendIdentities.map((identity) => (
                      <option key={identity.id} value={identity.id}>{identity.fromName} &lt;{identity.fromAddress}&gt;</option>
                    ))}
                  </select>
                  </label>
                <label className="flex min-h-7 items-center gap-1.5 rounded-xs border border-hairline px-2 text-[9px] leading-3 text-secondary">
                  <input type="checkbox" checked={replyAll} onChange={(event) => setReplyAll(event.currentTarget.checked)} />
                  Reply all
                </label>
                </div>
              )}
              <label className="mb-2 flex items-center justify-end gap-1.5 text-[9px] leading-3 text-tertiary">
                After this reply
                <select
                  value={replyStatus}
                  onChange={(event) => setReplyStatus(event.currentTarget.value as AdminReplyStatus)}
                  disabled={isPending}
                  className="h-7 rounded-xs border border-hairline bg-white px-2 text-[10px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  aria-label="Conversation outcome after reply"
                >
                  <option value="pending">Wait on user</option>
                  <option value="resolved">Close as resolved</option>
                  <option value="archived">Close as archived</option>
                </select>
              </label>
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
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
