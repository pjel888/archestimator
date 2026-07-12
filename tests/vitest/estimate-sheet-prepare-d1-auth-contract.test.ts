import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildLocalD1PrepareCommands,
  executeLocalD1PrepareCommands,
  type LocalD1PrepareCommandRunner,
} from "../../scripts/lib/estimate-sheet-local-d1-prepare";
import {
  assertMigrationInventoryStable,
  buildLocalPreviewWranglerConfig,
  type MigrationInventoryRecord,
} from "../../scripts/prepare-estimate-sheet-performance-run";

const PREPARE_SOURCE = readFileSync(
  resolve(process.cwd(), "scripts/prepare-estimate-sheet-performance-run.ts"),
  "utf8",
);

function commandFixture() {
  const runRoot = resolve("/tmp/estimate-sheet-prepare-contract/run");
  const persistRoot = join(runRoot, "wrangler-state");
  const configPath = join(runRoot, "resources/d1/wrangler-local.json");
  const schemaPath = join(runRoot, "better-auth-schema.sql");
  const seedPath = join(runRoot, "seed.sql");
  return {
    runRoot,
    persistRoot,
    configPath,
    schemaPath,
    seedPath,
    commands: buildLocalD1PrepareCommands({ runRoot, persistRoot, configPath, schemaPath, seedPath }),
  };
}

