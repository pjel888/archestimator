"use client";

import { useMemo, useState } from "react";

import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { SearchInput } from "@/components/ui/search-input";
import { StatusBadge } from "@/components/ui/status-badge";

type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "inactive";
  joined: string;
};

const rows: AdminUserRow[] = [
  { id: "usr_001", name: "Philip Lewis", email: "philip@example.com", role: "ceo", status: "active", joined: "Jul 2026" },
  { id: "usr_002", name: "Demo Admin", email: "admin@example.com", role: "admin", status: "active", joined: "Jul 2026" },
  { id: "usr_003", name: "Beta Member", email: "member@example.com", role: "member", status: "inactive", joined: "Stub" },
];

const columns: ColumnDef<AdminUserRow>[] = [
  { id: "name", header: "Name", cell: (row) => <span className="font-medium">{row.name}</span> },
  { id: "email", header: "Email", cell: (row) => row.email },
  { id: "role", header: "Role", cell: (row) => row.role },
  { id: "status", header: "Status", cell: (row) => <StatusBadge status={row.status}>{row.status}</StatusBadge> },
  { id: "joined", header: "Joined", cell: (row) => row.joined },
];

export function AdminUsersTable() {
  const [query, setQuery] = useState("");
  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return rows;
    return rows.filter((row) =>
      [row.name, row.email, row.role, row.status].some((value) => value.toLowerCase().includes(normalized)),
    );
  }, [query]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <SearchInput
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
        onClear={() => setQuery("")}
        placeholder="Search users"
        wrapperClassName="border border-hairline bg-white"
      />
      <DataTable
        data={filteredRows}
        columns={columns}
        keyExtractor={(row) => row.id}
        emptyState={{ title: "No users found", description: "User repository wiring is pending." }}
        className="min-h-0 flex-1 rounded-xs border border-hairline"
      />
    </div>
  );
}
