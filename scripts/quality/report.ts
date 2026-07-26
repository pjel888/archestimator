import { resolve } from "node:path";
import type { ProfilesFile } from "./aggregate-core";
import { buildCandidate, type CandidateClassification } from "./candidate-core";
import {
  finishCli,
  flagString,
  makeResult,
  parseArgs,
  qualityRoot,
  readJson,
  type QualityFinding,
} from "./common";
import { canonicalProfilesOverrideFinding, validateManifest } from "./report-core";

const { flags } = parseArgs();
const root = qualityRoot();
const findings: QualityFinding[] = [];
const manifestPath = flagString(flags, "manifest");
const policyOverride = canonicalProfilesOverrideFinding(root, flagString(flags, "profiles"));
if (policyOverride) findings.push(policyOverride);
const profiles = await readJson<ProfilesFile>(resolve(root, "quality/profiles.json"));
let manifest: Record<string, unknown> = {};
try {
  if (!manifestPath) throw new Error("--manifest is required");
  manifest = await readJson(resolve(root, manifestPath));
  if (manifest.kind === "quality-manifest" && manifest.data && typeof manifest.data === "object") {
    manifest = {
      ...(manifest.data as Record<string, unknown>),
      schema_version: manifest.schema_version,
      status: manifest.status,
    };
  }
  findings.push(...validateManifest(manifest, profiles));
  const classification = manifest.classification as CandidateClassification | undefined;
  const candidate = manifest.candidate as
    | { commit_sha?: string; sha256?: string }
    | undefined;
  if (!classification?.comparison_base || !candidate?.sha256) {
    throw new Error("Manifest lacks canonical candidate construction inputs");
  }
  const canonical = await buildCandidate({
    root,
    comparison_base: classification.comparison_base,
    classification,
    expected: candidate.sha256,
  });
  if (candidate.commit_sha !== canonical.record.commit_sha) {
    throw new Error("Manifest candidate commit does not equal HEAD");
  }
} catch (error) {
  findings.push({
    code: "MANIFEST_MALFORMED",
    message: `Manifest is missing or malformed: ${String(error)}`,
  });
}
if (flags.has("require-command-log") && !(manifest.command_results as unknown[])?.length) {
  findings.push({
    code: "COMMAND_LOG_REQUIRED",
    message: "At least one executed command result is required",
  });
}
const result = makeResult(
  "quality-report",
  findings,
  { manifest },
  findings.length === 0
    ? `Quality report PASS for ${String(manifest.profile)}`
    : `Quality report FAIL with ${findings.length} finding(s)`,
);
await finishCli(
  result,
  resolve(root, flagString(flags, "output", "artifacts/quality/report.json")!),
);
