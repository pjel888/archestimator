"use client";

import { memo, useCallback, useEffect, useMemo, useReducer, useRef, useState, type CSSProperties, type Dispatch, type DragEvent, type FocusEvent, type KeyboardEvent, type RefObject, type SetStateAction } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { ArrowsOutSimple, CopySimple, DotsSixVertical, DotsThree, Info, Trash } from "@phosphor-icons/react/dist/ssr";

import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Modal } from "@/components/ui/modal";
import { ControlInput } from "@/components/ui/control-input";
import type { CreatableComboboxOption } from "@/components/ui/creatable-combobox";
import { Tooltip } from "@/components/ui/overlays/tooltip";
import { SelectionCheckbox } from "@/components/ui/selection-checkbox";
import { registerEstimateOnboardingTargetAdapter } from "@/components/onboarding/estimate-target-adapter";
import type { EstimateRowMutationStatus } from "@/hooks/use-estimate-row-mutations";
import type { EstimateContributionBroadcastReceipt } from "@/lib/collaboration/estimate-tree-realtime-contract";
import { recordExpressComponentEvent } from "@/lib/estimates/express-components-telemetry";
import {
  EMPTY_ESTIMATE_COLUMN_WIDTHS,
  ESTIMATE_COLUMN_TEMPLATE,
  isResizableEstimateColumnId,
  type EstimateColumnId,
  type EstimateColumnWidths,
} from "@/lib/estimate-sheet/column-model";
import { cn } from "@/lib/ui/cn";
import { estimateSurfaceClass } from "../../estimate-surface-class";
import { useEstimateSurfaceVariant } from "../../estimate-surface-variant";
import { WORKSHOP_ESTIMATE_ROW_VIRTUALIZATION } from "@/lib/workshop/virtualization-flags";
import { beginEstimateWorkshopDrag, endEstimateWorkshopDrag } from "../../estimate-workshop-drag";
import { formatPeso, isBlankEstimateRowItem, pesoFormatter, type RowDetailTab } from "../activity-history-model";
import { reportEstimateRowItemRender, reportEstimateRowItemsTableRender } from "../../estimate-sheet-render-probe";
import type { EstimateRowItem } from "../../estimate-tree-data";
import { useEstimateColumnResizeController } from "../columns/use-estimate-column-resize-controller";
import { CommercialCell, type CommercialCellValue } from "../CommercialCell";
import { QuotationAttachmentControl } from "../QuotationAttachmentControl";
import {
  linkEstimateRowQuotationAttachment,
  listEstimateQuotationOptions,
  unlinkEstimateRowQuotationAttachment,
  updateEstimateRowCommercialTerms,
} from "@/lib/commercial-terms/actions";
import type { EstimateQuotationOption } from "@/lib/commercial-terms/repository";
import {
  selectEstimateAlternativeAction,
  setEstimateOptionalInclusionAction,
} from "@/lib/estimates/value-engineering-actions";
import {
  ESTIMATE_ROW_ITEM_DRAG_MIME_TYPE,
  LIBRARY_ITEM_DRAG_MIME_TYPE,
  readEstimateLibraryItemDragPayload,
  readEstimateRowItemDragPayload,
  type EstimateRowItemDragPayload,
} from "./constants";
import { EstimateRowColumnResizeHandle } from "./column-resize-handle";
import { EstimateMaterialCell, MoneyInput, type ExpressInsertDraftState, type MaterialVariantOption } from "./cells";
import { focusEstimateCellByRowId, handleEstimateCellKeyDown, handleEstimateInputCommitKeyDown } from "./cells-model";
import { isExpressComponentRow } from "@/lib/estimates/express-components";
import { formatQuantityUnitLabel } from "@/lib/estimates/format-quantity-unit-label";
import {
  buildEditableQuantityContingencyPatch,
  buildEditableQuantityContingencyPercentagePatch,
  formatSignedEditablePercentage,
  getEditableQuantityInputValue,
  getEditableRowAmounts,
  getInitialEditableRow,
  parseEditableAdjustmentPercentage,
  parseEditableQuantityExpression,
  parseNonNegativeEditableNumber,
  toEditableAdjustmentPercentage,
  toEditableContingencyPercentage,
  type EditableRowValue,
} from "./editable-row-model";
import {
  selectEditableRowCommitState,
  selectExternalRowMutationStatus,
  useEditableRowStore,
} from "./editable-row-store";

const ESTIMATE_PRIMARY_NUMERIC_CLASS = "!text-[10px] font-medium leading-3 tabular-nums text-ink";
const ESTIMATE_PRIMARY_NUMERIC_INPUT_CLASS =
  "h-5 border-0 !bg-transparent p-0 !text-[10px] font-medium leading-3 tabular-nums text-ink shadow-none [appearance:textfield] focus-visible:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";
const ESTIMATE_LOWER_RIGHT_META_CLASS = "absolute top-18 right-1 max-w-[calc(100%-8px)] truncate text-right !text-[10px] font-medium leading-3 tabular-nums text-tertiary";
const ESTIMATE_QUANTITY_BREAKDOWN_INPUT_CLASS =
  "h-[10px] w-7 border-0 !bg-transparent p-0 !text-[8px] font-medium leading-[10px] tabular-nums text-ink shadow-none [appearance:textfield] focus-visible:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

export type EstimateRowItemsTableProps = {
  canEditEstimate?: boolean;
  canManageLibrary?: boolean;
  items: EstimateRowItem[];
  brandOptions?: CreatableComboboxOption[];
  supplierOptions?: CreatableComboboxOption[];
  projectId?: string;
  estimateId?: string;
  estimateTabId?: string;
  targetNodeId: string;
  onInsertLibraryItem: (targetNodeId: string, libraryItem: EstimateRowItem) => void;
  onReplaceRowItem: (rowItemId: string, libraryItem: EstimateRowItem) => void;
  onDeleteRowItem: (rowItemId: string) => void;
  onOpenRowDetails: (rowItemId: string, opener: HTMLElement, tab?: RowDetailTab) => void;
  onOpenComponentEditor?: (rowItemId: string, opener: HTMLElement) => void;
  onClearRowComponent: (rowItemId: string) => void;
  onPromoteRowToLibrary: (rowItemId: string) => void;
  promotingRowId?: string | null;
  onMoveRowComponent: (sourceRowItemId: string, targetRowItemId: string, movedItem: EstimateRowItem) => void;
  onMoveRowItem: (rowItemId: string, targetNodeId: string, targetIndex: number) => void;
  onOpenMoveRowItemDialog?: (rowItemId: string, opener: HTMLElement) => void;
  onOpenReplaceComponentPicker?: (rowItemId: string, opener: HTMLElement) => void;
  onOpenMoveComponentPicker?: (rowItemId: string, opener: HTMLElement) => void;
  expressInsertDraftStates?: Record<string, ExpressInsertDraftState>;
  onRetryExpressDraft?: (rowItemId: string) => void;
  onDeleteExpressDraft?: (rowItemId: string) => void;
  selectedRowIds: ReadonlySet<string>;
  onToggleRowSelection: (rowItemId: string, checked: boolean) => void;
  onToggleRowsSelection: (rowItemIds: string[], checked: boolean) => void;
  onContributionChanged?: (receipt?: EstimateContributionBroadcastReceipt, contributionScopeId?: string) => void;
  columnResize?: EstimateTableColumnResizeConfig;
  virtualization?: {
    enabled?: boolean;
    minRows?: number;
    estimateRowHeight?: number;
    overscan?: number;
    useFlushSync?: boolean;
    initialViewportHeight?: number;
  };
};

export type EstimateTableColumnResizeConfig = {
  surfaceRef: RefObject<HTMLElement | null>;
  widths: EstimateColumnWidths;
  onCommitWidths: (widths: EstimateColumnWidths) => void;
  onResetWidths: () => void;
};

// The comparator slices shared sheet state per table: a keystroke in one
// area's table must not re-render every other table. Callback props must be
// identity-stable (useStableCallback in EstimateSheetContent) — a changed
// callback identity forces a re-render to avoid stale closures.
function areEstimateRowItemsTablePropsEqual(prev: EstimateRowItemsTableProps, next: EstimateRowItemsTableProps) {
  if (
    prev.items !== next.items ||
    prev.canEditEstimate !== next.canEditEstimate ||
    prev.canManageLibrary !== next.canManageLibrary ||
    prev.projectId !== next.projectId ||
    prev.estimateId !== next.estimateId ||
    prev.estimateTabId !== next.estimateTabId ||
    prev.targetNodeId !== next.targetNodeId ||
    prev.brandOptions !== next.brandOptions ||
    prev.supplierOptions !== next.supplierOptions ||
    prev.onInsertLibraryItem !== next.onInsertLibraryItem ||
    prev.onReplaceRowItem !== next.onReplaceRowItem ||
    prev.onDeleteRowItem !== next.onDeleteRowItem ||
    prev.onOpenRowDetails !== next.onOpenRowDetails ||
    prev.onOpenComponentEditor !== next.onOpenComponentEditor ||
    prev.onClearRowComponent !== next.onClearRowComponent ||
    prev.onPromoteRowToLibrary !== next.onPromoteRowToLibrary ||
    prev.onMoveRowComponent !== next.onMoveRowComponent ||
    prev.onMoveRowItem !== next.onMoveRowItem ||
    prev.onOpenMoveRowItemDialog !== next.onOpenMoveRowItemDialog ||
    prev.onOpenReplaceComponentPicker !== next.onOpenReplaceComponentPicker ||
    prev.onOpenMoveComponentPicker !== next.onOpenMoveComponentPicker ||
    prev.onRetryExpressDraft !== next.onRetryExpressDraft ||
    prev.onDeleteExpressDraft !== next.onDeleteExpressDraft ||
    prev.onToggleRowSelection !== next.onToggleRowSelection ||
    prev.onToggleRowsSelection !== next.onToggleRowsSelection ||
    prev.onContributionChanged !== next.onContributionChanged ||
    prev.virtualization !== next.virtualization
  ) {
    return false;
  }
  for (const item of next.items) {
    if (prev.selectedRowIds.has(item.id) !== next.selectedRowIds.has(item.id)) return false;
    if ((prev.promotingRowId === item.id) !== (next.promotingRowId === item.id)) return false;
    if (prev.expressInsertDraftStates?.[item.id] !== next.expressInsertDraftStates?.[item.id]) return false;
  }
  return true;
}

