import type { QualityFinding } from "./common";

import type { QualityProfile } from "./classifier-core";

export interface Capability {
  id: string;
  evidence_kinds: string[];
  must_fix?: boolean;
}

export interface CapabilityEvidence {
  capability_id: string;
  kind: string;
  status: "PASS" | "FAIL" | "QUALITY_BLOCKED";
  artifact: string;
  command?: string;
  artifact_sha256?: string;
}

export type EvidenceCommandMap = Record<
  string,
  Partial<Record<QualityProfile, string>>
>;

interface CommandResult {
  command: string;
  exit_code: number | null;
  artifact?: { path: string; sha256: string };
}

export function buildCapabilityEvidence(
  affectedCapabilities: string[],
  registry: Capability[],
  evidenceCommands: EvidenceCommandMap,
  profile: QualityProfile,
  commandResults: CommandResult[],
): CapabilityEvidence[] {
  const registryById = new Map(registry.map((capability) => [capability.id, capability]));
  const resultByCommand = new Map(commandResults.map((result) => [result.command, result]));
  const evidence: CapabilityEvidence[] = [];
  for (const capabilityId of affectedCapabilities) {
    const capability = registryById.get(capabilityId);
    if (!capability) continue;
    for (const kind of capability.evidence_kinds) {
      const command = evidenceCommands[kind]?.[profile] ?? "";
      const result = command ? resultByCommand.get(command) : undefined;
      const artifact = result?.artifact;
      evidence.push({
        capability_id: capabilityId,
        kind,
        command,
        status: result?.exit_code === 0 && artifact ? "PASS" : "FAIL",
        artifact: artifact?.path ?? "",
        ...(artifact ? { artifact_sha256: artifact.sha256 } : {}),
      });
    }
  }
  return evidence;
}

export function validateTraceability(
  affectedCapabilities: string[],
  registry: Capability[],
  evidence: CapabilityEvidence[],
): QualityFinding[] {
  const registryById = new Map(registry.map((capability) => [capability.id, capability]));
  const findings = duplicateEvidenceFindings(evidence);
  for (const capabilityId of affectedCapabilities) {
    findings.push(...validateCapability(capabilityId, registryById, evidence));
  }
  for (const item of evidence) {
    if (!registryById.has(item.capability_id)) {
      findings.push({
        code: "UNREGISTERED_EVIDENCE",
        message: `Evidence references unknown capability ${item.capability_id}`,
      });
    }
  }
  return findings;
}

function duplicateEvidenceFindings(evidence: CapabilityEvidence[]): QualityFinding[] {
  const identities = evidence.map((item) => `${item.capability_id}\u0000${item.kind}`);
  if (new Set(identities).size === identities.length) return [];
  return [{
    code: "DUPLICATE_EVIDENCE",
    message: "Capability evidence identities must be unique",
  }];
}

function validateCapability(
  capabilityId: string,
  registryById: Map<string, Capability>,
  evidence: CapabilityEvidence[],
): QualityFinding[] {
  const capability = registryById.get(capabilityId);
  if (!capability) {
    return [{
      code: "UNKNOWN_CAPABILITY",
      message: `Affected capability ${capabilityId} is not registered`,
    }];
  }
  const findings: QualityFinding[] = [];
  if (capability.must_fix) {
    findings.push({
      code: "UNKNOWN_MUST_FIX",
      message: `${capabilityId} is fail-closed and must be resolved`,
    });
  }
  for (const kind of capability.evidence_kinds) {
    findings.push(...validateEvidenceKind(capabilityId, kind, evidence));
  }
  return findings;
}

function validateEvidenceKind(
  capabilityId: string,
  kind: string,
  evidence: CapabilityEvidence[],
): QualityFinding[] {
  const item = evidence.find(
    (candidate) => candidate.capability_id === capabilityId && candidate.kind === kind,
  );
  if (!item) {
    return [{
      code: "MISSING_CAPABILITY_EVIDENCE",
      message: `${capabilityId} lacks ${kind} evidence`,
    }];
  }
  if (hasPassingArtifact(item)) return [];
  return [{
    code: "CAPABILITY_EVIDENCE_FAILED",
    message: `${capabilityId}/${kind} lacks passing executable artifact evidence`,
  }];
}

function hasPassingArtifact(item: CapabilityEvidence): boolean {
  if (item.status !== "PASS") return false;
  if (!item.command) return false;
  if (!item.artifact) return false;
  return /^[a-f0-9]{64}$/u.test(item.artifact_sha256 ?? "");
}
