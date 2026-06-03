"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSharedLinkSession } from "@/hooks/use-shared-link-session";
import { Button } from "@/components/ui/button";
import { createPublicationCsrfHeaders } from "@/lib/publication/client-csrf";

type DecisionType = "accepted" | "declined" | "revision_requested";

interface SharePageDecisionProps {
  token: string;
}

interface DecisionState {
  decision: DecisionType;
  note?: string;
  submittedAt?: string;
}

type DecisionGetResponse = {
  decision?:
    | null
    | {
        type?: DecisionType;
        decision?: DecisionType;
        note?: string | null;
        submittedAt?: string;
        createdAt?: string;
      };
};

function readErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function decisionLabel(decision: DecisionType) {
  if (decision === "accepted") return "Accepted";
  if (decision === "declined") return "Declined";
  return "Revision requested";
}

function confirmTitle(decision: DecisionType) {
  if (decision === "accepted") return "Accept this proposal?";
  if (decision === "declined") return "Decline this proposal?";
  return "Request a revision?";
}

function confirmBody(decision: DecisionType) {
  if (decision === "accepted") return "Your decision will be final. You can still add comments afterward.";
  if (decision === "declined") return "Your decision will be final. You can still add comments afterward.";
  return "Send your requested changes to the project team. Your response will be final, and comments remain available afterward.";
}

function normalizeDecision(payload: DecisionGetResponse["decision"]): DecisionState | null {
  if (!payload) return null;
  const decision = payload.type ?? payload.decision;
  if (decision !== "accepted" && decision !== "declined" && decision !== "revision_requested") return null;
  return {
    decision,
    note: payload.note?.trim() || undefined,
    submittedAt: payload.submittedAt ?? payload.createdAt,
  };
}

