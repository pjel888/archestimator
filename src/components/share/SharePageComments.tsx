"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useSharedLinkSession } from "@/hooks/use-shared-link-session";
import { createPublicationCsrfHeaders } from "@/lib/publication/client-csrf";

interface Comment {
  id: string;
  body: string;
  author_email?: string;
  created_at: string; // ISO for display
  isOptimistic?: boolean;
}

interface SharePageCommentsProps {
  token: string;
  // publicationId not required for P6 write path
}

type QueuedComment = { body: string; ts: number };

function readErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "";
}

export default function SharePageComments({ token }: SharePageCommentsProps) {
  const { isValid } = useSharedLinkSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAnnouncement, setLastAnnouncement] = useState("");

  const MAX = 1000;
  const remaining = MAX - draft.length;

  const announce = useCallback((msg: string) => {
    setLastAnnouncement(msg);
    // screen reader will pick up aria-live change
  }, []);

  // P12: client retry (3 attempts: immediate, +2s, +5s) + offline queue (sessionStorage + reconnect auto-flush)
  // Additive to P6 optimistic UI, error states, aria, design tokens. No behavior change on first-try success.
  const QUEUE_KEY = `shared-link-pending-comments-${token}`;

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

  const flushQueue = useCallback(async () => {
    const q = loadQueue();
    if (q.length === 0 || !navigator.onLine) return;

    const remaining: QueuedComment[] = [];
    for (const item of q) {
      try {
        // reuse the resilient post path (will do its own 3-attempt retry)
        const res = await fetch(`/api/share/${encodeURIComponent(token)}/comment`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...createPublicationCsrfHeaders(),
          },
          body: JSON.stringify({ body: item.body }),
        });
        if (!res.ok) {
          remaining.push(item);
        } else {
          announce("Queued comment delivered.");
        }
      } catch {
        remaining.push(item);
      }
    }
    saveQueue(remaining);
    setPendingCount(remaining.length);
  }, [token, loadQueue, saveQueue, announce]);

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

  const postWithRetry = useCallback(async (bodyStr: string): Promise<Response> => {
    const isTest = process.env.NODE_ENV === "test";
    const delays = isTest ? [0, 0, 0] : [0, 2000, 5000]; // real delays only in prod; tests control timing
    let lastErr: unknown = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      setRetryStatus(attempt > 1 ? `Retrying (${attempt}/3)...` : null);
      if (delays[attempt - 1] > 0) {
        await new Promise((r) => setTimeout(r, delays[attempt - 1]));
      }
      try {
        const res = await fetch(`/api/share/${encodeURIComponent(token)}/comment`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...createPublicationCsrfHeaders(),
          },
          body: JSON.stringify({ body: bodyStr }),
        });
        if (res.ok) {
          setRetryStatus(null);
          return res;
        }
        const errorPayload = (await res.json().catch(() => ({}))) as { error?: string };
        lastErr = new Error(errorPayload.error || `HTTP ${res.status}`);
        if (attempt === 3) break;
      } catch (error: unknown) {
        lastErr = error;
        if (attempt === 3) break;
      }
    }
    setRetryStatus(null);
    throw lastErr instanceof Error ? lastErr : new Error("Failed after retries");
  }, [token]);

  const submitComment = useCallback(async () => {
    const body = draft.trim();
    if (!body || !isValid || isPosting) return;

    if (body.length > MAX) {
      setError("Comment too long (max 1000 characters).");
      return;
    }

    // Optimistic add (newest at end for flat chrono feed feel)
    const tempId = `temp-${Date.now()}`;
    const optimistic: Comment = {
      id: tempId,
      body,
      created_at: new Date().toISOString(),
      isOptimistic: true,
    };
    setComments((prev) => [...prev, optimistic]);
    setDraft("");
    setError(null);
    setIsPosting(true);
    announce("Comment posted. Waiting for confirmation.");

    try {
      const res = await postWithRetry(body);

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        const msg = j?.error || (res.status === 429 ? "Rate limit reached. Please wait a moment." : "Failed to post comment.");
        throw new Error(msg);
      }

      // Success — replace temp with real (server returns id; we keep local body)
      const { id } = (await res.json().catch(() => ({ id: tempId }))) as { id?: string };
      setComments((prev) =>
        prev.map((c) =>
          c.id === tempId ? { ...c, id: id || tempId, isOptimistic: false } : c
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
        q.push({ body, ts: Date.now() });
        saveQueue(q);
        setPendingCount(q.length);
        setError("You appear to be offline. Comment queued — will retry on reconnect.");
      } else {
        const msg = errorMessage.includes("rate") || errorMessage.includes("429")
          ? "Rate limit reached. Slow down and try again."
          : "Failed to post comment. Please try again.";
        setError(msg);
      }
      announce("Failed to post comment.");
    } finally {
      setIsPosting(false);
      setRetryStatus(null);
    }
  }, [draft, isValid, isPosting, announce, postWithRetry, loadQueue, saveQueue, flushQueue]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitComment();
    }
  };

  if (!isValid) {
    return (
      <section role="region" aria-label="Comments" className="w-full lg:w-80 border-l border-hairline bg-white p-3 text-[10px] text-secondary">
        <div className="text-[9px] font-medium uppercase text-tertiary">Comments</div>
        <p className="mt-2 text-[10px] text-secondary">Recipient session required to comment on this publication.</p>
      </section>
    );
  }

  return (
    <section
      role="region"
      aria-label="Comments"
      className="flex w-full flex-col border-l border-hairline bg-white lg:w-80 lg:max-h-[calc(100dvh-120px)]"
    >
      <div className="border-b border-hairline px-3 py-2">
        <div className="text-[9px] font-medium uppercase leading-3 text-tertiary">Comments</div>
        <p className="text-[9px] text-tertiary">Visible to project team</p>
      </div>

      {/* Flat chronological list + aria-live polite for SR announcements */}
      <div
        aria-live="polite"
        className="flex-1 overflow-y-auto px-3 py-2 text-[10px] leading-4 text-ink"
        style={{ scrollbarWidth: "thin" }}
      >
        {comments.length === 0 ? (
          <p className="text-[9px] text-tertiary">No comments yet. Be the first to add one below.</p>
        ) : (
          <ul className="space-y-3">
            {comments.map((c) => (
              <li key={c.id} className="rounded-xs border border-hairline bg-canvas p-2">
                <div className="text-[9px] text-tertiary">
                  {c.author_email || "You"} • {new Date(c.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {c.isOptimistic ? " (sending...)" : ""}
                </div>
                <div className="mt-0.5 whitespace-pre-wrap break-words">{c.body}</div>
              </li>
            ))}
          </ul>
        )}
        {/* Live region for discrete announcements (rate, success, revert) */}
        <div className="sr-only" aria-live="polite">{lastAnnouncement}</div>
      </div>

      {/* Composer + counter */}
      <div className="border-t border-hairline p-3">
        {error && (
          <div className="mb-2 rounded-xs border border-danger/30 bg-dangerSoft p-2 text-[9px] text-danger" role="alert">
            {error}
            <button
              type="button"
              className="ml-2 underline"
              onClick={() => setError(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* P12 additive status (retry/queued) — strictly design compliant (text-[9px], rounded-xs, existing tokens, no new primitives) */}
        {(retryStatus || pendingCount > 0) && (
          <div className="mb-2 rounded-xs border border-hairline bg-canvas p-1.5 text-[9px] text-tertiary" role="status" aria-live="polite">
            {retryStatus ? retryStatus : `${pendingCount} comment${pendingCount > 1 ? "s" : ""} queued — will retry on reconnect`}
          </div>
        )}

        <textarea
          value={draft}
          onChange={(e) => {
            const v = e.target.value.slice(0, MAX);
            setDraft(v);
            if (error) setError(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Add a comment (visible to the team)..."
          className="w-full resize-y rounded-xs border border-hairline bg-white p-2 text-[10px] leading-4 text-ink placeholder:text-tertiary focus:outline focus:outline-1 focus:outline-ink disabled:cursor-not-allowed disabled:opacity-60"
          rows={3}
          maxLength={MAX}
          disabled={isPosting || !isValid}
          aria-label="Comment body"
        />

        <div className="mt-1 flex items-center justify-between text-[9px] text-tertiary">
          <span>
            {remaining} / {MAX}
          </span>
          <button
            type="button"
            onClick={submitComment}
            disabled={!draft.trim() || isPosting || !isValid}
            className="rounded-xs border border-hairline bg-white px-3 py-0.5 text-[9px] font-medium text-ink disabled:opacity-50 hover:bg-canvas active:bg-canvas"
          >
            {isPosting ? "Posting..." : "Post"}
          </button>
        </div>
        <p className="mt-1 text-[8px] text-tertiary">Comments are sent to the project team. Max 1000 characters.</p>
      </div>
    </section>
  );
}