const noopExpressDraftHandler = () => undefined;
const noopCommitWidths = () => undefined;
const ESTIMATE_COLUMN_HELP: Partial<Record<EstimateColumnId, string>> = {
  material: "The material or component used for this line, including its unit cost.",
  commercial: "Remarks, quotation availability, and the VAT treatment required for this material.",
  quantity: "The total amount needed. You can enter a base quantity with a contingency amount, such as 10 + 1.",
  contingency: "Extra quantity added to the base quantity. It changes Qty before the subtotal is calculated.",
  subTotal: "Qty multiplied by the unit cost, before adjustment and miscellaneous cost.",
  adjustment: "A percentage applied to the subtotal. Use a positive value to add cost or a negative value for a discount.",
  miscCost: "An additional flat cost added after the subtotal and adjustment, such as delivery or consumables.",
  totalItemCosts: "Subtotal plus the adjustment and miscellaneous cost.",
};

type FocusedEstimateCell = { rowId: string; cellIndex: number };
type ScrollMarginAction = { type: "reset" } | { type: "measure"; value: number };
const ONBOARDING_TARGET_PREPARE_TIMEOUT_MS = 1_200;

function waitForOwnedEstimateElement(
  resolveElement: () => HTMLElement | null,
  signal: AbortSignal,
) {
  const immediate = resolveElement();
  if (immediate || signal.aborted) return Promise.resolve(immediate);

  return new Promise<HTMLElement | null>((resolve) => {
    let frameId = 0;
    let settled = false;
    const timeoutId = window.setTimeout(
      () => finish(null),
      ONBOARDING_TARGET_PREPARE_TIMEOUT_MS,
    );
    const finish = (element: HTMLElement | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      window.cancelAnimationFrame(frameId);
      signal.removeEventListener("abort", onAbort);
      resolve(element);
    };
    const check = () => {
      const element = resolveElement();
      if (element || signal.aborted) {
        finish(element);
        return;
      }
      frameId = window.requestAnimationFrame(check);
    };
    const onAbort = () => finish(null);
    signal.addEventListener("abort", onAbort, { once: true });
    frameId = window.requestAnimationFrame(check);
  });
}

function formatCompactNumber(value: number) {
  if (!Number.isFinite(value)) return "0";
  return String(Number(value.toFixed(6)));
}

function formatSignedCompactNumber(value: number) {
  if (value === 0) return "0";
  const magnitude = formatCompactNumber(Math.abs(value));
  return value > 0 ? `+${magnitude}` : `-${magnitude}`;
}

function formatQuantityBreakdownPercentage(value: string | number) {
  const parsed = typeof value === "number" ? value : parseEditableAdjustmentPercentage(value);
  return `${Number(Math.abs(parsed).toFixed(2))}%`;
}

function formatModePercentageInput(mode: "contingency" | "discount", value: string) {
  const trimmedValue = value.trim();
  if (trimmedValue === "") return mode === "discount" ? "-" : "";
  const unsignedValue = trimmedValue.replace(/^[+-]/, "");
  const parsedValue = parseNonNegativeEditableNumber(unsignedValue);
  if (parsedValue === 0 && !/[1-9]/.test(unsignedValue)) return unsignedValue || "0";
  return `${mode === "discount" ? "-" : "+"}${unsignedValue}`;
}

function formatSignedPercentageInput(value: string) {
  const trimmedValue = value.trim();
  if (trimmedValue === "" || trimmedValue === "-" || trimmedValue === "+") return trimmedValue;
  return formatSignedEditablePercentage(trimmedValue);
}

function normalizeSignedPercentageDraft(value: string) {
  const trimmedValue = value.trim();
  if (trimmedValue === "" || trimmedValue === "-" || trimmedValue === "+") return trimmedValue;
  const unsignedValue = trimmedValue.replace(/[+-]/g, "");
  if (trimmedValue.includes("-")) return unsignedValue ? `-${unsignedValue}` : "-";
  if (trimmedValue.includes("+")) return unsignedValue ? `+${unsignedValue}` : "+";
  return trimmedValue;
}

function getPercentageInputWidth(value: string) {
  return `${Math.min(Math.max(value.trim().length || 1, 1), 7)}ch`;
}

function readSignedPercentageDraft(value: string) {
  const trimmedValue = normalizeSignedPercentageDraft(value);
  const signedPercentage = parseEditableAdjustmentPercentage(trimmedValue);
  const isNegative = signedPercentage < 0 || trimmedValue.startsWith("-");
  return {
    mode: isNegative ? "discount" as const : "contingency" as const,
    percentage: trimmedValue.replace(/^[+-]/, ""),
  };
}

function scrollMarginReducer(current: number, action: ScrollMarginAction) {
  if (action.type === "reset") return 0;
  return Math.abs(current - action.value) < 0.5 ? current : action.value;
}

function EstimateColumnHeader({ columnId, label, compactLabel = label }: { columnId: EstimateColumnId; label: string; compactLabel?: string }) {
  const helpText = ESTIMATE_COLUMN_HELP[columnId];
  const responsiveLabel = (
    <span aria-label={label}>
      <span aria-hidden="true" data-estimate-column-label="full">{label}</span>
      <span aria-hidden="true" data-estimate-column-label="compact">{compactLabel}</span>
    </span>
  );
  if (!helpText) return responsiveLabel;

  return (
    <Tooltip label={helpText} side="top" contentClassName="z-[1200] max-w-64 whitespace-normal text-center leading-3">
      <span tabIndex={0} className="inline-flex cursor-help items-center gap-1 outline-none focus-visible:rounded-xs focus-visible:ring-1 focus-visible:ring-ink">
        {responsiveLabel}
        <Info size={11} weight="regular" aria-hidden="true" className="shrink-0 text-tertiary" />
      </span>
    </Tooltip>
  );
}

function handleSelectionCheckboxKeyDown(event: KeyboardEvent<HTMLInputElement>, onToggle: () => void) {
  if (event.key !== " " && event.key !== "Enter") return;
  event.preventDefault();
  event.stopPropagation();
  onToggle();
}

function findScrollParent(element: HTMLElement | null): HTMLElement | null {
  let parent = element?.parentElement ?? null;
  while (parent) {
    const style = window.getComputedStyle(parent);
    if (/(auto|scroll|overlay)/.test(`${style.overflow}${style.overflowY}${style.overflowX}`)) return parent;
    parent = parent.parentElement;
  }
  return element;
}

function getEstimateRowDropEdge(event: DragEvent<HTMLTableRowElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  return event.clientY < rect.top + rect.height / 2 ? "before" : "after";
}

