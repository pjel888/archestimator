#!/usr/bin/env bun

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const FREE_DATABASE_LIMIT_BYTES = 500 * 1024 * 1024;
const FREE_ACCOUNT_STORAGE_LIMIT_BYTES = 5 * 1024 * 1024 * 1024;
const FREE_IMPORT_LIMIT_BYTES = 5 * 1024 * 1024 * 1024;
const DISPOSABLE_TARGET_PREFIX = "archestimator-recovery-";

type RehearsalMode = "dry-run" | "hosted";

export type HostedRecoveryIdentity = {
  accountId: string;
  sourceDatabaseId: string;
  targetDatabaseName: string;
  runId: string;
};

export type HostedRecoveryCapacity = {
  plan: "free" | "paid" | "unknown";
  currentDatabaseCount: number;
  databaseCountLimit: number;
  currentAccountStorageBytes: number;
  sourceBytes: number;
  exportBytes: number;
  importBytes: number;
  expectedTargetBytes: number;
  encryptedFilesystem: boolean;
  tempDirectoryMode: "0700" | string;
  exportFileMode: "0600" | string;
};

export type HostedRecoveryRehearsalInputs = {
  mode?: RehearsalMode;
  identity?: HostedRecoveryIdentity;
  capacity?: HostedRecoveryCapacity;
  confirmationToken?: string;
  expectedConfirmationToken?: string;
};

export type HostedRecoveryPreflightCheck = {
  key: string;
  ready: boolean;
  detail: string;
};

export type HostedRecoveryRehearsalReport = {
  mode: RehearsalMode;
  providerActionAttempted: false;
  providerBacked: false;
  dryRun: true;
  readyForAuthorizedExecution: boolean;
  identityDigest?: string;
  checks: HostedRecoveryPreflightCheck[];
  blockers: string[];
  commandPlan: string[];
  note: string;
};

export type HostedRecoveryCommand = { command: string; args: string[] };
export type HostedRecoveryCommandResult = { status: number; stdout: string; stderr: string };
export type HostedRecoveryRuntime = {
  run?: (command: HostedRecoveryCommand) => HostedRecoveryCommandResult;
  tempRoot?: string;
  boundSourceDatabaseId?: string;
};
export type HostedRecoveryExecutionReport = {
  mode: "hosted";
  providerActionAttempted: boolean;
  providerBacked: boolean;
  dryRun: false;
  succeeded: boolean;
  cleanupVerified: boolean;
  identityDigest: string;
  commandDigests: string[];
  blockers: string[];
  note: string;
};

function digestIdentity(identity: HostedRecoveryIdentity) {
  return createHash("sha256")
    .update(`${identity.accountId}\n${identity.sourceDatabaseId}\n${identity.targetDatabaseName}\n${identity.runId}`)
    .digest("hex");
}

function isPositiveInteger(value: number) {
  return Number.isSafeInteger(value) && value > 0;
}

function isNonNegativeInteger(value: number) {
  return Number.isSafeInteger(value) && value >= 0;
}

function check(key: string, ready: boolean, detail: string): HostedRecoveryPreflightCheck {
  return { key, ready, detail };
}

function buildIdentityChecks(identity: HostedRecoveryIdentity | undefined) {
  if (!identity) {
    return [check("identity", false, "Explicit account, source, disposable target, and run identity are required.")];
  }

  const valuesPresent = [identity.accountId, identity.sourceDatabaseId, identity.targetDatabaseName, identity.runId]
    .every((value) => value.trim().length > 0);
  const targetIsDisposable = identity.targetDatabaseName.startsWith(DISPOSABLE_TARGET_PREFIX);
  const sourceDiffersFromTarget = identity.sourceDatabaseId !== identity.targetDatabaseName;
  const runIdIsSafe = /^[a-z0-9][a-z0-9-]{7,95}$/.test(identity.runId);

  return [
    check("identity", valuesPresent, "All source, target, account, and run identities must be explicit."),
    check("disposable-target", targetIsDisposable, `Target name must start with ${DISPOSABLE_TARGET_PREFIX}.`),
    check("distinct-source-target", sourceDiffersFromTarget, "Source and target identities must differ."),
    check("run-id", runIdIsSafe, "Run ID must be a lowercase, hyphenated identifier."),
  ];
}