export default function SharePageDecision({ token }: SharePageDecisionProps) {
  const { isValid } = useSharedLinkSession();
  const [decided, setDecided] = useState<DecisionState | null>(null);
  const [pendingDecision, setPendingDecision] = useState<DecisionType | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [isLoadingDecision, setIsLoadingDecision] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAnnouncement, setLastAnnouncement] = useState("");
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  const announce = useCallback((msg: string) => {
    setLastAnnouncement(msg);
  }, []);

  useEffect(() => {
    if (!isValid) return;

    const controller = new AbortController();
    async function loadDecision() {
      setIsLoadingDecision(true);
      setError(null);

      try {
        const res = await fetch(`/api/share/${encodeURIComponent(token)}/decision`, {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        if (res.status === 401 || res.status === 404) return;
        if (!res.ok) throw new Error("Could not load your response.");
        const json = (await res.json().catch(() => ({}))) as DecisionGetResponse;
        const loadedDecision = normalizeDecision(json.decision ?? null);
        if (loadedDecision) {
          setDecided(loadedDecision);
          announce(`Previous response loaded: ${decisionLabel(loadedDecision.decision)}.`);
        }
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          setError(readErrorMessage(error, "Could not load your response."));
        }
      } finally {
        if (!controller.signal.aborted) setIsLoadingDecision(false);
      }
    }

    const timeout = window.setTimeout(() => {
      void loadDecision();
    }, 0);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [announce, isValid, token]);

  const closeConfirm = useCallback(() => {
    setPendingDecision(null);
    setNoteDraft("");
    window.setTimeout(() => previouslyFocusedRef.current?.focus(), 0);
  }, []);

  if (!isValid) {
    return null;
  }

  const openConfirm = (decision: DecisionType) => {
    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setPendingDecision(decision);
    setNoteDraft("");
    setError(null);
    window.setTimeout(() => {
      const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
        "textarea, button, [href], input, select, [tabindex]:not([tabindex='-1'])",
      );
      firstFocusable?.focus();
    }, 0);
  };

  const confirmDecision = async () => {
    if (!pendingDecision || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    const payload = {
      decision: pendingDecision,
      note: noteDraft.trim() || null,
    };

    try {
      const res = await fetch(`/api/share/${encodeURIComponent(token)}/decision`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...createPublicationCsrfHeaders(),
        },
        body: JSON.stringify(payload),
      });

      const json = (await res.json().catch(() => ({}))) as { error?: string };

      if (res.status === 409 || /already submitted/i.test(json?.error || "")) {
        setDecided({ decision: pendingDecision, note: payload.note || undefined });
        announce("Decision already recorded on this link.");
        closeConfirm();
        return;
      }

      if (!res.ok) {
        const msg = json?.error || (res.status === 401 ? "Session expired. Reload the link." : "Failed to record decision.");
        throw new Error(msg);
      }

      setDecided({ decision: pendingDecision, note: payload.note || undefined, submittedAt: new Date().toISOString() });
      announce(`Decision recorded: ${decisionLabel(pendingDecision)}.`);
      closeConfirm();
    } catch (error: unknown) {
      const msg = readErrorMessage(error, "Failed to submit decision. Please try again.");
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeConfirm();
      return;
    }

    if (event.key !== "Tab") return;
    const focusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        "button:not([disabled]), textarea:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])",
      ) ?? [],
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  if (decided) {
    return (
      <section
        data-share-decision-bar="true"
        data-testid="decision-locked-badge"
        className="share-print-hidden w-full rounded-xs border border-hairline bg-[#FFFDF8] p-3 text-[10px] leading-4 text-ink"
        role="status"
        aria-live="polite"
      >
        <div className="text-[9px] font-medium uppercase leading-3 tracking-normal text-tertiary">Your response</div>
        <div className="mt-1 text-[12px] font-medium leading-4 text-ink">{decisionLabel(decided.decision)}</div>
        {decided.note && <div className="mt-1 text-[10px] leading-4 text-secondary">Note: {decided.note}</div>}
        <div className="mt-2 text-[9px] leading-3 text-tertiary">Decision recorded. You can still add comments below.</div>
        {error && <div className="mt-1 text-[9px] leading-3 text-danger">{error}</div>}
        <div aria-live="polite" className="sr-only">{lastAnnouncement}</div>
      </section>
    );
  }

  return (
    <section
      role="group"
      aria-label="Your response"
      data-share-decision-bar="true"
      className="share-print-hidden w-full rounded-xs border border-hairline bg-[#FFFDF8] p-3 text-ink pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[9px] font-medium uppercase leading-3 tracking-normal text-tertiary">Your response</div>
          <p className="mt-1 text-[10px] leading-4 text-secondary">
            {isLoadingDecision ? "Checking for an existing response..." : "Choose a response when you are ready."}
          </p>
        </div>
        <div className="grid gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <Button
            variant="primary"
            size="sm"
            onClick={() => openConfirm("accepted")}
            disabled={isSubmitting || isLoadingDecision}
            aria-label="Accept proposal"
            className="min-h-11 sm:min-h-8"
          >
            Accept
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => openConfirm("declined")}
            disabled={isSubmitting || isLoadingDecision}
            aria-label="Decline proposal"
            className="min-h-11 sm:min-h-8"
          >
            Decline
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => openConfirm("revision_requested")}
            disabled={isSubmitting || isLoadingDecision}
            aria-label="Request revision"
            className="min-h-11 sm:min-h-8"
          >
            Request Revision
          </Button>
        </div>
      </div>

      {error && <p className="mt-2 text-[9px] leading-3 text-danger">{error}</p>}

      {pendingDecision && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onClick={closeConfirm}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="decision-confirm-title"
            className="w-full max-w-sm rounded-xs border border-hairline bg-[#FFFDF8] p-4 text-[10px] leading-4 text-ink shadow-sm"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={handleDialogKeyDown}
          >
            <h2 id="decision-confirm-title" className="text-[12px] font-medium leading-4 text-ink">
              {confirmTitle(pendingDecision)}
            </h2>
            <p className="mt-2 text-[10px] leading-4 text-secondary">{confirmBody(pendingDecision)}</p>

            <div className="mt-3">
              <label className="block text-[9px] font-medium leading-3 text-tertiary" htmlFor="decision-note">
                Note (optional)
              </label>
              <textarea
                id="decision-note"
                className="mt-1 w-full rounded-xs border border-hairline bg-white p-2 text-[10px] leading-4 text-ink placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-focus"
                rows={3}
                maxLength={2000}
                placeholder={pendingDecision === "revision_requested" ? "Describe the requested changes..." : "Add a note (optional)"}
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                disabled={isSubmitting}
              />
              <div className="mt-0.5 text-right text-[8px] leading-[10px] text-tertiary">{noteDraft.length}/2000</div>
            </div>

            {error && <p className="mt-2 text-[9px] leading-3 text-danger">{error}</p>}

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={closeConfirm} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                variant={pendingDecision === "declined" ? "danger" : "primary"}
                size="sm"
                onClick={confirmDecision}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Recording..." : "Confirm"}
              </Button>
            </div>
            <div aria-live="polite" className="sr-only">{lastAnnouncement}</div>
          </div>
        </div>
      )}
    </section>
  );
}
