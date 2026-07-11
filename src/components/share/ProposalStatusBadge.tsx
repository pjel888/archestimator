"use client";

import { useEffect, useState } from "react";

import { useSharedLinkSession } from "@/hooks/use-shared-link-session";

type ProposalStatusBadgeProps = {
  token?: string;
};

type ProposalDecision = "accepted" | "declined" | "revision_requested";

function statusLabel(decision: ProposalDecision | null) {
  if (decision === "accepted") return "Approved";
  if (decision === "declined") return "Declined";
  if (decision === "revision_requested") return "Changes requested";
  return "Pending review";
}

export function ProposalStatusBadge({ token }: ProposalStatusBadgeProps) {
  const { isValid } = useSharedLinkSession();
  const [decision, setDecision] = useState<ProposalDecision | null>(null);

  useEffect(() => {
    if (!token || !isValid) return;
    let active = true;
    fetch(`/api/share/${encodeURIComponent(token)}/decision`, { headers: { Accept: "application/json" } })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((payload: { decision?: { type?: ProposalDecision; decision?: ProposalDecision } | null } | null) => {
        const nextDecision = payload?.decision?.type ?? payload?.decision?.decision ?? null;
        if (active && (nextDecision === "accepted" || nextDecision === "declined" || nextDecision === "revision_requested")) {
          setDecision(nextDecision);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [isValid, token]);

  return (
    <div role="status" className="shrink-0 rounded-xs border border-hairline bg-surfaceMuted px-2 py-1 text-[12px] font-medium leading-[16px] tracking-normal text-tertiary">
      {statusLabel(decision)}
    </div>
  );
}
