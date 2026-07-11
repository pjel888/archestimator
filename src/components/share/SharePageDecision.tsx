"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
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
import {
  SharePageDecisionConfirmDialog,
  type ShareDecisionType as DecisionType,
} from "@/components/share/SharePageDecisionConfirmDialog";

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

type DecisionUiState = {
  submittedDecision: DecisionState | null;
  pendingDecision: DecisionType | null;
  noteDraft: string;
  signerNameDraft: string;
  isSubmitting: boolean;
  error: string | null;
  lastAnnouncement: string;
};

type DecisionUiAction =
  | { type: "openConfirm"; decision: DecisionType }
  | { type: "closeConfirm" }
  | { type: "noteDraftChanged"; value: string }
  | { type: "signerNameDraftChanged"; value: string }
  | { type: "submitStarted" }
  | { type: "submitFinished" }
  | { type: "setError"; message: string | null }
  | { type: "announce"; message: string }
  | { type: "persistedDecisionLoaded"; decision: DecisionState };

const initialDecisionUiState: DecisionUiState = {
  submittedDecision: null,
  pendingDecision: null,
  noteDraft: "",
  signerNameDraft: "",
  isSubmitting: false,
  error: null,
  lastAnnouncement: "",
};

function decisionUiReducer(state: DecisionUiState, action: DecisionUiAction): DecisionUiState {
  switch (action.type) {
    case "openConfirm":
      return {
        ...state,
        pendingDecision: action.decision,
        noteDraft: "",
        signerNameDraft: "",
        error: null,
      };
    case "closeConfirm":
      return {
        ...state,
        pendingDecision: null,
        noteDraft: "",
        signerNameDraft: "",
      };
    case "noteDraftChanged":
      return { ...state, noteDraft: action.value };
    case "signerNameDraftChanged":
      return { ...state, signerNameDraft: action.value };
    case "submitStarted":
      return { ...state, isSubmitting: true, error: null };
    case "submitFinished":
      return { ...state, isSubmitting: false };
    case "setError":
      return { ...state, error: action.message };
    case "announce":
      return { ...state, lastAnnouncement: action.message };
    case "persistedDecisionLoaded":
      return { ...state, submittedDecision: action.decision };
    default:
      return state;
  }
}

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

