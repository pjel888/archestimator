import { AdminLegacyCutoverPanel } from "@/components/admin/AdminLegacyCutoverPanel";
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

// F6 (UNIT-007) Data quality findings plus the isolated legacy cutover operator workflow.
export default async function AdminDataQualityPage() {
  const findings = await runDataQualityChecks();
  const actionable = findings.filter(isFindingActionable);
  const unavailable = findings.filter((finding) => !finding.available);

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Admin"
        title="Data quality"
        description="Read-only referential-integrity findings plus a separate, attributed legacy cutover workflow. Each check is isolated; unavailable checks are reported rather than hidden."
      />

      <AdminSection
        title="Findings"
        actions={
          <Badge tone={actionable.length > 0 || unavailable.length > 0 ? "warning" : "success"} size="xs" className="min-w-0 px-1">
            {actionable.length} actionable{unavailable.length > 0 ? ` · ${unavailable.length} unavailable` : ""}
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
              <Badge tone={finding.available ? SEVERITY_TONE[finding.severity] : "warning"} size="xs" className="mt-0.5 shrink-0 min-w-0 px-1">
                {finding.available ? finding.count : "Unavailable"}
              </Badge>
            </li>
          ))}
        </ul>
      </AdminSection>

      <AdminSection
        title="Legacy Client Portal cutover"
        description="Platform-admin operator control for workspace inventory, migration verification, and the final workspace-scoped write freeze. Always run the dry check first."
      >
        <AdminLegacyCutoverPanel />
      </AdminSection>
    </AdminPage>
  );
}
