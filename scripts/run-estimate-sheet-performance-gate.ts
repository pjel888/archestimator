#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  COMMAND_RECEIPT_SCHEMA,
  assertSymlinkFreeContainedPath,
  cliBoolean,
  cliString,
  ensureDirectoryDurably,
  fingerprintContentEqual,
  isPlainObject,
  normalizeArgv,
  parseStrictCli,
  readAuthoritativeRunManifest,
  requireUnit,
  resolveManifestLogicalOutput,
  resolveRunManifestPath,
  sha256Hex,
  sha256NextBuild,
  sha256OpenNextBuild,
  writeRunJsonNoOverwrite,
  type RunManifestV1,
  type EstimateUnit,
  type SourceFingerprint,
} from "./lib/estimate-sheet-performance-contract";
import { computeEstimateSheetSourceFingerprint } from "./compute-estimate-sheet-source-fingerprint";

const ALLOWED_ROLES = new Set([
  "fingerprint-reference",
  "typecheck",
  "error-handling",
  "opennext-build",
  "browser-check",
  "d1-check",
  "react-doctor",
  "next-build",
  "wrangler-auth",
  "provider-resources",
  "release-gates",
]);

const FIXED_ROLE_COMMANDS: Readonly<Record<string, readonly string[]>> = {
  typecheck: ["bun", "run", "type-check"],
  "error-handling": ["bun", "run", "validate:error-handling"],
  "opennext-build": ["bun", "run", "cf:build"],
  "react-doctor": ["bun", "run", "doctor"],
  "next-build": ["bun", "run", "build"],
  "wrangler-auth": ["bun", "run", "cf:check-wrangler-auth"],
  "provider-resources": ["bun", "run", "cf:check-provider-resources"],
  "release-gates": ["bun", "run", "cf:release-gates"],
};

type ChildOutputBinding = {
  env_key: "OUTPUT_FILE" | "MARKDOWN_FILE";
  role: "release-gates-json" | "release-gates-md";
  immutable_path: string;
  schema_id: "cloudflare-release-gates" | "cloudflare-release-gates-markdown";
  sha256: string;
};

export type CommandReceiptV1 = {
  schema_version: typeof COMMAND_RECEIPT_SCHEMA;
  role: string;
  argv: string[];
  unit_id: string;
  run_id: string;
  start_at: string;
  end_at: string;
  duration_ms: number;
  exit_code: number | null;
  signal: string | null;
  overall: "PASS" | "FAIL";
  redacted_output_sha256: string;
  diagnostic_counts: { stdoutLines: number; stderrLines: number; failures: number };
  application_fingerprint: SourceFingerprint["application"];
  producer_fingerprint: SourceFingerprint["producer"];
  pre_application_fingerprint: SourceFingerprint["application"];
  pre_producer_fingerprint: SourceFingerprint["producer"];
  post_application_fingerprint: SourceFingerprint["application"];
  post_producer_fingerprint: SourceFingerprint["producer"];
  child_outputs: ChildOutputBinding[];
  build_hash?: string | null;
};

function splitCommand(argv: string[]): { options: string[]; command: string[] } {
  const separator = argv.indexOf("--");
  if (separator === -1) return { options: argv, command: [] };
  return { options: argv.slice(0, separator), command: argv.slice(separator + 1) };
}

function resolveManifest(repoRoot: string, unit: EstimateUnit, path?: string): RunManifestV1 {
  const manifestPath = resolveRunManifestPath(repoRoot, unit, path);
  return readAuthoritativeRunManifest(repoRoot, manifestPath, unit);
}

