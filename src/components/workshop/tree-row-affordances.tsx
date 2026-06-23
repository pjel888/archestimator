"use client";

import { type ChangeEvent, useCallback, useEffect, useRef } from "react";

import { DotsSixVertical, Trash, X } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";

// ---------------------------------------------------------------------------
// TreeDragHandle
// ---------------------------------------------------------------------------

type TreeDragHandleProps = {
  /** When true, the handle is always visible (otherwise visible on parent hover). */
  forceVisible?: boolean;
  /** Additional class names applied to the wrapper. */
  className?: string;
};

/**
 * A DotsSixVertical grip icon that appears on parent hover (or always when
 * forceVisible).  Stops event propagation so it never triggers row click or
 * navigation.  The icon itself is decorative.
 */
export function TreeDragHandle({ forceVisible, className }: TreeDragHandleProps) {
  return (
    <span
      aria-hidden="true"
      title="Drag row"
      className={cn(
        "grid size-4 shrink-0 place-items-center rounded-xs",
        "cursor-grab active:cursor-grabbing",
        !forceVisible && "opacity-0 transition-opacity group-hover/tree-row:opacity-100 group-focus-within/tree-row:opacity-100",
        className,
      )}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <DotsSixVertical size={16} weight="regular" className="text-tertiary group-hover/tree-row:text-ink transition-colors" />
    </span>
  );
}

// ---------------------------------------------------------------------------
// TreeSelectionCheckbox
// ---------------------------------------------------------------------------

type TreeSelectionCheckboxProps = {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  /** Hide until the parent `group` row is hovered or focused. Checked and indeterminate rows stay visible. */
  revealOnHover?: boolean;
  /** Always show even when revealOnHover is set (e.g. while a bulk selection is active). */
  forceVisible?: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  "aria-label": string;
};

/**
 * A styled checkbox with native `indeterminate` support (set via a ref, since
 * React does not surface it as a prop).  All pointer events are stopped at
 * the wrapper so the checkbox never triggers row click, expand, or drag.
 */
export function TreeSelectionCheckbox({
  checked,
  indeterminate,
  disabled,
  revealOnHover,
  forceVisible,
  onChange,
  "aria-label": ariaLabel,
}: TreeSelectionCheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = Boolean(indeterminate);
    }
  }, [indeterminate]);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      e.stopPropagation();
      onChange(e);
    },
    [onChange],
  );

  return (
    <span
      className={cn(
        "flex items-center shrink-0",
        revealOnHover &&
          !forceVisible &&
          !checked &&
          !indeterminate &&
          "opacity-0 transition-opacity focus-within:opacity-100 group-hover/tree-row:opacity-100 group-focus-within/tree-row:opacity-100",
      )}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onClick={(e) => e.stopPropagation()}
        onChange={handleChange}
        aria-label={ariaLabel}
        className="rounded-xs size-3 accent-ink cursor-pointer"
      />
    </span>
  );
}

// ---------------------------------------------------------------------------
// TreeSelectionCountLabel
// ---------------------------------------------------------------------------

type TreeSelectionCountLabelProps = {
  count: number;
  singular: string;
  /** Optional plural form — defaults to `singular + "s"`. */
  plural?: string;
};

/**
 * Renders "{count} {entityLabel} selected".
 */
function TreeSelectionCountLabel({ count, singular, plural }: TreeSelectionCountLabelProps) {
  const label = count === 1 ? singular : (plural ?? `${singular}s`);
  return (
    <span className="text-[10px] font-medium text-ink">
      {count} {label} selected
    </span>
  );
}

// ---------------------------------------------------------------------------
// TreeBulkActionBar
// ---------------------------------------------------------------------------

type TreeBulkActionBarProps = {
  /** Number of selected items. When 0 the bar is not rendered. */
  selectedCount: number;
  /** Entity label (e.g. "node", "folder", "component"). */
  entityLabel: string;
  /** Plural override for the entity label. */
  entityLabelPlural?: string;
  /** Called when the user clicks "Clear selection". */
  onClearSelection: () => void;
  /** Called when the user clicks "Delete selected". */
  onDelete: () => void;
  /** Action label for the destructive/primary bulk action. */
  deleteLabel?: string;
  /** When true, the delete button is disabled. */
  deleteDisabled?: boolean;
  /** Tooltip / reason shown on hover when delete is disabled. */
  disabledReason?: string;
  /** Optional layout override for surfaces that provide their own container. */
  className?: string;
  /** Use icon-only actions for compact toolbar surfaces. */
  iconOnly?: boolean;
};

/**
 * A sticky toolbar that appears above tree/table content when items are
 * bulk-selected.  Shows a count label, a "Clear selection" ghost button,
 * and a "Delete selected" danger button.
 */
export function TreeBulkActionBar({
  selectedCount,
  entityLabel,
  entityLabelPlural,
  onClearSelection,
  onDelete,
  deleteLabel = "Delete selected",
  deleteDisabled,
  disabledReason,
  className,
  iconOnly = false,
}: TreeBulkActionBarProps) {
  if (selectedCount === 0) return null;

  if (iconOnly) {
    return (
      <div
        role="toolbar"
        aria-label="Bulk actions"
        className={cn("flex items-center justify-end gap-1 sticky top-0 z-10 bg-surface px-3 py-2 border-b border-hairline", className)}
      >
        <span className="sr-only">
          <TreeSelectionCountLabel count={selectedCount} singular={entityLabel} plural={entityLabelPlural} />
        </span>
        <Button variant="ghost" size="icon-sm" className="size-6 rounded-xs p-0" onClick={onClearSelection} aria-label="Clear selection">
          <X size={12} weight="regular" aria-hidden="true" />
        </Button>
        <Button
          variant="danger"
          size="icon-sm"
          className="size-6 rounded-xs p-0"
          onClick={onDelete}
          disabled={deleteDisabled}
          title={deleteDisabled ? disabledReason : undefined}
          aria-label={deleteLabel}
        >
          <Trash size={12} weight="regular" aria-hidden="true" />
        </Button>
      </div>
    );
  }

  return (
    <div
      role="toolbar"
      aria-label="Bulk actions"
      className={cn("flex items-center gap-2 sticky top-0 z-10 bg-surface px-3 py-2 border-b border-hairline", className)}
    >
      <TreeSelectionCountLabel count={selectedCount} singular={entityLabel} plural={entityLabelPlural} />
      <Button variant="ghost" size="sm" onClick={onClearSelection}>
        Clear selection
      </Button>
      <Button
        variant="danger"
        size="sm"
        onClick={onDelete}
        disabled={deleteDisabled}
        title={deleteDisabled ? disabledReason : undefined}
      >
        {deleteLabel}
      </Button>
    </div>
  );
}
