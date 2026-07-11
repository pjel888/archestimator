import { ArrowSquareOut, Copy, Gear, ShareNetwork } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ProjectPublicationRosterRow } from "@/lib/publisher/roster-repository";

type PublisherRosterCardProps = {
  copyLabel: string;
  onCopyLink: (row: ProjectPublicationRosterRow) => void;
  onManagePublication: (row: ProjectPublicationRosterRow, trigger: HTMLButtonElement) => void;
  onSharePublication: (row: ProjectPublicationRosterRow, trigger: HTMLButtonElement) => void;
  row: ProjectPublicationRosterRow;
};

export function PublisherRosterCard({ copyLabel, onCopyLink, onManagePublication, onSharePublication, row }: PublisherRosterCardProps) {
  const status = row.status === "published" ? "active" : row.status === "unpublished" ? "draft" : "danger";
  return (
    <article className="space-y-3 rounded-xs border border-hairline bg-surface p-3" data-publisher-roster-card={row.projectId}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[12px] font-medium text-ink">{row.projectName}</h3>
          <p className="truncate text-[10px] text-secondary">{[row.projectCode, row.clientName].filter(Boolean).join(" / ") || "No client set"}</p>
        </div>
        <StatusBadge status={status} showDot>{row.status === "published" ? "Active" : row.status === "unpublished" ? "Draft" : row.status}</StatusBadge>
      </div>
      {row.clientLinkPath ? <input aria-label={`Shared link for ${row.projectName}`} readOnly value={row.clientLinkPath} onFocus={(event) => event.currentTarget.select()} className="w-full rounded-xs border border-divider bg-surfaceMuted px-2 py-1 text-[10px] text-ink" /> : <p className="text-[10px] text-secondary">No shared link yet.</p>}
      <div className="grid grid-cols-2 gap-2 text-[10px] text-secondary"><span>{row.recipientCount} recipients</span><span>{row.selectedEstimateCount} sheets</span></div>
      <div className="flex flex-wrap gap-2">
        {row.canManagePublication ? <Button type="button" variant="primary" size="sm" onClick={(event) => onSharePublication(row, event.currentTarget)}><ShareNetwork size={14} aria-hidden="true" /> Share</Button> : null}
        <Button type="button" variant="secondary" size="sm" disabled={!row.clientLinkPath || !row.tokenCopyAvailable} onClick={() => onCopyLink(row)}><Copy size={14} aria-hidden="true" /> {copyLabel}</Button>
        {row.clientLinkPath ? <a href={row.clientLinkPath} target="_blank" rel="noreferrer" className="inline-flex min-h-8 items-center gap-1 rounded-xs border border-divider px-2 text-[10px] text-ink"><ArrowSquareOut size={14} aria-hidden="true" /> Open</a> : null}
        <Button type="button" variant="secondary" size="sm" onClick={(event) => onManagePublication(row, event.currentTarget)}><Gear size={14} aria-hidden="true" /> Manage</Button>
      </div>
    </article>
  );
}
