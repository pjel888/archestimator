"use client";

import type { ReactNode, Ref } from "react";

import { HeaderIconToolbar, type HeaderIconToolbarAddAction } from "@/components/ui/header-icon-toolbar";
import { SearchInput } from "@/components/ui/search-input";

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
  onAdd?: () => void;
  addVisibleLabel?: string;
  addDisabled?: boolean;
  addActions?: HeaderIconToolbarAddAction[];
  searchActions?: ReactNode;
  toolbarPanel?: ReactNode;
  contentScroll?: boolean;
  searchInputRef?: Ref<HTMLInputElement>;
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
  onAdd,
  addVisibleLabel,
  addDisabled,
  addActions,
  searchActions,
  toolbarPanel,
  contentScroll = true,
  searchInputRef,
  children,
}: WorkshopCollectionLayoutProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[38px] shrink-0 items-center gap-2 bg-white">
        <SearchInput
          ref={searchInputRef}
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          onClear={() => onSearchChange("")}
          aria-label={searchLabel}
          wrapperClassName="w-full"
        />
        {searchActions}
      </div>

      <HeaderIconToolbar
        ariaLabel={toolbarLabel}
        labelPrefix={toolbarPrefix}
        onFilter={onFilter}
        onGroup={onGroup}
        onExpandAll={onExpandAll}
        onCollapseAll={onCollapseAll}
        leadingActions={leadingActions}
        leadingActionsLabel={leadingActionsLabel}
        onAdd={onAdd}
        addVisibleLabel={addVisibleLabel}
        addDisabled={addDisabled}
        addActions={addActions}
      />

      {toolbarPanel}

      <div className={`min-h-0 flex-1 bg-white p-2 ${contentScroll ? "overflow-auto" : "overflow-hidden"}`}>{children}</div>
    </div>
  );
}
