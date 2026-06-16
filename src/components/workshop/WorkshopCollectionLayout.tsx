"use client";

import type { ReactNode } from "react";

import type { HeaderIconToolbarAddAction } from "@/components/ui/header-icon-toolbar";
import { TreePanelHeader } from "@/components/ui/tree-panel-header";

type WorkshopCollectionLayoutProps = {
  searchLabel: string;
  searchPlaceholder: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  toolbarLabel: string;
  toolbarPrefix: string;
  onFilter?: () => void;
  onGroup?: () => void;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  leadingActions?: HeaderIconToolbarAddAction[];
  leadingActionsLabel?: string;
  filterSlot?: ReactNode;
  onAdd?: () => void;
  addVisibleLabel?: string;
  addDisabled?: boolean;
  addActions?: HeaderIconToolbarAddAction[];
  toolbarPanel?: ReactNode;
  contentScroll?: boolean;
  children: ReactNode;
};

export function WorkshopCollectionLayout({
  searchLabel,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  toolbarLabel,
  toolbarPrefix,
  onFilter,
  onGroup,
  onExpandAll,
  onCollapseAll,
  leadingActions,
  leadingActionsLabel,
  filterSlot,
  onAdd,
  addVisibleLabel,
  addDisabled,
  addActions,
  toolbarPanel,
  contentScroll = true,
  children,
}: WorkshopCollectionLayoutProps) {
  return (
    <div className="flex h-full flex-col">
      <TreePanelHeader
        ariaLabel={toolbarLabel}
        labelPrefix={toolbarPrefix}
        searchValue={searchValue}
        onSearchValueChange={onSearchChange}
        searchPlaceholder={searchPlaceholder}
        searchLabel={searchLabel}
        onFilter={onFilter}
        onGroup={onGroup}
        onExpandAll={onExpandAll}
        onCollapseAll={onCollapseAll}
        leadingActions={leadingActions}
        leadingActionsLabel={leadingActionsLabel}
        filterSlot={filterSlot}
        onAdd={onAdd}
        addVisibleLabel={addVisibleLabel}
        addDisabled={addDisabled}
        addActions={addActions}
        showBottomBorder={!toolbarPanel}
        showToolbarBottomBorder={toolbarPanel ? true : undefined}
      />

      {toolbarPanel}

      <div className={`min-h-0 flex-1 bg-white p-2 ${contentScroll ? "overflow-auto" : "overflow-hidden"}`}>{children}</div>
    </div>
  );
}