async function fetchPersistedDecision(token: string, signal?: AbortSignal) {
  const res = await fetch(`/api/share/${encodeURIComponent(token)}/decision`, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  });
  if (res.status === 401 || res.status === 404) return null;
  if (!res.ok) throw new Error("Could not load your response.");

  const json = (await res.json().catch(() => ({}))) as DecisionGetResponse;
  return normalizeDecision(json.decision ?? null);
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
  const queryClient = useQueryClient();
  const activeReviewTarget = normalizeShareReviewTarget(reviewTarget);
  const activeReviewTargetLabel = shareReviewTargetDisplay(activeReviewTarget);
  const decisionQueryKey = useMemo(() => ["share-decision", token] as const, [token]);
  const [decisionUiState, dispatchDecisionUi] = useReducer(decisionUiReducer, initialDecisionUiState);
  const { submittedDecision, pendingDecision, noteDraft, signerNameDraft, isSubmitting, error, lastAnnouncement } =
    decisionUiState;
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const {
    data: persistedDecision,
    error: persistedDecisionError,
    isFetching: isPersistedDecisionFetching,
  } = useQuery({
    queryKey: decisionQueryKey,
    queryFn: ({ signal }) => fetchPersistedDecision(token, signal),
    enabled: isValid,
    retry: false,
  });
  const decided = submittedDecision ?? persistedDecision ?? null;
  const isLoadingDecision = isPersistedDecisionFetching && !decided;
  const loadDecisionError = persistedDecisionError
    ? readErrorMessage(persistedDecisionError, "Could not load your response.")
    : null;
  const announcement = lastAnnouncement || (persistedDecision ? `Previous response loaded: ${decisionLabel(persistedDecision.decision)}.` : "");

  const announce = useCallback((msg: string) => {
    dispatchDecisionUi({ type: "announce", message: msg });
  }, []);

  const refetchPersistedDecision = useCallback(async () => {
    const loadedDecision = await queryClient.fetchQuery({
      queryKey: decisionQueryKey,
      queryFn: ({ signal }) => fetchPersistedDecision(token, signal),
      staleTime: 0,
    });
    if (!loadedDecision) return false;

    dispatchDecisionUi({ type: "persistedDecisionLoaded", decision: loadedDecision });
    announce("Decision already recorded on this link.");
    return true;
  }, [announce, decisionQueryKey, queryClient, token]);

  const closeConfirm = useCallback(() => {
    dispatchDecisionUi({ type: "closeConfirm" });
    window.setTimeout(() => previouslyFocusedRef.current?.focus(), 0);
  }, []);

  const openConfirm = useCallback((decision: DecisionType) => {
    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dispatchDecisionUi({ type: "openConfirm", decision });
  }, []);

  useEffect(() => {
    const handleRequestedDecision = (event: Event) => {
      if (!isValid) return;
      const decision = (event as CustomEvent<DecisionType>).detail;
      if (decision === "accepted" || decision === "declined" || decision === "revision_requested") {
        openConfirm(decision);
      }
    };
    window.addEventListener("share:request-decision", handleRequestedDecision);
    return () => window.removeEventListener("share:request-decision", handleRequestedDecision);
  }, [isValid, openConfirm]);

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

  const confirmDecision = async () => {
    if (!pendingDecision || isSubmitting) return;
    const signerName = signerNameDraft.trim();
    if ((pendingDecision === "accepted" || pendingDecision === "declined") && !signerName) {
      dispatchDecisionUi({ type: "setError", message: "Your name is required to record this response." });
      return;
    }

    dispatchDecisionUi({ type: "submitStarted" });

    const payload = {
      decision: pendingDecision,
      note: noteDraft.trim() || null,
      signerName: pendingDecision === "accepted" || pendingDecision === "declined" ? signerName : null,
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
        dispatchDecisionUi({
          type: "setError",
          message: "This shared page was updated while you were deciding. Your draft is preserved. Refresh to review the latest version.",
        });
        return;
      }

      if (res.status === 409 || /already submitted/i.test(json?.error || "")) {
        const loadedDecision = await refetchPersistedDecision();
        if (!loadedDecision) {
          dispatchDecisionUi({ type: "setError", message: "Decision already recorded. Reload to view the saved response." });
        }
        closeConfirm();
        return;
      }

      if (!res.ok) {
        const msg = json?.error || (res.status === 401 ? "Session expired. Reload the link." : "Failed to record decision.");
        throw new Error(msg);
      }

      dispatchDecisionUi({
        type: "persistedDecisionLoaded",
        decision: {
          decision: pendingDecision,
          note: payload.note || undefined,
          submittedAt: new Date().toISOString(),
          signerName: payload.signerName,
          ...targetState,
        },
      });
      announce(`Decision recorded: ${decisionLabel(pendingDecision)}.`);
      closeConfirm();
    } catch (error: unknown) {
      const msg = readErrorMessage(error, "Failed to submit decision. Please try again.");
      dispatchDecisionUi({ type: "setError", message: msg });
    } finally {
      dispatchDecisionUi({ type: "submitFinished" });
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
        {(error || loadDecisionError) && <div role="alert" className="mt-1 text-[12px] leading-[16px] tracking-normal text-danger">{error ?? loadDecisionError}</div>}
        <div aria-live="polite" className="sr-only">{announcement}</div>
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

      {(error || loadDecisionError) && <p role="alert" className="mt-2 text-[12px] leading-[16px] tracking-normal text-danger">{error ?? loadDecisionError}</p>}

      {pendingDecision && (
        <SharePageDecisionConfirmDialog
          decision={pendingDecision}
          activeReviewTargetLabel={activeReviewTargetLabel}
          noteDraft={noteDraft}
          signerNameDraft={signerNameDraft}
          isSubmitting={isSubmitting}
          error={error}
          announcement={announcement}
          onClose={closeConfirm}
          onConfirm={confirmDecision}
          onNoteDraftChange={(value) => dispatchDecisionUi({ type: "noteDraftChanged", value })}
          onSignerNameDraftChange={(value) => dispatchDecisionUi({ type: "signerNameDraftChanged", value })}
        />
      )}
    </section>
  );
}