function buildCapacityChecks(capacity: HostedRecoveryCapacity | undefined) {
  if (!capacity) {
    return [check("capacity", false, "Explicit Free-tier capacity and filesystem preflight are required.")];
  }

  const numericInputs = [
    capacity.currentDatabaseCount,
    capacity.databaseCountLimit,
    capacity.currentAccountStorageBytes,
    capacity.sourceBytes,
    capacity.exportBytes,
    capacity.importBytes,
    capacity.expectedTargetBytes,
  ];
  const numericValuesValid = numericInputs.every(isNonNegativeInteger)
    && isPositiveInteger(capacity.databaseCountLimit);
  const targetFitsDatabase = capacity.expectedTargetBytes <= FREE_DATABASE_LIMIT_BYTES
    && capacity.sourceBytes <= FREE_DATABASE_LIMIT_BYTES;
  const accountFits = capacity.currentAccountStorageBytes + capacity.expectedTargetBytes <= FREE_ACCOUNT_STORAGE_LIMIT_BYTES;
  const importFits = capacity.importBytes <= FREE_IMPORT_LIMIT_BYTES && capacity.exportBytes <= FREE_IMPORT_LIMIT_BYTES;
  const databaseSlotAvailable = capacity.currentDatabaseCount + 1 <= capacity.databaseCountLimit;

  return [
    check("free-plan", capacity.plan === "free", "Only the Free plan is permitted for this rehearsal."),
    check("numeric-capacity", numericValuesValid, "Capacity values must be non-negative safe integers."),
    check("database-count", databaseSlotAvailable, "One disposable D1 database must fit within the account limit."),
    check("target-size", targetFitsDatabase, "Source and expected target must each fit within the 500 MB Free D1 limit."),
    check("account-storage", accountFits, "Account storage after target creation must fit within the 5 GB Free limit."),
    check("import-size", importFits, "Export and import must each fit within the 5 GB Free import limit."),
    check("encrypted-filesystem", capacity.encryptedFilesystem, "Temporary recovery storage must be encrypted."),
    check("temp-directory-mode", capacity.tempDirectoryMode === "0700", "Temporary directory mode must be 0700."),
    check("export-file-mode", capacity.exportFileMode === "0600", "Export file mode must be 0600."),
  ];
}

function buildConfirmationCheck(inputs: HostedRecoveryRehearsalInputs) {
  const matches = Boolean(inputs.expectedConfirmationToken)
    && inputs.confirmationToken === inputs.expectedConfirmationToken;
  return check("confirmation", matches, "An exact, out-of-band confirmation token is required before execution.");
}

function commandPlan() {
  return [
    "wrangler d1 create <disposable-target>",
    "wrangler d1 export <authorized-source> --remote --output=<restricted-export>",
    "wrangler d1 execute <disposable-target> --remote --file=<restricted-export>",
    "wrangler delete <disposable-worker>",
    "wrangler d1 delete <disposable-target>",
  ];
}

/**
 * Builds a fail-closed hosted recovery preflight and command plan.
 *
 * This function intentionally does not read environment variables, create files,
 * spawn processes, contact Cloudflare, or retain credentials. A future authorized
 * execution unit must consume a green report and perform provider actions separately.
 */
export function buildCloudflareD1HostedRecoveryRehearsal(
  inputs: HostedRecoveryRehearsalInputs = {},
): HostedRecoveryRehearsalReport {
  const mode = inputs.mode ?? "dry-run";
  const checks = [
    ...buildIdentityChecks(inputs.identity),
    ...buildCapacityChecks(inputs.capacity),
    buildConfirmationCheck(inputs),
    check("dry-run-only", mode === "dry-run", "This implementation only produces a dry-run plan; hosted execution requires a separately authorized executor."),
  ];
  const blockers = checks.filter((item) => !item.ready).map((item) => item.key);

  return {
    mode,
    providerActionAttempted: false,
    providerBacked: false,
    dryRun: true,
    readyForAuthorizedExecution: blockers.length === 0,
    identityDigest: inputs.identity ? digestIdentity(inputs.identity) : undefined,
    checks,
    blockers,
    commandPlan: commandPlan(),
    note: "Fail-closed preflight only. This report contains identity digests and command placeholders, never credentials, raw identities, export paths, or provider output.",
  };
}

