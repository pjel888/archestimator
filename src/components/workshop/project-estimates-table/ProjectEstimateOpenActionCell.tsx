import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";

import { ButtonLink } from "@/components/ui/button";
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
        <ButtonLink
          href={estimateHref}
          variant="plain"
          size="icon-xs"
          prefetch={true}
          onBlur={() => onPrefetchCancel(estimateHref)}
          onFocus={() => onPrefetchStart(estimateHref)}
          onMouseEnter={() => onPrefetchStart(estimateHref)}
          onMouseLeave={() => onPrefetchCancel(estimateHref)}
          className="size-6 min-h-0 min-w-0 text-tertiary hover:bg-surface-muted hover:text-ink"
          aria-label={`Open ${estimate.name}`}
        >
          <ArrowSquareOut size={16} weight="regular" aria-hidden="true" />
        </ButtonLink>
      )}
    </div>
  );
}

ProjectEstimateOpenActionCell.displayName = "ProjectEstimateOpenActionCell";
