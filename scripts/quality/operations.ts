import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import {
  finishCli,
  flagString,
  makeResult,
  parseArgs,
  qualityRoot,
  readJson,
  type QualityFinding,
} from "./common";
import { PROFILES, type QualityProfile } from "./classifier-core";
import {
  operationsVerdict,
  selectOperationsChecks,
  statusForUnexecutedCheck,
  validateBundleBudgetArtifact,
  validateOperationsPolicy,
  validateOperationsProfileSelection,
  type OperationCheckStatus,
  type OperationsPolicy,
  type OperationsPolicyCheck,
  type OperationsSelection,
} from "./operations-core";

interface ClassificationArtifact {
  status: string;
  data?: {
    profile?: QualityProfile;
    files?: string[];
    affected_capabilities?: string[];
  };
}

interface CommandEvidenceArtifact {
  kind?: string;
  status?: string;
  data?: {
    evidence_id?: string | null;
    command_text?: string;
    stdout_tail?: string;
  };
}

interface OperationCheckResult {
  id: string;
  label: string;
  kind: "local" | "external";
  status: OperationCheckStatus;
  required: boolean;
  provenance: string;
  reasons: string[];
  command: string | null;
  exit_code: number | null;
  duration_ms: number | null;
  stdout_tail: string;
  stderr_tail: string;
  artifacts: string[];
  message: string;
}

function normalizedRelative(root: string, path: string): string {
  return relative(root, path).split(sep).join("/");
}

async function writeSyntheticRouteBenchmark(path: string): Promise<void> {
  await mkdir(resolve(path, ".."), { recursive: true });
  const runs = [1, 2, 3].map((run) => ({
    run,
    durationMs: 120,
    overlayVisible: false,
    rscRequestCount: 1,
    finalPathname: "/",
  }));
  await writeFile(
    path,
    `${JSON.stringify({
      generatedAt: new Date().toISOString(),
      baseUrl: "http://synthetic.invalid",
      authMode: "synthetic-local-contract",
      networkProfile: "synthetic",
      runsPerScenario: runs.length,
      results: [{
        scenario: "Public: Synthetic Route Readiness Contract",
        from: "/",
        expectedPathname: "/",
        networkProfile: "synthetic",
        runs,
        failures: [],
        medianMs: 120,
        overlayVisibilityRate: 0,
        rscRequestCount: 1,
      }],
    }, null, 2)}\n`,
    "utf8",
  );
}

async function writeSyntheticQueryTrace(path: string): Promise<void> {
  await mkdir(resolve(path, ".."), { recursive: true });
  const lines = [1, 2, 3].map((sample) =>
    `[perf-json] ${JSON.stringify({
      requestId: `synthetic-${sample}`,
      scope: "workshop.dashboard",
      databaseRoundTrips: 2,
      timings: [
        {
          label: "workshop.dashboard.projects",
          kind: "database",
          elapsedMs: 5,
          operation: "select",
          relation: "projects",
        },
        {
          label: "workshop.dashboard.estimates",
          kind: "database",
          elapsedMs: 7,
          operation: "select",
          relation: "estimates",
        },
      ],
    })}`
  );
  await writeFile(path, `${lines.join("\n")}\n`, "utf8");
}

function runCommand(
  root: string,
  command: string,
  args: string[],
  env: Record<string, string>,
): Omit<OperationCheckResult, "id" | "label" | "kind" | "status" | "required" | "provenance" | "reasons" | "artifacts" | "message"> {
  const started = performance.now();
  const run = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    timeout: 10 * 60_000,
    maxBuffer: 20 * 1024 * 1024,
    env: { ...process.env, ...env },
  });
  return {
    command: [command, ...args].join(" "),
    exit_code: run.status,
    duration_ms: Math.round(performance.now() - started),
    stdout_tail: run.stdout?.slice(-20_000) ?? "",
    stderr_tail: run.stderr?.slice(-20_000) ?? "",
  };
}

