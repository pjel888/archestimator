/**
 * Sheets — tall, dense white-paper ledger for the bento working desk.
 * Legibility first: plain white surface, hairline dividers, no frost/blur.
 * Rows deep-link straight into the sheet editor.
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
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-hairline px-2">
        <FileText size={14} weight="fill" className="shrink-0 text-tertiary" />
        <h2 className="text-[12px] font-medium text-ink">Sheets</h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {rows.length === 0 ? (
          <p className="px-2 py-2 text-[10px] text-secondary">
            No recent estimate sheets yet
          </p>
        ) : (
          <ul>
            {rows.map((estimate) => (
              <li key={estimate.id}>
                <Link
                  href={estimateHref(estimate)}
                  className={cn(
                    "flex items-stretch gap-2 px-2 py-2 hover:bg-surface-muted",
                    ROW_FOCUS,
                  )}
                >
                  <span className="grid w-4 shrink-0 grid-rows-[12px_14px] items-center">
                    <span className="flex h-3 items-start justify-center">
                      {estimate.isFavorite ? (
                        <Star
                          size={10}
                          weight="fill"
                          className="shrink-0 text-secondary opacity-50"
                        />
                      ) : null}
                    </span>
                    <FileText size={12} weight="regular" className="justify-self-center text-secondary" />
                  </span>
                  <span className="grid min-w-0 flex-1 grid-rows-[12px_14px]">
                    <span className="flex min-w-0 items-start gap-1.5">
                      <span className="truncate text-[11px] leading-3 text-ink" title={estimate.name}>
                        {estimate.name}
                      </span>
                    </span>
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate text-[10px] leading-[14px] text-secondary">
                        {estimate.projectName}
                      </span>
                    </span>
                  </span>
                  <time className="self-center shrink-0 font-numeric text-[9px] text-secondary">
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
