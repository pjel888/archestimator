"use client";

/**
 * AdminDataTable — TanStack Table + shadcn Table chrome for admin density.
 * Callers: AdminUsersTable, AdminAccountsList, AdminAuditTable, AdminProjectsTable,
 * AdminAccountMembers, AdminAccountWorkspaces, AdminAllowlistManager.
 * Header-click sorting is the canonical organization control; pass a stable
 * `persistenceKey` so the chosen sort survives refreshes (localStorage).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type SortingState,
} from "@tanstack/react-table";
import { CaretDown, CaretUp } from "@phosphor-icons/react/dist/ssr";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/ui/cn";

const VIRTUALIZE_MIN_ROWS = 75;
const ROW_HEIGHT = 32;

function isSortingState(value: unknown): value is SortingState {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item !== null &&
        typeof item === "object" &&
        typeof (item as { id?: unknown }).id === "string" &&
        typeof (item as { desc?: unknown }).desc === "boolean",
    )
  );
}

export type AdminDataTableProps<TData> = {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  getRowId: (row: TData) => string;
  emptyMessage?: string;
  className?: string;
  /** Optional global filter string applied to all stringifiable cell values when no column filterFn is set. */
  globalFilter?: string;
  onRowClick?: (row: TData) => void;
  /**
   * Stable key used to persist the header-click sorting state in localStorage
   * so the chosen column order survives refreshes. Unique per table instance.
   */
  persistenceKey?: string;
};

export function AdminDataTable<TData>({
  data,
  columns,
  getRowId,
  emptyMessage = "No rows.",
  className,
  globalFilter = "",
  onRowClick,
  persistenceKey,
}: AdminDataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const storageKey = persistenceKey ? `archestimator:admin-table:${persistenceKey}:sorting` : null;
  /* Guard against clobbering the stored sort with the mount-time default before it is read. */
  const hasRestoredSorting = useRef(false);

  /* Restore after mount: reading localStorage during render would diverge from the SSR pass. */
  useEffect(() => {
    hasRestoredSorting.current = false;
    if (storageKey) {
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (isSortingState(parsed)) setSorting(parsed);
        }
      } catch {
        /* Unreadable storage must never break the table. */
      }
    }
    hasRestoredSorting.current = true;
  }, [storageKey]);

  const handleSortingChange = useCallback<OnChangeFn<SortingState>>(
    (updater) => {
      setSorting((current) => {
        const next = typeof updater === "function" ? updater(current) : updater;
        if (storageKey && hasRestoredSorting.current) {
          try {
            if (next.length > 0) {
              window.localStorage.setItem(storageKey, JSON.stringify(next));
            } else {
              window.localStorage.removeItem(storageKey);
            }
          } catch {
            /* Quota/privacy-mode failures must never break sorting. */
          }
        }
        return next;
      });
    },
    [storageKey],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: handleSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowId: (row) => getRowId(row),
    globalFilterFn: "includesString",
  });

  const rows = table.getRowModel().rows;
  const shouldVirtualize = rows.length >= VIRTUALIZE_MIN_ROWS;

  const virtualizer = useVirtualizer({
    count: shouldVirtualize ? rows.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
    enabled: shouldVirtualize,
  });

  const virtualRows = shouldVirtualize ? virtualizer.getVirtualItems() : null;
  const paddingTop = virtualRows?.length ? virtualRows[0]?.start ?? 0 : 0;
  const paddingBottom = virtualRows?.length
    ? virtualizer.getTotalSize() - (virtualRows[virtualRows.length - 1]?.end ?? 0)
    : 0;

  const visibleRows = useMemo(() => {
    if (!virtualRows) return rows;
    return virtualRows.map((virtualRow) => rows[virtualRow.index]).filter(Boolean);
  }, [rows, virtualRows]);

  return (
    <div
      ref={scrollRef}
      className={cn(
        "min-h-0 flex-1 overflow-auto overscroll-contain rounded-xs border border-hairline",
        /* Keep wide admin tables scannable on phones without dropping columns. */
        "touch-pan-x [-webkit-overflow-scrolling:touch]",
        className,
      )}
    >
      <Table className="min-w-[36rem]">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sorted = header.column.getIsSorted();
                return (
                  <TableHead
                    key={header.id}
                    className={cn(canSort && "cursor-pointer select-none", header.column.columnDef.meta && "text-right")}
                    aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : canSort ? "none" : undefined}
                    onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      {sorted === "asc" ? <CaretUp size={10} aria-hidden /> : null}
                      {sorted === "desc" ? <CaretDown size={10} aria-hidden /> : null}
                    </span>
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length} className="py-4 text-center text-tertiary">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            <>
              {paddingTop > 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={columns.length} style={{ height: paddingTop }} className="p-0" />
                </TableRow>
              ) : null}
              {visibleRows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  className={cn(onRowClick && "cursor-pointer")}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))}
              {paddingBottom > 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={columns.length} style={{ height: paddingBottom }} className="p-0" />
                </TableRow>
              ) : null}
            </>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
