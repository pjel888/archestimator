import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const AdminSignupTrendChart = dynamic(() =>
  import("@/components/admin/AdminCharts").then((module) => module.AdminSignupTrendChart),
);

const metrics = [
  { label: "New signups", value: "Stub", hint: "Wire to metric cache" },
  { label: "Active teams", value: "Stub", hint: "Repository lane pending" },
  { label: "Open support", value: "Stub", hint: "Inbox actions later" },
  { label: "Feature flags", value: "Stub", hint: "D1 flags pending" },
];

const chartData = [
  { label: "Mon", value: 3 },
  { label: "Tue", value: 5 },
  { label: "Wed", value: 4 },
  { label: "Thu", value: 7 },
  { label: "Fri", value: 6 },
];

const analyticsLinks = [
  { label: "Cloudflare Web Analytics", href: "https://dash.cloudflare.com/?to=/:account/web-analytics" },
  { label: "Microsoft Clarity", href: "https://clarity.microsoft.com/" },
  { label: "Google Analytics 4", href: "https://analytics.google.com/" },
];

export default function AdminOverviewPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[9px] font-medium uppercase leading-3 text-tertiary">Admin</p>
          <h1 className="text-[12px] font-medium leading-5 text-ink">Overview</h1>
          <p className="text-[10px] leading-4 text-tertiary">Phase 3 shell with safe placeholders until data hooks land.</p>
        </div>
        <Badge tone="warning" size="xs" className="min-w-0 px-1">
          Stub data
        </Badge>
      </div>

      <section className="grid gap-2 md:grid-cols-4" aria-label="Admin metric placeholders">
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
              <p className="text-[9px] leading-3 text-tertiary">Placeholder chart; metrics API is stubbed.</p>
            </div>
            <Badge tone="neutral" size="xs" className="min-w-0 px-1">
              Recharts
            </Badge>
          </div>
          <AdminSignupTrendChart data={chartData} />
        </Card>

        <div className="grid gap-2">
          <Card className="p-2">
            <h2 className="text-[11px] font-medium leading-4 text-ink">Presence</h2>
            <p className="mt-2 text-[12px] font-medium leading-5 text-ink">0 online</p>
            <p className="mt-1 text-[9px] leading-3 text-tertiary">Aggregate-only placeholder per DEC-AUTO-7.</p>
          </Card>
          <Card className="p-2">
            <h2 className="text-[11px] font-medium leading-4 text-ink">Health strip</h2>
            <div className="mt-2 flex flex-wrap gap-1">
              <Badge tone="neutral" size="xs" className="min-w-0 px-1">D1 pending</Badge>
              <Badge tone="neutral" size="xs" className="min-w-0 px-1">R2 pending</Badge>
              <Badge tone="neutral" size="xs" className="min-w-0 px-1">Queue pending</Badge>
            </div>
          </Card>
          <Card className="p-2">
            <h2 className="text-[11px] font-medium leading-4 text-ink">Incident strip</h2>
            <p className="mt-2 text-[10px] leading-4 text-tertiary">No production incident claims. Wire to incident repository later.</p>
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
