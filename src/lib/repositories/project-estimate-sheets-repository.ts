import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ProjectEstimateSheetSummary = {
  id: string;
  name: string;
  sheetCode: string | null;
  updatedAt: string | null;
};

export async function listProjectEstimateSheetsForProject(projectId: string): Promise<ProjectEstimateSheetSummary[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("estimates")
    .select("id, name, sheet_code, updated_at")
    .eq("project_id", projectId)
    .order("sheet_code", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((estimate) => ({
    id: estimate.id,
    name: estimate.name,
    sheetCode: estimate.sheet_code ?? null,
    updatedAt: estimate.updated_at ?? null,
  }));
}
