import type { ProjectChartGroupingMode } from "@/lib/project-charts/types";

export type ProjectDataRouteSearchParams = {
  sheet?: string | string[];
  compare?: string | string[];
  left?: string | string[];
  right?: string | string[];
  mode?: string | string[];
};

export type ProjectDataRouteState = {
  selectedEstimateId: string | null;
  /**
   * null means the URL did not express a compare preference, so the repository
   * may choose a useful default. [] means the user explicitly chose no compare
   * sheets (encoded as compare=none).
   */
  compareEstimateIds: string[] | null;
  groupingMode: ProjectChartGroupingMode;
};

export function resolveProjectDataRouteState(searchParams?: ProjectDataRouteSearchParams | null): ProjectDataRouteState {
  const selectedEstimateId = readSelectedEstimateId(searchParams?.sheet, searchParams?.left);
  return {
    selectedEstimateId,
    compareEstimateIds: readCompareEstimateIds(searchParams?.compare, searchParams?.right, selectedEstimateId),
    groupingMode: readGroupingMode(searchParams?.mode),
  };
}

function readGroupingMode(value: string | string[] | undefined): ProjectChartGroupingMode {
  const mode = readFirst(value);
  return mode === "category" || mode === "supplier" || mode === "space" ? mode : "category";
}

function readSelectedEstimateId(
  sheet: string | string[] | undefined,
  left: string | string[] | undefined,
): string | null {
  return readFirst(sheet) ?? readFirst(left) ?? null;
}

function readCompareEstimateIds(
  compare: string | string[] | undefined,
  right: string | string[] | undefined,
  selectedEstimateId: string | null,
): string[] | null {
  const compareValues = readValues(compare);
  if (compareValues.length > 0) {
    return parseCompareValues(compareValues, selectedEstimateId);
  }

  const legacyRight = readFirst(right);
  if (!legacyRight) return null;
  return legacyRight === selectedEstimateId ? [] : [legacyRight];
}

function parseCompareValues(values: string[], selectedEstimateId: string | null): string[] {
  if (values.some((value) => value.trim().toLowerCase() === "none")) return [];
  const ids = values.flatMap((value) =>
    value.split(",").flatMap((part) => {
      const trimmed = part.trim();
      return trimmed ? [trimmed] : [];
    })
  );
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (id === selectedEstimateId || seen.has(id)) continue;
    out.push(id);
    seen.add(id);
    if (out.length === 2) break;
  }
  return out;
}

function readFirst(value: string | string[] | undefined): string | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  return typeof candidate === "string" && candidate.length > 0 ? candidate : null;
}

function readValues(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value;
  return typeof value === "string" ? [value] : [];
}
