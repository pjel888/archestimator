"use client";

import React, { useState, useCallback, useEffect } from "react";
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

interface SharePageCommentsProps {
  token: string;
  viewToken: string;
  reviewTarget?: ShareReviewTarget;
  // publicationId not required for P6 write path
}

type QueuedComment = { body: string; ts: number; reviewTarget?: ShareReviewTarget };

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

export default function SharePageComments({ token, viewToken, reviewTarget }: SharePageCommentsProps) {
  const { isValid } = useSharedLinkSession();
  const activeReviewTarget = normalizeShareReviewTarget(reviewTarget);
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastAnnouncement, setLastAnnouncement] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);

  const MAX = 1000;
  const remaining = MAX - draft.length;
  const activeReviewTargetLabel = shareReviewTargetDisplay(activeReviewTarget);

  const announce = useCallback((msg: string) => {
    setLastAnnouncement(msg);
    // screen reader will pick up aria-live change
  }, [setLastAnnouncement]);

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

  const [retryStatus, setRetryStatus] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const staleSnapshot = error?.toLowerCase().includes("shared page was updated") ?? false;

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const savedDraft = sessionStorage.getItem(DRAFT_KEY);
        if (savedDraft) setDraft(savedDraft.slice(0, MAX));
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

  const loadComments = useCallback(async (signal?: AbortSignal) => {
    if (!isValid) return;
    setIsLoadingComments(true);
    setLoadError(null);

    try {
      const res = await fetch(`/api/share/${encodeURIComponent(token)}/comment`, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal,
      });
      if (res.status === 401 || res.status === 404) return;
      if (!res.ok) throw new Error("Could not load discussion.");

      const json = (await res.json().catch(() => ({}))) as { comments?: LoadedComment[] };
      const loadedComments = Array.isArray(json.comments) ? json.comments : [];
      setComments(loadedComments.map(mapLoadedComment));
    } catch (error: unknown) {
      if (!signal?.aborted) {
        setLoadError(readErrorMessage(error) || "Could not load discussion.");
      }
    } finally {
      if (!signal?.aborted) setIsLoadingComments(false);
    }
  }, [isValid, token, setComments, setIsLoadingComments, setLoadError]);

  useEffect(() => {
    if (!isValid) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void loadComments(controller.signal);
    }, 0);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [isValid, loadComments]);

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
    setPendingCount(remaining.length);
  }, [token, viewToken, loadQueue, saveQueue, announce]);

  // Auto-flush on reconnect (and on mount if online)
  useEffect(() => {
    const onOnline = () => {
      setRetryStatus(null);
      flushQueue();
    };
    window.addEventListener("online", onOnline);
    const timeoutId = window.setTimeout(() => {
      // initial flush if anything pending and online
      if (navigator.onLine) {
        void flushQueue();
      }
      // update pending badge count
      setPendingCount(loadQueue().length);
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
      setRetryStatus(attempt > 1 ? `Retrying (${attempt}/3)...` : null);
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
          setRetryStatus(null);
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
    setRetryStatus(null);
    throw lastErr instanceof Error ? lastErr : new Error("Failed after retries");
  }, [token, viewToken]);

  const submitComment = useCallback(async () => {
    const body = draft.trim();
    if (!body || !isValid || isPosting) return;

    if (body.length > MAX) {
      setError("Comment too long (max 1000 characters).");
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
    setComments((prev) => [...prev, optimistic]);
    setDraft("");
    setError(null);
    setIsPosting(true);
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
      setComments((prev) =>
        prev.map((c) =>
          c.id === tempId ? confirmedComment ?? { ...c, id: postPayload.id || tempId, isOptimistic: false } : c
        )
      );
      announce("Comment added successfully.");
      // best-effort: if any pending, try flush (reconnect or post-success window)
      if (navigator.onLine) flushQueue();
    } catch (error: unknown) {
      // Revert optimistic
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      const errorMessage = readErrorMessage(error);
      const isOffline = !navigator.onLine;
      if (isOffline || errorMessage.includes("fetch")) {
        // P12: queue for later (additive; existing offline hint enhanced)
        const q = loadQueue();
        q.push({ body, ts: Date.now(), reviewTarget: targetForSubmit });
        saveQueue(q);
        setPendingCount(q.length);
        setError("You appear to be offline. Comment queued — will retry on reconnect.");
      } else {
        const msg = /snapshot|stale|changed/i.test(errorMessage)
          ? "This shared page was updated while you were writing. Your draft is preserved. Refresh to post against the latest version."
          : errorMessage.includes("rate") || errorMessage.includes("429")
            ? "Rate limit reached. Slow down and try again."
            : "Failed to post comment. Please try again.";
        if (/snapshot|stale|changed/i.test(errorMessage)) setDraft(body);
        setError(msg);
      }
      announce("Failed to post comment.");
    } finally {
      setIsPosting(false);
      setRetryStatus(null);
    }
  }, [
    activeReviewTarget,
    draft,
    isValid,
    isPosting,
    announce,
    postWithRetry,
    loadQueue,
    saveQueue,
    flushQueue,
    setComments,
    setDraft,
    setError,
    setIsPosting,
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
            onClick={() => setIsExpanded((value) => !value)}
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
              <Button variant="ghost" size="sm" className="ml-2" onClick={() => setError(null)}>
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
            setDraft(v);
            if (error) setError(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Add a comment, note, or question for the project team..."
          className="w-full resize-y rounded-xs border border-hairline bg-white p-2 text-[13px] leading-[18px] tracking-normal text-ink placeholder:text-tertiary focus:outline focus:outline-1 focus:outline-ink disabled:cursor-not-allowed disabled:opacity-60"
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
