"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { AdminDataTable } from "@/components/admin/AdminDataTable";
import type { CorporateAccountWithCountRow } from "@/lib/admin/corporate-account-repository";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";

export function AdminAccountsList({
  accounts,
  archived = false,
}: {
  accounts: CorporateAccountWithCountRow[];
  archived?: boolean;
}) {
  const [search, setSearch] = useState("");

  const columns = useMemo<ColumnDef<CorporateAccountWithCountRow, unknown>[]>(
    () => [
      {
        id: "name",
        accessorFn: (row) => `${row.name} ${row.description ?? ""}`,
        header: "Name",
        cell: ({ row }) => {
          const account = row.original;
          return (
            <Link href={`/admin/accounts/${account.id}`} className="block hover:underline">
              <p className="text-[10px] font-medium leading-4 text-ink">{account.name}</p>
              {account.description ? (
                <p className="text-[9px] leading-3 text-tertiary">{account.description}</p>
              ) : null}
            </Link>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge tone={row.original.status === "active" ? "success" : "warning"} size="xs" className="min-w-0 px-1">
            {row.original.status}
          </Badge>
        ),
      },
      {
        accessorKey: "member_count",
        header: "Members",
        cell: ({ row }) => <span className="text-tertiary">{row.original.member_count}</span>,
      },
      {
        accessorKey: "workspace_count",
        header: "Workspaces",
        cell: ({ row }) => <span className="text-tertiary">{row.original.workspace_count}</span>,
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
        placeholder="Search accounts…"
        aria-label="Filter accounts"
        wrapperClassName="w-full max-w-xs border border-hairline bg-white"
      />
      <AdminDataTable
        data={accounts}
        columns={columns}
        getRowId={(row) => row.id}
        globalFilter={search}
        emptyMessage={archived ? "No archived corporate accounts." : "No corporate accounts yet. Create one above."}
      />
    </div>
  );
}
