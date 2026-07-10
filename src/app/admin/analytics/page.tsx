import Link from "next/link";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const cfAnalyticsToken = process.env.NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN;
const clarityProjectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
// Check both NEXT_PUBLIC_GA_MEASUREMENT_ID (the canonical name used in
// .env.example and ab-testing) and the legacy NEXT_PUBLIC_GA4_MEASUREMENT_ID.
const ga4MeasurementId =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;

const tiles = [
  {
    label: "Cloudflare Web Analytics",
    href: "https://dash.cloudflare.com/?to=/:account/web-analytics",
    configured: Boolean(cfAnalyticsToken),
    description: cfAnalyticsToken ? "Public token detected." : "No public token configured; link-out only.",
  },
  {
    label: "Microsoft Clarity",
    href: "https://clarity.microsoft.com/",
    configured: Boolean(clarityProjectId),
    description: clarityProjectId ? `Project ${clarityProjectId}` : "No public project id configured; link-out only.",
  },
  {
    label: "Google Analytics 4",
    href: "https://analytics.google.com/",
    configured: Boolean(ga4MeasurementId),
    description: ga4MeasurementId ? `Measurement ${ga4MeasurementId}` : "No public measurement id configured; link-out only.",
  },
];

export default function AdminAnalyticsPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
      <div>
        <p className="text-[9px] font-medium uppercase leading-3 text-tertiary">Admin</p>
        <h1 className="text-[12px] font-medium leading-5 text-ink">Analytics</h1>
        <p className="text-[10px] leading-4 text-tertiary">DEC-AUTO-1/2/3: external link-outs only when provider secrets are absent.</p>
      </div>
      <section className="grid gap-2 md:grid-cols-3" aria-label="Analytics providers">
        {tiles.map((tile) => (
          <Card key={tile.label} interactive className="p-2">
            <Link href={tile.href} target="_blank" rel="noreferrer" className="block">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium leading-4 text-ink">{tile.label}</span>
                <Badge tone={tile.configured ? "success" : "neutral"} size="xs" className="min-w-0 px-1">
                  {tile.configured ? "Configured" : "Link-out"}
                </Badge>
              </div>
              <p className="mt-2 text-[9px] leading-4 text-tertiary">{tile.description}</p>
              <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium leading-4 text-ink">
                Open provider
                <ArrowSquareOut size={12} weight="regular" aria-hidden="true" />
              </span>
            </Link>
          </Card>
        ))}
      </section>
    </div>
  );
}
