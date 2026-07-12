import { createHash, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import {
  lstat,
  readFile,
  realpath,
  rename,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const ENUMS = {
  profile: new Set(["focused", "standard", "high-blast-radius"]),
  package_action_ceiling: new Set(["IMPLEMENT_LOCAL", "EXTERNAL_ACTIONS"]),
  last_observed_run_scope: new Set([
    "READ_ONLY",
    "PLAN_ONLY",
    "IMPLEMENT_LOCAL",
    "EXTERNAL_ACTIONS",
  ]),
  package_status: new Set([
    "IMPLEMENTATION_READY",
    "CONDITIONALLY_READY",
    "NOT_READY",
  ]),
  implementation_status: new Set([
    "NOT_STARTED",
    "IN_PROGRESS",
    "COMPLETE",
    "INCOMPLETE",
  ]),
  release_status: new Set([
    "NOT_EVALUATED",
    "READY",
    "BOUNDARY",
    "NOT_READY",
  ]),
  plan_lifecycle: new Set(["N/A", "ACTIVE", "ARCHIVE_READY", "ARCHIVED"]),
  terminal_status: new Set([
    "ACTIVE",
    "ACHIEVED",
    "AUTH_BLOCKED",
    "TECH_BLOCKED",
    "CANCELLED",
  ]),
};

const RECORD_STATES = {
  source: new Set(["CURRENT", "STALE", "UNKNOWN"]),
  requirement: new Set(["PROPOSED", "ACCEPTED", "DEFERRED", "REJECTED", "BLOCKED"]),
  assumption: new Set(["ACTIVE", "VALIDATED", "INVALIDATED", "RETIRED"]),
  risk: new Set(["OPEN", "MITIGATED", "ACCEPTED", "REALIZED", "CLOSED"]),
  unit: new Set(["PLANNED", "READY", "IN_PROGRESS", "DONE", "VERIFIED", "BLOCKED", "SUPERSEDED"]),
  criterion: new Set(["PASS", "FAIL", "BOUNDARY", "N/A"]),
  test: new Set(["PLANNED", "PASS", "FAIL", "STALE", "SKIPPED"]),
  evidence: new Set(["PLANNED", "COLLECTED", "PASS", "FAIL", "STALE", "SKIPPED"]),
  decision: new Set(["ACTIVE", "SUPERSEDED", "REVERSED"]),
  boundary: new Set(["ACTIVE", "RESOLVED", "SUPERSEDED"]),
};

const SUPPORTED_SUITE_VERSIONS = new Set(["2026-07-10", "2026-07-11"]);
const TEST_REQUIREMENTS = new Set([
  "NOT_REQUIRED",
  "TARGETED",
  "BROADER",
  "TEST_TASK",
]);
const TEST_TRIGGERS = new Set([
  "NONE",
  "EXPLICIT_TEST_TASK",
  "MVP_CRITICAL_INVARIANT",
  "CHEAPEST_DECISIVE_EXISTING_TEST",
]);

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const SHELL_INERT_TEST_PATH_PATTERN = /^[A-Za-z0-9._/-]+$/u;
const REQUIREMENT_ID_PATTERN = /^(?:REQ|UX|SEC|DATA|PERF|OPS)-\d+$/u;
const TRACE_ID_PATTERN = /^(?:SRC|REQ|UX|SEC|DATA|PERF|OPS|ASSUMP|DEC-AUTO|AUTH|RISK|AC|TEST|EVID|ART|UNIT|GATE|SLICE)-[A-Z0-9-]+$/u;

const ESTIMATE_RUNTIME_CONTRACT = "estimate-sheet-runtime-manifest-state.v1";
const ESTIMATE_RUNTIME_REGISTRY = {
  artifact_id: "ART-052",
  projection_path: "evidence/runtime/evidence-index.json",
};
const ESTIMATE_RUNTIME_PROJECTIONS = [
  ["ART-039", "EVID-002", "SECONDARY", "fixture", "evidence/runtime/fixture-manifest.json", "UNIT-001"],
  ["ART-040", "EVID-002", "PRIMARY", "jsdom", "evidence/runtime/jsdom-baseline.json", "UNIT-001"],
  ["ART-041", "EVID-003", "PRIMARY", "browser", "evidence/runtime/browser-baseline.json", "UNIT-002"],
  ["ART-042", "EVID-004", "PRIMARY", "d1-local", "evidence/runtime/d1-local-baseline.json", "UNIT-003"],
  ["ART-043", "EVID-013", "PRIMARY", "decision", "evidence/runtime/bottleneck-decision.json", "UNIT-004"],
  ["ART-044", "EVID-005", "PRIMARY", "unit-005", "evidence/runtime/unit-005-route-d1.json", "UNIT-005"],
  ["ART-045", "EVID-006", "PRIMARY", "unit-006", "evidence/runtime/unit-006-graph.json", "UNIT-006"],
  ["ART-046", "EVID-007", "PRIMARY", "unit-007", "evidence/runtime/unit-007-derived-state.json", "UNIT-007"],
  ["ART-047", "EVID-008", "PRIMARY", "unit-008", "evidence/runtime/unit-008-render-a11y.json", "UNIT-008"],
  ["ART-048", "EVID-009", "PRIMARY", "unit-009", "evidence/runtime/unit-009-mutations.json", "UNIT-009"],
  ["ART-049", "EVID-010", "PRIMARY", "integrated-local", "evidence/runtime/integrated-local-proof.json", "UNIT-010"],
  ["ART-050", "EVID-011", "PRIMARY", "hosted-d1", "evidence/runtime/hosted-d1-proof.json", "UNIT-011"],
  ["ART-051", "EVID-011", "SECONDARY", "release", "evidence/runtime/release-evaluation.md", "UNIT-011"],
].map(([artifact_id, evidence_id, relationship, role, projection_path, unit_id]) => ({ artifact_id, evidence_id, relationship, role, projection_path, unit_id }));

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function deepSort(value) {
  if (Array.isArray(value)) {
    return value.map(deepSort);
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, deepSort(value[key])]),
    );
  }

  return value;
}

export function canonicalManifestBytes(manifest) {
  const withoutSelfHash = structuredClone(manifest);
  delete withoutSelfHash.manifest_sha256;
  return Buffer.from(JSON.stringify(deepSort(withoutSelfHash)), "utf8");
}

function isSafeRelativePath(path) {
  if (typeof path !== "string" || path.length === 0 || isAbsolute(path) || path.includes("\\")) {
    return false;
  }

  const segments = path.split("/");
  return segments.every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}

function isInside(root, target) {
  const back = relative(root, target);
  return back === "" || (!back.startsWith(`..${sep}`) && back !== ".." && !isAbsolute(back));
}

function resolveInside(root, path) {
  if (!isSafeRelativePath(path)) {
    return null;
  }

  const target = resolve(root, path);
  return isInside(root, target) ? target : null;
}

function expectEnum(manifest, key, errors) {
  if (!ENUMS[key].has(manifest[key])) {
    errors.push(`${key}: invalid value ${JSON.stringify(manifest[key])}`);
  }
}

function expectNonEmptyString(record, key, label, errors) {
  if (typeof record[key] !== "string" || record[key].trim().length === 0) {
    errors.push(`${label}: ${key} must be a non-empty string`);
    return null;
  }
  return record[key];
}

function expectStringArray(record, key, label, errors, { minimum = 0, pattern = null } = {}) {
  const value = record[key];
  if (!Array.isArray(value)) {
    errors.push(`${label}: ${key} must be an array`);
    return [];
  }

  const valid = [];
  const seen = new Set();
  for (const item of value) {
    if (typeof item !== "string" || item.length === 0 || (pattern && !pattern.test(item))) {
      errors.push(`${label}: ${key} contains invalid value ${JSON.stringify(item)}`);
      continue;
    }
    if (seen.has(item)) {
      errors.push(`${label}: ${key} contains duplicate ${item}`);
      continue;
    }
    seen.add(item);
    valid.push(item);
  }

  if (valid.length < minimum) {
    errors.push(`${label}: ${key} requires at least ${minimum} value${minimum === 1 ? "" : "s"}`);
  }
  return valid;
}

function indexRecords(records, label, pattern, states, errors) {
  if (!Array.isArray(records)) {
    errors.push(`${label}: expected an array`);
    return new Map();
  }

  const index = new Map();
  for (const record of records) {
    if (!isPlainObject(record) || !pattern.test(record.id ?? "")) {
      errors.push(`${label}: invalid record id ${JSON.stringify(record?.id)}`);
      continue;
    }
    if (index.has(record.id)) {
      errors.push(`${label}: duplicate id ${record.id}`);
      continue;
    }
    if (states && !states.has(record.status)) {
      errors.push(`${label}: ${record.id} has invalid status ${JSON.stringify(record.status)}`);
    }
    index.set(record.id, record);
  }
  return index;
}

