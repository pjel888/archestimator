import { describe, expect, it } from "vitest";

import { runStagingBetaFixture, type StagingBetaFixtureTarget } from "../../scripts/e2e/beta-fixture-staging";

type Row = { key: string; enabled: number; description: string };

const target: StagingBetaFixtureTarget = {
  database: "archestimator-staging-db",
  databaseId: "12345678-1234-4234-9234-1234567890ab",
  host: "https://golden.staging.example.test",
  foreignCanaryKey: "beta-fixture-foreign-canary",
  confirmation: "BETA_FIXTURE_STAGING:12345678-1234-4234-9234-1234567890ab:https://golden.staging.example.test",
};

function createExecutor() {
  const rows = new Map<string, Row>([[target.foreignCanaryKey, { key: target.foreignCanaryKey, enabled: 0, description: "foreign-canary" }]]);
  const execute = (args: string[]) => {
    const sql = args.at(-1) ?? "";
    const key = sql.match(/WHERE key = '([^']+)'/)?.[1]?.replaceAll("''", "'");
    const resultRows = sql.startsWith("SELECT count(*)")
      ? [{ count: [...rows.keys()].filter((rowKey) => rowKey.startsWith("beta-golden-release-20260712-a1b2c3d4-")).length }]
      : sql.startsWith("SELECT")
        ? key && rows.has(key) ? [rows.get(key)!] : []
        : [];
    if (sql.startsWith("INSERT")) {
      const values = sql.match(/VALUES \('([^']+)', 0, '(.+)', datetime/u);
      if (!values) throw new Error(`could not parse insert: ${sql}`);
      rows.set(values[1]!.replaceAll("''", "'"), { key: values[1]!.replaceAll("''", "'"), enabled: 0, description: values[2]!.replaceAll("''", "'") });
    }
    if (sql.startsWith("DELETE") && key) rows.delete(key);
    return { status: 0, stdout: JSON.stringify([{ success: true, results: resultRows }]), stderr: "" };
  };
  return { execute, rows };
}

describe("provider-backed staging beta fixture runner", () => {
  it("requires an exact non-production target, preserves the foreign canary, and cleans owned records twice", async () => {
    const { execute, rows } = createExecutor();
    const receipt = await runStagingBetaFixture({ runId: "release-20260712-a1b2c3d4", cleanupSigningKey: "local-only-fixture-signing-key", target, execute });

    expect(receipt.setup.state).toBe("ready");
    expect(receipt.cleanup.state).toBe("cleaned");
    expect(receipt.remainingOwnedRecords).toBe(0);
    expect(receipt.foreignCanaryIntact).toBe(true);
    expect(rows).toEqual(new Map([[target.foreignCanaryKey, { key: target.foreignCanaryKey, enabled: 0, description: "foreign-canary" }]]));
    expect(JSON.stringify(receipt)).not.toContain(target.host);
    expect(JSON.stringify(receipt)).not.toContain(target.foreignCanaryKey);
  });

  it.each([
    ["production binding", { ...target, database: "ARCH_DB" }],
    ["production host", { ...target, host: "https://archestimator.com", confirmation: "BETA_FIXTURE_STAGING:12345678-1234-4234-9234-1234567890ab:https://archestimator.com" }],
    ["mismatched confirmation", { ...target, confirmation: "BETA_FIXTURE_STAGING:wrong" }],
  ])("refuses %s before executing a provider command", async (_label, invalidTarget) => {
    let calls = 0;
    await expect(runStagingBetaFixture({
      runId: "release-20260712-a1b2c3d4",
      cleanupSigningKey: "local-only-fixture-signing-key",
      target: invalidTarget,
      execute: () => {
        calls += 1;
        return { status: 0, stdout: "[]", stderr: "" };
      },
    })).rejects.toThrow("Staging beta fixture refused");
    expect(calls).toBe(0);
  });
});
