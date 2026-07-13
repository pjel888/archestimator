"use client";

import React, { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

import SharePageComments from "@/components/share/SharePageComments";
import SharePageDecision from "@/components/share/SharePageDecision";
import ShareFinancialOverview from "@/components/share/ShareFinancialOverview";
import SharePageHero from "@/components/share/SharePageHero";
import SharePageOverview from "@/components/share/SharePageOverview";
import SharePageTabs from "@/components/share/SharePageTabs";
import {
  PROPOSAL_REVIEW_TARGET,
  normalizeShareReviewTarget,
  shareReviewTargetDisplay,
  type ShareReviewTarget,
} from "@/components/share/share-review-target";
import type { ProjectPublicationSnapshot, PublicationSnapshotEstimate } from "@/lib/publication/types";
import { Button } from "@/components/ui/button";
import { SharePrintButton } from "@/components/share/SharePrintButton";
import { StickyDecisionBar } from "@/components/share/StickyDecisionBar";

type ShareReviewWorkspaceProps = {
  currencyCode: string;
  estimates: PublicationSnapshotEstimate[];
  expiresAt?: string | null;
  previewMode?: "manager-read-only";
  snapshot: ProjectPublicationSnapshot;
  token: string;
  viewToken: string;
};

type ShareWorkspaceView = "overview" | "estimate" | "financials" | "discussion" | "decision";

const WORKSPACE_VIEWS: Array<{ id: ShareWorkspaceView; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "estimate", label: "Estimate" },
  { id: "financials", label: "Financials" },
  { id: "discussion", label: "Discussion" },
  { id: "decision", label: "Decision" },
];

export default function ShareReviewWorkspace({
  currencyCode,
  estimates,
  expiresAt,
  previewMode,
  snapshot,
  token,
  viewToken,
}: ShareReviewWorkspaceProps) {
  const [reviewTarget, setReviewTarget] = useState<ShareReviewTarget>(PROPOSAL_REVIEW_TARGET);
  const [activeView, setActiveView] = useState<ShareWorkspaceView>("overview");
  const activeViewRef = useRef(activeView);
  const normalizedTarget = normalizeShareReviewTarget(reviewTarget);
  const targetLabel = shareReviewTargetDisplay(normalizedTarget);

  useEffect(() => {
    activeViewRef.current = activeView;
  }, [activeView]);

  useEffect(() => {
    let viewBeforePrint: ShareWorkspaceView = "overview";
    const showEstimateForPrint = () => {
      viewBeforePrint = activeViewRef.current;
      flushSync(() => setActiveView("estimate"));
    };
    const restoreViewAfterPrint = () => setActiveView(viewBeforePrint);
    window.addEventListener("beforeprint", showEstimateForPrint);
    window.addEventListener("afterprint", restoreViewAfterPrint);
    return () => {
      window.removeEventListener("beforeprint", showEstimateForPrint);
      window.removeEventListener("afterprint", restoreViewAfterPrint);
    };
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col pb-20 sm:pb-0" style={{ scrollPaddingBottom: "5rem" }}>
      <div className="share-print-hidden flex items-end justify-between gap-3 border-b border-hairline">
        <div role="tablist" aria-label="Shared estimate views" className="hidden min-w-0 flex-1 sm:flex sm:gap-0">
          {WORKSPACE_VIEWS.map((view) => {
            const isDisabled = Boolean(previewMode) && (view.id === "discussion" || view.id === "decision");
            const isActive = activeView === view.id;
            return (
              <button
                key={view.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`share-workspace-${view.id}`}
                disabled={isDisabled}
                className={`border-b-2 px-3 py-2 text-left text-[11px] font-medium leading-[16px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus sm:min-w-[104px] ${isActive ? "border-accent text-ink" : "border-transparent text-secondary hover:border-hairline hover:text-ink"} disabled:cursor-not-allowed disabled:opacity-45`}
                onClick={() => setActiveView(view.id)}
              >
                {view.label}
              </button>
            );
          })}
        </div>
        <SharePrintButton />
      </div>
      {normalizedTarget.kind !== "proposal" ? (
        <output className="share-print-hidden mt-3 flex flex-col gap-2 border-y border-hairline bg-surfaceMuted/70 px-3 py-2 text-[10px] leading-[14px] text-secondary sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <span className="font-medium text-ink">Reviewing:</span>{" "}
            <span className="break-words">{targetLabel}</span>
            {normalizedTarget.secondaryLabel ? <span className="text-tertiary"> · {normalizedTarget.secondaryLabel}</span> : null}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => setReviewTarget(PROPOSAL_REVIEW_TARGET)}>
            Clear
          </Button>
        </output>
      ) : null}

      <section id="share-workspace-overview" aria-label="Project overview" role="tabpanel" className="mt-3 space-y-4" hidden={activeView !== "overview"}>
        <SharePageHero project={snapshot.project} />
        <SharePageOverview expiresAt={expiresAt} snapshot={snapshot} />
      </section>

      <section id="share-workspace-estimate" aria-label="Estimate line items" role="tabpanel" className="mt-3" hidden={activeView !== "estimate"}>
        <SharePageTabs
          estimates={estimates}
          currencyCode={currencyCode}
          token={token}
          onReviewTargetChange={setReviewTarget}
        />
      </section>

      <div id="share-workspace-financials" role="tabpanel" className="mt-3" hidden={activeView !== "financials"}>
        <ShareFinancialOverview estimates={estimates} currencyCode={currencyCode} />
      </div>

      {previewMode ? null : <><section id="share-workspace-discussion" role="tabpanel" className="mt-3" hidden={activeView !== "discussion"}><SharePageComments token={token} viewToken={viewToken} reviewTarget={normalizedTarget} /></section><section id="share-workspace-decision" role="tabpanel" className="mt-3" hidden={activeView !== "decision"}><div id="share-response"><SharePageDecision token={token} viewToken={viewToken} reviewTarget={normalizedTarget} /></div></section></>}
      {previewMode ? null : <StickyDecisionBar onDecisionRequested={() => setActiveView("decision")} />}

      <nav
        aria-label="Proposal review sections"
        className="share-print-hidden fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-white/95 px-2 py-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] backdrop-blur sm:hidden"
      >
        <div className="mx-auto grid max-w-[620px] grid-cols-5 gap-1 text-[10px] font-medium leading-none tracking-normal">
          {WORKSPACE_VIEWS.map((view) => {
            const isDisabled = Boolean(previewMode) && (view.id === "discussion" || view.id === "decision");
            return <button key={view.id} type="button" disabled={isDisabled} className={`rounded-xs px-1 py-2 text-center ${activeView === view.id ? "bg-surfaceMuted text-ink" : "text-secondary hover:bg-surfaceMuted hover:text-ink"} disabled:opacity-40`} onClick={() => setActiveView(view.id)}>{view.label}</button>;
          })}
        </div>
      </nav>
    </div>
  );
}
