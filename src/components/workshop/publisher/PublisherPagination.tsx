import { Button } from "@/components/ui/button";

type PublisherPaginationProps = {
  hasNextPage: boolean;
  onPageChange: (page: number) => void;
  page: number;
};

export function PublisherPagination({ hasNextPage, onPageChange, page }: PublisherPaginationProps) {
  return (
    <nav aria-label="Publication roster pages" className="flex items-center gap-2 text-[10px] text-secondary">
      <Button type="button" variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Previous
      </Button>
      <span aria-current="page">Page {page}</span>
      <Button type="button" variant="secondary" size="sm" disabled={!hasNextPage} onClick={() => onPageChange(page + 1)}>
        Next
      </Button>
    </nav>
  );
}
