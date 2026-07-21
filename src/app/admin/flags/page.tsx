import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { AdminFlagsList } from "@/components/admin/AdminFlagsList";
import { Card } from "@/components/ui/card";
import { listAdminFeatureGateViews } from "@/lib/admin/feature-gate-views";

export default async function AdminFlagsPage() {
  const flags = await listAdminFeatureGateViews();

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Admin"
        title="Feature gates"
        description="Closed-beta product and ops gates. Enforced gates change live behavior; reserved gates stay read-only until wired."
      />
      <Card className="p-2">
        <AdminFlagsList flags={flags} />
      </Card>
    </AdminPage>
  );
}