function expectReferences(ids, index, label, errors) {
  for (const id of ids) {
    if (!index.has(id)) {
      errors.push(`${label}: references missing ${id}`);
    }
  }
}

function includesString(record, key, value) {
  return Array.isArray(record?.[key]) && record[key].includes(value);
}

function exactObjectKeys(value, expected) {
  return isPlainObject(value)
    && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}

function containsRuntimeRegistrySelfEntry(value) {
  const pending = [value];
  while (pending.length > 0) {
    const current = pending.pop();
    if (Array.isArray(current)) {
      pending.push(...current);
    } else if (isPlainObject(current)) {
      if (
        current.artifact_id === ESTIMATE_RUNTIME_REGISTRY.artifact_id
        || current.artifactId === ESTIMATE_RUNTIME_REGISTRY.artifact_id
        || current.projection_path === ESTIMATE_RUNTIME_REGISTRY.projection_path
      ) return true;
      pending.push(...Object.values(current));
    }
  }
  return false;
}

async function validateEstimateRuntimeExtension({ manifest, root, artifacts, evidence, units, errors }) {
  const runtime = manifest.runtime_evidence;
  if (!isPlainObject(runtime) || runtime.contract_version !== ESTIMATE_RUNTIME_CONTRACT) return;
  const latestNull = runtime.latest_unit_id === null && runtime.latest_run_id === null;
  const runtimeKeys = latestNull
    ? ["contract_version", "transition_sequence", "latest_unit_id", "latest_run_id", "registry", "projections"]
    : ["contract_version", "transition_sequence", "latest_unit_id", "latest_run_id", "latest_run_manifest_sha256", "registry", "projections"];
  if (!exactObjectKeys(runtime, runtimeKeys)) {
    errors.push("runtime_evidence: invalid closed shape");
  }
  if (!Number.isSafeInteger(runtime.transition_sequence) || runtime.transition_sequence < 0) {
    errors.push("runtime_evidence: transition_sequence must be a non-negative safe integer");
  }
  const latestPresent = /^UNIT-\d+$/u.test(runtime.latest_unit_id ?? "")
    && typeof runtime.latest_run_id === "string"
    && /^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(runtime.latest_run_id);
  if ((!latestNull && !latestPresent) || (runtime.transition_sequence === 0 && !latestNull)) {
    errors.push("runtime_evidence: latest unit/run tuple does not match transition sequence");
  }
  if (runtime.transition_sequence > 0 && !latestPresent && manifest.terminal_status !== "ACHIEVED") {
    errors.push("runtime_evidence: nonzero transition sequence requires latest unit/run");
  }
  if (latestPresent && !SHA256_PATTERN.test(runtime.latest_run_manifest_sha256 ?? "")) {
    errors.push("runtime_evidence: latest run manifest SHA-256 is required with a latest run");
  }
  if (!exactObjectKeys(runtime.registry, ["artifact_id", "projection_path", "immutable_path", "sha256"])
    || runtime.registry.artifact_id !== ESTIMATE_RUNTIME_REGISTRY.artifact_id
    || runtime.registry.projection_path !== ESTIMATE_RUNTIME_REGISTRY.projection_path) {
    errors.push("runtime_evidence: registry mapping mismatch");
  }
  if (!Array.isArray(runtime.projections) || runtime.projections.length !== ESTIMATE_RUNTIME_PROJECTIONS.length) {
    errors.push(`runtime_evidence: expected ${ESTIMATE_RUNTIME_PROJECTIONS.length} ordered projections`);
    return;
  }

  const rows = [];
  for (let index = 0; index < ESTIMATE_RUNTIME_PROJECTIONS.length; index += 1) {
    const expected = ESTIMATE_RUNTIME_PROJECTIONS[index];
    const row = runtime.projections[index];
    if (!exactObjectKeys(row, ["artifact_id", "evidence_id", "relationship", "role", "projection_path", "immutable_path", "sha256"])) {
      errors.push(`runtime_evidence: projection ${index} invalid closed shape`);
      continue;
    }
    for (const key of ["artifact_id", "evidence_id", "relationship", "role", "projection_path"]) {
      if (row[key] !== expected[key]) errors.push(`runtime_evidence: projection ${index} ${key} mismatch`);
    }
    rows.push({ ...row, unit_id: expected.unit_id, registry: false });
  }
  if (isPlainObject(runtime.registry)) rows.push({ ...runtime.registry, unit_id: null, registry: true });

  for (const row of rows) {
    if (!SHA256_PATTERN.test(row.sha256 ?? "")) {
      errors.push(`runtime_evidence: ${row.artifact_id} hash is invalid`);
      continue;
    }
    const artifact = artifacts.get(row.artifact_id);
    if (!artifact || artifact.path !== row.projection_path || artifact.sha256 !== row.sha256) {
      errors.push(`runtime_evidence: ${row.artifact_id} artifact reciprocity mismatch`);
    }
    if (row.immutable_path === null) {
      if (!row.registry && row.relationship === "PRIMARY") {
        const evidenceRecord = evidence.get(row.evidence_id);
        if (evidenceRecord?.status !== "STALE") errors.push(`runtime_evidence: ${row.evidence_id} must be STALE while placeholder-backed`);
      }
      continue;
    }
    const allowedPrefix = row.registry
      ? "evidence/runtime/runs/"
      : `evidence/runtime/runs/${row.unit_id}/`;
    if (!isSafeRelativePath(row.immutable_path) || !row.immutable_path.startsWith(allowedPrefix) || row.immutable_path === row.projection_path) {
      errors.push(`runtime_evidence: ${row.artifact_id} immutable path is unsafe or cyclic`);
      continue;
    }
    const immutable = resolveInside(root, row.immutable_path);
    const projection = resolveInside(root, row.projection_path);
    if (!immutable || !projection) {
      errors.push(`runtime_evidence: ${row.artifact_id} path escapes plan root`);
      continue;
    }
    try {
      const [immutableReal, projectionReal] = await Promise.all([realpath(immutable), realpath(projection)]);
      if (immutableReal !== immutable || projectionReal !== projection) throw new Error("symlink traversal");
      const [immutableInfo, projectionInfo, immutableBytes, projectionBytes] = await Promise.all([
        stat(immutable), stat(projection), readFile(immutable), readFile(projection),
      ]);
      if (!immutableInfo.isFile() || !projectionInfo.isFile()) throw new Error("not a regular file");
      if (!immutableBytes.equals(projectionBytes) || sha256(immutableBytes) !== row.sha256) {
        throw new Error("immutable/projection bytes or hash differ");
      }
      if (row.registry) {
        const parsed = JSON.parse(immutableBytes.toString("utf8"));
        if (containsRuntimeRegistrySelfEntry(parsed)) throw new Error("registry contains cyclic self-entry");
      }
    } catch (error) {
      errors.push(`runtime_evidence: ${row.artifact_id} ${error.message}`);
    }
    if (!row.registry && row.relationship === "PRIMARY") {
      const evidenceRecord = evidence.get(row.evidence_id);
      const unit = units.get(row.unit_id);
      const unitOneRefreeze = row.unit_id === "UNIT-001"
        && evidenceRecord?.status === "STALE"
        && manifest.next_unit === "UNIT-001"
        && ["READY", "IN_PROGRESS"].includes(unit?.status);
      if (!evidenceRecord
        || (!unitOneRefreeze && evidenceRecord.status !== "PASS")
        || evidenceRecord.artifact_path !== row.projection_path
        || evidenceRecord.sha256 !== row.sha256) {
        errors.push(`runtime_evidence: ${row.evidence_id} materialized evidence reciprocity mismatch`);
      }
    }
  }

  for (const expected of ESTIMATE_RUNTIME_PROJECTIONS.filter((row) => row.relationship === "PRIMARY")) {
    const unit = units.get(expected.unit_id);
    const row = runtime.projections.find((candidate) => candidate.artifact_id === expected.artifact_id);
    if (["VERIFIED", "SUPERSEDED"].includes(unit?.status) && row?.immutable_path === null) {
      errors.push(`runtime_evidence: ${expected.unit_id}=${unit.status} requires materialized ${expected.artifact_id}`);
    }
    if (unit?.status === "IN_PROGRESS" && runtime.latest_unit_id !== expected.unit_id) {
      errors.push(`runtime_evidence: latest unit must match ${expected.unit_id}=IN_PROGRESS`);
    }
  }
}

