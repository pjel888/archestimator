"use client";

import Link from "next/link";
import { ImageSquare } from "@phosphor-icons/react/dist/ssr";

import { pesoFormatter } from "@/components/workshop/component-library/helpers";
import { COMPONENT_LIFECYCLE_FACET_LABELS } from "@/components/workshop/library/component-facet-filter";
import { getComponentDetailsHref } from "@/components/workshop/library/component-route-state";
import { getComponentSourceTrustChips, SourceTrustChips } from "@/components/workshop/library/source-trust-chips";
import type { LibraryOverviewComponent } from "@/lib/repositories/component-library-repository";
import { cn } from "@/lib/ui/cn";

const LIFECYCLE_BADGE_CLASSES: Record<string, string> = {
  draft: "border-hairline bg-surfaceMuted text-secondary",
  in_production: "border-hairline bg-surfaceMuted text-secondary",
  discontinued: "border-warning/20 bg-warningSoft text-warning",
  archived: "border-danger/20 bg-dangerSoft text-danger",
};

/**
 * Compact recently-updated component card for the Library Overview home:
 * 72px thumb, name, `subcategory · supplier`, price + unit. Clicking opens
 * the Components tab with the item inspector selected via route state.
 */
export function RecentComponentCard({ component }: { component: LibraryOverviewComponent }) {
  const subline = [component.category, component.supplier].filter(Boolean).join(" · ");
  const lifecycleBadge = component.lifecycleState !== "available"
    ? {
        label: COMPONENT_LIFECYCLE_FACET_LABELS[component.lifecycleState],
        className: LIFECYCLE_BADGE_CLASSES[component.lifecycleState] ?? LIFECYCLE_BADGE_CLASSES.draft,
      }
    : null;

  return (
    <li className="min-w-0">
      <Link
        href={getComponentDetailsHref(component.id)}
        aria-label={`Open components: ${component.name}`}
        data-library-overview-recent-component={component.id}
        className="group flex h-full flex-col overflow-hidden rounded-xs border border-hairline bg-white transition hover:border-divider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        <div className="relative h-[72px] w-full shrink-0 overflow-hidden border-b border-hairline bg-surfaceMuted/40">
          {lifecycleBadge ? (
            <span
              className={cn(
                "absolute right-1.5 top-1.5 z-10 rounded-xs border px-1 py-0.5 text-[8px] font-medium leading-3",
                lifecycleBadge.className,
              )}
              data-library-overview-lifecycle-badge={component.lifecycleState}
            >
              {lifecycleBadge.label}
            </span>
          ) : null}
          {component.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={component.imageUrl}
              alt={`${component.name} thumbnail`}
              className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-tertiary" aria-hidden="true">
              <ImageSquare size={18} weight="regular" />
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 p-2">
          <p className="truncate text-[10px] font-medium leading-4 text-ink" title={component.name}>
            {component.name}
          </p>
          {subline ? (
            <p className="truncate text-[9px] font-normal leading-3 text-tertiary" title={subline}>
              {subline}
            </p>
          ) : null}
          <SourceTrustChips
            chips={getComponentSourceTrustChips(component)}
            ariaLabel={`Source trust for ${component.name}`}
            maxChips={2}
            chipClassName="max-w-[88px]"
          />
          <p className="mt-auto pt-1 text-[10px] font-medium leading-4 tabular-nums text-ink">
            {pesoFormatter.format(component.unitCost)}
            <span className="ml-1 text-[8px] font-normal text-tertiary">/ {component.unit}</span>
          </p>
        </div>
      </Link>
    </li>
  );
}
