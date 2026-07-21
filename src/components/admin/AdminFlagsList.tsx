"use client";

import { useMemo, useState, useTransition } from "react";

import { setFeatureFlag } from "@/lib/admin/flag-actions";
import type { AdminFeatureGateView } from "@/lib/admin/feature-gate-views";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

const CATEGORY_LABELS: Record<AdminFeatureGateView["category"], string> = {
  beta_product: "Beta product",
  admin_ops: "Admin operations",
  client_portal: "Client portal",
  other: "Other",
};

const ENFORCEMENT_LABELS: Record<AdminFeatureGateView["enforcement"], string> = {
  enforced: "enforced",
  reserved: "reserved",
  unknown: "unknown",
};

export function AdminFlagsList({ flags }: { flags: AdminFeatureGateView[] }) {
  // Optimistic overrides keyed by flag key. When a toggle is in flight, the
  // optimistic value overrides the server prop. On success/failure the server
  // prop is the source of truth (revalidated by the server action).
  const [optimisticOverrides, setOptimisticOverrides] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const displayFlags = useMemo(
    () =>
      flags.map((flag) =>
        flag.key in optimisticOverrides ? { ...flag, enabled: optimisticOverrides[flag.key] } : flag,
      ),
    [flags, optimisticOverrides],
  );

  const grouped = useMemo(() => {
    const groups = new Map<AdminFeatureGateView["category"], AdminFeatureGateView[]>();
    for (const flag of displayFlags) {
      const list = groups.get(flag.category) ?? [];
      list.push(flag);
      groups.set(flag.category, list);
    }
    return Array.from(groups.entries());
  }, [displayFlags]);

  function handleToggle(key: string, enabled: boolean) {
    setOptimisticOverrides((current) => ({ ...current, [key]: enabled }));
    setNotice(null);
    startTransition(async () => {
      const result = await setFeatureFlag({ key, enabled });
      if (!result.ok) {
        setOptimisticOverrides((current) => {
          const next = { ...current };
          delete next[key];
          return next;
        });
        setNotice(
          result.error === "reserved"
            ? `${key} is reserved and cannot be toggled until enforcement is wired.`
            : `Could not update ${key}.`,
        );
        return;
      }
      setOptimisticOverrides((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      setNotice(`${key} ${enabled ? "enabled" : "disabled"}.`);
    });
  }

  return (
    <div className="space-y-3">
      {notice && <p className="text-[10px] leading-4 text-tertiary">{notice}</p>}
      {grouped.map(([category, categoryFlags]) => (
        <section key={category} className="space-y-1.5">
          <h3 className="px-1 text-[9px] font-medium uppercase leading-3 tracking-normal text-tertiary">
            {CATEGORY_LABELS[category]}
          </h3>
          <div className="divide-y divide-divider rounded-xs border border-hairline bg-white">
            {categoryFlags.map((flag) => (
              <div key={flag.key} className="flex items-start justify-between gap-2 p-2 sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-[10px] font-medium leading-4 text-ink text-pretty">{flag.title}</p>
                    <Badge tone={flag.enabled ? "success" : "neutral"} size="xs" className="min-w-0 px-1">
                      {flag.enabled ? "on" : "off"}
                    </Badge>
                    <Badge
                      tone={flag.enforcement === "enforced" ? "accent" : "neutral"}
                      size="xs"
                      className="min-w-0 px-1"
                    >
                      {ENFORCEMENT_LABELS[flag.enforcement]}
                    </Badge>
                    {!flag.toggleable ? (
                      <Badge tone="warning" size="xs" className="min-w-0 px-1">
                        read-only
                      </Badge>
                    ) : null}
                  </div>
                  <p className="break-all text-[9px] leading-3 text-tertiary">{flag.key}</p>
                  <p className="text-[9px] leading-3 text-tertiary text-pretty">
                    {flag.catalogDescription ?? flag.description ?? "No description."}
                  </p>
                  <p className="mt-1 text-[9px] leading-3 text-tertiary">Updated {flag.updated_at}</p>
                </div>
                <Switch
                  checked={flag.enabled}
                  onChange={(enabled) => handleToggle(flag.key, enabled)}
                  aria-label={`Toggle ${flag.key}`}
                  disabled={isPending || !flag.toggleable}
                  className="mt-0.5 shrink-0 sm:mt-0"
                />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
