import Link from "next/link";
import { ArrowSquareOut, LinkSimple, LockKey, ShareNetwork, SlidersHorizontal, WarningCircle } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { StatusBadge, type StatusBadgeStatus } from "@/components/ui/status-badge";
import { Tooltip } from "@/components/ui/overlays/tooltip";
import { cn } from "@/lib/ui/cn";
import { formatRelativeTime } from "@/lib/util/relative-time";
import type { ProjectPublicationRosterRow as ProjectPublicationRosterRowData } from "@/lib/publisher/roster-repository";

export type PublisherRosterCopyState = "idle" | "copied" | "failed";

type PublisherRosterRowProps = {
  row: ProjectPublicationRosterRowData;
  copyState?: PublisherRosterCopyState;
  onCopyLink: (row: ProjectPublicationRosterRowData) => void;
  onManagePublication: (row: ProjectPublicationRosterRowData, trigger: HTMLButtonElement) => void;
  onSharePublication: (row: ProjectPublicationRosterRowData, trigger: HTMLButtonElement) => void;
};

const statusCopy = {
  expired: { label: "Expired", badge: "danger" },
  published: { label: "Active", badge: "active" },
  revoked: { label: "Revoked", badge: "danger" },
  unpublished: { label: "Draft", badge: "draft" },
} satisfies Record<ProjectPublicationRosterRowData["status"], { label: string; badge: StatusBadgeStatus }>;

function readStatusCopy(row: ProjectPublicationRosterRowData) {
  if (row.status === "published" && row.staleSnapshotWarning) {
    return { label: "Stale", badge: "review" as const };
  }
  return statusCopy[row.status];
}

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-PH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatSheetScope(row: ProjectPublicationRosterRowData) {
  if (row.status === "unpublished") return "Not selected";
  if (row.selectedEstimateCount === 0) return "All sheets";
  if (row.selectedEstimateCount === 1) return "1 sheet";
  return `${row.selectedEstimateCount} sheets`;
}

function formatRecipientCount(row: ProjectPublicationRosterRowData) {
  if (row.status === "unpublished") return "None";
  if (row.recipientCount === 0) return "Anyone";
  if (row.recipientCount === 1) return "1 recipient";
  return `${row.recipientCount} recipients`;
}

export function PublisherRosterRow({
  row,
  copyState = "idle",
  onCopyLink,
  onManagePublication,
  onSharePublication,
}: PublisherRosterRowProps) {
  const status = readStatusCopy(row);
  const publishedDate = formatDate(row.publishedAt);
  const expiresDate = formatDate(row.expiresAt);
  const copyLabel = row.linkUnavailableReason
    ? "Link unavailable"
    : copyState === "copied"
      ? "Copied"
      : copyState === "failed"
        ? "Retry copy"
        : "Copy link";
  const copyUnavailable = !row.clientLinkPath || !row.tokenCopyAvailable;

  return (
    <tr
      className="group border-b border-hairline bg-surface/65 text-[10px] leading-4 text-secondary transition-colors hover:bg-surfaceMuted/70"
      data-publisher-roster-row={row.projectId}
    >
      <th scope="row" className="min-w-[220px] px-3 py-2 text-left align-middle">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-medium leading-4 text-ink">{row.projectName}</p>
          <p className="truncate text-[9px] leading-3 text-tertiary">
            {[row.projectCode, row.clientName].filter(Boolean).join(" / ") || "No project code"}
          </p>
        </div>
      </th>
      <td className="min-w-[140px] px-3 py-2 align-middle">
        <div className="flex flex-col items-start gap-1">
          <StatusBadge status={status.badge} showDot className="min-w-0 px-1.5 py-1">
            {status.label}
          </StatusBadge>
          <div className="flex flex-wrap items-center gap-1 text-[9px] leading-3 text-tertiary">
            {row.passwordRequired ? (
              <span className="inline-flex items-center gap-1">
                <LockKey size={10} weight="regular" aria-hidden="true" />
                Password
              </span>
            ) : null}
            {expiresDate ? <span>Expires {expiresDate}</span> : null}
            {row.staleSnapshotWarning ? (
              <span className="inline-flex items-center gap-1 text-warning">
                <WarningCircle size={10} weight="regular" aria-hidden="true" />
                {row.staleSnapshotWarning.daysBehind}d behind
              </span>
            ) : null}
            {row.linkUnavailableReason ? (
              <span className="inline-flex items-center gap-1 text-danger">
                <WarningCircle size={10} weight="regular" aria-hidden="true" />
                Link unavailable
              </span>
            ) : null}
          </div>
        </div>
      </td>
      <td className="hidden min-w-[120px] px-3 py-2 align-middle text-[10px] leading-4 lg:table-cell">
        <p className="text-ink">{formatRecipientCount(row)}</p>
        {row.openCount > 0 ? <p className="text-[9px] leading-3 text-tertiary">{row.openCount} opens</p> : null}
      </td>
      <td className="min-w-[132px] px-3 py-2 align-middle">
        <p className="text-[10px] leading-4 text-ink">{formatRelativeTime(row.latestActivityAt)}</p>
        {row.latestOpenedAt ? (
          <p className="text-[9px] leading-3 text-tertiary">Opened {formatRelativeTime(row.latestOpenedAt)}</p>
        ) : null}
      </td>
      <td className="hidden min-w-[120px] px-3 py-2 align-middle lg:table-cell">
        <p className="text-[10px] leading-4 text-ink">{formatSheetScope(row)}</p>
        {publishedDate ? <p className="text-[9px] leading-3 text-tertiary">Published {publishedDate}</p> : null}
      </td>
      <td className="min-w-[104px] px-3 py-2 align-middle">
        <div className="flex items-center justify-end gap-1">
          {row.canManagePublication ? (
            <Button type="button" variant="secondary" size="sm" className="min-h-7 px-2 py-0 text-[10px]" onClick={(event) => onSharePublication(row, event.currentTarget)}>
              <ShareNetwork size={12} aria-hidden="true" /> Share
            </Button>
          ) : null}
          <Tooltip label={copyLabel} side="top">
            <Button
              type="button"
              variant="plain"
              size="icon-xs"
              className={cn("border border-transparent text-tertiary hover:border-hairline hover:bg-surface", copyState === "copied" && "text-success")}
              aria-label={`Copy shared link for ${row.projectName}`}
              disabled={copyUnavailable}
              onClick={() => onCopyLink(row)}
            >
              <LinkSimple size={12} weight="regular" aria-hidden="true" />
            </Button>
          </Tooltip>
          {row.clientLinkPath ? (
            <Tooltip label="Open link" side="top">
              <Link
                href={row.clientLinkPath}
                target="_blank"
                rel="noreferrer"
                className="grid size-7 place-items-center rounded-xs border border-transparent text-tertiary transition hover:border-hairline hover:bg-surface hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1"
                aria-label={`Open shared link for ${row.projectName}`}
              >
                <ArrowSquareOut size={12} weight="regular" aria-hidden="true" />
              </Link>
            </Tooltip>
          ) : null}
          <Tooltip label={row.canManagePublication ? "Manage shared link" : "View shared link details"} side="top">
            <Button
              type="button"
              variant="plain"
              size="icon-xs"
              className="border border-transparent text-tertiary hover:border-hairline hover:bg-surface"
              aria-label={`${row.canManagePublication ? "Manage shared link" : "View shared link details"} for ${row.projectName}`}
              onClick={(event) => onManagePublication(row, event.currentTarget)}
            >
              <SlidersHorizontal size={12} weight="regular" aria-hidden="true" />
            </Button>
          </Tooltip>
        </div>
      </td>
    </tr>
  );
}
