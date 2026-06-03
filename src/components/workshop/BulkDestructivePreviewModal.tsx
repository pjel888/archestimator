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
  return [...(preview.issues ?? []), ...(preview.blocked ?? [])];
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
  const canExecute = Boolean(preview?.ok && preview.previewHash && eligibleCount > 0 && validateTypedConfirmationPhrase(typedPhrase, requiredPhrase) && !executing);

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
        <div className="rounded-xs border border-dangerSoft bg-dangerSoft/25 p-2">
          <div className="flex gap-2">
            <WarningDiamond size={16} weight="regular" className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
            <div className="space-y-1">
              <p className="text-[10px] font-medium leading-4 text-ink">Preview required before execution.</p>
              <p className="text-[10px] font-normal leading-4 text-secondary">
                Active shared links, permissions, and dependencies are checked server-side again at execution time.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="rounded-xs border border-hairline bg-surfaceMuted px-2 py-1 text-[10px] leading-4 text-tertiary" role="status">
            Loading dependency preview…
          </p>
        ) : null}

        {preview ? (
          <dl className="grid grid-cols-3 gap-1 text-[10px] leading-4">
            <div className="rounded-xs border border-hairline bg-white p-2">
              <dt className="text-[8px] font-medium uppercase tracking-normal text-tertiary">Requested</dt>
              <dd className="font-sans font-medium tabular-nums text-ink">{preview.summary.requestedCount}</dd>
            </div>
            <div className="rounded-xs border border-hairline bg-white p-2">
              <dt className="text-[8px] font-medium uppercase tracking-normal text-tertiary">Eligible</dt>
              <dd className="font-sans font-medium tabular-nums text-ink">{eligibleCount}</dd>
            </div>
            <div className="rounded-xs border border-hairline bg-white p-2">
              <dt className="text-[8px] font-medium uppercase tracking-normal text-tertiary">Blocked</dt>
              <dd className="font-sans font-medium tabular-nums text-danger">{blockedCount}</dd>
            </div>
          </dl>
        ) : null}

        {issues.length > 0 ? (
          <div className="max-h-32 overflow-auto rounded-xs border border-hairline bg-white">
            <ul className="divide-y divide-hairline">
              {issues.map((issue, index) => (
                <li key={`${issue.code}-${issue.id ?? index}`} className="px-2 py-1.5 text-[10px] leading-4">
                  <p className="font-medium text-ink">{issue.name ?? issue.id ?? issue.code}</p>
                  <p className="text-secondary">{issue.message}</p>
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
            className="h-8 w-full rounded-xs border border-hairline bg-white px-2 text-[10px] font-medium tracking-normal text-ink outline-none transition focus:border-focus focus:ring-2 focus:ring-focus/20"
            disabled={loading || executing}
          />
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
