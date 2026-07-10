"use client";

import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";

type AuditRow = {
  id: string;
  actor: string;
  action: string;
  target: string;
  status: "active" | "danger" | "review";
  occurredAt: string;
};

const rows: AuditRow[] = [
  { id: "aud_001", actor: "admin@example.com", action: "flag.view", target: "admin_dashboard", status: "active", occurredAt: "Stub" },
  { id: "aud_002", actor: "system", action: "metrics.read", target: "signups", status: "review", occurredAt: "Stub" },
  { id: "aud_003", actor: "support@example.com", action: "thread.open", target: "sup_001", status: "active", occurredAt: "Stub" },
];

const columns: ColumnDef<AuditRow>[] = [
  { id: "actor", header: "Actor", cell: (row) => row.actor },
  { id: "action", header: "Action", cell: (row) => <span className="font-medium">{row.action}</span> },
  { id: "target", header: "Target", cell: (row) => row.target },
  { id: "status", header: "Status", cell: (row) => <StatusBadge status={row.status}>{row.status}</StatusBadge> },
  { id: "occurredAt", header: "When", cell: (row) => row.occurredAt },
];

export function AdminAuditTable() {
  return (
    <DataTable
      data={rows}
      columns={columns}
      keyExtractor={(row) => row.id}
      emptyState={{ title: "No audit events", description: "Audit repository wiring is pending." }}
      className="min-h-0 flex-1 rounded-xs border border-hairline"
    />
  );
}
