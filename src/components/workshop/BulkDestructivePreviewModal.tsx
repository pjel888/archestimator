"use client";

import { useMemo, useState } from "react";
import { WarningDiamond } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { BulkActionIssue, BulkActionPreviewResult } from "@/lib/mass-deletion/bulk-action";
import { validateTypedConfirmationPhrase } from "@/lib/mass-deletion/bulk-action";

type BulkDestructivePreviewModalProps = {
  description: string;
  executing?: boolean;
  executeLabel: string;
  loading?: boolean;
  onExecute: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  preview: BulkActionPreviewResult | null;
  previewError?: string | null;
  requiredPhrase: string;
  title: string;
};

function summarizeIssues(preview: BulkActionPreviewResult | null, previewError?: string | null): BulkActionIssue[] {
  if (previewError) return [{ code: "rpc_error", message: previewError }];
  if (!preview) return [];
  const seen = new Set<string>();
  return [...(preview.issues ?? []), ...(preview.blocked ?? [])].filter((issue) => {
    const key = `${issue.code}:${issue.id ?? ""}:${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getTargetLabel(preview: BulkActionPreviewResult | null, count: number) {
  const plural = count !== 1;
  if (preview?.targetType === "project") return plural ? "projects" : "project";
  if (preview?.targetType === "estimate_sheet") return plural ? "estimates" : "estimate";
  if (preview?.targetType === "library_component") return plural ? "components" : "component";
  return plural ? "items" : "item";
}

function getActionCopy(executeLabel: string) {
  const normalizedLabel = executeLabel.trim().toLowerCase();
  if (normalizedLabel.startsWith("archive")) {
    return { verb: "archive", gerund: "archiving", past: "archived" };
  }
  return { verb: "delete", gerund: "deleting", past: "deleted" };
}

function formatIssueMessage(issue: BulkActionIssue) {
  const message = issue.message.trim();
  if (issue.code === "active_publication") {
    return "Active shared link will be revoked when this project is deleted.";
  }
  if (issue.code === "forbidden" || /forbidden|permission/i.test(message)) {
    return "You do not have permission to perform this action.";
  }
  if (issue.code === "not_found") return "This item is no longer available.";
  return message;
}

export function BulkDestructivePreviewModal({
  description,
  executing = false,
  executeLabel,
  loading = false,
  onExecute,
  onOpenChange,
  open,
  preview,
  previewError = null,
  requiredPhrase,
  title,
}: BulkDestructivePreviewModalProps) {
  const [typedPhrase, setTypedPhrase] = useState("");
  const issues = useMemo(() => summarizeIssues(preview, previewError), [preview, previewError]);
  const eligibleCount = Number(preview?.summary.eligibleCount ?? preview?.eligibleIds.length ?? 0);
  const blockedCount = Number(preview?.summary.blockedCount ?? issues.length);
  const requestedCount = Number(preview?.summary.requestedCount ?? preview?.ids.length ?? Math.max(eligibleCount, 1));
  const canExecute = Boolean(preview?.ok && preview.previewHash && eligibleCount > 0 && validateTypedConfirmationPhrase(typedPhrase, requiredPhrase) && !executing);
  const actionCopy = getActionCopy(executeLabel);
  const actionBlocked = Boolean(previewError || (preview && !preview.ok));
  const hasPartialBlockers = Boolean(preview?.ok && eligibleCount > 0 && blockedCount > 0);
  const statusTitle = loading
    ? "Checking this action"
    : actionBlocked
      ? `Cannot ${actionCopy.verb} yet`
      : hasPartialBlockers
        ? `${eligibleCount} ready, ${blockedCount} need attention`
        : preview
          ? `Ready to ${actionCopy.verb}`
          : "Confirm deletion";
  const statusMessage = loading
    ? "Archestimator is checking the selected work."
    : previewError
      ? "Close this window and try again."
      : actionBlocked
        ? `Resolve the item below before ${actionCopy.gerund} ${getTargetLabel(preview, Math.max(requestedCount, 1))}.`
        : hasPartialBlockers
          ? `Only the ${getTargetLabel(preview, eligibleCount)} marked ready will be ${actionCopy.past}.`
          : preview
            ? `This will ${actionCopy.verb} ${eligibleCount === 1 ? `this ${getTargetLabel(preview, 1)}` : `${eligibleCount} ${getTargetLabel(preview, eligibleCount)}`}.`
            : "Review the details before continuing.";
  const confirmationHint = canExecute
    ? actionCopy.verb === "archive"
      ? "Archived components are hidden from browse and blocked from new inserts. You can restore them later."
      : "This action cannot be undone."
    : actionBlocked
      ? `Resolve the item above before ${actionCopy.gerund}.`
      : `Type ${requiredPhrase} to enable ${executeLabel.toLowerCase()}.`;

  return (
    <Modal
      open={open}
      title={title}
      description={description}
      className="max-w-lg"
      onOpenChange={(nextOpen) => {
        if (executing) return;
        if (!nextOpen) setTypedPhrase("");
        onOpenChange(nextOpen);
      }}
    >
      <div className="space-y-3">
        <div className={["rounded-xs border p-2", actionBlocked ? "border-dangerSoft bg-dangerSoft/25" : "border-hairline bg-surfaceMuted"].join(" ")}>
          <div className="flex gap-2">
            {actionBlocked ? (
              <WarningDiamond size={16} weight="regular" className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
            ) : null}
            <div className="space-y-1">
              <p className="text-[10px] font-medium leading-4 text-ink">{statusTitle}</p>
              <p className="text-[10px] font-normal leading-4 text-secondary">{statusMessage}</p>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="rounded-xs border border-hairline bg-surfaceMuted px-2 py-1 text-[10px] leading-4 text-tertiary" role="status">
            Checking selected work…
          </p>
        ) : null}

        {issues.length > 0 ? (
          <div className="max-h-32 overflow-auto rounded-xs border border-hairline bg-white">
            <p className="border-b border-hairline px-2 py-1.5 text-[9px] font-medium leading-3 text-tertiary">Needs attention</p>
            <ul className="divide-y divide-hairline">
              {issues.map((issue, index) => (
                <li key={`${issue.code}-${issue.id ?? index}`} className="px-2 py-1.5 text-[10px] leading-4">
                  <p className="font-medium text-ink">{issue.name ?? issue.id ?? issue.code}</p>
                  <p className="text-secondary">{formatIssueMessage(issue)}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <label className="block space-y-1">
          <span className="text-[9px] font-medium uppercase tracking-normal text-tertiary">
            Type {requiredPhrase} to confirm
          </span>
          <input
            value={typedPhrase}
            onChange={(event) => setTypedPhrase(event.target.value)}
            aria-label={`Type ${requiredPhrase} to confirm`}
            className="h-8 w-full rounded-xs border border-hairline bg-white px-2 text-[10px] font-medium tracking-normal text-ink outline-none transition focus:bg-accentSoft"
            disabled={loading || executing}
          />
          <span className="block text-[9px] leading-3 text-tertiary">{confirmationHint}</span>
        </label>

        <div className="flex justify-end gap-2 border-t border-hairline pt-2">
          <Button type="button" variant="secondary" size="sm" className="h-8" disabled={executing} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="danger" size="sm" className="h-8" disabled={!canExecute} onClick={onExecute}>
            {executing ? "Executing…" : executeLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
