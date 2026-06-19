import type { ReactNode } from "react";
import { CaretDoubleDown, CaretDoubleUp, FunnelSimple, ListBullets, Plus } from "@phosphor-icons/react/dist/ssr";

import { ToolbarIconButton } from "@/components/ui/toolbar-icon-button";
import { cn } from "@/lib/ui/cn";

export type HeaderIconToolbarAddAction = {
  label: string;
  visibleLabel?: string;
  /**
   * "Add …" actions render icon-only by default; set this to keep the
   * visible label (ink-primary emphasis for a sheet's main create action).
   */
  showVisibleLabel?: boolean;
  icon?: ReactNode;
  onClick?: () => void;
  pressed?: boolean;
  disabled?: boolean;
  className?: string;
  ariaControls?: string;
  ariaExpanded?: boolean;
};

type HeaderIconToolbarProps = {
  ariaLabel: string;
  labelPrefix: string;
  onFilter?: () => void;
  onGroup?: () => void;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  startActions?: HeaderIconToolbarAddAction[];
  startActionsLabel?: string;
  leadingActions?: HeaderIconToolbarAddAction[];
  leadingActionsLabel?: string;
  onAdd?: () => void;
  addVisibleLabel?: string;
  addDisabled?: boolean;
  addActions?: HeaderIconToolbarAddAction[];
  showDefaultActions?: boolean;
  /** Wired filter control (e.g. a FilterPopover) rendered in the filter position. */
  filterSlot?: ReactNode;
  className?: string;
};

export function HeaderIconToolbar({
  ariaLabel,
  labelPrefix,
  onFilter,
  onGroup,
  onExpandAll,
  onCollapseAll,
  startActions = [],
  startActionsLabel,
  leadingActions = [],
  leadingActionsLabel,
  onAdd,
  addVisibleLabel,
  addDisabled = false,
  addActions,
  showDefaultActions = true,
  filterSlot,
  className,
}: HeaderIconToolbarProps) {
  const addButtonLabel = addVisibleLabel ?? `Add ${labelPrefix}`;
  const toolbarAddActions: HeaderIconToolbarAddAction[] = addActions ?? [
    {
      label: addButtonLabel,
      visibleLabel: addVisibleLabel,
      onClick: onAdd,
      disabled: addDisabled,
      icon: <Plus size={12} weight="regular" aria-hidden="true" />,
    },
  ];

  return (
    <div className={cn("flex h-[38px] min-h-[38px] items-center gap-1 bg-white px-2 py-0", className)} aria-label={ariaLabel}>
      {startActions.length > 0 ? (
        <div
          className="mr-1 flex items-center gap-1 border-r border-hairline pr-1"
          role="group"
          aria-label={startActionsLabel ?? `${labelPrefix} primary actions`}
        >
          {startActions.map((action) => (
            <ToolbarIconButton
              key={action.label}
              label={action.label}
              visibleLabel={action.visibleLabel}
              onClick={action.onClick}
              aria-controls={action.ariaControls}
              aria-expanded={action.ariaExpanded}
              aria-pressed={action.pressed}
              disabled={action.disabled}
              className={action.className}
            >
              {action.icon ?? <Plus size={12} weight="regular" aria-hidden="true" />}
            </ToolbarIconButton>
          ))}
        </div>
      ) : null}
      {filterSlot || (showDefaultActions && (onFilter || onGroup)) ? (
        // D8: Filter/Group are honest-by-construction. An explicit `filterSlot`
        // always renders (it is a deliberate injection, independent of
        // `showDefaultActions`); the built-in Filter/Group buttons stay gated
        // behind `showDefaultActions`. Req 11: the cluster gets a trailing
        // hairline separator only when Expand/Collapse follow it — so a
        // filter-only toolbar (e.g. the library manager) never shows an orphan
        // divider.
        <div
          className={cn(
            "flex items-center gap-1",
            (onExpandAll || onCollapseAll) && "mr-1 border-r border-hairline pr-1",
          )}
          role="group"
          aria-label={`${labelPrefix} view filters`}
        >
          {filterSlot ? filterSlot : showDefaultActions && onFilter ? (
            <ToolbarIconButton label={`Filter ${labelPrefix}`} onClick={onFilter}>
              <FunnelSimple size={12} weight="regular" aria-hidden="true" />
            </ToolbarIconButton>
          ) : null}
          {showDefaultActions && onGroup ? (
            <ToolbarIconButton label={`Group ${labelPrefix}`} onClick={onGroup}>
              <ListBullets size={12} weight="regular" aria-hidden="true" />
            </ToolbarIconButton>
          ) : null}
        </div>
      ) : null}
      {onExpandAll ? (
        <ToolbarIconButton label={`Expand all ${labelPrefix}`} onClick={onExpandAll}>
          <CaretDoubleDown size={12} weight="regular" aria-hidden="true" />
        </ToolbarIconButton>
      ) : null}
      {onCollapseAll ? (
        <ToolbarIconButton label={`Collapse all ${labelPrefix}`} onClick={onCollapseAll}>
          <CaretDoubleUp size={12} weight="regular" aria-hidden="true" />
        </ToolbarIconButton>
      ) : null}
      {leadingActions.length > 0 ? (
        <div
          className="ml-1 flex items-center gap-1 border-l border-hairline pl-1"
          role="group"
          aria-label={leadingActionsLabel ?? `${labelPrefix} view actions`}
        >
          {leadingActions.map((action) => (
            <ToolbarIconButton
              key={action.label}
              label={action.label}
              visibleLabel={action.visibleLabel}
              onClick={action.onClick}
              aria-controls={action.ariaControls}
              aria-expanded={action.ariaExpanded}
              aria-pressed={action.pressed}
              disabled={action.disabled}
              className={action.className}
            >
              {action.icon ?? <Plus size={12} weight="regular" aria-hidden="true" />}
            </ToolbarIconButton>
          ))}
        </div>
      ) : null}
      <div className="ml-auto flex items-center gap-1">
        {toolbarAddActions.map((action) => {
          const isAddAction = action.label.trim().toLowerCase().startsWith("add");
          const visibleLabel = isAddAction && !action.showVisibleLabel ? undefined : action.visibleLabel;
          return (
            <ToolbarIconButton
              key={action.label}
              label={action.label}
              visibleLabel={visibleLabel}
              onClick={action.onClick}
              aria-controls={action.ariaControls}
              aria-expanded={action.ariaExpanded}
              aria-pressed={action.pressed}
              disabled={action.disabled}
              className={
                action.className ??
                (visibleLabel
                  ? "bg-primary text-white hover:bg-accentDark focus-visible:bg-accentDark focus-visible:text-white"
                  : "text-secondary hover:bg-surfaceMuted hover:text-ink focus-visible:bg-surfaceMuted focus-visible:text-ink")
              }
            >
              {action.icon ?? <Plus size={12} weight="regular" aria-hidden="true" />}
            </ToolbarIconButton>
          );
        })}
      </div>
    </div>
  );
}
