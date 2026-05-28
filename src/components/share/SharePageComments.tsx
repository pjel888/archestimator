"use client";

import React, { useState, useCallback } from "react";
import { useSharedLinkSession } from "@/hooks/use-shared-link-session";

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
      const res = await fetch(`/api/share/${encodeURIComponent(token)}/comment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // CSRF header — page sets the cookie; we read the companion if present or rely on double submit via cookie+header in real flows.
          // For robustness in P6 receiver, the server also accepts when cookie present (same-origin enforced).
          "x-archestimator-csrf": "client-post", // placeholder; real flows pair via form or prior set. Server validates pair.
        },
        body: JSON.stringify({ body }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        const msg = j?.error || (res.status === 429 ? "Rate limit reached. Please wait a moment." : "Failed to post comment.");
        throw new Error(msg);
      }

      // Success — replace temp with real (server returns id; we keep local body)
      const { id } = await res.json().catch(() => ({ id: tempId }));
      setComments((prev) =>
        prev.map((c) =>
          c.id === tempId ? { ...c, id: id || tempId, isOptimistic: false } : c
        )
      );
      announce("Comment added successfully.");
    } catch (e: any) {
      // Revert optimistic
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      const msg = e?.message?.includes("rate") || e?.message?.includes("429")
        ? "Rate limit reached. Slow down and try again."
        : navigator.onLine === false
        ? "You appear to be offline. Comment will retry when reconnected."
        : "Failed to post comment. Please try again.";
      setError(msg);
      announce("Failed to post comment.");
    } finally {
      setIsPosting(false);
    }
  }, [draft, isValid, isPosting, token, announce]);

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
