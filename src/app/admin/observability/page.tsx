import Link from "next/link";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";

import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { Card } from "@/components/ui/card";
import {
  listRecentClientErrorEvents,
  listRecentCronRunEvents,
  listRecentOpsRunEvents,
  listRecentWebVitalEvents,
} from "@/lib/admin/observability-repository";

const links = [
  {
    label: "Cloudflare Log Explorer",
    href: "https://dash.cloudflare.com/?to=/:account/log-explorer",
    description: "Investigate retained HTTP request logs and 5xx responses alongside the redacted client-error ledger above.",
  },
  {
    label: "Manage Log Explorer datasets",
    href: "https://dash.cloudflare.com/?to=/:account/log-explorer/manage-sources",
    description: "Confirm the HTTP Requests dataset remains enabled for the Archestimator production zone.",
  },
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
    <AdminPage>
      <AdminPageHeader
        eyebrow="Admin"
        title="Observability"
        description="Redacted D1 event readers plus Cloudflare request-log investigation. Client errors stay in D1; use Log Explorer for retained edge requests and 5xx responses."
      />
      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" aria-label="Recent observability events">
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
      <section className="grid gap-2 md:grid-cols-2 xl:grid-cols-3" aria-label="Observability resources">
        {links.map((link) => (
          <Card key={link.href} interactive className="p-2">
            <Link href={link.href} target="_blank" rel="noreferrer" className="block cursor-pointer">
              <span className="text-[11px] font-medium leading-4 text-ink">{link.label}</span>
              <ArrowSquareOut size={16} weight="regular" className="pointer-events-none ml-1 inline-block text-tertiary" aria-hidden="true" />
              <p className="mt-2 text-[9px] leading-4 text-tertiary">{link.description}</p>
            </Link>
          </Card>
        ))}
      </section>
    </AdminPage>
  );
}
