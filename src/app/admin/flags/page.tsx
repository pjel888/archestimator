import { AdminFlagsList } from "@/components/admin/AdminFlagsList";
import { AdminMaintenanceModeToggle } from "@/components/admin/AdminMaintenanceModeToggle";
import { Card } from "@/components/ui/card";
import { listFeatureFlags } from "@/lib/admin/feature-flags";

export default async function AdminFlagsPage() {
  const flags = await listFeatureFlags();
  const maintenanceFlag = flags.find((flag) => flag.key === "admin_maintenance_mode") ?? null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
      <div>
        <p className="text-[9px] font-medium uppercase leading-3 text-tertiary">Admin</p>
        <h1 className="text-[12px] font-medium leading-5 text-ink">Feature flags</h1>
        <p className="text-[10px] leading-4 text-tertiary">D1-backed operational feature flags with audited updates.</p>
      </div>
      <AdminMaintenanceModeToggle flag={maintenanceFlag} />
      <Card className="p-2">
        <AdminFlagsList flags={flags} />
      </Card>
    </div>
  );
}
