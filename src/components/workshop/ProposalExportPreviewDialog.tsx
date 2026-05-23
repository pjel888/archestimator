"use client";

import { createPortal } from "react-dom";
import { ArrowClockwise, FileXls } from "@phosphor-icons/react/dist/ssr";

import type { ProposalExportModel } from "@/lib/proposal-export/types";
import { cn } from "@/lib/ui/cn";

type ProposalExportPreviewDialogProps = {
  open: boolean;
  model: ProposalExportModel | null;
  isStale?: boolean;
  downloadHref?: string | null;
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
  "inline-flex h-7 items-center justify-center gap-1 rounded-sm px-2 text-[9px] font-bold leading-none tracking-[-0.005em] transition";

const previewActionTextClass = "text-[9px] font-bold leading-none tracking-[-0.005em]";

const previewStatusBadgeClass =
  "inline-flex h-7 items-center justify-center rounded-full px-2 text-[9px] font-bold leading-none tracking-[-0.005em] whitespace-nowrap";

export function ProposalExportPreviewDialog({
  open,
  model,
  isStale = false,
  downloadHref,
  onRefresh,
  onClose,
}: ProposalExportPreviewDialogProps) {
  if (!open || typeof document === "undefined") return null;

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
            <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-tertiary">Industry BOQ export</p>
            <h2 className="mt-0.5 text-[12px] font-bold tracking-[-0.02em] text-ink">Read-only Excel preview</h2>
            <p className="mt-1 max-w-2xl text-[10px] leading-4 text-secondary">
              This preview consolidates identical items across rooms/areas. The workbook becomes editable only after XLSX download.
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
              <ArrowClockwise size={11} weight="bold" aria-hidden="true" />
              <span className={previewActionTextClass} data-testid="proposal-preview-refresh-label">
                Refresh preview
              </span>
            </button>
            {downloadHref ? (
              <a
                className={cn(previewActionButtonClass, "bg-primary text-white hover:bg-accentDark")}
                href={downloadHref}
              >
                <FileXls size={11} weight="bold" aria-hidden="true" />
                <span className={previewActionTextClass} data-testid="proposal-preview-download-label">
                  Download editable XLSX
                </span>
              </a>
            ) : null}
            <button
              type="button"
              aria-label="Close preview"
              className="grid size-7 place-items-center rounded-sm border border-hairline text-[12px] font-bold leading-none text-tertiary hover:bg-surfaceMuted hover:text-ink"
              onClick={onClose}
            >
              ×
            </button>
          </div>
        </header>

        {model ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="grid grid-cols-4 border-b border-hairline bg-surfaceMuted/40 text-[10px]">
              <div className="border-r border-hairline px-3 py-2">
                <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-tertiary">Project</p>
                <p className="mt-0.5 truncate font-semibold text-ink">{model.metadata.projectName}</p>
              </div>
              <div className="border-r border-hairline px-3 py-2">
                <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-tertiary">Estimate</p>
                <p className="mt-0.5 truncate font-semibold text-ink">{model.metadata.estimateSheetCode} · {model.metadata.estimateName}</p>
              </div>
              <div className="border-r border-hairline px-3 py-2">
                <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-tertiary">Rows</p>
                <p className="mt-0.5 font-semibold tabular-nums text-ink">{model.proposalRows.length} consolidated BOQ rows</p>
              </div>
              <div className="px-3 py-2">
                <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-tertiary">Grand total</p>
                <p className="mt-0.5 font-semibold tabular-nums text-ink">{formatMoney(model.totals.grandTotal)}</p>
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
                      <th key={header} scope="col" className="border-r border-white/20 px-2 py-2 text-left text-[9px] font-bold uppercase tracking-[0.08em]">
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
                        <td className="px-2 py-1.5 font-semibold">{row.tag}</td>
                        <td className="max-w-[340px] px-2 py-1.5">{row.particulars}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{formatQuantity(row.quantity)}</td>
                        <td className="px-2 py-1.5">{row.unit}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{formatMoney(row.materialUnitCost)}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{formatMoney(row.laborUnitCost)}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{formatMoney(row.materialSubtotal)}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{formatMoney(row.laborSubtotal)}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{formatMoney(row.miscSubtotal)}</td>
                        <td className="px-2 py-1.5 text-right font-semibold tabular-nums">{formatMoney(row.costAmount)}</td>
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
                <tfoot className="bg-surfaceMuted font-bold">
                  <tr>
                    <td colSpan={7} className="px-2 py-2 text-right uppercase tracking-[0.08em] text-secondary">Grand total</td>
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
