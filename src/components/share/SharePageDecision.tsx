"use client";

import React, { useState, useCallback } from "react";
import { useSharedLinkSession } from "@/hooks/use-shared-link-session";
import { Button } from "@/components/ui/button";

type DecisionType = "accepted" | "declined" | "revision_requested";

interface SharePageDecisionProps {
  token: string;
}

interface DecisionState {
  decision: DecisionType;
  note?: string;
}

export default function SharePageDecision({ token }: SharePageDecisionProps) {
  const { isValid } = useSharedLinkSession();
  const [decided, setDecided] = useState<DecisionState | null>(null);
  const [pendingDecision, setPendingDecision] = useState<DecisionType | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAnnouncement, setLastAnnouncement] = useState("");

  const announce = useCallback((msg: string) => {
    setLastAnnouncement(msg);
  }, []);

  if (!isValid) {
    return null; // Gated by P5 session (view-only/password flows unchanged)
  }

  const openConfirm = (d: DecisionType) => {
    setPendingDecision(d);
    setNoteDraft("");
    setError(null);
  };

  const closeConfirm = () => {
    setPendingDecision(null);
    setNoteDraft("");
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
          // CSRF: mirrors P6 comment pattern (server enforces cookie+header pair via assertSameOriginPublicPost)
          "x-archestimator-csrf": "client-post",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));

      if (res.status === 409 || /already submitted/i.test(json?.error || "")) {
        // Lock on duplicate (idempotent per P3 unique + RPC)
        setDecided({ decision: pendingDecision, note: payload.note || undefined });
        announce("Decision already recorded on this link.");
        closeConfirm();
        return;
      }

      if (!res.ok) {
        const msg = json?.error || (res.status === 401 ? "Session expired. Reload the link." : "Failed to record decision.");
        throw new Error(msg);
      }

      setDecided({ decision: pendingDecision, note: payload.note || undefined });
      announce(`Decision recorded: ${pendingDecision.replace("_", " ")}.`);
      closeConfirm();
    } catch (e: any) {
      const msg = e?.message || "Failed to submit decision. Please try again.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const decisionLabel = (d: DecisionType) =>
    d === "accepted" ? "Accepted" : d === "declined" ? "Declined" : "Revision Requested";

  const confirmTitle = (d: DecisionType) => {
    if (d === "accepted") return "Confirm Acceptance";
    if (d === "declined") return "Confirm Decline";
    return "Confirm Revision Request";
  };

  const confirmBody = (d: DecisionType) => {
    if (d === "accepted") return "You are about to ACCEPT this proposal. This action is final and cannot be changed.";
    if (d === "declined") return "You are about to DECLINE this proposal. This action is final and cannot be changed.";
    return "You are requesting REVISION. The sender will be notified with your note. This locks your response.";
  };

  if (decided) {
    // Read-only badge/lock after decision (post-decision comments remain available via sibling SharePageComments)
    return (
      <div
        data-testid="decision-locked-badge"
        className="w-full rounded-xs border border-hairline bg-[#FFFDF8] p-3 text-[10px] leading-tight text-ink"
        role="status"
        aria-live="polite"
      >
        <div className="font-medium uppercase text-[9px] text-tertiary">Your decision</div>
        <div className="mt-1 text-[12px] font-medium">{decisionLabel(decided.decision)}</div>
        {decided.note && (
          <div className="mt-1 text-[10px] text-secondary">Note: {decided.note}</div>
        )}
        <div className="mt-2 text-[9px] text-tertiary">Decision recorded. Comments remain available.</div>
        {error && <div className="mt-1 text-[9px] text-danger">{error}</div>}
        <div aria-live="polite" className="sr-only">{lastAnnouncement}</div>
      </div>
    );
  }

  // Undecided: 3 action buttons + confirmation modal when pending
  return (
    <div className="w-full">
      <div className="mb-1 text-[9px] font-medium uppercase text-tertiary">Your response</div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={() => openConfirm("accepted")}
          disabled={isSubmitting}
          aria-label="Accept proposal"
        >
          Accept
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={() => openConfirm("declined")}
          disabled={isSubmitting}
          aria-label="Decline proposal"
        >
          Decline
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => openConfirm("revision_requested")}
          disabled={isSubmitting}
          aria-label="Request revision"
        >
          Request Revision
        </Button>
      </div>

      {/* Confirmation modal — self-contained, design-system compliant (≤12px, rounded-xs, proposalPaper) */}
      {pendingDecision && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onClick={closeConfirm}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="decision-confirm-title"
            className="w-full max-w-sm rounded-xs border border-hairline bg-[#FFFDF8] p-4 text-[10px] leading-tight text-ink shadow-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="decision-confirm-title" className="text-[12px] font-medium">
              {confirmTitle(pendingDecision)}
            </h2>
            <p className="mt-2 text-[10px] text-secondary">{confirmBody(pendingDecision)}</p>

            <div className="mt-3">
              <label className="block text-[9px] font-medium text-tertiary" htmlFor="decision-note">
                Note (optional)
              </label>
              <textarea
                id="decision-note"
                className="mt-1 w-full rounded-xs border border-hairline bg-white p-2 text-[10px] leading-tight text-ink placeholder:text-tertiary focus:outline-none focus:ring-1 focus:ring-ink"
                rows={3}
                maxLength={2000}
                placeholder={pendingDecision === "revision_requested" ? "Describe the requested changes..." : "Add context (optional)"}
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                disabled={isSubmitting}
              />
              <div className="mt-0.5 text-right text-[8px] text-tertiary">{noteDraft.length}/2000</div>
            </div>

            {error && <p className="mt-2 text-[9px] text-danger">{error}</p>}

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
    </div>
  );
}
