import { createHash } from "node:crypto";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";

import {
  BETA_GOLDEN_FIXTURE_OWNER,
  cleanupBetaGoldenFixture,
  createBetaFixtureCleanupManifest,
  seedBetaGoldenFixture,
  type BetaFixtureCleanupManifest,
  type BetaFixtureRecord,
  type BetaFixtureStore,
} from "./beta-fixture-contract";

const FEATURE_FLAG_TABLE = "feature_flags";
const REQUIRED_BINDINGS = ["ARCH_DB"] as const;
const STAGING_CONFIRMATION_PREFIX = "BETA_FIXTURE_STAGING";

type WranglerResult = Pick<SpawnSyncReturns<string>, "status" | "stdout" | "stderr" | "error">;

export type StagingBetaFixtureTarget = {
  database: string;
  databaseId: string;
  host: string;
  foreignCanaryKey: string;
  confirmation: string;
};

export type StagingBetaFixtureRunInput = {
  runId: string;
  cleanupSigningKey: string;
  target: StagingBetaFixtureTarget;
  execute: (args: string[]) => WranglerResult;
};

export type StagingBetaFixtureRunReceipt = {
  target: { databaseId: string; hostDigest: string; foreignCanaryKeyDigest: string };
  setup: Awaited<ReturnType<typeof seedBetaGoldenFixture>>;
  cleanup: Awaited<ReturnType<typeof cleanupBetaGoldenFixture>>;
  remainingOwnedRecords: number;
  foreignCanaryIntact: boolean;
};

type D1QueryResult = { results?: Array<Record<string, unknown>>; success?: boolean };

function fail(message: string): never {
  throw new Error(`Staging beta fixture refused: ${message}`);
}

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function sqlString(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

function parseSingleResult(output: string): D1QueryResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(output);
  } catch {
    fail("Wrangler did not return JSON");
  }
  if (!Array.isArray(parsed) || parsed.length !== 1 || !parsed[0] || typeof parsed[0] !== "object") {
    fail("Wrangler returned an unexpected D1 result shape");
  }
  return parsed[0] as D1QueryResult;
}

function validateTarget(target: StagingBetaFixtureTarget) {
  if (!/^[a-z0-9][a-z0-9-]{2,63}$/u.test(target.database)) fail("database name is invalid");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(target.databaseId)) {
    fail("database ID is invalid");
  }
  if (!/^[A-Za-z0-9:_-]{3,128}$/u.test(target.foreignCanaryKey)) fail("foreign canary key is invalid");

  let origin: string;
  let hostname: string;
  try {
    const url = new URL(target.host);
    origin = url.origin;
    hostname = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || url.pathname !== "/" || url.search || url.hash || url.username || url.password) {
      fail("staging host must be a credential-free HTTPS origin");
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Staging beta fixture refused:")) throw error;
    fail("staging host is invalid");
  }
  if (!hostname.includes("staging") && !hostname.includes("preview") && !hostname.endsWith(".test")) {
    fail("staging host must identify a non-production surface");
  }
  if (hostname === "archestimator.com" || hostname.endsWith(".archestimator.com")) fail("production host is refused");
  if (target.database === "ARCH_DB" || target.database === "archestimator-proof-db") fail("production D1 target is refused");
  if (target.confirmation !== `${STAGING_CONFIRMATION_PREFIX}:${target.databaseId}:${origin}`) {
    fail("explicit target confirmation does not match database ID and host");
  }
  return origin;
}

