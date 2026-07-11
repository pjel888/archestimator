import Link from "next/link";
import { Copy, Eye, Gear, LockKey, ShareNetwork, WarningCircle } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  formatPublisherDate,
  formatPublisherRecipientCount,
  formatPublisherSheetScope,
  readPublisherStatusCopy,
} from "@/components/workshop/publisher/PublisherRosterRow";
import type { ProjectPublicationRosterRow } from "@/lib/publisher/roster-repository";
import { formatRelativeTime } from "@/lib/util/relative-time";

type PublisherRosterCardProps = {
  copyLabel: string;
  onCopyLink: (row: ProjectPublicationRosterRow) => void;
  onManagePublication: (row: ProjectPublicationRosterRow, trigger: HTMLButtonElement) => void;
  onSharePublication: (row: ProjectPublicationRosterRow, trigger: HTMLButtonElement) => void;
  row: ProjectPublicationRosterRow;
};

export function PublisherRosterCard({ copyLabel, onCopyLink, onManagePublication, onSharePublication, row }: PublisherRosterCardProps) {
  const status = readPublisherStatusCopy(row);
  const expiresDate = formatPublisherDate(row.expiresAt);
  const copyUnavailable = !row.clientLinkPath || !row.tokenCopyAvailable;
  const previewHref = `/workshop/publisher/preview/${encodeURIComponent(row.projectId)}`;

  return (
    <article className="flex min-h-full flex-col rounded-xs border border-hairline bg-surface/75 p-3 transition-colors hover:bg-surface motion-reduce:transition-none" data-publisher-roster-card={row.projectId}>
      <div className="flex items-start justify-between gap-3 border-b border-hairline pb-2.5">
        <div className="min-w-0">
          <h2 className="truncate text-[12px] font-medium leading-4 text-ink">{row.projectName}</h2>
          <p className="truncate text-[10px] leading-4 text-secondary">{[row.projectCode, row.clientName].filter(Boolean).join(" / ") || "No client set"}</p>
        </div>
        <StatusBadge status={status.badge} showDot className="min-w-0 px-1.5 py-1">{status.label}</StatusBadge>
      </div>

      <div className="flex-1 space-y-3 py-3">
        {row.clientLinkPath ? (
          <input
            aria-label={`Shared link for ${row.projectName}`}
            readOnly
            value={row.clientLinkPath}
            onFocus={(event) => event.currentTarget.select()}
            className="w-full rounded-xs border border-divider bg-surfaceMuted/70 px-2 py-1.5 text-[11px] leading-4 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          />
        ) : (
          <p className="rounded-xs bg-surfaceMuted/70 px-2 py-1.5 text-[10px] leading-4 text-secondary">No shared link yet.</p>
        )}

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] leading-4">
          <div>
            <dt className="text-tertiary">Recipients</dt>
            <dd className="font-medium text-ink">{formatPublisherRecipientCount(row)}</dd>
          </div>
          <div>
            <dt className="text-tertiary">Estimates</dt>
            <dd className="font-medium text-ink">{formatPublisherSheetScope(row)}</dd>
          </div>
          <div>
            <dt className="text-tertiary">Opens</dt>
            <dd className="font-medium text-ink">{row.status === "unpublished" ? "—" : row.openCount}</dd>
          </div>
          <div>
            <dt className="text-tertiary">Latest activity</dt>
            <dd className="font-medium text-ink">{formatRelativeTime(row.latestActivityAt)}</dd>
          </div>
        </dl>

        {row.passwordRequired || expiresDate || row.staleSnapshotWarning || row.linkUnavailableReason ? (
          <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-hairline pt-2 text-[9px] leading-3 text-tertiary">
            {row.passwordRequired ? <span className="inline-flex items-center gap-1"><LockKey size={11} aria-hidden="true" /> Password protected</span> : null}
            {expiresDate ? <span>Expires {expiresDate}</span> : null}
            {row.staleSnapshotWarning ? <span className="inline-flex items-center gap-1 text-warning"><WarningCircle size={11} aria-hidden="true" /> {row.staleSnapshotWarning.daysBehind}d behind</span> : null}
            {row.linkUnavailableReason ? <span className="inline-flex items-center gap-1 text-danger"><WarningCircle size={11} aria-hidden="true" /> Link unavailable</span> : null}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1.5 border-t border-hairline pt-2.5">
        {row.canManagePublication ? (
          <Button type="button" variant="primary" size="sm" className="min-h-11 min-w-0 flex-1 px-2 min-[768px]:min-h-8" aria-label={`Share ${row.projectName}`} onClick={(event) => onSharePublication(row, event.currentTarget)}>
            <ShareNetwork size={14} aria-hidden="true" /> Share
          </Button>
        ) : null}
        {row.clientLinkPath ? (
          <Link href={previewHref} className="inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xs border border-divider bg-surface px-2 text-[10px] font-medium text-ink transition hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus min-[768px]:min-h-8" aria-label={`Preview shared page for ${row.projectName}`}>
            <Eye size={14} aria-hidden="true" /> Preview
          </Link>
        ) : null}
        <Button type="button" variant="secondary" size="sm" className="min-h-11 min-w-0 flex-1 px-2 min-[768px]:min-h-8" aria-label={`${copyLabel} for ${row.projectName}`} disabled={copyUnavailable} onClick={() => onCopyLink(row)}>
          <Copy size={14} aria-hidden="true" /> {copyLabel}
        </Button>
        <Button type="button" variant="secondary" size="sm" className="min-h-11 min-w-0 flex-1 px-2 min-[768px]:min-h-8" aria-label={`${row.canManagePublication ? "Manage" : "View details for"} ${row.projectName}`} onClick={(event) => onManagePublication(row, event.currentTarget)}>
          <Gear size={14} aria-hidden="true" /> Manage
        </Button>
      </div>
    </article>
  );
}
