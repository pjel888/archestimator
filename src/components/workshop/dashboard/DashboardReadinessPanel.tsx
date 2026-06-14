import Link from "next/link";

import { SectionHeading } from "@/components/ui/section-heading";
import { StatusBadge, type StatusBadgeStatus } from "@/components/ui/status-badge";
import type {
  DashboardReadiness,
  DashboardReadinessItem,
  DashboardReadinessItemStatus,
  DashboardRisk,
} from "@/lib/workshop/dashboard-types";

type DashboardReadinessPanelProps = {
  readiness: DashboardReadiness | null;
  risks: DashboardRisk[];
};

export function DashboardReadinessPanel({ readiness, risks }: DashboardReadinessPanelProps) {
  if (!readiness && risks.length === 0) return null;

  return (
    <section aria-label="Proposal readiness" className="flex flex-col gap-3 rounded-xs border border-hairline bg-white p-3">
      <SectionHeading
        aside={
          readiness ? (
            <StatusBadge status={statusBadgeForReadiness(readiness.status)} className="min-w-0 px-1.5 py-1">
              {readinessLabel(readiness.status)}
            </StatusBadge>
          ) : undefined
        }
      >
        Proposal readiness
      </SectionHeading>

      {readiness ? (
        <>
          <ReadinessGroup title="Export" items={readiness.exportItems} />
          <ReadinessGroup title="Share" items={readiness.shareItems} />
          <Link
            href={readiness.primaryAction.href}
            className="inline-flex min-h-7 items-center justify-center rounded-xs border border-divider bg-white px-2 text-[10px] font-medium text-ink transition hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            {readiness.primaryAction.label}
          </Link>
        </>
      ) : null}

      {risks.length > 0 ? (
        <div className="border-t border-hairline pt-2">
          <p className="text-[8px] font-medium uppercase tracking-normal text-tertiary">Needs attention</p>
          <ul className="mt-1 flex flex-col">
            {risks.map((risk) => (
              <li key={risk.id} className="border-t border-hairline py-1.5 first:border-t-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-medium leading-3 text-ink">{risk.label}</p>
                    <p className="mt-0.5 text-[9px] leading-3 text-secondary">{risk.detail}</p>
                  </div>
                  <StatusBadge status={riskBadgeStatus(risk.severity)} className="min-w-0 px-1.5 py-1">
                    {risk.severity}
                  </StatusBadge>
                </div>
                {risk.href && risk.actionLabel ? (
                  <Link
                    href={risk.href}
                    className="mt-1 inline-flex rounded-xs text-[9px] font-medium text-secondary transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    {risk.actionLabel}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function ReadinessGroup({ title, items }: { title: string; items: DashboardReadinessItem[] }) {
  return (
    <div>
      <p className="text-[8px] font-medium uppercase tracking-normal text-tertiary">{title}</p>
      <ul className="mt-1 flex flex-col">
        {items.map((item) => (
          <li key={item.id} className="flex items-start justify-between gap-2 border-t border-hairline py-1.5 first:border-t-0">
            <div className="min-w-0">
              <p className="truncate text-[10px] font-medium leading-3 text-ink">{item.label}</p>
              <p className="mt-0.5 text-[9px] leading-3 text-secondary">{item.detail}</p>
              {item.href && item.actionLabel ? (
                <Link
                  href={item.href}
                  className="mt-1 inline-flex rounded-xs text-[9px] font-medium text-secondary transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  {item.actionLabel}
                </Link>
              ) : null}
            </div>
            <StatusBadge status={itemBadgeStatus(item.status)} className="min-w-0 px-1.5 py-1">
              {itemStatusLabel(item.status)}
            </StatusBadge>
          </li>
        ))}
      </ul>
    </div>
  );
}

function readinessLabel(status: DashboardReadiness["status"]): string {
  if (status === "needs-setup") return "Setup";
  if (status === "needs-refresh") return "Refresh";
  return status;
}

function statusBadgeForReadiness(status: DashboardReadiness["status"]): StatusBadgeStatus {
  if (status === "ready") return "approved";
  if (status === "expired" || status === "revoked") return "danger";
  return "review";
}

function itemStatusLabel(status: DashboardReadinessItemStatus): string {
  if (status === "needs-setup") return "Setup";
  if (status === "needs-refresh") return "Refresh";
  if (status === "manual-send") return "Manual";
  return status;
}

function itemBadgeStatus(status: DashboardReadinessItemStatus): StatusBadgeStatus {
  if (status === "ready" || status === "live") return "approved";
  if (status === "expired" || status === "revoked") return "danger";
  if (status === "info" || status === "manual-send") return "inactive";
  return "review";
}

function riskBadgeStatus(severity: DashboardRisk["severity"]): StatusBadgeStatus {
  if (severity === "danger") return "danger";
  if (severity === "warning") return "review";
  return "inactive";
}
