import type { ReactNode } from "react";
import { CaretDoubleDown, CaretDoubleUp, FunnelSimple, ListBullets, Plus } from "@phosphor-icons/react/dist/ssr";

import { ToolbarIconButton } from "@/components/ui/toolbar-icon-button";

export type HeaderIconToolbarAddAction = {
  label: string;
  visibleLabel?: string;
  icon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
};

type HeaderIconToolbarProps = {
  ariaLabel: string;
  labelPrefix: string;
  onFilter?: () => void;
  onGroup?: () => void;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  onAdd?: () => void;
  addVisibleLabel?: string;
  addDisabled?: boolean;
  addActions?: HeaderIconToolbarAddAction[];
  showDefaultActions?: boolean;
};

export function HeaderIconToolbar({
  ariaLabel,
  labelPrefix,
  onFilter,
  onGroup,
  onExpandAll,
  onCollapseAll,
  onAdd,
  addVisibleLabel,
  addDisabled = false,
  addActions,
  showDefaultActions = true,
}: HeaderIconToolbarProps) {
  const addButtonLabel = addVisibleLabel ?? `Add ${labelPrefix}`;
  const toolbarAddActions: HeaderIconToolbarAddAction[] = addActions ?? [
    {
      label: addButtonLabel,
      visibleLabel: addVisibleLabel,
      onClick: onAdd,
      disabled: addDisabled,
      icon: <Plus size={12} weight="bold" aria-hidden="true" />,
    },
  ];

  return (
    <div className="flex h-[38px] min-h-[38px] items-center gap-1 bg-white px-2 py-0" aria-label={ariaLabel}>
      {showDefaultActions ? (
        <>
          <ToolbarIconButton label={`Filter ${labelPrefix}`} onClick={onFilter}>
            <FunnelSimple size={12} weight="bold" aria-hidden="true" />
          </ToolbarIconButton>
          <ToolbarIconButton label={`Group ${labelPrefix}`} onClick={onGroup}>
            <ListBullets size={12} weight="bold" aria-hidden="true" />
          </ToolbarIconButton>
        </>
      ) : null}
      {onExpandAll ? (
        <ToolbarIconButton label={`Expand all ${labelPrefix}`} onClick={onExpandAll}>
          <CaretDoubleDown size={12} weight="bold" aria-hidden="true" />
        </ToolbarIconButton>
      ) : null}
      {onCollapseAll ? (
        <ToolbarIconButton label={`Collapse all ${labelPrefix}`} onClick={onCollapseAll}>
          <CaretDoubleUp size={12} weight="bold" aria-hidden="true" />
        </ToolbarIconButton>
      ) : null}
      <div className="ml-auto flex items-center gap-1">
        {toolbarAddActions.map((action) => (
          <ToolbarIconButton
            key={action.label}
            label={action.label}
            visibleLabel={action.visibleLabel}
            onClick={action.onClick}
            disabled={action.disabled}
            className={
              action.className ??
              (action.visibleLabel
                ? "bg-primary text-white hover:bg-accentDark focus-visible:bg-accentDark focus-visible:text-white"
                : "bg-orange-50 text-orange-700 hover:bg-orange-100 hover:text-orange-800 focus-visible:bg-orange-100 focus-visible:text-orange-800")
            }
          >
            {action.icon ?? <Plus size={12} weight="bold" aria-hidden="true" />}
          </ToolbarIconButton>
        ))}
      </div>
    </div>
  );
}
