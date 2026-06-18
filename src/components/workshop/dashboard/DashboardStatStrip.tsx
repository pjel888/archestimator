/**
 * Dashboard stat strip — white-paper stats, REAL counts only, no fabricated totals.
 *
 * Plain white card filling its cell (no frost/blur). Library component/template
 * counts are true totals; project/sheet counts are homebase RECENT counts
 * (capped at 12), so their labels carry the word "recent" to avoid implying they
 * are workspace-wide totals. If there is no spotlight only the recent counts show;
 * if every value is 0 the strip renders nothing.
 */
import Link from "next/link";

import { cn } from "@/lib/ui/cn";

import { WORKSHOP_ROUTES, type DashboardLibrarySpotlight } from "./lib";

type DashboardStatStripProps = {
  spotlight: DashboardLibrarySpotlight | null;
  recentProjectCount: number;
  recentSheetCount: number;
};

type Stat = {
  value: number;
  /** Lowercase unit word(s); rendered in Roboto Mono at 9px / secondary. */
  label: string;
  href?: string;
};

const TILE_FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-0";

export function DashboardStatStrip({
  spotlight,
  recentProjectCount,
  recentSheetCount,
}: DashboardStatStripProps) {
  const stats: Stat[] = [];

  if (spotlight) {
    // Real library totals.
    stats.push({
      value: spotlight.componentCount,
      label: "components",
      href: WORKSHOP_ROUTES.libraryComponents,
    });
    stats.push({
      value: spotlight.templateCount,
      label: "templates",
      href: WORKSHOP_ROUTES.libraryTemplates,
    });
  }

  // Recent counts (homebase caps at 12) — labelled "recent" so they are not
  // mistaken for totals.
  stats.push({ value: recentProjectCount, label: "recent projects" });
  stats.push({ value: recentSheetCount, label: "recent sheets" });

  const hasSignal = stats.some((stat) => stat.value > 0);
  if (!hasSignal) return null;

  return (
    <dl
      className={cn(
        "grid h-full grid-cols-2 gap-px overflow-hidden",
        "rounded-xs border border-hairline bg-white sm:grid-cols-4",
      )}
    >
      {stats.map((stat) => {
        const body = (
          <>
            <dd className="font-numeric text-[18px] font-medium text-ink">{stat.value}</dd>
            <dt className="font-numeric text-[9px] text-secondary">{stat.label}</dt>
          </>
        );

        const tileClass = "flex flex-col gap-[2px] bg-white p-3";

        return stat.href ? (
          <Link
            key={stat.label}
            href={stat.href}
            className={cn("transition-colors hover:bg-surface-muted", tileClass, TILE_FOCUS)}
          >
            {body}
          </Link>
        ) : (
          <div key={stat.label} className={tileClass}>
            {body}
          </div>
        );
      })}
    </dl>
  );
}
