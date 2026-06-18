import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";

import { cn } from "@/lib/ui/cn";

type LibraryHubCardProps = {
  href: string;
  count?: number;
  className?: string;
};

/**
 * The Library hub — same destination footprint as the other tiles, with a quiet
 * neutral tint because it is the aggregate library entry point.
 */
export function LibraryHubCard({ href, count, className }: LibraryHubCardProps) {
  return (
    <Link
      href={href}
      aria-label="Open Library"
      className={cn(
        "dashboard-destination-card dashboard-destination-card--library dashboard-card-hover group relative block h-full min-h-[118px] w-full",
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

      <span className="absolute bottom-2 left-2 z-10 flex flex-col gap-0.5">
        <span className="dashboard-destination-card-index font-numeric text-[9px]">04</span>
        <span className="dashboard-destination-card-title text-[12px] font-medium">Library</span>
        {count != null ? (
          <span className="dashboard-destination-card-count font-numeric text-[11px]">
            {count} items
          </span>
        ) : null}
      </span>
    </Link>
  );
}
