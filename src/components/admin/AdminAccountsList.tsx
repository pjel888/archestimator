"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { formatAdminDate } from "@/lib/admin/datetime";
import type { CorporateAccountWithCountRow } from "@/lib/admin/corporate-account-repository";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";

function AccountMobileCard({ account }: { account: CorporateAccountWithCountRow }) {
  return (
    <article className="border-b border-hairline p-3 last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/admin/accounts/${account.id}`}
            className="truncate text-[11px] font-medium leading-4 text-ink hover:underline"
          >
            {account.name}
          </Link>
          {account.description ? (
            <p className="mt-0.5 line-clamp-2 text-[9px] leading-3 text-tertiary">{account.description}</p>
          ) : null}
        </div>
        <Badge tone={account.status === "active" ? "success" : "warning"} size="xs" className="min-w-0 px-1">
          {account.status}
        </Badge>
      </div>
      <dl className="mt-2 grid grid-cols-3 gap-2 rounded-xs bg-surfaceMuted/70 p-2">
        <div>
          <dt className="text-[8px] font-medium uppercase leading-3 text-tertiary">Members</dt>
          <dd className="text-[10px] leading-4 text-ink">{account.member_count}</dd>
        </div>
        <div>
          <dt className="text-[8px] font-medium uppercase leading-3 text-tertiary">Workspaces</dt>
          <dd className="text-[10px] leading-4 text-ink">{account.workspace_count}</dd>
        </div>
        <div>
          <dt className="text-[8px] font-medium uppercase leading-3 text-tertiary">Created</dt>
          <dd className="text-[10px] leading-4 text-ink">{formatAdminDate(account.created_at)}</dd>
        </div>
      </dl>
      <div className="mt-2 flex justify-end">
        <Link
          href={`/admin/accounts/${account.id}`}
          className="inline-flex min-h-8 items-center rounded-xs border border-hairline px-2 text-[10px] font-medium text-ink hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          Open account
        </Link>
      </div>
    </article>
  );
}

export function AdminAccountsList({
  accounts,
  archived = false,
}: {
  accounts: CorporateAccountWithCountRow[];
  archived?: boolean;
}) {
  const [search, setSearch] = useState("");

  const visibleAccounts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return accounts;
    return accounts.filter((account) =>
      [account.name, account.description ?? ""].some((value) => value.toLowerCase().includes(query)),
    );
  }, [accounts, search]);

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
            {formatAdminDate(row.original.created_at)}
          </span>
        ),
      },
    ],
    [],
  );

  const emptyMessage = archived
    ? "No archived corporate accounts."
    : "No corporate accounts yet. Create one above.";

  return (
    <div className="flex flex-col gap-2">
      <SearchInput
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        onClear={() => setSearch("")}
        placeholder="Search accounts…"
        aria-label="Filter accounts"
        wrapperClassName="w-full border border-hairline bg-white sm:max-w-xs"
      />

      <div className="overflow-hidden rounded-xs border border-hairline md:hidden">
        {visibleAccounts.length > 0 ? (
          visibleAccounts.map((account) => <AccountMobileCard key={account.id} account={account} />)
        ) : (
          <p className="p-4 text-center text-[10px] leading-4 text-tertiary">{emptyMessage}</p>
        )}
      </div>

      <div className="hidden md:block">
        <AdminDataTable
          data={accounts}
          columns={columns}
          getRowId={(row) => row.id}
          globalFilter={search}
          emptyMessage={emptyMessage}
        />
      </div>
    </div>
  );
}
