"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ArrowClockwise, FileXls } from "@phosphor-icons/react/dist/ssr";

import type { ProposalExportModel } from "@/lib/proposal-export/types";
import { cn } from "@/lib/ui/cn";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

function trapFocus(container: HTMLElement, event: KeyboardEvent) {
  // The selector already excludes disabled controls; we don't filter on offsetParent so the
  // trap behaves identically under jsdom (no layout) and in a real browser.
  const focusables = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  if (focusables.length === 0) {
    event.preventDefault();
    container.focus();
    return;
  }
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && (active === first || active === container)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

export type ProposalExportPreviewScope = "all-tabs" | "active-tab";

// P2-T2/T3: the user-facing export settings. `includeInternalBreakdown` is a preference only —
// the route gates audience=internal by workspace membership server-side.
export type ProposalExportUserSettings = {
  contingencyRate: number;
  vatRate: number;
  contingencyIncluded: boolean;
  vatIncluded: boolean;
  includeFormulas: boolean;
  includeInternalBreakdown: boolean;
};

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
  exportSettings?: ProposalExportUserSettings;
  onExportSettingsChange?: (settings: ProposalExportUserSettings) => void;
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

function clampRate(raw: string, fallback: number) {
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(100, Math.max(0, value));
}

const settingsCheckboxLabelClass = "flex items-center gap-1.5 text-[12px] text-secondary";
const settingsRateInputClass =
  "h-6 w-16 rounded-xs border border-hairline px-1.5 text-[12px] tabular-nums disabled:cursor-not-allowed disabled:opacity-50";

type ExportContentSheet = { name: string; description: string; flag?: "review" | "internal" | "omitted" };

// D7=B (P1-T2): the modal names the sheets the downloaded file will actually contain
// instead of rendering a table that never matched the file. Commercial Terms is flagged as
// boilerplate to review (F-35); Source Breakdown is listed as internal — and noted as omitted
// when the (server-derived) audience redacts it.
function buildExportContents(model: ProposalExportModel, isAllTabs: boolean, tabCount: number): ExportContentSheet[] {
  const includeSourceBreakdown = model.settings.includeSourceBreakdownSheet;
  return [
    { name: isAllTabs ? `Bid Form × ${tabCount} tabs` : "Bid Form", description: "Itemized bill of quantities with live formulas." },
    { name: "Summary", description: "Section subtotals, Direct Cost, VAT, and Grand Total." },
    { name: "Commercial Terms", description: "Boilerplate terms and a signature block.", flag: "review" },
    {
      name: "Source Breakdown",
      description: includeSourceBreakdown
        ? "Internal supplier and source-row traceability."
        : "Internal supplier traceability — omitted from this client export.",
      flag: includeSourceBreakdown ? "internal" : "omitted",
    },
  ];
}

const previewActionButtonClass =
  "inline-flex h-7 items-center justify-center gap-1 rounded-xs px-2 text-[11px] font-medium leading-none tracking-normal transition";

const previewActionTextClass = "text-[11px] font-medium leading-none tracking-normal";

const previewStatusBadgeClass =
  "inline-flex h-7 items-center justify-center rounded-xs px-2 text-[11px] font-medium leading-none tracking-normal whitespace-nowrap";

export function ProposalExportPreviewDialog({
  open,
  model,
  isStale = false,
  onDownload,
  isDownloading = false,
  downloadError = null,
  canDownload = true,
  scopeControls,
  exportSettings,
  onExportSettingsChange,
  onRefresh,
  onClose,
}: ProposalExportPreviewDialogProps) {
  const sectionRef = useRef<HTMLElement>(null);

  // F-06 (P1-T3): keyboard accessibility — initial focus on open, Esc-to-close, and a Tab
  // focus trap, mirroring the sibling modals in EstimateSheetContent. Focus-return to the
  // opener is handled by the parent's onClose. Capture-phase so the dialog wins over
  // background keydown handlers (e.g. the sheet's own Escape listener).
  useEffect(() => {
    if (!open) return;
    const node = sectionRef.current;
    const focusFrame = window.requestAnimationFrame(() => node?.focus());
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key === "Tab" && node) trapFocus(node, event);
    }
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const activeTabName = scopeControls?.activeTabName.trim() || "Current";
  const activeTabLabel = `${activeTabName} tab`;
  const scopeButtonClass =
    "inline-flex h-6 items-center justify-center rounded-xs border px-2 text-[11px] font-medium leading-none transition";
  // D8=a: for a multi-tab all-tabs export the modal's grand total would be the active tab's
  // number only — hide it and point to the downloaded Summary instead of misquoting.
  const isMultiTabAllTabs = Boolean(scopeControls && scopeControls.selectedScope === "all-tabs");
  const contentSheets = model ? buildExportContents(model, isMultiTabAllTabs, scopeControls?.tabCount ?? 1) : [];

  const dialog = (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/25 p-2 backdrop-blur-md"
      data-testid="proposal-preview-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={sectionRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Excel export preview"
        className="flex h-[min(900px,94vh)] max-h-[94vh] w-[min(1360px,98vw)] flex-col overflow-hidden border border-hairline bg-white shadow-2xl outline-none"
      >
        <header className="flex items-center justify-between gap-3 border-b border-hairline px-3 py-2">
          <div className="min-w-0">
            <p className="text-[9px] font-medium uppercase tracking-normal text-tertiary">Industry BOQ export</p>
            <h2 className="mt-0.5 text-[13px] font-semibold tracking-normal text-ink">Export contents</h2>
            <p className="mt-1 max-w-2xl text-[12px] leading-5 text-secondary">
              <span>A summary of the sheets the downloaded workbook will contain.</span>{" "}
              <span>It opens editable in Excel, Google Sheets, or LibreOffice.</span>
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
            {exportSettings && onExportSettingsChange ? (
              <details className="border-b border-hairline px-3 py-2" data-testid="proposal-export-settings">
                <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-normal text-tertiary">Export settings</summary>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <label className={settingsCheckboxLabelClass}>
                    <span>Contingency %</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      className={settingsRateInputClass}
                      aria-label="Contingency rate percent"
                      value={exportSettings.contingencyIncluded ? "" : exportSettings.contingencyRate}
                      disabled={exportSettings.contingencyIncluded}
                      onChange={(event) => onExportSettingsChange({ ...exportSettings, contingencyRate: clampRate(event.target.value, exportSettings.contingencyRate) })}
                    />
                  </label>
                  <label className={settingsCheckboxLabelClass}>
                    <input
                      type="checkbox"
                      checked={exportSettings.contingencyIncluded}
                      onChange={(event) => onExportSettingsChange({ ...exportSettings, contingencyIncluded: event.target.checked })}
                    />
                    <span>Contingency included in rates</span>
                  </label>
                  <label className={settingsCheckboxLabelClass}>
                    <span>VAT %</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      className={settingsRateInputClass}
                      aria-label="VAT rate percent"
                      value={exportSettings.vatIncluded ? "" : exportSettings.vatRate}
                      disabled={exportSettings.vatIncluded}
                      onChange={(event) => onExportSettingsChange({ ...exportSettings, vatRate: clampRate(event.target.value, exportSettings.vatRate) })}
                    />
                  </label>
                  <label className={settingsCheckboxLabelClass}>
                    <input
                      type="checkbox"
                      checked={exportSettings.vatIncluded}
                      onChange={(event) => onExportSettingsChange({ ...exportSettings, vatIncluded: event.target.checked })}
                    />
                    <span>VAT included in rates</span>
                  </label>
                  <label className={settingsCheckboxLabelClass}>
                    <input
                      type="checkbox"
                      checked={exportSettings.includeFormulas}
                      onChange={(event) => onExportSettingsChange({ ...exportSettings, includeFormulas: event.target.checked })}
                    />
                    <span>Live formulas</span>
                  </label>
                  <label className={settingsCheckboxLabelClass}>
                    <input
                      type="checkbox"
                      checked={exportSettings.includeInternalBreakdown}
                      onChange={(event) => onExportSettingsChange({ ...exportSettings, includeInternalBreakdown: event.target.checked })}
                    />
                    <span>Include internal Source Breakdown (members only)</span>
                  </label>
                </div>
              </details>
            ) : null}
            <div className="grid grid-cols-3 border-b border-hairline bg-surfaceMuted/40 text-[12px]">
              <div className="border-r border-hairline px-3 py-2.5">
                <p className="text-[9px] font-medium uppercase tracking-normal text-tertiary">Project</p>
                <p className="mt-0.5 truncate font-medium text-ink">{model.metadata.projectName}</p>
              </div>
              <div className="border-r border-hairline px-3 py-2.5">
                <p className="text-[9px] font-medium uppercase tracking-normal text-tertiary">Estimate</p>
                <p className="mt-0.5 truncate font-medium text-ink">{model.metadata.estimateSheetCode} · {model.metadata.estimateName}</p>
              </div>
              <div className="px-3 py-2.5">
                <p className="text-[9px] font-medium uppercase tracking-normal text-tertiary">Grand total</p>
                {isMultiTabAllTabs ? (
                  <p className="mt-0.5 text-[12px] font-medium leading-4 text-ink">
                    All {scopeControls?.tabCount} tabs — total is in the downloaded Summary sheet
                  </p>
                ) : (
                  <p className="mt-0.5 font-semibold tabular-nums text-ink">{formatMoney(model.totals.grandTotalWithTaxes)}</p>
                )}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto px-3 py-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-normal text-tertiary">This file will contain</h3>
              <ul className="mt-2 flex flex-col gap-1.5">
                {contentSheets.map((sheet) => (
                  <li key={sheet.name} className="flex items-start gap-3 border border-hairline bg-white px-3 py-2">
                    <FileXls size={16} weight="regular" aria-hidden="true" className="mt-0.5 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[12px] font-semibold text-ink">{sheet.name}</span>
                        {sheet.flag === "review" ? (
                          <span className="inline-flex items-center rounded-xs bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                            Review before sending
                          </span>
                        ) : null}
                        {sheet.flag === "internal" ? (
                          <span className="inline-flex items-center rounded-xs bg-surfaceMuted px-1.5 py-0.5 text-[10px] font-medium text-secondary">
                            Internal only
                          </span>
                        ) : null}
                        {sheet.flag === "omitted" ? (
                          <span className="inline-flex items-center rounded-xs bg-surfaceMuted px-1.5 py-0.5 text-[10px] font-medium text-tertiary">
                            Not in this export
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-[12px] leading-5 text-secondary">{sheet.description}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <p className="mt-3 text-[12px] leading-5 text-tertiary">
                {model.proposalRows.length} consolidated BOQ rows · {model.summaryRows.length}{" "}
                {model.summaryRows.length === 1 ? "section" : "sections"}
                {scopeControls && scopeControls.selectedScope === "all-tabs"
                  ? ` (counts shown are for the ${activeTabLabel}; the download covers all ${scopeControls.tabCount} tabs)`
                  : ""}
                .
              </p>

              {model.validationIssues.length > 0 ? (
                <details className="mt-3 border-t border-hairline pt-2" open data-testid="proposal-validation-issues">
                  <summary className="cursor-pointer text-[12px] font-medium text-amber-700">
                    {model.validationIssues.length} export {model.validationIssues.length === 1 ? "note" : "notes"} to review
                  </summary>
                  <ul className="mt-1.5 flex flex-col gap-1">
                    {model.validationIssues.map((issue, index) => (
                      <li key={`${issue.code}-${index}`} className="flex items-start gap-2 text-[12px] leading-5 text-secondary">
                        <span
                          className={cn(
                            "mt-0.5 inline-block size-1.5 shrink-0 rounded-full",
                            issue.severity === "error" ? "bg-rose-500" : issue.severity === "warning" ? "bg-amber-500" : "bg-sky-500",
                          )}
                          aria-hidden="true"
                        />
                        <span>{issue.message}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex min-h-[320px] items-center justify-center px-3 py-8 text-center text-[12px] text-tertiary">
            Build a preview to see what the export will contain.
          </div>
        )}
      </section>
    </div>
  );

  return createPortal(dialog, document.body);
}
