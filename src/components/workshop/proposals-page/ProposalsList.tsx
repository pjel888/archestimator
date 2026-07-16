"use client";

import { ProposalRow } from "@/components/workshop/proposals-page/ProposalRow";
import type { OpenRecipientProposalActionState } from "@/lib/publication/actions";
import type { RecipientProposalRow } from "@/lib/repositories/recipient-proposals-repository";

type ProposalsListProps = {
  rows: RecipientProposalRow[];
  hasMore?: boolean;
  onActionError?: (error: Exclude<OpenRecipientProposalActionState, null>["error"]) => void;
};

export function ProposalsList({ rows, hasMore = false, onActionError }: ProposalsListProps) {
  return (
    <div className="overflow-hidden rounded-xs border border-hairline bg-white shadow-xs">
      <div className="flex items-center justify-between gap-3 border-b border-hairline bg-surfaceMuted/60 px-4 py-3">
        <h2 className="text-[11px] font-medium text-ink">Recipient proposals</h2>
        <span className="rounded-xs border border-hairline bg-white px-2 py-1 text-[10px] font-medium text-secondary">
          {rows.length} {rows.length === 1 ? "proposal" : "proposals"}
        </span>
      </div>
      <div>
        {/*
          key includes status so a row whose status flips after a refresh (e.g. published → revoked)
          remounts with a fresh useActionState instead of showing a stale per-row error forever (#6).
        */}
        {rows.map((proposal) => (
          <ProposalRow key={`${proposal.publicationId}:${proposal.status}`} proposal={proposal} onActionError={onActionError} />
        ))}
      </div>
      {hasMore ? (
        <p className="border-t border-hairline px-4 py-2 text-[10px] text-secondary">
          Showing the {rows.length} most recent proposals. Older proposals are not shown.
        </p>
      ) : null}
    </div>
  );
}
