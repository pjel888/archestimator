"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChatCircleDots,
  Lifebuoy,
  Plus,
} from "@phosphor-icons/react/dist/ssr";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AppModal } from "@/components/ui/modal";
import { Sheet } from "@/components/ui/overlays/sheet-drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  SUPPORT_REALTIME_CREDENTIAL_PROTOCOL_PREFIX,
  SUPPORT_REALTIME_FIXED_PROTOCOL,
} from "@/lib/support/realtime-protocol";
import { cn } from "@/lib/ui/cn";

import { SupportMessageComposer } from "./SupportMessageComposer";
import type {
  SupportCenterHost,
  SupportCenterView,
  SupportConversationPage,
  SupportConversationStatus,
  SupportConversationSummary,
  SupportDraft,
  SupportIntakeResponse,
  SupportMessage,
  SupportMessagePage,
  SupportScreenshot,
} from "./support-center-types";
import { useSupportDrafts } from "./use-support-drafts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const NEW_DRAFT_KEY = "new";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

function isUuid(value: string | null | undefined): value is string {
  return Boolean(value && UUID_PATTERN.test(value));
}

function shortReference(value: string) {
  return `#${value.slice(0, 8).toUpperCase()}`;
}

function statusPresentation(status: SupportConversationStatus) {
  if (status === "pending") return { label: "Waiting on you", tone: "warning" as const };
  if (status === "resolved" || status === "archived") return { label: "Conversation closed", tone: "neutral" as const };
  return { label: "Waiting for support", tone: "accent" as const };
}

function browserFamily() {
  const agent = navigator.userAgent.toLowerCase();
  if (agent.includes("edg/")) return "edge";
  if (agent.includes("firefox/")) return "firefox";
  if (agent.includes("chrome/") || agent.includes("crios/")) return "chrome";
  if (agent.includes("chromium/")) return "chromium";
  if (agent.includes("safari/") && !agent.includes("chrome/")) return "safari";
  return "other";
}

function osFamily() {
  const agent = navigator.userAgent.toLowerCase();
  if (agent.includes("android")) return "android";
  if (/iphone|ipad|ipod/u.test(agent)) return "ios";
  if (agent.includes("cros")) return "chromeos";
  if (agent.includes("windows")) return "windows";
  if (/mac os|macintosh/u.test(agent)) return "macos";
  if (agent.includes("linux")) return "linux";
  return "other";
}

function routeResourceIds(pathname: string, workspaceId?: string | null) {
  const match = pathname.match(/^\/workshop\/projects\/([0-9a-f-]{36})(?:\/estimates\/([0-9a-f-]{36}))?(?:\/|$)/iu);
  return {
    estimateId: isUuid(match?.[2]) ? match[2] : null,
    projectId: isUuid(match?.[1]) ? match[1] : null,
    workspaceId: isUuid(workspaceId) ? workspaceId : null,
  };
}

function buildSupportFormData(draft: SupportDraft, pathname: string, workspaceId?: string | null) {
  const form = new FormData();
  form.append("message", draft.message.trim());
  form.append("clientMessageId", draft.clientMessageId);
  form.append("sourcePathname", pathname || "/workshop/feedback");
  form.append("diagnosticsShared", draft.diagnosticsShared ? "1" : "0");
  if (draft.diagnosticsShared) {
    const resources = routeResourceIds(pathname, workspaceId);
    if (resources.workspaceId) form.append("workspaceId", resources.workspaceId);
    if (resources.projectId) form.append("projectId", resources.projectId);
    if (resources.estimateId) form.append("estimateId", resources.estimateId);
    form.append("viewportWidth", String(Math.max(1, Math.round(window.innerWidth))));
    form.append("viewportHeight", String(Math.max(1, Math.round(window.innerHeight))));
    form.append("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone || "");
    form.append("browserFamily", browserFamily());
    form.append("osFamily", osFamily());
    const release = document.querySelector<HTMLMetaElement>('meta[name="application-version"]')?.content.trim();
    if (release) form.append("appRelease", release.slice(0, 120));
  }
  if (draft.screenshot) form.append("screenshot", draft.screenshot.file);
  return form;
}

async function filesHaveSameContents(left: File, right: File) {
  if (left === right) return true;
  if (left.size !== right.size || left.type !== right.type) return false;
  const [leftBuffer, rightBuffer] = await Promise.all([left.arrayBuffer(), right.arrayBuffer()]);
  const leftBytes = new Uint8Array(leftBuffer);
  const rightBytes = new Uint8Array(rightBuffer);
  for (let index = 0; index < leftBytes.length; index += 1) {
    if (leftBytes[index] !== rightBytes[index]) return false;
  }
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function responseError(payload: unknown, fallback: string) {
  return isRecord(payload) && typeof payload.error === "string" && payload.error.trim()
    ? payload.error
    : fallback;
}

function isSupportConversationStatus(value: unknown): value is SupportConversationStatus {
  return value === "open" || value === "pending" || value === "resolved" || value === "archived";
}

function isConversationSummary(value: unknown): value is SupportConversationSummary {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.lastMessageAt === "string"
    && typeof value.lastPreview === "string"
    && typeof value.stableReference === "string"
    && isSupportConversationStatus(value.status)
    && typeof value.unread === "boolean";
}

function isConversationPage(value: unknown): value is SupportConversationPage {
  return isRecord(value)
    && Array.isArray(value.conversations)
    && value.conversations.every(isConversationSummary)
    && (value.nextCursor === null || typeof value.nextCursor === "string")
    && typeof value.totalUnread === "number"
    && Number.isInteger(value.totalUnread)
    && value.totalUnread >= 0;
}

function isNullableString(value: unknown) {
  return value === null || typeof value === "string";
}

function isNullableNumber(value: unknown) {
  return value === null || typeof value === "number";
}

function isMessageContext(value: unknown): value is NonNullable<SupportMessage["context"]> {
  return isRecord(value)
    && isNullableString(value.appRelease)
    && isNullableString(value.browserFamily)
    && typeof value.diagnosticsShared === "boolean"
    && isNullableString(value.estimateId)
    && isNullableString(value.osFamily)
    && isNullableString(value.projectId)
    && typeof value.routeTemplate === "string"
    && isNullableString(value.timezone)
    && isNullableNumber(value.viewportHeight)
    && isNullableNumber(value.viewportWidth)
    && isNullableString(value.workspaceId);
}

function isSupportMessage(value: unknown): value is SupportMessage {
  return isRecord(value)
    && Array.isArray(value.attachments)
    && value.attachments.every((attachment) => (
      isRecord(attachment)
      && attachment.contentType === "image/webp"
      && typeof attachment.id === "string"
      && typeof attachment.sizeBytes === "number"
      && typeof attachment.url === "string"
    ))
    && typeof value.bodyText === "string"
    && (value.context === null || isMessageContext(value.context))
    && typeof value.createdAt === "string"
    && typeof value.id === "string"
    && (value.senderRole === "user" || value.senderRole === "admin" || value.senderRole === "system");
}

function isMessagePage(value: unknown): value is SupportMessagePage {
  return isRecord(value)
    && Array.isArray(value.messages)
    && value.messages.every(isSupportMessage)
    && (value.nextCursor === null || typeof value.nextCursor === "string");
}

function isSupportIntakeResponse(value: unknown): value is SupportIntakeResponse {
  return isRecord(value)
    && isRecord(value.conversation)
    && typeof value.conversation.id === "string"
    && isRecord(value.message)
    && typeof value.message.id === "string"
    && typeof value.realtimeDegraded === "boolean";
}

function isSuccessfulAbandonResponse(value: unknown) {
  return isRecord(value) && (value.state === "cleanup_fenced" || value.state === "abandoned");
}

function isRealtimeProtocols(value: unknown): value is [string, string] {
  return Array.isArray(value)
    && value.length === 2
    && value[0] === SUPPORT_REALTIME_FIXED_PROTOCOL
    && typeof value[1] === "string"
    && value[1].startsWith(SUPPORT_REALTIME_CREDENTIAL_PROTOCOL_PREFIX);
}

async function responseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function readConversationPage(cursor: unknown): Promise<SupportConversationPage> {
  const params = new URLSearchParams({ limit: "25" });
  if (typeof cursor === "string" && cursor) params.set("cursor", cursor);
  const response = await fetch(`/api/support/conversations?${params}`, { cache: "no-store" });
  const payload = await responseJson(response);
  if (!response.ok) throw new Error(responseError(payload, "Support requests could not be loaded."));
  if (!isConversationPage(payload)) throw new Error("Support returned an invalid requests response.");
  return payload;
}

async function readMessagePage(conversationId: string, cursor: unknown): Promise<SupportMessagePage> {
  const params = new URLSearchParams({ limit: "50" });
  if (typeof cursor === "string" && cursor) params.set("cursor", cursor);
  const response = await fetch(`/api/support/conversations/${encodeURIComponent(conversationId)}/messages?${params}`, { cache: "no-store" });
  const payload = await responseJson(response);
  if (!response.ok) throw new Error(responseError(payload, "Support messages could not be loaded."));
  if (!isMessagePage(payload)) throw new Error("Support returned an invalid messages response.");
  return payload;
}

function useOnlineStatus() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine !== false);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  return online;
}