async function executeLocalCheck(
  root: string,
  check: OperationsPolicyCheck,
  selection: OperationsSelection,
  bundleArtifactPath: string,
): Promise<OperationCheckResult> {
  const performanceDirectory = resolve(root, "artifacts/performance");
  const observabilityDirectory = resolve(root, "artifacts/observability");
  const migrationsDirectory = resolve(root, "artifacts/migrations");
  await Promise.all([
    mkdir(performanceDirectory, { recursive: true }),
    mkdir(observabilityDirectory, { recursive: true }),
    mkdir(migrationsDirectory, { recursive: true }),
  ]);

  let execution: ReturnType<typeof runCommand>;
  let artifacts: string[] = [];
  let message = "Local check passed";

  switch (check.id) {
    case "route_readiness_contract": {
      const benchmark = resolve(performanceDirectory, "route-readiness.synthetic.json");
      const report = resolve(performanceDirectory, "route-readiness.contract.json");
      await writeSyntheticRouteBenchmark(benchmark);
      execution = runCommand(
        root,
        "bun",
        ["run", "scripts/check-route-transition-readiness.ts"],
        {
          ROUTE_TRANSITION_BENCHMARK_FILE: benchmark,
          OUTPUT_FILE: report,
        },
      );
      artifacts = [benchmark, report];
      message = "Existing route-readiness evaluator accepted the deterministic local fixture; this is evaluator wiring proof, not measured route performance";
      break;
    }
    case "bundle_budget": {
      let artifact: CommandEvidenceArtifact | undefined;
      let error: string | undefined;
      try {
        artifact = await readJson<CommandEvidenceArtifact>(bundleArtifactPath);
      } catch (caught) {
        error = String(caught);
      }
      const valid = artifact ? validateBundleBudgetArtifact(artifact) : false;
      execution = {
        command: "consume strict bundle-budget command evidence from build job",
        exit_code: valid ? 0 : 1,
        duration_ms: 0,
        stdout_tail: artifact?.data?.stdout_tail?.slice(-20_000) ?? "",
        stderr_tail: error ?? "",
      };
      artifacts = [bundleArtifactPath];
      message = valid
        ? "Strict bundle budget passed in the build job"
        : "Applicable bundle evidence is missing, malformed, non-strict, or not a PASS; operations does not rebuild";
      break;
    }
    case "query_count_contract": {
      const trace = resolve(performanceDirectory, "dashboard-query-count.synthetic.log");
      const report = resolve(performanceDirectory, "dashboard-query-count.contract.json");
      await writeSyntheticQueryTrace(trace);
      execution = runCommand(
        root,
        "bun",
        ["run", "scripts/measure-workshop-dashboard-query-count.ts"],
        { PERF_TRACE_INPUT: trace, OUTPUT_FILE: report },
      );
      artifacts = [trace, report];
      message = "Existing query-count collector accepted the deterministic local fixture; this is collector wiring proof, not a live query budget";
      break;
    }
    case "d1_migration_state": {
      execution = runCommand(
        root,
        "bun",
        ["run", "scripts/check-cloudflare-d1-migrations.ts", "--local"],
        { OUTPUT_FILE: resolve(migrationsDirectory, "d1-migration-state.json") },
      );
      artifacts = [];
      break;
    }
    case "platform_readiness": {
      const report = resolve(observabilityDirectory, "cloudflare-worker-readiness.json");
      execution = runCommand(
        root,
        "bun",
        ["run", "cf:check-readiness"],
        { OUTPUT_FILE: report },
      );
      artifacts = [report];
      message = "Local source/config readiness passed; hosted resources and secrets remain outside this proof";
      break;
    }
    case "observability_contract": {
      const report = resolve(observabilityDirectory, "alert-scenario-readiness.json");
      execution = runCommand(
        root,
        "bun",
        ["run", "ops:check-alert-scenarios", "--", "--catalog-only", "--output", report],
        {},
      );
      artifacts = [report];
      message = "Local alert scenario catalog passed; alert delivery remains external";
      break;
    }
    case "redaction_contract": {
      const report = resolve(observabilityDirectory, "error-handling-contract.json");
      execution = runCommand(
        root,
        "bun",
        ["run", "ops:check-error-handling", "--", "--output", report],
        {},
      );
      artifacts = [report];
      break;
    }
    default:
      execution = {
        command: null,
        exit_code: 1,
        duration_ms: 0,
        stdout_tail: "",
        stderr_tail: `No local executor is registered for ${check.id}`,
      };
      message = `No local executor is registered for ${check.id}`;
  }

  return {
    id: check.id,
    label: check.label,
    kind: check.kind,
    status: execution.exit_code === 0 ? "PASS" : "FAIL",
    required: selection.required,
    provenance: check.provenance,
    reasons: selection.reasons,
    ...execution,
    artifacts: artifacts.map((path) => normalizedRelative(root, path)),
    message,
  };
}

const { flags } = parseArgs();
const root = qualityRoot();
const outputPath = resolve(
  root,
  flagString(flags, "output", "artifacts/quality/operations.json")!,
);
const classificationPath = resolve(
  root,
  flagString(flags, "classification", "artifacts/quality/classification.json")!,
);
const policyPath = resolve(
  root,
  flagString(flags, "policy", "quality/operations-policy.json")!,
);
const bundleArtifactPath = resolve(
  root,
  flagString(flags, "bundle-artifact", "artifacts/quality/bundle-budget.json")!,
);
const findings: QualityFinding[] = [];

let classification: ClassificationArtifact | undefined;
try {
  classification = await readJson<ClassificationArtifact>(classificationPath);
} catch (error) {
  findings.push({
    code: "OPERATIONS_CLASSIFICATION_MISSING",
    message: `Operations requires a valid classification artifact: ${String(error)}`,
    path: normalizedRelative(root, classificationPath),
  });
}
if (classification && classification.status !== "PASS") {
  findings.push({
    code: "OPERATIONS_CLASSIFICATION_NOT_GREEN",
    message: "Operations refuses a non-passing classification artifact",
  });
}