function sameArgv(actual: readonly string[], expected: readonly string[]): boolean {
  return actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

function parseNestedCommandOptions(command: string[], prefix: readonly string[]): Map<string, string | boolean> {
  if (!sameArgv(command.slice(0, prefix.length), prefix)) throw new Error(`gate child command must start with: ${prefix.join(" ")}`);
  return parseStrictCli(command.slice(prefix.length));
}

export function validateEstimateSheetGateCommand(role: string, unit: string, command: string[]): void {
  if (!ALLOWED_ROLES.has(role)) throw new Error(`gate role is not allowlisted: ${role}`);
  if (!command.length) throw new Error("gate requires a child command after --");
  if (command.some((token) => token.includes("\0"))) throw new Error("child command contains NUL");
  const fixed = FIXED_ROLE_COMMANDS[role];
  if (fixed) {
    if (!sameArgv(command, fixed)) throw new Error(`wrong child command for ${role}`);
    return;
  }
  if (role === "fingerprint-reference") {
    if (unit !== "UNIT-001") throw new Error("fingerprint-reference is restricted to UNIT-001");
    const options = parseNestedCommandOptions(command, ["bun", "run", "perf:estimate:fingerprint", "--"]);
    const exact = new Map<string, string | boolean>([
      ["compare-reference", ".ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization/evidence/source-fingerprint-v1.mjs"],
      ["planning-admission", ".ai/99_scratch/estimate-sheet-performance/admissions/UNIT-001-planning.json"],
      ["require-reference-artifact", "ART-036"],
      ["require-recorder-artifact", "ART-037"],
    ]);
    if (options.size !== exact.size || [...exact].some(([key, value]) => options.get(key) !== value)) {
      throw new Error("wrong child command for fingerprint-reference");
    }
    return;
  }
  if (role === "browser-check") {
    if (unit !== "UNIT-002") throw new Error("browser-check is restricted to UNIT-002");
    const options = parseNestedCommandOptions(command, ["bun", "run", "perf:estimate:check", "--"]);
    const required = new Map<string, string | boolean>([
      ["unit", unit],
      ["evidence", "auto:browser"],
      ["evidence-class", "local-browser"],
      ["browser-scope", "baseline"],
      ["budget-policy", "record-only"],
      ["tests", "auto:e2e-tests"],
      ["gates", "auto:opennext-build"],
      ["source-build-match", "required"],
    ]);
    if (options.size !== required.size || [...required].some(([key, value]) => options.get(key) !== value)) {
      throw new Error("wrong child command for browser-check");
    }
    return;
  }
  if (role === "d1-check") {
    if (unit !== "UNIT-003") throw new Error("d1-check is restricted to UNIT-003");
    const options = parseNestedCommandOptions(command, ["bun", "run", "perf:estimate:check", "--"]);
    const required = new Map<string, string | boolean>([
      ["unit", unit],
      ["evidence", "auto:d1"],
      ["evidence-class", "local-d1"],
      ["budget-policy", "record-only"],
    ]);
    if (options.size !== required.size || [...required].some(([key, value]) => options.get(key) !== value)) {
      throw new Error("wrong child command for d1-check");
    }
    return;
  }
  throw new Error(`gate role has no command contract: ${role}`);
}

export function parseEstimateSheetGateOptions(options: string[]): {
  values: Map<string, string | boolean>;
  childOutputSpecs: string[];
} {
  const childOutputSpecs: string[] = [];
  const ordinary: string[] = [];
  for (const token of options) {
    if (token.startsWith("--child-output=")) childOutputSpecs.push(token.slice("--child-output=".length));
    else ordinary.push(token);
  }
  return { values: parseStrictCli(ordinary), childOutputSpecs };
}

function resolveChildOutputSpecs(manifest: RunManifestV1, role: string, specs: string[]): Array<Omit<ChildOutputBinding, "sha256">> {
  if (role !== "release-gates") {
    if (specs.length) throw new Error("child outputs are supported only for release-gates");
    return [];
  }
  const expected = [
    { spec: "OUTPUT_FILE:auto:release-gates-json", env_key: "OUTPUT_FILE" as const, role: "release-gates-json" as const, schema_id: "cloudflare-release-gates" as const },
    { spec: "MARKDOWN_FILE:auto:release-gates-md", env_key: "MARKDOWN_FILE" as const, role: "release-gates-md" as const, schema_id: "cloudflare-release-gates-markdown" as const },
  ];
  if (specs.length !== expected.length || expected.some(({ spec }) => !specs.includes(spec))) {
    throw new Error("release-gates requires the exact JSON and Markdown child outputs");
  }
  return expected.map(({ env_key, role: outputRole, schema_id }) => {
    const immutable_path = resolveManifestLogicalOutput(manifest, outputRole);
    if (existsSync(immutable_path)) throw new Error(`child output already exists: ${immutable_path}`);
    return { env_key, role: outputRole, immutable_path, schema_id };
  });
}

function validateChildOutputs(outputs: Array<Omit<ChildOutputBinding, "sha256">>, immutableRunRoot: string): ChildOutputBinding[] {
  return outputs.map((output) => {
    const path = assertSymlinkFreeContainedPath(immutableRunRoot, output.immutable_path, output.role, {
      requireRegularFile: true,
      requireSingleLink: true,
    });
    const bytes = readFileSync(path);
    const text = bytes.toString("utf8");
    if (output.role === "release-gates-json") {
      const parsed = JSON.parse(text) as unknown;
      if (!isPlainObject(parsed) || parsed.mode !== "cloudflare-release-gates") throw new Error("release-gates JSON child schema mismatch");
    } else if (!text.startsWith("# Cloudflare Release Gates\n")) {
      throw new Error("release-gates Markdown child schema mismatch");
    }
    assertSymlinkFreeContainedPath(immutableRunRoot, path, output.role, {
      requireRegularFile: true,
      requireSingleLink: true,
    });
    return { ...output, sha256: sha256Hex(bytes) };
  });
}

function resolveReceiptPath(manifest: RunManifestV1, role: string, output?: string): string {
  if (output !== undefined && output !== `auto:${role}`) throw new Error(`gate output must be auto:${role}`);
  const path = resolveManifestLogicalOutput(manifest, role as Parameters<typeof resolveManifestLogicalOutput>[1]);
  if (existsSync(path)) throw new Error(`gate receipt already exists: ${path}`);
  return path;
}

function buildArtifactHash(repoRoot: string, role: string): string | null {
  if (role === "next-build") {
    const required = [".next/BUILD_ID", ".next/server", ".next/static"];
    return required.every((path) => existsSync(resolve(repoRoot, path))) ? sha256NextBuild(repoRoot) : null;
  }
  if (role === "opennext-build") {
    const required = [".open-next/worker.js", ".open-next/assets"];
    return required.every((path) => existsSync(resolve(repoRoot, path))) ? sha256OpenNextBuild(repoRoot) : null;
  }
  return null;
}

type GeneratedNextEnvSnapshot = {
  path: string;
  bytes: Buffer | null;
};

function snapshotGeneratedNextEnv(repoRoot: string, role: string): GeneratedNextEnvSnapshot | null {
  if (role !== "opennext-build") return null;
  const path = resolve(repoRoot, "next-env.d.ts");
  return { path, bytes: existsSync(path) ? readFileSync(path) : null };
}

function restoreGeneratedNextEnv(snapshot: GeneratedNextEnvSnapshot | null): void {
  if (!snapshot) return;
  if (snapshot.bytes === null) {
    if (existsSync(snapshot.path)) unlinkSync(snapshot.path);
    return;
  }
  if (!existsSync(snapshot.path) || !readFileSync(snapshot.path).equals(snapshot.bytes)) {
    writeFileSync(snapshot.path, snapshot.bytes, { mode: 0o644 });
  }
}

export function runEstimateSheetPerformanceGate(input: {
  repoRoot?: string;
  runManifest?: string;
  unit: string;
  role: string;
  command: string[];
  output?: string;
  childOutputSpecs?: string[];
  spawn?: typeof spawnSync;
}): { receipt: CommandReceiptV1; receiptPath: string; exitCode: number } {
  const repoRoot = resolve(input.repoRoot ?? process.cwd());
  const unit = requireUnit(input.unit);
  validateEstimateSheetGateCommand(input.role, input.unit, input.command);
  const manifest = resolveManifest(repoRoot, unit, input.runManifest);
  if (manifest.unit_id !== input.unit) throw new Error("gate unit does not match run manifest");
  const receiptPath = resolveReceiptPath(manifest, input.role, input.output);
  const childOutputBindings = resolveChildOutputSpecs(manifest, input.role, input.childOutputSpecs ?? []);
  for (const binding of childOutputBindings) {
    ensureDirectoryDurably(dirname(binding.immutable_path), 0o700, manifest.immutable_run_root);
  }
  const before = computeEstimateSheetSourceFingerprint({ repoRoot }).fingerprint;
  if (!fingerprintContentEqual(before.application, manifest.applicationFingerprint) || !fingerprintContentEqual(before.producer, manifest.producerFingerprint)) {
    throw new Error("gate source fingerprint does not match the prepared run");
  }
  const started = Date.now();
  const childEnv = { ...process.env } as NodeJS.ProcessEnv;
  for (const binding of childOutputBindings) childEnv[binding.env_key] = binding.immutable_path;
  const spawn = input.spawn ?? spawnSync;
  readAuthoritativeRunManifest(repoRoot, resolveRunManifestPath(repoRoot, unit, input.runManifest), unit);
  const nextEnvSnapshot = snapshotGeneratedNextEnv(repoRoot, input.role);
  const child = (() => {
    try {
      return spawn(input.command[0], input.command.slice(1), { cwd: repoRoot, env: childEnv, shell: false, encoding: "utf8", timeout: 5 * 60_000, stdio: ["ignore", "pipe", "pipe"] });
    } finally {
      restoreGeneratedNextEnv(nextEnvSnapshot);
    }
  })();
  const ended = Date.now();
  const stdout = String(child.stdout ?? "");
  const stderr = String(child.stderr ?? "");
  const after = computeEstimateSheetSourceFingerprint({ repoRoot }).fingerprint;
  const unchanged = before.application.content_sha256 === after.application.content_sha256
    && before.producer.content_sha256 === after.producer.content_sha256;
  let childOutputs: ChildOutputBinding[] = [];
  let childOutputError: string | null = null;
  try {
    childOutputs = validateChildOutputs(childOutputBindings, manifest.immutable_run_root);
  } catch (error) {
    childOutputError = error instanceof Error ? error.message : String(error);
  }
  const buildHash = buildArtifactHash(repoRoot, input.role);
  const buildReady = !["next-build", "opennext-build"].includes(input.role) || buildHash !== null;
  const status = child.status === 0 && !child.error && unchanged && childOutputError === null && buildReady;
  const outputDigest = sha256Hex(Buffer.from(`${stdout.replace(/token|secret|cookie|authorization|password/giu, "redacted")}\0${stderr.replace(/token|secret|cookie|authorization|password/giu, "redacted")}`, "utf8"));
  const receipt: CommandReceiptV1 = {
    schema_version: COMMAND_RECEIPT_SCHEMA,
    role: input.role,
    argv: normalizeArgv(input.command, repoRoot),
    unit_id: manifest.unit_id,
    run_id: manifest.run_id,
    start_at: new Date(started).toISOString(),
    end_at: new Date(ended).toISOString(),
    duration_ms: ended - started,
    exit_code: typeof child.status === "number" ? child.status : null,
    signal: child.signal ?? null,
    overall: status ? "PASS" : "FAIL",
    redacted_output_sha256: outputDigest,
    diagnostic_counts: { stdoutLines: Math.min(stdout ? stdout.split(/\r?\n/u).length : 0, 10_000), stderrLines: Math.min(stderr ? stderr.split(/\r?\n/u).length : 0, 10_000), failures: status ? 0 : 1 },
    application_fingerprint: before.application,
    producer_fingerprint: before.producer,
    pre_application_fingerprint: before.application,
    pre_producer_fingerprint: before.producer,
    post_application_fingerprint: after.application,
    post_producer_fingerprint: after.producer,
    child_outputs: childOutputs,
    build_hash: buildHash,
  };
  if (childOutputError) receipt.diagnostic_counts.failures += 1;
  readAuthoritativeRunManifest(repoRoot, resolveRunManifestPath(repoRoot, unit, input.runManifest), unit);
  writeRunJsonNoOverwrite(manifest, receiptPath, receipt, 0o600);
  return { receipt, receiptPath, exitCode: status ? 0 : (typeof child.status === "number" ? child.status : 1) };
}

export function main(argv = process.argv.slice(2)): number {
  const split = splitCommand(argv);
  const { values, childOutputSpecs } = parseEstimateSheetGateOptions(split.options);
  if (cliBoolean(values, "help")) { console.log("Usage: bun run scripts/run-estimate-sheet-performance-gate.ts --unit=UNIT-001 --role=typecheck --run-manifest=PATH --output=auto:typecheck -- command args..."); return 0; }
  const unit = cliString(values, "unit", true) as string;
  const role = cliString(values, "role", true) as string;
  const runManifest = cliString(values, "run-manifest") ?? process.env.ESTIMATE_PERF_RUN_MANIFEST;
  const result = runEstimateSheetPerformanceGate({ repoRoot: process.cwd(), runManifest, unit, role, command: split.command, output: cliString(values, "output"), childOutputSpecs });
  process.stdout.write(`${JSON.stringify({ ...result.receipt, receipt_path: result.receiptPath }, null, 2)}\n`);
  return result.exitCode;
}

if (import.meta.main) {
  try { process.exitCode = main(); }
  catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
