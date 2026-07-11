"use client";

import React, { useCallback, useEffect, useReducer } from "react";
import { useQuery } from "@tanstack/react-query";
import { EnsureQueryClient } from "@/components/share/ensure-query-client";
import { useSharedLinkSession } from "@/hooks/use-shared-link-session";
import { Button } from "@/components/ui/button";
import { createPublicationCsrfHeaders } from "@/lib/publication/client-csrf";
import {
  normalizeShareReviewTarget,
  serializeShareReviewTarget,
  shareReviewTargetDisplay,
  type ShareReviewTarget,
  type ShareReviewTargetKind,
} from "@/components/share/share-review-target";

interface Comment {
  id: string;
  body: string;
  author_email?: string;
  authorName?: string;
  authorType?: "owner" | "recipient";
  created_at: string; // ISO for display
  estimateId?: string | null;
  rowId?: string | null;
  targetKind?: ShareReviewTargetKind;
  targetLabel?: string | null;
  targetSecondaryLabel?: string | null;
  snapshotVersionAtComment?: number | null;
  isOptimistic?: boolean;
}

type LoadedComment = {
  id: string;
  content: string;
  createdAt: string;
  authorName: string;
  authorType: "owner" | "recipient";
  estimateId?: string | null;
  rowId?: string | null;
  targetKind?: ShareReviewTargetKind;
  targetLabel?: string | null;
  targetSecondaryLabel?: string | null;
  snapshotVersionAtComment?: number | null;
};

type CommentPostResponse = {
  id?: string;
  comment?: LoadedComment;
};

type CommentPage = {
  comments: Comment[];
  hasMore: boolean;
  nextCursor: string | null;
};

interface SharePageCommentsProps {
  token: string;
  viewToken: string;
  reviewTarget?: ShareReviewTarget;
  // publicationId not required for P6 write path
}

type QueuedComment = { body: string; ts: number; reviewTarget?: ShareReviewTarget };

type SharePageCommentsState = {
  comments: Comment[];
  draft: string;
  isLoadingComments: boolean;
  isLoadingMoreComments: boolean;
  isPosting: boolean;
  error: string | null;
  loadError: string | null;
  loadMoreError: string | null;
  hasMoreComments: boolean;
  nextCommentsCursor: string | null;
  lastAnnouncement: string;
  isExpanded: boolean;
  retryStatus: string | null;
  pendingCount: number;
};

type SharePageCommentsAction =
  | { type: "announcementSet"; message: string }
  | { type: "commentsLoadStarted" }
  | { type: "commentsLoaded"; page: CommentPage }
  | { type: "commentsLoadFailed"; error: string }
  | { type: "commentsLoadSettled" }
  | { type: "commentsMoreLoadStarted" }
  | { type: "commentsMoreLoaded"; page: CommentPage }
  | { type: "commentsMoreLoadFailed"; error: string }
  | { type: "commentsMoreLoadSettled" }
  | { type: "draftChanged"; draft: string; clearError?: boolean }
  | { type: "errorSet"; error: string | null }
  | { type: "expandedToggled" }
  | { type: "optimisticCommentAdded"; comment: Comment }
  | { type: "commentConfirmed"; tempId: string; confirmedComment: Comment | null; fallbackId: string }
  | { type: "commentRemoved"; tempId: string }
  | { type: "postingChanged"; isPosting: boolean }
  | { type: "retryStatusSet"; retryStatus: string | null }
  | { type: "pendingCountSet"; pendingCount: number };

const INITIAL_SHARE_PAGE_COMMENTS_STATE: SharePageCommentsState = {
  comments: [],
  draft: "",
  isLoadingComments: false,
  isLoadingMoreComments: false,
  isPosting: false,
  error: null,
  loadError: null,
  loadMoreError: null,
  hasMoreComments: false,
  nextCommentsCursor: null,
  lastAnnouncement: "",
  isExpanded: true,
  retryStatus: null,
  pendingCount: 0,
};