describe("estimate-sheet prepare D1 and auth contract", () => {
  it("generates a preview config that uses the seeded local ARCH_DB without inheriting production bindings", () => {
    const repoRoot = resolve("/tmp/estimate-sheet-prepare-contract/repo");
    expect(buildLocalPreviewWranglerConfig({
      repoRoot,
      runId: "00000000-0000-4000-8000-000000000002",
      binding: {
        databaseName: "archestimator-proof-db",
        databaseId: "9bdb29bb-687e-4f51-ae81-7659c426ea5f",
        compatibilityDate: "2026-06-29",
      },
    })).toEqual({
      name: "estimate-performance-00000000-0000-4000-8000-000000000002",
      main: join(repoRoot, "worker.ts"),
      compatibility_date: "2026-06-29",
      compatibility_flags: ["nodejs_compat"],
      alias: { "server-only": join(repoRoot, "node_modules/server-only/empty.js") },
      assets: { directory: join(repoRoot, ".open-next/assets"), binding: "ASSETS" },
      d1_databases: [{
        binding: "ARCH_DB",
        database_name: "archestimator-proof-db",
        database_id: "9bdb29bb-687e-4f51-ae81-7659c426ea5f",
        migrations_dir: join(repoRoot, "migrations"),
      }],
    });
  });

  it("builds the exact run-scoped Wrangler schema, migration, and hashed-seed command sequence", () => {
    const { runRoot, persistRoot, configPath, schemaPath, seedPath, commands } = commandFixture();

    expect(commands).toEqual([
      {
        role: "better-auth-schema",
        argv: [
          "bunx", "wrangler", "d1", "execute", "ARCH_DB",
          "--config", configPath, "--local", "--persist-to", persistRoot, "--file", schemaPath,
        ],
      },
      {
        role: "application-migrations",
        argv: [
          "bunx", "wrangler", "d1", "migrations", "apply", "ARCH_DB", "--config", configPath, "--local",
          "--persist-to", persistRoot,
        ],
      },
      {
        role: "fixture-seed",
        argv: [
          "bunx", "wrangler", "d1", "execute", "ARCH_DB",
          "--config", configPath, "--local", "--persist-to", persistRoot, "--file", seedPath,
        ],
      },
    ]);

    expect(() => buildLocalD1PrepareCommands({
      runRoot,
      persistRoot,
      configPath,
      schemaPath,
      seedPath: resolve(runRoot, "..", "foreign-seed.sql"),
    })).toThrow(/fixture seed path must be contained by the run root/);
  });

  it("executes only the ordered command plan with a sanitized child environment and stops on failure", () => {
    const { commands, runRoot } = commandFixture();
    const calls: Array<{ executable: string; args: string[]; cwd: string; env: NodeJS.ProcessEnv }> = [];
    const runner: LocalD1PrepareCommandRunner = (executable, args, options) => {
      calls.push({ executable, args, cwd: options.cwd, env: options.env });
      return { status: 0, signal: null };
    };
    const repoRoot = resolve("/tmp/estimate-sheet-prepare-contract/repo");

    executeLocalD1PrepareCommands({
      repoRoot,
      runRoot,
      commands,
      runner,
      parentEnvironment: {
        PATH: "/usr/bin:/bin",
        HOME: "/tmp/home",
        BETTER_AUTH_SECRET: "must-not-be-inherited",
      },
    });

    expect(calls.map((call) => call.args)).toEqual(commands.map((command) => command.argv.slice(1)));
    expect(calls).toHaveLength(3);
    expect(calls.every((call) => call.executable === "bunx" && call.cwd === repoRoot)).toBe(true);
    expect(calls[0]?.env).toEqual({
      CI: "1",
      NO_COLOR: "1",
      WRANGLER_SEND_METRICS: "false",
      PATH: "/usr/bin:/bin",
      HOME: "/tmp/home",
    });

    let attempts = 0;
    expect(() => executeLocalD1PrepareCommands({
      repoRoot,
      runRoot,
      commands,
      parentEnvironment: { PATH: "/usr/bin:/bin" },
      runner: () => {
        attempts += 1;
        return { status: attempts === 2 ? 1 : 0, signal: null };
      },
    })).toThrow(/application-migrations failed/);
    expect(attempts).toBe(2);
  });

  it("rejects any command-path, flag, ordering, or persistence-root drift before execution", () => {
    const { commands, runRoot } = commandFixture();
    const repoRoot = resolve("/tmp/estimate-sheet-prepare-contract/repo");
    const mutations = [
      commands.map((command) => ({ ...command, argv: [...command.argv] })).reverse(),
      commands.map((command, index) => ({
        ...command,
        argv: index === 0 ? [...command.argv, "--json"] : [...command.argv],
      })),
      commands.map((command, index) => ({
        ...command,
        argv: index === 1
          ? command.argv.map((value) => value === "--local" ? "--remote" : value)
          : [...command.argv],
      })),
      commands.map((command, index) => ({
        ...command,
        argv: index === 2
          ? command.argv.map((value) => value === join(runRoot, "wrangler-state")
            ? join(runRoot, "other-state")
            : value)
          : [...command.argv],
      })),
      commands.map((command, index) => ({
        ...command,
        argv: index === 0
          ? command.argv.map((value) => value === join(runRoot, "better-auth-schema.sql")
            ? resolve(runRoot, "..", "foreign-schema.sql")
            : value)
          : [...command.argv],
      })),
    ];

    for (const mutatedCommands of mutations) {
      let attempts = 0;
      expect(() => executeLocalD1PrepareCommands({
        repoRoot,
        runRoot,
        commands: mutatedCommands,
        runner: () => {
          attempts += 1;
          return { status: 0, signal: null };
        },
        parentEnvironment: { PATH: "/usr/bin:/bin" },
      })).toThrow(/exact schema, migrations, seed command sequence/);
      expect(attempts).toBe(0);
    }
  });

  it("routes prepare through the Wrangler executor with root-level hashed inputs and no direct D1 batch fallback", () => {
    expect(PREPARE_SOURCE).toContain("buildLocalD1PrepareCommands");
    expect(PREPARE_SOURCE).toContain("executeLocalD1PrepareCommands");
    expect(PREPARE_SOURCE).toContain('const schemaPath = resolve(input.runPath, "better-auth-schema.sql")');
    expect(PREPARE_SOURCE).toContain('const seedPath = resolve(input.runPath, "seed.sql")');
    expect(PREPARE_SOURCE).toContain("process.exitCode = await main()");
    expect(PREPARE_SOURCE).toMatch(/generatedSchemaSha256:\s*sha256File\(schemaPath\)/u);
    expect(PREPARE_SOURCE).toMatch(/seedSqlSha256:\s*sha256File\(seedPath\)/u);
    expect(PREPARE_SOURCE).not.toContain("getPlatformProxy");
    expect(PREPARE_SOURCE).not.toMatch(/\bdb\.batch\s*\(/u);
  });

  it("pins the current five Better Auth tables and the signed authenticated session cookie", () => {
    expect(PREPARE_SOURCE).toContain(
      'const EXPECTED_BETTER_AUTH_TABLES = ["account", "rateLimit", "session", "user", "verification"] as const;',
    );
    expect(PREPARE_SOURCE).toMatch(/INSERT INTO \\"session\\"[^\n]+token/u);
    expect(PREPARE_SOURCE).toContain("const signature = await makeSignature(routeRecord.sessionToken, secret)");
    expect(PREPARE_SOURCE).toContain('name: "better-auth.session_token"');
    expect(PREPARE_SOURCE).toContain('"resources", "d1", ".dev.vars"');
    expect(PREPARE_SOURCE).toContain(
      'SELECT COUNT(*) AS count FROM "session" WHERE id = ? AND token = ? AND userId = ?',
    );
  });

  it("requires explicit wrong-tenant and seeded revoked-identity authorization denial probes", () => {
    expect(PREPARE_SOURCE).toContain("auth-denial-wrong-tenant");
    expect(PREPARE_SOURCE).toMatch(/INSERT INTO \\"user\\"[^\n]+ids\.revokedUser/u);
    expect(PREPARE_SOURCE).toMatch(/INSERT INTO \\"session\\"[^\n]+ids\.revokedSession[^\n]+revokedSessionToken/u);
    expect(PREPARE_SOURCE).toMatch(/INSERT INTO profiles[^\n]+ids\.revokedProfile[^\n]+NULL/u);
    expect(PREPARE_SOURCE).toContain("prepared D1 revoked identity unexpectedly retains");
    expect(PREPARE_SOURCE).toContain("SELECT COUNT(*) AS count FROM workspace_members WHERE workspace_id = ? AND user_id = ?");
    expect(PREPARE_SOURCE).toContain("SELECT COUNT(*) AS count FROM project_members WHERE project_id = ? AND user_id = ?");
    expect(PREPARE_SOURCE).toContain("SELECT COUNT(*) AS count FROM estimate_sheet_members WHERE estimate_id = ? AND user_id = ?");
    expect(PREPARE_SOURCE).toMatch(/wrongTenant[^;]+(?:first|all)\s*</su);
    expect(PREPARE_SOURCE).toMatch(/revokedMembership[^;]+(?:first|all)\s*</su);
    expect(PREPARE_SOURCE).toMatch(/revokedMembership[\s\S]+ids\.revokedProfile/u);
    expect(PREPARE_SOURCE).toMatch(/if\s*\([^)]*(?:wrongTenant|revokedMembership)[^)]*\)\s*throw/u);
  });

  it("rejects migration content, statement-count, and ordering drift after Wrangler execution", () => {
    const inventory: MigrationInventoryRecord[] = [
      { name: "0001_alpha.sql", sha256: "a".repeat(64), statement_count: 1 },
      { name: "0002_beta.sql", sha256: "b".repeat(64), statement_count: 2 },
    ];
    expect(() => assertMigrationInventoryStable(inventory, structuredClone(inventory))).not.toThrow();
    for (const mutation of [
      inventory.map((entry) => ({ ...entry })).reverse(),
      inventory.map((entry, index) => index === 0 ? { ...entry, sha256: "c".repeat(64) } : { ...entry }),
      inventory.map((entry, index) => index === 1 ? { ...entry, statement_count: 3 } : { ...entry }),
    ]) {
      expect(() => assertMigrationInventoryStable(inventory, mutation)).toThrow(/migration inventory changed/);
    }
    expect(PREPARE_SOURCE).toContain("SELECT id, name FROM d1_migrations ORDER BY id ASC");
    expect(PREPARE_SOURCE).toContain("prepared D1 migration ledger does not exactly match the ordered active inventory");
  });
});
