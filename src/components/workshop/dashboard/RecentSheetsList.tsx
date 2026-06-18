/**
 * Recent estimate sheets — tall, dense white-paper ledger for the bento working desk.
 * Legibility first: plain white surface, hairline dividers, no frost/blur.
 * Rows deep-link straight into the sheet editor. No global sheets route exists,
 * so there is no "View all" link here.
 */
import Link from "next/link";
import { FileText, Star } from "@phosphor-icons/react/dist/ssr";

import { cn } from "@/lib/ui/cn";

import {
  estimateHref,
  formatShortDate,
  type WorkshopEstimateSummary,
} from "./lib";

type RecentSheetsListProps = {
  estimates: WorkshopEstimateSummary[];
  embedded?: boolean;
};

const ROW_FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-0";

export function RecentSheetsList({ estimates, embedded = false }: RecentSheetsListProps) {
  const rows = estimates.slice(0, 6);

  return (
    <section
      className={cn(
        "flex h-full min-h-0 flex-col",
        embedded ? "bg-transparent" : "bg-white",
        embedded ? "" : "rounded-xs border border-hairline",
      )}
    >
      <div className="shrink-0 px-2 py-2">
        <p className="font-numeric text-[9px] text-secondary">Workspace</p>
        <h2 className="text-[12px] font-medium text-ink">Recent estimate sheets</h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {rows.length === 0 ? (
          <p className="border-t border-hairline px-2 py-2 text-[10px] text-secondary">
            No recent estimate sheets yet
          </p>
        ) : (
          <ul>
            {rows.map((estimate) => (
              <li key={estimate.id} className="border-t border-hairline">
                <Link
                  href={estimateHref(estimate)}
                  className={cn(
                    "flex items-center gap-2 px-2 py-2 hover:bg-surface-muted",
                    ROW_FOCUS,
                  )}
                >
                  <FileText size={12} weight="regular" className="shrink-0 text-secondary" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[11px] text-ink" title={estimate.name}>
                        {estimate.name}
                      </span>
                      {estimate.isFavorite ? (
                        <Star
                          size={12}
                          weight="regular"
                          className="shrink-0 text-orange-600"
                        />
                      ) : null}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[10px] text-secondary">
                        {estimate.projectName}
                      </span>
                      {estimate.sheet_code ? (
                        <span className="font-numeric text-[9px] text-secondary">
                          {estimate.sheet_code}
                        </span>
                      ) : null}
                    </span>
                  </span>
                  <time className="shrink-0 font-numeric text-[9px] text-secondary">
                    {formatShortDate(estimate.updated_at)}
                  </time>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
