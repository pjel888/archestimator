#!/usr/bin/env bun

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const FREE_DATABASE_LIMIT_BYTES = 500 * 1024 * 1024;
const FREE_ACCOUNT_STORAGE_LIMIT_BYTES = 5 * 1024 * 1024 * 1024;
const FREE_IMPORT_LIMIT_BYTES = 5 * 1024 * 1024 * 1024;
const DISPOSABLE_TARGET_PREFIX = "archestimator-recovery-";
const MIGRATIONS_DIRECTORY = "migrations";
const EXCLUDED_TABLES = new Set([
  "account",
  "session",
  "verification",
  "rateLimit",
  "collaboration_invitation_tokens",
  "client_portal_recipient_credentials",
]);

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
    .every((value) => typeof value === "string" && value.trim().length > 0);
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
    "wrangler d1 migrations apply <disposable-target> --remote",
    "wrangler d1 export <authorized-source> --remote --table=<approved-table> --no-schema --output=<restricted-export>",
    "wrangler d1 execute <disposable-target> --remote --file=<sanitized-data-artifact>",
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
  const plaintextPath = join(tempDirectory, "table-export.sql");
  const ciphertextPath = join(tempDirectory, "table-export.sql.enc");
  const dataArtifactPath = join(tempDirectory, "approved-application-data.sql");
  const commandDigests: string[] = [];
  let exportKey: Buffer | null = null;
  let targetCreated = false;
  let cleanupVerified = false;
  let failure: string | null = null;
  let currentOperation = "preflight";
  const command = (args: string[]) => {
    currentOperation = args.slice(0, 3).join("-");
    commandDigests.push(createHash("sha256").update(`wrangler\n${args.join("\n")}`).digest("hex"));
    const result = run({ command: "wrangler", args });
    if (result.status !== 0) throw new Error(`provider-command-failed-${currentOperation}`);
    return result.stdout;
  };

  try {
    command(["d1", "create", identity.targetDatabaseName]);
    targetCreated = true;
    command(["d1", "migrations", "apply", identity.targetDatabaseName, "--remote"]);
    const tableExports: Array<{ table: string; source: string }> = [];
    for (const table of activeApplicationTables()) {
      command([
        "d1", "export", identity.sourceDatabaseId, "--remote", "--table", table,
        "--no-schema", "--output", plaintextPath,
      ]);
      chmodSync(plaintextPath, 0o600);
      const exportBytes = readFileSync(plaintextPath);
      if (exportBytes.length > FREE_IMPORT_LIMIT_BYTES) throw new Error("export-size-limit");
      exportKey = encryptExport(exportBytes, ciphertextPath);
      unlinkSync(plaintextPath);
      const restoredBytes = decryptExport(ciphertextPath, exportKey);
      tableExports.push({ table, source: restoredBytes.toString("utf8") });
      restoredBytes.fill(0);
      unlinkSync(ciphertextPath);
      exportKey.fill(0);
      exportKey = null;
    }
    writeFileSync(dataArtifactPath, buildApprovedDataArtifact(tableExports), { mode: 0o600 });
    chmodSync(dataArtifactPath, 0o600);
    command(["d1", "execute", identity.targetDatabaseName, "--remote", "--file", dataArtifactPath, "--yes"]);
    unlinkSync(dataArtifactPath);
  } catch (error) {
    failure = error instanceof Error ? error.message : `unknown-provider-failure-${currentOperation}`;
  } finally {
    try {
      if (existsSync(plaintextPath)) unlinkSync(plaintextPath);
      if (existsSync(ciphertextPath)) unlinkSync(ciphertextPath);
      if (existsSync(dataArtifactPath)) unlinkSync(dataArtifactPath);
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
  const result = spawnSync("bunx", [command.command, ...command.args], { encoding: "utf8", maxBuffer: 1024 * 1024 });
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

function activeMigrationPaths() {
  const directory = resolve(MIGRATIONS_DIRECTORY);
  return readdirSync(directory)
    .filter((entry) => /^\d+_.+\.sql$/.test(entry))
    .sort((left, right) => left.localeCompare(right, "en", { numeric: true }))
    .map((entry) => join(directory, entry));
}

function activeApplicationTables() {
  const tables = new Set<string>();
  for (const migrationPath of activeMigrationPaths()) {
    const source = readFileSync(migrationPath, "utf8");
    for (const match of source.matchAll(/CREATE TABLE(?: IF NOT EXISTS)?\s+"?([A-Za-z_][A-Za-z0-9_]*)"?/gi)) {
      tables.add(match[1]!);
    }
    for (const match of source.matchAll(/DROP TABLE(?: IF EXISTS)?\s+"?([A-Za-z_][A-Za-z0-9_]*)"?/gi)) {
      tables.delete(match[1]!);
    }
    for (const match of source.matchAll(/ALTER TABLE\s+"?([A-Za-z_][A-Za-z0-9_]*)"?\s+RENAME TO\s+"?([A-Za-z_][A-Za-z0-9_]*)"?/gi)) {
      tables.delete(match[1]!);
      tables.add(match[2]!);
    }
  }
  return [...tables].filter((table) => !EXCLUDED_TABLES.has(table)).sort();
}

function buildApprovedDataArtifact(tableExports: Array<{ table: string; source: string }>) {
  const approved = tableExports.flatMap(({ table, source }) => splitSqlStatements(source)
    .filter((statement) => insertedTable(statement) === table));
  return Buffer.from([
    "PRAGMA foreign_keys = ON;",
    "BEGIN;",
    "PRAGMA defer_foreign_keys = ON;",
    ...approved,
    "COMMIT;",
  ].join("\n"), "utf8");
}

function insertedTable(statement: string) {
  const match = statement.match(/^\s*INSERT\s+INTO\s+(?:"([A-Za-z_][A-Za-z0-9_]*)"|([A-Za-z_][A-Za-z0-9_]*))/i);
  return match?.[1] ?? match?.[2] ?? null;
}

function splitSqlStatements(source: string) {
  const statements: string[] = [];
  let start = 0;
  let quote: "'" | '"' | null = null;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]!;
    if (quote) {
      if (character === quote) {
        if (source[index + 1] === quote) index += 1;
        else quote = null;
      }
      continue;
    }
    if (character === "'" || character === '"') quote = character;
    else if (character === ";") {
      statements.push(source.slice(start, index + 1));
      start = index + 1;
    }
  }
  return statements;
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
