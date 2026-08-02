import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { validateD1RecoveryReceipt } from "../../scripts/check-cloudflare-d1-recovery-readiness";
import {
  buildCloudflareD1HostedRecoveryRehearsal,
  executeCloudflareD1HostedRecoveryRehearsal,
  type HostedRecoveryRehearsalInputs,
} from "../../scripts/run-cloudflare-d1-hosted-recovery-rehearsal";

const validInputs: HostedRecoveryRehearsalInputs = {
  mode: "dry-run",
  identity: {
    accountId: "account-identifier",
    sourceDatabaseId: "source-database-identifier",
    targetDatabaseName: "archestimator-recovery-20260712-a1b2c3d4",
    runId: "recovery-20260712-a1b2c3d4",
  },
  capacity: {
    plan: "free",
    currentDatabaseCount: 2,
    databaseCountLimit: 10,
    currentAccountStorageBytes: 1024,
    sourceBytes: 1024,
    exportBytes: 2048,
    importBytes: 2048,
    expectedTargetBytes: 1024,
    encryptedFilesystem: true,
    tempDirectoryMode: "0700",
    exportFileMode: "0600",
  },
  confirmationToken: "exact-confirmation",
  expectedConfirmationToken: "exact-confirmation",
};

describe("Cloudflare D1 hosted recovery rehearsal preflight", () => {
  it("is dry-run and fail-closed by default without provider actions", () => {
    const report = buildCloudflareD1HostedRecoveryRehearsal();

    expect(report.mode).toBe("dry-run");
    expect(report.dryRun).toBe(true);
    expect(report.providerActionAttempted).toBe(false);
    expect(report.providerBacked).toBe(false);
    expect(report.readyForAuthorizedExecution).toBe(false);
    expect(report.blockers).toContain("identity");
    expect(report.blockers).toContain("capacity");
    expect(report.blockers).toContain("confirmation");
  });

  it("produces a redacted command plan only after all local preflight checks pass", () => {
    const report = buildCloudflareD1HostedRecoveryRehearsal(validInputs);
    const output = JSON.stringify(report);

    expect(report.readyForAuthorizedExecution).toBe(true);
    expect(report.blockers).toEqual([]);
    expect(report.providerActionAttempted).toBe(false);
    expect(report.commandPlan).toContain("wrangler d1 create <disposable-target>");
    expect(output).not.toContain(validInputs.identity!.accountId);
    expect(output).not.toContain(validInputs.identity!.sourceDatabaseId);
    expect(output).not.toContain(validInputs.confirmationToken!);
  });

  it.each([
    ["paid plan", { capacity: { ...validInputs.capacity!, plan: "paid" } }, "free-plan"],
    ["database exhaustion", { capacity: { ...validInputs.capacity!, currentDatabaseCount: 10 } }, "database-count"],
    ["oversized target", { capacity: { ...validInputs.capacity!, expectedTargetBytes: 501 * 1024 * 1024 } }, "target-size"],
    ["unencrypted storage", { capacity: { ...validInputs.capacity!, encryptedFilesystem: false } }, "encrypted-filesystem"],
    ["unsafe target", { identity: { ...validInputs.identity!, targetDatabaseName: "ARCH_DB" } }, "disposable-target"],
  ])("rejects %s before any provider action", (_label, override, blocker) => {
    const report = buildCloudflareD1HostedRecoveryRehearsal({ ...validInputs, ...override });

    expect(report.readyForAuthorizedExecution).toBe(false);
    expect(report.providerActionAttempted).toBe(false);
    expect(report.blockers).toContain(blocker);
  });

  it("never turns a hosted mode request into a provider action", () => {
    const report = buildCloudflareD1HostedRecoveryRehearsal({ ...validInputs, mode: "hosted" });

    expect(report.dryRun).toBe(true);
    expect(report.providerActionAttempted).toBe(false);
    expect(report.readyForAuthorizedExecution).toBe(false);
    expect(report.blockers).toContain("dry-run-only");
  });
});

