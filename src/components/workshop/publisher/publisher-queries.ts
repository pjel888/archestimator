import type { PublisherRosterFilters, PublisherRosterStatusFilter } from "@/lib/publisher/roster-filter";

export const publisherRosterQueryKeys = {
  all: ["publisher", "roster"] as const,
  drawer: (projectId: string) => [...publisherRosterQueryKeys.all, "drawer", projectId] as const,
  list: (filters: PublisherRosterFilters) =>
    [
      ...publisherRosterQueryKeys.all,
      filters.status,
      filters.projectId ?? "all-projects",
      filters.search,
      filters.page,
      filters.pageSize,
    ] as const,
};

export type PublisherRosterQueryPatch = Partial<{
  status: PublisherRosterStatusFilter;
  projectId: string | null;
  search: string;
  page: number;
  pageSize: number;
}>;

export function writePublisherRosterSearchParams(
  currentSearchParams: URLSearchParams,
  next: PublisherRosterQueryPatch,
) {
  const params = new URLSearchParams(currentSearchParams.toString());

  if (next.status !== undefined) {
    if (next.status === "all") params.delete("status");
    else params.set("status", next.status);
  }

  if (next.projectId !== undefined) {
    if (next.projectId) params.set("project", next.projectId);
    else params.delete("project");
  }

  if (next.search !== undefined) {
    const normalized = next.search.trim().replace(/\s+/g, " ");
    if (normalized) params.set("q", normalized);
    else params.delete("q");
  }

  if (next.page !== undefined) {
    if (next.page <= 1) params.delete("page");
    else params.set("page", String(next.page));
  }

  if (next.pageSize !== undefined) {
    params.set("pageSize", String(next.pageSize));
  }

  return params;
}