function EstimateCommercialCellController({
  canEditEstimate,
  item,
  rowLabel,
  projectId,
  estimateId,
  onCommercialChanged,
}: {
  canEditEstimate: boolean;
  item: EstimateRowItem;
  rowLabel: string;
  projectId?: string;
  estimateId?: string;
  onCommercialChanged?: () => void;
}) {
  const editableRowStore = useEditableRowStore();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(item.commercialTermsRevision ?? 1);
  const [rowRevision, setRowRevision] = useState(item.rowRevision ?? 1);
  const [quotationAttachment, setQuotationAttachment] = useState(
    item.quotationAttachment ?? { attachmentState: "none" as const, hasAttachment: false },
  );
  const [quotationPickerOpen, setQuotationPickerOpen] = useState(false);
  const [quotationArtifacts, setQuotationArtifacts] = useState<EstimateQuotationOption[]>([]);
  const [quotationArtifactsLoading, setQuotationArtifactsLoading] = useState(false);
  const [selectedQuotationVersionId, setSelectedQuotationVersionId] = useState("");
  const [value, setValue] = useState<CommercialCellValue>({
    remarks: item.notes ?? "",
    quotationRequirement: item.quotationRequirement ?? "not_required",
    quotationStatus: item.quotationStatus ?? "not_requested",
    quotationReference: item.quotationReference ?? "",
    vatTreatment: item.commercialVatTreatment ?? "exclusive",
    vatRateBps: item.commercialVatRateBps ?? 1200,
  });

  function commit(next: Omit<CommercialCellValue, "remarks">) {
    if (!canEditEstimate || !projectId || !estimateId || pending) return;
    const previous = value;
    const optimistic = { ...value, ...next };
    setValue(optimistic);
    setPending(true);
    setError(null);
    void updateEstimateRowCommercialTerms({
      projectId,
      estimateId,
      rowId: item.id,
      mutationId: crypto.randomUUID(),
      expectedRowRevision: rowRevision,
      expectedTermsRevision: revision,
      overrideTreatment: optimistic.vatTreatment,
      overrideRateBps: optimistic.vatRateBps,
      quotationRequirement: optimistic.quotationRequirement,
      quotationStatus: optimistic.quotationStatus,
      quotationReference: optimistic.quotationReference || null,
    }).then((result) => {
      setRevision(result.termsRevision);
      setRowRevision(result.rowRevision);
      onCommercialChanged?.();
    }).catch((saveError: unknown) => {
      setValue(previous);
      setError(saveError instanceof Error ? saveError.message : "Commercial terms could not be saved.");
    }).finally(() => setPending(false));
  }

  function openQuotationPicker() {
    if (!projectId || pending) return;
    setQuotationPickerOpen(true);
    setQuotationArtifactsLoading(true);
    setError(null);
    if (!estimateId) return;
    void listEstimateQuotationOptions({ projectId, estimateId })
      .then((artifacts) => {
        setQuotationArtifacts(artifacts);
        setSelectedQuotationVersionId(artifacts[0]?.versionId ?? "");
      })
      .catch((loadError: unknown) => {
        setQuotationArtifacts([]);
        setSelectedQuotationVersionId("");
        setError(loadError instanceof Error ? loadError.message : "Quotation files could not be loaded.");
      })
      .finally(() => setQuotationArtifactsLoading(false));
  }

  function linkQuotation() {
    if (!projectId || !estimateId || !selectedQuotationVersionId || pending) return;
    setPending(true);
    setError(null);
    void linkEstimateRowQuotationAttachment({
      projectId,
      estimateId,
      rowId: item.id,
      mutationId: crypto.randomUUID(),
      expectedRowRevision: rowRevision,
      expectedTermsRevision: revision,
      quotationArtifactVersionId: selectedQuotationVersionId,
    }).then((result) => {
      setRevision(result.termsRevision);
      setRowRevision(result.rowRevision);
      setQuotationAttachment(result.quotationAttachment);
      setQuotationPickerOpen(false);
      onCommercialChanged?.();
    }).catch((linkError: unknown) => {
      setError(linkError instanceof Error ? linkError.message : "Quotation attachment could not be saved.");
    }).finally(() => setPending(false));
  }

  function unlinkQuotation() {
    if (!projectId || !estimateId || pending) return;
    setPending(true);
    setError(null);
    void unlinkEstimateRowQuotationAttachment({
      projectId,
      estimateId,
      rowId: item.id,
      mutationId: crypto.randomUUID(),
      expectedRowRevision: rowRevision,
      expectedTermsRevision: revision,
    }).then((result) => {
      setRevision(result.termsRevision);
      setRowRevision(result.rowRevision);
      setQuotationAttachment(result.quotationAttachment);
      onCommercialChanged?.();
    }).catch((unlinkError: unknown) => {
      setError(unlinkError instanceof Error ? unlinkError.message : "Quotation attachment could not be removed.");
    }).finally(() => setPending(false));
  }

  return (
    <>
      <CommercialCell
        rowLabel={rowLabel}
        value={value}
        disabled={!canEditEstimate}
        pending={pending}
        error={error}
        onRemarksCommit={(remarks) => {
          setValue((current) => ({ ...current, remarks }));
          editableRowStore.getState().stageRow(item, { notes: remarks });
          editableRowStore.getState().commitRowFields(item, { notes: remarks });
        }}
        onCommercialChange={commit}
      />
      <QuotationAttachmentControl
        {...quotationAttachment}
        canEdit={canEditEstimate && Boolean(projectId && estimateId)}
        pending={pending}
        error={null}
        onLinkRequested={openQuotationPicker}
        onUnlink={unlinkQuotation}
      />
      <Modal
        open={quotationPickerOpen}
        onOpenChange={setQuotationPickerOpen}
        title={`Quotation for ${rowLabel}`}
        description="Choose the current version of an active project quotation."
        size="sm"
        closeLabel="Close quotation selector"
        footer={(
          <>
            <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={() => setQuotationPickerOpen(false)}>Cancel</Button>
            <Button type="button" variant="primary" size="sm" disabled={pending || quotationArtifactsLoading || !selectedQuotationVersionId} onClick={linkQuotation}>
              {pending ? "Saving…" : "Attach quotation"}
            </Button>
          </>
        )}
      >
        {quotationArtifactsLoading ? (
          <output role="status" className="text-sm text-secondary">Loading project quotations…</output>
        ) : quotationArtifacts.length ? (
          <label className="grid gap-1 text-sm font-medium text-ink">
            Project quotation
            <select
              className="h-10 rounded-xs border border-hairline bg-white px-2 text-sm"
              value={selectedQuotationVersionId}
              onChange={(event) => setSelectedQuotationVersionId(event.currentTarget.value)}
            >
              {quotationArtifacts.map((artifact) => (
                <option key={artifact.versionId} value={artifact.versionId}>
                  {artifact.title}{artifact.revisionLabel ? ` — ${artifact.revisionLabel}` : ""}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="text-sm text-secondary">No active project quotations are available. Add one in Project Files first.</p>
        )}
      </Modal>
    </>
  );
}

type EstimateRowItemTableRowProps = {
  canEditEstimate: boolean;
  canManageLibrary: boolean;
  item: EstimateRowItem;
  brandOptions?: CreatableComboboxOption[];
  supplierOptions?: CreatableComboboxOption[];
  projectId?: string;
  estimateId?: string;
  estimateTabId?: string;
  rowIndex: number;
  selected: boolean;
  activeCellIndex: number | null;
  isReplaceTarget: boolean;
  setFocusedCell: Dispatch<SetStateAction<FocusedEstimateCell | null>>;
  setReplaceTargetRowId: Dispatch<SetStateAction<string>>;
  onInsertLibraryItem: (targetNodeId: string, libraryItem: EstimateRowItem) => void;
  onReplaceRowItem: (rowItemId: string, libraryItem: EstimateRowItem) => void;
  onDeleteRowItem: (rowItemId: string) => void;
  onOpenRowDetails: (rowItemId: string, opener: HTMLElement, tab?: RowDetailTab) => void;
  onOpenComponentEditor?: (rowItemId: string, opener: HTMLElement) => void;
  onClearRowComponent: (rowItemId: string) => void;
  onPromoteRowToLibrary: (rowItemId: string) => void;
  promotingRowId?: string | null;
  onMoveRowComponent: (sourceRowItemId: string, targetRowItemId: string, movedItem: EstimateRowItem) => void;
  onMoveRowItem: (rowItemId: string, targetNodeId: string, targetIndex: number) => void;
  onOpenMoveRowItemDialog?: (rowItemId: string, opener: HTMLElement) => void;
  onOpenReplaceComponentPicker?: (rowItemId: string, opener: HTMLElement) => void;
  onOpenMoveComponentPicker?: (rowItemId: string, opener: HTMLElement) => void;
  expressDraftState?: ExpressInsertDraftState;
  onRetryExpressDraft: (rowItemId: string) => void;
  onDeleteExpressDraft: (rowItemId: string) => void;
  onToggleRowSelection: (rowItemId: string, checked: boolean) => void;
  targetNodeId: string;
  rowIds: readonly string[];
  onRequestFocusByRowId: (rowId: string, cellIndex: number) => void;
  onExpressEditorActiveChange: (rowId: string, active: boolean) => void;
  onContributionChanged?: (receipt?: EstimateContributionBroadcastReceipt, contributionScopeId?: string) => void;
  style?: CSSProperties;
};

const EstimateRowItemTableRow = memo(function EstimateRowItemTableRow({
  canEditEstimate,
  canManageLibrary,
  item,
  brandOptions,
  supplierOptions,
  projectId,
  estimateId,
  estimateTabId,
  rowIndex,
  selected,
  activeCellIndex,
  isReplaceTarget,
  setFocusedCell,
  setReplaceTargetRowId,
  onInsertLibraryItem,
  onReplaceRowItem,
  onDeleteRowItem,
  onOpenRowDetails,
  onOpenComponentEditor,
  onClearRowComponent,
  onPromoteRowToLibrary,
  promotingRowId,
  onMoveRowComponent,
  onMoveRowItem,
  onOpenMoveRowItemDialog,
  onOpenReplaceComponentPicker,
  onOpenMoveComponentPicker,
  expressDraftState,
  onRetryExpressDraft,
  onDeleteExpressDraft,
  onToggleRowSelection,
  targetNodeId,
  rowIds,
  onRequestFocusByRowId,
  onExpressEditorActiveChange,
  onContributionChanged,
  style,
}: EstimateRowItemTableRowProps) {
  reportEstimateRowItemRender(item.id);
  const editableRowStore = useEditableRowStore();
  const {
    storedEditableRow,
    rowCommitState,
    externalRowMutationStatus,
    componentSyncPending,
  } = useStore(editableRowStore, useShallow((state) => ({
    storedEditableRow: state.rows[item.id],
    rowCommitState: selectEditableRowCommitState(state, item.id),
    externalRowMutationStatus: selectExternalRowMutationStatus(state, item.id),
    componentSyncPending: state.componentSyncPendingRowIds.has(item.id),
  })));
  const rowMutationStatus: EstimateRowMutationStatus | undefined = rowCommitState.phase === "pending"
    || rowCommitState.phase === "awaiting-confirmation"
    ? {
        phase: "pending",
        label: rowCommitState.phase === "awaiting-confirmation" ? "Awaiting confirmation" : "Saving row changes",
        startedAt: 0,
      }
    : rowCommitState.phase === "failed"
      ? {
          phase: "failed",
          label: rowCommitState.error ?? "Could not save the row change.",
          message: rowCommitState.error ?? undefined,
          startedAt: 0,
        }
      : externalRowMutationStatus;
  const isLinkedSharedComponent = Boolean(item.sourceLibraryItemId)
    && item.linkState !== "detached"
    && item.linkState !== "unlinked";
  const isInlineEditableComponentRow = isExpressComponentRow(item)
    || isBlankEstimateRowItem(item)
    || (isLinkedSharedComponent && canManageLibrary);
  const computedItem = useMemo(() => {
    const resolvedEditableRow = storedEditableRow ?? getInitialEditableRow(item);
    const amountEditableRow = isInlineEditableComponentRow ? resolvedEditableRow : { ...resolvedEditableRow, unitCost: String(item.itemCost) };
    const amounts = getEditableRowAmounts(item, amountEditableRow);
    return {
      ...item,
      itemCost: amounts.itemCost,
      storedQuantity: item.quantity,
      storedQuantityBase: item.quantityBase ?? null,
      storedQuantityContingencyAmount: item.quantityContingencyAmount ?? null,
      storedMaterial: item.material,
      storedDescription: item.description,
      storedSupplier: item.supplier,
      storedUnit: item.unit,
      storedUnitCost: item.itemCost,
      editableName: resolvedEditableRow.name,
      editableDescription: resolvedEditableRow.description,
      editableSupplier: resolvedEditableRow.supplier,
      editableUnit: resolvedEditableRow.unit,
      editableUnitCost: resolvedEditableRow.unitCost,
      editableImageUrl: resolvedEditableRow.imageUrl,
      editableSourceUrl: resolvedEditableRow.sourceUrl,
      storedMiscCost: item.miscCost,
      editableQuantity: resolvedEditableRow.quantity,
      editableQuantityExpression: resolvedEditableRow.quantityExpression,
      editableQuantityBase: resolvedEditableRow.quantityBase,
      editableQuantityContingencyAmount: resolvedEditableRow.quantityContingencyAmount,
      editableQuantityInput: getEditableQuantityInputValue(resolvedEditableRow),
      editableContingencyMode: resolvedEditableRow.contingencyMode,
      editableContingencyPercentage: resolvedEditableRow.contingencyPercentage,
      storedAdjustmentPercentage: item.adjustmentPercentage ?? (item.quantityBase === null || item.quantityBase === undefined ? item.contingencyPercentage ?? 0 : 0),
      editableAdjustmentPercentage: resolvedEditableRow.adjustmentPercentage,
      editableMiscCost: resolvedEditableRow.miscCost,
      quantity: amounts.quantity,
      quantityBase: amounts.quantityBase,
      quantityContingencyAmount: amounts.quantityContingencyAmount,
      contingencyPercentage: amounts.contingencyPercentage,
      contingencyValue: amounts.contingencyValue,
      adjustmentPercentage: amounts.adjustmentPercentage,
      adjustmentValue: amounts.adjustmentValue,
      miscCost: amounts.miscCost,
      subTotal: amounts.subTotal,
      totalItemCosts: amounts.totalItemCosts,
      isQuantityContingency: amounts.isQuantityContingency,
    };
  }, [isInlineEditableComponentRow, item, storedEditableRow]);
  const resolvedEditableRow = storedEditableRow ?? getInitialEditableRow(item);
  const computedItemLabel = isInlineEditableComponentRow
    ? computedItem.editableName || "Project Component"
    : computedItem.material || "component";
  const editableContingencyColumnPercentage = formatModePercentageInput(resolvedEditableRow.contingencyMode, resolvedEditableRow.contingencyPercentage);
  const editableAdjustmentColumnPercentage = formatSignedPercentageInput(resolvedEditableRow.adjustmentPercentage);
  const rowContingencyQuantity = computedItem.quantityContingencyAmount ?? 0;
  const rowAdjustmentValue = computedItem.adjustmentValue;
  const [quantityInputFocused, setQuantityInputFocused] = useState(false);
  const [quantityInputDraft, setQuantityInputDraft] = useState<string | null>(null);
  const [quantityCellHovered, setQuantityCellHovered] = useState(false);
  const [quantityBreakdownFocused, setQuantityBreakdownFocused] = useState(false);
  const pendingQuantityDraftRef = useRef<string | null>(null);
  const quantityDraftFrameIdRef = useRef(0);
  const rowActionTriggerRef = useRef<HTMLButtonElement | null>(null);
  const quantityHasContingency = computedItem.quantityContingencyAmount !== null && computedItem.quantityContingencyAmount !== 0;
  const quantityBreakdownVisible = quantityHasContingency && (quantityCellHovered || quantityBreakdownFocused);
  const quantityDisplayValue = quantityInputDraft ?? (quantityInputFocused ? computedItem.editableQuantityInput : formatCompactNumber(computedItem.quantity));
  const activeQuantityUnit = isInlineEditableComponentRow ? computedItem.editableUnit : computedItem.unit;
  const quantityDisplayUnit = activeQuantityUnit.trim() || computedItem.unit.trim() || "unit";
  const quantityUnitLabel = formatQuantityUnitLabel(computedItem.quantity, quantityDisplayUnit);
  const rowContingencyQuantityUnitLabel = formatQuantityUnitLabel(rowContingencyQuantity, quantityDisplayUnit);
  const [rowDropEdge, setRowDropEdge] = useState<"before" | "after" | null>(null);
  const [contributionPending, setContributionPending] = useState(false);
  const [contributionError, setContributionError] = useState<string | null>(null);
  const rowMutationPending = rowMutationStatus?.phase === "pending";
  const duplicateRowItemDisabled = Boolean(expressDraftState) || rowMutationPending || componentSyncPending;

  function handleQuantityCellMouseLeave() {
    setQuantityCellHovered(false);
  }

  function handleQuantityCellBlur(event: FocusEvent<HTMLTableCellElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setQuantityBreakdownFocused(false);
  }

  function handleRowItemDragStart(event: DragEvent<HTMLButtonElement>) {
    if (!canEditEstimate) return;
    const payload: EstimateRowItemDragPayload = {
      rowItemId: computedItem.id,
      sourceNodeId: targetNodeId,
      label: computedItemLabel,
    };
    event.stopPropagation();
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(ESTIMATE_ROW_ITEM_DRAG_MIME_TYPE, JSON.stringify(payload));
    event.dataTransfer.setData("text/plain", computedItemLabel);
    beginEstimateWorkshopDrag({
      kind: "estimate-row-item",
      rowItemId: computedItem.id,
      rowLabel: computedItemLabel,
      sourceNodeId: targetNodeId,
    });
  }

  function handleRowItemDragOver(event: DragEvent<HTMLTableRowElement>) {
    if (!canEditEstimate) return;
    if (!event.dataTransfer.types.includes(ESTIMATE_ROW_ITEM_DRAG_MIME_TYPE)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    setRowDropEdge(getEstimateRowDropEdge(event));
  }

  function handleRowItemDrop(event: DragEvent<HTMLTableRowElement>) {
    if (!canEditEstimate) return;
    const payload = readEstimateRowItemDragPayload(event.dataTransfer.getData(ESTIMATE_ROW_ITEM_DRAG_MIME_TYPE));
    const targetEdge = getEstimateRowDropEdge(event);
    setRowDropEdge(null);
    if (!payload) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    endEstimateWorkshopDrag();
    onMoveRowItem(payload.rowItemId, targetNodeId, targetEdge === "after" ? rowIndex + 1 : rowIndex);
  }

  function updateExpressEditableRow(values: Partial<EditableRowValue>) {
    if (!canEditEstimate) return;
    editableRowStore.getState().stageRow(item, values);
  }

  function commitExpressFields(values: Partial<EditableRowValue>) {
    if (!canEditEstimate) return;
    const nextValues = { ...resolvedEditableRow, ...values };
    const patch: Partial<EditableRowValue> = {};
    if (values.name !== undefined && nextValues.name !== item.material) patch.name = nextValues.name;
    if (values.description !== undefined && nextValues.description !== item.description) patch.description = nextValues.description;
    if (values.brand !== undefined && nextValues.brand !== (item.brand ?? "")) patch.brand = nextValues.brand;
    if (values.supplier !== undefined && nextValues.supplier !== item.supplier) patch.supplier = nextValues.supplier;
    if (values.unit !== undefined && nextValues.unit !== item.unit) patch.unit = nextValues.unit;
    if (values.unitCost !== undefined && parseNonNegativeEditableNumber(nextValues.unitCost) !== item.itemCost) patch.unitCost = nextValues.unitCost;
    if (values.priceOptionLabel !== undefined && nextValues.priceOptionLabel !== item.priceOptionLabel) patch.priceOptionLabel = nextValues.priceOptionLabel;
    if (values.priceOptions !== undefined) patch.priceOptions = values.priceOptions;
    if (values.imageUrl !== undefined && nextValues.imageUrl !== (item.imageUrl ?? "")) patch.imageUrl = nextValues.imageUrl;
    if (values.imageAsset !== undefined) patch.imageAsset = values.imageAsset;
    if (values.sourceUrl !== undefined && nextValues.sourceUrl !== (item.sourceUrl ?? "")) patch.sourceUrl = nextValues.sourceUrl;
    if (Object.keys(patch).length === 0) {
      editableRowStore.getState().commitRowFields(item, {});
      return;
    }
    editableRowStore.getState().commitRowFields(item, patch);
  }

  function commitExpressImageFields(values: Partial<EditableRowValue>) {
    if (!canEditEstimate) return Promise.reject(new Error("You do not have permission to edit this estimate."));
    const nextValues = { ...resolvedEditableRow, ...values };
    const patch: Partial<EditableRowValue> = {};
    if (values.imageUrl !== undefined && nextValues.imageUrl !== (item.imageUrl ?? "")) patch.imageUrl = nextValues.imageUrl;
    if (values.imageAsset !== undefined) patch.imageAsset = values.imageAsset;
    return editableRowStore.getState().commitRowFieldsAwaited(item, patch);
  }

  function updateQuantityFields(values: Partial<EditableRowValue>) {
    if (!canEditEstimate) return;
    editableRowStore.getState().stageRow(computedItem, values);
  }

  function updateQuantityDraft(value: string) {
    if (!canEditEstimate) return;
    const parsed = parseEditableQuantityExpression(item, value);
    if (parsed.ok) updateQuantityFields(parsed.patch);
    else updateQuantityFields({ quantityExpression: value });
  }

  function scheduleQuantityDraft(value: string) {
    pendingQuantityDraftRef.current = value;
    if (quantityDraftFrameIdRef.current) return;
    quantityDraftFrameIdRef.current = window.requestAnimationFrame(() => {
      quantityDraftFrameIdRef.current = 0;
      const pendingValue = pendingQuantityDraftRef.current;
      pendingQuantityDraftRef.current = null;
      if (pendingValue !== null) updateQuantityDraft(pendingValue);
    });
  }

  useEffect(() => () => {
    if (quantityDraftFrameIdRef.current) window.cancelAnimationFrame(quantityDraftFrameIdRef.current);
  }, []);

  function commitQuantityFields(values: Partial<EditableRowValue>) {
    if (!canEditEstimate) return;
    const nextRow = { ...resolvedEditableRow, ...values };
    const nextAmounts = getEditableRowAmounts(item, nextRow);
    const didQuantityChange = nextAmounts.quantity !== computedItem.storedQuantity
      || nextAmounts.quantityBase !== computedItem.storedQuantityBase
      || nextAmounts.quantityContingencyAmount !== computedItem.storedQuantityContingencyAmount;
    if (!didQuantityChange) {
      editableRowStore.getState().commitRowFields(computedItem, {});
      return;
    }
    editableRowStore.getState().commitRowFields(computedItem, {
      quantity: String(nextAmounts.quantity),
      quantityExpression: nextRow.quantityExpression,
      quantityBase: nextAmounts.quantityBase === null ? "" : String(nextAmounts.quantityBase),
      quantityContingencyAmount: nextAmounts.quantityContingencyAmount === null ? "" : String(nextAmounts.quantityContingencyAmount),
      contingencyMode: nextAmounts.contingencyPercentage < 0 ? "discount" : "contingency",
      contingencyPercentage: toEditableContingencyPercentage(nextAmounts.contingencyPercentage),
    });
  }

  function updateQuantityBreakdown(field: "base" | "contingency", value: string) {
    if (!canEditEstimate) return;
    const patch = buildEditableQuantityContingencyPatch(
      field === "base" ? value : computedItem.editableQuantityBase,
      field === "contingency" ? value : computedItem.editableQuantityContingencyAmount,
    );
    updateQuantityFields(patch);
  }

  function updateContingencyPercentageDraft(value: string) {
    if (!canEditEstimate) return;
    const draft = readSignedPercentageDraft(value);
    editableRowStore.getState().stageRow(computedItem, {
      contingencyMode: draft.mode,
      contingencyPercentage: draft.percentage,
    });
  }

  function updateAdjustmentPercentageDraft(value: string) {
    if (!canEditEstimate) return;
    editableRowStore.getState().stageRow(computedItem, {
      adjustmentPercentage: normalizeSignedPercentageDraft(value),
    });
  }

  function commitRowAdjustmentPercentage(sourceValue: string) {
    if (!canEditEstimate) return;
    const nextAdjustmentPercentage = toEditableAdjustmentPercentage(parseEditableAdjustmentPercentage(normalizeSignedPercentageDraft(sourceValue)));
    editableRowStore.getState().stageRow(computedItem, {
      adjustmentPercentage: nextAdjustmentPercentage,
    });
    if (parseEditableAdjustmentPercentage(nextAdjustmentPercentage) === computedItem.storedAdjustmentPercentage) {
      editableRowStore.getState().commitRowFields(computedItem, {});
      return;
    }
    editableRowStore.getState().commitRowFields(computedItem, {
      adjustmentPercentage: nextAdjustmentPercentage,
    });
  }

  function commitContingencyPercentage(sourceValue: string) {
    if (!canEditEstimate) return;
    if (!computedItem.isQuantityContingency && parseEditableAdjustmentPercentage(sourceValue) === 0) {
      editableRowStore.getState().stageRow(computedItem, {
        contingencyMode: "contingency",
        contingencyPercentage: "0",
      });
      editableRowStore.getState().commitRowFields(computedItem, {});
      return;
    }
    const baseQuantityValue = computedItem.editableQuantityBase || computedItem.editableQuantity;
    const patch = buildEditableQuantityContingencyPercentagePatch(baseQuantityValue, sourceValue);
    editableRowStore.getState().stageRow(computedItem, patch);
    commitQuantityFields(patch);
  }

  function selectMaterialVariant(priceOption: MaterialVariantOption) {
    editableRowStore.getState().commitSelectedVariant(computedItem, priceOption);
  }

  function selectAlternative() {
    const group = item.alternativeGroup;
    if (!canEditEstimate || !projectId || !estimateId || !estimateTabId || !item.contributionScopeId || !group || contributionPending) return;
    setContributionPending(true);
    setContributionError(null);
    const mutationId = crypto.randomUUID();
    void selectEstimateAlternativeAction({
      projectId,
      estimateId,
      estimateTabId,
      contributionScopeId: item.contributionScopeId,
      groupId: group.id,
      selectedRowItemId: item.id,
      expectedGroupRevision: group.revision,
      expectedContributionRevision: item.contributionRevision ?? 1,
      intentId: mutationId,
    }).then((result) => {
      onContributionChanged?.({
        delivery: "server_mutation",
        changed: result.changed,
        scopeRevision: result.contributionRevision,
        mutationId,
        changedRowIds: [item.id],
        changedGroupIds: [group.id],
      }, item.contributionScopeId);
    }).catch((error: unknown) => {
      setContributionError(error instanceof Error ? error.message : "This material option could not be selected.");
    }).finally(() => setContributionPending(false));
  }

  function toggleOptionalContribution() {
    const optional = item.optionalContribution;
    if (!canEditEstimate || !projectId || !estimateId || !estimateTabId || !item.contributionScopeId || !optional || contributionPending) return;
    setContributionPending(true);
    setContributionError(null);
    const mutationId = crypto.randomUUID();
    void setEstimateOptionalInclusionAction({
      projectId,
      estimateId,
      estimateTabId,
      contributionScopeId: item.contributionScopeId,
      rowItemId: item.id,
      isIncluded: !optional.isIncluded,
      expectedOptionalRevision: optional.revision,
      expectedContributionRevision: item.contributionRevision ?? 1,
      intentId: mutationId,
    }).then((result) => {
      onContributionChanged?.({
        delivery: "server_mutation",
        changed: result.changed,
        scopeRevision: result.contributionRevision,
        mutationId,
        changedRowIds: [item.id],
      }, item.contributionScopeId);
    }).catch((error: unknown) => {
      setContributionError(error instanceof Error ? error.message : "This optional material could not be updated.");
    }).finally(() => setContributionPending(false));
  }


  return (
    <tr
      className={cn(
        "group/estimate-row grid min-h-24 border-b border-hairline/70 last:border-b-0 hover:bg-neutral-50",
        !isInlineEditableComponentRow && "[contain-intrinsic-size:96px] [content-visibility:auto]",
        activeCellIndex !== null && "bg-[#F6FAFF] shadow-[inset_2px_0_0_rgba(37,99,235,0.70)]",
        rowDropEdge === "before" && "shadow-[inset_0_2px_0_rgba(37,99,235,0.85)]",
        rowDropEdge === "after" && "shadow-[inset_0_-2px_0_rgba(37,99,235,0.85)]",
      )}
      style={{ ...style, gridTemplateColumns: ESTIMATE_COLUMN_TEMPLATE }}
      data-estimate-row-active={activeCellIndex !== null ? "true" : undefined}
      data-estimate-row-id={computedItem.id}
      data-estimate-row-drop-edge={rowDropEdge ?? undefined}
      data-estimate-row-mutation-status={rowMutationStatus?.phase}
      aria-busy={rowMutationPending ? true : undefined}
      onDragOver={canEditEstimate ? handleRowItemDragOver : undefined}
      onDragLeave={canEditEstimate ? () => setRowDropEdge(null) : undefined}
      onDrop={canEditEstimate ? handleRowItemDrop : undefined}
    >
      <td className="relative flex items-center justify-center border-r border-hairline text-[9px] font-sans tabular-nums text-tertiary">
        {String(rowIndex + 1).padStart(2, "0")}
        {rowMutationStatus ? (
          <output className="sr-only" aria-label={`${computedItemLabel} mutation status`}>
            {rowMutationStatus.label}
          </output>
        ) : null}
      </td>
      <td className="relative grid grid-cols-1 place-content-center justify-items-center gap-1 border-r border-hairline py-2 text-tertiary" data-estimate-row-select-cell="">
        {canEditEstimate && onOpenMoveRowItemDialog ? (
          <Tooltip label="Move row" side="right" contentClassName="z-[1200]">
            <button
              type="button"
              draggable
              className="grid size-6 cursor-grab place-items-center rounded-xs text-tertiary opacity-0 transition hover:bg-surfaceMuted hover:text-ink hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus/50 active:cursor-grabbing group-hover/estimate-row:opacity-100 group-focus-within/estimate-row:opacity-100 [@media(pointer:coarse)]:hidden"
              aria-label={`Move row ${computedItemLabel}`}
              aria-haspopup="dialog"
              data-estimate-row-drag-handle=""
              onDragStart={handleRowItemDragStart}
              onClick={(event) => onOpenMoveRowItemDialog(computedItem.id, event.currentTarget)}
            >
              <DotsSixVertical size={14} weight="regular" aria-hidden="true" />
            </button>
          </Tooltip>
        ) : (
          <span className="size-6" aria-hidden="true" />
        )}
        {canEditEstimate ? (
          <span className="flex size-6 items-center justify-center">
            <SelectionCheckbox
              checked={selected}
              tone="blue"
              ariaLabel={`Select ${computedItemLabel}`}
              tabIndex={0}
              uncheckedRevealClassName="group-hover/estimate-row:opacity-100 group-focus-within/estimate-row:opacity-100"
              onClick={(event) => {
                event.stopPropagation();
                onToggleRowSelection(computedItem.id, !selected);
              }}
              onKeyDown={(event) => handleSelectionCheckboxKeyDown(event, () => onToggleRowSelection(computedItem.id, !selected))}
            />
          </span>
        ) : (
          <span className="size-6" aria-hidden="true" />
        )}
        {item.alternativeGroup ? (
          <Tooltip
            label={item.alternativeGroup.selectedRowItemId === item.id ? "Selected material option" : "Use this material option"}
            side="right"
            contentClassName="z-[1200]"
          >
            <button
              type="button"
              className={cn(
                "grid size-6 place-items-center rounded-full border text-[9px] font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus/60",
                item.alternativeGroup.selectedRowItemId === item.id
                  ? "border-brand-orange bg-brand-orange text-white"
                  : "border-hairline bg-white text-secondary hover:border-brand-orange hover:text-brand-orange",
              )}
              aria-label={`${item.alternativeGroup.selectedRowItemId === item.id ? "Selected" : "Select"} ${computedItemLabel} for ${item.alternativeGroup.name || "material options"}`}
              aria-pressed={item.alternativeGroup.selectedRowItemId === item.id}
              disabled={!canEditEstimate || contributionPending}
              onClick={selectAlternative}
            >
              V
            </button>
          </Tooltip>
        ) : item.optionalContribution ? (
          <Tooltip label={item.optionalContribution.isIncluded ? "Optional material included" : "Optional material excluded"} side="right" contentClassName="z-[1200]">
            <button
              type="button"
              className={cn(
                "grid size-6 place-items-center rounded-xs border text-[9px] font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus/60",
                item.optionalContribution.isIncluded ? "border-info bg-infoSoft text-info" : "border-hairline bg-white text-tertiary",
              )}
              aria-label={`${item.optionalContribution.isIncluded ? "Exclude" : "Include"} optional material ${computedItemLabel}`}
              aria-pressed={item.optionalContribution.isIncluded}
              disabled={!canEditEstimate || contributionPending}
              onClick={toggleOptionalContribution}
            >
              O
            </button>
          </Tooltip>
        ) : item.accessoryParent || item.accessoryChildren?.length ? (
          <Tooltip
            label={item.accessoryParent ? "Accessory material" : `${item.accessoryChildren?.length ?? 0} linked accessories`}
            side="right"
            contentClassName="z-[1200]"
          >
            <span className="grid size-6 place-items-center rounded-xs border border-hairline bg-surfaceMuted text-[9px] font-semibold text-secondary" aria-label={item.accessoryParent ? "Accessory material" : `${item.accessoryChildren?.length ?? 0} linked accessories`}>
              A{item.accessoryChildren?.length ? item.accessoryChildren.length : ""}
            </span>
          </Tooltip>
        ) : (
          <span className="size-6" aria-hidden="true" />
        )}
        {contributionError ? <output className="sr-only" role="alert">{contributionError}</output> : null}
      </td>
      <td className="min-w-0 border-r border-hairline">
        <EstimateMaterialCell
          canEditEstimate={canEditEstimate}
          canManageLibrary={canManageLibrary}
          componentSyncPending={componentSyncPending || Boolean(rowMutationStatus?.phase === "pending" && rowMutationStatus.componentSync)}
          item={computedItem}
          rowIndex={rowIndex}
          editableRow={resolvedEditableRow}
          brandOptions={brandOptions}
          supplierOptions={supplierOptions}
          projectId={projectId}
          estimateId={estimateId}
          isReplaceTarget={isReplaceTarget}
          onExpressEditorActiveChange={(active) => onExpressEditorActiveChange(computedItem.id, active)}
          onExpressFieldChange={updateExpressEditableRow}
          onExpressFieldCommit={commitExpressFields}
          onExpressImageCommit={commitExpressImageFields}
          onExpressFieldRevert={(field) => {
            const initialRow = getInitialEditableRow(item);
            editableRowStore.getState().stageRow(item, { [field]: initialRow[field] });
            onExpressEditorActiveChange(computedItem.id, false);
            editableRowStore.getState().commitRowFields(computedItem, {});
          }}
          onReplaceDragOver={() => setReplaceTargetRowId(computedItem.id)}
          onReplaceDragLeave={() => setReplaceTargetRowId((current) => (current === computedItem.id ? "" : current))}
          onReplace={(libraryItem) =>
            onReplaceRowItem(computedItem.id, {
              ...libraryItem,
              quantity: computedItem.quantity,
              quantityBase: computedItem.quantityBase,
              quantityContingencyAmount: computedItem.quantityContingencyAmount,
              contingencyPercentage: computedItem.contingencyPercentage,
              contingencyValue: computedItem.contingencyValue,
              adjustmentPercentage: computedItem.adjustmentPercentage,
              adjustmentValue: computedItem.adjustmentValue,
              miscCost: computedItem.miscCost,
            })
          }
          onClearComponent={() => {
            if (isInlineEditableComponentRow) onDeleteRowItem(computedItem.id);
            else onClearRowComponent(computedItem.id);
          }}
          onRequestProjectSpecific={() => editableRowStore.getState().requestMakeProjectSpecific(computedItem)}
          onPromoteToLibrary={() => onPromoteRowToLibrary(computedItem.id)}
          promoteToLibraryPending={promotingRowId === computedItem.id}
          onMoveComponent={onMoveRowComponent}
          onOpenReplacePicker={onOpenReplaceComponentPicker ? (opener) => onOpenReplaceComponentPicker(computedItem.id, opener) : undefined}
          onOpenMovePicker={onOpenMoveComponentPicker ? (opener) => onOpenMoveComponentPicker(computedItem.id, opener) : undefined}
          onOpenComponentEditor={onOpenComponentEditor ? (opener) => onOpenComponentEditor(computedItem.id, opener) : undefined}
          onSelectVariant={selectMaterialVariant}
          expressDraftState={expressDraftState}
          onRetryExpressDraft={() => onRetryExpressDraft(computedItem.id)}
          onDeleteExpressDraft={() => onDeleteExpressDraft(computedItem.id)}
        />
      </td>
      <td className="min-w-0 border-r border-hairline">
        <EstimateCommercialCellController
          key={`${item.id}:${item.rowRevision ?? 0}:${item.commercialTermsRevision ?? 0}`}
          canEditEstimate={canEditEstimate}
          item={item}
          rowLabel={computedItemLabel}
          projectId={projectId}
          estimateId={estimateId}
          onCommercialChanged={onContributionChanged}
        />
      </td>
      <td
        className={cn(
          "group/qty-cell relative flex flex-col items-center justify-center border-r border-hairline px-1 text-center",
          activeCellIndex === 0 && "ring-1 ring-inset ring-accent/30",
        )}
        data-estimate-cell-active={activeCellIndex === 0 ? "true" : undefined}
        onMouseEnter={() => setQuantityCellHovered(true)}
        onMouseLeave={handleQuantityCellMouseLeave}
        onFocusCapture={() => setQuantityBreakdownFocused(true)}
        onBlurCapture={handleQuantityCellBlur}
      >
        <ControlInput
          type="text"
          inputMode="decimal"
          value={quantityDisplayValue}
          disabled={!canEditEstimate}
          onChange={(event) => {
            setQuantityInputFocused(true);
            setQuantityInputDraft(event.target.value);
            scheduleQuantityDraft(event.target.value);
          }}
          onFocus={() => {
            setQuantityInputFocused(true);
            setQuantityInputDraft(computedItem.editableQuantityInput);
            setFocusedCell({ rowId: computedItem.id, cellIndex: 0 });
          }}
          onBlur={(event) => {
            if (quantityDraftFrameIdRef.current) window.cancelAnimationFrame(quantityDraftFrameIdRef.current);
            quantityDraftFrameIdRef.current = 0;
            pendingQuantityDraftRef.current = null;
            setQuantityInputFocused(false);
            setQuantityInputDraft(null);
            setFocusedCell((current) => (current?.rowId === computedItem.id && current.cellIndex === 0 ? null : current));
            const parsed = parseEditableQuantityExpression(item, event.currentTarget.value);
            if (!parsed.ok) {
              const initialRow = getInitialEditableRow(item);
              updateQuantityFields({
                quantity: initialRow.quantity,
                quantityExpression: initialRow.quantityExpression,
                quantityBase: initialRow.quantityBase,
                quantityContingencyAmount: initialRow.quantityContingencyAmount,
                contingencyMode: initialRow.contingencyMode,
                contingencyPercentage: initialRow.contingencyPercentage,
              });
              editableRowStore.getState().commitRowFields(computedItem, {});
              return;
            }
            updateQuantityFields(parsed.patch);
            commitQuantityFields(parsed.patch);
          }}
          onKeyDown={(event) => handleEstimateCellKeyDown(event, rowIndex, 0, rowIds, onRequestFocusByRowId)}
          data-estimate-row-index={rowIndex}
          data-estimate-row-id={computedItem.id}
          data-estimate-cell-index={0}
          aria-label={`${computedItemLabel} quantity`}
          align="center"
          className={ESTIMATE_PRIMARY_NUMERIC_INPUT_CLASS}
        />
        {quantityBreakdownVisible ? (
          <dl
            className="absolute left-1 right-1 top-2 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-1 gap-y-0.5 text-[8px] font-medium leading-[10px] text-tertiary transition-opacity"
            aria-label={`${computedItemLabel} quantity breakdown`}
          >
            <dt className="text-right">Value</dt>
            <dd className="justify-self-end">
              <ControlInput
                type="number"
                min="0"
                step="0.01"
                value={computedItem.editableQuantityBase}
                disabled={!canEditEstimate}
                aria-label={`${computedItemLabel} base quantity`}
                align="right"
                className={ESTIMATE_QUANTITY_BREAKDOWN_INPUT_CLASS}
                onFocus={() => setFocusedCell({ rowId: computedItem.id, cellIndex: 0 })}
                onChange={(event) => updateQuantityBreakdown("base", event.target.value)}
                onKeyDown={handleEstimateInputCommitKeyDown}
                onBlur={(event) => {
                  setFocusedCell((current) => (current?.rowId === computedItem.id && current.cellIndex === 0 ? null : current));
                  commitQuantityFields(buildEditableQuantityContingencyPatch(event.currentTarget.value, computedItem.editableQuantityContingencyAmount));
                }}
              />
            </dd>
            <dt className="text-right">Contingency</dt>
            <dd className="flex justify-end gap-1 text-right tabular-nums">
              <ControlInput
                type="text"
                inputMode="decimal"
                step="0.01"
                value={computedItem.editableQuantityContingencyAmount}
                disabled={!canEditEstimate}
                aria-label={`${computedItemLabel} quantity adjustment`}
                align="right"
                className={ESTIMATE_QUANTITY_BREAKDOWN_INPUT_CLASS}
                onFocus={() => setFocusedCell({ rowId: computedItem.id, cellIndex: 0 })}
                onChange={(event) => updateQuantityBreakdown("contingency", event.target.value)}
                onKeyDown={handleEstimateInputCommitKeyDown}
                onBlur={(event) => {
                  setFocusedCell((current) => (current?.rowId === computedItem.id && current.cellIndex === 0 ? null : current));
                  commitQuantityFields(buildEditableQuantityContingencyPatch(computedItem.editableQuantityBase, event.currentTarget.value));
                }}
              />
              <span className="text-tertiary">- {formatQuantityBreakdownPercentage(computedItem.contingencyPercentage)}</span>
            </dd>
          </dl>
        ) : null}
        {quantityUnitLabel ? <p className={ESTIMATE_LOWER_RIGHT_META_CLASS}>{quantityUnitLabel}</p> : null}
      </td>
      <td
        className={cn(
          "relative flex items-center justify-center border-r border-hairline px-1 py-1 text-center",
          activeCellIndex === 1 && "ring-1 ring-inset ring-accent/30",
        )}
        data-estimate-cell-active={activeCellIndex === 1 ? "true" : undefined}
      >
        <div className="relative grid h-full w-full min-w-0 place-items-center">
          <div className="flex h-5 items-baseline justify-center leading-none">
            <ControlInput
              type="text"
              inputMode="decimal"
              step="0.01"
              value={editableContingencyColumnPercentage}
              disabled={!canEditEstimate}
              onChange={(event) => updateContingencyPercentageDraft(event.target.value)}
              onFocus={() => setFocusedCell({ rowId: computedItem.id, cellIndex: 1 })}
              onBlur={(event) => {
                setFocusedCell((current) => (current?.rowId === computedItem.id && current.cellIndex === 1 ? null : current));
                commitContingencyPercentage(event.currentTarget.value);
              }}
              onKeyDown={(event) => handleEstimateCellKeyDown(event, rowIndex, 1, rowIds, onRequestFocusByRowId)}
              data-estimate-row-index={rowIndex}
              data-estimate-row-id={computedItem.id}
              data-estimate-cell-index={1}
              aria-label={`${computedItemLabel} contingency percentage`}
              align="center"
              className={cn(ESTIMATE_PRIMARY_NUMERIC_INPUT_CLASS, "text-right")}
              style={{ width: getPercentageInputWidth(editableContingencyColumnPercentage) }}
            />
            <span className={ESTIMATE_PRIMARY_NUMERIC_CLASS} aria-hidden="true">%</span>
          </div>
        </div>
        {rowContingencyQuantity !== 0 ? (
          <p className={cn(ESTIMATE_LOWER_RIGHT_META_CLASS, rowContingencyQuantity < 0 ? "text-danger" : "text-tertiary")}>
            {rowContingencyQuantityUnitLabel ? `${formatSignedCompactNumber(rowContingencyQuantity)} ${rowContingencyQuantityUnitLabel}` : formatSignedCompactNumber(rowContingencyQuantity)}
          </p>
        ) : null}
      </td>
      <td className="flex items-center justify-center border-r border-hairline px-1 text-center">
        <p className={ESTIMATE_PRIMARY_NUMERIC_CLASS}>{pesoFormatter.format(computedItem.subTotal).replace("₱", "₱ ")}</p>
      </td>
      <td
        className={cn(
          "relative flex items-center justify-center border-r border-hairline px-1 py-1 text-center",
          activeCellIndex === 2 && "ring-1 ring-inset ring-accent/30",
        )}
        data-estimate-cell-active={activeCellIndex === 2 ? "true" : undefined}
      >
        <div className="relative grid h-full w-full min-w-0 place-items-center">
          <div className="flex h-5 items-baseline justify-center leading-none">
            <ControlInput
              type="text"
              inputMode="decimal"
              step="0.01"
              value={editableAdjustmentColumnPercentage}
              disabled={!canEditEstimate}
              onChange={(event) => updateAdjustmentPercentageDraft(event.target.value)}
              onFocus={() => setFocusedCell({ rowId: computedItem.id, cellIndex: 2 })}
              onBlur={(event) => {
                setFocusedCell((current) => (current?.rowId === computedItem.id && current.cellIndex === 2 ? null : current));
                commitRowAdjustmentPercentage(event.currentTarget.value);
              }}
              onKeyDown={(event) => handleEstimateCellKeyDown(event, rowIndex, 2, rowIds, onRequestFocusByRowId)}
              data-estimate-row-index={rowIndex}
              data-estimate-row-id={computedItem.id}
              data-estimate-cell-index={2}
              aria-label={`${computedItemLabel} adjustment percentage`}
              align="center"
              className={cn(ESTIMATE_PRIMARY_NUMERIC_INPUT_CLASS, "text-right")}
              style={{ width: getPercentageInputWidth(editableAdjustmentColumnPercentage) }}
            />
            <span className={ESTIMATE_PRIMARY_NUMERIC_CLASS} aria-hidden="true">%</span>
          </div>
        </div>
        {rowAdjustmentValue !== 0 ? (
          <p className={cn(ESTIMATE_LOWER_RIGHT_META_CLASS, rowAdjustmentValue < 0 ? "text-danger" : "text-tertiary")}>
            {formatPeso(rowAdjustmentValue)}
          </p>
        ) : null}
      </td>
      <td
        className={cn(
          "flex items-center justify-center border-r border-hairline px-1",
          activeCellIndex === 3 && "ring-1 ring-inset ring-accent/30",
        )}
        data-estimate-cell-active={activeCellIndex === 3 ? "true" : undefined}
      >
        <MoneyInput
          value={computedItem.editableMiscCost}
          disabled={!canEditEstimate}
          align="center"
          onChange={(value) => {
            editableRowStore.getState().stageRow(computedItem, { miscCost: value });
          }}
          ariaLabel={`${computedItemLabel} misc cost`}
          onFocus={() => setFocusedCell({ rowId: computedItem.id, cellIndex: 3 })}
          onBlur={() => {
            setFocusedCell((current) => (current?.rowId === computedItem.id && current.cellIndex === 3 ? null : current));
            if (computedItem.miscCost !== computedItem.storedMiscCost) {
              editableRowStore.getState().commitRowFields(computedItem, { miscCost: computedItem.editableMiscCost });
            } else {
              editableRowStore.getState().commitRowFields(computedItem, {});
            }
          }}
          onKeyDown={(event) => handleEstimateCellKeyDown(event, rowIndex, 3, rowIds, onRequestFocusByRowId)}
          data-estimate-row-index={rowIndex}
          data-estimate-row-id={computedItem.id}
          data-estimate-cell-index={3}
        />
      </td>
      <td className="flex items-center justify-end border-r border-hairline px-1 text-right">
        <p className={ESTIMATE_PRIMARY_NUMERIC_CLASS}>{pesoFormatter.format(computedItem.totalItemCosts).replace("₱", "₱ ")}</p>
      </td>
      <td className="flex items-center justify-center py-2 text-tertiary">
        <DropdownMenu
          align="end"
          side="bottom"
          className="min-w-44"
          trigger={(
            <IconButton
              ref={rowActionTriggerRef}
              type="button"
              variant="plain"
              size="icon-xs"
              className="grid size-5 cursor-pointer place-items-center rounded-xs text-tertiary transition hover:bg-surfaceMuted hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus/50 [@media(pointer:coarse)]:size-10"
              label={`Open row actions for ${computedItemLabel}`}
              title={undefined}
              onClick={(event) => event.stopPropagation()}
              icon={<DotsThree size={14} weight="bold" aria-hidden="true" />}
            />
          )}
        >
          <DropdownMenu.Item
            label="Row activity"
            icon={<ArrowsOutSimple size={14} weight="regular" aria-hidden="true" />}
            onClick={() => {
              const opener = rowActionTriggerRef.current;
              if (opener) onOpenRowDetails(computedItem.id, opener, "activity");
            }}
          />
          {canEditEstimate && onOpenMoveRowItemDialog ? (
            <DropdownMenu.Item
              label="Move row"
              icon={<DotsSixVertical size={14} weight="regular" aria-hidden="true" />}
              onClick={() => {
                const opener = rowActionTriggerRef.current;
                if (opener) onOpenMoveRowItemDialog(computedItem.id, opener);
              }}
            />
          ) : null}
          {canEditEstimate ? (
            <DropdownMenu.Item
              label="Duplicate row"
              icon={<CopySimple size={14} weight="regular" aria-hidden="true" />}
              disabled={duplicateRowItemDisabled}
              onClick={() => onInsertLibraryItem(targetNodeId, {
                ...computedItem,
                duplicateSourceRowId: computedItem.id,
              } as EstimateRowItem & { duplicateSourceRowId: string })}
            />
          ) : null}
          {canEditEstimate ? (
            <DropdownMenu.Item
              label="Delete row"
              icon={<Trash size={14} weight="regular" aria-hidden="true" />}
              destructive
              onClick={() => onDeleteRowItem(computedItem.id)}
            />
          ) : null}
        </DropdownMenu>
      </td>
    </tr>
  );
});

function handleTableDragOver(event: DragEvent) {
  if (event.dataTransfer.types.includes(ESTIMATE_ROW_ITEM_DRAG_MIME_TYPE)) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    return;
  }

  if (event.dataTransfer.types.includes(LIBRARY_ITEM_DRAG_MIME_TYPE)) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }
}

export const EstimateRowItemsTable = memo(function EstimateRowItemsTable({
  canEditEstimate = true,
  canManageLibrary = false,
  items,
  brandOptions,
  supplierOptions,
  projectId,
  estimateId,
  estimateTabId,
  targetNodeId,
  onInsertLibraryItem,
  onReplaceRowItem,
  onDeleteRowItem,
  onOpenRowDetails,
  onOpenComponentEditor,
  onClearRowComponent,
  onPromoteRowToLibrary,
  promotingRowId,
  onMoveRowComponent,
  onMoveRowItem,
  onOpenMoveRowItemDialog,
  onOpenReplaceComponentPicker,
  onOpenMoveComponentPicker,
  expressInsertDraftStates = {},
  onRetryExpressDraft = noopExpressDraftHandler,
  onDeleteExpressDraft = noopExpressDraftHandler,
  selectedRowIds,
  onToggleRowSelection,
  onToggleRowsSelection,
  onContributionChanged,
  columnResize,
  virtualization = WORKSHOP_ESTIMATE_ROW_VIRTUALIZATION,
}: EstimateRowItemsTableProps) {
  "use no memo";

  reportEstimateRowItemsTableRender(targetNodeId);
  const surfaceVariant = useEstimateSurfaceVariant();
  const scrollRootRef = useRef<HTMLDivElement | null>(null);
  const disabledColumnResizeSurfaceRef = useRef<HTMLElement | null>(null);
  const [focusedCell, setFocusedCell] = useState<{ rowId: string; cellIndex: number } | null>(null);
  const [replaceTargetRowId, setReplaceTargetRowId] = useState("");
  const [activeExpressRowId, setActiveExpressRowId] = useState<string | null>(null);
  const [scrollMargin, dispatchScrollMargin] = useReducer(scrollMarginReducer, 0);
  const rowIds = useMemo(() => items.map((item) => item.id), [items]);
  const selectableRowIds = useMemo(() => (canEditEstimate ? rowIds : []), [canEditEstimate, rowIds]);
  const allRowsSelected = selectableRowIds.length > 0 && selectableRowIds.every((rowId) => selectedRowIds.has(rowId));
  const someRowsSelected = !allRowsSelected && selectableRowIds.some((rowId) => selectedRowIds.has(rowId));
  const columnResizeController = useEstimateColumnResizeController({
    surfaceRef: columnResize?.surfaceRef ?? disabledColumnResizeSurfaceRef,
    widths: columnResize?.widths ?? EMPTY_ESTIMATE_COLUMN_WIDTHS,
    onCommitWidths: columnResize?.onCommitWidths ?? noopCommitWidths,
    pointerResizeEdge: "left",
  });
  const hasActiveExpressEditor = activeExpressRowId !== null && items.some((item) => item.id === activeExpressRowId);
  const virtualEnabled = Boolean(!hasActiveExpressEditor && virtualization.enabled && items.length >= (virtualization.minRows ?? 75));
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => findScrollParent(scrollRootRef.current),
    estimateSize: () => virtualization.estimateRowHeight ?? 96,
    overscan: virtualization.overscan ?? 6,
    getItemKey: (index) => items[index]?.id ?? index,
    enabled: virtualEnabled,
    scrollMargin,
    useFlushSync: virtualization.useFlushSync ?? false,
    initialRect: { height: virtualization.initialViewportHeight ?? 720, width: 0 },
  });

  useEffect(() => {
    const owner = () => scrollRootRef.current;
    const guidedPracticePriceRowIndex = () =>
      items.findIndex(
        (item) =>
          isExpressComponentRow(item)
          && item.metadata?.guidedPracticeRole === "price_and_save",
      );
    const clearOwnedTarget = (target: string) => {
      const root = owner();
      if (root?.dataset.onboardingTarget === target) {
        root.removeAttribute("data-onboarding-target");
      }
      root
        ?.querySelectorAll<HTMLElement>(`[data-onboarding-target="${target}"]`)
        .forEach((element) => element.removeAttribute("data-onboarding-target"));
    };
    const registerRowMath = registerEstimateOnboardingTargetAdapter({
      target: "estimate.row_math",
      owner,
      prepare: async (signal) => {
        const root = owner();
        if (!root || signal.aborted) return null;
        root.scrollIntoView({ block: "nearest", inline: "nearest" });
        root.setAttribute("data-onboarding-target", "estimate.row_math");
        return root;
      },
    });
    const registerPriceInput = registerEstimateOnboardingTargetAdapter({
      target: "estimate.price_input",
      owner,
      priority: () => guidedPracticePriceRowIndex() >= 0 ? 1 : 0,
      prepare: async (signal) => {
        const guidedRowIndex = guidedPracticePriceRowIndex();
        const priceRowIndex = guidedRowIndex >= 0
          ? guidedRowIndex
          : items.findIndex((item) => isExpressComponentRow(item));
        if (priceRowIndex < 0) return null;
        if (virtualEnabled) {
          rowVirtualizer.scrollToIndex(priceRowIndex, { align: "center" });
        }
        const input = await waitForOwnedEstimateElement(
          () =>
            owner()?.querySelector<HTMLElement>(
              `[data-estimate-price-input="unit-cost"][data-estimate-row-index="${priceRowIndex}"]`,
            ) ?? null,
          signal,
        );
        if (!input) return null;
        input.scrollIntoView({ block: "center", inline: "nearest" });
        input.setAttribute("data-onboarding-target", "estimate.price_input");
        return input;
      },
    });

    return () => {
      registerRowMath();
      registerPriceInput();
      clearOwnedTarget("estimate.row_math");
      clearOwnedTarget("estimate.price_input");
    };
  }, [items, rowVirtualizer, virtualEnabled]);

  const requestFocusByRowId = useCallback(
    (rowId: string, cellIndex: number) => {
      const rowIndex = rowIds.indexOf(rowId);
      if (rowIndex >= 0 && virtualEnabled) rowVirtualizer.scrollToIndex(rowIndex, { align: "auto" });
      setFocusedCell({ rowId, cellIndex });
    },
    [rowIds, rowVirtualizer, virtualEnabled]
  );
  const handleExpressEditorActiveChange = useCallback((rowId: string, active: boolean) => {
    setActiveExpressRowId(active ? rowId : null);
  }, []);

  useEffect(() => {
    if (!hasActiveExpressEditor) return;
    recordExpressComponentEvent("virtualization_disabled", {
      rowId: activeExpressRowId ?? undefined,
      nodeId: targetNodeId,
      reason: "express-editor-active",
    });
  }, [activeExpressRowId, hasActiveExpressEditor, targetNodeId]);

  useEffect(() => {
    if (!focusedCell || focusEstimateCellByRowId(focusedCell.rowId, focusedCell.cellIndex)) return;
    const rowIndex = rowIds.indexOf(focusedCell.rowId);
    if (rowIndex >= 0 && virtualEnabled) rowVirtualizer.scrollToIndex(rowIndex, { align: "auto" });
    const frame = requestAnimationFrame(() => {
      focusEstimateCellByRowId(focusedCell.rowId, focusedCell.cellIndex);
    });
    return () => cancelAnimationFrame(frame);
  }, [focusedCell, rowIds, rowVirtualizer, virtualEnabled]);

  useEffect(() => {
    if (!virtualEnabled) {
      dispatchScrollMargin({ type: "reset" });
      return undefined;
    }

    const tableRoot = scrollRootRef.current;
    const scrollElement = findScrollParent(tableRoot);
    if (!tableRoot || !scrollElement || scrollElement === tableRoot) {
      dispatchScrollMargin({ type: "reset" });
      return undefined;
    }

    const measureScrollMargin = () => {
      const tableRect = tableRoot.getBoundingClientRect();
      const scrollRect = scrollElement.getBoundingClientRect();
      const nextScrollMargin = Math.max(0, tableRect.top - scrollRect.top + scrollElement.scrollTop);
      dispatchScrollMargin({ type: "measure", value: nextScrollMargin });
    };

    measureScrollMargin();
    scrollElement.addEventListener("scroll", measureScrollMargin, { passive: true });
    window.addEventListener("resize", measureScrollMargin);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(measureScrollMargin);
      resizeObserver.observe(tableRoot);
      resizeObserver.observe(scrollElement);
    }

    return () => {
      scrollElement.removeEventListener("scroll", measureScrollMargin);
      window.removeEventListener("resize", measureScrollMargin);
      resizeObserver?.disconnect();
    };
  }, [items.length, targetNodeId, virtualEnabled]);

  const virtualEstimateRowHeight = virtualization.estimateRowHeight ?? 96;
  const virtualOverscan = virtualization.overscan ?? 6;
  const virtualInitialViewportHeight = virtualization.initialViewportHeight ?? 720;
  const measuredVirtualRows = rowVirtualizer.getVirtualItems();
  const renderedVirtualRows = virtualEnabled && measuredVirtualRows.length === 0
    ? Array.from(
        {
          length: Math.min(
            items.length,
            Math.ceil(virtualInitialViewportHeight / virtualEstimateRowHeight) + virtualOverscan * 2
          ),
        },
        (_, index) => ({
          index,
          key: items[index]?.id ?? index,
          start: index * virtualEstimateRowHeight,
        })
      )
    : measuredVirtualRows;

  if (!items.length) return null;

  function handleDrop(event: DragEvent) {
    if (!canEditEstimate) return;
    const rowItemPayload = readEstimateRowItemDragPayload(event.dataTransfer.getData(ESTIMATE_ROW_ITEM_DRAG_MIME_TYPE));
    if (rowItemPayload) {
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "move";
      endEstimateWorkshopDrag();
      onMoveRowItem(rowItemPayload.rowItemId, targetNodeId, items.length);
      return;
    }

    const result = readEstimateLibraryItemDragPayload(event.dataTransfer.getData(LIBRARY_ITEM_DRAG_MIME_TYPE));
    if (!result.ok) return;
    event.preventDefault();
    onInsertLibraryItem(targetNodeId, result.item);
  }

  function headerCellClassName(columnId: string, className?: string) {
    return cn(
      "relative flex items-center justify-center border-r border-hairline",
      columnResize && isResizableEstimateColumnId(columnId as EstimateColumnId) && "pr-2",
      className,
    );
  }

  return (
    <div
      ref={scrollRootRef}
      className={cn("min-w-[var(--estimate-sheet-min-width,856px)] overflow-visible border-x border-b border-hairline", estimateSurfaceClass(surfaceVariant, "gridTableRoot"))}
      data-estimate-row-table-root={targetNodeId}
      onDragOver={canEditEstimate ? handleTableDragOver : undefined}
      onDrop={canEditEstimate ? handleDrop : undefined}
    >
      <table className="w-full border-collapse text-[10px] text-ink">
        <thead className={cn("text-left text-[10px] font-medium text-ink", estimateSurfaceClass(surfaceVariant, "gridTableHead"))}>
          <tr className="grid min-h-10 border-b border-hairline" style={{ gridTemplateColumns: ESTIMATE_COLUMN_TEMPLATE }}>
            <th scope="col" className="flex items-center justify-center border-r border-hairline text-tertiary">#</th>
            <th scope="col" className="flex items-center justify-center border-r border-hairline">
              {canEditEstimate ? (
                <SelectionCheckbox
                  checked={allRowsSelected}
                  indeterminate={someRowsSelected}
                  tone="blue"
                  ariaLabel="Select all estimate row items"
                  tabIndex={0}
                  uncheckedRevealClassName="opacity-100"
                  className="opacity-100"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleRowsSelection(selectableRowIds, !allRowsSelected);
                  }}
                  onKeyDown={(event) => handleSelectionCheckboxKeyDown(event, () => onToggleRowsSelection(selectableRowIds, !allRowsSelected))}
                />
              ) : (
                <span className="size-5" aria-hidden="true" />
              )}
            </th>
            <th scope="col" className={headerCellClassName("material")}>
              <span
                className="pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-divider"
                data-estimate-material-header-rail="true"
                aria-hidden="true"
              />
              <EstimateColumnHeader columnId="material" label="Materials" />
              {columnResize ? <EstimateRowColumnResizeHandle columnId="material" resizeController={columnResizeController} /> : null}
            </th>
            <th scope="col" className={headerCellClassName("commercial")}>
              <EstimateColumnHeader columnId="commercial" label="Commercial" />
              {columnResize ? <EstimateRowColumnResizeHandle columnId="commercial" resizeController={columnResizeController} /> : null}
            </th>
            <th scope="col" className={headerCellClassName("quantity")}>
              <EstimateColumnHeader columnId="quantity" label="Qty" />
              {columnResize ? <EstimateRowColumnResizeHandle columnId="quantity" resizeController={columnResizeController} /> : null}
            </th>
            <th scope="col" className={headerCellClassName("contingency", "text-center")}>
              <EstimateColumnHeader columnId="contingency" label="Contingency" compactLabel="Cont." />
              {columnResize ? <EstimateRowColumnResizeHandle columnId="contingency" resizeController={columnResizeController} /> : null}
            </th>
            <th scope="col" className={headerCellClassName("subTotal")}>
              <EstimateColumnHeader columnId="subTotal" label="Subtotal" />
              {columnResize ? <EstimateRowColumnResizeHandle columnId="subTotal" resizeController={columnResizeController} /> : null}
            </th>
            <th scope="col" className={headerCellClassName("adjustment", "text-center")}>
              <EstimateColumnHeader columnId="adjustment" label="Adjustment" compactLabel="Adjust." />
              {columnResize ? <EstimateRowColumnResizeHandle columnId="adjustment" resizeController={columnResizeController} /> : null}
            </th>
            <th scope="col" className={headerCellClassName("miscCost", "text-center")}>
              <EstimateColumnHeader columnId="miscCost" label="Misc Cost" compactLabel="Misc" />
              {columnResize ? <EstimateRowColumnResizeHandle columnId="miscCost" resizeController={columnResizeController} /> : null}
            </th>
            <th scope="col" className={headerCellClassName("totalItemCosts", "text-center")}>
              <EstimateColumnHeader columnId="totalItemCosts" label="Total Item Cost" compactLabel="Total" />
              {columnResize ? <EstimateRowColumnResizeHandle columnId="totalItemCosts" resizeController={columnResizeController} /> : null}
            </th>
            <th scope="col" aria-label="Row actions" />
          </tr>
        </thead>
        <tbody
          data-estimate-row-virtualizer={virtualEnabled ? "true" : undefined}
          data-estimate-row-virtual-total-count={virtualEnabled ? items.length : undefined}
          data-estimate-row-virtual-mounted-count={virtualEnabled ? renderedVirtualRows.length : undefined}
          data-estimate-row-virtualizer-disabled-reason={!virtualEnabled && hasActiveExpressEditor ? "express-editor-active" : undefined}
          data-active-express-editor-count={hasActiveExpressEditor ? 1 : undefined}
          data-estimate-row-scroll-margin={virtualEnabled ? Math.round(scrollMargin) : undefined}
          className={virtualEnabled ? "relative block" : undefined}
          style={virtualEnabled ? { height: rowVirtualizer.getTotalSize() } : undefined}
        >
          {(virtualEnabled ? renderedVirtualRows : items.map((_, index) => ({ index, key: items[index]?.id ?? index, start: 0 }))).map((virtualRow) => {
            const item = items[virtualRow.index];
            if (!item) return null;
            return (
              <EstimateRowItemTableRow
                key={item.id}
                canEditEstimate={canEditEstimate}
                canManageLibrary={canManageLibrary}
                item={item}
                brandOptions={brandOptions}
                supplierOptions={supplierOptions}
                projectId={projectId}
                estimateId={estimateId}
                estimateTabId={estimateTabId}
                rowIndex={virtualRow.index}
                selected={canEditEstimate && selectedRowIds.has(item.id)}
                activeCellIndex={focusedCell?.rowId === item.id ? focusedCell.cellIndex : null}
                isReplaceTarget={canEditEstimate && replaceTargetRowId === item.id}
                setFocusedCell={setFocusedCell}
                setReplaceTargetRowId={setReplaceTargetRowId}
                onExpressEditorActiveChange={handleExpressEditorActiveChange}
                onContributionChanged={onContributionChanged}
                onInsertLibraryItem={onInsertLibraryItem}
                onReplaceRowItem={onReplaceRowItem}
                onDeleteRowItem={onDeleteRowItem}
                onOpenRowDetails={onOpenRowDetails}
                onOpenComponentEditor={onOpenComponentEditor}
                onClearRowComponent={onClearRowComponent}
                onPromoteRowToLibrary={onPromoteRowToLibrary}
                promotingRowId={promotingRowId}
                onMoveRowComponent={onMoveRowComponent}
                onMoveRowItem={onMoveRowItem}
                onOpenMoveRowItemDialog={onOpenMoveRowItemDialog}
                onOpenReplaceComponentPicker={onOpenReplaceComponentPicker}
                onOpenMoveComponentPicker={onOpenMoveComponentPicker}
                expressDraftState={expressInsertDraftStates[item.id]}
                onRetryExpressDraft={onRetryExpressDraft}
                onDeleteExpressDraft={onDeleteExpressDraft}
                onToggleRowSelection={onToggleRowSelection}
                targetNodeId={targetNodeId}
                rowIds={rowIds}
                onRequestFocusByRowId={requestFocusByRowId}
                style={virtualEnabled ? {
                  left: 0,
                  position: "absolute",
                  top: 0,
                  transform: `translateY(${virtualRow.start - scrollMargin}px)`,
                  width: "100%",
                } : undefined}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}, areEstimateRowItemsTablePropsEqual);
