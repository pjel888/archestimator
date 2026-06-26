"use server";

import {
  EMPTY_ESTIMATE_COLUMN_WIDTHS,
  normalizeEstimateColumnWidths,
  type EstimateColumnWidths,
} from "@/lib/estimate-sheet/column-model";
import { isUuid } from "@/lib/ids";
import { ensureDefaultWorkspace } from "@/lib/repositories/workspace-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import type { Json } from "@/lib/supabase/types";
import { requireCurrentUserContext } from "@/lib/auth/session";

export type EstimateSheetUserPreferences = {
  columnWidths: EstimateColumnWidths;
  updatedAt?: string | null;
};

export type SaveEstimateSheetUserPreferencesInput = {
  estimateId: string;
  columnWidths?: EstimateColumnWidths | null;
};

type EstimateSheetUserPreferenceRow = {
  column_widths: Json | null;
  updated_at: string | null;
};

type EstimateSheetUserPreferenceUpsert = {
  user_id: string;
  workspace_id: string;
  estimate_id: string;
  column_widths: Json;
};

type EstimateSheetUserPreferenceQuery = {
  select: (columns: string) => EstimateSheetUserPreferenceQuery;
  eq: (column: string, value: string) => EstimateSheetUserPreferenceQuery;
  maybeSingle: () => PromiseLike<{ data: EstimateSheetUserPreferenceRow | null; error: { message?: string } | null }>;
  upsert: (
    row: EstimateSheetUserPreferenceUpsert,
    options: { onConflict: string },
  ) => PromiseLike<{ error: { message?: string } | null }>;
};

type EstimateSheetUserPreferenceClient = {
  from: (table: "estimate_sheet_user_preferences") => EstimateSheetUserPreferenceQuery;
};

function readColumnWidths(value: unknown): EstimateColumnWidths {
  if (!value || typeof value !== "object" || Array.isArray(value)) return EMPTY_ESTIMATE_COLUMN_WIDTHS;
  return normalizeEstimateColumnWidths(value as EstimateColumnWidths);
}

async function getEstimatePreferenceContext(estimateId: string) {
  if (!isUuid(estimateId)) return null;
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("can_access_estimate", { target_estimate_id: estimateId });
  if (error || data !== true) return null;
  return { workspaceId: workspace.id, userId: currentUser.userId, estimateId };
}

export async function loadEstimateSheetUserPreferences(estimateId: string): Promise<EstimateSheetUserPreferences | null> {
  try {
    const context = await getEstimatePreferenceContext(estimateId);
    if (!context) return null;

    const admin = createSupabaseServiceRoleClient("archestimator-estimate-sheet-preferences-read") as unknown as EstimateSheetUserPreferenceClient;
    const { data, error } = await admin
      .from("estimate_sheet_user_preferences")
      .select("column_widths,updated_at")
      .eq("user_id", context.userId)
      .eq("workspace_id", context.workspaceId)
      .eq("estimate_id", context.estimateId)
      .maybeSingle();

    if (error || !data) return null;
    return {
      columnWidths: readColumnWidths(data.column_widths),
      updatedAt: data.updated_at,
    };
  } catch {
    return null;
  }
}

export async function saveEstimateSheetUserPreferences(input: SaveEstimateSheetUserPreferencesInput) {
  try {
    const context = await getEstimatePreferenceContext(input.estimateId);
    if (!context) return { ok: false, ignored: true };

    const admin = createSupabaseServiceRoleClient("archestimator-estimate-sheet-preferences-write") as unknown as EstimateSheetUserPreferenceClient;
    const { error } = await admin
      .from("estimate_sheet_user_preferences")
      .upsert({
        user_id: context.userId,
        workspace_id: context.workspaceId,
        estimate_id: context.estimateId,
        column_widths: readColumnWidths(input.columnWidths) as Json,
      }, { onConflict: "user_id,workspace_id,estimate_id" });

    if (error) return { ok: false, ignored: true };
    return { ok: true };
  } catch {
    return { ok: false, ignored: true };
  }
}
