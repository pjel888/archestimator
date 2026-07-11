import { describe, expect, it } from "vitest";

import { DEFAULT_RETENTION_RULES, runRetentionPassInD1, type RetentionD1DatabaseLike } from "@/lib/compliance/retention-core";

function databaseWithHeldActivity() {
  const retentionEvents: Array<{ action: unknown; rowsAffected: unknown; metadata: unknown }> = [];
  const database: RetentionD1DatabaseLike = {
    prepare(sql) {
      let values: unknown[] = [];
      return {
        bind(...nextValues) {
          values = nextValues;
          return this;
        },
        async all() {
          if (sql.includes("COUNT(*) AS count")) return { results: [{ count: 2 }] };
          return { results: [{ id: "purgeable-event" }] };
        },
        async run() {
          if (sql.includes("INSERT INTO data_retention_events")) {
            retentionEvents.push({ action: values[2], rowsAffected: values[3], metadata: values[8] });
          }
          return { success: true, meta: { changes: 1 } };
        },
      };
    },
  };
  return { database, retentionEvents };
}

describe("activity lifecycle retention", () => {
  it("excludes active legal holds from the purge selection and records the skipped count", async () => {
    const rule = DEFAULT_RETENTION_RULES.find((candidate) => candidate.className === "estimate_sheet_events");
    const { database, retentionEvents } = databaseWithHeldActivity();

    expect(rule?.selectSql).toContain("NOT EXISTS");
    expect(rule?.selectSql).toContain("hold.released_at IS NULL");
    await runRetentionPassInD1(database, [rule!], { cronRunId: "cron-a" });

    expect(retentionEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({ action: "skipped_legal_hold", rowsAffected: 2, metadata: JSON.stringify({ held_count: 2 }) }),
      expect.objectContaining({ action: "anonymized", rowsAffected: 1 }),
    ]));
  });
});
