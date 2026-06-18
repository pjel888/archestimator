import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";

import { cn } from "@/lib/ui/cn";

type LibraryHubCardProps = {
  href: string;
  count?: number;
  className?: string;
};

/**
 * Gradient destination tile for the Library hub — same bento footprint as the
 * image cards but rendered from the `--library-hub-gradient` (no image) with a
 * grain overlay and bottom scrim. The hub body is dark clay, so white-on-art
 * text stays AA-safe.
 */
export function LibraryHubCard({ href, count, className }: LibraryHubCardProps) {
  return (
    <Link
      href={href}
      aria-label="Open Library"
      className={cn(
        "library-hub grain-overlay dashboard-card-hover group relative block h-full min-h-[150px] w-full",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        className,
      )}
    >
      <span className="image-card-scrim" aria-hidden="true" />

      <ArrowUpRight
        size={16}
        weight="regular"
        aria-hidden="true"
        className="absolute right-3 top-3 z-10 text-[color:var(--on-art)] transition-transform duration-[200ms] ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none"
      />

      <span className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-0.5 p-3">
        <span className="font-numeric text-[9px] tracking-normal text-[color:var(--on-art-faint)]">
          04
        </span>
        <span className="text-[12px] font-medium text-[color:var(--on-art)]">Library</span>
        {count != null ? (
          <span className="font-numeric text-[12px] text-[color:var(--on-art-muted)]">
            {count} items
          </span>
        ) : null}
      </span>
    </Link>
  );
}
