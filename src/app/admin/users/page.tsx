import { AdminUsersTable } from "@/components/admin/AdminUsersTable";
import { Card } from "@/components/ui/card";

export default function AdminUsersPage() {
  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-2">
      <div>
        <p className="text-[9px] font-medium uppercase leading-3 text-tertiary">Admin</p>
        <h1 className="text-[12px] font-medium leading-5 text-ink">Users</h1>
        <p className="text-[10px] leading-4 text-tertiary">Stubbed user table; wire to admin users repository when Phase 1 lands.</p>
      </div>
      <Card className="flex min-h-0 flex-1 flex-col p-2">
        <AdminUsersTable />
      </Card>
    </div>
  );
}
