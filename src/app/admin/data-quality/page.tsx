import { AdminPage, AdminPageHeader, AdminSection } from "@/components/admin/AdminPage";
import { Badge } from "@/components/ui/badge";
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
    <AdminPage>
      <AdminPageHeader
        eyebrow="Admin"
        title="Data quality"
        description="Read-only referential-integrity findings. Each check is isolated; a check that cannot run in this environment is skipped, not hidden. Repair (dry-run/apply) arrives in a later slice."
      />

      <AdminSection
        title="Findings"
        actions={
          <Badge tone={actionable.length > 0 ? "warning" : "success"} size="xs" className="min-w-0 px-1">
            {actionable.length} actionable
          </Badge>
        }
      >
        <ul className="space-y-1" aria-label="Data quality findings">
          {findings.map((finding) => (
            <li
              key={finding.key}
              className="flex items-start justify-between gap-2 rounded-xs border border-hairline p-1.5"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-medium leading-4 text-ink text-pretty">{finding.label}</p>
                <p className="text-[9px] leading-3 text-tertiary text-pretty">{finding.detail}</p>
              </div>
              <Badge tone={SEVERITY_TONE[finding.severity]} size="xs" className="mt-0.5 shrink-0 min-w-0 px-1">
                {finding.count}
              </Badge>
            </li>
          ))}
        </ul>
      </AdminSection>
    </AdminPage>
  );
}
