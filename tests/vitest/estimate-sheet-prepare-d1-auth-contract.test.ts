import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildLocalD1PrepareCommands,
  executeLocalD1PrepareCommands,
  type LocalD1PrepareCommandRunner,
} from "../../scripts/lib/estimate-sheet-local-d1-prepare";

const PREPARE_SOURCE = readFileSync(
  resolve(process.cwd(), "scripts/prepare-estimate-sheet-performance-run.ts"),
  "utf8",
);

function commandFixture() {
  const runRoot = resolve("/tmp/estimate-sheet-prepare-contract/run");
  const persistRoot = join(runRoot, "wrangler-state");
  const schemaPath = join(runRoot, "better-auth-schema.sql");
  const seedPath = join(runRoot, "seed.sql");
  return {
    runRoot,
    persistRoot,
    schemaPath,
    seedPath,
    commands: buildLocalD1PrepareCommands({ runRoot, persistRoot, schemaPath, seedPath }),
  };
}

describe("estimate-sheet prepare D1 and auth contract", () => {
  it("builds the exact run-scoped Wrangler schema, migration, and hashed-seed command sequence", () => {
    const { runRoot, persistRoot, schemaPath, seedPath, commands } = commandFixture();

    expect(commands).toEqual([
      {
        role: "better-auth-schema",
        argv: [
          "bunx", "wrangler", "d1", "execute", "ARCH_DB", "--local",
          "--persist-to", persistRoot, "--file", schemaPath,
        ],
      },
      {
        role: "application-migrations",
        argv: [
          "bunx", "wrangler", "d1", "migrations", "apply", "ARCH_DB", "--local",
          "--persist-to", persistRoot,
        ],
      },
      {
        role: "fixture-seed",
        argv: [
          "bunx", "wrangler", "d1", "execute", "ARCH_DB", "--local",
          "--persist-to", persistRoot, "--file", seedPath,
        ],
      },
    ]);

    expect(() => buildLocalD1PrepareCommands({
      runRoot,
      persistRoot,
      schemaPath,
      seedPath: resolve(runRoot, "..", "foreign-seed.sql"),
    })).toThrow(/fixture seed path must be contained by the run root/);
  });

  it("executes only the ordered command plan with a sanitized child environment and stops on failure", () => {
    const { commands } = commandFixture();
    const calls: Array<{ executable: string; args: string[]; cwd: string; env: NodeJS.ProcessEnv }> = [];
    const runner: LocalD1PrepareCommandRunner = (executable, args, options) => {
      calls.push({ executable, args, cwd: options.cwd, env: options.env });
      return { status: 0, signal: null };
    };
    const repoRoot = resolve("/tmp/estimate-sheet-prepare-contract/repo");

    executeLocalD1PrepareCommands({
      repoRoot,
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
      commands,
      parentEnvironment: { PATH: "/usr/bin:/bin" },
      runner: () => {
        attempts += 1;
        return { status: attempts === 2 ? 1 : 0, signal: null };
      },
    })).toThrow(/application-migrations failed/);
    expect(attempts).toBe(2);
  });

  it("routes prepare through the Wrangler executor with root-level hashed inputs and no direct D1 batch fallback", () => {
    expect(PREPARE_SOURCE).toContain("buildLocalD1PrepareCommands");
    expect(PREPARE_SOURCE).toContain("executeLocalD1PrepareCommands");
    expect(PREPARE_SOURCE).toContain('const schemaPath = resolve(input.runPath, "better-auth-schema.sql")');
    expect(PREPARE_SOURCE).toContain('const seedPath = resolve(input.runPath, "seed.sql")');
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
    expect(PREPARE_SOURCE).toContain(
      'SELECT COUNT(*) AS count FROM "session" WHERE id = ? AND token = ? AND userId = ?',
    );
  });

  it("requires explicit wrong-tenant and revoked-membership authorization denial probes", () => {
    expect(PREPARE_SOURCE).toContain("auth-denial-wrong-tenant");
    expect(PREPARE_SOURCE).toContain("auth-denial-revoked-membership");
    expect(PREPARE_SOURCE).toMatch(/wrongTenant[^;]+(?:first|all)\s*</su);
    expect(PREPARE_SOURCE).toMatch(/revokedMembership[^;]+(?:first|all)\s*</su);
    expect(PREPARE_SOURCE).toMatch(/if\s*\([^)]*(?:wrongTenant|revokedMembership)[^)]*\)\s*throw/u);
  });
});
