"use client";

import { useActionState, useEffect } from "react";
import {
  ArrowSquareOut,
  CheckCircle,
  Clock,
  Eye,
  Hourglass,
  SealWarning,
  XCircle,
} from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";
import {
  openRecipientProposalAction,
  type OpenRecipientProposalActionState,
} from "@/lib/publication/actions";
import type {
  RecipientProposalDecision,
  RecipientProposalRow,
} from "@/lib/repositories/recipient-proposals-repository";

type ProposalRowProps = {
  proposal: RecipientProposalRow;
  onActionError?: (error: Exclude<OpenRecipientProposalActionState, null>["error"]) => void;
};

type ProposalState = {
  label: string;
  tone: "neutral" | "success" | "warning" | "danger";
  Icon: typeof Clock;
};

const decisionLabels: Record<Exclude<RecipientProposalDecision, null>, string> = {
  accepted: "Accepted",
  declined: "Declined",
  revision_requested: "Revision requested",
};

function formatProposalDate(value: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getProposalState(proposal: RecipientProposalRow): ProposalState {
  if (proposal.status === "revoked") return { label: "Revoked", tone: "danger", Icon: XCircle };
  if (proposal.status === "expired") return { label: "Expired", tone: "warning", Icon: Hourglass };
  if (proposal.decision) return { label: "Decision submitted", tone: "success", Icon: CheckCircle };
  if (proposal.hasOpened) return { label: "Opened", tone: "neutral", Icon: Eye };
  return { label: "New", tone: "neutral", Icon: Clock };
}

function getChipClassName(tone: ProposalState["tone"]) {
  if (tone === "success") return "border-success/25 bg-success/10 text-success";
  if (tone === "warning") return "border-warning/25 bg-warning/10 text-warning";
  if (tone === "danger") return "border-dangerSoft bg-dangerSoft text-danger";
  return "border-hairline bg-surfaceMuted text-secondary";
}

function readActionErrorMessage(error: Exclude<OpenRecipientProposalActionState, null>["error"]) {
  if (error === "not-a-recipient") return "This proposal is not assigned to your signed-in email.";
  if (error === "unavailable") return "This proposal is no longer available.";
  if (error === "invalid") return "This proposal could not be opened.";
  return "The proposal could not be opened.";
}

export function ProposalRow({ proposal, onActionError }: ProposalRowProps) {
  const [actionState, formAction, isPending] = useActionState(openRecipientProposalAction, null);
  const proposalState = getProposalState(proposal);
  const StateIcon = proposalState.Icon;
  const disabled = proposal.status !== "published";

  useEffect(() => {
    if (actionState?.error) onActionError?.(actionState.error);
  }, [actionState, onActionError]);

  return (
    <article
      className={cn(
        "grid gap-3 border-b border-hairline bg-white p-4 last:border-b-0 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_auto] md:items-center",
        disabled && "bg-surfaceMuted/45",
      )}
    >
      <div className="min-w-0">
        <div className="mb-2 flex min-w-0 flex-wrap items-center gap-2">
          <span className="truncate text-[9px] font-medium uppercase tracking-normal text-tertiary">
            {proposal.workspaceName}
          </span>
          {proposal.projectCode ? (
            <span className="rounded-xs border border-hairline bg-white px-1.5 py-0.5 text-[9px] font-medium text-secondary">
              {proposal.projectCode}
            </span>
          ) : null}
        </div>
        <h2 className="truncate text-[12px] font-medium text-ink">{proposal.projectName}</h2>
        <div className="mt-2 flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-[10px] leading-4 text-secondary">
          <span>Version {proposal.snapshotVersion}</span>
          <span>
            Sent{" "}
            <time dateTime={proposal.publishedAt ?? undefined}>{formatProposalDate(proposal.publishedAt)}</time>
          </span>
          {proposal.senderDisplayName ? <span>From {proposal.senderDisplayName}</span> : null}
        </div>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex h-6 items-center gap-1.5 rounded-xs border px-2 text-[10px] font-medium leading-none",
            getChipClassName(proposalState.tone),
          )}
        >
          <StateIcon size={13} weight="regular" aria-hidden="true" />
          {proposalState.label}
        </span>
        {proposal.decision ? (
          <span className="inline-flex h-6 items-center gap-1.5 rounded-xs border border-success/25 bg-success/10 px-2 text-[10px] font-medium leading-none text-success">
            <CheckCircle size={13} weight="regular" aria-hidden="true" />
            {decisionLabels[proposal.decision]}
          </span>
        ) : null}
        {proposal.expiresAt ? (
          <span className="inline-flex h-6 items-center gap-1.5 rounded-xs border border-hairline bg-white px-2 text-[10px] font-medium leading-none text-secondary">
            <SealWarning size={13} weight="regular" aria-hidden="true" />
            Expires <time dateTime={proposal.expiresAt}>{formatProposalDate(proposal.expiresAt)}</time>
          </span>
        ) : null}
        <span className="w-full text-[10px] leading-4 text-tertiary">
          Last activity <time dateTime={proposal.lastActivityAt ?? undefined}>{formatProposalDate(proposal.lastActivityAt)}</time>
        </span>
      </div>

      <div className="flex min-w-0 flex-col items-stretch gap-2 md:items-end">
        <form action={formAction}>
          <input type="hidden" name="publicationId" value={proposal.publicationId} />
          <Button type="submit" variant="brand" size="sm" disabled={disabled || isPending} className="w-full md:w-auto">
            <ArrowSquareOut size={13} weight="regular" aria-hidden="true" />
            {disabled ? proposalState.label : isPending ? "Opening" : "Review"}
          </Button>
        </form>
        {actionState?.error ? (
          <p className="max-w-[18rem] text-[10px] leading-4 text-danger" role="alert">
            {readActionErrorMessage(actionState.error)}
          </p>
        ) : null}
      </div>
    </article>
  );
}
