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
};

const KIND_META: Record<
  ImageDestinationKind,
  { cap: string; block: string }
> = {
  projects: { cap: "Projects", block: "[background-color:var(--block-clay)]" },
  components: { cap: "Components", block: "[background-color:var(--block-sage)]" },
  templates: { cap: "Templates", block: "[background-color:var(--block-indigo)]" },
};

/**
 * Image-backed destination tile for the dashboard bento (Projects / Components /
 * Templates). The whole card is one Link filling its grid cell; a full-bleed
 * next/image sits under a bottom scrim with white-on-art text. A flat color
 * block (token per kind) shows through if the image ever fails to load.
 */
export function ImageDestinationCard({
  kind,
  href,
  label,
  count,
  countNoun,
  plateIndex,
  className,
}: ImageDestinationCardProps) {
  const { cap, block } = KIND_META[kind];

  return (
    <Link
      href={href}
      aria-label={`Open ${label}`}
      className={cn(
        "image-card dashboard-card-hover group relative block h-full min-h-[150px] w-full",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        `image-card-${kind}`,
        block,
        className,
      )}
    >
      <span className="absolute inset-0 overflow-hidden">
        <Image
          src={`/Cards/${cap}-Card.jpg`}
          alt=""
          fill
          className="object-cover transition-transform duration-[200ms] ease-out group-hover:scale-[1.03] motion-reduce:transform-none motion-reduce:transition-none"
          sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
          priority={kind === "projects"}
        />
      </span>
      <span className="image-card-scrim" aria-hidden="true" />

      <ArrowUpRight
        size={16}
        weight="regular"
        aria-hidden="true"
        className="absolute right-3 top-3 z-10 text-[color:var(--on-art)] transition-transform duration-[200ms] ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none"
      />

      <span className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-0.5 p-3">
        <span className="font-numeric text-[9px] tracking-normal text-[color:var(--on-art-faint)]">
          {plateIndex}
        </span>
        <span className="text-[12px] font-medium text-[color:var(--on-art)]">{label}</span>
        {count != null ? (
          <span className="font-numeric text-[12px] text-[color:var(--on-art-muted)]">
            {count} {countNoun ?? ""}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
