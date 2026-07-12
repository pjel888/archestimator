import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { BetaOperatingAvailability, BetaOperatingOverview } from "@/lib/admin/beta-operating-overview";

function availabilityTone(availability: BetaOperatingAvailability) {
  if (availability === "available") return "success" as const;
  if (availability === "partial" || availability === "stale") return "warning" as const;
  return "danger" as const;
}

function availabilityLabel(availability: BetaOperatingAvailability) {
  if (availability === "available") return "Current";
  if (availability === "partial") return "Partial";
  if (availability === "stale") return "Stale";
  if (availability === "denied") return "Denied";
  return "Unavailable";
}

function metricValue(value: number | boolean | null, availability: BetaOperatingAvailability) {
  if (value === null || availability === "unavailable" || availability === "error" || availability === "denied") return "Unavailable";
  if (typeof value === "boolean") return value ? "Ready" : "Not ready";
  return String(value);
}

export function BetaOperatingOverviewCards({ overview }: { overview: BetaOperatingOverview }) {
  if (!overview.authorized) {
    return (
      <Card className="p-2" role="alert">
        <h2 className="text-[11px] font-medium leading-4 text-ink">Beta operator overview</h2>
        <p className="mt-1 text-[9px] leading-3 text-tertiary">Unavailable: platform-admin authorization is required.</p>
      </Card>
    );
  }

  return (
    <section className="grid gap-2 md:grid-cols-2" aria-label="Beta operator overview">
      {overview.metrics.map((metric) => (
        <Card key={metric.id} className="p-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-[10px] font-medium leading-4 text-ink">{metric.id.replaceAll(".", " · ")}</h2>
              <p className="mt-1 text-[12px] font-medium leading-5 text-ink">{metricValue(metric.value, metric.availability)}</p>
            </div>
            <Badge tone={availabilityTone(metric.availability)} size="xs" className="min-w-0 px-1">
              {availabilityLabel(metric.availability)}
            </Badge>
          </div>
          <p className="mt-1 text-[9px] leading-3 text-tertiary">Source: {metric.source} · As of: {metric.asOf ?? "Unavailable"}</p>
          <p className="mt-1 text-[9px] leading-3 text-tertiary">{metric.nextAction}</p>
        </Card>
      ))}
    </section>
  );
}
