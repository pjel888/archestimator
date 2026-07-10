import Link from "next/link";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";

import { Card } from "@/components/ui/card";
import {
  listRecentClientErrorEvents,
  listRecentCronRunEvents,
  listRecentOpsRunEvents,
  listRecentWebVitalEvents,
} from "@/lib/admin/observability-repository";

const links = [
  {
    label: "Workers Observability",
    href: "https://developers.cloudflare.com/workers/observability/",
    description: "Cloudflare guide for runtime logs, traces, metrics, and dashboards.",
  },
  {
    label: "Workers Logs",
    href: "https://developers.cloudflare.com/workers/observability/logs/",
    description: "How to inspect deployed Worker logs without storing raw logs in D1.",
  },
  {
    label: "Tail Workers",
    href: "https://developers.cloudflare.com/workers/observability/logs/tail-workers/",
    description: "Operator workflow for live troubleshooting against the bound Worker.",
  },
];

export default async function AdminObservabilityPage() {
  const [cronRuns, clientErrors, webVitals, opsRuns] = await Promise.all([
    listRecentCronRunEvents(5),
    listRecentClientErrorEvents(5),
    listRecentWebVitalEvents(5),
    listRecentOpsRunEvents(5),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
      <div>
        <p className="text-[9px] font-medium uppercase leading-3 text-tertiary">Admin</p>
        <h1 className="text-[12px] font-medium leading-5 text-ink">Observability</h1>
        <p className="text-[10px] leading-4 text-tertiary">Local D1 event readers plus provider documentation links. This page does not claim hosted log or alert readiness.</p>
      </div>
      <section className="grid gap-2 md:grid-cols-4" aria-label="Recent observability events">
        <Card className="p-2">
          <p className="text-[11px] font-medium leading-4 text-ink">Cron runs</p>
          <p className="mb-2 text-[9px] leading-3 text-tertiary">{cronRuns.error ?? `${cronRuns.data.length} recent rows`}</p>
          {cronRuns.data.map((row) => (
            <p key={row.id} className="truncate text-[9px] leading-4 text-secondary">{row.cron_name} / {row.status}</p>
          ))}
        </Card>
        <Card className="p-2">
          <p className="text-[11px] font-medium leading-4 text-ink">Client errors</p>
          <p className="mb-2 text-[9px] leading-3 text-tertiary">{clientErrors.error ?? `${clientErrors.data.length} recent rows`}</p>
          {clientErrors.data.map((row) => (
            <p key={row.id} className="truncate text-[9px] leading-4 text-secondary">{row.error_class} / {row.route ?? "unknown route"}</p>
          ))}
        </Card>
        <Card className="p-2">
          <p className="text-[11px] font-medium leading-4 text-ink">Web vitals</p>
          <p className="mb-2 text-[9px] leading-3 text-tertiary">{webVitals.error ?? `${webVitals.data.length} recent rows`}</p>
          {webVitals.data.map((row) => (
            <p key={row.id} className="truncate text-[9px] leading-4 text-secondary">{row.metric_name} / {row.metric_value}</p>
          ))}
        </Card>
        <Card className="p-2">
          <p className="text-[11px] font-medium leading-4 text-ink">Ops runs</p>
          <p className="mb-2 text-[9px] leading-3 text-tertiary">{opsRuns.error ?? `${opsRuns.data.length} recent rows`}</p>
          {opsRuns.data.map((row) => (
            <p key={row.id} className="truncate text-[9px] leading-4 text-secondary">{row.ops_name} / {row.status}</p>
          ))}
        </Card>
      </section>
      <section className="grid gap-2 md:grid-cols-3" aria-label="Observability resources">
        {links.map((link) => (
          <Card key={link.href} interactive className="p-2">
            <Link href={link.href} target="_blank" rel="noreferrer" className="block">
              <span className="text-[11px] font-medium leading-4 text-ink">{link.label}</span>
              <ArrowSquareOut size={12} weight="regular" className="ml-1 inline-block text-tertiary" aria-hidden="true" />
              <p className="mt-2 text-[9px] leading-4 text-tertiary">{link.description}</p>
            </Link>
          </Card>
        ))}
      </section>
    </div>
  );
}