function createD1Store(target: StagingBetaFixtureTarget, execute: StagingBetaFixtureRunInput["execute"]): BetaFixtureStore {
  const runQuery = (sql: string) => {
    const result = execute(["d1", "execute", target.database, "--remote", "--json", "--command", sql]);
    if (result.error || result.status !== 0) fail("remote D1 command failed");
    const parsed = parseSingleResult(result.stdout ?? "");
    if (parsed.success !== true) fail("remote D1 command reported failure");
    return parsed.results ?? [];
  };
  const readRecord = (id: string): BetaFixtureRecord | undefined => {
    const rows = runQuery(`SELECT key, description FROM ${FEATURE_FLAG_TABLE} WHERE key = ${sqlString(id)} LIMIT 1;`);
    if (rows.length === 0) return undefined;
    const description = rows[0]?.description;
    if (typeof description !== "string") return undefined;
    try {
      const parsed = JSON.parse(description) as BetaFixtureRecord;
      return parsed.id === id ? parsed : undefined;
    } catch {
      return undefined;
    }
  };
  const canaryRows = runQuery(`SELECT key, description FROM ${FEATURE_FLAG_TABLE} WHERE key = ${sqlString(target.foreignCanaryKey)} LIMIT 1;`);
  if (canaryRows.length !== 1 || typeof canaryRows[0]?.description !== "string") fail("foreign canary is missing");
  const canaryDigest = digest(canaryRows[0].description as string);

  return {
    get: async (id) => readRecord(id),
    put: async (record) => {
      const serialized = JSON.stringify(record);
      runQuery(
        `INSERT INTO ${FEATURE_FLAG_TABLE} (key, enabled, description, updated_at, updated_by) VALUES (${sqlString(record.id)}, 0, ${sqlString(serialized)}, datetime('now'), NULL) `
        + `ON CONFLICT(key) DO UPDATE SET enabled = excluded.enabled, description = excluded.description, updated_at = excluded.updated_at, updated_by = excluded.updated_by;`,
      );
    },
    delete: async (id) => {
      runQuery(`DELETE FROM ${FEATURE_FLAG_TABLE} WHERE key = ${sqlString(id)} AND description LIKE ${sqlString(`%\"fixtureOwner\":\"${BETA_GOLDEN_FIXTURE_OWNER}\"%`)};`);
    },
    assertForeignCanary: async () => {
      const rows = runQuery(`SELECT description FROM ${FEATURE_FLAG_TABLE} WHERE key = ${sqlString(target.foreignCanaryKey)} LIMIT 1;`);
      if (rows.length !== 1 || typeof rows[0]?.description !== "string" || digest(rows[0].description as string) !== canaryDigest) {
        fail("foreign canary changed or disappeared");
      }
    },
  };
}

function countOwnedRecords(target: StagingBetaFixtureTarget, execute: StagingBetaFixtureRunInput["execute"], runId: string) {
  const result = execute([
    "d1", "execute", target.database, "--remote", "--json", "--command",
    `SELECT count(*) AS count FROM ${FEATURE_FLAG_TABLE} WHERE key LIKE ${sqlString(`beta-golden-${runId}-%`)} AND description LIKE ${sqlString(`%\"fixtureOwner\":\"${BETA_GOLDEN_FIXTURE_OWNER}\"%`)};`,
  ]);
  if (result.error || result.status !== 0) fail("remote D1 owned-record readback failed");
  const rows = parseSingleResult(result.stdout ?? "").results ?? [];
  const count = rows[0]?.count;
  if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) fail("owned-record readback is invalid");
  return count;
}

export async function runStagingBetaFixture(input: StagingBetaFixtureRunInput): Promise<StagingBetaFixtureRunReceipt> {
  const origin = validateTarget(input.target);
  const manifest = createBetaFixtureCleanupManifest({
    runId: input.runId,
    cleanupSigningKey: input.cleanupSigningKey,
    environment: {
      host: input.target.host,
      targetKind: "staging",
      bindingNames: REQUIRED_BINDINGS,
      approvedBindingNames: REQUIRED_BINDINGS,
    },
  });
  const store = createD1Store(input.target, input.execute);
  let setup: Awaited<ReturnType<typeof seedBetaGoldenFixture>> | undefined;
  let cleanup: Awaited<ReturnType<typeof cleanupBetaGoldenFixture>> | undefined;
  try {
    setup = await seedBetaGoldenFixture(store, manifest, input.cleanupSigningKey);
  } finally {
    cleanup = await cleanupBetaGoldenFixture(store, manifest, input.cleanupSigningKey);
    const secondCleanup = await cleanupBetaGoldenFixture(store, manifest, input.cleanupSigningKey);
    if (secondCleanup.state !== "cleaned") fail("second cleanup did not complete");
    const remainingOwnedRecords = countOwnedRecords(input.target, input.execute, input.runId);
    if (remainingOwnedRecords !== 0) fail("owned fixture records remain after cleanup");
    await store.assertForeignCanary();
  }
  if (!setup || !cleanup) fail("fixture setup or cleanup receipt is missing");
  return {
    target: {
      databaseId: input.target.databaseId,
      hostDigest: digest(origin),
      foreignCanaryKeyDigest: digest(input.target.foreignCanaryKey),
    },
    setup,
    cleanup,
    remainingOwnedRecords: 0,
    foreignCanaryIntact: true,
  };
}

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) fail(`${name} is required`);
  return value;
}

function runWrangler(args: string[]): WranglerResult {
  return spawnSync("bunx", ["wrangler", ...args], { cwd: process.cwd(), encoding: "utf8", timeout: 30_000, maxBuffer: 1024 * 1024 });
}

if (import.meta.main) {
  try {
    if (process.argv[2] !== "--execute") fail("pass --execute to allow a remote staging mutation");
    const receipt = await runStagingBetaFixture({
      runId: required("BETA_FIXTURE_RUN_ID"),
      cleanupSigningKey: required("BETA_FIXTURE_CLEANUP_SIGNING_KEY"),
      target: {
        database: required("BETA_FIXTURE_STAGING_DATABASE"),
        databaseId: required("BETA_FIXTURE_STAGING_DATABASE_ID"),
        host: required("BETA_FIXTURE_STAGING_HOST"),
        foreignCanaryKey: required("BETA_FIXTURE_FOREIGN_CANARY_KEY"),
        confirmation: required("BETA_FIXTURE_STAGING_CONFIRMATION"),
      },
      execute: runWrangler,
    });
    process.stdout.write(`${JSON.stringify(receipt)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : "Staging beta fixture failed"}\n`);
    process.exitCode = 1;
  }
}
