"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { AdminDataTable } from "@/components/admin/AdminDataTable";
import type { AdminProjectOverviewRow } from "@/lib/admin/projects-overview-repository";
import { SearchInput } from "@/components/ui/search-input";

export function AdminProjectsTable({ projects }: { projects: AdminProjectOverviewRow[] }) {
  const [search, setSearch] = useState("");

  const columns = useMemo<ColumnDef<AdminProjectOverviewRow, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Project",
        cell: ({ row }) => (
          <Link
            href={`/admin/projects/${row.original.id}`}
            className="font-medium text-ink hover:underline"
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        accessorKey: "project_code",
        header: "Code",
        cell: ({ row }) => (
          <span className="text-[9px] leading-3 text-tertiary">{row.original.project_code ?? "—"}</span>
        ),
      },
      {
        accessorKey: "created_at",
        header: "Created",
        cell: ({ row }) => (
          <span className="text-[9px] leading-3 text-tertiary">
            {new Date(row.original.created_at).toLocaleDateString()}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-2">
      <SearchInput
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        onClear={() => setSearch("")}
        placeholder="Filter projects…"
        aria-label="Filter projects"
        wrapperClassName="w-full max-w-xs border border-hairline bg-white"
      />
      <AdminDataTable
        data={projects}
        columns={columns}
        getRowId={(row) => row.id}
        globalFilter={search}
        emptyMessage="No projects found."
      />
    </div>
  );
}
