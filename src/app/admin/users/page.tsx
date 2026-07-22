import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { AdminUsersTable } from "@/components/admin/AdminUsersTable";
import { Card } from "@/components/ui/card";
import { listAdminUsers } from "@/lib/admin/users-repository";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const { search = "" } = await searchParams;
  const result = await listAdminUsers({ page: 1, limit: 50 });
  const users = result.data;
  const error = result.error;
  const count = result.count ?? 0;

  return (
    <AdminPage className="h-full">
      <AdminPageHeader
        eyebrow="Admin"
        title="User directory"
        description={error ? error : "Review access, ownership, login history, observed product activity, and account controls in one place."}
      />
      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
        <AdminUsersTable initialUsers={users} totalCount={count} initialSearch={search} />
      </Card>
    </AdminPage>
  );
}
