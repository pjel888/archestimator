import { AdminAuditTable } from "@/components/admin/AdminAuditTable";
import { Card } from "@/components/ui/card";

export default function AdminAuditPage() {
  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-2">
      <div>
        <p className="text-[9px] font-medium uppercase leading-3 text-tertiary">Admin</p>
        <h1 className="text-[12px] font-medium leading-5 text-ink">Audit</h1>
        <p className="text-[10px] leading-4 text-tertiary">Read-only placeholder table; no production audit claims yet.</p>
      </div>
      <Card className="flex min-h-0 flex-1 flex-col p-2">
        <AdminAuditTable />
      </Card>
    </div>
  );
}
