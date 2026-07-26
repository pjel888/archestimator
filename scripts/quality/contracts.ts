import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import {
  finishCli,
  flagString,
  makeResult,
  parseArgs,
  qualityRoot,
  readJson,
  type QualityFinding,
} from "./common";
import { PROFILES, profileRank, type RiskMap } from "./classifier-core";
import type { ProfilesFile } from "./aggregate-core";
import type { EvidenceCommandMap } from "./traceability-core";
import {
  validateCanonicalBaselineArtifacts,
  type ComponentBaseline,
} from "./component-core";

const { flags } = parseArgs();
const root = resolve(flagString(flags, "root", qualityRoot())!);
const findings: QualityFinding[] = [];
const schemaDirectory = resolve(root, "quality/schemas");
let schemas: string[] = [];
try {
  schemas = (await readdir(schemaDirectory)).filter((path) => path.endsWith(".schema.json"));
  if (schemas.length === 0) throw new Error("no schemas");
  for (const schema of schemas) await readJson(resolve(schemaDirectory, schema));
} catch (error) {
  findings.push({
    code: "SCHEMAS_MALFORMED",
    message: `Quality schemas are missing or malformed: ${String(error)}`,
  });
}

const capabilities = await readJson<{
  schema_version: number;
  capabilities: { id: string; evidence_kinds: string[] }[];
}>(resolve(root, "quality/critical-capabilities.json"));
const expectedCapabilities = [
  "CAP-AUTH",
  "CAP-TENANT",
  "CAP-DATA-INTEGRITY",
  "CAP-CACHE-PRIVACY",
  "CAP-MIGRATION",
  "CAP-COLLABORATION",
  "CAP-UPLOAD",
  "CAP-EXPORT",
  "CAP-AI",
  "CAP-PROVIDER",
  "CAP-UNKNOWN",
].sort();
const capabilityIds = capabilities.capabilities.map((capability) => capability.id).sort();
if (JSON.stringify(capabilityIds) !== JSON.stringify(expectedCapabilities)) {
  findings.push({
    code: "CAPABILITY_REGISTRY",
    message: "Critical capability registry does not match the canonical eleven CAP IDs",
  });
}
if (new Set(capabilityIds).size !== capabilityIds.length) {
  findings.push({ code: "CAPABILITY_DUPLICATE", message: "Capability IDs must be unique" });
}

const riskMap = await readJson<RiskMap>(resolve(root, "quality/risk-map.json"));
for (const rule of riskMap.rules) {
  if (!PROFILES.includes(rule.profile)) {
    findings.push({ code: "RISK_PROFILE", message: `${rule.id} has an invalid profile` });
  }
  if (!rule.patterns.length) {
    findings.push({ code: "RISK_PATTERN", message: `${rule.id} has no path patterns` });
  }
  for (const capability of rule.capabilities ?? []) {
    if (!capabilityIds.includes(capability)) {
      findings.push({
        code: "RISK_CAPABILITY",
        message: `${rule.id} references unknown capability ${capability}`,
      });
    }
  }
}

const thresholds = await readJson<{
  changed_coverage: Record<
    string,
    { statements: number; lines: number; functions: number; branches: number }
  >;
  global_ratchet: {
    allow_regression: boolean;
    baseline_required: boolean;
    baseline_path: string;
    baseline_status: "PENDING" | "ADMITTED";
    legacy_targets: { statements: number; lines: number; functions: number; branches: number };
  };
}>(
  resolve(root, flagString(flags, "thresholds", "quality/thresholds.json")!),
);
for (let index = 0; index < PROFILES.length; index += 1) {
  const profile = PROFILES[index];
  const value = thresholds.changed_coverage[profile];
  if (
    !value ||
    Object.values(value).some((metric) => metric < 0 || metric > 100)
  ) {
    findings.push({ code: "COVERAGE_THRESHOLD", message: `${profile} thresholds are invalid` });
  }
  const prior = index > 0 ? thresholds.changed_coverage[PROFILES[index - 1]] : undefined;
  if (
    prior &&
    Object.keys(value).some(
      (metric) =>
        value[metric as keyof typeof value] < prior[metric as keyof typeof prior],
    )
  ) {
    findings.push({
      code: "THRESHOLD_DOWNGRADE",
      message: `${profile} is weaker than ${PROFILES[index - 1]}`,
    });
  }
}
const q1 = thresholds.changed_coverage.Q1_CHANGE_GATE;
if (q1.lines !== 100 || q1.statements !== 100 || q1.functions !== 100 || q1.branches !== 95) {
  findings.push({
    code: "Q1_COVERAGE_CONTRACT",
    message: "Q1 requires 100% changed statements/lines/functions and 95% changed branches",
  });
}
for (const profile of ["Q2_CRITICAL_CHANGE_GATE", "Q3_RELEASE_GATE"] as const) {
  const critical = thresholds.changed_coverage[profile];
  if (Object.values(critical).some((value) => value !== 100)) {
    findings.push({
      code: "CRITICAL_COVERAGE_CONTRACT",
      message: `${profile} requires 100% changed statements, lines, functions, and branches`,
    });
  }
}
const legacy = thresholds.global_ratchet.legacy_targets;
if (
  JSON.stringify(legacy) !==
    JSON.stringify({ statements: 90, lines: 90, functions: 90, branches: 85 })
) {
  findings.push({
    code: "LEGACY_COVERAGE_TARGETS",
    message: "Legacy coverage targets must remain 90/90/90/85",
  });
}
if (
  thresholds.global_ratchet.allow_regression !== false ||
  thresholds.global_ratchet.baseline_required !== true ||
  thresholds.global_ratchet.baseline_path !== "quality/baseline.json" ||
  !["PENDING", "ADMITTED"].includes(thresholds.global_ratchet.baseline_status)
) {
  findings.push({
    code: "BASELINE_CONTRACT",
    message: "Coverage baseline must use the canonical fail-closed status and path contract",
  });
}
const canonicalBaselinePath = resolve(root, thresholds.global_ratchet.baseline_path);
if (thresholds.global_ratchet.baseline_status === "PENDING") {
  if (existsSync(canonicalBaselinePath)) {
    findings.push({
      code: "BASELINE_STATUS_MISMATCH",
      message: "quality/baseline.json exists while thresholds still declare PENDING",
      path: thresholds.global_ratchet.baseline_path,
    });
  }
} else if (thresholds.global_ratchet.baseline_status === "ADMITTED") {
  try {
    const baseline = await readJson<ComponentBaseline>(canonicalBaselinePath);
    findings.push(...await validateCanonicalBaselineArtifacts(root, baseline));
  } catch (error) {
    findings.push({
      code: "BASELINE_ADMITTED_MISSING",
      message: `ADMITTED canonical baseline is missing or malformed: ${String(error)}`,
      path: thresholds.global_ratchet.baseline_path,
    });
  }
}