async function validateExistingTestIdentity(testRecord, baseline, errors) {
  const label = `tests: ${testRecord.id}`;
  if (testRecord.execution_mode !== "EXISTING_READ_ONLY") {
    errors.push(`${label}: execution_mode must be EXISTING_READ_ONLY for CHEAPEST_DECISIVE_EXISTING_TEST`);
  }

  const testPath = expectNonEmptyString(testRecord, "existing_test_path", label, errors);
  const testCommand = expectNonEmptyString(testRecord, "test_command", label, errors);
  const expectedHash = expectNonEmptyString(testRecord, "existing_test_sha256", label, errors);
  if (expectedHash && !SHA256_PATTERN.test(expectedHash)) {
    errors.push(`${label}: existing_test_sha256 must be a SHA-256 digest`);
  }
  const testPathIsSafe = !testPath || (isSafeRelativePath(testPath) && SHELL_INERT_TEST_PATH_PATTERN.test(testPath));
  if (testPath && !testPathIsSafe) {
    errors.push(`${label}: existing_test_path must be a shell-inert repository-relative path using only A-Z, a-z, 0-9, dot, underscore, slash, or hyphen`);
  }
  if (testPath && !/(?:^|\/)(?:__tests__|e2e|tests?)(?:\/|$)|\.(?:spec|test)\.[A-Za-z0-9]+$/u.test(testPath)) {
    errors.push(`${label}: existing_test_path must identify a test file or test directory`);
  }
  if (testCommand) {
    if (/[\r\n;&|<>`$*?{}\[\]]/u.test(testCommand) || /["'\\]/u.test(testCommand)) {
      errors.push(`${label}: test_command must be one direct command without shell composition, quoting, or redirection`);
    } else {
      const tokens = testCommand.trim().split(/\s+/u);
      const noExecutionFlags = [];
      const vitestExecutionFlags = [/^--maxWorkers=1$/u];
      const playwrightExecutionFlags = [/^--workers=1$/u];
      const allowedRunners = [
        { prefix: ["bun", "test"], flags: noExecutionFlags },
        { prefix: ["bun", "x", "playwright", "test"], flags: playwrightExecutionFlags },
        { prefix: ["bun", "x", "vitest", "run"], flags: vitestExecutionFlags },
        { prefix: ["bunx", "playwright", "test"], flags: playwrightExecutionFlags },
        { prefix: ["bunx", "vitest", "run"], flags: vitestExecutionFlags },
        { prefix: ["node", "--test"], flags: noExecutionFlags },
        { prefix: ["npx", "playwright", "test"], flags: playwrightExecutionFlags },
        { prefix: ["npx", "vitest", "run"], flags: vitestExecutionFlags },
        { prefix: ["pnpm", "exec", "playwright", "test"], flags: playwrightExecutionFlags },
        { prefix: ["pnpm", "exec", "vitest", "run"], flags: vitestExecutionFlags },
        { prefix: ["yarn", "playwright", "test"], flags: playwrightExecutionFlags },
        { prefix: ["yarn", "vitest", "run"], flags: vitestExecutionFlags },
      ];
      const runner = allowedRunners.find((candidate) =>
        candidate.prefix.every((token, index) => tokens[index] === token),
      );
      const selectorIndex = runner?.prefix.length ?? -1;
      if (!runner || tokens[selectorIndex] !== testPath) {
        errors.push(`${label}: test_command must use an allowlisted direct runner with existing_test_path as its sole selector`);
      } else if (tokens.slice(selectorIndex + 1).some((token) =>
        !runner.flags.some((pattern) => pattern.test(token)),
      )) {
        errors.push(`${label}: test_command options after existing_test_path must be read-only and runner-allowlisted`);
      }
      if (tokens.some((token) => ["--all", "--changed", "--projects", "--related"].includes(token.split("=", 1)[0]))) {
        errors.push(`${label}: test_command cannot add a broad-selection flag`);
      }
    }
  }
  if (!testPathIsSafe) return;

  const baselineHead = baseline?.head;
  if (typeof baselineHead !== "string" || !/^[a-f0-9]{40,64}$/u.test(baselineHead)) {
    errors.push(`${label}: CHEAPEST_DECISIVE_EXISTING_TEST requires an exact Git commit in baseline.head`);
    return;
  }
  if (!testPath || !expectedHash || !SHA256_PATTERN.test(expectedHash)) return;

  try {
    const { stdout: rootOutput } = await execFileAsync(
      "git",
      ["-C", process.cwd(), "rev-parse", "--show-toplevel"],
      { encoding: "utf8", maxBuffer: 1024 * 1024 },
    );
    const repositoryRoot = await realpath(rootOutput.trim());
    const absolute = resolveInside(repositoryRoot, testPath);
    if (!absolute) {
      errors.push(`${label}: existing_test_path escapes the repository root`);
      return;
    }

    const actual = await realpath(absolute);
    const info = await stat(actual);
    if (actual !== absolute || !info.isFile()) {
      errors.push(`${label}: existing_test_path must be a regular non-symlink file`);
      return;
    }

    const currentHash = sha256(await readFile(actual));
    const { stdout: baselineBytes } = await execFileAsync(
      "git",
      ["-C", repositoryRoot, "show", `${baselineHead}:${testPath}`],
      { encoding: "buffer", maxBuffer: 16 * 1024 * 1024 },
    );
    const baselineHash = sha256(Buffer.isBuffer(baselineBytes) ? baselineBytes : Buffer.from(baselineBytes));
    if (baselineHash !== expectedHash) {
      errors.push(`${label}: existing_test_sha256 does not match the test at baseline.head`);
    }
    if (currentHash !== expectedHash) {
      errors.push(`${label}: existing test changed after baseline; the read-only exception is invalid`);
    }
  } catch (error) {
    errors.push(`${label}: could not prove the existing test at baseline.head (${error.message})`);
  }
}

function validateDag(unitEdges, errors) {
  const visiting = new Set();
  const visited = new Set();

  function visit(id, trail) {
    if (visiting.has(id)) {
      errors.push(`units: cycle detected (${[...trail, id].join(" -> ")})`);
      return;
    }
    if (visited.has(id)) {
      return;
    }

    visiting.add(id);
    for (const dependency of unitEdges.get(id) ?? []) {
      if (!unitEdges.has(dependency)) {
        errors.push(`units: ${id} depends on missing ${dependency}`);
        continue;
      }
      visit(dependency, [...trail, id]);
    }
    visiting.delete(id);
    visited.add(id);
  }

  for (const id of unitEdges.keys()) {
    visit(id, []);
  }
}

function transitiveDependencies(id, unitEdges, found = new Set()) {
  for (const dependency of unitEdges.get(id) ?? []) {
    if (!found.has(dependency)) {
      found.add(dependency);
      transitiveDependencies(dependency, unitEdges, found);
    }
  }
  return found;
}

function parseStrictIso(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value ? parsed : null;
}

async function atomicWriteJson(path, manifest) {
  const tempPath = `${path}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(tempPath, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    await rename(tempPath, path);
  } finally {
    await unlink(tempPath).catch(() => {});
  }
}

function validateTerminalSemantics(manifest, indexes, links, errors) {
  const {
    authorizationBoundaries,
    criteria,
    evidence,
    gates,
    requirements,
    risks,
    slices,
    tests,
    units,
  } = indexes;
  const ids = (value) => (Array.isArray(value) ? value : []);
  const activeUnits = [...units.values()].filter((unit) => unit.status !== "SUPERSEDED");
  const coreRequirementIds = new Set(
    [...requirements.values()]
      .filter((requirement) => requirement.completion_role !== "AUXILIARY")
      .map((requirement) => requirement.id),
  );
  const coreCriteria = [...criteria.values()].filter((criterion) =>
    ids(criterion.requirement_ids).some((id) => coreRequirementIds.has(id)));
  const coreCriterionIds = new Set(coreCriteria.map((criterion) => criterion.id));
  const coreGates = [...gates.values()].filter((gate) =>
    ids(gate.criterion_ids).some((id) => coreCriterionIds.has(id)));
  const coreTests = [...tests.values()].filter((test) =>
    ids(test.criterion_ids).some((id) => coreCriterionIds.has(id)));
  const coreUnits = activeUnits.filter((unit) =>
    ids(unit.requirement_ids).some((id) => coreRequirementIds.has(id)));
  const coreUnitIds = new Set(coreUnits.map((unit) => unit.id));
  const coreRisks = [...risks.values()].filter((risk) =>
    ids(risk.unit_ids).some((id) => coreUnitIds.has(id))
    || ids(risk.criterion_ids).some((id) => coreCriterionIds.has(id)));
  const activeBoundaries = [...authorizationBoundaries.values()].filter(
    (boundary) => boundary.status === "ACTIVE",
  );
  const blockedCoreUnits = coreUnits.filter((unit) => unit.status === "BLOCKED");
  const readyCoreUnits = coreUnits.filter((unit) => ["READY", "IN_PROGRESS"].includes(unit.status));
  const unfinishedCoreUnits = coreUnits.filter((unit) => unit.status !== "VERIFIED");

  if (manifest.next_unit !== null) {
    const next = units.get(manifest.next_unit);
    if (!next) {
      errors.push(`next_unit: references missing ${JSON.stringify(manifest.next_unit)}`);
    } else if (!["READY", "IN_PROGRESS"].includes(next.status)) {
      errors.push(`next_unit: ${next.id} is not READY or IN_PROGRESS`);
    }
    if (manifest.terminal_status !== "ACTIVE") {
      errors.push("next_unit: terminal packs cannot name a next unit");
    }
    if (![...slices.values()].some((slice) => links.sliceUnits.get(slice.id)?.includes(manifest.next_unit))) {
      errors.push(`next_unit: ${manifest.next_unit} is not present in a ready slice`);
    }
  } else if (manifest.terminal_status === "ACTIVE" && readyCoreUnits.length > 0) {
    errors.push("next_unit: ACTIVE packs with ready/in-progress work require an exact next unit");
  }

  if (manifest.implementation_status === "COMPLETE") {
    if (manifest.package_status !== "IMPLEMENTATION_READY") {
      errors.push("implementation_status: COMPLETE requires package_status IMPLEMENTATION_READY");
    }
    for (const unit of unfinishedCoreUnits) {
      errors.push(`implementation_status: COMPLETE conflicts with ${unit.id}=${unit.status}`);
    }
    for (const requirement of requirements.values()) {
      if (
        coreRequirementIds.has(requirement.id)
        && requirement.status === "ACCEPTED"
        && !((links.requirementUnits.get(requirement.id) ?? []).some((unitId) => units.get(unitId)?.status === "VERIFIED"))
      ) {
        errors.push(`implementation_status: COMPLETE requires ${requirement.id} to have a non-superseded VERIFIED unit`);
      }
    }
    if (manifest.next_unit !== null || slices.size > 0) {
      errors.push("implementation_status: COMPLETE requires no next unit or ready slice");
    }
  }

  if (manifest.implementation_status === "NOT_STARTED") {
    for (const unit of coreUnits) {
      if (["IN_PROGRESS", "DONE", "VERIFIED"].includes(unit.status)) {
        errors.push(`implementation_status: NOT_STARTED conflicts with ${unit.id}=${unit.status}`);
      }
    }
  }

  if (manifest.package_status === "IMPLEMENTATION_READY" && manifest.implementation_status !== "COMPLETE") {
    if (slices.size === 0) {
      errors.push("package_status: IMPLEMENTATION_READY requires a ready slice until implementation is complete");
    }
    for (const unit of coreUnits) {
      if (["PLANNED", "BLOCKED"].includes(unit.status)) {
        errors.push(`package_status: IMPLEMENTATION_READY conflicts with ${unit.id}=${unit.status}`);
      }
    }
  }

  if (manifest.package_status === "CONDITIONALLY_READY") {
    if (slices.size === 0 || !coreUnits.some((unit) => ["PLANNED", "BLOCKED"].includes(unit.status))) {
      errors.push("package_status: CONDITIONALLY_READY requires a ready slice and an explicitly unready remaining unit");
    }
  }

  if (manifest.package_status === "NOT_READY" && slices.size > 0) {
    errors.push("package_status: NOT_READY cannot advertise ready slices");
  }

  if (["ARCHIVE_READY", "ARCHIVED"].includes(manifest.plan_lifecycle)) {
    if (manifest.terminal_status !== "ACHIEVED" || manifest.implementation_status !== "COMPLETE") {
      errors.push(`${manifest.plan_lifecycle}: requires terminal_status ACHIEVED and implementation_status COMPLETE`);
    }
    if (manifest.next_unit !== null || slices.size > 0) {
      errors.push(`${manifest.plan_lifecycle}: requires no next unit or ready slice`);
    }
  }

  if (manifest.release_status === "BOUNDARY") {
    if (activeBoundaries.length === 0) {
      errors.push("release_status: BOUNDARY requires an active AUTH record");
    }
    if (![...criteria.values(), ...gates.values()].some((record) => record.status === "BOUNDARY")) {
      errors.push("release_status: BOUNDARY requires a boundary criterion or gate");
    }
  }
  if (activeBoundaries.length > 0 && manifest.release_status !== "BOUNDARY") {
    errors.push("release_status: active authorization boundaries require BOUNDARY");
  }
  if (manifest.release_status === "READY") {
    if (manifest.implementation_status !== "COMPLETE") {
      errors.push("release_status: READY requires implementation_status COMPLETE");
    }
    if (activeBoundaries.length > 0) {
      errors.push("release_status: READY conflicts with an active authorization boundary");
    }
    for (const record of [...criteria.values(), ...gates.values()]) {
      if (["FAIL", "BOUNDARY"].includes(record.status)) {
        errors.push(`release_status: READY conflicts with ${record.id}=${record.status}`);
      }
    }
    for (const test of tests.values()) {
      if (["PLANNED", "FAIL", "STALE"].includes(test.status)) {
        errors.push(`release_status: READY conflicts with ${test.id}=${test.status}`);
      }
    }
  }

  if (manifest.terminal_status === "ACHIEVED") {
    if (manifest.implementation_status !== "COMPLETE") {
      errors.push("terminal_status: ACHIEVED requires implementation_status COMPLETE");
    }
    if (!["N/A", "ARCHIVE_READY", "ARCHIVED"].includes(manifest.plan_lifecycle)) {
      errors.push("terminal_status: ACHIEVED requires plan_lifecycle N/A, ARCHIVE_READY, or ARCHIVED");
    }
    for (const requirement of requirements.values()) {
      if (!coreRequirementIds.has(requirement.id)) continue;
      if (["PROPOSED", "BLOCKED"].includes(requirement.status)) {
        errors.push(`terminal_status: ACHIEVED conflicts with ${requirement.id}=${requirement.status}`);
      }
      if (
        requirement.status === "ACCEPTED"
        && !((links.requirementCriteria.get(requirement.id) ?? []).some((criterionId) => ["PASS", "BOUNDARY"].includes(criteria.get(criterionId)?.status)))
      ) {
        errors.push(`terminal_status: ACHIEVED requires ${requirement.id} to have a PASS or BOUNDARY criterion`);
      }
    }
    for (const record of [...coreCriteria, ...coreGates]) {
      if (record.status === "FAIL") {
        errors.push(`terminal_status: ACHIEVED conflicts with ${record.id}=FAIL`);
      }
    }
    for (const test of coreTests) {
      if (["PLANNED", "FAIL", "STALE"].includes(test.status)) {
        errors.push(`terminal_status: ACHIEVED conflicts with ${test.id}=${test.status}`);
      }
    }
    for (const risk of coreRisks) {
      if (["OPEN", "REALIZED"].includes(risk.status)) {
        errors.push(`terminal_status: ACHIEVED conflicts with ${risk.id}=${risk.status}`);
      }
    }
  }

  if (manifest.terminal_status === "AUTH_BLOCKED") {
    if (activeBoundaries.length === 0 || manifest.release_status !== "BOUNDARY") {
      errors.push("terminal_status: AUTH_BLOCKED requires an active AUTH record and release_status BOUNDARY");
    }
    if (manifest.next_unit !== null || slices.size > 0 || readyCoreUnits.length > 0) {
      errors.push("terminal_status: AUTH_BLOCKED requires no ready/in-progress work or ready slice");
    }
    for (const unit of unfinishedCoreUnits) {
      errors.push(`terminal_status: AUTH_BLOCKED conflicts with unfinished ${unit.id}=${unit.status}`);
    }
    for (const requirement of requirements.values()) {
      if (!coreRequirementIds.has(requirement.id)) continue;
      if (["PROPOSED", "BLOCKED"].includes(requirement.status)) {
        errors.push(`terminal_status: AUTH_BLOCKED conflicts with ${requirement.id}=${requirement.status}`);
      }
      if (
        requirement.status === "ACCEPTED"
        && !((links.requirementCriteria.get(requirement.id) ?? []).some((criterionId) => ["PASS", "BOUNDARY"].includes(criteria.get(criterionId)?.status)))
      ) {
        errors.push(`terminal_status: AUTH_BLOCKED requires ${requirement.id} to have a PASS or BOUNDARY criterion`);
      }
    }
    for (const record of [...coreCriteria, ...coreGates]) {
      if (record.status === "FAIL") {
        errors.push(`terminal_status: AUTH_BLOCKED conflicts with ${record.id}=FAIL`);
      }
    }
    for (const test of coreTests) {
      if (["PLANNED", "FAIL", "STALE"].includes(test.status)) {
        errors.push(`terminal_status: AUTH_BLOCKED conflicts with ${test.id}=${test.status}`);
      }
    }
    for (const risk of coreRisks) {
      if (["OPEN", "REALIZED"].includes(risk.status)) {
        errors.push(`terminal_status: AUTH_BLOCKED conflicts with ${risk.id}=${risk.status}`);
      }
    }
  }

  if (manifest.terminal_status === "TECH_BLOCKED") {
    if (manifest.implementation_status !== "INCOMPLETE" || blockedCoreUnits.length === 0) {
      errors.push("terminal_status: TECH_BLOCKED requires implementation_status INCOMPLETE plus a BLOCKED unit linked to a core requested deliverable; auxiliary-only failures cannot block implementation");
    }
    if (manifest.next_unit !== null || slices.size > 0 || readyCoreUnits.length > 0) {
      errors.push("terminal_status: TECH_BLOCKED requires no ready/in-progress work or ready slice");
    }
  }

  if (manifest.terminal_status === "CANCELLED" && (manifest.next_unit !== null || slices.size > 0)) {
    errors.push("terminal_status: CANCELLED requires no next unit or ready slice");
  }

  const requiredEvidence = new Set();
  for (const unit of activeUnits) {
    if (unit.status === "VERIFIED") {
      for (const id of links.unitEvidence.get(unit.id) ?? []) requiredEvidence.add(id);
    }
  }
  for (const record of [...criteria.values(), ...gates.values()]) {
    if (record.status === "PASS") {
      for (const id of links.recordEvidence.get(record.id) ?? []) requiredEvidence.add(id);
    }
  }
  for (const test of tests.values()) {
    if (test.status === "PASS") {
      for (const id of links.recordEvidence.get(test.id) ?? []) requiredEvidence.add(id);
    }
  }
  for (const id of requiredEvidence) {
    const record = evidence.get(id);
    if (record && record.status !== "PASS") {
      errors.push(`evidence_index: ${id}=${record.status} cannot prove a verified/pass record`);
    }
  }
  if (manifest.terminal_status === "AUTH_BLOCKED") {
    const boundaryEvidence = new Set();
    for (const record of [...criteria.values(), ...gates.values()]) {
      if (record.status === "BOUNDARY") {
        for (const id of links.recordEvidence.get(record.id) ?? []) boundaryEvidence.add(id);
      }
    }
    for (const id of boundaryEvidence) {
      const record = evidence.get(id);
      if (record && !["PASS", "SKIPPED"].includes(record.status)) {
        errors.push(`evidence_index: ${id}=${record.status} cannot prove an authorization boundary`);
      }
    }
  }
}

export async function validatePlanPack(packPath, { write = false, now = Date.now() } = {}) {
  const requestedRoot = resolve(packPath);
  const errors = [];
  let root;

  try {
    const rootInfo = await lstat(requestedRoot);
    if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory()) {
      return { ok: false, errors: ["plan folder must be a real directory, not a symlink"] };
    }
    root = await realpath(requestedRoot);
  } catch (error) {
    return { ok: false, errors: [`plan folder: ${error.message}`] };
  }

  const manifestPath = resolve(root, "plan-pack.json");
  let manifest;
  try {
    const manifestInfo = await lstat(manifestPath);
    if (manifestInfo.isSymbolicLink() || !manifestInfo.isFile()) {
      return { ok: false, errors: ["plan-pack.json: must be a real file, not a symlink"] };
    }
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    return { ok: false, errors: [`plan-pack.json: ${error.message}`] };
  }

  if (!isPlainObject(manifest)) {
    return { ok: false, errors: ["plan-pack.json: root must be an object"] };
  }

  if (manifest.schema_version !== "1.0") {
    errors.push('schema_version: expected "1.0"');
  }
  if (!SUPPORTED_SUITE_VERSIONS.has(manifest.suite_version)) {
    errors.push('suite_version: expected "2026-07-10" or "2026-07-11"');
  }
  if (!/^PLAN-\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/u.test(manifest.package_id ?? "")) {
    errors.push(`package_id: invalid ${JSON.stringify(manifest.package_id)}`);
  }
  for (const key of Object.keys(ENUMS)) {
    expectEnum(manifest, key, errors);
  }
  if (
    manifest.package_action_ceiling === "IMPLEMENT_LOCAL"
    && manifest.last_observed_run_scope === "EXTERNAL_ACTIONS"
  ) {
    errors.push("last_observed_run_scope: EXTERNAL_ACTIONS exceeds package_action_ceiling IMPLEMENT_LOCAL");
  }

  if (!isPlainObject(manifest.baseline)) {
    errors.push("baseline: expected an object");
  } else {
    if (manifest.baseline.head !== null && (typeof manifest.baseline.head !== "string" || manifest.baseline.head.length === 0)) {
      errors.push("baseline: head must be null or a non-empty string");
    }
    for (const key of ["scoped_status_sha256", "scoped_diff_sha256"]) {
      if (!SHA256_PATTERN.test(manifest.baseline[key] ?? "")) {
        errors.push(`baseline: ${key} must be a SHA-256 digest`);
      }
    }
  }

  const updatedAt = parseStrictIso(manifest.updated_at);
  if (updatedAt === null) {
    errors.push("updated_at: expected canonical ISO-8601 UTC timestamp");
  }
  expectStringArray(manifest, "stale_triggers", "manifest", errors, { minimum: 1 });

  const artifacts = indexRecords(manifest.artifacts, "artifacts", /^ART-\d+$/u, null, errors);
  const artifactByPath = new Map();
  const artifactDigestByPath = new Map();
  const artifactRealPaths = new Set();
  const changedArtifactPaths = new Set();
  for (const artifact of artifacts.values()) {
    expectNonEmptyString(artifact, "role", `artifacts: ${artifact.id}`, errors);
    const absolute = resolveInside(root, artifact.path);
    if (!absolute) {
      errors.push(`artifacts: ${artifact.id} has unsafe path ${JSON.stringify(artifact.path)}`);
      continue;
    }
    if (artifactByPath.has(artifact.path)) {
      errors.push(`artifacts: duplicate path ${artifact.path}`);
      continue;
    }
    try {
      const actual = await realpath(absolute);
      if (!isInside(root, actual) || actual !== absolute) {
        errors.push(`artifacts: ${artifact.path} must not escape or traverse a symlink`);
        continue;
      }
      const info = await stat(actual);
      if (!info.isFile()) {
        errors.push(`artifacts: ${artifact.path} is not a regular file`);
        continue;
      }
      if (artifactRealPaths.has(actual)) {
        errors.push(`artifacts: duplicate target ${artifact.path}`);
        continue;
      }
      const bytes = await readFile(actual);
      const digest = sha256(bytes);
      if (write) {
        if (!SHA256_PATTERN.test(artifact.sha256 ?? "") || artifact.sha256 !== digest) {
          changedArtifactPaths.add(artifact.path);
        }
      } else if (!SHA256_PATTERN.test(artifact.sha256 ?? "") || artifact.sha256 !== digest) {
        errors.push(`artifacts: ${artifact.path} hash mismatch`);
      }
      artifactByPath.set(artifact.path, artifact);
      artifactDigestByPath.set(artifact.path, digest);
      artifactRealPaths.add(actual);
    } catch (error) {
      errors.push(`artifacts: ${artifact.path} unreadable (${error.message})`);
    }
  }

  const canonical = manifest.canonical_execution_artifact;
  const canonicalRecords = [...artifacts.values()].filter((artifact) => artifact.role === "canonical-execution");
  if (!artifactByPath.has(canonical)) {
    errors.push(`canonical_execution_artifact: missing artifact ${JSON.stringify(canonical)}`);
  }
  if (canonicalRecords.length !== 1 || canonicalRecords[0]?.path !== canonical) {
    errors.push("canonical_execution_artifact: exactly one canonical-execution role must match the pointer");
  }

  const sources = indexRecords(manifest.sources, "sources", /^SRC-\d+$/u, RECORD_STATES.source, errors);
  const requirements = indexRecords(manifest.requirements, "requirements", REQUIREMENT_ID_PATTERN, RECORD_STATES.requirement, errors);
  const assumptions = indexRecords(manifest.assumptions, "assumptions", /^ASSUMP-\d+$/u, RECORD_STATES.assumption, errors);
  const risks = indexRecords(manifest.risks, "risks", /^RISK-\d+$/u, RECORD_STATES.risk, errors);
  const criteria = indexRecords(manifest.criteria, "criteria", /^AC-\d+$/u, RECORD_STATES.criterion, errors);
  const tests = indexRecords(manifest.tests, "tests", /^TEST-\d+$/u, RECORD_STATES.test, errors);
  const gates = indexRecords(manifest.gates, "gates", /^GATE-[A-Z0-9-]+$/u, RECORD_STATES.criterion, errors);
  const units = indexRecords(manifest.units, "units", /^UNIT-\d+$/u, RECORD_STATES.unit, errors);
  const decisions = indexRecords(manifest.decisions, "decisions", /^DEC-AUTO-\d+$/u, RECORD_STATES.decision, errors);
  const authorizationBoundaries = indexRecords(manifest.authorization_boundaries, "authorization_boundaries", /^AUTH-\d+$/u, RECORD_STATES.boundary, errors);
  const evidence = indexRecords(manifest.evidence_index, "evidence_index", /^EVID-\d+$/u, RECORD_STATES.evidence, errors);
  const slices = indexRecords(manifest.ready_slices, "ready_slices", /^SLICE-\d+$/u, null, errors);

  await validateEstimateRuntimeExtension({ manifest, root, artifacts, evidence, units, errors });

  if (write) {
    for (const source of sources.values()) {
      if (source.status === "CURRENT" && changedArtifactPaths.has(source.artifact_path)) {
        errors.push(`artifacts: ${source.artifact_path} changed while ${source.id}=CURRENT; mark the source STALE and attach fresh proof before refreshing its hash`);
      }
    }
    const canonicalCarriesClosedClaims = [...units.values()].some((unit) => unit.status === "VERIFIED")
      || [...criteria.values(), ...gates.values()].some((record) => ["PASS", "BOUNDARY"].includes(record.status))
      || [...tests.values()].some((test) => test.status === "PASS")
      || ["IMPLEMENTATION_READY", "CONDITIONALLY_READY"].includes(manifest.package_status)
      || manifest.implementation_status !== "NOT_STARTED"
      || ["ACHIEVED", "AUTH_BLOCKED"].includes(manifest.terminal_status);
    if (changedArtifactPaths.has(canonical) && canonicalCarriesClosedClaims) {
      errors.push(`artifacts: ${canonical} changed after closed claims; invalidate and re-prove dependent claims before refreshing its hash`);
    }

    const proofBearingRecords = [
      ...[...requirements.values()].filter((record) => record.status === "ACCEPTED"),
      ...[...assumptions.values()].filter((record) => ["VALIDATED", "RETIRED"].includes(record.status)),
      ...[...risks.values()].filter((record) => ["MITIGATED", "ACCEPTED", "CLOSED"].includes(record.status)),
      ...[...criteria.values(), ...gates.values()].filter((record) => ["PASS", "BOUNDARY", "N/A"].includes(record.status)),
      ...[...tests.values()].filter((record) => ["PASS", "SKIPPED"].includes(record.status)),
      ...[...units.values()].filter((record) => ["READY", "IN_PROGRESS", "DONE", "VERIFIED"].includes(record.status)),
      ...[...decisions.values()].filter((record) => record.status === "ACTIVE"),
      ...[...authorizationBoundaries.values()].filter((record) => ["ACTIVE", "RESOLVED"].includes(record.status)),
    ];
    const proofIdsByPath = new Map();
    for (const record of proofBearingRecords) {
      if (!proofIdsByPath.has(record.artifact_path)) proofIdsByPath.set(record.artifact_path, []);
      proofIdsByPath.get(record.artifact_path).push(record.id);
    }
    for (const [path, ids] of proofIdsByPath) {
      if (changedArtifactPaths.has(path)) {
        errors.push(`artifacts: ${path} changed while carrying proof-bearing records ${ids.join(", ")}; invalidate and re-prove them before refreshing its hash`);
      }
    }
  }

  const traceIndexes = [sources, requirements, assumptions, risks, criteria, tests, gates, units, decisions, authorizationBoundaries, evidence];
  const allTraceRecords = new Map(traceIndexes.flatMap((index) => [...index]));
  const artifactBackedIndexes = [sources, requirements, assumptions, risks, criteria, tests, gates, units, decisions, authorizationBoundaries, evidence];
  for (const index of artifactBackedIndexes) {
    for (const record of index.values()) {
      if (!artifactByPath.has(record.artifact_path)) {
        errors.push(`${record.id}: references missing artifact ${JSON.stringify(record.artifact_path)}`);
      }
    }
  }

  const links = {
    requirementCriteria: new Map(),
    requirementSources: new Map(),
    requirementUnits: new Map(),
    recordEvidence: new Map(),
    sliceUnits: new Map(),
    unitEvidence: new Map(),
  };
  const unitEdges = new Map();

  for (const source of sources.values()) {
    const affectedIds = expectStringArray(source, "affected_ids", `sources: ${source.id}`, errors, { minimum: 1, pattern: TRACE_ID_PATTERN });
    expectReferences(affectedIds, allTraceRecords, `sources: ${source.id}`, errors);
    for (const affectedId of affectedIds) {
      const requirement = requirements.get(affectedId);
      if (requirement && !includesString(requirement, "source_ids", source.id)) {
        errors.push(`traceability: ${source.id} -> ${affectedId} is not reciprocal`);
      }
    }
  }

  for (const requirement of requirements.values()) {
    if (requirement.completion_role !== undefined && !["CORE", "AUXILIARY"].includes(requirement.completion_role)) {
      errors.push(`requirements: ${requirement.id}.completion_role expected CORE or AUXILIARY`);
    }
    const minimum = requirement.status === "ACCEPTED" ? 1 : 0;
    const sourceIds = expectStringArray(requirement, "source_ids", `requirements: ${requirement.id}`, errors, { minimum, pattern: /^SRC-\d+$/u });
    const unitIds = expectStringArray(requirement, "unit_ids", `requirements: ${requirement.id}`, errors, { minimum, pattern: /^UNIT-\d+$/u });
    const criterionIds = expectStringArray(requirement, "criterion_ids", `requirements: ${requirement.id}`, errors, { minimum, pattern: /^AC-\d+$/u });
    expectReferences(sourceIds, sources, `requirements: ${requirement.id}`, errors);
    expectReferences(unitIds, units, `requirements: ${requirement.id}`, errors);
    expectReferences(criterionIds, criteria, `requirements: ${requirement.id}`, errors);
    for (const sourceId of sourceIds) {
      if (!includesString(sources.get(sourceId), "affected_ids", requirement.id)) {
        errors.push(`traceability: ${requirement.id} -> ${sourceId} is not reciprocal`);
      }
    }
    links.requirementSources.set(requirement.id, sourceIds);
    links.requirementUnits.set(requirement.id, unitIds);
    links.requirementCriteria.set(requirement.id, criterionIds);
  }

  for (const assumption of assumptions.values()) {
    const affectedIds = expectStringArray(assumption, "affected_ids", `assumptions: ${assumption.id}`, errors, { minimum: 1, pattern: TRACE_ID_PATTERN });
    expectReferences(affectedIds, allTraceRecords, `assumptions: ${assumption.id}`, errors);
  }

  for (const risk of risks.values()) {
    const unitIds = expectStringArray(risk, "unit_ids", `risks: ${risk.id}`, errors, { minimum: 1, pattern: /^UNIT-\d+$/u });
    const criterionIds = expectStringArray(risk, "criterion_ids", `risks: ${risk.id}`, errors, { minimum: 1, pattern: /^AC-\d+$/u });
    expectReferences(unitIds, units, `risks: ${risk.id}`, errors);
    expectReferences(criterionIds, criteria, `risks: ${risk.id}`, errors);
  }

  const usesConditionalTestGate = manifest.suite_version === "2026-07-11";
  const cheapestExistingTestIds = new Set();
  const cheapestExistingTestPaths = new Set();
  let cheapestExistingTestCriteria = 0;

  for (const criterion of criteria.values()) {
    const requirementIds = expectStringArray(criterion, "requirement_ids", `criteria: ${criterion.id}`, errors, { minimum: 1, pattern: REQUIREMENT_ID_PATTERN });
    const testRequirement = criterion.test_requirement;
    const testTrigger = criterion.test_trigger;
    const testRationale = usesConditionalTestGate
      ? expectNonEmptyString(criterion, "test_rationale", `criteria: ${criterion.id}`, errors)
      : null;
    if (usesConditionalTestGate && !TEST_REQUIREMENTS.has(testRequirement)) {
      errors.push(`criteria: ${criterion.id}.test_requirement expected NOT_REQUIRED, TARGETED, BROADER, or TEST_TASK`);
    }
    if (usesConditionalTestGate && !TEST_TRIGGERS.has(testTrigger)) {
      errors.push(`criteria: ${criterion.id}.test_trigger expected NONE, EXPLICIT_TEST_TASK, MVP_CRITICAL_INVARIANT, or CHEAPEST_DECISIVE_EXISTING_TEST`);
    }
    if (usesConditionalTestGate && testRationale && testRationale.trim().length < 20) {
      errors.push(`criteria: ${criterion.id}.test_rationale must explain the selected evidence path`);
    }
    if (usesConditionalTestGate && testRequirement === "NOT_REQUIRED" && testTrigger !== "NONE") {
      errors.push(`criteria: ${criterion.id} NOT_REQUIRED must use test_trigger NONE`);
    }
    if (usesConditionalTestGate && testRequirement !== "NOT_REQUIRED" && testTrigger === "NONE") {
      errors.push(`criteria: ${criterion.id} ${testRequirement} requires an explicit test trigger`);
    }
    if (usesConditionalTestGate && testRequirement === "TEST_TASK" && testTrigger !== "EXPLICIT_TEST_TASK") {
      errors.push(`criteria: ${criterion.id} TEST_TASK requires test_trigger EXPLICIT_TEST_TASK`);
    }
    if (usesConditionalTestGate && testTrigger === "EXPLICIT_TEST_TASK" && testRequirement !== "TEST_TASK") {
      errors.push(`criteria: ${criterion.id} EXPLICIT_TEST_TASK requires test_requirement TEST_TASK`);
    }
    if (
      usesConditionalTestGate &&
      testRequirement === "TARGETED" &&
      testTrigger !== "MVP_CRITICAL_INVARIANT" &&
      testTrigger !== "CHEAPEST_DECISIVE_EXISTING_TEST"
    ) {
      errors.push(`criteria: ${criterion.id} TARGETED requires test_trigger MVP_CRITICAL_INVARIANT or CHEAPEST_DECISIVE_EXISTING_TEST`);
    }
    if (usesConditionalTestGate && testRequirement === "BROADER" && testTrigger !== "MVP_CRITICAL_INVARIANT") {
      errors.push(`criteria: ${criterion.id} BROADER requires test_trigger MVP_CRITICAL_INVARIANT`);
    }
    if (
      usesConditionalTestGate &&
      testTrigger === "CHEAPEST_DECISIVE_EXISTING_TEST" &&
      testRequirement !== "TARGETED"
    ) {
      errors.push(`criteria: ${criterion.id} CHEAPEST_DECISIVE_EXISTING_TEST requires test_requirement TARGETED`);
    }
    if (
      usesConditionalTestGate &&
      testTrigger === "CHEAPEST_DECISIVE_EXISTING_TEST" &&
      testRationale &&
      !(/existing/i.test(testRationale) && /cheapest/i.test(testRationale) && /decisive/i.test(testRationale))
    ) {
      errors.push(`criteria: ${criterion.id} CHEAPEST_DECISIVE_EXISTING_TEST rationale must identify the existing test as the cheapest decisive proof`);
    }
    if (
      usesConditionalTestGate &&
      testTrigger === "MVP_CRITICAL_INVARIANT" &&
      testRationale &&
      !(
        /critical/i.test(testRationale) &&
        /invariant/i.test(testRationale) &&
        /cheaper|non-test/i.test(testRationale) &&
        /insufficient|cannot|does not|not enough|unable/i.test(testRationale)
      )
    ) {
      errors.push(`criteria: ${criterion.id} MVP_CRITICAL_INVARIANT rationale must name the critical invariant and explain why cheaper evidence is insufficient`);
    }
    if (
      usesConditionalTestGate &&
      testRequirement === "BROADER" &&
      testRationale &&
      !(/targeted/i.test(testRationale) && /insufficient|cannot|does not|not enough/i.test(testRationale))
    ) {
      errors.push(`criteria: ${criterion.id} BROADER must explain why targeted evidence is insufficient`);
    }
    const requiresTests = usesConditionalTestGate
      ? criterion.status !== "N/A" && testRequirement !== "NOT_REQUIRED"
      : criterion.status !== "N/A";
    const testIds = expectStringArray(criterion, "test_ids", `criteria: ${criterion.id}`, errors, { minimum: requiresTests ? 1 : 0, pattern: /^TEST-\d+$/u });
    const evidenceIds = expectStringArray(criterion, "evidence_ids", `criteria: ${criterion.id}`, errors, { minimum: criterion.status === "N/A" ? 0 : 1, pattern: /^EVID-\d+$/u });
    expectReferences(requirementIds, requirements, `criteria: ${criterion.id}`, errors);
    expectReferences(testIds, tests, `criteria: ${criterion.id}`, errors);
    expectReferences(evidenceIds, evidence, `criteria: ${criterion.id}`, errors);
    links.recordEvidence.set(criterion.id, evidenceIds);
    if (usesConditionalTestGate && testRequirement === "NOT_REQUIRED" && testIds.length > 0) {
      errors.push(`criteria: ${criterion.id} test_ids must be empty when test_requirement is NOT_REQUIRED`);
    }
    if (usesConditionalTestGate && testTrigger === "CHEAPEST_DECISIVE_EXISTING_TEST" && testIds.length !== 1) {
      errors.push(`criteria: ${criterion.id} CHEAPEST_DECISIVE_EXISTING_TEST requires exactly one test_id`);
    }
    if (usesConditionalTestGate && criterion.status === "N/A" && testRequirement !== "NOT_REQUIRED") {
      errors.push(`criteria: ${criterion.id} must use test_requirement NOT_REQUIRED when status is N/A`);
    }
    if (usesConditionalTestGate && criterion.status === "PASS" && requiresTests) {
      for (const testId of testIds) {
        if (tests.get(testId)?.status !== "PASS") {
          errors.push(`criteria: ${criterion.id}=PASS requires ${testId}=PASS`);
        }
      }
    }
    if (usesConditionalTestGate && testTrigger === "CHEAPEST_DECISIVE_EXISTING_TEST" && testIds.length === 1) {
      const testRecord = tests.get(testIds[0]);
      cheapestExistingTestCriteria += 1;
      cheapestExistingTestIds.add(testIds[0]);
      if (typeof testRecord?.existing_test_path === "string" && testRecord.existing_test_path.trim()) {
        cheapestExistingTestPaths.add(testRecord.existing_test_path);
      }
    }
    if (criterion.status === "BOUNDARY") {
      const boundary = authorizationBoundaries.get(criterion.authorization_boundary_id);
      if (boundary?.status !== "ACTIVE") {
        errors.push(`criteria: ${criterion.id} requires an active authorization_boundary_id`);
      } else if (!includesString(boundary, "affected_ids", criterion.id)) {
        errors.push(`traceability: ${criterion.id} -> ${boundary.id} is not reciprocal`);
      }
    } else if (criterion.authorization_boundary_id !== null) {
      errors.push(`criteria: ${criterion.id} authorization_boundary_id must be null unless status is BOUNDARY`);
    }
  }

  if (usesConditionalTestGate && cheapestExistingTestCriteria > 0) {
    if (cheapestExistingTestIds.size !== 1 || cheapestExistingTestPaths.size !== 1) {
      errors.push("criteria: CHEAPEST_DECISIVE_EXISTING_TEST permits exactly one shared test_id and existing_test_path per plan pack");
    }
    for (const testId of cheapestExistingTestIds) {
      const testRecord = tests.get(testId);
      if (testRecord) await validateExistingTestIdentity(testRecord, manifest.baseline, errors);
    }
  }

  for (const testRecord of tests.values()) {
    const criterionIds = expectStringArray(testRecord, "criterion_ids", `tests: ${testRecord.id}`, errors, { minimum: 1, pattern: /^AC-\d+$/u });
    const evidenceIds = expectStringArray(testRecord, "evidence_ids", `tests: ${testRecord.id}`, errors, { minimum: testRecord.status === "SKIPPED" ? 0 : 1, pattern: /^EVID-\d+$/u });
    expectReferences(criterionIds, criteria, `tests: ${testRecord.id}`, errors);
    expectReferences(evidenceIds, evidence, `tests: ${testRecord.id}`, errors);
    links.recordEvidence.set(testRecord.id, evidenceIds);
  }

  for (const gate of gates.values()) {
    const criterionIds = expectStringArray(gate, "criterion_ids", `gates: ${gate.id}`, errors, { minimum: 1, pattern: /^AC-\d+$/u });
    const evidenceIds = expectStringArray(gate, "evidence_ids", `gates: ${gate.id}`, errors, { minimum: gate.status === "N/A" ? 0 : 1, pattern: /^EVID-\d+$/u });
    expectReferences(criterionIds, criteria, `gates: ${gate.id}`, errors);
    expectReferences(evidenceIds, evidence, `gates: ${gate.id}`, errors);
    links.recordEvidence.set(gate.id, evidenceIds);
    if (gate.status === "BOUNDARY") {
      const boundary = authorizationBoundaries.get(gate.authorization_boundary_id);
      if (boundary?.status !== "ACTIVE") {
        errors.push(`gates: ${gate.id} requires an active authorization_boundary_id`);
      } else if (!includesString(boundary, "affected_ids", gate.id)) {
        errors.push(`traceability: ${gate.id} -> ${boundary.id} is not reciprocal`);
      }
    } else if (gate.authorization_boundary_id !== null) {
      errors.push(`gates: ${gate.id} authorization_boundary_id must be null unless status is BOUNDARY`);
    }
  }

  for (const unit of units.values()) {
    const minimum = unit.status === "SUPERSEDED" ? 0 : 1;
    const dependencies = expectStringArray(unit, "depends_on", `units: ${unit.id}`, errors, { pattern: /^UNIT-\d+$/u });
    const requirementIds = expectStringArray(unit, "requirement_ids", `units: ${unit.id}`, errors, { minimum, pattern: REQUIREMENT_ID_PATTERN });
    const riskIds = expectStringArray(unit, "risk_ids", `units: ${unit.id}`, errors, { pattern: /^RISK-\d+$/u });
    const evidenceIds = expectStringArray(unit, "evidence_ids", `units: ${unit.id}`, errors, { minimum, pattern: /^EVID-\d+$/u });
    expectReferences(requirementIds, requirements, `units: ${unit.id}`, errors);
    expectReferences(riskIds, risks, `units: ${unit.id}`, errors);
    expectReferences(evidenceIds, evidence, `units: ${unit.id}`, errors);
    unitEdges.set(unit.id, dependencies);
    links.unitEvidence.set(unit.id, evidenceIds);
  }
  validateDag(unitEdges, errors);

  for (const decision of decisions.values()) {
    const affectedIds = expectStringArray(decision, "affected_ids", `decisions: ${decision.id}`, errors, { minimum: 1, pattern: TRACE_ID_PATTERN });
    expectReferences(affectedIds, allTraceRecords, `decisions: ${decision.id}`, errors);
  }
  for (const boundary of authorizationBoundaries.values()) {
    const affectedIds = expectStringArray(boundary, "affected_ids", `authorization_boundaries: ${boundary.id}`, errors, { minimum: 1, pattern: TRACE_ID_PATTERN });
    expectReferences(affectedIds, allTraceRecords, `authorization_boundaries: ${boundary.id}`, errors);
    if (
      boundary.status === "ACTIVE"
      && ![...criteria.values(), ...gates.values()].some(
        (record) => record.status === "BOUNDARY" && record.authorization_boundary_id === boundary.id,
      )
    ) {
      errors.push(`authorization_boundaries: ${boundary.id} is ACTIVE but has no BOUNDARY criterion or gate`);
    }
  }

  for (const slice of slices.values()) {
    const memberIds = expectStringArray(slice, "unit_ids", `ready_slices: ${slice.id}`, errors, { minimum: 1, pattern: /^UNIT-\d+$/u });
    links.sliceUnits.set(slice.id, memberIds);
    expectReferences(memberIds, units, `ready_slices: ${slice.id}`, errors);
    if (!memberIds.some((unitId) => ["READY", "IN_PROGRESS"].includes(units.get(unitId)?.status))) {
      errors.push(`ready_slices: ${slice.id} has no READY or IN_PROGRESS unit`);
    }
    for (const unitId of memberIds) {
      const unitStatus = units.get(unitId)?.status;
      const runtimeSpec = ESTIMATE_RUNTIME_PROJECTIONS.find(
        (row) => row.unit_id === unitId && row.relationship === "PRIMARY",
      );
      const estimateSupersession = manifest.runtime_evidence?.contract_version === ESTIMATE_RUNTIME_CONTRACT
        && unitStatus === "SUPERSEDED"
        && ["UNIT-005", "UNIT-006", "UNIT-007", "UNIT-008", "UNIT-009"].includes(unitId)
        && manifest.next_unit !== unitId
        && evidence.get(runtimeSpec?.evidence_id)?.status === "PASS"
        && evidence.get("EVID-013")?.status === "PASS";
      if (!["VERIFIED", "READY", "IN_PROGRESS"].includes(unitStatus) && !estimateSupersession) {
        errors.push(`ready_slices: ${slice.id} includes ${unitId}=${unitStatus}, expected VERIFIED, decision-backed SUPERSEDED, READY, or IN_PROGRESS`);
      }
    }
    const members = new Set(memberIds);
    for (const unitId of memberIds) {
      for (const dependency of transitiveDependencies(unitId, unitEdges)) {
        if (!members.has(dependency)) {
          errors.push(`ready_slices: ${slice.id} omits dependency ${dependency} for ${unitId}`);
        }
      }
    }
  }

  const readySliceUnitIds = new Set([...links.sliceUnits.values()].flat());
  for (const requirement of requirements.values()) {
    const isCoreRequirement = requirement.completion_role !== "AUXILIARY";
    const appliesToAdvertisedWork = manifest.package_status === "IMPLEMENTATION_READY"
      || (manifest.package_status === "CONDITIONALLY_READY"
        && (links.requirementUnits.get(requirement.id) ?? []).some((unitId) => readySliceUnitIds.has(unitId)));
    if (
      isCoreRequirement
      && requirement.status === "ACCEPTED"
      && appliesToAdvertisedWork
      && !(links.requirementSources.get(requirement.id) ?? []).some((sourceId) => sources.get(sourceId)?.status === "CURRENT")
    ) {
      errors.push(`requirements: ${requirement.id} requires at least one CURRENT source for advertised ready work`);
    }
  }

  const nowMs = now instanceof Date ? now.getTime() : Number(now);
  for (const record of evidence.values()) {
    const claimIds = expectStringArray(record, "claim_ids", `evidence_index: ${record.id}`, errors, { minimum: 1, pattern: TRACE_ID_PATTERN });
    expectReferences(claimIds, allTraceRecords, `evidence_index: ${record.id}`, errors);
    expectNonEmptyString(record, "source_revision", `evidence_index: ${record.id}`, errors);
    if (!Object.hasOwn(record, "valid_until")) {
      errors.push(`evidence_index: ${record.id} requires valid_until`);
    } else if (record.valid_until !== null) {
      const validUntil = parseStrictIso(record.valid_until);
      if (validUntil === null) {
        errors.push(`evidence_index: ${record.id} has invalid valid_until ${JSON.stringify(record.valid_until)}`);
      } else if (Number.isFinite(nowMs) && validUntil < nowMs && record.status !== "STALE") {
        errors.push(`evidence_index: ${record.id} is stale as of ${record.valid_until}`);
      }
    }

    const digest = artifactDigestByPath.get(record.artifact_path);
    if (digest && (!SHA256_PATTERN.test(record.sha256 ?? "") || record.sha256 !== digest)) {
      errors.push(`evidence_index: ${record.id} hash mismatch; mark STALE or attach a fresh proof receipt before updating it`);
    }
  }

  for (const requirement of requirements.values()) {
    for (const unitId of Array.isArray(requirement.unit_ids) ? requirement.unit_ids : []) {
      if (!includesString(units.get(unitId), "requirement_ids", requirement.id)) {
        errors.push(`traceability: ${requirement.id} -> ${unitId} is not reciprocal`);
      }
    }
    for (const criterionId of Array.isArray(requirement.criterion_ids) ? requirement.criterion_ids : []) {
      if (!includesString(criteria.get(criterionId), "requirement_ids", requirement.id)) {
        errors.push(`traceability: ${requirement.id} -> ${criterionId} is not reciprocal`);
      }
    }
  }
  for (const risk of risks.values()) {
    for (const unitId of Array.isArray(risk.unit_ids) ? risk.unit_ids : []) {
      if (!includesString(units.get(unitId), "risk_ids", risk.id)) {
        errors.push(`traceability: ${risk.id} -> ${unitId} is not reciprocal`);
      }
    }
  }
  for (const unit of units.values()) {
    for (const requirementId of Array.isArray(unit.requirement_ids) ? unit.requirement_ids : []) {
      if (!includesString(requirements.get(requirementId), "unit_ids", unit.id)) {
        errors.push(`traceability: ${unit.id} -> ${requirementId} is not reciprocal`);
      }
    }
    for (const riskId of Array.isArray(unit.risk_ids) ? unit.risk_ids : []) {
      if (!includesString(risks.get(riskId), "unit_ids", unit.id)) {
        errors.push(`traceability: ${unit.id} -> ${riskId} is not reciprocal`);
      }
    }
  }
  for (const criterion of criteria.values()) {
    for (const testId of Array.isArray(criterion.test_ids) ? criterion.test_ids : []) {
      if (!includesString(tests.get(testId), "criterion_ids", criterion.id)) {
        errors.push(`traceability: ${criterion.id} -> ${testId} is not reciprocal`);
      }
    }
  }
  for (const testRecord of tests.values()) {
    for (const criterionId of Array.isArray(testRecord.criterion_ids) ? testRecord.criterion_ids : []) {
      if (!includesString(criteria.get(criterionId), "test_ids", testRecord.id)) {
        errors.push(`traceability: ${testRecord.id} -> ${criterionId} is not reciprocal`);
      }
    }
  }
  for (const [recordId, evidenceIds] of [...links.unitEvidence, ...links.recordEvidence]) {
    for (const evidenceId of evidenceIds) {
      if (!includesString(evidence.get(evidenceId), "claim_ids", recordId)) {
        errors.push(`traceability: ${recordId} -> ${evidenceId} is not reciprocal`);
      }
    }
  }

  validateTerminalSemantics(
    manifest,
    { authorizationBoundaries, criteria, evidence, gates, requirements, risks, slices, tests, units },
    links,
    errors,
  );

  if (write) {
    if (errors.length === 0) {
      for (const artifact of artifacts.values()) {
        artifact.sha256 = artifactDigestByPath.get(artifact.path);
      }
      manifest.manifest_sha256 = sha256(canonicalManifestBytes(manifest));
      await atomicWriteJson(manifestPath, manifest);
    }
  } else {
    const digest = sha256(canonicalManifestBytes(manifest));
    if (!SHA256_PATTERN.test(manifest.manifest_sha256 ?? "") || manifest.manifest_sha256 !== digest) {
      errors.push("manifest_sha256: hash mismatch");
    }
  }

  return { ok: errors.length === 0, errors, manifest };
}
