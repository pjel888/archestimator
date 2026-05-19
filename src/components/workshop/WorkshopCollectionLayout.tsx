"use client";

import type { ReactNode } from "react";

import { HeaderIconToolbar } from "@/components/ui/header-icon-toolbar";
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
  onAdd?: () => void;
  addVisibleLabel?: string;
  searchActions?: ReactNode;
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
  onAdd,
  addVisibleLabel,
  searchActions,
  children,
}: WorkshopCollectionLayoutProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[38px] shrink-0 items-center gap-2 bg-white">
        <SearchInput
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
        onAdd={onAdd}
        addVisibleLabel={addVisibleLabel}
      />

      <div className="min-h-0 flex-1 overflow-auto p-2">{children}</div>
    </div>
  );
}