const requestedProfile = flagString(flags, "profile") as QualityProfile | undefined;
let profile = requestedProfile;
profile ??= classification?.data?.profile;
if (!profile || !PROFILES.includes(profile)) {
  findings.push({
    code: "OPERATIONS_PROFILE_INVALID",
    message: `Operations requires a valid quality profile; received ${String(profile)}`,
  });
  profile = "Q2_CRITICAL_CHANGE_GATE";
}
const profileSelectionError = validateOperationsProfileSelection(
  requestedProfile,
  classification?.data?.profile,
);
if (profileSelectionError) {
  findings.push({
    code: "OPERATIONS_PROFILE_DOWNGRADE_REJECTED",
    message: profileSelectionError,
  });
}

let policy: OperationsPolicy | undefined;
try {
  policy = await readJson<OperationsPolicy>(policyPath);
  const policyErrors = validateOperationsPolicy(policy);
  if (policyErrors.length > 0) throw new Error(policyErrors.join("; "));
} catch (error) {
  findings.push({
    code: "OPERATIONS_POLICY_MALFORMED",
    message: `Operations policy is missing or malformed: ${String(error)}`,
    path: normalizedRelative(root, policyPath),
  });
}

const selections = policy
  ? selectOperationsChecks(
      profile,
      classification?.data?.files ?? [],
      classification?.data?.affected_capabilities ?? [],
      policy,
    )
  : [];
const checks: OperationCheckResult[] = [];

if (policy) {
  for (const check of policy.checks) {
    const selection = selections.find((candidate) => candidate.id === check.id)!;
    const unexecutedStatus = statusForUnexecutedCheck(check, selection);
    if (!selection.applicable || check.kind === "external" || flags.has("plan")) {
      checks.push({
        id: check.id,
        label: check.label,
        kind: check.kind,
        status: unexecutedStatus,
        required: selection.required,
        provenance: check.provenance,
        reasons: selection.reasons,
        command: null,
        exit_code: null,
        duration_ms: null,
        stdout_tail: "",
        stderr_tail: "",
        artifacts: [],
        message: !selection.applicable
          ? "No changed path, affected capability, or release requirement selected this check"
          : check.kind === "external"
            ? "Credentialed or hosted evidence is outside the local operations gate"
            : "Plan mode selected this local check but did not execute it",
      });
      continue;
    }
    checks.push(await executeLocalCheck(root, check, selection, bundleArtifactPath));
  }
}

for (const check of checks) {
  if (check.required && check.status === "FAIL") {
    findings.push({
      code: "OPERATIONS_CHECK_FAILED",
      message: `${check.id}: ${check.message}`,
      detail: { command: check.command, exit_code: check.exit_code },
    });
  }
  if (check.required && check.status === "EXTERNAL_PENDING") {
    findings.push({
      code: "OPERATIONS_EXTERNAL_PENDING",
      message: `${check.id}: ${check.message}`,
      detail: { provenance: check.provenance },
    });
  }
}

const verdict = flags.has("plan")
  ? "QUALITY_BLOCKED"
  : findings.some((finding) =>
      ["OPERATIONS_CLASSIFICATION_MISSING", "OPERATIONS_CLASSIFICATION_NOT_GREEN", "OPERATIONS_PROFILE_INVALID", "OPERATIONS_PROFILE_DOWNGRADE_REJECTED", "OPERATIONS_POLICY_MALFORMED"].includes(finding.code)
    )
    ? "FAIL"
    : operationsVerdict(profile, checks);
const result = makeResult(
  "quality-operations",
  findings,
  {
    mode: flags.has("plan") ? "plan" : "execute",
    profile,
    classification: normalizedRelative(root, classificationPath),
    policy: normalizedRelative(root, policyPath),
    files: classification?.data?.files ?? [],
    affected_capabilities: classification?.data?.affected_capabilities ?? [],
    checks,
    local_summary: {
      passed: checks.filter((check) => check.status === "PASS").length,
      failed: checks.filter((check) => check.status === "FAIL").length,
      not_applicable: checks.filter((check) => check.status === "NOT_APPLICABLE").length,
      external_pending: checks.filter((check) => check.status === "EXTERNAL_PENDING").length,
    },
  },
  verdict === "PASS"
    ? `Operations PASS: ${checks.filter((check) => check.status === "PASS").length} applicable local check(s)`
    : verdict === "QUALITY_BLOCKED"
      ? "Operations QUALITY_BLOCKED: complete local evidence ran, but required external evidence is pending"
      : `Operations FAIL with ${findings.length} finding(s)`,
  verdict,
);
await finishCli(result, outputPath);
