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
import { validateManifest } from "./report-core";

const { flags } = parseArgs();
const root = qualityRoot();
const findings: QualityFinding[] = [];
const manifestPath = flagString(flags, "manifest");
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
  findings.push(...validateManifest(manifest));
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
