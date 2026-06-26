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
        className="workshop-collection-chrome bg-transparent"
        toolbarClassName="bg-transparent"
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
        showToolbarBottomBorder={toolbarPanel ? false : undefined}
      />

      {toolbarPanel ? <div className="workshop-collection-tabs-chrome bg-transparent">{toolbarPanel}</div> : null}

      <div className={`min-h-0 flex-1 bg-transparent p-2 ${contentScroll ? "overflow-auto" : "overflow-hidden"}`}>{children}</div>
    </div>
  );
}
