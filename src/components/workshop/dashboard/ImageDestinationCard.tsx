import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";

import { cn } from "@/lib/ui/cn";

import { MATERIAL_PHOTOS_READY } from "./lib";

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

/** Each destination is backed by a real construction-material macro photo; the
 * frosted glass pane on top turns it into a calm liquid-glass tile. */
const KIND_META: Record<ImageDestinationKind, { material: string }> = {
  projects: { material: "timber" },
  components: { material: "steel" },
  templates: { material: "concrete" },
};

/**
 * Material-frost destination tile for the editorial dashboard field (Projects /
 * Components / Templates). A full-bleed construction-material macro photo
 * (timber / steel / concrete) sits under a frosted liquid-glass overlay, so the
 * texture reads as a quiet ghost beneath the frost — no photographic scenes.
 * Dark-ink catalogue caption (index · label · count) rides crisp on top, over a
 * soft light veil that keeps it AA-legible across any material.
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
  const { material } = KIND_META[kind];

  return (
    <Link
      href={href}
      aria-label={`Open ${label}`}
      className={cn(
        "material-card dashboard-card-hover group relative block h-full min-h-[118px] w-full",
        `material-${material}`,
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        className,
      )}
    >
      {MATERIAL_PHOTOS_READY ? (
        <span className="absolute inset-0 overflow-hidden">
          <Image
            src={`/Cards/materials/${material}.jpg`}
            alt=""
            fill
            className="object-cover transition-transform duration-[220ms] ease-out group-hover:scale-[1.04] motion-reduce:transform-none motion-reduce:transition-none"
            sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 28vw"
            priority={kind === "projects"}
          />
        </span>
      ) : null}
      <span className="material-card-frost" aria-hidden="true" />

      <ArrowUpRight
        size={16}
        weight="regular"
        aria-hidden="true"
        className="absolute right-2.5 top-2.5 z-10 text-ink/80 transition-transform duration-[200ms] ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none"
      />

      <span className="material-card-caption absolute bottom-2.5 left-2.5 z-10 flex flex-col gap-0.5">
        <span className="font-numeric text-[9px] tracking-[0.14em] text-secondary">{plateIndex}</span>
        <span
          className={cn(
            "font-medium text-ink",
            emphasis ? "font-display text-[20px] uppercase leading-none" : "text-[12px]",
          )}
        >
          {label}
        </span>
        {count != null ? (
          <span className="font-numeric text-[11px] text-secondary">
            {count} {countNoun ?? ""}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
