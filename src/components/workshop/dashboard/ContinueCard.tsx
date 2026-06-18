import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";

import { cn } from "@/lib/ui/cn";

import { estimateHref, formatShortDate, type WorkshopEstimateSummary } from "./lib";

type ContinueCardProps = {
  estimate: WorkshopEstimateSummary | null;
  /** When true, drop the card's own glass surface so it composes inside a shared
   * panel (the combined Continue+Create action block). */
  bare?: boolean;
};

/**
 * HERO #1 — the masthead-right "Continue where you left off" cell. One tap jumps
 * straight back into the most recently edited sheet. It fills its bento cell as a
 * tall warm-glass hero. Renders nothing when there is no recent sheet (the parent
 * decides whether the slot appears at all).
 *
 * The dashboard dir is design-system-exempt, so the warm gradient/glass classes
 * are used directly. Load-bearing label + meta use --secondary (AA-safe over the
 * warm frost), never --tertiary.
 */
export function ContinueCard({ estimate, bare = false }: ContinueCardProps) {
  if (!estimate) return null;

  return (
    <Link
      href={estimateHref(estimate)}
      aria-label={`Continue editing ${estimate.name}`}
      className={cn(
        "group relative flex flex-col justify-between gap-2 p-2",
        bare
          ? "dashboard-destination-card dashboard-card-hover h-full min-h-0 rounded-xs motion-reduce:transition-none"
          : "dashboard-glass-warm dashboard-hero-continue dashboard-card-hover grain-overlay h-full min-h-0 rounded-xs",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
      )}
    >
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="dashboard-continue-hover-target font-numeric text-[9px] text-secondary transition-colors group-hover:text-brand-orange group-focus-visible:text-brand-orange">
          Continue where you left off
        </span>
        <span className="dashboard-continue-hover-target dashboard-continue-title truncate font-display text-[16px] font-extrabold uppercase leading-tight text-ink transition-colors group-hover:text-brand-orange group-focus-visible:text-brand-orange">
          {estimate.name}
        </span>
        <span className="dashboard-continue-hover-target truncate font-numeric text-[10px] text-secondary transition-colors group-hover:text-brand-orange group-focus-visible:text-brand-orange">
          {estimate.projectName} · {estimate.sheet_code}
        </span>
      </span>

      <span className="flex items-end justify-between gap-2">
        <span className="dashboard-continue-hover-target font-numeric text-[9px] text-secondary transition-colors group-hover:text-brand-orange group-focus-visible:text-brand-orange">
          Edited {formatShortDate(estimate.updated_at)}
        </span>
        <ArrowRight
          size={18}
          weight="regular"
          aria-hidden="true"
          className="dashboard-continue-hover-target shrink-0 text-ink transition-[color,transform] motion-reduce:transition-none group-hover:translate-x-0.5 group-hover:text-brand-orange group-focus-visible:text-brand-orange"
        />
      </span>
    </Link>
  );
}
