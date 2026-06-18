import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";

import { cn } from "@/lib/ui/cn";

import { MATERIAL_PHOTOS_READY } from "./lib";

type LibraryHubCardProps = {
  href: string;
  count?: number;
  className?: string;
};

/**
 * The Library hub — same material-frost footprint as the destination tiles, but
 * with a warm-tinted frost so it still reads as the brand "home" accent. Backed
 * by an aggregate macro photo under the warm liquid-glass pane; dark-ink
 * catalogue caption rides crisp on top.
 */
export function LibraryHubCard({ href, count, className }: LibraryHubCardProps) {
  return (
    <Link
      href={href}
      aria-label="Open Library"
      className={cn(
        "material-card material-aggregate dashboard-card-hover group relative block h-full min-h-[118px] w-full",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        className,
      )}
    >
      {MATERIAL_PHOTOS_READY ? (
        <span className="absolute inset-0 overflow-hidden">
          <Image
            src="/Cards/materials/aggregate.jpg"
            alt=""
            fill
            className="object-cover transition-transform duration-[220ms] ease-out group-hover:scale-[1.04] motion-reduce:transform-none motion-reduce:transition-none"
            sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 28vw"
          />
        </span>
      ) : null}
      <span className="material-card-frost material-card-frost--warm" aria-hidden="true" />

      <ArrowUpRight
        size={16}
        weight="regular"
        aria-hidden="true"
        className="absolute right-2.5 top-2.5 z-10 text-ink/80 transition-transform duration-[200ms] ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none"
      />

      <span className="material-card-caption material-card-caption--warm absolute bottom-2.5 left-2.5 z-10 flex flex-col gap-0.5">
        <span className="font-numeric text-[9px] tracking-[0.14em] text-secondary">04</span>
        <span className="text-[12px] font-medium text-ink">Library</span>
        {count != null ? (
          <span className="font-numeric text-[11px] text-secondary">{count} items</span>
        ) : null}
      </span>
    </Link>
  );
}
