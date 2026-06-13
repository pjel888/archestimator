"use client";

import { createPortal } from "react-dom";
import { ArrowClockwise, FileXls } from "@phosphor-icons/react/dist/ssr";

import type { ProposalExportModel } from "@/lib/proposal-export/types";
import { cn } from "@/lib/ui/cn";

export type ProposalExportPreviewScope = "all-tabs" | "active-tab";

type ProposalExportPreviewScopeControls = {
  selectedScope: ProposalExportPreviewScope;
  activeTabName: string;
  tabCount: number;
  onScopeChange: (scope: ProposalExportPreviewScope) => void;
};

type ProposalExportPreviewDialogProps = {
  open: boolean;
  model: ProposalExportModel | null;
  isStale?: boolean;
  onDownload?: () => void;
  isDownloading?: boolean;
  downloadError?: string | null;
  canDownload?: boolean;
  scopeControls?: ProposalExportPreviewScopeControls;
  onRefresh: () => void;
  onClose: () => void;
};

const previewPesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});

function formatMoney(value: number) {
  return previewPesoFormatter.format(value).replace("₱", "₱ ");
}

function formatQuantity(value: number) {
  return Number.isInteger(value) ? String(value) : String(value);
}

const previewActionButtonClass =
  "inline-flex h-7 items-center justify-center gap-1 rounded-xs px-2 text-[9px] font-medium leading-none tracking-normal transition";

const previewActionTextClass = "text-[9px] font-medium leading-none tracking-normal";

const previewStatusBadgeClass =
  "inline-flex h-7 items-center justify-center rounded-xs px-2 text-[9px] font-medium leading-none tracking-normal whitespace-nowrap";