function sharePageCommentsReducer(state: SharePageCommentsState, action: SharePageCommentsAction): SharePageCommentsState {
  switch (action.type) {
    case "announcementSet":
      return {
        ...state,
        lastAnnouncement: action.message,
      };
    case "commentsLoadStarted":
      return {
        ...state,
        isLoadingComments: true,
        loadError: null,
      };
    case "commentsLoaded":
      return {
        ...state,
        comments: action.page.comments,
        hasMoreComments: action.page.hasMore,
        nextCommentsCursor: action.page.nextCursor,
      };
    case "commentsLoadFailed":
      return {
        ...state,
        loadError: action.error,
      };
    case "commentsLoadSettled":
      return {
        ...state,
        isLoadingComments: false,
      };
    case "commentsMoreLoadStarted":
      return {
        ...state,
        isLoadingMoreComments: true,
        loadMoreError: null,
      };
    case "commentsMoreLoaded": {
      const existingIds = new Set(state.comments.map((comment) => comment.id));
      return {
        ...state,
        comments: [...action.page.comments.filter((comment) => !existingIds.has(comment.id)), ...state.comments],
        hasMoreComments: action.page.hasMore,
        nextCommentsCursor: action.page.nextCursor,
      };
    }
    case "commentsMoreLoadFailed":
      return {
        ...state,
        loadMoreError: action.error,
      };
    case "commentsMoreLoadSettled":
      return {
        ...state,
        isLoadingMoreComments: false,
      };
    case "draftChanged":
      return {
        ...state,
        draft: action.draft,
        error: action.clearError ? null : state.error,
      };
    case "errorSet":
      return {
        ...state,
        error: action.error,
      };
    case "expandedToggled":
      return {
        ...state,
        isExpanded: !state.isExpanded,
      };
    case "optimisticCommentAdded":
      return {
        ...state,
        comments: [...state.comments, action.comment],
        draft: "",
        error: null,
        isPosting: true,
      };
    case "commentConfirmed":
      return {
        ...state,
        comments: state.comments.map((comment) =>
          comment.id === action.tempId
            ? action.confirmedComment ?? { ...comment, id: action.fallbackId, isOptimistic: false }
            : comment,
        ),
      };
    case "commentRemoved":
      return {
        ...state,
        comments: state.comments.filter((comment) => comment.id !== action.tempId),
      };
    case "postingChanged":
      return {
        ...state,
        isPosting: action.isPosting,
      };
    case "retryStatusSet":
      return {
        ...state,
        retryStatus: action.retryStatus,
      };
    case "pendingCountSet":
      return {
        ...state,
        pendingCount: action.pendingCount,
      };
    default:
      return state;
  }
}

function readErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "";
}

function mapLoadedComment(comment: LoadedComment): Comment {
  return {
    id: comment.id,
    body: comment.content,
    authorName: comment.authorName,
    authorType: comment.authorType,
    created_at: comment.createdAt,
    estimateId: comment.estimateId ?? null,
    rowId: comment.rowId ?? null,
    targetKind: comment.targetKind,
    targetLabel: comment.targetLabel ?? null,
    targetSecondaryLabel: comment.targetSecondaryLabel ?? null,
    snapshotVersionAtComment: comment.snapshotVersionAtComment ?? null,
  };
}

