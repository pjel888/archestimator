#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const PLAN_DIR = ".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement";
const DEFAULT_REQUIREMENTS_FILE = `${PLAN_DIR}/04_REQUIREMENTS_SPECIFICATION.md`;
const DEFAULT_RELEASE_GATES_FILE = `${PLAN_DIR}/evidence/upload-release-gates.json`;
const DEFAULT_OUTPUT = `${PLAN_DIR}/evidence/upload-requirement-coverage-audit.json`;

type GateScope = "closedBeta" | "production" | "platform";
type GateKind = "localPass" | "blocker";
type RequirementCoverageStatus = "mapped" | "blocked" | "missing";

type ReleaseGateEntry = {
  id?: unknown;
  requirements?: unknown;
};

type ReleaseGateSection = {
  status?: unknown;
  localPasses?: unknown;
  blockers?: unknown;
};

type ReleaseGates = {
  generatedAt?: unknown;
  proofBoundary?: unknown;
  closedBeta?: ReleaseGateSection;
  production?: ReleaseGateSection;
  platform?: ReleaseGateSection;
};

type RequirementEvidenceRef = {
  scope: GateScope;
  kind: GateKind;
  id: string;
};

type RequirementCoverage = {
  id: string;
  status: RequirementCoverageStatus;
  evidenceRefs: RequirementEvidenceRef[];
  blockerRefs: RequirementEvidenceRef[];
};

export type UploadRequirementCoverageAuditReport = {
  generatedAt: string;
  mode: "upload-requirement-coverage-audit";
  proofBoundary: "traceability-only";
  requirementsFile: string;
  releaseGatesFile: string;
  releaseGateGeneratedAt: string | null;
  releaseGateStatuses: Record<GateScope, string | null>;
  passed: boolean;
  traceabilityReady: boolean;
  productionReady: boolean;
  totals: {
    requirements: number;
    mapped: number;
    missing: number;
    blocked: number;
    unknownReferences: number;
  };
  requirements: RequirementCoverage[];
  unknownRequirementReferences: Array<RequirementEvidenceRef & { requirement: string }>;
  note: string;
};

