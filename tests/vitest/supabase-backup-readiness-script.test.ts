import { describe, expect, it } from "vitest";

import {
  checkSupabaseBackupReadiness,
  extractJsonObject,
  parseRestoreDrillStatus,
} from "@/../scripts/check-supabase-backup-readiness";

describe("Supabase backup readiness checker", () => {
  it("extracts JSON from Supabase CLI output with surrounding warnings", () => {
    const input = `A new version of Supabase CLI is available
{
  "backups": [],
  "pitr_enabled": false,
  "walg_enabled": true,
  "region": "ap-southeast-2"
}
Use --help for more information`;

    expect(extractJsonObject(input)).toContain('"pitr_enabled": false');
  });

  it("fails closed for current negative backup/PITR provider state", () => {
    const result = checkSupabaseBackupReadiness({
      input: JSON.stringify({
        backups: [],
        pitr_enabled: false,
        walg_enabled: true,
        region: "ap-southeast-2",
      }),
      source: "test",
      projectRef: "ebxxqidacheyapmmzavr",
      restoreDrillStatus: undefined,
    });

    expect(result.supabaseBackupReady).toBe(false);
    expect(result.backupCount).toBe(0);
    expect(result.pitrEnabled).toBe(false);
    expect(result.walgEnabled).toBe(true);
    expect(result.restoreDrillStatus).toBe("not-provided");
    expect(result.missing).toEqual(["listed backups", "PITR enabled", "restore drill passed"]);
  });

  it("passes only with listed backups, PITR enabled, and explicit restore-drill pass", () => {
    const result = checkSupabaseBackupReadiness({
      input: JSON.stringify({
        backups: [{ id: "backup-one" }],
        pitr_enabled: true,
        walg_enabled: true,
        region: "ap-southeast-2",
      }),
      source: "test",
      restoreDrillStatus: "passed",
    });

    expect(result.supabaseBackupReady).toBe(true);
    expect(result.hasListedBackups).toBe(true);
    expect(result.restoreDrillPassed).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it("does not treat invalid JSON or unknown restore statuses as ready", () => {
    const result = checkSupabaseBackupReadiness({
      input: "Supabase CLI failed before JSON output",
      source: "test",
      restoreDrillStatus: "secret passphrase",
    });

    expect(result.supabaseBackupReady).toBe(false);
    expect(result.parsedBackupList).toBe(false);
    expect(result.parseError).toContain("No JSON object");
    expect(result.restoreDrillStatus).toBe("not-provided");
    expect(JSON.stringify(result)).not.toContain("secret passphrase");
  });

  it("normalizes restore drill status to a small sanitized set", () => {
    expect(parseRestoreDrillStatus("PASSED")).toBe("passed");
    expect(parseRestoreDrillStatus("failed")).toBe("failed");
    expect(parseRestoreDrillStatus("blocked")).toBe("blocked");
    expect(parseRestoreDrillStatus("anything else")).toBe("not-provided");
  });
});
