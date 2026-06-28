"use client";

import { ProposalRow } from "@/components/workshop/proposals-page/ProposalRow";
import type { OpenRecipientProposalActionState } from "@/lib/publication/actions";
import type { RecipientProposalRow } from "@/lib/repositories/recipient-proposals-repository";

type ProposalsListProps = {
  rows: RecipientProposalRow[];
  onActionError?: (error: Exclude<OpenRecipientProposalActionState, null>["error"]) => void;
};

export function ProposalsList({ rows, onActionError }: ProposalsListProps) {
  return (
    <div className="overflow-hidden rounded-xs border border-hairline bg-white shadow-xs">
      <div className="flex items-center justify-between gap-3 border-b border-hairline bg-surfaceMuted/60 px-4 py-3">
        <h2 className="text-xs font-medium text-ink">Recipient proposals</h2>
        <span className="rounded-xs border border-hairline bg-white px-2 py-1 text-[10px] font-medium text-secondary">
          {rows.length} {rows.length === 1 ? "proposal" : "proposals"}
        </span>
      </div>
      <div>
        {rows.map((proposal) => (
          <ProposalRow key={proposal.publicationId} proposal={proposal} onActionError={onActionError} />
        ))}
      </div>
    </div>
  );
}
