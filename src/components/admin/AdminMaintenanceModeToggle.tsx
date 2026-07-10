"use client";

import { useState, useTransition } from "react";

import { setFeatureFlag } from "@/lib/admin/flag-actions";
import type { AdminFeatureFlag } from "@/lib/admin/feature-flags";
import { Switch } from "@/components/ui/switch";

export function AdminMaintenanceModeToggle({ flag }: { flag: AdminFeatureFlag | null }) {
  const [enabled, setEnabled] = useState(flag?.enabled ?? false);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleToggle(nextEnabled: boolean) {
    const previous = enabled;
    setEnabled(nextEnabled);
    setNotice(null);
    startTransition(async () => {
      const result = await setFeatureFlag({ key: "admin_maintenance_mode", enabled: nextEnabled });
      if (!result.ok) {
        setEnabled(previous);
        setNotice("Maintenance mode could not be updated.");
        return;
      }
      setNotice(`Maintenance mode ${nextEnabled ? "enabled" : "disabled"}.`);
    });
  }

  return (
    <div className="rounded-xs border border-hairline bg-white p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-medium leading-4 text-ink">Maintenance mode</p>
          <p className="text-[9px] leading-4 text-tertiary">Readable <code className="font-mono">admin_maintenance_mode</code> flag. Workshop mutation enforcement remains documented as a follow-up.</p>
        </div>
        <Switch checked={enabled} onChange={handleToggle} disabled={isPending || !flag} aria-label="Toggle maintenance mode" />
      </div>
      {notice && <p className="mt-2 text-[9px] leading-3 text-tertiary">{notice}</p>}
      {!flag && <p className="mt-2 text-[9px] leading-3 text-tertiary">Flag row is missing from D1.</p>}
    </div>
  );
}