type RealtimeState = "offline" | "connecting" | "connected" | "reconnecting" | "degraded";

function useSupportRealtime({
  conversationId,
  enabled,
  onInvalidate,
}: {
  conversationId: string | null;
  enabled: boolean;
  onInvalidate: (conversationId: string) => void;
}) {
  const [state, setState] = useState<RealtimeState>("offline");

  useEffect(() => {
    if (!enabled || !conversationId) return;

    let cancelled = false;
    let connecting = false;
    let attempts = 0;
    let socket: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let tokenController: AbortController | null = null;

    const clearRetry = () => {
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = null;
    };

    const scheduleReconnect = () => {
      if (cancelled) return;
      clearRetry();
      setState(navigator.onLine === false ? "offline" : attempts > 0 ? "reconnecting" : "degraded");
      const delay = Math.min(30_000, 500 * 2 ** Math.min(attempts, 6)) + Math.floor(Math.random() * 250);
      attempts += 1;
      retryTimer = setTimeout(() => void connect(), delay);
    };

    const connect = async () => {
      if (cancelled || connecting || navigator.onLine === false) {
        if (!cancelled && navigator.onLine === false) setState("offline");
        return;
      }
      if (socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) return;
      connecting = true;
      setState(attempts > 0 ? "reconnecting" : "connecting");
      tokenController?.abort();
      tokenController = new AbortController();
      try {
        const response = await fetch(`/api/support/conversations/${encodeURIComponent(conversationId)}/realtime-token`, {
          cache: "no-store",
          signal: tokenController.signal,
        });
        const payload = await responseJson(response);
        if (cancelled) return;
        const protocols = isRecord(payload) ? payload.protocols : null;
        if (!response.ok || !isRealtimeProtocols(protocols)) {
          scheduleReconnect();
          return;
        }
        const url = new URL(`/__cloudflare/support-inbox/${encodeURIComponent(conversationId)}`, window.location.origin);
        url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
        socket = new WebSocket(url, protocols);
        socket.onopen = () => {
          attempts = 0;
          setState("connected");
          onInvalidate(conversationId);
        };
        socket.onmessage = (event) => {
          try {
            const hint: unknown = JSON.parse(String(event.data));
            if (!isRecord(hint)) return;
            const validMessage = hint.type === "support_message_created" && typeof hint.messageId === "string";
            const validConversation = hint.type === "support_conversation_changed";
            if (hint.conversationId === conversationId && (validMessage || validConversation)) onInvalidate(conversationId);
          } catch {
            // D1 refetch on reconnect/focus remains authoritative.
          }
        };
        socket.onerror = () => setState("degraded");
        socket.onclose = scheduleReconnect;
      } catch (error) {
        if (!cancelled && !(error instanceof DOMException && error.name === "AbortError")) scheduleReconnect();
      } finally {
        connecting = false;
      }
    };

    const recover = () => {
      if (cancelled || navigator.onLine === false) return;
      onInvalidate(conversationId);
      if (!socket || socket.readyState === WebSocket.CLOSED) {
        clearRetry();
        void connect();
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") recover();
    };

    window.addEventListener("online", recover);
    window.addEventListener("focus", recover);
    document.addEventListener("visibilitychange", onVisibility);
    void connect();

    return () => {
      cancelled = true;
      clearRetry();
      tokenController?.abort();
      socket?.close();
      window.removeEventListener("online", recover);
      window.removeEventListener("focus", recover);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [conversationId, enabled, onInvalidate]);

  return state;
}

function RequestStatusBadge({ status }: { status: SupportConversationStatus }) {
  const presentation = statusPresentation(status);
  return <Badge tone={presentation.tone} size="xs" className="min-w-0 normal-case">{presentation.label}</Badge>;
}

function RequestsPane({
  conversations,
  error,
  hasNextPage,
  headingRef,
  initialFocus,
  isFetchingNextPage,
  isLoading,
  newButtonRef,
  onLoadMore,
  onNew,
  onRetry,
  onSelect,
  requestRowRefs,
  selectedId,
}: {
  conversations: SupportConversationSummary[];
  error: string | null;
  hasNextPage: boolean;
  headingRef: RefObject<HTMLHeadingElement | null>;
  initialFocus: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  newButtonRef: RefObject<HTMLDivElement | null>;
  onLoadMore: () => void;
  onNew: () => void;
  onRetry: () => void;
  onSelect: (conversationId: string) => void;
  requestRowRefs: RefObject<Map<string, HTMLDivElement>>;
  selectedId: string | null;
}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col bg-white" aria-labelledby="support-requests-heading">
      <div className="flex min-h-10 shrink-0 items-center justify-between gap-2 border-b border-hairline px-2 py-1.5">
        <h2
          ref={headingRef}
          id="support-requests-heading"
          tabIndex={-1}
          data-dialog-initial-focus={initialFocus ? "true" : undefined}
          className="text-[11px] font-medium leading-4 text-ink"
        >
          Requests
        </h2>
        <div ref={newButtonRef}>
          <Button type="button" size="xs" variant="secondary" className="min-w-0" onClick={onNew}>
            <Plus size={16} weight="regular" aria-hidden="true" /> New request
          </Button>
        </div>
      </div>

      {error ? (
        <Alert
          tone="warning"
          title={conversations.length > 0 ? "Requests may be out of date" : "Requests unavailable"}
          description={error}
          action={<Button type="button" size="xs" variant="secondary" onClick={onRetry}>Retry</Button>}
          className="m-2"
        />
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {isLoading ? (
          <div className="space-y-1.5" aria-label="Loading support requests">
            {[0, 1, 2].map((item) => <Skeleton key={item} className="h-20 w-full" />)}
          </div>
        ) : conversations.length === 0 ? (
          <EmptyState
            icon={<ChatCircleDots size={20} weight="regular" aria-hidden="true" />}
            title="No support requests yet"
            description="Start a private conversation with support when you need help or want to share feedback."
            action={<Button type="button" size="sm" variant="primary" onClick={onNew}>New request</Button>}
            className="min-h-56"
          />
        ) : (
          <div className="space-y-1">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                ref={(node) => {
                  if (node) requestRowRefs.current.set(conversation.id, node);
                  else requestRowRefs.current.delete(conversation.id);
                }}
              >
                <Button
                  type="button"
                  variant="plain"
                  size="sm"
                  aria-current={selectedId === conversation.id ? "page" : undefined}
                  aria-label={`${conversation.unread ? "Unread. " : ""}${shortReference(conversation.stableReference)}, ${statusPresentation(conversation.status).label}. ${conversation.lastPreview || "No preview"}`}
                  className={cn(
                    "h-auto w-full min-w-0 flex-col items-stretch gap-1 whitespace-normal border border-transparent p-2 text-left",
                    selectedId === conversation.id ? "border-divider bg-surfaceMuted" : "hover:border-hairline hover:bg-surfaceMuted/60",
                  )}
                  onClick={() => onSelect(conversation.id)}
                >
                  <span className="flex min-w-0 items-center justify-between gap-2">
                    <RequestStatusBadge status={conversation.status} />
                    <span className="shrink-0 text-[9px] font-normal leading-3 text-tertiary" title={dateFormatter.format(new Date(conversation.lastMessageAt))}>
                      {dateFormatter.format(new Date(conversation.lastMessageAt))}
                    </span>
                  </span>
                  <span className="line-clamp-2 text-[10px] font-normal leading-4 text-secondary">{conversation.lastPreview || "Support request"}</span>
                  <span className="flex items-center justify-between gap-2 text-[9px] font-normal leading-3 text-tertiary">
                    <span>{shortReference(conversation.stableReference)}</span>
                    {conversation.unread ? <Badge tone="danger" size="xs" className="min-w-0 normal-case">Unread</Badge> : null}
                  </span>
                </Button>
              </div>
            ))}
            {hasNextPage ? (
              <Button type="button" size="sm" variant="secondary" className="w-full" disabled={isFetchingNextPage} onClick={onLoadMore}>
                {isFetchingNextPage ? "Loading" : "Load more requests"}
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

function MessageDetails({ message }: { message: SupportMessage }) {
  if (!message.context) return null;
  const context = message.context;
  return (
    <details className="mt-2 border-t border-current/10 pt-1.5 text-[9px] leading-4 opacity-80">
      <summary className="cursor-pointer font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">Included details</summary>
      <dl className="mt-1 grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-0.5">
        <dt>Route</dt><dd className="break-words">{context.routeTemplate}</dd>
        <dt>Extra details</dt><dd>{context.diagnosticsShared ? "Shared for this message" : "Not shared"}</dd>
        {context.browserFamily ? <><dt>Browser</dt><dd>{context.browserFamily}</dd></> : null}
        {context.osFamily ? <><dt>OS</dt><dd>{context.osFamily}</dd></> : null}
        {context.viewportWidth && context.viewportHeight ? <><dt>Viewport</dt><dd>{context.viewportWidth} × {context.viewportHeight}</dd></> : null}
        {context.timezone ? <><dt>Timezone</dt><dd>{context.timezone}</dd></> : null}
        {context.appRelease ? <><dt>Release</dt><dd className="break-all">{context.appRelease}</dd></> : null}
        {context.workspaceId ? <><dt>Workspace</dt><dd>Validated</dd></> : null}
        {context.projectId ? <><dt>Project</dt><dd>Validated</dd></> : null}
        {context.estimateId ? <><dt>Estimate</dt><dd>Validated</dd></> : null}
      </dl>
    </details>
  );
}

function MessageAttachment({ attachment, attribution }: { attachment: SupportMessage["attachments"][number]; attribution: string }) {
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const source = retry ? `${attachment.url}?retry=${retry}` : attachment.url;
  return (
    <div className="mt-2 rounded-xs border border-current/15 p-1.5">
      {failed ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] leading-4">
          <span>Screenshot unavailable. The message is still saved.</span>
          <Button type="button" size="xs" variant="secondary" className="min-w-0" onClick={() => { setFailed(false); setRetry((value) => value + 1); }}>Retry screenshot</Button>
        </div>
      ) : (
        <a href={attachment.url} target="_blank" rel="noreferrer" className="block cursor-pointer rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus" aria-label={`Open screenshot attached by ${attribution}`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- Authenticated, no-store attachment endpoint supplies a private normalized WebP. */}
          <img src={source} alt={`Screenshot attached by ${attribution}`} className="max-h-48 w-full rounded-xs object-contain" onError={() => setFailed(true)} />
          <span className="mt-1 block text-[9px] leading-3 opacity-75">Private screenshot · {Math.max(1, Math.round(attachment.sizeBytes / 1024))} KB · Open preview</span>
        </a>
      )}
    </div>
  );
}

function MessageCard({
  message,
  watermarkRef,
}: {
  message: SupportMessage;
  watermarkRef?: RefObject<HTMLElement | null>;
}) {
  const fromUser = message.senderRole === "user";
  const attribution = fromUser ? "You" : "Support";
  return (
    <article
      ref={watermarkRef}
      data-support-message-id={message.id}
      className={cn(
        "max-w-[88%] rounded-xs border p-2 text-[10px] leading-4",
        fromUser ? "ml-auto border-divider bg-surfaceMuted text-ink" : "mr-auto border-hairline bg-white text-secondary",
      )}
    >
      <header className="mb-1 flex flex-wrap items-center justify-between gap-2 text-[9px] leading-3 text-tertiary">
        <span className="font-medium text-secondary">{attribution}</span>
        <time dateTime={message.createdAt}>{dateFormatter.format(new Date(message.createdAt))}</time>
      </header>
      <p className="whitespace-pre-wrap break-words">{message.bodyText}</p>
      {message.attachments.map((attachment) => <MessageAttachment key={attachment.id} attachment={attachment} attribution={attribution} />)}
      <MessageDetails message={message} />
    </article>
  );
}

type SupportCenterProps = {
  className?: string;
  host: SupportCenterHost;
  workspaceId?: string | null;
};

export function SupportCenter({ className, host, workspaceId }: SupportCenterProps) {
  const pathname = usePathname() ?? "/workshop/feedback";
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const isNarrow = useMediaQuery("(max-width: 639px)");
  const isOnline = useOnlineStatus();
  const {
    clearDraft,
    getDraft,
    installScreenshotForNewAttempt,
    setScreenshot,
    startNewAttempt,
    updateDraft,
  } = useSupportDrafts();
  const [open, setOpen] = useState(host === "page");
  const [view, setView] = useState<SupportCenterView>("requests");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [realtimeDegraded, setRealtimeDegraded] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  const [readRetry, setReadRetry] = useState(0);
  const initializedRef = useRef(false);
  const focusViewRef = useRef(false);
  const returnFocusKeyRef = useRef<string | null>(null);
  const requestRowRefs = useRef(new Map<string, HTMLDivElement>());
  const newButtonRef = useRef<HTMLDivElement>(null);
  const requestsHeadingRef = useRef<HTMLHeadingElement>(null);
  const conversationHeadingRef = useRef<HTMLHeadingElement>(null);
  const newTextareaRef = useRef<HTMLTextAreaElement>(null);
  const lastSupportMessageRef = useRef<HTMLElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const pendingTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const screenshotReplacementRef = useRef(new Map<string, { controller: AbortController; screenshot: SupportScreenshot }>());
  const readWatermarksRef = useRef(new Set<string>());
  const previousNewestMessageRef = useRef<string | null>(null);

  const conversationsQuery = useInfiniteQuery({
    queryKey: ["support", "conversations"],
    queryFn: ({ pageParam }) => readConversationPage(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    refetchInterval: () => typeof document !== "undefined" && document.visibilityState === "visible" ? 60_000 : false,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  });
  const conversations = useMemo(
    () => conversationsQuery.data?.pages.flatMap((page) => page.conversations) ?? [],
    [conversationsQuery.data],
  );
  const totalUnread = conversationsQuery.data?.pages[0]?.totalUnread ?? 0;
  const selectedConversation = conversations.find((conversation) => conversation.id === selectedId) ?? null;
  const active = host === "page" || open;

  const messagesQuery = useInfiniteQuery({
    queryKey: ["support", "messages", selectedId],
    enabled: active && view === "conversation" && Boolean(selectedId),
    queryFn: ({ pageParam }) => {
      if (!selectedId) throw new Error("Select a support conversation first.");
      return readMessagePage(selectedId, pageParam);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  });
  const messages = useMemo(
    () => (messagesQuery.data?.pages ?? []).slice().reverse().flatMap((page) => page.messages),
    [messagesQuery.data],
  );
  const newestMessageId = messages.at(-1)?.id ?? null;
  const lastSupportMessageId = [...messages].reverse().find((message) => message.senderRole !== "user")?.id ?? null;

  const invalidateConversation = useCallback((conversationId: string) => {
    void queryClient.invalidateQueries({ queryKey: ["support", "conversations"] });
    void queryClient.invalidateQueries({ queryKey: ["support", "messages", conversationId] });
  }, [queryClient]);

  const realtimeState = useSupportRealtime({
    conversationId: selectedId,
    enabled: active && view === "conversation" && Boolean(selectedId),
    onInvalidate: invalidateConversation,
  });

  useEffect(() => () => {
    for (const timer of pendingTimersRef.current.values()) clearTimeout(timer);
    pendingTimersRef.current.clear();
    for (const replacement of screenshotReplacementRef.current.values()) {
      replacement.controller.abort();
      URL.revokeObjectURL(replacement.screenshot.previewUrl);
    }
    screenshotReplacementRef.current.clear();
  }, []);

  const deepLinkedId = host === "page" && isUuid(searchParams.get("c")) ? searchParams.get("c") : null;

  const syncPageUrl = useCallback((conversationId: string | null) => {
    if (host !== "page") return;
    const next = new URLSearchParams(searchParams.toString());
    if (conversationId) next.set("c", conversationId);
    else next.delete("c");
    router.replace(next.size > 0 ? `/workshop/feedback?${next}` : "/workshop/feedback", { scroll: false });
  }, [host, router, searchParams]);

  const selectConversation = useCallback((conversationId: string, moveFocus = true) => {
    returnFocusKeyRef.current = conversationId;
    getDraft(`reply:${conversationId}`);
    setSelectedId(conversationId);
    setView("conversation");
    setReadError(null);
    syncPageUrl(conversationId);
    focusViewRef.current = moveFocus;
  }, [getDraft, syncPageUrl]);

  const openNewRequest = useCallback((moveFocus = true) => {
    returnFocusKeyRef.current = "new";
    getDraft(NEW_DRAFT_KEY);
    setView("new");
    syncPageUrl(null);
    focusViewRef.current = moveFocus;
  }, [getDraft, syncPageUrl]);

  useEffect(() => {
    if (!active || !conversationsQuery.isSuccess || initializedRef.current) return;
    initializedRef.current = true;
    const frame = requestAnimationFrame(() => {
      const newestUnread = conversations.find((conversation) => conversation.unread);
      const firstConversation = conversations[0];
      if (deepLinkedId) selectConversation(deepLinkedId);
      else if (newestUnread) selectConversation(newestUnread.id);
      else if (!firstConversation) openNewRequest();
      else if (isNarrow) {
        setView("requests");
        requestsHeadingRef.current?.focus({ preventScroll: true });
      } else selectConversation(firstConversation.id);
    });
    return () => cancelAnimationFrame(frame);
  }, [active, conversations, conversationsQuery.isSuccess, deepLinkedId, isNarrow, openNewRequest, selectConversation]);

  useEffect(() => {
    if (host !== "page" || !deepLinkedId || deepLinkedId === selectedId) return;
    const frame = requestAnimationFrame(() => selectConversation(deepLinkedId));
    return () => cancelAnimationFrame(frame);
  }, [deepLinkedId, host, selectConversation, selectedId]);

  useEffect(() => {
    if (!focusViewRef.current) return;
    focusViewRef.current = false;
    const frame = requestAnimationFrame(() => {
      if (view === "new") newTextareaRef.current?.focus({ preventScroll: true });
      else if (view === "conversation") conversationHeadingRef.current?.focus({ preventScroll: true });
      else requestsHeadingRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [selectedId, view]);

  useEffect(() => {
    if (view !== "requests" || !returnFocusKeyRef.current) return;
    const key = returnFocusKeyRef.current;
    returnFocusKeyRef.current = null;
    const frame = requestAnimationFrame(() => {
      const returnTarget = key === "new"
        ? newButtonRef.current?.querySelector<HTMLButtonElement>("button")
        : requestRowRefs.current.get(key)?.querySelector<HTMLButtonElement>("button");
      (returnTarget ?? requestsHeadingRef.current)?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [view]);

  useEffect(() => {
    if (!newestMessageId || newestMessageId === previousNewestMessageRef.current) return;
    previousNewestMessageRef.current = newestMessageId;
    const frame = requestAnimationFrame(() => threadEndRef.current?.scrollIntoView({ block: "end" }));
    return () => cancelAnimationFrame(frame);
  }, [newestMessageId, selectedId]);

  useEffect(() => {
    if (
      view !== "conversation"
      || !selectedId
      || !lastSupportMessageId
      || !messagesQuery.isSuccess
      || messagesQuery.isFetching
      || messagesQuery.isRefetchError
      || (selectedConversation && !selectedConversation.unread)
    ) return;
    const watermarkKey = `${selectedId}:${lastSupportMessageId}`;
    if (readWatermarksRef.current.has(watermarkKey)) return;
    const frame = requestAnimationFrame(() => {
      const rendered = lastSupportMessageRef.current;
      if (!rendered?.isConnected || rendered.dataset.supportMessageId !== lastSupportMessageId) return;
      readWatermarksRef.current.add(watermarkKey);
      void fetch(`/api/support/conversations/${encodeURIComponent(selectedId)}/read`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ throughMessageId: lastSupportMessageId }),
      }).then(async (response) => {
        const payload = await responseJson(response);
        if (!response.ok) throw new Error(responseError(payload, "Unread state could not be updated."));
        setReadError(null);
        void queryClient.invalidateQueries({ queryKey: ["support", "conversations"] });
      }).catch(() => {
        readWatermarksRef.current.delete(watermarkKey);
        setReadError("The conversation is visible, but its unread state could not be updated.");
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [lastSupportMessageId, messagesQuery.isFetching, messagesQuery.isRefetchError, messagesQuery.isSuccess, queryClient, readRetry, selectedConversation, selectedId, view]);

  function clearPendingTimer(key: string) {
    const timer = pendingTimersRef.current.get(key);
    if (timer) clearTimeout(timer);
    pendingTimersRef.current.delete(key);
  }

  function allowRetryAfter(key: string, seconds: number, nextError?: string) {
    clearPendingTimer(key);
    const timer = setTimeout(() => {
      pendingTimersRef.current.delete(key);
      updateDraft(key, (draft) => ({ ...draft, error: nextError ?? draft.error, retryAfterSeconds: 0 }));
    }, Math.max(1, seconds) * 1_000);
    pendingTimersRef.current.set(key, timer);
  }

  async function sendDraft(key: string, kind: "new" | "reply", conversationId?: string) {
    const draft = getDraft(key);
    if (draft.message.trim().length < 2 || draft.message.trim().length > 4_000) return;
    if (draft.screenshotReplacementPending) return;
    if (draft.phase === "sending") return;
    if (
      (draft.phase === "pending" || draft.phase === "rate_limited")
      && (draft.retryAfterSeconds ?? 0) > 0
    ) return;
    if (navigator.onLine === false) {
      updateDraft(key, (current) => ({ ...current, error: null, phase: "offline" }));
      return;
    }
    let endpoint = "/api/support/conversations";
    if (kind === "reply") {
      if (!conversationId) return;
      endpoint = `/api/support/conversations/${encodeURIComponent(conversationId)}/messages`;
    }
    clearPendingTimer(key);
    updateDraft(key, (current) => ({ ...current, error: null, fileError: null, phase: "sending", retryAfterSeconds: null }));
    try {
      const response = await fetch(endpoint, { method: "POST", body: buildSupportFormData(draft, pathname, workspaceId) });
      const payload = await responseJson(response);
      if (response.status === 202) {
        const retryAfter = Math.max(1, Math.min(30, Number(response.headers.get("Retry-After")) || 1));
        updateDraft(key, (current) => ({ ...current, error: null, phase: "pending", retryAfterSeconds: retryAfter }));
        allowRetryAfter(key, retryAfter);
        return;
      }
      if (!response.ok) {
        const error = responseError(payload, kind === "new" ? "Support request could not be sent." : "Reply could not be sent.");
        const retryAfter = Math.max(1, Math.min(86_400, Number(response.headers.get("Retry-After")) || 1));
        const screenshotFailure = Boolean(draft.screenshot) && (
          response.status === 413
          || response.status === 415
          || /screenshot|image|encoding|animated|dimension/iu.test(error)
        );
        if (response.status === 429) {
          updateDraft(key, (current) => ({ ...current, error: `${error} Retry in ${retryAfter} seconds.`, phase: "rate_limited", retryAfterSeconds: retryAfter }));
          allowRetryAfter(key, retryAfter, "You can retry this message now.");
        } else if (response.status === 409) {
          updateDraft(key, (current) => ({ ...current, error, phase: "conflict", retryAfterSeconds: null }));
        } else if (screenshotFailure) {
          updateDraft(key, (current) => ({ ...current, error, phase: "screenshot_error", retryAfterSeconds: null }));
        } else if (response.status >= 500) {
          updateDraft(key, (current) => ({ ...current, error: "We could not confirm the result. Retry to check the same message without creating a duplicate.", phase: "uncertain", retryAfterSeconds: 0 }));
        } else {
          updateDraft(key, (current) => ({ ...current, error, phase: "error", retryAfterSeconds: null }));
        }
        return;
      }
      if (!isSupportIntakeResponse(payload)) throw new Error("Support response was incomplete.");

      clearDraft(key);
      setAnnouncement(response.status === 200
        ? kind === "new" ? "Request received. The saved request was recovered." : "Reply sent. The saved reply was recovered."
        : kind === "new" ? "Request received." : "Reply sent.");
      setRealtimeDegraded(Boolean(payload.realtimeDegraded));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["support", "conversations"] }),
        queryClient.invalidateQueries({ queryKey: ["support", "messages", payload.conversation.id] }),
      ]);
      selectConversation(payload.conversation.id, kind === "new");
    } catch {
      updateDraft(key, (current) => ({
        ...current,
        error: "We could not confirm the result. Check your connection, then retry the same message.",
        phase: "uncertain",
        retryAfterSeconds: 0,
      }));
    }
  }

  async function selectScreenshot(key: string, screenshot: SupportScreenshot | null, fileError: string | null = null) {
    if (!screenshot) {
      setScreenshot(key, null, fileError);
      return;
    }

    const draft = getDraft(key);
    if (draft.screenshotReplacementPending) {
      URL.revokeObjectURL(screenshot.previewUrl);
      return;
    }
    if (draft.phase !== "screenshot_error" || !draft.screenshot) {
      setScreenshot(key, screenshot);
      return;
    }

    const priorClientMessageId = draft.clientMessageId;
    const controller = new AbortController();
    screenshotReplacementRef.current.set(key, { controller, screenshot });
    updateDraft(key, (current) => ({ ...current, fileError: null, screenshotReplacementPending: true }));
    let installed = false;

    try {
      const sameFile = await filesHaveSameContents(draft.screenshot.file, screenshot.file);
      if (controller.signal.aborted) return;
      if (sameFile) {
        setScreenshot(key, screenshot);
        installed = true;
        return;
      }

      const response = await fetch(`/api/support/intake/${encodeURIComponent(priorClientMessageId)}/abandon`, {
        method: "POST",
        signal: controller.signal,
      });
      const payload = await responseJson(response);
      if (controller.signal.aborted) return;
      const fenced = response.status === 404 || (response.ok && isSuccessfulAbandonResponse(payload));
      if (!fenced) {
        updateDraft(key, (current) => current.clientMessageId === priorClientMessageId
          ? {
              ...current,
              error: response.status === 409
                ? "The original attempt may already be saved. Retry it before replacing the screenshot."
                : current.error,
              fileError: response.status === 409
                ? "The replacement was not applied."
                : responseError(payload, "The previous screenshot attempt could not be fenced safely. The replacement was not applied."),
              phase: response.status === 409 ? "uncertain" : "screenshot_error",
              retryAfterSeconds: response.status === 409 ? 0 : current.retryAfterSeconds,
              screenshotReplacementPending: false,
            }
          : current);
        return;
      }

      installScreenshotForNewAttempt(key, screenshot);
      installed = true;
    } catch (error) {
      if (controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) return;
      updateDraft(key, (current) => current.clientMessageId === priorClientMessageId
        ? {
            ...current,
            fileError: "The replacement could not be confirmed. The previous screenshot and attempt were kept.",
            screenshotReplacementPending: false,
          }
        : current);
    } finally {
      const activeReplacement = screenshotReplacementRef.current.get(key);
      if (activeReplacement?.screenshot.previewUrl === screenshot.previewUrl) {
        screenshotReplacementRef.current.delete(key);
      }
      if (!installed) URL.revokeObjectURL(screenshot.previewUrl);
    }
  }

  async function sendWithoutScreenshot(key: string, kind: "new" | "reply", conversationId?: string) {
    const draft = getDraft(key);
    if (!draft.screenshot || draft.screenshotReplacementPending) return;
    updateDraft(key, (current) => ({ ...current, error: null, phase: "sending" }));
    try {
      const response = await fetch(`/api/support/intake/${encodeURIComponent(draft.clientMessageId)}/abandon`, { method: "POST" });
      const payload = await responseJson(response);
      const fenced = response.status === 404 || (response.ok && isSuccessfulAbandonResponse(payload));
      if (!fenced) {
        updateDraft(key, (current) => ({
          ...current,
          error: response.status === 409
            ? "The original attempt may already be saved. Retry it before starting another message."
            : responseError(payload, "The screenshot attempt could not be fenced safely."),
          phase: response.status === 409 ? "uncertain" : "screenshot_error",
          retryAfterSeconds: response.status === 409 ? 0 : null,
        }));
        return;
      }
      setScreenshot(key, null);
      startNewAttempt(key);
      await sendDraft(key, kind, conversationId);
    } catch {
      updateDraft(key, (current) => ({
        ...current,
        error: "The screenshot attempt could not be fenced safely. Retry before sending without it.",
        phase: "screenshot_error",
      }));
    }
  }

  function goBack() {
    setView("requests");
    syncPageUrl(null);
  }

  const newDraft = getDraft(NEW_DRAFT_KEY);
  const replyKey = selectedId ? `reply:${selectedId}` : null;
  const replyDraft = replyKey ? getDraft(replyKey) : null;
  const conversationsError = conversationsQuery.isError || conversationsQuery.isRefetchError
    ? conversationsQuery.error instanceof Error ? conversationsQuery.error.message : "Requests could not be refreshed."
    : null;
  const messagesError = messagesQuery.isError || messagesQuery.isRefetchError
    ? messagesQuery.error instanceof Error ? messagesQuery.error.message : "Conversation could not be refreshed."
    : null;
  const showRealtimeDelay = realtimeDegraded || realtimeState === "degraded" || realtimeState === "reconnecting";

  const requestsPane = (
    <RequestsPane
      conversations={conversations}
      error={conversationsError}
      hasNextPage={Boolean(conversationsQuery.hasNextPage)}
      headingRef={requestsHeadingRef}
      initialFocus={view === "requests"}
      isFetchingNextPage={conversationsQuery.isFetchingNextPage}
      isLoading={conversationsQuery.isLoading}
      newButtonRef={newButtonRef}
      onLoadMore={() => void conversationsQuery.fetchNextPage()}
      onNew={() => openNewRequest()}
      onRetry={() => void conversationsQuery.refetch()}
      onSelect={(conversationId) => selectConversation(conversationId)}
      requestRowRefs={requestRowRefs}
      selectedId={selectedId}
    />
  );

  const activePane = view === "requests" ? (
    <section className="flex min-h-0 flex-1 items-center justify-center bg-surfaceMuted/30 p-3" aria-label="Support request selection">
      <EmptyState
        icon={<ChatCircleDots size={20} weight="regular" aria-hidden="true" />}
        title="Select a request"
        description="Choose a request from the list, or start a new private conversation."
        action={<Button type="button" size="sm" variant="primary" onClick={() => openNewRequest()}>New request</Button>}
        className="w-full max-w-sm"
      />
    </section>
  ) : view === "new" ? (
    <section className="flex min-h-0 flex-1 flex-col bg-white" aria-labelledby="support-new-heading">
      <div className="flex min-h-10 shrink-0 items-center gap-1 border-b border-hairline px-2 py-1.5">
        {isNarrow ? <Button type="button" variant="ghost" size="icon-sm" aria-label="Back to requests" title="Back to requests" onClick={goBack}><ArrowLeft size={16} weight="regular" aria-hidden="true" /></Button> : null}
        <div className="min-w-0">
          <h2 id="support-new-heading" className="text-[11px] font-medium leading-4 text-ink">New request</h2>
          <p className="text-[9px] leading-3 text-tertiary">Private conversation with Archestimator support</p>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <SupportMessageComposer
          draft={newDraft}
          initialFocus
          isOnline={isOnline}
          kind="new"
          textareaRef={newTextareaRef}
          onChange={(update) => updateDraft(NEW_DRAFT_KEY, update)}
          onRemoveScreenshot={() => setScreenshot(NEW_DRAFT_KEY, null)}
          onRetry={() => void sendDraft(NEW_DRAFT_KEY, "new")}
          onScreenshot={(screenshot: SupportScreenshot | null, error = null) => selectScreenshot(NEW_DRAFT_KEY, screenshot, error)}
          onSend={() => void sendDraft(NEW_DRAFT_KEY, "new")}
          onSendWithoutScreenshot={() => void sendWithoutScreenshot(NEW_DRAFT_KEY, "new")}
          onStartNewAttempt={() => startNewAttempt(NEW_DRAFT_KEY)}
        />
      </div>
    </section>
  ) : view === "conversation" ? (
    <section className="flex min-h-0 flex-1 flex-col bg-white" aria-labelledby="support-conversation-heading">
      <div className="flex min-h-10 shrink-0 items-center gap-1 border-b border-hairline px-2 py-1.5">
        {isNarrow ? <Button type="button" variant="ghost" size="icon-sm" aria-label="Back to requests" title="Back to requests" onClick={goBack}><ArrowLeft size={16} weight="regular" aria-hidden="true" /></Button> : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2
              ref={conversationHeadingRef}
              id="support-conversation-heading"
              tabIndex={-1}
              data-dialog-initial-focus={view === "conversation" ? "true" : undefined}
              className="text-[11px] font-medium leading-4 text-ink"
            >
              Conversation
            </h2>
            {selectedConversation ? <RequestStatusBadge status={selectedConversation.status} /> : null}
          </div>
          <p className="text-[9px] leading-3 text-tertiary">{selectedId ? shortReference(selectedId) : "Support request"}</p>
        </div>
      </div>

      {showRealtimeDelay ? (
        <Alert
          tone="warning"
          title="Live updates are delayed"
          description="Messages are still saved. Refresh to read the latest D1 history."
          action={<Button type="button" size="xs" variant="secondary" onClick={() => selectedId && invalidateConversation(selectedId)}>Refresh</Button>}
          className="m-2 mb-0"
        />
      ) : null}
      {messagesError ? (
        <Alert
          tone="warning"
          title={messages.length > 0 ? "Conversation may be out of date" : "Conversation unavailable"}
          description={`${messagesError} Visible messages have been preserved.`}
          action={<Button type="button" size="xs" variant="secondary" onClick={() => void messagesQuery.refetch()}>Retry</Button>}
          className="m-2 mb-0"
        />
      ) : null}
      {readError ? (
        <Alert
          tone="warning"
          title="Unread state not updated"
          description={readError}
          action={<Button type="button" size="xs" variant="secondary" onClick={() => { setReadError(null); setReadRetry((value) => value + 1); }}>Retry</Button>}
          className="m-2 mb-0"
        />
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto p-2" aria-live="polite" aria-busy={messagesQuery.isLoading}>
        {messagesQuery.hasNextPage ? (
          <div className="mb-2 flex justify-center">
            <Button type="button" size="sm" variant="secondary" disabled={messagesQuery.isFetchingNextPage} onClick={() => void messagesQuery.fetchNextPage()}>
              {messagesQuery.isFetchingNextPage ? "Loading" : "Load older messages"}
            </Button>
          </div>
        ) : null}
        {messagesQuery.isLoading ? (
          <div className="space-y-2" aria-label="Loading conversation">
            <Skeleton className="h-16 w-3/4" />
            <Skeleton className="ml-auto h-20 w-3/4" />
          </div>
        ) : messages.length === 0 && !messagesError ? (
          <p className="p-3 text-center text-[10px] leading-4 text-tertiary">No messages are available in this conversation.</p>
        ) : (
          <div className="space-y-2">
            {messages.map((message) => (
              <MessageCard
                key={message.id}
                message={message}
                watermarkRef={message.id === lastSupportMessageId ? lastSupportMessageRef : undefined}
              />
            ))}
            <div ref={threadEndRef} aria-hidden="true" />
          </div>
        )}
      </div>

      {replyDraft && replyKey ? (
        <div className="max-h-[60dvh] shrink-0 overflow-y-auto border-t border-hairline bg-white p-2">
          <SupportMessageComposer
            draft={replyDraft}
            isOnline={isOnline}
            kind="reply"
            onChange={(update) => updateDraft(replyKey, update)}
            onRemoveScreenshot={() => setScreenshot(replyKey, null)}
            onRetry={() => void sendDraft(replyKey, "reply", selectedId ?? undefined)}
            onScreenshot={(screenshot: SupportScreenshot | null, error = null) => selectScreenshot(replyKey, screenshot, error)}
            onSend={() => void sendDraft(replyKey, "reply", selectedId ?? undefined)}
            onSendWithoutScreenshot={() => void sendWithoutScreenshot(replyKey, "reply", selectedId ?? undefined)}
            onStartNewAttempt={() => startNewAttempt(replyKey)}
          />
        </div>
      ) : null}
    </section>
  ) : requestsPane;

  const center = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white text-secondary">
      {announcement ? <p role="status" aria-live="polite" className="shrink-0 border-b border-success/20 bg-successSoft px-2 py-1.5 text-[10px] leading-4 text-success">{announcement}</p> : null}
      {!isOnline ? <p role="status" className="shrink-0 border-b border-warning/20 bg-warningSoft px-2 py-1.5 text-[10px] leading-4 text-warning">You are offline. Drafts stay in this Support Center and will not send automatically.</p> : null}
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] sm:grid-cols-[252px_minmax(0,1fr)]">
        <div className={cn("flex min-h-0 border-r border-hairline", isNarrow && view !== "requests" && "hidden")}>{requestsPane}</div>
        <div className={cn("flex min-h-0", isNarrow && view === "requests" && "hidden")}>{activePane}</div>
      </div>
    </div>
  );

  if (host === "page") {
    return <div className={cn("flex min-h-0 flex-1 overflow-hidden rounded-xs border border-hairline bg-white", className)}>{center}</div>;
  }

  const triggerLabel = totalUnread > 0
    ? `Support, ${totalUnread} unread ${totalUnread === 1 ? "reply" : "replies"}`
    : "Support";
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={cn("relative min-w-0 text-tertiary", className)}
        aria-label={triggerLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Support"
        onClick={() => {
          initializedRef.current = false;
          setOpen(true);
        }}
      >
        <Lifebuoy size={15} weight="regular" aria-hidden="true" />
        {totalUnread > 0 ? (
          <span aria-hidden="true" className="absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-xs border border-white bg-danger px-1 text-[8px] font-medium leading-none text-white tabular-nums">
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        ) : null}
      </Button>
      {isNarrow ? (
        <Sheet
          open={open}
          onOpenChange={(next) => { setOpen(next); if (!next) initializedRef.current = false; }}
          title="Support Center"
          description="Private requests and replies with Archestimator support."
          side="right"
          size="full"
          modal
          withScrim
          closeLabel="Close Support Center"
          bodyClassName="overflow-hidden p-0"
          contentClassName="h-[calc(100dvh-24px)]"
        >
          {center}
        </Sheet>
      ) : (
        <AppModal
          open={open}
          onOpenChange={(next) => { setOpen(next); if (!next) initializedRef.current = false; }}
          title="Support Center"
          description="Private requests and replies with Archestimator support."
          size="xl"
          closeLabel="Close Support Center"
          bodyClassName="h-[min(680px,calc(100dvh-176px))] overflow-hidden p-0"
          location="Workshop / Support"
        >
          {center}
        </AppModal>
      )}
    </>
  );
}
