import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/ui/cn";

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, totalPages, onPageChange, className }: PaginationProps) {
  const getPages = () => {
    const pages: (number | "ellipsis")[] = [];
    
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (page <= 4) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push("ellipsis");
        pages.push(totalPages);
      } else if (page >= totalPages - 3) {
        pages.push(1);
        pages.push("ellipsis");
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push("ellipsis");
        pages.push(page - 1);
        pages.push(page);
        pages.push(page + 1);
        pages.push("ellipsis");
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const pages = getPages();

  return (
    <nav aria-label="Pagination" className={cn("flex items-center gap-1", className)}>
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-xs border border-hairline bg-surface text-ink transition-colors hover:bg-surfaceMuted disabled:pointer-events-none disabled:opacity-50"
        aria-label="Previous page"
      >
        <CaretLeft weight="regular" size={14} className="pointer-events-none" aria-hidden="true" />
      </button>

      <div className="flex items-center gap-1">
        {pages.map((p, i) => {
          if (p === "ellipsis") {
            return (
              <span
                key={`ellipsis-${i}`}
                className="flex h-7 w-7 items-center justify-center text-[10px] font-normal tracking-normal text-muted"
              >
                ...
              </span>
            );
          }

          const isActive = p === page;

          return (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex h-7 min-w-7 cursor-pointer items-center justify-center rounded-xs px-1.5 text-[10px] font-medium tracking-normal transition-colors",
                isActive
                  ? "bg-primary text-white"
                  : "border border-hairline bg-surface text-ink hover:bg-surfaceMuted"
              )}
            >
              {p}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-xs border border-hairline bg-surface text-ink transition-colors hover:bg-surfaceMuted disabled:pointer-events-none disabled:opacity-50"
        aria-label="Next page"
      >
        <CaretRight weight="regular" size={14} className="pointer-events-none" aria-hidden="true" />
      </button>
    </nav>
  );
}
