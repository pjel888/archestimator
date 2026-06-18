import Link from "next/link";
import Image from "next/image";
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

const PROJECTS_MOUNTAIN_SRC = "/Cards/projects-mountain.jpg";

/**
 * Destination tile for the editorial dashboard field. Projects gets the one
 * mountain photograph; the supporting destinations stay crisp color blocks.
 */
export function ImageDestinationCard({
  kind,
  href,
  label,
  count,
  countNoun,
  plateIndex,
  className,
  emphasis = false,
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
      {kind === "projects" ? (
        <Image
          src={PROJECTS_MOUNTAIN_SRC}
          alt=""
          fill
          priority
          sizes="(max-width:640px) 100vw, (max-width:1024px) 100vw, 34vw"
          className="dashboard-destination-card-image"
        />
      ) : null}

      <span className="dashboard-destination-card-mark" aria-hidden="true" />

      <ArrowUpRight
        size={16}
        weight="regular"
        aria-hidden="true"
        className="dashboard-destination-card-icon absolute right-2 top-2 z-10 transition-transform duration-[200ms] ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none"
      />

      <span className="absolute bottom-2 left-2 z-10 flex flex-col gap-0.5">
        <span className="dashboard-destination-card-index font-numeric text-[9px]">{plateIndex}</span>
        <span
          className={cn(
            "dashboard-destination-card-title font-medium",
            emphasis ? "font-display text-[20px] uppercase leading-none" : "text-[12px]",
          )}
        >
          {label}
        </span>
        {count != null ? (
          <span className="dashboard-destination-card-count font-numeric text-[11px]">
            {count} {countNoun ?? ""}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
