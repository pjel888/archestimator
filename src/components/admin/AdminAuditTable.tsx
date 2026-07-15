"use client";

import { DataTable, type ColumnDef } from "@/components/ui/data-table";

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
  const columns: ColumnDef<AuditRow>[] = [
    { id: "actor", header: "Actor", cell: (row) => row.actor },
    { id: "action", header: "Action", cell: (row) => <span className="font-medium">{row.action}</span> },
    { id: "target", header: "Target", cell: (row) => row.target || "—" },
    {
      id: "occurredAt",
      header: "When",
      cell: (row) => (row.occurredAt ? new Date(row.occurredAt).toLocaleString() : "—"),
    },
  ];

  return (
    <DataTable
      data={rows}
      columns={columns}
      keyExtractor={(row) => row.id}
      emptyState={{
        title: error ? "Audit log unreadable" : "No audit events",
        description: error ?? "No admin audit events recorded yet.",
      }}
      className="min-h-0 flex-1 rounded-xs border border-hairline"
    />
  );
}
