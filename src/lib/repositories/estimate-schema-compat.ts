import type { Tables } from "@/lib/supabase/types";

export type EstimateRecordWithLegacy = Omit<Tables<"estimates">, "sheet_code"> & {
  sheet_code?: string | null;
  revision_label?: string | null;
};

type MissingColumnErrorCandidate = {
  code?: string | null;
  message?: string | null;
};

export function isMissingColumnError(error: MissingColumnErrorCandidate | null | undefined, column: string) {
  const message = error?.message?.toLowerCase() ?? "";
  const missingColumnCodes = error?.code === "42703" || error?.code === "PGRST204";
  return missingColumnCodes && message.includes(column.toLowerCase());
}

export function normalizeEstimateRecord(estimate: EstimateRecordWithLegacy): Tables<"estimates"> {
  const { revision_label: legacyRevisionLabel, sheet_code: sheetCode, ...rest } = estimate;

  return {
    ...rest,
    sheet_code: sheetCode ?? legacyRevisionLabel ?? "Rev 0",
  } as Tables<"estimates">;
}
