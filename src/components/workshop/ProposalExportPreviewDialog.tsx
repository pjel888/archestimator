"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowClockwise, FileXls, X } from "@phosphor-icons/react/dist/ssr";

import type { ProposalExportModel } from "@/lib/proposal-export/types";
import { cn } from "@/lib/ui/cn";
import { clampRate } from "./proposal-export-preview-utils";

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

type ProposalExportPreviewDownloadStatus =
  | { kind: "hidden" }
  | { kind: "ready" }
  | { kind: "preparing" }
  | { kind: "disabled" };

type ProposalExportPreviewStatus = {
  freshness: "current" | "stale";
  download: ProposalExportPreviewDownloadStatus;
  downloadError?: string | null;
  unsavedEdits?: number;
};

type ProposalExportPreviewDialogProps = {
  open: boolean;
  model: ProposalExportModel | null;
  status?: ProposalExportPreviewStatus;
  onDownload?: () => void;
  scopeControls?: ProposalExportPreviewScopeControls;
  exportSettings?: ProposalExportUserSettings;
  onExportSettingsChange?: (settings: ProposalExportUserSettings) => void;
  onRefresh: () => void;
  onClose: () => void;
};

const previewNumberFormatter = new Intl.NumberFormat("en-PH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function normalizeCurrencyCode(value: string) {
  const currencyCode = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(currencyCode) ? currencyCode : "PHP";
}

function formatMoney(value: number, currencyCode: string) {
  const normalizedCurrencyCode = normalizeCurrencyCode(currencyCode);
  const formattedValue = previewNumberFormatter.format(value);
  return normalizedCurrencyCode === "PHP" ? `₱ ${formattedValue}` : `${normalizedCurrencyCode} ${formattedValue}`;
}

const settingsCheckboxLabelClass = "flex items-center gap-1.5 text-[10px] leading-4 text-secondary";
const settingsRateInputClass =
  "h-6 w-14 rounded-xs border border-hairline bg-white px-1.5 text-[12px] tabular-nums text-ink disabled:cursor-not-allowed disabled:bg-surfaceMuted disabled:opacity-60";

type ExportContentSheet = { name: string; description: string; flag?: "review" | "internal" | "omitted" };

// D7=B (P1-T2): the modal names the sheets the downloaded file will actually contain
// instead of rendering a table that never matched the file. Commercial Terms is flagged as
// boilerplate to review (F-35); Source Breakdown is listed as internal — and noted as omitted
// when the (server-derived) audience redacts it.
function buildExportContents(
  isAllTabs: boolean,
  tabCount: number,
  internalBreakdownRequested: boolean,
): ExportContentSheet[] {
  // The preview model is always built client-safe (audience is server-resolved at download),
  // so it can't tell us whether the file will contain the Source Breakdown. Drive the flag
  // off the user's explicit request instead — when a member checks "Include internal Source
  // Breakdown" the download URL carries audience=internal and the file WILL include the sheet,
  // so the contents summary must say so rather than always reporting it omitted.
  return [
    { name: isAllTabs ? `Bid Form × ${tabCount} tabs` : "Bid Form", description: "Itemized bill of quantities with live formulas." },
    { name: "Summary", description: "Section subtotals, Direct Cost, VAT, and Grand Total." },
    { name: "Commercial Terms", description: "Boilerplate terms and a signature block.", flag: "review" },
    {
      name: "Source Breakdown",
      description: internalBreakdownRequested
        ? "Internal supplier and source-row traceability — included for members only."
        : "Internal supplier traceability — omitted from this export.",
      flag: internalBreakdownRequested ? "internal" : "omitted",
    },
  ];
}

const previewActionButtonClass =
  "inline-flex h-7 items-center justify-center gap-1 rounded-xs px-2.5 text-[11px] font-medium leading-none tracking-normal transition";

const previewActionTextClass = "text-[11px] font-medium leading-none tracking-normal";

const DEFAULT_PROPOSAL_EXPORT_PREVIEW_STATUS: ProposalExportPreviewStatus = {
  freshness: "current",
  download: { kind: "hidden" },
  downloadError: null,
};

