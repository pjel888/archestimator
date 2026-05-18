import Link from "next/link";
import { ArrowRight, Calculator, Clock } from "@phosphor-icons/react/dist/ssr";

import type { Tables } from "@/lib/supabase/types";

type EstimateListCardProps = {
  estimate: Tables<"estimates">;
  firstNodeId?: string | null;
};

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

export function EstimateListCard({ estimate, firstNodeId }: EstimateListCardProps) {
  const href = firstNodeId
    ? `/workshop/projects/${estimate.project_id}/estimates/${firstNodeId}`
    : `/workshop/projects/${estimate.project_id}/estimates`;

  return (
    <Link
      href={href}
      className="group flex min-h-[144px] flex-col rounded-lg border border-hairline bg-white p-2 shadow-[0_14px_34px_-30px_rgba(17,17,17,0.42)] transition duration-150 hover:-translate-y-0.5 hover:border-divider hover:shadow-[0_22px_44px_-32px_rgba(17,17,17,0.5)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent-dark">
          <Calculator size={17} weight="duotone" aria-hidden="true" />
        </div>
        <span className="rounded-full bg-surface-muted p-1 text-[9px] font-bold uppercase tracking-[0.12em] text-tertiary ring-1 ring-hairline">
          {estimate.status}
        </span>
      </div>

      <div className="mt-3 min-w-0">
        <p className="text-[10px] font-medium text-tertiary">{estimate.revision_label}</p>
        <h2 className="mt-1 line-clamp-2 text-[12px] font-semibold leading-[1.1] tracking-[-0.025em] text-ink">{estimate.name}</h2>
        <p className="mt-2 line-clamp-1 text-[10px] leading-4 text-tertiary">{estimate.assumptions ?? "No assumptions note"}</p>
      </div>

      <div className="mt-auto flex items-end justify-between gap-2 pt-3 text-[10px] text-tertiary">
        <p className="flex items-center gap-1">
          <Clock size={12} aria-hidden="true" />
          Updated {formatUpdatedAt(estimate.updated_at)}
        </p>
        <ArrowRight size={15} className="shrink-0 text-ink transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </div>
    </Link>
  );
}
