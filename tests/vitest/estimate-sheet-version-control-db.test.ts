import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const runLiveDb = process.env.RUN_SUPABASE_INTEGRATION === "1";

function queryLocal(sql: string) {
  return execFileSync("supabase", ["db", "query", sql, "--local", "--output", "json"], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

describe.skipIf(!runLiveDb)("estimate sheet version control live local database contract", () => {
  it("has the Pass A schema and RPCs applied locally", () => {
    const output = queryLocal(`
      select
        to_regclass('public.estimate_sheet_events') is not null as has_events,
        to_regclass('public.estimate_sheet_versions') is not null as has_versions,
        exists (
          select 1
          from information_schema.columns
          where table_schema = 'public'
            and table_name = 'estimate_row_items'
            and column_name = 'row_revision'
        ) as has_row_revision,
        to_regprocedure('public.update_estimate_row_item_with_history(uuid, uuid, uuid, integer, jsonb, uuid, uuid)') is not null as has_update_rpc,
        to_regprocedure('public.restore_estimate_sheet_version_as_copy(uuid, uuid, text, text, uuid, uuid)') is not null as has_restore_rpc;
    `);

    expect(output).toContain("\"has_events\":true");
    expect(output).toContain("\"has_versions\":true");
    expect(output).toContain("\"has_row_revision\":true");
    expect(output).toContain("\"has_update_rpc\":true");
    expect(output).toContain("\"has_restore_rpc\":true");
  });

  it("exposes the storage preflight used to choose inline versus batched backfill", () => {
    const output = queryLocal("select public.get_estimate_sheet_version_control_preflight() as preflight;");

    expect(output).toContain("estimateCount");
    expect(output).toContain("rowCount");
    expect(output).toContain("requiresBatchedBackfill");
  });
});

describe.skipIf(runLiveDb)("estimate sheet version control live local database contract", () => {
  it("is skipped unless RUN_SUPABASE_INTEGRATION=1 because it mutates local Supabase state", () => {
    expect(runLiveDb).toBe(false);
  });
});