function SheetFlag({ flag }: { flag: NonNullable<ExportContentSheet["flag"]> }) {
  if (flag === "review") {
    return (
      <span className="inline-flex items-center rounded-xs bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
        Review before sending
      </span>
    );
  }
  if (flag === "internal") {
    return (
      <span className="inline-flex items-center rounded-xs bg-surfaceMuted px-1.5 py-0.5 text-[10px] font-medium text-secondary">
        Internal only
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-xs bg-surfaceMuted px-1.5 py-0.5 text-[10px] font-medium text-tertiary">
      Not in this export
    </span>
  );
}

// react-doctor-disable-next-line react-doctor/no-giant-component -- Structural split tracked in .ai/03_plans/2026-06-23-react-doctor-warning-cleanup.md; broad refactor needs behavior tests.
export function ProposalExportPreviewDialog({
  open,
  model,
  status = DEFAULT_PROPOSAL_EXPORT_PREVIEW_STATUS,
  onDownload,
  scopeControls,
  exportSettings,
  onExportSettingsChange,
  onRefresh,
  onClose,
}: ProposalExportPreviewDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  // Local draft strings for the rate inputs (RV-4). A controlled number input bound to the
  // committed rate can never show empty, so clearing it would snap back and "clear then type"
  // would append onto the old value (e.g. 12 → 128 → clamped 100). The draft lets the field
  // display empty / in-progress text while editing; the committed rate still updates on each
  // keystroke via clampRate, and the draft is dropped on blur to re-sync with the committed value.
  const [contingencyRateDraft, setContingencyRateDraft] = useState<string | null>(null);
  const [vatRateDraft, setVatRateDraft] = useState<string | null>(null);
  const closePreview = useEffectEvent(() => onClose());

  const handleNativeDialogPointerDown = useCallback(
    (event: PointerEvent) => {
      if (event.target === dialogRef.current) onClose();
    },
    [onClose],
  );

  const openDialogElement = useCallback(
    (node: HTMLDialogElement | null) => {
      dialogRef.current?.removeEventListener("pointerdown", handleNativeDialogPointerDown);
      dialogRef.current = node;
      if (!node) return;

      node.addEventListener("pointerdown", handleNativeDialogPointerDown);
      if (node.open) return;

      if (typeof node.showModal === "function") {
        try {
          node.showModal();
        } catch {
          node.setAttribute("open", "");
        }
        return;
      }

      node.setAttribute("open", "");
    },
    [handleNativeDialogPointerDown],
  );

  // F-06 (P1-T3): keyboard accessibility — initial focus on open, Esc-to-close, and a Tab
  // focus trap, mirroring the sibling modals in EstimateSheetContent. Focus-return to the
  // opener is handled by the parent's onClose. Capture-phase so the dialog wins over
  // background keydown handlers (e.g. the sheet's own Escape listener).
  useEffect(() => {
    if (!open) return;
    const node = dialogRef.current;
    const focusFrame = window.requestAnimationFrame(() => node?.focus());
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closePreview();
        return;
      }
      if (event.key === "Tab" && node) trapFocus(node, event);
    }
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const activeTabName = scopeControls?.activeTabName.trim() || "Current";
  const activeTabLabel = `${activeTabName} tab`;
  const scopeButtonClass =
    "inline-flex h-7 flex-1 items-center justify-center rounded-xs px-2 text-[11px] font-medium leading-none transition";
  // D8=a: for a multi-tab all-tabs export the modal's grand total would be the active tab's
  // number only — hide it and point to the downloaded Summary instead of misquoting.
  const isMultiTabAllTabs = Boolean(scopeControls && scopeControls.selectedScope === "all-tabs");
  const contentSheets = model
    ? buildExportContents(isMultiTabAllTabs, scopeControls?.tabCount ?? 1, exportSettings?.includeInternalBreakdown ?? false)
    : [];
  const isPreviewStale = status.freshness === "stale";
  const downloadStatus = status.download.kind;
  const showDownloadButton = Boolean(onDownload && downloadStatus !== "hidden");
  const downloadInProgress = downloadStatus === "preparing";
  const downloadError = status.downloadError ?? null;
  const unsavedEdits = status.unsavedEdits ?? 0;
  const downloadDisabled = downloadStatus !== "ready" || isPreviewStale || unsavedEdits > 0;

  const dialog = (
    <dialog
      ref={openDialogElement}
      tabIndex={-1}
      aria-modal="true"
      aria-label="Excel export preview"
      data-testid="proposal-preview-overlay"
      className="z-[1000] m-auto flex max-h-[min(720px,calc(100dvh-32px))] w-[min(440px,calc(100vw-32px))] flex-col overflow-hidden rounded-xs border border-hairline bg-white p-0 text-ink shadow-2xl outline-none backdrop:bg-black/25 backdrop:backdrop-blur-md"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className="shrink-0 border-b border-hairline px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[9px] font-medium uppercase text-tertiary">Industry BOQ export</p>
            <h2 className="mt-0.5 text-[12px] font-medium text-ink">Export contents</h2>
            <p className="mt-1 text-[10px] leading-4 text-secondary">
              <span>A summary of the sheets the downloaded workbook will contain.</span>{" "}
              <span>It opens editable in Excel, Google Sheets, or LibreOffice.</span>
            </p>
          </div>
          <button
            type="button"
            aria-label="Close preview"
            className="grid size-7 shrink-0 place-items-center rounded-xs border border-hairline text-tertiary hover:bg-surfaceMuted hover:text-ink"
            onClick={onClose}
          >
            <X size={12} weight="regular" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xs px-1.5 py-0.5 text-[10px] font-medium",
              isPreviewStale ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700",
            )}
          >
            <span
              className={cn("size-1.5 rounded-xs", isPreviewStale ? "bg-amber-500" : "bg-emerald-500")}
              aria-hidden="true"
            />
            {isPreviewStale ? "Preview is stale. Refresh it before exporting." : "Preview current"}
          </span>
        </div>
      </header>

      {downloadError ? (
        <div
          role="alert"
          data-testid="proposal-download-error"
          className="shrink-0 border-b border-rose-200 bg-rose-50 px-3 py-2 text-[11px] leading-4 text-rose-700"
        >
          {downloadError}
        </div>
      ) : null}

      {unsavedEdits > 0 ? (
        <div
          role="status"
          data-testid="proposal-unsaved-edits-warning"
          className="shrink-0 border-b border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-4 text-amber-800"
        >
          Preview includes {unsavedEdits} unsaved row {unsavedEdits === 1 ? "edit" : "edits"}. Save the sheet, then
          refresh the preview before exporting so the workbook matches these totals.
        </div>
      ) : null}

      {model ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <section className="grid grid-cols-1 gap-px border-b border-hairline bg-hairline sm:grid-cols-3">
              <div className="bg-surfaceMuted/50 px-3 py-2">
                <p className="text-[9px] font-medium uppercase text-tertiary">Project</p>
                <p className="mt-0.5 truncate text-[12px] font-medium text-ink">{model.metadata.projectName}</p>
              </div>
              <div className="bg-surfaceMuted/50 px-3 py-2">
                <p className="text-[9px] font-medium uppercase text-tertiary">Estimate</p>
                <p className="mt-0.5 truncate text-[12px] font-medium text-ink">
                  {model.metadata.estimateSheetCode} · {model.metadata.estimateName}
                </p>
              </div>
              <div className="bg-surfaceMuted/50 px-3 py-2">
                <p className="text-[9px] font-medium uppercase text-tertiary">Grand total</p>
                {isMultiTabAllTabs ? (
                  <p className="mt-0.5 text-[11px] font-medium leading-4 text-ink">
                    All {scopeControls?.tabCount} tabs, total is in the downloaded Summary sheet
                  </p>
                ) : (
                  <p className="mt-0.5 text-[12px] font-medium tabular-nums text-ink">
                    {formatMoney(model.totals.grandTotalWithTaxes, model.metadata.currency)}
                  </p>
                )}
              </div>
            </section>

            {scopeControls ? (
              <section className="border-b border-hairline px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[9px] font-medium uppercase text-tertiary">Export scope</p>
                  <p className="min-w-0 text-right text-[9px] leading-3 text-tertiary">
                    {scopeControls.selectedScope === "all-tabs"
                      ? `Preview uses ${activeTabLabel}; download covers all ${scopeControls.tabCount} tabs.`
                      : `Download scoped to ${activeTabLabel}.`}
                  </p>
                </div>
                {/* react-doctor-disable-next-line react-doctor/prefer-tag-over-role -- Export scope buttons are a named control group, not an address block. */}
                <div
                  className="mt-1.5 grid grid-cols-2 gap-1 rounded-xs border border-hairline bg-surfaceMuted/40 p-0.5"
                  role="group"
                  aria-label="Proposal export scope"
                >
                  <button
                    type="button"
                    aria-pressed={scopeControls.selectedScope === "all-tabs"}
                    className={cn(
                      scopeButtonClass,
                      scopeControls.selectedScope === "all-tabs"
                        ? "bg-white text-ink shadow-sm"
                        : "text-tertiary hover:text-ink",
                    )}
                    onClick={() => scopeControls.onScopeChange("all-tabs")}
                  >
                    All tabs
                    <span className="ml-1 text-[9px] font-normal text-tertiary">({scopeControls.tabCount})</span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={scopeControls.selectedScope === "active-tab"}
                    className={cn(
                      scopeButtonClass,
                      scopeControls.selectedScope === "active-tab"
                        ? "bg-white text-ink shadow-sm"
                        : "text-tertiary hover:text-ink",
                    )}
                    onClick={() => scopeControls.onScopeChange("active-tab")}
                  >
                    {activeTabLabel}
                  </button>
                </div>
              </section>
            ) : null}

            <section className="border-b border-hairline px-3 py-2.5">
              <h3 className="text-[9px] font-medium uppercase text-tertiary">This file will contain</h3>
              <ul className="mt-1.5 divide-y divide-hairline border border-hairline">
                {contentSheets.map((sheet) => (
                  <li
                    key={sheet.name}
                    className={cn(
                      "flex items-start gap-2.5 px-2.5 py-2",
                      sheet.flag === "omitted" ? "bg-surfaceMuted/30 opacity-80" : "bg-white",
                    )}
                  >
                    <FileXls
                      size={14}
                      weight="regular"
                      aria-hidden="true"
                      className={cn("mt-0.5 shrink-0", sheet.flag === "omitted" ? "text-tertiary" : "text-primary")}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[12px] font-medium text-ink">{sheet.name}</span>
                        {sheet.flag ? <SheetFlag flag={sheet.flag} /> : null}
                      </div>
                      <p className="mt-0.5 text-[10px] leading-4 text-secondary">{sheet.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[10px] leading-4 text-tertiary">
                {model.proposalRows.length} consolidated BOQ rows · {model.summaryRows.length}{" "}
                {model.summaryRows.length === 1 ? "section" : "sections"}
                {scopeControls && scopeControls.selectedScope === "all-tabs"
                  ? ` (counts shown are for the ${activeTabLabel}; the download covers all ${scopeControls.tabCount} tabs)`
                  : ""}
                .
              </p>
            </section>

            {exportSettings && onExportSettingsChange ? (
              <section className="border-b border-hairline px-3 py-2.5" data-testid="proposal-export-settings">
                <h3 className="text-[9px] font-medium uppercase text-tertiary">Export settings</h3>
                <div className="mt-2 grid gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <label className={cn(settingsCheckboxLabelClass, "flex-col items-start gap-1")}>
                      <span>Contingency %</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        className={cn(settingsRateInputClass, "w-full")}
                        aria-label="Contingency rate percent"
                        value={
                          exportSettings.contingencyIncluded
                            ? ""
                            : (contingencyRateDraft ?? String(exportSettings.contingencyRate))
                        }
                        disabled={exportSettings.contingencyIncluded}
                        onChange={(event) => {
                          setContingencyRateDraft(event.target.value);
                          onExportSettingsChange({
                            ...exportSettings,
                            contingencyRate: clampRate(event.target.value, exportSettings.contingencyRate),
                          });
                        }}
                        onBlur={() => setContingencyRateDraft(null)}
                      />
                    </label>
                    <label className={cn(settingsCheckboxLabelClass, "flex-col items-start gap-1")}>
                      <span>VAT %</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        className={cn(settingsRateInputClass, "w-full")}
                        aria-label="VAT rate percent"
                        value={exportSettings.vatIncluded ? "" : (vatRateDraft ?? String(exportSettings.vatRate))}
                        disabled={exportSettings.vatIncluded}
                        onChange={(event) => {
                          setVatRateDraft(event.target.value);
                          onExportSettingsChange({
                            ...exportSettings,
                            vatRate: clampRate(event.target.value, exportSettings.vatRate),
                          });
                        }}
                        onBlur={() => setVatRateDraft(null)}
                      />
                    </label>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={settingsCheckboxLabelClass}>
                      <input
                        type="checkbox"
                        className="size-3.5 rounded-xs border-hairline"
                        checked={exportSettings.contingencyIncluded}
                        onChange={(event) =>
                          onExportSettingsChange({ ...exportSettings, contingencyIncluded: event.target.checked })
                        }
                      />
                      <span>Contingency included in rates</span>
                    </label>
                    <label className={settingsCheckboxLabelClass}>
                      <input
                        type="checkbox"
                        className="size-3.5 rounded-xs border-hairline"
                        checked={exportSettings.vatIncluded}
                        onChange={(event) =>
                          onExportSettingsChange({ ...exportSettings, vatIncluded: event.target.checked })
                        }
                      />
                      <span>VAT included in rates</span>
                    </label>
                    <label className={settingsCheckboxLabelClass}>
                      <input
                        type="checkbox"
                        className="size-3.5 rounded-xs border-hairline"
                        checked={exportSettings.includeFormulas}
                        onChange={(event) =>
                          onExportSettingsChange({ ...exportSettings, includeFormulas: event.target.checked })
                        }
                      />
                      <span>Live formulas</span>
                    </label>
                    <label className={settingsCheckboxLabelClass}>
                      <input
                        type="checkbox"
                        className="size-3.5 rounded-xs border-hairline"
                        checked={exportSettings.includeInternalBreakdown}
                        onChange={(event) =>
                          onExportSettingsChange({
                            ...exportSettings,
                            includeInternalBreakdown: event.target.checked,
                          })
                        }
                      />
                      <span>Include internal Source Breakdown (members only)</span>
                    </label>
                  </div>
                </div>
              </section>
            ) : null}

            {model.validationIssues.length > 0 ? (
              <details className="px-3 py-2.5" open data-testid="proposal-validation-issues">
                <summary className="cursor-pointer text-[12px] font-medium text-amber-700">
                  {model.validationIssues.length} export {model.validationIssues.length === 1 ? "note" : "notes"} to
                  review
                </summary>
                <ul className="mt-1.5 flex flex-col gap-1">
                  {model.validationIssues.map((issue, index) => (
                    <li key={`${issue.code}-${index}`} className="flex items-start gap-2 text-[10px] leading-4 text-secondary">
                      <span
                        className={cn(
                          "mt-0.5 inline-block size-1.5 shrink-0 rounded-xs",
                          issue.severity === "error"
                            ? "bg-rose-500"
                            : issue.severity === "warning"
                              ? "bg-amber-500"
                              : "bg-sky-500",
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

          <footer className="shrink-0 border-t border-hairline bg-surfaceMuted/30 px-3 py-2.5">
            <div className="flex items-center justify-end gap-1.5">
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
              {showDownloadButton ? (
                <button
                  type="button"
                  className={cn(
                    previewActionButtonClass,
                    "bg-primary text-white hover:bg-accentDark disabled:cursor-not-allowed disabled:opacity-60",
                  )}
                  onClick={onDownload}
                  disabled={downloadDisabled}
                  aria-busy={downloadInProgress}
                >
                  {downloadInProgress ? (
                    <ArrowClockwise size={11} weight="regular" aria-hidden="true" className="animate-spin" />
                  ) : (
                    <FileXls size={11} weight="regular" aria-hidden="true" />
                  )}
                  <span className={previewActionTextClass} data-testid="proposal-preview-download-label">
                    {downloadInProgress ? "Preparing…" : "Download editable XLSX"}
                  </span>
                </button>
              ) : null}
            </div>
          </footer>
        </div>
      ) : (
        <div className="flex min-h-[200px] flex-1 items-center justify-center px-3 py-8 text-center text-[10px] text-tertiary">
          Build a preview to see what the export will contain.
        </div>
      )}
    </dialog>
  );

  return createPortal(dialog, document.body);
}