const profiles = await readJson<
  ProfilesFile & { evidence_commands: EvidenceCommandMap }
>(resolve(root, flagString(flags, "profiles", "quality/profiles.json")!));
const packageJson = await readJson<{ scripts?: Record<string, string> }>(
  resolve(root, "package.json"),
);
for (const profile of PROFILES) {
  const config = profiles.profiles[profile];
  if (!config || !config.required_jobs.length || !config.commands.length) {
    findings.push({ code: "PROFILE_CONFIG", message: `${profile} command matrix is incomplete` });
    continue;
  }
  for (const command of config.commands) {
    if (command === "bun run quality:release") {
      findings.push({
        code: "PROFILE_RECURSION",
        message: `${profile} recursively invokes quality:release`,
      });
    }
    if (!profiles.command_artifacts[command]) {
      findings.push({
        code: "COMMAND_ARTIFACT_UNMAPPED",
        message: `${profile} command ${command} has no machine-readable artifact`,
      });
    }
  }
  const weaker = PROFILES.filter((candidate) => profileRank(candidate) < profileRank(profile));
  for (const weakerProfile of weaker) {
    for (const job of profiles.profiles[weakerProfile].required_jobs) {
      if (!config.required_jobs.includes(job)) {
        findings.push({
          code: "PROFILE_JOB_DOWNGRADE",
          message: `${profile} omits ${weakerProfile} job ${job}`,
        });
      }
    }
  }
}

const traceabilityProfiles = [
  "Q2_CRITICAL_CHANGE_GATE",
  "Q3_RELEASE_GATE",
] as const;
const evidenceKinds = new Set(
  capabilities.capabilities.flatMap((capability) => capability.evidence_kinds),
);
for (const kind of evidenceKinds) {
  const mapping = profiles.evidence_commands[kind];
  if (!mapping) {
    findings.push({
      code: "EVIDENCE_COMMAND_UNMAPPED",
      message: `Critical capability evidence kind ${kind} has no executable command mapping`,
    });
    continue;
  }
  for (const profile of traceabilityProfiles) {
    const command = mapping[profile];
    if (!command) {
      findings.push({
        code: "EVIDENCE_PROFILE_UNMAPPED",
        message: `${kind} has no ${profile} command mapping`,
      });
    } else if (!profiles.profiles[profile].commands.includes(command)) {
      findings.push({
        code: "EVIDENCE_COMMAND_NOT_IN_PROFILE",
        message: `${kind} maps to ${command}, which is absent from ${profile}`,
      });
    } else if (!profiles.command_artifacts[command]) {
      findings.push({
        code: "EVIDENCE_COMMAND_ARTIFACT_UNMAPPED",
        message: `${kind} maps to ${command} without a machine-readable artifact`,
      });
    } else {
      const scriptName = /^bun run ([^\s]+)$/u.exec(command)?.[1];
      if (!scriptName || !packageJson.scripts?.[scriptName]) {
        findings.push({
          code: "EVIDENCE_COMMAND_NOT_EXECUTABLE",
          message: `${kind} maps to unavailable package script ${command}`,
        });
      }
    }
  }
}
for (const [kind, mapping] of Object.entries(profiles.evidence_commands)) {
  for (const [profile, command] of Object.entries(mapping)) {
    if (
      !PROFILES.includes(profile as (typeof PROFILES)[number]) ||
      !profiles.profiles[profile as (typeof PROFILES)[number]].commands.includes(command)
    ) {
      findings.push({
        code: "EVIDENCE_COMMAND_INVALID",
        message: `${kind}/${profile} maps to a command outside that profile`,
      });
    }
  }
}

const result = makeResult(
  "quality-contracts",
  findings,
  {
    schemas: schemas.sort(),
    capabilities: capabilityIds,
    risk_rules: riskMap.rules.length,
    profiles: PROFILES,
    evidence_kinds: [...evidenceKinds].sort(),
  },
  findings.length === 0
    ? `Quality contracts PASS: ${schemas.length} schemas, ${riskMap.rules.length} risk rules`
    : `Quality contracts FAIL with ${findings.length} finding(s)`,
);
await finishCli(
  result,
  resolve(root, flagString(flags, "output", "artifacts/quality/contracts.json")!),
);
