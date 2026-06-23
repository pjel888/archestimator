"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
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

type DecisionType = "accepted" | "declined" | "revision_requested";

interface SharePageDecisionProps {
  token: string;
  viewToken: string;
  reviewTarget?: ShareReviewTarget;
}

interface DecisionState {
  decision: DecisionType;
  note?: string;
  submittedAt?: string;
  estimateId?: string | null;
  rowId?: string | null;
  targetKind?: ShareReviewTargetKind;
  targetLabel?: string | null;
  targetSecondaryLabel?: string | null;
  signerName?: string | null;
}

type DecisionTargetState = Pick<DecisionState, "estimateId" | "rowId" | "targetKind" | "targetLabel" | "targetSecondaryLabel">;
const decisionDateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

type DecisionGetResponse = {
  decision?:
    | null
    | {
        type?: DecisionType;
        decision?: DecisionType;
        note?: string | null;
        submittedAt?: string;
        createdAt?: string;
        estimateId?: string | null;
        rowId?: string | null;
        targetKind?: ShareReviewTargetKind;
        targetLabel?: string | null;
        targetSecondaryLabel?: string | null;
        signerName?: string | null;
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

function formatDecisionDate(value: string | undefined) {
  if (!value) return "the recorded time";
  const time = new Date(value);
  if (Number.isNaN(time.getTime())) return "the recorded time";
  return decisionDateFormatter.format(time);
}

function confirmTitle(decision: DecisionType) {
  if (decision === "accepted") return "Approve this proposal?";
  if (decision === "declined") return "Decline this proposal?";
  return "Request changes?";
}

function confirmBody(decision: DecisionType) {
  if (decision === "accepted") return "We'll notify the project team and keep comments open for follow-up.";
  if (decision === "declined") return "We'll notify the project team. You can still leave comments if context would help.";
  return "Send your requested changes to the project team. Comments remain open for details and follow-up.";
}

function normalizeDecision(payload: DecisionGetResponse["decision"]): DecisionState | null {
  if (!payload) return null;
  const decision = payload.type ?? payload.decision;
  if (decision !== "accepted" && decision !== "declined" && decision !== "revision_requested") return null;
  return {
    decision,
    note: payload.note?.trim() || undefined,
    submittedAt: payload.submittedAt ?? payload.createdAt,
    estimateId: payload.estimateId ?? null,
    rowId: payload.rowId ?? null,
    targetKind: payload.targetKind,
    targetLabel: payload.targetLabel ?? null,
    targetSecondaryLabel: payload.targetSecondaryLabel ?? null,
    signerName: payload.signerName?.trim() || null,
  };
}

function targetStateFromReviewTarget(target: ShareReviewTarget): DecisionTargetState {
  return {
    targetKind: target.kind,
    targetLabel: target.label,
    targetSecondaryLabel: target.secondaryLabel ?? null,
    estimateId: target.estimateId ?? null,
    rowId: target.rowId ?? null,
  };
}

export default function SharePageDecision({ token, viewToken, reviewTarget }: SharePageDecisionProps) {
  const { isValid } = useSharedLinkSession();
  const activeReviewTarget = normalizeShareReviewTarget(reviewTarget);
  const activeReviewTargetLabel = shareReviewTargetDisplay(activeReviewTarget);
  const [decided, setDecided] = useState<DecisionState | null>(null);
  const [pendingDecision, setPendingDecision] = useState<DecisionType | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [signerNameDraft, setSignerNameDraft] = useState("");
  const [isLoadingDecision, setIsLoadingDecision] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAnnouncement, setLastAnnouncement] = useState("");
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  const announce = useCallback((msg: string) => {
    setLastAnnouncement(msg);
  }, []);

  const refetchPersistedDecision = useCallback(async () => {
    const res = await fetch(`/api/share/${encodeURIComponent(token)}/decision`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (res.status === 401 || res.status === 404) return false;
    if (!res.ok) return false;

    const json = (await res.json().catch(() => ({}))) as DecisionGetResponse;
    const loadedDecision = normalizeDecision(json.decision ?? null);
    if (!loadedDecision) return false;

    setDecided(loadedDecision);
    announce("Decision already recorded on this link.");
    return true;
  }, [announce, token]);

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
    setSignerNameDraft("");
    window.setTimeout(() => previouslyFocusedRef.current?.focus(), 0);
  }, []);

  // AC-UX-07: anonymous (no recipient session) visitors must see a clear, friendly
  // read-only explanation of how to respond — never a silently empty decision area.
  // Security-reviewed copy: no bypass implication; directs the visitor to their own link.
  if (!isValid) {
    return (
      <section
        data-share-decision-bar="true"
        data-testid="decision-anonymous-state"
        role="note"
        aria-label="How to respond to this proposal"
        className="share-print-hidden w-full rounded-xs border border-hairline bg-proposalPaper p-3 text-ink"
      >
        <div className="text-[12px] font-medium uppercase leading-[16px] tracking-normal text-secondary">Your response</div>
        <p className="mt-1 max-w-[600px] text-[13px] leading-[18px] tracking-normal text-secondary">
          You are viewing this proposal in read-only mode. To accept, decline, or request a revision — and to join
          the discussion — open the personalized review link sent to your email. Each recipient receives their own
          secure link.
        </p>
      </section>
    );
  }

  const openConfirm = (decision: DecisionType) => {
    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setPendingDecision(decision);
    setNoteDraft("");
    setSignerNameDraft("");
    setError(null);
    window.setTimeout(() => {
      const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
        "input, textarea, button, [href], select, [tabindex]:not([tabindex='-1'])",
      );
      firstFocusable?.focus();
    }, 0);
  };

  const confirmDecision = async () => {
    if (!pendingDecision || isSubmitting) return;
    const signerName = signerNameDraft.trim();
    if (pendingDecision === "accepted" && !signerName) {
      setError("Your name is required to approve this proposal.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload = {
      decision: pendingDecision,
      note: noteDraft.trim() || null,
      signerName: pendingDecision === "accepted" ? signerName : null,
      viewToken,
      ...serializeShareReviewTarget(activeReviewTarget),
    };
    const targetState = targetStateFromReviewTarget(activeReviewTarget);

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

      if (res.status === 409 && /snapshot|stale|changed/i.test(json?.error || "")) {
        setError("This shared page was updated while you were deciding. Your draft is preserved. Refresh to review the latest version.");
        return;
      }

      if (res.status === 409 || /already submitted/i.test(json?.error || "")) {
        const loadedDecision = await refetchPersistedDecision();
        if (!loadedDecision) {
          setError("Decision already recorded. Reload to view the saved response.");
        }
        closeConfirm();
        return;
      }

      if (!res.ok) {
        const msg = json?.error || (res.status === 401 ? "Session expired. Reload the link." : "Failed to record decision.");
        throw new Error(msg);
      }

      setDecided({
        decision: pendingDecision,
        note: payload.note || undefined,
        submittedAt: new Date().toISOString(),
        signerName: payload.signerName,
        ...targetState,
      });
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
    const recordedLine =
      decided.decision === "accepted" && decided.signerName
        ? `Approved by ${decided.signerName} on ${formatDecisionDate(decided.submittedAt)}.`
        : `Decision recorded on ${formatDecisionDate(decided.submittedAt)}.`;
    return (
      <section
        data-share-decision-bar="true"
        data-testid="decision-locked-badge"
        className="share-print-hidden w-full rounded-xs border border-hairline bg-proposalPaper p-3 text-[13px] leading-[18px] tracking-normal text-ink"
        role="status"
        aria-live="polite"
      >
        <div className="text-[12px] font-medium uppercase leading-[16px] tracking-normal text-secondary">Your response</div>
        <div className="mt-1 text-[15px] font-medium leading-[20px] tracking-normal text-ink">{decisionLabel(decided.decision)}</div>
        {decided.targetLabel ? (
          <div className="mt-1 text-[12px] leading-[16px] tracking-normal text-secondary">
            Applies to {decided.targetLabel}
            {decided.targetSecondaryLabel ? ` · ${decided.targetSecondaryLabel}` : ""}
          </div>
        ) : null}
        {decided.note && <div className="mt-1 text-[13px] leading-[18px] tracking-normal text-secondary">Note: {decided.note}</div>}
        <div className="mt-2 text-[12px] leading-[16px] tracking-normal text-secondary">{recordedLine} You can still add comments below.</div>
        {error && <div role="alert" className="mt-1 text-[12px] leading-[16px] tracking-normal text-danger">{error}</div>}
        <div aria-live="polite" className="sr-only">{lastAnnouncement}</div>
      </section>
    );
  }

  return (
    <section
      role="group"
      aria-label="Your response"
      data-share-decision-bar="true"
      className="share-print-hidden w-full rounded-xs border border-hairline bg-proposalPaper p-3 text-ink pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[12px] font-medium uppercase leading-[16px] tracking-normal text-secondary">Your response</div>
          <p className="mt-1 text-[13px] leading-[18px] tracking-normal text-secondary">
            {isLoadingDecision ? "Checking for an existing response..." : "Choose a response when you are ready."}
          </p>
          <p className="mt-1 text-[12px] leading-[16px] tracking-normal text-secondary">
            Applies to {activeReviewTargetLabel}
          </p>
        </div>
        <div className="grid gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <Button
            variant="primary"
            size="sm"
            onClick={() => openConfirm("accepted")}
            disabled={isSubmitting || isLoadingDecision}
            aria-label="Approve proposal"
            className="min-h-11 sm:min-h-8"
          >
            Approve proposal
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => openConfirm("revision_requested")}
            disabled={isSubmitting || isLoadingDecision}
            aria-label="Request changes"
            className="min-h-11 sm:min-h-8"
          >
            Request changes
          </Button>
          <Button
            variant="plain"
            size="sm"
            onClick={() => openConfirm("declined")}
            disabled={isSubmitting || isLoadingDecision}
            aria-label="Decline proposal"
            className="min-h-11 sm:min-h-8"
          >
            Decline
          </Button>
        </div>
      </div>

      {error && <p role="alert" className="mt-2 text-[12px] leading-[16px] tracking-normal text-danger">{error}</p>}

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
            className="w-full max-w-md rounded-xs border border-hairline bg-proposalPaper p-4 text-[13px] leading-[18px] tracking-normal text-ink shadow-sm"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={handleDialogKeyDown}
          >
            <h2 id="decision-confirm-title" className="text-[15px] font-medium leading-[20px] tracking-normal text-ink">
              {confirmTitle(pendingDecision)}
            </h2>
            <p className="mt-2 max-w-[600px] text-[13px] leading-[18px] tracking-normal text-secondary">{confirmBody(pendingDecision)}</p>
            <div className="mt-3 rounded-xs border border-hairline bg-white px-2 py-1 text-[12px] leading-[16px] tracking-normal text-secondary">
              Applies to {activeReviewTargetLabel}
            </div>

            {pendingDecision === "accepted" ? (
              <div className="mt-3">
                <label className="block text-[12px] font-medium leading-[16px] tracking-normal text-secondary" htmlFor="decision-signer-name">
                  Your name
                </label>
                <input
                  id="decision-signer-name"
                  className="mt-1 w-full rounded-xs border border-hairline bg-white p-2 text-[13px] leading-[18px] tracking-normal text-ink placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-focus"
                  maxLength={120}
                  placeholder="Enter your name"
                  value={signerNameDraft}
                  onChange={(event) => setSignerNameDraft(event.target.value)}
                  disabled={isSubmitting}
                  autoComplete="name"
                  required
                />
              </div>
            ) : null}

            <div className="mt-3">
              <label className="block text-[12px] font-medium leading-[16px] tracking-normal text-secondary" htmlFor="decision-note">
                Note (optional)
              </label>
              <textarea
                id="decision-note"
                className="mt-1 w-full rounded-xs border border-hairline bg-white p-2 text-[13px] leading-[18px] tracking-normal text-ink placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-focus"
                rows={3}
                maxLength={2000}
                placeholder={pendingDecision === "revision_requested" ? "Describe the requested changes..." : "Add a note (optional)"}
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                disabled={isSubmitting}
              />
              <div className="mt-0.5 text-right text-[11px] leading-[15px] tracking-normal text-secondary">{noteDraft.length}/2000</div>
            </div>

            {error && <p role="alert" className="mt-2 text-[12px] leading-[16px] tracking-normal text-danger">{error}</p>}

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={closeConfirm} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                variant={pendingDecision === "declined" ? "secondary" : "primary"}
                size="sm"
                onClick={confirmDecision}
                disabled={isSubmitting || (pendingDecision === "accepted" && !signerNameDraft.trim())}
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