/** Executes the explicitly authorized hosted path. It never runs from dry-run mode. */
export function executeCloudflareD1HostedRecoveryRehearsal(
  inputs: HostedRecoveryRehearsalInputs,
  runtime: HostedRecoveryRuntime = {},
): HostedRecoveryExecutionReport {
  const preflight = buildCloudflareD1HostedRecoveryRehearsal({ ...inputs, mode: "dry-run" });
  const identity = inputs.identity;
  const boundSourceDatabaseId = runtime.boundSourceDatabaseId ?? readBoundSourceDatabaseId();
  const blockers = [...preflight.blockers.filter((blocker) => blocker !== "dry-run-only")];
  if (inputs.mode !== "hosted") blockers.push("hosted-mode");
  if (process.env.ARCHESTIMATOR_HOSTED_RECOVERY_EXECUTE !== "1") blockers.push("execution-env-gate");
  if (!identity || identity.sourceDatabaseId !== boundSourceDatabaseId) blockers.push("bound-source");
  if (blockers.length > 0 || !identity) {
    return {
      mode: "hosted", providerActionAttempted: false, providerBacked: false, dryRun: false,
      succeeded: false, cleanupVerified: false, identityDigest: identity ? digestIdentity(identity) : "",
      commandDigests: [], blockers: [...new Set(blockers)],
      note: "Fail-closed: hosted recovery requires green preflight, the exact bound source, and ARCHESTIMATOR_HOSTED_RECOVERY_EXECUTE=1.",
    };
  }

  const run = runtime.run ?? runWrangler;
  const tempDirectory = mkdtempSync(join(runtime.tempRoot ?? tmpdir(), "archestimator-recovery-"));
  chmodSync(tempDirectory, 0o700);
  const plaintextPath = join(tempDirectory, "export.sql");
  const ciphertextPath = join(tempDirectory, "export.sql.enc");
  const commandDigests: string[] = [];
  let exportKey: Buffer | null = null;
  let targetCreated = false;
  let cleanupVerified = false;
  let failure: string | null = null;
  const command = (args: string[]) => {
    commandDigests.push(createHash("sha256").update(`wrangler\n${args.join("\n")}`).digest("hex"));
    const result = run({ command: "wrangler", args });
    if (result.status !== 0) throw new Error("provider-command-failed");
    return result.stdout;
  };

  try {
    command(["d1", "create", identity.targetDatabaseName]);
    targetCreated = true;
    command(["d1", "export", identity.sourceDatabaseId, "--remote", "--output", plaintextPath]);
    chmodSync(plaintextPath, 0o600);
    const exportBytes = readFileSync(plaintextPath);
    if (exportBytes.length > FREE_IMPORT_LIMIT_BYTES) throw new Error("export-size-limit");
    exportKey = encryptExport(exportBytes, ciphertextPath);
    unlinkSync(plaintextPath);
    const restoredBytes = decryptExport(ciphertextPath, exportKey);
    writeFileSync(plaintextPath, restoredBytes, { mode: 0o600 });
    chmodSync(plaintextPath, 0o600);
    command(["d1", "execute", identity.targetDatabaseName, "--remote", "--file", plaintextPath]);
    unlinkSync(plaintextPath);
  } catch (error) {
    failure = error instanceof Error ? error.message : "unknown-provider-failure";
  } finally {
    try {
      if (existsSync(plaintextPath)) unlinkSync(plaintextPath);
      if (existsSync(ciphertextPath)) unlinkSync(ciphertextPath);
      if (targetCreated) {
        command(["d1", "delete", identity.targetDatabaseName, "-y"]);
        const listOutput = command(["d1", "list", "--json"]);
        cleanupVerified = !listOutput.includes(identity.targetDatabaseName);
        if (!cleanupVerified) failure ??= "cleanup-readback-failed";
      }
    } catch {
      cleanupVerified = false;
      failure ??= "cleanup-command-failed";
    } finally {
      exportKey?.fill(0);
      rmSync(tempDirectory, { recursive: true, force: true });
    }
  }
  return {
    mode: "hosted", providerActionAttempted: true, providerBacked: !failure && cleanupVerified,
    dryRun: false, succeeded: !failure && cleanupVerified, cleanupVerified,
    identityDigest: digestIdentity(identity), commandDigests, blockers: failure ? [failure] : [],
    note: "Provider command output, raw identities, export paths, and encryption keys are deliberately omitted.",
  };
}

function runWrangler(command: HostedRecoveryCommand): HostedRecoveryCommandResult {
  const result = spawnSync(command.command, command.args, { encoding: "utf8", maxBuffer: 1024 * 1024 });
  return { status: result.status ?? 1, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

function readBoundSourceDatabaseId() {
  const config = JSON.parse(readFileSync("wrangler.jsonc", "utf8")) as { d1_databases?: Array<{ binding?: string; database_id?: string }> };
  const source = config.d1_databases?.find((database) => database.binding === "ARCH_DB")?.database_id;
  if (!source) throw new Error("ARCH_DB binding is missing from wrangler.jsonc");
  return source;
}

function encryptExport(plaintext: Buffer, ciphertextPath: string) {
  const key = randomBytes(32);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  writeFileSync(ciphertextPath, Buffer.concat([iv, cipher.getAuthTag(), ciphertext]), { mode: 0o600 });
  return key;
}

function decryptExport(ciphertextPath: string, key: Buffer) {
  const payload = readFileSync(ciphertextPath);
  if (payload.length < 28) throw new Error("encrypted-export-invalid");
  const decipher = createDecipheriv("aes-256-gcm", key, payload.subarray(0, 12));
  decipher.setAuthTag(payload.subarray(12, 28));
  return Buffer.concat([decipher.update(payload.subarray(28)), decipher.final()]);
}

if (import.meta.main) {
  const inputs = readCliInputs();
  const report = inputs.mode === "hosted"
    ? executeCloudflareD1HostedRecoveryRehearsal(inputs)
    : buildCloudflareD1HostedRecoveryRehearsal(inputs);
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = "succeeded" in report ? (report.succeeded ? 0 : 1) : (report.readyForAuthorizedExecution ? 0 : 1);
}

function readCliInputs(): HostedRecoveryRehearsalInputs {
  const raw = process.env.ARCHESTIMATOR_HOSTED_RECOVERY_INPUTS_JSON;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as HostedRecoveryRehearsalInputs;
    if (!parsed || typeof parsed !== "object") return {};
    const requested = { ...parsed };
    delete requested.expectedConfirmationToken;
    return {
      ...requested,
      expectedConfirmationToken: process.env.ARCHESTIMATOR_HOSTED_RECOVERY_CONFIRMATION_TOKEN,
    };
  } catch {
    throw new Error("ARCHESTIMATOR_HOSTED_RECOVERY_INPUTS_JSON must be valid JSON.");
  }
}