describe("Cloudflare D1 hosted recovery executor", () => {
  it("requires the explicit environment gate before provider commands", () => {
    const original = process.env.ARCHESTIMATOR_HOSTED_RECOVERY_EXECUTE;
    delete process.env.ARCHESTIMATOR_HOSTED_RECOVERY_EXECUTE;
    const commands: string[] = [];
    const report = executeCloudflareD1HostedRecoveryRehearsal({
      ...validInputs,
      mode: "hosted",
      identity: { ...validInputs.identity!, sourceDatabaseId: "bound-source" },
    }, {
      boundSourceDatabaseId: "bound-source",
      run: ({ args }) => {
        commands.push(args.join(" "));
        return { status: 0, stdout: "[]", stderr: "" };
      },
    });
    process.env.ARCHESTIMATOR_HOSTED_RECOVERY_EXECUTE = original;

    expect(report.succeeded).toBe(false);
    expect(report.providerActionAttempted).toBe(false);
    expect(report.blockers).toContain("execution-env-gate");
    expect(commands).toEqual([]);
  });

  it("uses only the bound source and verifies disposable-target cleanup", () => {
    const original = process.env.ARCHESTIMATOR_HOSTED_RECOVERY_EXECUTE;
    process.env.ARCHESTIMATOR_HOSTED_RECOVERY_EXECUTE = "1";
    const commands: string[][] = [];
    let deleted = false;
    const report = executeCloudflareD1HostedRecoveryRehearsal({
      ...validInputs,
      mode: "hosted",
      identity: { ...validInputs.identity!, sourceDatabaseId: "bound-source" },
    }, {
      boundSourceDatabaseId: "bound-source",
      run: ({ args }) => {
        commands.push(args);
        if (args[0] === "d1" && args[1] === "delete") deleted = true;
        if (args[1] === "export") {
          const output = args[args.indexOf("--output") + 1]!;
          writeFileSync(output, 'INSERT INTO "feature_flags" ("id") VALUES ("fixture-feature-flag");');
        }
        return { status: 0, stdout: args[0] === "deploy"
          ? "https://archestimator-recovery-test.workers.dev"
          : args[1] === "list"
          ? (deleted ? "[]" : JSON.stringify([{ name: validInputs.identity!.targetDatabaseName, uuid: "disposable-id" }]))
          : "{}", stderr: "" };
      },
      probe: () => true,
      integrityProof: () => ({ schema: true, application: true, authorization: true, session: true, corporateIntegrity: true, corporateOnlyDenied: true }),
    });
    process.env.ARCHESTIMATOR_HOSTED_RECOVERY_EXECUTE = original;

    expect(report.succeeded).toBe(true);
    expect(report.providerBacked).toBe(true);
    expect(report.cleanupVerified).toBe(true);
    expect(report.exportDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(validateD1RecoveryReceipt(report.recoveryReceipt).valid).toBe(true);
    expect(report.recoveryReceipt?.restoreRehearsalReady).toBe(true);
    expect(commands.slice(0, 3).map((args) => args.slice(0, 2).join(" "))).toEqual([
      "d1 create", "d1 list", "d1 execute",
    ]);
    expect(commands[0]).toContain("--cwd");
    const exports = commands.filter((args) => args.slice(0, 2).join(" ") === "d1 export");
    expect(exports).toHaveLength(1);
    expect(exports[0]).toContain("--no-schema");
    expect(exports[0]).not.toContain("--table");
    expect(commands.filter((args) => args.slice(0, 2).join(" ") === "d1 execute").length).toBeGreaterThan(0);
    expect(commands.slice(-3).map((args) => args.slice(0, 2).join(" "))).toEqual([
      "delete --name", "d1 delete", "d1 list",
    ]);
    expect(commands.some((args) => args.slice(0, 3).join(" ") === "secret put RECOVERY_EXPECTED_RUN_ID")).toBe(true);
    expect(commands.some((args) => args.slice(0, 2).join(" ") === "deploy --config")).toBe(true);
    expect(JSON.stringify(report)).not.toContain("bound-source");
  });

  it("removes credential-bearing statements while restoring approved application data", () => {
    const original = process.env.ARCHESTIMATOR_HOSTED_RECOVERY_EXECUTE;
    process.env.ARCHESTIMATOR_HOSTED_RECOVERY_EXECUTE = "1";
    const commands: string[][] = [];
    const importedArtifacts: string[] = [];
    let deleted = false;
    const report = executeCloudflareD1HostedRecoveryRehearsal({
      ...validInputs,
      mode: "hosted",
      identity: { ...validInputs.identity!, sourceDatabaseId: "bound-source" },
    }, {
      boundSourceDatabaseId: "bound-source",
      run: ({ args }) => {
        commands.push(args);
        if (args[0] === "d1" && args[1] === "delete") deleted = true;
        if (args[1] === "export") {
          const output = args[args.indexOf("--output") + 1]!;
          writeFileSync(output, [
            'INSERT INTO "feature_flags" ("id") VALUES ("fixture-feature-flag");',
            'INSERT INTO "account" ("id", "accessToken") VALUES ("credential-id", "credential-value");',
          ].join("\n"));
        }
        if (args[1] === "execute") {
          const input = args[args.indexOf("--file") + 1]!;
          if (input.includes("approved-data.sql")) importedArtifacts.push(readFileSync(input, "utf8"));
        }
        return { status: 0, stdout: args[0] === "deploy"
          ? "https://archestimator-recovery-test.workers.dev"
          : args[1] === "list"
          ? (deleted ? "[]" : JSON.stringify([{ name: validInputs.identity!.targetDatabaseName, uuid: "disposable-id" }]))
          : "{}", stderr: "" };
      },
      probe: () => true,
      integrityProof: () => ({ schema: true, application: true, authorization: true, session: true, corporateIntegrity: true, corporateOnlyDenied: true }),
    });
    process.env.ARCHESTIMATOR_HOSTED_RECOVERY_EXECUTE = original;

    expect(report.succeeded).toBe(true);
    expect(importedArtifacts.length).toBeGreaterThan(0);
    expect(importedArtifacts.every((artifact) => !artifact.includes("accessToken"))).toBe(true);
    expect(importedArtifacts.every((artifact) => !artifact.includes('INSERT INTO "account"'))).toBe(true);
    expect(commands.slice(-3).map((args) => args.slice(0, 2).join(" "))).toEqual(["delete --name", "d1 delete", "d1 list"]);
  });

  it("cleans up the disposable provider resources after a recovery command fails", () => {
    const original = process.env.ARCHESTIMATOR_HOSTED_RECOVERY_EXECUTE;
    process.env.ARCHESTIMATOR_HOSTED_RECOVERY_EXECUTE = "1";
    const commands: string[][] = [];
    let deleted = false;
    const report = executeCloudflareD1HostedRecoveryRehearsal({
      ...validInputs,
      mode: "hosted",
      identity: { ...validInputs.identity!, sourceDatabaseId: "bound-source" },
    }, {
      boundSourceDatabaseId: "bound-source",
      run: ({ args }) => {
        commands.push(args);
        if (args[0] === "d1" && args[1] === "delete") deleted = true;
        if (args[0] === "d1" && args[1] === "execute") return { status: 1, stdout: "", stderr: "simulated import failure" };
        return {
          status: 0,
          stdout: args[1] === "list"
            ? (deleted ? "[]" : JSON.stringify([{ name: validInputs.identity!.targetDatabaseName, uuid: "disposable-id" }]))
            : "{}",
          stderr: "",
        };
      },
    });
    process.env.ARCHESTIMATOR_HOSTED_RECOVERY_EXECUTE = original;

    expect(report.succeeded).toBe(false);
    expect(report.cleanupVerified).toBe(true);
    expect(report.blockers[0]).toMatch(/^provider-command-failed-d1-execute-/);
    expect(commands.slice(-2).map((args) => args.slice(0, 2).join(" "))).toEqual(["d1 delete", "d1 list"]);
  });

  it("fails closed when disposable-target cleanup itself fails", () => {
    const original = process.env.ARCHESTIMATOR_HOSTED_RECOVERY_EXECUTE;
    process.env.ARCHESTIMATOR_HOSTED_RECOVERY_EXECUTE = "1";
    try {
      const report = executeCloudflareD1HostedRecoveryRehearsal({
        ...validInputs,
        mode: "hosted",
        identity: { ...validInputs.identity!, sourceDatabaseId: "bound-source" },
      }, {
        boundSourceDatabaseId: "bound-source",
        run: ({ args }) => {
          if (args[1] === "export") {
            const output = args[args.indexOf("--output") + 1]!;
            writeFileSync(output, 'INSERT INTO "feature_flags" ("id") VALUES ("fixture-feature-flag");');
          }
          if (args[0] === "d1" && args[1] === "delete") {
            return { status: 1, stdout: "", stderr: "simulated cleanup failure" };
          }
          return {
            status: 0,
            stdout: args[0] === "deploy"
              ? "https://archestimator-recovery-test.workers.dev"
              : args[1] === "list"
                ? JSON.stringify([{ name: validInputs.identity!.targetDatabaseName, uuid: "disposable-id" }])
                : "{}",
            stderr: "",
          };
        },
        probe: () => true,
        integrityProof: () => ({
          schema: true,
          application: true,
          authorization: true,
          session: true,
          corporateIntegrity: true,
          corporateOnlyDenied: true,
        }),
      });

      expect(report.succeeded).toBe(false);
      expect(report.cleanupVerified).toBe(false);
      expect(report.blockers).toContain("cleanup-command-failed");
    } finally {
      process.env.ARCHESTIMATOR_HOSTED_RECOVERY_EXECUTE = original;
    }
  });
});
