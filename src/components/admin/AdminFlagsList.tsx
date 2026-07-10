"use client";

import { useState, useTransition } from "react";

import { setFeatureFlag } from "@/lib/admin/flag-actions";
import type { AdminFeatureFlag } from "@/lib/admin/feature-flags";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

export function AdminFlagsList({ flags }: { flags: AdminFeatureFlag[] }) {
  const [localFlags, setLocalFlags] = useState(flags);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleToggle(key: string, enabled: boolean) {
    const previous = localFlags;
    setLocalFlags((current) => current.map((item) => (item.key === key ? { ...item, enabled } : item)));
    setNotice(null);
    startTransition(async () => {
      const result = await setFeatureFlag({ key, enabled });
      if (!result.ok) {
        setLocalFlags(previous);
        setNotice(`Could not update ${key}.`);
        return;
      }
      setLocalFlags((current) => current.map((item) => (item.key === key ? result.flag : item)));
      setNotice(`${key} ${enabled ? "enabled" : "disabled"}.`);
    });
  }

  return (
    <div>
      {notice && <p className="mb-2 text-[10px] leading-4 text-tertiary">{notice}</p>}
      <div className="divide-y divide-divider rounded-xs border border-hairline bg-white">
        {localFlags.map((flag) => (
          <div key={flag.key} className="flex items-center justify-between gap-2 p-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-[10px] font-medium leading-4 text-ink">{flag.key}</p>
                <Badge tone={flag.enabled ? "success" : "neutral"} size="xs" className="min-w-0 px-1">
                  {flag.enabled ? "on" : "off"}
                </Badge>
              </div>
              <p className="text-[9px] leading-3 text-tertiary">{flag.description ?? "No description."}</p>
              <p className="mt-1 text-[9px] leading-3 text-tertiary">Updated {flag.updated_at}</p>
            </div>
            <Switch
              checked={flag.enabled}
              onChange={(enabled) => handleToggle(flag.key, enabled)}
              aria-label={`Toggle ${flag.key}`}
              disabled={isPending}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
