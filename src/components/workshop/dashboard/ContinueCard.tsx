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
          ? "h-full min-h-0 rounded-xs hover:bg-white/30"
          : "dashboard-glass-warm dashboard-hero-continue dashboard-card-hover grain-overlay h-full min-h-0 rounded-xs",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
      )}
    >
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-numeric text-[9px] text-secondary">Continue where you left off</span>
        <span className="truncate font-display text-[14px] font-medium leading-tight text-ink">
          {estimate.name}
        </span>
        <span className="truncate font-numeric text-[10px] text-secondary">
          {estimate.projectName} · {estimate.sheet_code}
        </span>
      </span>

      <span className="flex items-end justify-between gap-2">
        <span className="font-numeric text-[9px] text-secondary">
          Edited {formatShortDate(estimate.updated_at)}
        </span>
        <ArrowRight
          size={18}
          weight="regular"
          aria-hidden="true"
          className="shrink-0 text-ink transition-transform motion-reduce:transition-none group-hover:translate-x-0.5"
        />
      </span>
    </Link>
  );
}
