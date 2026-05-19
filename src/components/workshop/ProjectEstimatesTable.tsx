"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowSquareOut, CaretDown, CaretUp, CaretUpDown, ClockCounterClockwise, Trash } from "@phosphor-icons/react/dist/ssr";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import type { Tables } from "@/lib/supabase/types";

type ProjectEstimateTableRow = Tables<"estimates"> & {
  firstNodeId?: string | null;
  totalProjectCost: number;
};

type ProjectEstimatesTableProps = {
  estimates: ProjectEstimateTableRow[];
  projectBudget: number | null;
};

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});

const EMPTY_TABLE_ROW_COUNT = 60;

function ProjectEstimatesColGroup() {
  return (
    <colgroup>
      <col className="w-[112px]" />
      <col className="w-[96px]" />
      <col />
      <col className="w-[160px]" />
      <col className="w-[132px]" />
      <col className="w-[112px]" />
      <col className="w-[112px]" />
    </colgroup>
  );
}

ProjectEstimatesColGroup.displayName = "ProjectEstimatesColGroup";

function formatPeso(value: number) {
  return pesoFormatter.format(value).replace("₱", "₱ ");
}

function formatSignedPeso(value: number) {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${formatPeso(Math.abs(value))}`;
}

function getVarianceColorClass(value: number) {
  return value >= 0 ? "text-success" : "text-danger";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getEstimateHref(estimate: ProjectEstimateTableRow) {
  return estimate.firstNodeId
    ? `/workshop/projects/${estimate.project_id}/estimates/${estimate.firstNodeId}`
    : `/workshop/projects/${estimate.project_id}/estimates/${estimate.id}`;
}

function SortIcon({ direction }: { direction: false | "asc" | "desc" }) {
  if (direction === "asc") return <CaretUp size={10} weight="bold" aria-hidden="true" />;
  if (direction === "desc") return <CaretDown size={10} weight="bold" aria-hidden="true" />;
  return <CaretUpDown size={10} weight="bold" aria-hidden="true" />;
}

function ProjectEstimateFillerRows({ columnCount, rowCount, showEmptyMessage }: { columnCount: number; rowCount: number; showEmptyMessage: boolean }) {
  return Array.from({ length: rowCount }, (_, rowIndex) => (
    <tr key={`estimate-filler-row-${rowIndex}`} className="h-10 border-b border-hairline last:border-b-0">
      {Array.from({ length: columnCount }, (_, columnIndex) => (
        <td key={`estimate-filler-cell-${rowIndex}-${columnIndex}`} className="border-r border-hairline px-2 py-2 text-left last:border-r-0">
          {showEmptyMessage && rowIndex === 0 && columnIndex === 1 ? (
            <span className="text-[10px] font-medium text-tertiary">No estimate sheets yet</span>
          ) : null}
        </td>
      ))}
    </tr>
  ));
}

ProjectEstimateFillerRows.displayName = "ProjectEstimateFillerRows";

type ProjectEstimateRowActionsProps = {
  estimate: ProjectEstimateTableRow;
  isSelected: boolean;
  onToggleSelected: (estimateId: string) => void;
};

function ProjectEstimateRowActions({ estimate, isSelected, onToggleSelected }: ProjectEstimateRowActionsProps) {
  const estimateHref = getEstimateHref(estimate);

  return (
    <div className="flex items-center gap-1">
      <input
        type="checkbox"
        className="size-3 rounded border-hairline accent-ink"
        aria-label={`Select ${estimate.name}`}
        checked={isSelected}
        onChange={() => onToggleSelected(estimate.id)}
      />
      <button
        type="button"
        className="grid size-6 place-items-center rounded-sm text-tertiary transition hover:bg-surface-muted hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={`Delete ${estimate.name}`}
        title="Delete action is not wired yet"
        disabled
      >
        <Trash size={12} weight="bold" aria-hidden="true" />
      </button>
      <Link
        href={estimateHref}
        className="grid size-6 place-items-center rounded-sm text-tertiary transition hover:bg-surface-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        aria-label={`Open ${estimate.name}`}
      >
        <ArrowSquareOut size={12} weight="bold" aria-hidden="true" />
      </Link>
      <button
        type="button"
        className="grid size-6 place-items-center rounded-sm text-tertiary transition hover:bg-surface-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={`View version history for ${estimate.name}`}
        title="Version history is not wired yet"
        disabled
      >
        <ClockCounterClockwise size={12} weight="bold" aria-hidden="true" />
      </button>
    </div>
  );
}

ProjectEstimateRowActions.displayName = "ProjectEstimateRowActions";

function ProjectEstimatesTableComponent({ estimates, projectBudget }: ProjectEstimatesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "updated_at", desc: true }]);
  const [selectedEstimateIds, setSelectedEstimateIds] = useState<Set<string>>(() => new Set());

  function toggleEstimateSelection(estimateId: string) {
    setSelectedEstimateIds((current) => {
      const next = new Set(current);
      if (next.has(estimateId)) next.delete(estimateId);
      else next.add(estimateId);
      return next;
    });
  }

  const columns = useMemo<ColumnDef<ProjectEstimateTableRow>[]>(
    () => [
      {
        id: "row_actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => {
          const estimate = row.original;

          return (
            <ProjectEstimateRowActions
              estimate={estimate}
              isSelected={selectedEstimateIds.has(estimate.id)}
              onToggleSelected={toggleEstimateSelection}
            />
          );
        },
      },
      {
        accessorKey: "sheet_code",
        header: "Sheet Code",
        cell: ({ row }) => <span className="font-semibold text-tertiary">{row.original.sheet_code}</span>,
      },
      {
        accessorKey: "name",
        header: "Estimate Sheet Name",
        cell: ({ row }) => (
          <Link
            href={getEstimateHref(row.original)}
            className="font-bold text-ink hover:text-accent-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        accessorKey: "totalProjectCost",
        header: "Ongoing Project Cost",
        cell: ({ row }) => <span className="font-mono font-bold tabular-nums text-ink">{formatPeso(row.original.totalProjectCost)}</span>,
      },
      {
        id: "overbudget",
        header: "Overbudget",
        accessorFn: (row) => (projectBudget ?? 0) - row.totalProjectCost,
        cell: ({ row }) => {
          if (projectBudget === null) return <span className="font-medium text-tertiary">No budget set</span>;
          const budgetVariance = projectBudget - row.original.totalProjectCost;
          return (
            <span className={`font-mono font-bold tabular-nums ${getVarianceColorClass(budgetVariance)}`}>
              {formatSignedPeso(budgetVariance)}
            </span>
          );
        },
      },
      {
        accessorKey: "created_at",
        header: "Created",
        cell: ({ row }) => <span className="whitespace-nowrap font-medium text-tertiary">{formatDateTime(row.original.created_at)}</span>,
      },
      {
        accessorKey: "updated_at",
        header: "Updated",
        cell: ({ row }) => <span className="whitespace-nowrap font-medium text-tertiary">{formatDateTime(row.original.updated_at)}</span>,
      },
    ],
    [projectBudget, selectedEstimateIds],
  );

  const table = useReactTable({
    data: estimates,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  const visibleRows = table.getRowModel().rows;
  const fillerRowCount = Math.max(EMPTY_TABLE_ROW_COUNT - visibleRows.length, 0);

  return (
    <div className="flex h-full min-h-0 flex-col border-t border-hairline">
      <div className="shrink-0 overflow-hidden">
        <table className="min-w-full table-fixed border-collapse text-left text-[10px]">
          <ProjectEstimatesColGroup />
        <thead className="bg-surface-muted text-[10px] font-bold text-tertiary">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="h-16 border-b border-hairline">
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sorted = header.column.getIsSorted();
                return (
                  <th key={header.id} scope="col" className="border-r border-hairline bg-surface-muted px-2 py-4 text-left text-[10px] font-bold last:border-r-0">
                    {canSort ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="min-h-0 justify-start gap-1 rounded-sm p-0 text-left text-[10px] font-bold text-tertiary hover:bg-transparent"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <SortIcon direction={sorted} />
                      </Button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        </table>
      </div>
      <div className="min-h-0 flex-1 overflow-auto [scrollbar-gutter:stable]">
        <table className="min-w-full table-fixed border-collapse text-left text-[10px]">
          <ProjectEstimatesColGroup />
        <tbody className="bg-white text-ink">
          {visibleRows.map((row) => (
            <tr key={row.id} className="h-10 border-b border-hairline transition hover:bg-surface-muted/60">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="border-r border-hairline px-2 py-2 text-left last:border-r-0">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
          {fillerRowCount > 0 ? (
            <ProjectEstimateFillerRows columnCount={table.getAllLeafColumns().length} rowCount={fillerRowCount} showEmptyMessage={visibleRows.length === 0} />
          ) : null}
        </tbody>
      </table>
      </div>
    </div>
  );
}

ProjectEstimatesTableComponent.displayName = "ProjectEstimatesTable";

export const ProjectEstimatesTable = ProjectEstimatesTableComponent;
