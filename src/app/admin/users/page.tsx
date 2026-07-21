import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { AdminUsersTable } from "@/components/admin/AdminUsersTable";
import { Card } from "@/components/ui/card";
import { listAdminUsers } from "@/lib/admin/users-repository";

export default async function AdminUsersPage() {
  const result = await listAdminUsers({ page: 1, limit: 50 });
  const users = result.data;
  const error = result.error;
  const count = result.count ?? 0;

  return (
    <AdminPage className="h-full">
      <AdminPageHeader
        eyebrow="Admin"
        title="Users"
        description={error ? error : `${count} total users${users.length < count ? ` (showing first ${users.length})` : ""}.`}
      />
      <Card className="flex min-h-0 flex-1 flex-col p-2">
        <AdminUsersTable initialUsers={users} />
      </Card>
    </AdminPage>
  );
}
