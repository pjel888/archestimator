import Link from "next/link";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";

import type { ProjectEstimateTableRow } from "./types";
import { getEstimateHref } from "./utils";

export function ProjectEstimateOpenActionCell({
  estimate,
  isSettling,
  onPrefetchCancel,
  onPrefetchStart,
}: {
  estimate: ProjectEstimateTableRow;
  isSettling: boolean;
  onPrefetchCancel: (href: string) => void;
  onPrefetchStart: (href: string) => void;
}) {
  const estimateHref = getEstimateHref(estimate);
  const rowActionsDisabled = Boolean(estimate.pendingStatus) || isSettling;

  return (
    <div className="flex items-center justify-center">
      {rowActionsDisabled ? (
        <span
          className="grid size-6 place-items-center rounded-xs text-tertiary opacity-40"
          aria-label={`Open ${estimate.name}`}
          aria-disabled="true"
        >
          <ArrowSquareOut size={16} weight="regular" aria-hidden="true" />
        </span>
      ) : (
        <Link
          href={estimateHref}
          prefetch={true}
          onBlur={() => onPrefetchCancel(estimateHref)}
          onFocus={() => onPrefetchStart(estimateHref)}
          onMouseEnter={() => onPrefetchStart(estimateHref)}
          onMouseLeave={() => onPrefetchCancel(estimateHref)}
          className="grid size-6 cursor-pointer place-items-center rounded-xs text-tertiary transition hover:bg-surface-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          aria-label={`Open ${estimate.name}`}
        >
          <ArrowSquareOut size={16} weight="regular" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

ProjectEstimateOpenActionCell.displayName = "ProjectEstimateOpenActionCell";