export type CheckUploadRequirementCoverageOptions = {
  requirementsFile?: string;
  releaseGatesFile?: string;
  generatedAt?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readJsonFile(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

function readReleaseGates(path: string): ReleaseGates {
  const value = readJsonFile(path);
  if (!isRecord(value)) {
    throw new Error(`Release gate artifact is not an object: ${path}`);
  }
  return value as ReleaseGates;
}

function parseRequirementIds(markdown: string): string[] {
  const ids = new Set<string>();
  for (const match of markdown.matchAll(/\|\s*(UPLOAD-REQ-\d{3})\s*\|/g)) {
    ids.add(match[1]);
  }
  return [...ids].sort();
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function releaseEntries(section: ReleaseGateSection | undefined, scope: GateScope, kind: GateKind) {
  const entries = kind === "localPass" ? section?.localPasses : section?.blockers;
  if (!Array.isArray(entries)) return [] as Array<RequirementEvidenceRef & { requirement: string }>;

  return entries.flatMap((entry): Array<RequirementEvidenceRef & { requirement: string }> => {
    if (!isRecord(entry)) return [];
    const gate = entry as ReleaseGateEntry;
    const id = typeof gate.id === "string" ? gate.id : null;
    if (!id) return [];
    return asStringArray(gate.requirements).map((requirement) => ({
      scope,
      kind,
      id,
      requirement,
    }));
  });
}

function sectionStatus(section: ReleaseGateSection | undefined) {
  return typeof section?.status === "string" ? section.status : null;
}

export function checkUploadRequirementCoverage(
  options: CheckUploadRequirementCoverageOptions = {},
): UploadRequirementCoverageAuditReport {
  const requirementsFile = options.requirementsFile ?? DEFAULT_REQUIREMENTS_FILE;
  const releaseGatesFile = options.releaseGatesFile ?? DEFAULT_RELEASE_GATES_FILE;
  const requirementIds = parseRequirementIds(readFileSync(requirementsFile, "utf8"));
  const requirementSet = new Set(requirementIds);
  const releaseGates = readReleaseGates(releaseGatesFile);
  const releaseRefs = [
    ...releaseEntries(releaseGates.closedBeta, "closedBeta", "localPass"),
    ...releaseEntries(releaseGates.closedBeta, "closedBeta", "blocker"),
    ...releaseEntries(releaseGates.production, "production", "localPass"),
    ...releaseEntries(releaseGates.production, "production", "blocker"),
    ...releaseEntries(releaseGates.platform, "platform", "localPass"),
    ...releaseEntries(releaseGates.platform, "platform", "blocker"),
  ];

  const unknownRequirementReferences = releaseRefs.filter((ref) => !requirementSet.has(ref.requirement));
  const requirements = requirementIds.map((id): RequirementCoverage => {
    const refs = releaseRefs
      .filter((ref) => ref.requirement === id)
      .map(({ scope, kind, id: gateId }) => ({ scope, kind, id: gateId }));
    const blockerRefs = refs.filter((ref) => ref.kind === "blocker");
    const status: RequirementCoverageStatus = refs.length === 0
      ? "missing"
      : blockerRefs.length > 0
        ? "blocked"
        : "mapped";
    return {
      id,
      status,
      evidenceRefs: refs,
      blockerRefs,
    };
  });

  const missing = requirements.filter((requirement) => requirement.status === "missing").length;
  const blocked = requirements.filter((requirement) => requirement.status === "blocked").length;
  const mapped = requirements.length - missing;
  const traceabilityReady = missing === 0 && unknownRequirementReferences.length === 0;
  const productionReady = sectionStatus(releaseGates.production) === "ready";

  return {
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    mode: "upload-requirement-coverage-audit",
    proofBoundary: "traceability-only",
    requirementsFile,
    releaseGatesFile,
    releaseGateGeneratedAt: typeof releaseGates.generatedAt === "string" ? releaseGates.generatedAt : null,
    releaseGateStatuses: {
      closedBeta: sectionStatus(releaseGates.closedBeta),
      production: sectionStatus(releaseGates.production),
      platform: sectionStatus(releaseGates.platform),
    },
    passed: traceabilityReady,
    traceabilityReady,
    productionReady,
    totals: {
      requirements: requirements.length,
      mapped,
      missing,
      blocked,
      unknownReferences: unknownRequirementReferences.length,
    },
    requirements,
    unknownRequirementReferences,
    note: "This artifact audits release-gate traceability for the upload plan. It does not prove production readiness, collect hosted evidence, read secrets, deploy routes, or replace hosted/live production observations.",
  };
}

export function writeUploadRequirementCoverageAuditReport(
  report: UploadRequirementCoverageAuditReport,
  outputFile = DEFAULT_OUTPUT,
) {
  mkdirSync(dirname(outputFile), { recursive: true });
  writeFileSync(outputFile, `${JSON.stringify(report, null, 2)}\n`);
}

if (import.meta.main) {
  const requirementsFile = process.env.REQUIREMENTS_FILE || DEFAULT_REQUIREMENTS_FILE;
  const releaseGatesFile = process.env.RELEASE_GATES_FILE || DEFAULT_RELEASE_GATES_FILE;
  const outputFile = process.env.OUTPUT_FILE || DEFAULT_OUTPUT;

  try {
    if (!existsSync(requirementsFile)) throw new Error(`Missing requirements file: ${requirementsFile}`);
    if (!existsSync(releaseGatesFile)) throw new Error(`Missing release gates file: ${releaseGatesFile}`);
    const report = checkUploadRequirementCoverage({ requirementsFile, releaseGatesFile });
    writeUploadRequirementCoverageAuditReport(report, outputFile);
    if (report.passed) {
      console.log(`Upload requirement coverage audit passed; output=${outputFile}`);
      process.exit(0);
    }
    console.error(`Upload requirement coverage audit failed; output=${outputFile}`);
    process.exit(1);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Upload requirement coverage audit failed: ${message}`);
    process.exit(1);
  }
}