export function ProposalExportPreviewDialog({
  open,
  model,
  isStale = false,
  onDownload,
  isDownloading = false,
  downloadError = null,
  canDownload = true,
  scopeControls,
  onRefresh,
  onClose,
}: ProposalExportPreviewDialogProps) {
  if (!open || typeof document === "undefined") return null;

  const activeTabName = scopeControls?.activeTabName.trim() || "Current";
  const activeTabLabel = `${activeTabName} tab`;
  const scopeButtonClass =
    "inline-flex h-6 items-center justify-center rounded-xs border px-2 text-[9px] font-medium leading-none transition";

  const dialog = (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/25 p-2 backdrop-blur-md"
      data-testid="proposal-preview-overlay"
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Excel export preview"
        className="flex h-[min(900px,94vh)] max-h-[94vh] w-[min(1360px,98vw)] flex-col overflow-hidden border border-hairline bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between gap-3 border-b border-hairline px-3 py-2">
          <div className="min-w-0">
            <p className="text-[8px] font-medium uppercase tracking-normal text-tertiary">Industry BOQ export</p>
            <h2 className="mt-0.5 text-[10px] font-medium tracking-normal text-ink">Read-only Excel preview</h2>
            <p className="mt-1 max-w-2xl text-[10px] leading-4 text-secondary">
              <span>This preview consolidates identical items across rooms/areas within each tab.</span>{" "}
              <span>The workbook becomes editable only after XLSX download.</span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {isStale ? (
              <span className={cn(previewStatusBadgeClass, "bg-amber-50 text-amber-700")}>
                Preview is stale. Refresh to rebuild from current sheet rows.
              </span>
            ) : (
              <span className={cn(previewStatusBadgeClass, "bg-emerald-50 text-emerald-700")}>Preview current</span>
            )}
            <button
              type="button"
              className={cn(
                previewActionButtonClass,
                "border border-primary/20 bg-accentSoft text-primary shadow-none hover:border-primary/35 hover:bg-primary hover:text-white",
              )}
              onClick={onRefresh}
            >
              <ArrowClockwise size={11} weight="regular" aria-hidden="true" />
              <span className={previewActionTextClass} data-testid="proposal-preview-refresh-label">
                Refresh preview
              </span>
            </button>
            {onDownload ? (
              <button
                type="button"
                className={cn(
                  previewActionButtonClass,
                  "bg-primary text-white hover:bg-accentDark disabled:cursor-not-allowed disabled:opacity-60",
                )}
                onClick={onDownload}
                disabled={isDownloading || !canDownload}
                aria-busy={isDownloading}
              >
                {isDownloading ? (
                  <ArrowClockwise size={11} weight="regular" aria-hidden="true" className="animate-spin" />
                ) : (
                  <FileXls size={11} weight="regular" aria-hidden="true" />
                )}
                <span className={previewActionTextClass} data-testid="proposal-preview-download-label">
                  {isDownloading ? "Preparing…" : "Download editable XLSX"}
                </span>
              </button>
            ) : null}
            <button
              type="button"
              aria-label="Close preview"
              className="grid size-7 place-items-center rounded-xs border border-hairline text-[9px] font-medium leading-none text-tertiary hover:bg-surfaceMuted hover:text-ink"
              onClick={onClose}
            >
              ×
            </button>
          </div>
        </header>

        {downloadError ? (
          <div
            role="alert"
            data-testid="proposal-download-error"
            className="border-b border-rose-200 bg-rose-50 px-3 py-2 text-[11px] leading-4 text-rose-700"
          >
            {downloadError}
          </div>
        ) : null}

        {model ? (
          <div className="flex min-h-0 flex-1 flex-col">
            {scopeControls ? (
              <div className="flex flex-wrap items-center gap-2 border-b border-hairline bg-white px-3 py-2 text-[10px] text-secondary">
                <span className="text-[8px] font-medium uppercase tracking-normal text-tertiary">Export scope</span>
                <div className="flex items-center gap-1" role="group" aria-label="Proposal export scope">
                  <button
                    type="button"
                    aria-pressed={scopeControls.selectedScope === "all-tabs"}
                    className={cn(
                      scopeButtonClass,
                      scopeControls.selectedScope === "all-tabs"
                        ? "border-primary bg-accentSoft text-primary"
                        : "border-hairline bg-white text-tertiary hover:bg-surfaceMuted hover:text-ink",
                    )}
                    onClick={() => scopeControls.onScopeChange("all-tabs")}
                  >
                    All tabs
                    <span className="ml-1 text-[8px] font-normal text-tertiary">({scopeControls.tabCount} tabs)</span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={scopeControls.selectedScope === "active-tab"}
                    className={cn(
                      scopeButtonClass,
                      scopeControls.selectedScope === "active-tab"
                        ? "border-primary bg-accentSoft text-primary"
                        : "border-hairline bg-white text-tertiary hover:bg-surfaceMuted hover:text-ink",
                    )}
                    onClick={() => scopeControls.onScopeChange("active-tab")}
                  >
                    {activeTabLabel}
                  </button>
                </div>
                <span className="min-w-0 flex-1 text-[9px] leading-4 text-tertiary">
                  {scopeControls.selectedScope === "all-tabs"
                    ? `Download includes all ${scopeControls.tabCount} estimate tabs; this preview is built from the active tab rows.`
                    : `Download is scoped to the active ${activeTabLabel}.`}
                </span>
              </div>
            ) : null}
            <div className="grid grid-cols-4 border-b border-hairline bg-surfaceMuted/40 text-[10px]">
              <div className="border-r border-hairline px-3 py-2">
                <p className="text-[8px] font-medium uppercase tracking-normal text-tertiary">Project</p>
                <p className="mt-0.5 truncate font-medium text-ink">{model.metadata.projectName}</p>
              </div>
              <div className="border-r border-hairline px-3 py-2">
                <p className="text-[8px] font-medium uppercase tracking-normal text-tertiary">Estimate</p>
                <p className="mt-0.5 truncate font-medium text-ink">{model.metadata.estimateSheetCode} · {model.metadata.estimateName}</p>
              </div>
              <div className="border-r border-hairline px-3 py-2">
                <p className="text-[8px] font-medium uppercase tracking-normal text-tertiary">Rows</p>
                <p className="mt-0.5 font-medium tabular-nums text-ink">{model.proposalRows.length} consolidated BOQ rows</p>
              </div>
              <div className="px-3 py-2">
                <p className="text-[8px] font-medium uppercase tracking-normal text-tertiary">Grand total</p>
                <p className="mt-0.5 font-medium tabular-nums text-ink">{formatMoney(model.totals.grandTotal)}</p>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              <table className="min-w-[1080px] w-full border-collapse text-[10px] text-ink">
                <thead className="sticky top-0 z-10 bg-ink text-white">
                  <tr>
                    {[
                      "NO.",
                      "TAG",
                      "PARTICULARS",
                      "QTY",
                      "UNIT",
                      "MATERIAL UNIT COST",
                      "LABOR UNIT COST",
                      "MATERIAL SUBTOTAL",
                      "LABOR SUBTOTAL",
                      "MISC / OTHER",
                      "COST AMOUNT",
                      "REMARKS",
                    ].map((header) => (
                      <th key={header} scope="col" className="border-r border-white/20 px-2 py-2 text-left text-[9px] font-medium uppercase tracking-normal">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {model.proposalRows.length > 0 ? (
                    model.proposalRows.map((row) => (
                      <tr key={row.exportRowId} className="border-b border-hairline">
                        <td className="px-2 py-1.5 tabular-nums">{row.rowNumber}</td>
                        <td className="px-2 py-1.5 font-medium">{row.tag}</td>
                        <td className="max-w-[340px] px-2 py-1.5">{row.particulars}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{formatQuantity(row.quantity)}</td>
                        <td className="px-2 py-1.5">{row.unit}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{formatMoney(row.materialUnitCost)}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{formatMoney(row.laborUnitCost)}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{formatMoney(row.materialSubtotal)}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{formatMoney(row.laborSubtotal)}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{formatMoney(row.miscSubtotal)}</td>
                        <td className="px-2 py-1.5 text-right font-medium tabular-nums">{formatMoney(row.costAmount)}</td>
                        <td className="max-w-[280px] px-2 py-1.5 text-tertiary">{row.remarks}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={12} className="px-3 py-8 text-center text-[10px] text-tertiary">
                        No Area Node rows are available for proposal export.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-surfaceMuted font-medium">
                  <tr>
                    <td colSpan={7} className="px-2 py-2 text-right uppercase tracking-normal text-secondary">Grand total</td>
                    <td className="px-2 py-2 text-right tabular-nums">{formatMoney(model.totals.materialSubtotal)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{formatMoney(model.totals.laborSubtotal)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{formatMoney(model.totals.miscSubtotal)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{formatMoney(model.totals.grandTotal)}</td>
                    <td className="px-2 py-2" />
                  </tr>
                </tfoot>
              </table>
            </div>

            <footer className="flex items-center justify-between gap-3 border-t border-hairline px-3 py-2 text-[9px] text-tertiary">
              <span>{model.summaryRows.length} section summaries · {model.sourceBreakdownRows.length} source rows retained for area traceability.</span>
              <span className={cn(model.validationIssues.length > 0 && "text-amber-700")}>{model.validationIssues.length} export notes</span>
            </footer>
          </div>
        ) : (
          <div className="flex min-h-[320px] items-center justify-center px-3 py-8 text-center text-[10px] text-tertiary">
            Build a preview to see the consolidated workbook rows.
          </div>
        )}
      </section>
    </div>
  );

  return createPortal(dialog, document.body);
}
