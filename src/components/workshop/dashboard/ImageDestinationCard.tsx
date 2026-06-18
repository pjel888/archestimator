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
};

const KIND_META: Record<ImageDestinationKind, { toneClass: string }> = {
  projects: { toneClass: "dashboard-destination-card--projects" },
  components: { toneClass: "dashboard-destination-card--components" },
  templates: { toneClass: "dashboard-destination-card--templates" },
};

/**
 * Destination tile for the editorial dashboard field. Projects gets the one
 * large emphasis slot; the supporting destinations stay crisp color blocks.
 */
export function ImageDestinationCard({
  kind,
  href,
  label,
  plateIndex,
  className,
}: ImageDestinationCardProps) {
  const { toneClass } = KIND_META[kind];

  return (
    <Link
      href={href}
      aria-label={`Open ${label}`}
      className={cn(
        "dashboard-destination-card dashboard-card-hover group relative block h-full min-h-[118px] w-full",
        toneClass,
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        className,
      )}
    >
      <span className="dashboard-destination-card-mark" aria-hidden="true" />

      <ArrowUpRight
        size={16}
        weight="regular"
        aria-hidden="true"
        className="dashboard-destination-card-icon absolute right-2 top-2 z-10 transition-transform duration-[200ms] ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none"
      />

      <span className="absolute left-2 top-2 z-10">
        <span className="dashboard-destination-card-index font-numeric text-[24px] font-medium leading-none">
          {plateIndex}
        </span>
      </span>

      <span className="absolute bottom-2 right-2 z-10 max-w-[calc(100%-16px)] text-right">
        <span className="dashboard-destination-card-title font-numeric text-[18px] font-bold leading-none uppercase">
          {label}
        </span>
      </span>
    </Link>
  );
}
