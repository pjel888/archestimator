import Link from "next/link";

import { listOpenIncidents, type OperationalIncidentRow } from "@/lib/admin/incidents-repository";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

// F2 (UNIT-003) "Today" — the founder's first viewport: "what needs my attention
// now?" Read-only in this increment; the snooze/resolve/dedup state machine (and
// support/feedback/identity/job/upload-scan item sources) is a later, carefully
// tested increment. For now the concrete item source is open incidents.
function ageDays(declaredAt: string | null): number | null {
  if (!declaredAt) return null;
  const ms = Date.now() - new Date(declaredAt).getTime();
  return Number.isFinite(ms) ? Math.max(0, Math.floor(ms / 86_400_000)) : null;
}

const SEVERITY_TONE: Record<OperationalIncidentRow["severity"], "danger" | "warning" | "neutral"> = {
  sev1: "danger",
  sev2: "warning",
  sev3: "neutral",
};

export default async function AdminTodayPage() {
  const incidentsResult = await listOpenIncidents();
  const incidents = incidentsResult.data ?? [];
  const error = incidentsResult.error;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
      <div>
        <p className="text-[9px] font-medium uppercase leading-3 text-tertiary">Admin</p>
        <h1 className="text-[12px] font-medium leading-5 text-ink">Today</h1>
        <p className="text-[10px] leading-4 text-tertiary">
          What needs your attention now. Open incidents are listed as action items; more sources
          (support, feedback, jobs, scans) arrive with the action-inbox state machine.
        </p>
      </div>

      <Card className="p-2">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-[11px] font-medium leading-4 text-ink">Attention items</h2>
          <Badge tone={incidents.length > 0 ? "warning" : "success"} size="xs" className="min-w-0 px-1">
            {error ? "unreadable" : `${incidents.length} open incident${incidents.length === 1 ? "" : "s"}`}
          </Badge>
        </div>

        {error ? (
          <p className="text-[10px] leading-4 text-tertiary">Could not read incidents: {error}</p>
        ) : incidents.length === 0 ? (
          <p className="text-[10px] leading-4 text-tertiary">No open incidents. You&apos;re clear.</p>
        ) : (
          <ol className="space-y-1" aria-label="Open incident attention items">
            {incidents.map((incident) => {
              const age = ageDays(incident.declared_at);
              return (
                <li
                  key={incident.id}
                  className="flex items-start gap-2 rounded-xs border border-hairline p-1.5"
                >
                  <Badge tone={SEVERITY_TONE[incident.severity]} size="xs" className="mt-0.5 min-w-0 px-1">
                    {incident.severity}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium leading-4 text-ink">{incident.summary}</p>
                    <p className="text-[9px] leading-3 text-tertiary">
                      {incident.owner ? `Owner: ${incident.owner} · ` : ""}
                      {age !== null ? `Open ${age}d` : "Open"}
                    </p>
                  </div>
                  <Link
                    href="/admin/observability"
                    className="shrink-0 rounded-xs border border-hairline px-1.5 py-0.5 text-[9px] font-medium leading-3 text-ink transition hover:bg-surfaceMuted"
                  >
                    Open
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </Card>
    </div>
  );
}
