import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { AdminSavedReplies } from "@/components/admin/AdminSavedReplies";
import { Card } from "@/components/ui/card";
import { listSavedReplies } from "@/lib/admin/saved-replies-repository";

export const dynamic = "force-dynamic";

// F4 (UNIT-005) Saved replies — admin canned responses for support/customer comms.
export default async function AdminSavedRepliesPage() {
  const replies = await listSavedReplies();

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Admin"
        title="Saved replies"
        description="Canned responses for support and customer communications."
      />
      <Card className="p-2">
        <AdminSavedReplies initialReplies={replies} />
      </Card>
    </AdminPage>
  );
}
