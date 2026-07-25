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
import {
  validateTraceability,
  type CapabilityEvidence,
} from "./traceability-core";

const { flags } = parseArgs();
const root = qualityRoot();
const findings: QualityFinding[] = [];
const classificationPath = flagString(
  flags,
  "classification",
  "artifacts/quality/classification.json",
)!;
const evidencePath = flagString(flags, "evidence", "artifacts/quality/manifest.json")!;
let affected: string[] = [];
let evidence: CapabilityEvidence[] = [];
try {
  affected = (
    await readJson<{ data: { affected_capabilities: string[] } }>(
      resolve(root, classificationPath),
    )
  ).data.affected_capabilities;
  if (!Array.isArray(affected)) throw new Error("affected_capabilities must be an array");
} catch (error) {
  findings.push({
    code: "CLASSIFICATION_MALFORMED",
    message: `Classification is missing or malformed: ${String(error)}`,
  });
}
try {
  const payload = await readJson<{
    evidence?: CapabilityEvidence[];
    data?: {
      traceability?: { evidence?: CapabilityEvidence[] };
    };
  }>(resolve(root, evidencePath));
  evidence = payload.data?.traceability?.evidence ?? payload.evidence ?? [];
  if (!Array.isArray(evidence)) throw new Error("evidence must be an array");
} catch (error) {
  findings.push({
    code: "EVIDENCE_MALFORMED",
    message: `Evidence is missing or malformed: ${String(error)}`,
  });
}
const registry = await readJson<{
  capabilities: { id: string; evidence_kinds: string[]; must_fix?: boolean }[];
}>(resolve(root, flagString(flags, "registry", "quality/critical-capabilities.json")!));
findings.push(...validateTraceability(affected, registry.capabilities, evidence));
const result = makeResult(
  "quality-traceability",
  findings,
  { affected_capabilities: affected, evidence },
  findings.length === 0
    ? `Traceability PASS for ${affected.length} affected capability(s)`
    : `Traceability FAIL with ${findings.length} finding(s)`,
);
await finishCli(
  result,
  resolve(root, flagString(flags, "output", "artifacts/quality/traceability.json")!),
);
