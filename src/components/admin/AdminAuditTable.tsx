"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { formatAdminDateTime } from "@/lib/admin/datetime";

// F0-4: rows are fetched server-side from the real audit repository
// (listAuditEvents) and passed in as plain serializable data. The raw
// summary_json is intentionally NOT surfaced here — it may hold PII, and the
// table needs only structural fields.
export type AuditRow = {
  id: string;
  actor: string;
  action: string;
  target: string;
  occurredAt: string;
};

export function AdminAuditTable({ rows, error }: { rows: AuditRow[]; error?: string | null }) {
  const columns = useMemo<ColumnDef<AuditRow, unknown>[]>(
    () => [
      {
        accessorKey: "actor",
        header: "Actor",
        cell: ({ row }) => row.original.actor,
      },
      {
        accessorKey: "action",
        header: "Action",
        cell: ({ row }) => <span className="font-medium">{row.original.action}</span>,
      },
      {
        accessorKey: "target",
        header: "Target",
        cell: ({ row }) => row.original.target || "—",
      },
      {
        accessorKey: "occurredAt",
        header: "When",
        cell: ({ row }) => formatAdminDateTime(row.original.occurredAt),
      },
    ],
    [],
  );

  return (
    <AdminDataTable
      data={rows}
      columns={columns}
      getRowId={(row) => row.id}
      emptyMessage={error ? `Audit log unreadable: ${error}` : "No admin audit events recorded yet."}
      className="min-h-0 flex-1"
    />
  );
}
