import { CaretDoubleDown, CaretDoubleUp, FunnelSimple, ListBullets, Plus } from "@phosphor-icons/react/dist/ssr";

import { ToolbarIconButton } from "@/components/ui/toolbar-icon-button";

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
}: HeaderIconToolbarProps) {
  const addButtonLabel = addVisibleLabel ?? `Add ${labelPrefix}`;

  return (
    <div className="flex h-[38px] min-h-[38px] items-center gap-1 bg-white px-2 py-0" aria-label={ariaLabel}>
      <ToolbarIconButton label={`Filter ${labelPrefix}`} onClick={onFilter}>
        <FunnelSimple size={12} weight="bold" aria-hidden="true" />
      </ToolbarIconButton>
      <ToolbarIconButton label={`Group ${labelPrefix}`} onClick={onGroup}>
        <ListBullets size={12} weight="bold" aria-hidden="true" />
      </ToolbarIconButton>
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
      <div className="ml-auto flex items-center">
        <ToolbarIconButton
          label={addButtonLabel}
          visibleLabel={addVisibleLabel}
          onClick={onAdd}
          disabled={addDisabled}
          className={
            addVisibleLabel
              ? "bg-primary text-white hover:bg-accentDark focus-visible:bg-accentDark focus-visible:text-white"
              : "bg-orange-50 text-orange-700 hover:bg-orange-100 hover:text-orange-800 focus-visible:bg-orange-100 focus-visible:text-orange-800"
          }
        >
          <Plus size={12} weight="bold" aria-hidden="true" />
        </ToolbarIconButton>
      </div>
    </div>
  );
}
