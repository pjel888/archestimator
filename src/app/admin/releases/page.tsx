import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { AdminReleaseCenter } from "@/components/admin/AdminReleaseCenter";
import { Card } from "@/components/ui/card";
import { listReleaseRecords } from "@/lib/admin/release-center-repository";

export const dynamic = "force-dynamic";

// F5 (UNIT-006) Release Center — "is the next release safe to ship?"
export default async function AdminReleasesPage() {
  const records = await listReleaseRecords();

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Admin"
        title="Releases"
        description="Release log with go/no-go state. Log a release before shipping; mark it shipped, blocked, or rolled back."
      />
      <Card className="p-2">
        <AdminReleaseCenter initialRecords={records} />
      </Card>
    </AdminPage>
  );
}
