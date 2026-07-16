import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  isFindingActionable,
  runDataQualityChecks,
  type DataQualitySeverity,
} from "@/lib/admin/data-quality-repository";

const SEVERITY_TONE: Record<DataQualitySeverity, "neutral" | "warning" | "danger"> = {
  info: "neutral",
  warning: "warning",
  critical: "danger",
};

export const dynamic = "force-dynamic";

// F6 (UNIT-007) Data quality — read-only findings. Repair (dry-run/apply) comes later.
export default async function AdminDataQualityPage() {
  const findings = await runDataQualityChecks();
  const actionable = findings.filter(isFindingActionable);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
      <div>
        <p className="text-[9px] font-medium uppercase leading-3 text-tertiary">Admin</p>
        <h1 className="text-[12px] font-medium leading-5 text-ink">Data quality</h1>
        <p className="text-[10px] leading-4 text-tertiary">
          Read-only referential-integrity findings. Each check is isolated; a check that cannot run
          in this environment is skipped, not hidden. Repair (dry-run/apply) arrives in a later slice.
        </p>
      </div>

      <Card className="p-2">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-[11px] font-medium leading-4 text-ink">Findings</h2>
          <Badge tone={actionable.length > 0 ? "warning" : "success"} size="xs" className="min-w-0 px-1">
            {actionable.length} actionable
          </Badge>
        </div>
        <ul className="space-y-1" aria-label="Data quality findings">
          {findings.map((finding) => (
            <li
              key={finding.key}
              className="flex items-start justify-between gap-2 rounded-xs border border-hairline p-1.5"
            >
              <div className="min-w-0">
                <p className="text-[10px] font-medium leading-4 text-ink">{finding.label}</p>
                <p className="text-[9px] leading-3 text-tertiary">{finding.detail}</p>
              </div>
              <Badge tone={SEVERITY_TONE[finding.severity]} size="xs" className="mt-0.5 min-w-0 px-1">
                {finding.count}
              </Badge>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
