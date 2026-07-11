import type { StatusBadgeStatus } from "@/components/ui/status-badge";
import type { ProjectPublicationRosterRow as ProjectPublicationRosterRowData } from "@/lib/publisher/roster-repository";

export type PublisherRosterCopyState = "idle" | "copied" | "failed";

const statusCopy = {
  expired: { label: "Expired", badge: "danger" },
  published: { label: "Live", badge: "active" },
  revoked: { label: "Off", badge: "danger" },
  unpublished: { label: "Not shared", badge: "draft" },
} satisfies Record<ProjectPublicationRosterRowData["status"], { label: string; badge: StatusBadgeStatus }>;

export function readPublisherStatusCopy(row: ProjectPublicationRosterRowData) {
  if (row.status === "published" && row.staleSnapshotWarning) {
    return { label: "Needs update", badge: "review" as const };
  }
  return statusCopy[row.status];
}

export function formatPublisherDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-PH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatPublisherSheetScope(row: ProjectPublicationRosterRowData) {
  if (row.status === "unpublished") return "Not selected";
  if (row.selectedEstimateCount === 0) return "All estimates";
  if (row.selectedEstimateCount === 1) return "1 estimate";
  return `${row.selectedEstimateCount} estimates`;
}

export function formatPublisherRecipientCount(row: ProjectPublicationRosterRowData) {
  if (row.status === "unpublished") return "No recipients";
  if (row.recipientCount === 0) return "Anyone with link";
  if (row.recipientCount === 1) return "1 recipient";
  return `${row.recipientCount} recipients`;
}
