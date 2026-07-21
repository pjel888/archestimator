import { AdminAuditTable } from "@/components/admin/AdminAuditTable";
import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { Card } from "@/components/ui/card";
import { listAuditEvents } from "@/lib/admin/audit-repository";

// F0-4: render the real admin audit trail from D1 instead of placeholder copy.
// Read-only; sensitive summary_json is not surfaced (see AdminAuditTable).
export default async function AdminAuditPage() {
  const result = await listAuditEvents({ page: 1, limit: 50 });
  const events = result.data ?? [];
  const rows = events.map((event) => ({
    id: event.id,
    actor: event.actor_email,
    action: event.action,
    target: [event.target_type, event.target_id].filter(Boolean).join(":"),
    occurredAt: event.created_at,
  }));

  return (
    <AdminPage className="h-full">
      <AdminPageHeader
        eyebrow="Admin"
        title="Audit"
        description="Read-only admin audit trail from D1 (newest 50). Summary payloads are redacted."
      />
      <Card className="flex min-h-0 flex-1 flex-col p-2">
        <AdminAuditTable rows={rows} error={result.error} />
      </Card>
    </AdminPage>
  );
}
