import { ArrowRight, Copy, LinkBreak, LockKey, WarningCircle } from "@phosphor-icons/react/dist/ssr";

import { StatusBadge } from "@/components/ui/status-badge";
import {
  formatPublisherRecipientCount,
  formatPublisherSheetScope,
  readPublisherStatusCopy,
  type PublisherRosterCopyState,
} from "@/components/workshop/publisher/PublisherRosterRow";
import type { ProjectPublicationRosterRow } from "@/lib/publisher/roster-repository";
import { cn } from "@/lib/ui/cn";
import { formatRelativeTime } from "@/lib/util/relative-time";

type PublisherRosterCardProps = {
  copyState: PublisherRosterCopyState;
  onCopyLink: (row: ProjectPublicationRosterRow) => void;
  onSelect: (row: ProjectPublicationRosterRow) => void;
  row: ProjectPublicationRosterRow;
  selected: boolean;
};

export function PublisherRosterCard({ copyState, onCopyLink, onSelect, row, selected }: PublisherRosterCardProps) {
  const status = readPublisherStatusCopy(row);
  const copyUnavailable = !row.clientLinkPath || !row.tokenCopyAvailable;
  const copyLabel = row.linkUnavailableReason
    ? "Link unavailable"
    : copyState === "copied"
      ? "Copied"
      : copyState === "failed"
        ? "Retry copy"
        : "Copy client link";

  return (
    <article
      className={cn(
        "group grid min-h-16 grid-cols-[minmax(0,1fr)_auto] border-b border-b-hairline transition-colors motion-reduce:transition-none",
        selected
          ? "bg-surfaceMuted/75 ring-1 ring-inset ring-brand-orange/40"
          : "bg-white hover:bg-surfaceMuted/45",
      )}
      data-publisher-roster-card={row.projectId}
    >
      <button
        type="button"
        className="min-w-0 px-2.5 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
        aria-current={selected ? "true" : undefined}
        onClick={() => onSelect(row)}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[11px] font-medium leading-4 text-ink">{row.projectName}</span>
            <span className="block truncate text-[9px] leading-3 text-tertiary">
              {[row.projectCode, row.clientName].filter(Boolean).join(" / ") || "No client set"}
            </span>
          </span>
          <StatusBadge status={status.badge} showDot className="min-w-0 shrink-0 px-1.5 py-1 !text-[8px]">{status.label}</StatusBadge>
        </span>
        <span className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] leading-3 text-secondary">
          <span>{formatPublisherSheetScope(row)}</span>
          <span>{formatPublisherRecipientCount(row)}</span>
          {row.status !== "unpublished" ? <span>{row.openCount} opens</span> : null}
          <span className="text-tertiary">{formatRelativeTime(row.latestActivityAt)}</span>
        </span>
        {row.passwordRequired || row.staleSnapshotWarning || row.linkUnavailableReason ? (
          <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[9px] leading-3 text-tertiary">
            {row.passwordRequired ? <span className="inline-flex items-center gap-1"><LockKey size={10} aria-hidden="true" /> Password</span> : null}
            {row.staleSnapshotWarning ? <span className="inline-flex items-center gap-1 text-warning"><WarningCircle size={10} aria-hidden="true" /> Needs update</span> : null}
            {row.linkUnavailableReason ? <span className="inline-flex items-center gap-1 text-danger"><LinkBreak size={10} aria-hidden="true" /> Link unavailable</span> : null}
          </span>
        ) : null}
      </button>

      <div className="flex w-10 flex-col items-center justify-center gap-0.5 pr-1">
        <button
          type="button"
          className={cn(
            "grid size-8 place-items-center rounded-xs text-tertiary transition-colors hover:bg-white hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
            copyState === "copied" && "text-success",
          )}
          aria-label={`${copyLabel} for ${row.projectName}`}
          title={copyLabel}
          disabled={copyUnavailable}
          onClick={() => onCopyLink(row)}
        >
          <Copy size={13} aria-hidden="true" />
        </button>
        <ArrowRight size={11} className={selected ? "text-ink" : "text-tertiary"} aria-hidden="true" />
      </div>
    </article>
  );
}
