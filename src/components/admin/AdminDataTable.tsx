"use client";

/**
 * AdminDataTable — TanStack Table + shadcn Table chrome for admin density.
 * Callers: AdminUsersTable, AdminAccountsList, AdminAuditTable, AdminProjectsTable.
 * User instruction: integrate tanstack tables for admin shadcn migration.
 */

import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { CaretDown, CaretUp } from "@phosphor-icons/react/dist/ssr";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/ui/cn";

const VIRTUALIZE_MIN_ROWS = 75;
const ROW_HEIGHT = 32;

export type AdminDataTableProps<TData> = {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  getRowId: (row: TData) => string;
  emptyMessage?: string;
  className?: string;
  /** Optional global filter string applied to all stringifiable cell values when no column filterFn is set. */
  globalFilter?: string;
  onRowClick?: (row: TData) => void;
};

export function AdminDataTable<TData>({
  data,
  columns,
  getRowId,
  emptyMessage = "No rows.",
  className,
  globalFilter = "",
  onRowClick,
}: AdminDataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
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
