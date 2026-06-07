import type { ReactNode } from "react";
import { CaretUp, CaretDown } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/ui/cn";
import { EmptyState } from "./empty-state";
import { Checkbox } from "./checkbox";
import { Pagination } from "./pagination";

export type ColumnDef<T> = {
  id: string;
  header: ReactNode;
  cell: (item: T) => ReactNode;
  className?: string;
  headerClassName?: string;
  sortable?: boolean;
};

export type DataTableProps<T> = {
  data: T[];
  columns: ColumnDef<T>[];
  keyExtractor: (item: T) => string;
  isLoading?: boolean;
  isError?: boolean;
  error?: ReactNode;
  emptyState?: {
    icon?: ReactNode;
    title: ReactNode;
    description?: ReactNode;
    action?: ReactNode;
  };
  className?: string;
  onRowClick?: (item: T) => void;
  
  // Sorting
  onSort?: (key: string, direction: "asc" | "desc") => void;
  sortedKey?: string;
  sortDirection?: "asc" | "desc";
  
  // Selection
  selectable?: boolean;
  selectedRows?: Set<string>;
  onSelectionChange?: (selected: Set<string>) => void;
  
  // Pagination
  pagination?: {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  
  // Column Visibility
  visibleColumns?: Set<string>;
  onColumnVisibilityChange?: (visible: Set<string>) => void;
};

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  isLoading,
  isError,
  error,
  emptyState,
  className,
  onRowClick,
  onSort,
  sortedKey,
  sortDirection,
  selectable,
  selectedRows = new Set(),
  onSelectionChange,
  pagination,
  visibleColumns,
  onColumnVisibilityChange,
}: DataTableProps<T>) {
  const activeColumns = visibleColumns
    ? columns.filter((col) => visibleColumns.has(col.id))
    : columns;

  const handleSort = (colId: string) => {
    if (!onSort) return;
    if (sortedKey === colId) {
      onSort(colId, sortDirection === "asc" ? "desc" : "asc");
    } else {
      onSort(colId, "asc");
    }
  };

  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    if (selectedRows.size === data.length && data.length > 0) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(data.map(keyExtractor)));
    }
  };

  const handleSelectRow = (id: string) => {
    if (!onSelectionChange) return;
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    onSelectionChange(newSelected);
  };

  if (isError) {
    return (
      <div className={cn("w-full overflow-auto", className)}>
        <EmptyState
          title="Error loading data"
          description={error || "An unexpected error occurred."}
        />
      </div>
    );
  }

  if (!isLoading && data.length === 0 && emptyState) {
    return (
      <div className={cn("w-full overflow-auto", className)}>
        <EmptyState {...emptyState} />
      </div>
    );
  }

  return (
    <div className={cn("flex w-full flex-col gap-3", className)}>
      <div className="w-full flex-1 min-h-0 overflow-auto">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-surface shadow-[0_1px_0_var(--divider)]">
            <tr>
              {selectable && (
                <th className="w-8 px-2 py-2">
                  <Checkbox
                    checked={data.length > 0 && selectedRows.size === data.length}
                    indeterminate={selectedRows.size > 0 && selectedRows.size < data.length}
                    onChange={handleSelectAll}
                    aria-label="Select all rows"
                  />
                </th>
              )}
              {activeColumns.map((col) => (
                <th
                  key={col.id}
                  className={cn(
                    "h-9 px-2 py-2 text-[9px] font-medium uppercase tracking-normal text-tertiary",
                    col.sortable && "cursor-pointer select-none transition-colors hover:text-ink",
                    col.headerClassName
                  )}
                  onClick={() => col.sortable && handleSort(col.id)}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      <div className="flex flex-col">
                        <CaretUp
                          weight="regular"
                          size={10}
                          className={cn(
                            "-mb-[3px]",
                            sortedKey === col.id && sortDirection === "asc"
                              ? "text-ink"
                              : "text-muted opacity-50"
                          )}
                        />
                        <CaretDown
                          weight="regular"
                          size={10}
                          className={cn(
                            sortedKey === col.id && sortDirection === "desc"
                              ? "text-ink"
                              : "text-muted opacity-50"
                          )}
                        />
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-divider bg-surface">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="h-9">
                  {selectable && (
                    <td className="px-2 py-2">
                      <div className="size-3.5 animate-pulse rounded-xs bg-surfaceMuted" />
                    </td>
                  )}
                  {activeColumns.map((col) => (
                    <td key={`skeleton-${i}-${col.id}`} className="px-2 py-2">
                      <div className="h-3 w-full animate-pulse rounded-xs bg-surfaceMuted" />
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              data.map((item) => {
                const id = keyExtractor(item);
                const isSelected = selectedRows.has(id);
                
                return (
                  <tr
                    key={id}
                    onClick={() => onRowClick?.(item)}
                    className={cn(
                      "group h-9 transition-colors hover:bg-surfaceMuted",
                      isSelected && "bg-surfaceMuted",
                      onRowClick && "cursor-pointer"
                    )}
                  >
                    {selectable && (
                      <td className="w-8 px-2 py-2" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleSelectRow(id)}
                          aria-label={`Select row`}
                        />
                      </td>
                    )}
                    {activeColumns.map((col) => (
                      <td
                        key={col.id}
                        className={cn(
                          "px-2 py-2 text-[10px] font-normal leading-4 text-ink",
                          col.className
                        )}
                      >
                        {col.cell(item)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      {pagination && (
        <div className="flex items-center justify-between px-2">
          <div className="text-[10px] text-muted">
            {selectable && selectedRows.size > 0 && (
              <span>{selectedRows.size} selected</span>
            )}
          </div>
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={pagination.onPageChange}
          />
        </div>
      )}
    </div>
  );
}
