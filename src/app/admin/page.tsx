import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";

import { listOpenIncidents } from "@/lib/admin/incidents-repository";
import { runAdminHealthProbes } from "@/lib/admin/health-probes";
import { countSignups } from "@/lib/admin/users-repository";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const AdminSignupTrendChart = dynamic(() =>
  import("@/components/admin/AdminCharts").then((module) => module.AdminSignupTrendChart),
);

const analyticsLinks = [
  { label: "Cloudflare Web Analytics", href: "https://dash.cloudflare.com/?to=/:account/web-analytics" },
  { label: "Microsoft Clarity", href: "https://clarity.microsoft.com/" },
  { label: "Google Analytics 4", href: "https://analytics.google.com/" },
];

export default async function AdminOverviewPage() {
  // Fetch all independent data in parallel.
  const [healthProbes, incidentsResult, signupsResult] = await Promise.all([
    runAdminHealthProbes(),
    listOpenIncidents(),
    countSignups(30),
  ]);

  const openIncidents = incidentsResult.data ?? [];
  const signupCount = signupsResult.data ?? 0;
  const signupError = signupsResult.error;

  // Build health badges from probe results.
  const d1Probe = healthProbes.find((p) => p.name === "d1");
  const r2Probe = healthProbes.find((p) => p.name === "arch_uploads_r2");
  const queueProbe = healthProbes.find((p) => p.name === "upload_jobs_queue");

  const metrics = [
    { label: "Signups (30d)", value: signupError ? "—" : String(signupCount), hint: signupError ?? "Counted from profiles" },
    { label: "Active teams", value: "—", hint: "Repository lane pending" },
    { label: "Open incidents", value: String(openIncidents.length), hint: openIncidents.length > 0 ? "Requires attention" : "All clear" },
    { label: "Health checks", value: String(healthProbes.filter((p) => p.ok).length) + "/" + String(healthProbes.length), hint: "Live D1 + binding probes" },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[9px] font-medium uppercase leading-3 text-tertiary">Admin</p>
          <h1 className="text-[12px] font-medium leading-5 text-ink">Overview</h1>
          <p className="text-[10px] leading-4 text-tertiary">Live health probes, incidents, and signup metrics from D1.</p>
        </div>
        <Badge tone="success" size="xs" className="min-w-0 px-1">
          Live data
        </Badge>
      </div>

      <section className="grid gap-2 md:grid-cols-4" aria-label="Admin metrics">
        {metrics.map((metric) => (
          <Card key={metric.label} className="p-2">
            <p className="text-[9px] font-medium uppercase leading-3 text-tertiary">{metric.label}</p>
            <p className="mt-2 text-[12px] font-medium leading-5 text-ink">{metric.value}</p>
            <p className="mt-1 text-[9px] leading-3 text-tertiary">{metric.hint}</p>
          </Card>
        ))}
      </section>

      <section className="grid gap-2 lg:grid-cols-[1fr_280px]" aria-label="Admin operational summary">
        <Card className="p-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-[11px] font-medium leading-4 text-ink">Signup trend</h2>
              <p className="text-[9px] leading-3 text-tertiary">Last 5 days (approximate from 30d signup count).</p>
            </div>
            <Badge tone="neutral" size="xs" className="min-w-0 px-1">
              Recharts
            </Badge>
          </div>
          <AdminSignupTrendChart data={[
            { label: "30d total", value: signupCount },
          ]} />
        </Card>

        <div className="grid gap-2">
          <Card className="p-2">
            <h2 className="text-[11px] font-medium leading-4 text-ink">Health status</h2>
            <div className="mt-2 flex flex-wrap gap-1">
              <Badge tone={d1Probe?.ok ? "success" : "danger"} size="xs" className="min-w-0 px-1">
                D1 {d1Probe?.ok ? "up" : "down"}
              </Badge>
              <Badge tone={r2Probe?.ok ? "success" : "danger"} size="xs" className="min-w-0 px-1">
                R2 {r2Probe?.ok ? "up" : "down"}
              </Badge>
              <Badge tone={queueProbe?.ok ? "success" : "danger"} size="xs" className="min-w-0 px-1">
                Queue {queueProbe?.ok ? "up" : "down"}
              </Badge>
            </div>
            {healthProbes.some((p) => !p.ok && p.detail) && (
              <p className="mt-2 text-[9px] leading-3 text-tertiary">
                {healthProbes.filter((p) => !p.ok).map((p) => `${p.name}: ${p.detail}`).join("; ")}
              </p>
            )}
          </Card>
          <Card className="p-2">
            <h2 className="text-[11px] font-medium leading-4 text-ink">Open incidents</h2>
            {openIncidents.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {openIncidents.slice(0, 3).map((incident) => (
                  <li key={incident.id} className="text-[9px] leading-3 text-tertiary">
                    <Badge tone="warning" size="xs" className="mr-1 min-w-0 px-1">{incident.severity}</Badge>
                    {incident.summary}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[10px] leading-4 text-tertiary">No open incidents.</p>
            )}
          </Card>
        </div>
      </section>

      <section className="grid gap-2 md:grid-cols-3" aria-label="Analytics link-out tiles">
        {analyticsLinks.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="rounded-xs border border-hairline bg-white p-2 text-[10px] font-medium leading-4 text-ink transition hover:bg-surfaceMuted"
          >
            <span>{link.label}</span>
            <ArrowSquareOut size={12} weight="regular" className="ml-1 inline-block" aria-hidden="true" />
          </Link>
        ))}
      </section>
    </div>
  );
}
