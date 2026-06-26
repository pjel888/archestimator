export const PUBLISHER_ROSTER_DEFAULT_PAGE = 1;
export const PUBLISHER_ROSTER_DEFAULT_PAGE_SIZE = 25;
export const PUBLISHER_ROSTER_MAX_PAGE_SIZE = 50;

export const PUBLISHER_ROSTER_STATUS_FILTERS = [
  "all",
  "active",
  "stale",
  "expired",
  "revoked",
  "drafts",
] as const;

export type PublisherRosterStatusFilter = (typeof PUBLISHER_ROSTER_STATUS_FILTERS)[number];
export type PublicationRosterStatus = PublisherRosterStatusFilter;

export type PublisherRosterSearchParamValue = string | string[] | undefined;
export type PublisherRosterSearchParams =
  | URLSearchParams
  | Record<string, PublisherRosterSearchParamValue>
  | null
  | undefined;

export type PublisherRosterFilters = {
  status: PublisherRosterStatusFilter;
  projectId: string | null;
  search: string;
  page: number;
  pageSize: number;
};
export type PublicationRosterFilters = PublisherRosterFilters;

const statusFilters = new Set<string>(PUBLISHER_ROSTER_STATUS_FILTERS);
const statusAliases = new Map<string, PublisherRosterStatusFilter>([
  ["published", "active"],
  ["unpublished", "drafts"],
  ["draft", "drafts"],
]);

function readFirstParam(source: PublisherRosterSearchParams, keys: string[]) {
  if (!source) return undefined;

  for (const key of keys) {
    const value = source instanceof URLSearchParams ? source.get(key) ?? undefined : source[key];
    if (Array.isArray(value)) {
      const first = value.find((entry) => typeof entry === "string");
      if (first !== undefined) return first;
      continue;
    }
    if (typeof value === "string") return value;
  }

  return undefined;
}

function normalizeTextParam(value: string | undefined) {
  const normalized = value?.trim().replace(/\s+/g, " ") ?? "";
  return normalized.length > 0 ? normalized : "";
}

function readStatusFilter(value: string | undefined): PublisherRosterStatusFilter {
  const normalized = value?.trim().toLowerCase();
  const aliased = normalized ? statusAliases.get(normalized) : undefined;
  if (aliased) return aliased;
  return normalized && statusFilters.has(normalized) ? (normalized as PublisherRosterStatusFilter) : "all";
}

function readPositiveInteger(value: string | undefined, fallback: number, max: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, 1), max);
}

export function parsePublisherRosterFilters(searchParams: PublisherRosterSearchParams): PublisherRosterFilters {
  return {
    status: readStatusFilter(readFirstParam(searchParams, ["status"])),
    projectId: normalizeTextParam(readFirstParam(searchParams, ["project", "projectId"])) || null,
    search: normalizeTextParam(readFirstParam(searchParams, ["q", "search"])),
    page: readPositiveInteger(readFirstParam(searchParams, ["page"]), PUBLISHER_ROSTER_DEFAULT_PAGE, Number.MAX_SAFE_INTEGER),
    pageSize: readPositiveInteger(
      readFirstParam(searchParams, ["pageSize", "perPage"]),
      PUBLISHER_ROSTER_DEFAULT_PAGE_SIZE,
      PUBLISHER_ROSTER_MAX_PAGE_SIZE,
    ),
  };
}

export const parseRosterFilters = parsePublisherRosterFilters;
