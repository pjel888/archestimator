import { FunnelSimple, ListBullets, Plus } from "@phosphor-icons/react/dist/ssr";

import { ToolbarIconButton } from "@/components/ui/toolbar-icon-button";

type HeaderIconToolbarProps = {
  ariaLabel: string;
  labelPrefix: string;
  onFilter?: () => void;
  onGroup?: () => void;
  onAdd?: () => void;
  addVisibleLabel?: string;
};

export function HeaderIconToolbar({
  ariaLabel,
  labelPrefix,
  onFilter,
  onGroup,
  onAdd,
  addVisibleLabel,
}: HeaderIconToolbarProps) {
  const addButtonLabel = addVisibleLabel ?? `Add ${labelPrefix}`;

  return (
    <div className="flex min-h-10 items-center gap-1 border-y border-hairline bg-white p-2" aria-label={ariaLabel}>
      <ToolbarIconButton label={`Filter ${labelPrefix}`} onClick={onFilter}>
        <FunnelSimple size={12} weight="bold" aria-hidden="true" />
      </ToolbarIconButton>
      <ToolbarIconButton label={`Group ${labelPrefix}`} onClick={onGroup}>
        <ListBullets size={12} weight="bold" aria-hidden="true" />
      </ToolbarIconButton>
      <div className="ml-auto flex items-center">
        <ToolbarIconButton
          label={addButtonLabel}
          visibleLabel={addVisibleLabel}
          onClick={onAdd}
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
