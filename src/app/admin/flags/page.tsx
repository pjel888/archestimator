import { AdminFlagsList } from "@/components/admin/AdminFlagsList";
import { Card } from "@/components/ui/card";
import { listFeatureFlags } from "@/lib/admin/feature-flags";

export default async function AdminFlagsPage() {
  const flags = await listFeatureFlags();
  // F0-9: the admin_maintenance_mode flag is intentionally not surfaced here.
  // It previously had a toggle that set the flag but enforced nothing at any
  // mutation boundary — a deceptive control. A real, cross-cutting maintenance
  // mode (estimates + projects + publications + uploads) belongs in the F5/F6
  // operations slices with enforcement included; the flag row is left in place
  // for that future wiring.
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
      <div>
        <p className="text-[9px] font-medium uppercase leading-3 text-tertiary">Admin</p>
        <h1 className="text-[12px] font-medium leading-5 text-ink">Feature flags</h1>
        <p className="text-[10px] leading-4 text-tertiary">D1-backed operational feature flags with audited updates.</p>
      </div>
      <Card className="p-2">
        <AdminFlagsList flags={flags} />
      </Card>
    </div>
  );
}
