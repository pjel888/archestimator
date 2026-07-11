import { Button } from "@/components/ui/button";

type PublisherPaginationProps = {
  hasNextPage: boolean;
  onPageChange: (page: number) => void;
  page: number;
};

export function PublisherPagination({ hasNextPage, onPageChange, page }: PublisherPaginationProps) {
  return (
    <nav aria-label="Shared link pages" className="flex w-full items-center justify-between gap-2 text-[10px] text-secondary sm:w-auto sm:justify-start">
      <Button type="button" variant="secondary" size="sm" className="min-h-9 min-w-0 flex-1 px-2 sm:flex-none" aria-label="Previous shared link page" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Previous
      </Button>
      <span aria-current="page" className="shrink-0">Page {page}</span>
      <Button type="button" variant="secondary" size="sm" className="min-h-9 min-w-0 flex-1 px-2 sm:flex-none" aria-label="Next shared link page" disabled={!hasNextPage} onClick={() => onPageChange(page + 1)}>
        Next
      </Button>
    </nav>
  );
}
