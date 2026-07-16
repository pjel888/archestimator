import { AdminReleaseCenter } from "@/components/admin/AdminReleaseCenter";
import { Card } from "@/components/ui/card";
import { listReleaseRecords } from "@/lib/admin/release-center-repository";

export const dynamic = "force-dynamic";

// F5 (UNIT-006) Release Center — "is the next release safe to ship?"
export default async function AdminReleasesPage() {
  const records = await listReleaseRecords();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
      <div>
        <p className="text-[9px] font-medium uppercase leading-3 text-tertiary">Admin</p>
        <h1 className="text-[12px] font-medium leading-5 text-ink">Releases</h1>
        <p className="text-[10px] leading-4 text-tertiary">
          Release log with go/no-go state. Log a release before shipping; mark it shipped, blocked, or rolled back.
        </p>
      </div>
      <Card className="p-2">
        <AdminReleaseCenter initialRecords={records} />
      </Card>
    </div>
  );
}
