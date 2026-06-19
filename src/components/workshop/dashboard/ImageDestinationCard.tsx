import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";

import { cn } from "@/lib/ui/cn";

type ImageDestinationKind = "projects" | "components" | "templates";

type ImageDestinationCardProps = {
  kind: ImageDestinationKind;
  href: string;
  label: string;
  count?: number;
  countNoun?: string;
  plateIndex: string;
  className?: string;
  /** The big Projects hero tile gets larger caption type. */
  emphasis?: boolean;
  topChrome?: ReactNode;
  nonInteractive?: boolean;
};

const KIND_META: Record<ImageDestinationKind, { toneClass: string }> = {
  projects: { toneClass: "dashboard-destination-card--projects" },
  components: { toneClass: "dashboard-destination-card--components" },
  templates: { toneClass: "dashboard-destination-card--templates" },
};

/**
 * Destination tile for the editorial dashboard field. Projects gets the one
 * large emphasis slot; all destination blocks share a transparent glass treatment.
 */
export function ImageDestinationCard({
  kind,
  href,
  label,
  plateIndex,
  className,
  topChrome,
  nonInteractive = false,
}: ImageDestinationCardProps) {
  const { toneClass } = KIND_META[kind];
  const classNames = cn(
    "dashboard-destination-card dashboard-card-hover group relative block h-full min-h-[118px] w-full",
    toneClass,
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
    className,
  );
  const contents = (
    <>
      {topChrome ?? (
        <span className="dashboard-destination-card-topbar absolute left-2 right-2 top-2 z-10 flex items-start justify-between gap-2">
          <span className="dashboard-destination-card-index font-numeric text-[22px] font-thin leading-none">
            {plateIndex}
          </span>
          {nonInteractive ? (
            <ArrowUpRight
              size={32}
              weight="regular"
              aria-hidden="true"
              className="dashboard-destination-card-icon transition-colors duration-[200ms] ease-out motion-reduce:transition-none"
            />
          ) : (
            <Link
              href={href}
              aria-label={`Open ${label}`}
              className="dashboard-project-card-arrow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            >
              <ArrowUpRight
                size={32}
                weight="regular"
                aria-hidden="true"
                className="dashboard-destination-card-icon transition-colors duration-[200ms] ease-out motion-reduce:transition-none"
              />
            </Link>
          )}
        </span>
      )}

      <span className="absolute bottom-2 right-2 z-10 max-w-[calc(100%-16px)] text-right">
        <span className="dashboard-destination-card-title font-display text-[32px] font-normal leading-none tracking-[0.04em] uppercase">
          {label}
        </span>
      </span>
    </>
  );

  return (
    <div className={classNames} aria-label={label}>
      {contents}
    </div>
  );
}
