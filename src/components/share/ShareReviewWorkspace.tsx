"use client";

import React, { useState } from "react";

import SharePageComments from "@/components/share/SharePageComments";
import SharePageDecision from "@/components/share/SharePageDecision";
import SharePageTabs from "@/components/share/SharePageTabs";
import {
  PROPOSAL_REVIEW_TARGET,
  normalizeShareReviewTarget,
  shareReviewTargetDisplay,
  type ShareReviewTarget,
} from "@/components/share/share-review-target";
import type { PublicationSnapshotEstimate } from "@/lib/publication/types";
import { Button } from "@/components/ui/button";

type ShareReviewWorkspaceProps = {
  currencyCode: string;
  estimates: PublicationSnapshotEstimate[];
  token: string;
  viewToken: string;
};

export default function ShareReviewWorkspace({
  currencyCode,
  estimates,
  token,
  viewToken,
}: ShareReviewWorkspaceProps) {
  const [reviewTarget, setReviewTarget] = useState<ShareReviewTarget>(PROPOSAL_REVIEW_TARGET);
  const normalizedTarget = normalizeShareReviewTarget(reviewTarget);
  const targetLabel = shareReviewTargetDisplay(normalizedTarget);

  return (
    <div className="space-y-5 pb-16 sm:pb-0">
      <div
        className="share-print-hidden flex flex-col gap-2 rounded-xs border border-hairline bg-surfaceMuted px-3 py-2 text-[12px] leading-[16px] tracking-normal text-secondary sm:flex-row sm:items-center sm:justify-between"
        role="status"
      >
        <div className="min-w-0">
          <span className="font-medium text-ink">Reviewing:</span>{" "}
          <span className="break-words">{targetLabel}</span>
          {normalizedTarget.secondaryLabel ? <span className="text-tertiary"> · {normalizedTarget.secondaryLabel}</span> : null}
        </div>
        {normalizedTarget.kind !== "proposal" ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => setReviewTarget(PROPOSAL_REVIEW_TARGET)}>
            Clear
          </Button>
        ) : null}
      </div>

      <section id="share-estimates" aria-label="Estimate line items">
        <SharePageTabs
          estimates={estimates}
          currencyCode={currencyCode}
          token={token}
          onReviewTargetChange={setReviewTarget}
        />
      </section>

      <section id="share-discussion">
        <SharePageComments token={token} viewToken={viewToken} reviewTarget={normalizedTarget} />
      </section>

      <section id="share-response">
        <SharePageDecision token={token} viewToken={viewToken} reviewTarget={normalizedTarget} />
      </section>

      <nav
        aria-label="Proposal review sections"
        className="share-print-hidden fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-white/95 px-2 py-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] shadow-sm backdrop-blur sm:hidden"
      >
        <div className="mx-auto grid max-w-[520px] grid-cols-4 gap-1 text-[11px] font-medium leading-none tracking-normal">
          <a className="rounded-xs px-2 py-2 text-center text-secondary hover:bg-surfaceMuted hover:text-ink" href="#share-summary">Summary</a>
          <a className="rounded-xs px-2 py-2 text-center text-secondary hover:bg-surfaceMuted hover:text-ink" href="#share-estimates">Items</a>
          <a className="rounded-xs px-2 py-2 text-center text-secondary hover:bg-surfaceMuted hover:text-ink" href="#share-discussion">Questions</a>
          <a className="rounded-xs px-2 py-2 text-center text-secondary hover:bg-surfaceMuted hover:text-ink" href="#share-response">Respond</a>
        </div>
      </nav>
    </div>
  );
}