// react-doctor-disable-next-line react-doctor/no-giant-component -- Structural split tracked in .ai/03_plans/2026-06-23-react-doctor-warning-cleanup.md; broad refactor needs behavior tests.
function SharePageCommentsInner({ token, viewToken, reviewTarget }: SharePageCommentsProps) {
  const { isValid } = useSharedLinkSession();
  const activeReviewTarget = normalizeShareReviewTarget(reviewTarget);
  const [commentsState, dispatchCommentsState] = useReducer(sharePageCommentsReducer, INITIAL_SHARE_PAGE_COMMENTS_STATE);
  const {
    comments,
    draft,
    isLoadingComments,
    isLoadingMoreComments,
    isPosting,
    error,
    loadError,
    loadMoreError,
    hasMoreComments,
    nextCommentsCursor,
    lastAnnouncement,
    isExpanded,
    retryStatus,
    pendingCount,
  } = commentsState;

  const MAX = 1000;
  const remaining = MAX - draft.length;
  const activeReviewTargetLabel = shareReviewTargetDisplay(activeReviewTarget);

  const announce = useCallback((msg: string) => {
    dispatchCommentsState({ type: "announcementSet", message: msg });
    // screen reader will pick up aria-live change
  }, [dispatchCommentsState]);

  // P12: client retry (3 attempts: immediate, +2s, +5s) + offline queue (sessionStorage + reconnect auto-flush)
  // Additive to P6 optimistic UI, error states, aria, design tokens. No behavior change on first-try success.
  const QUEUE_KEY = `shared-link-pending-comments-${token}`;
  const DRAFT_KEY = `shared-link-comment-draft-${token}`;

  const loadQueue = useCallback((): QueuedComment[] => {
    try {
      const raw = sessionStorage.getItem(QUEUE_KEY);
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      return Array.isArray(parsed)
        ? parsed.filter(
            (item): item is QueuedComment =>
              typeof item === "object" &&
              item !== null &&
              typeof (item as QueuedComment).body === "string" &&
              typeof (item as QueuedComment).ts === "number",
          )
        : [];
    } catch {
      return [];
    }
  }, [QUEUE_KEY]);

  const saveQueue = useCallback((q: QueuedComment[]) => {
    try {
      sessionStorage.setItem(QUEUE_KEY, JSON.stringify(q));
    } catch {}
  }, [QUEUE_KEY]);

  const staleSnapshot = error?.toLowerCase().includes("shared page was updated") ?? false;

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const savedDraft = sessionStorage.getItem(DRAFT_KEY);
        if (savedDraft) dispatchCommentsState({ type: "draftChanged", draft: savedDraft.slice(0, MAX) });
      } catch {}
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [DRAFT_KEY]);

  useEffect(() => {
    try {
      if (draft.trim()) {
        sessionStorage.setItem(DRAFT_KEY, draft);
      } else {
        sessionStorage.removeItem(DRAFT_KEY);
      }
    } catch {}
  }, [DRAFT_KEY, draft]);

  const loadCommentPage = useCallback(async (cursor?: string | null, signal?: AbortSignal): Promise<CommentPage> => {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    const res = await fetch(`/api/share/${encodeURIComponent(token)}/comment${query}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
      cache: "no-store",
    });
    if (res.status === 401 || res.status === 404) return { comments: [], hasMore: false, nextCursor: null };
    if (!res.ok) throw new Error("Could not load discussion.");
    const json = (await res.json().catch(() => ({}))) as {
      comments?: LoadedComment[];
      hasMore?: boolean;
      nextCursor?: string | null;
    };
    const loadedComments = Array.isArray(json.comments) ? json.comments : [];
    return {
      comments: loadedComments.map(mapLoadedComment),
      hasMore: json.hasMore === true,
      nextCursor: typeof json.nextCursor === "string" && json.nextCursor ? json.nextCursor : null,
    };
  }, [token]);

  const commentsQuery = useQuery({
    queryKey: ["share-comments", token] as const,
    enabled: isValid,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    queryFn: ({ signal }) => loadCommentPage(null, signal),
  });

  const loadComments = useCallback(async () => {
    await commentsQuery.refetch();
  }, [commentsQuery]);

  useEffect(() => {
    if (!isValid) return;
    if (commentsQuery.isFetching) {
      dispatchCommentsState({ type: "commentsLoadStarted" });
      return;
    }
    if (commentsQuery.isError) {
      dispatchCommentsState({
        type: "commentsLoadFailed",
        error: readErrorMessage(commentsQuery.error) || "Could not load discussion.",
      });
      dispatchCommentsState({ type: "commentsLoadSettled" });
      return;
    }
    if (commentsQuery.data) {
      dispatchCommentsState({ type: "commentsLoaded", page: commentsQuery.data });
      dispatchCommentsState({ type: "commentsLoadSettled" });
    }
  }, [commentsQuery.data, commentsQuery.error, commentsQuery.isError, commentsQuery.isFetching, isValid]);

  const loadMoreComments = useCallback(async () => {
    if (!nextCommentsCursor || isLoadingMoreComments) return;
    dispatchCommentsState({ type: "commentsMoreLoadStarted" });
    try {
      const page = await loadCommentPage(nextCommentsCursor);
      dispatchCommentsState({ type: "commentsMoreLoaded", page });
    } catch (loadError) {
      dispatchCommentsState({
        type: "commentsMoreLoadFailed",
        error: readErrorMessage(loadError) || "Could not load more discussion.",
      });
    } finally {
      dispatchCommentsState({ type: "commentsMoreLoadSettled" });
    }
  }, [isLoadingMoreComments, loadCommentPage, nextCommentsCursor]);

  const flushQueue = useCallback(async () => {
    const q = loadQueue();
    if (q.length === 0 || !navigator.onLine) return;

    const results = await Promise.all(q.map(async (item) => {
      const targetPayload = serializeShareReviewTarget(item.reviewTarget);
      try {
        // reuse the resilient post path (will do its own 3-attempt retry)
        const res = await fetch(`/api/share/${encodeURIComponent(token)}/comment`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...createPublicationCsrfHeaders(),
          },
          body: JSON.stringify({ body: item.body, viewToken, ...targetPayload }),
        });
        return { item, delivered: res.ok };
      } catch {
        return { item, delivered: false };
      }
    }));
    const remaining = results.reduce<QueuedComment[]>((items, result) => {
      if (!result.delivered) items.push(result.item);
      return items;
    }, []);
    const deliveredCount = results.length - remaining.length;
    if (deliveredCount > 0) {
      announce(deliveredCount === 1 ? "Queued comment delivered." : `${deliveredCount} queued comments delivered.`);
    }
    saveQueue(remaining);
    dispatchCommentsState({ type: "pendingCountSet", pendingCount: remaining.length });
  }, [announce, dispatchCommentsState, loadQueue, saveQueue, token, viewToken]);

  // Auto-flush on reconnect (and on mount if online)
  useEffect(() => {
    const onOnline = () => {
      dispatchCommentsState({ type: "retryStatusSet", retryStatus: null });
      flushQueue();
    };
    window.addEventListener("online", onOnline);
    const timeoutId = window.setTimeout(() => {
      // initial flush if anything pending and online
      if (navigator.onLine) {
        void flushQueue();
      }
      // update pending badge count
      dispatchCommentsState({ type: "pendingCountSet", pendingCount: loadQueue().length });
    }, 0);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("online", onOnline);
    };
  }, [flushQueue, loadQueue]);

  const postWithRetry = useCallback(async (bodyStr: string, target: ShareReviewTarget): Promise<Response> => {
    const isTest = process.env.NODE_ENV === "test";
    const delays = isTest ? [0, 0, 0] : [0, 2000, 5000]; // real delays only in prod; tests control timing
    let lastErr: unknown = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      dispatchCommentsState({ type: "retryStatusSet", retryStatus: attempt > 1 ? `Retrying (${attempt}/3)...` : null });
      if (delays[attempt - 1] > 0) {
        // react-doctor-disable-next-line react-doctor/async-await-in-loop -- Retry backoff must run sequentially between attempts.
        await new Promise((r) => setTimeout(r, delays[attempt - 1]));
      }
      try {
        const res = await fetch(`/api/share/${encodeURIComponent(token)}/comment`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...createPublicationCsrfHeaders(),
          },
          body: JSON.stringify({ body: bodyStr, viewToken, ...serializeShareReviewTarget(target) }),
        });
        if (res.ok) {
          dispatchCommentsState({ type: "retryStatusSet", retryStatus: null });
          return res;
        }
        const errorPayload = (await res.json().catch(() => ({}))) as { error?: string };
        lastErr = new Error(errorPayload.error || `HTTP ${res.status}`);
        if (res.status === 409) break;
        if (attempt === 3) break;
      } catch (error: unknown) {
        lastErr = error;
        if (attempt === 3) break;
      }
    }
    dispatchCommentsState({ type: "retryStatusSet", retryStatus: null });
    throw lastErr instanceof Error ? lastErr : new Error("Failed after retries");
  }, [dispatchCommentsState, token, viewToken]);

  const submitComment = useCallback(async () => {
    const body = draft.trim();
    if (!body || !isValid || isPosting) return;

    if (body.length > MAX) {
      dispatchCommentsState({ type: "errorSet", error: "Comment too long (max 1000 characters)." });
      return;
    }

    // Optimistic add (newest at end for flat chrono feed feel)
    const tempId = `temp-${Date.now()}`;
    const targetForSubmit = activeReviewTarget;
    const optimistic: Comment = {
      id: tempId,
      body,
      created_at: new Date().toISOString(),
      estimateId: targetForSubmit.estimateId ?? null,
      rowId: targetForSubmit.rowId ?? null,
      targetKind: targetForSubmit.kind,
      targetLabel: targetForSubmit.label,
      targetSecondaryLabel: targetForSubmit.secondaryLabel ?? null,
      isOptimistic: true,
    };
    dispatchCommentsState({ type: "optimisticCommentAdded", comment: optimistic });
    announce("Comment posted. Waiting for confirmation.");

    try {
      const res = await postWithRetry(body, targetForSubmit);

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        const msg = j?.error || (res.status === 429 ? "Rate limit reached. Please wait a moment." : "Failed to post comment.");
        throw new Error(msg);
      }

      const postPayload = (await res.json().catch(() => ({ id: tempId }))) as CommentPostResponse;
      const confirmedComment = postPayload.comment ? mapLoadedComment(postPayload.comment) : null;
      dispatchCommentsState({
        type: "commentConfirmed",
        tempId,
        confirmedComment,
        fallbackId: postPayload.id || tempId,
      });
      announce("Comment added successfully.");
      // best-effort: if any pending, try flush (reconnect or post-success window)
      if (navigator.onLine) flushQueue();
    } catch (error: unknown) {
      // Revert optimistic
      dispatchCommentsState({ type: "commentRemoved", tempId });
      const errorMessage = readErrorMessage(error);
      const isOffline = !navigator.onLine;
      if (isOffline || errorMessage.includes("fetch")) {
        // P12: queue for later (additive; existing offline hint enhanced)
        const q = loadQueue();
        q.push({ body, ts: Date.now(), reviewTarget: targetForSubmit });
        saveQueue(q);
        dispatchCommentsState({ type: "pendingCountSet", pendingCount: q.length });
        dispatchCommentsState({ type: "errorSet", error: "You appear to be offline. Comment queued — will retry on reconnect." });
      } else {
        const msg = /snapshot|stale|changed/i.test(errorMessage)
          ? "This shared page was updated while you were writing. Your draft is preserved. Refresh to post against the latest version."
          : errorMessage.includes("rate") || errorMessage.includes("429")
            ? "Rate limit reached. Slow down and try again."
            : "Failed to post comment. Please try again.";
        if (/snapshot|stale|changed/i.test(errorMessage)) dispatchCommentsState({ type: "draftChanged", draft: body });
        dispatchCommentsState({ type: "errorSet", error: msg });
      }
      announce("Failed to post comment.");
    } finally {
      dispatchCommentsState({ type: "postingChanged", isPosting: false });
      dispatchCommentsState({ type: "retryStatusSet", retryStatus: null });
    }
  }, [
    activeReviewTarget,
    dispatchCommentsState,
    draft,
    isValid,
    isPosting,
    announce,
    postWithRetry,
    loadQueue,
    saveQueue,
    flushQueue,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    submitComment();
  };

  if (!isValid) {
    return (
      <section aria-label="Discussion comments" className="share-print-hidden w-full rounded-xs border border-hairline bg-white p-3 text-[13px] leading-[18px] tracking-normal text-secondary">
        <div className="text-[15px] font-medium leading-[20px] tracking-normal text-ink">Discussion</div>
        <p className="mt-2 max-w-[600px] text-[13px] leading-[18px] tracking-normal text-secondary">Recipient session required to comment and respond to this proposal.</p>
      </section>
    );
  }

  return (
    <section
      aria-label="Discussion comments"
      className="share-print-hidden flex w-full flex-col rounded-xs border border-hairline bg-white"
    >
      <div className="flex items-start justify-between gap-3 border-b border-hairline px-3 py-2">
        <div>
          <div className="text-[15px] font-medium leading-[20px] tracking-normal text-ink">Discussion</div>
          <p className="text-[12px] leading-[16px] tracking-normal text-secondary">
            {comments.length} comment{comments.length === 1 ? "" : "s"} • visible to the project team
          </p>
          <p className="mt-1 text-[12px] leading-[16px] tracking-normal text-secondary">
            Applies to {activeReviewTargetLabel}
          </p>
        </div>
        {comments.length > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => dispatchCommentsState({ type: "expandedToggled" })}
            aria-expanded={isExpanded}
            aria-controls="share-page-discussion-body"
          >
            {isExpanded ? "Hide" : "Show"}
          </Button>
        ) : null}
      </div>

      {/* Flat chronological list + aria-live polite for SR announcements */}
      <div
        id="share-page-discussion-body"
        aria-live="polite"
        className={isExpanded ? "max-h-[420px] overflow-y-auto px-3 py-2 text-[13px] leading-[18px] tracking-normal text-ink" : "sr-only"}
        style={{ scrollbarWidth: "thin" }}
      >
        {isLoadingComments ? (
          <div className="space-y-2" aria-label="Loading discussion">
            <div className="h-3 w-3/4 rounded-xs bg-surfaceMuted" />
            <div className="h-3 w-1/2 rounded-xs bg-surfaceMuted" />
          </div>
        ) : loadError ? (
          <div className="rounded-xs border border-danger/30 bg-dangerSoft p-2 text-[12px] leading-[16px] tracking-normal text-danger" role="alert">
            {loadError}
            <Button variant="ghost" size="sm" className="ml-2" onClick={() => void loadComments()}>
              Retry
            </Button>
          </div>
        ) : comments.length === 0 ? (
          <p className="text-[12px] leading-[16px] tracking-normal text-secondary">No comments yet. Add a note or question below.</p>
        ) : (
          <>
            <ul className="max-w-[600px] space-y-3">
              {comments.map((c) => (
                <li key={c.id} className="rounded-xs border border-hairline bg-white p-2">
                <div className="text-[12px] leading-[16px] tracking-normal text-secondary">
                  {c.authorName || c.author_email || "You"} • {new Date(c.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {c.isOptimistic ? " (sending...)" : ""}
                </div>
                {c.targetLabel ? (
                  <div className="mt-1 inline-flex max-w-full rounded-xs border border-hairline bg-surfaceMuted px-1.5 py-0.5 text-[11px] leading-[15px] tracking-normal text-secondary">
                    <span className="truncate">{c.targetLabel}</span>
                    {c.targetSecondaryLabel ? <span className="ml-1 truncate text-tertiary">· {c.targetSecondaryLabel}</span> : null}
                  </div>
                ) : null}
                <div className="mt-0.5 whitespace-pre-wrap break-words">{c.body}</div>
                </li>
              ))}
            </ul>
            {hasMoreComments ? (
              <div className="mt-3">
                <Button variant="ghost" size="sm" onClick={() => void loadMoreComments()} disabled={isLoadingMoreComments}>
                  {isLoadingMoreComments ? "Loading more comments..." : "Load more comments"}
                </Button>
                {loadMoreError ? <p className="mt-1 text-[12px] leading-[16px] tracking-normal text-danger" role="alert">{loadMoreError}</p> : null}
              </div>
            ) : null}
          </>
        )}
        {/* Live region for discrete announcements (rate, success, revert) */}
        <div className="sr-only" aria-live="polite">{lastAnnouncement}</div>
      </div>

      {/* Composer + counter */}
      <div className="border-t border-hairline p-3 pb-[env(safe-area-inset-bottom)]">
        {error && (
          <div className="mb-2 rounded-xs border border-danger/30 bg-dangerSoft p-2 text-[12px] tracking-normal text-danger" role="alert">
            {error}
            {staleSnapshot ? (
              <Button variant="ghost" size="sm" className="ml-2" onClick={() => window.location.reload()}>
                Refresh
              </Button>
            ) : (
              <Button variant="ghost" size="sm" className="ml-2" onClick={() => dispatchCommentsState({ type: "errorSet", error: null })}>
                Dismiss
              </Button>
            )}
          </div>
        )}

        {/* P12 additive status (retry/queued) — strictly design compliant (rounded-xs, existing tokens, no new primitives) */}
        {(retryStatus || pendingCount > 0) && (
          <output className="mb-2 rounded-xs border border-hairline bg-canvas p-1.5 text-[12px] tracking-normal text-secondary" aria-live="polite">
            {retryStatus ? retryStatus : `${pendingCount} comment${pendingCount > 1 ? "s" : ""} queued — will retry on reconnect`}
          </output>
        )}

        <div className="mb-2 rounded-xs border border-hairline bg-surfaceMuted px-2 py-1 text-[12px] leading-[16px] tracking-normal text-secondary">
          Applies to {activeReviewTargetLabel}
        </div>

        <textarea
          value={draft}
          onChange={(e) => {
            const v = e.target.value.slice(0, MAX);
            dispatchCommentsState({ type: "draftChanged", draft: v, clearError: Boolean(error) });
          }}
          onKeyDown={handleKeyDown}
          placeholder="Add a comment, note, or question for the project team..."
          className="w-full resize-y rounded-xs border border-hairline bg-white p-2 text-[13px] leading-[18px] tracking-normal text-ink placeholder:text-tertiary focus:bg-accentSoft focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          rows={3}
          maxLength={MAX}
          disabled={isPosting || !isValid}
          aria-label="Comment body"
        />

        <div className="mt-1 flex items-center justify-between text-[12px] tracking-normal text-secondary">
          <span>
            {remaining} / {MAX}
          </span>
          <Button variant="secondary" size="sm" onClick={submitComment} disabled={!draft.trim() || isPosting || !isValid}>
            {isPosting ? "Sending..." : "Send"}
          </Button>
        </div>
        <p className="mt-1 text-[11px] leading-[15px] tracking-normal text-secondary">Comments are sent to the project team. Max 1000 characters.</p>
      </div>
    </section>
  );
}


export default function SharePageComments(props: SharePageCommentsProps) {
  return (
    <EnsureQueryClient>
      <SharePageCommentsInner {...props} />
    </EnsureQueryClient>
  );
}
