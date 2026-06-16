import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ProjectEstimateSheetSummary = {
  id: string;
  name: string;
  sheetCode: string | null;
  updatedAt: string | null;
};

function toEstimateSheetSearchPatterns(search: string | undefined) {
  const rawSearch = search?.trim().replace(/\s+/g, " ") ?? "";
  const normalizedSearch = rawSearch
    .replace(/[,()"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return Array.from(
    new Set([rawSearch, normalizedSearch].filter(Boolean)),
  ).map((value) => `%${value.replace(/[\\%_]/g, "\\$&")}%`);
}

type EstimateSheetRow = {
  id: string;
  name: string;
  sheet_code: string | null;
  updated_at: string | null;
};

function appendEstimateSheetRows(
  rowsById: Map<string, EstimateSheetRow>,
  rows: readonly EstimateSheetRow[],
  limit: number | undefined,
) {
  for (const row of rows) {
    if (!rowsById.has(row.id) && limit != null && rowsById.size >= limit) return;
    rowsById.set(row.id, row);
  }
}

export async function listProjectEstimateSheetsForProject(
  projectId: string,
  options: { limit?: number; search?: string } = {},
): Promise<ProjectEstimateSheetSummary[]> {
  const supabase = await createSupabaseServerClient();
  const searchPatterns = toEstimateSheetSearchPatterns(options.search);

  const readQuery = (column?: "name" | "sheet_code", pattern?: string) => {
    let query = supabase
      .from("estimates")
      .select("id, name, sheet_code, updated_at")
      .eq("project_id", projectId);
    if (column && pattern) query = query.ilike(column, pattern);
    query = query.order("sheet_code", { ascending: true });
    return options.limit ? query.limit(options.limit) : query;
  };

  const results = searchPatterns.length > 0
    ? await Promise.all(
        searchPatterns.flatMap((pattern) => [
          readQuery("name", pattern),
          readQuery("sheet_code", pattern),
        ]),
      )
    : [await readQuery()];
  const error = results.find((result) => result.error)?.error;

  if (error) throw error;

  const estimatesById = new Map<string, EstimateSheetRow>();
  if (searchPatterns.length === 0) {
    appendEstimateSheetRows(estimatesById, results[0]?.data ?? [], options.limit);
  } else {
    for (let index = 0; index < results.length; index += 2) {
      const nameRows = results[index]?.data ?? [];
      const sheetCodeRows = results[index + 1]?.data ?? [];
      appendEstimateSheetRows(estimatesById, nameRows.slice(0, 1), options.limit);
      appendEstimateSheetRows(estimatesById, sheetCodeRows, options.limit);
      appendEstimateSheetRows(estimatesById, nameRows.slice(1), options.limit);
    }
  }

  return Array.from(estimatesById.values())
    .map((estimate) => ({
      id: estimate.id,
      name: estimate.name,
      sheetCode: estimate.sheet_code ?? null,
      updatedAt: estimate.updated_at ?? null,
    }));
}
