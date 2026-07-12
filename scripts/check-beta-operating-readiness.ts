#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export const BETA_OPERATING_READINESS_VERSION = "BETA-OPERATING-READINESS-v1" as const;
export const BETA_OPERATING_INPUT_VERSION = "BETA-OPERATING-INPUT-v1" as const;

const LOCAL_CRITERIA = ["AC-001", "AC-002", "AC-003", "AC-004", "AC-005", "AC-006", "AC-007"] as const;
const BOUNDARY_CRITERIA = ["AC-008", "AC-009", "AC-010"] as const;
const REQUIRED_ARTIFACTS = ["telemetry", "operator", "incidentSupport", "auth", "legal", "activation", "recovery", "maintainability"] as const;

type ArtifactName = (typeof REQUIRED_ARTIFACTS)[number];
export type OperatingArtifact = {
  schemaVersion: string;
  producerVersion: string;
  releaseId: string;
  candidateSha: string;
  environment: string;
  collectedAt: string;
  expiresAt: string;
  status: "pass" | "fail";
  providerBacked: false;
};

export type BetaOperatingReadinessInput = {
  schemaVersion: typeof BETA_OPERATING_INPUT_VERSION;
  releaseId: string;
  candidateSha: string;
  environment: string;
  artifacts: Record<ArtifactName, OperatingArtifact>;
  now?: Date;
};

type CriterionStatus = "PASS" | "FAIL" | "BOUNDARY";
export type BetaOperatingReadinessReport = {
  schemaVersion: typeof BETA_OPERATING_READINESS_VERSION;
  producerVersion: typeof BETA_OPERATING_READINESS_VERSION;
  releaseId: string;
  candidateSha: string;
  environment: string;
  generatedAt: string;
  expiresAt: string;
  decision: "NO_GO";
  localReady: boolean;
  criteria: Array<{ id: (typeof LOCAL_CRITERIA)[number] | (typeof BOUNDARY_CRITERIA)[number]; status: CriterionStatus; blockers: string[] }>;
  boundaries: Array<{ id: "AUTH-001" | "AUTH-002" | "AUTH-003"; status: "BOUNDARY"; nextAction: string }>;
  artifacts: Record<ArtifactName, Pick<OperatingArtifact, "schemaVersion" | "producerVersion" | "collectedAt" | "expiresAt">>;
};

function fail(message: string): never {
  throw new Error(`Invalid beta operating readiness: ${message}`);
}

function timestamp(value: string, field: string) {
  const result = Date.parse(value);
  if (!Number.isFinite(result)) fail(`${field} is invalid`);
  return result;
}

function validateIdentity(value: string, field: string, pattern: RegExp) {
  if (!pattern.test(value)) fail(`${field} is invalid`);
}

function validateArtifact(name: ArtifactName, artifact: OperatingArtifact, input: BetaOperatingReadinessInput, now: Date) {
  if (!artifact || typeof artifact !== "object") return `${name}:missing`;
  if (!artifact.schemaVersion || !artifact.producerVersion || artifact.status !== "pass" || artifact.providerBacked !== false) return `${name}:invalid`;
  if (artifact.releaseId !== input.releaseId || artifact.candidateSha !== input.candidateSha || artifact.environment !== input.environment) return `${name}:identity`;
  const collectedAt = Date.parse(artifact.collectedAt);
  const expiresAt = Date.parse(artifact.expiresAt);
  if (!Number.isFinite(collectedAt) || !Number.isFinite(expiresAt)) return `${name}:timestamp`;
  if (collectedAt > now.getTime() || expiresAt <= collectedAt || expiresAt <= now.getTime()) return `${name}:stale`;
  return null;
}

export function buildBetaOperatingReadiness(input: BetaOperatingReadinessInput): BetaOperatingReadinessReport {
  if (input.schemaVersion !== BETA_OPERATING_INPUT_VERSION) fail("input schema is unsupported");
  validateIdentity(input.releaseId, "release ID", /^[a-z0-9][a-z0-9-]{7,95}$/);
  validateIdentity(input.candidateSha, "candidate SHA", /^[a-f0-9]{40}$/);
  validateIdentity(input.environment, "environment", /^[a-z0-9][a-z0-9-]{1,63}$/);
  const now = input.now ?? new Date();
  const artifactBlockers = Object.fromEntries(REQUIRED_ARTIFACTS.map((name) => [name, validateArtifact(name, input.artifacts?.[name], input, now)]));
  const mapping: Record<(typeof LOCAL_CRITERIA)[number], ArtifactName[]> = {
    "AC-001": ["telemetry"],
    "AC-002": ["operator", "activation"],
    "AC-003": ["incidentSupport"],
    "AC-004": ["auth", "recovery"],
    "AC-005": ["legal"],
    "AC-006": ["maintainability"],
    "AC-007": ["telemetry", "operator", "incidentSupport"],
  };
  const criteria = [
    ...LOCAL_CRITERIA.map((id) => {
      const blockers = mapping[id].map((name) => artifactBlockers[name]).filter((blocker): blocker is string => Boolean(blocker));
      return { id, status: blockers.length === 0 ? "PASS" as const : "FAIL" as const, blockers };
    }),
    { id: "AC-008" as const, status: "BOUNDARY" as const, blockers: ["AUTH-001: operating hosted proof receipt required"] },
    { id: "AC-009" as const, status: "BOUNDARY" as const, blockers: ["AUTH-002: auth-risk decision receipt required"] },
    { id: "AC-010" as const, status: "BOUNDARY" as const, blockers: ["AUTH-003: limited-cohort legal decision receipt required"] },
  ];
  const expiries = REQUIRED_ARTIFACTS
    .map((name) => Date.parse(input.artifacts?.[name]?.expiresAt ?? ""))
    .filter((value) => Number.isFinite(value) && value > now.getTime());
  const localReady = criteria.filter((criterion) => LOCAL_CRITERIA.includes(criterion.id as (typeof LOCAL_CRITERIA)[number])).every((criterion) => criterion.status === "PASS");
  return {
    schemaVersion: BETA_OPERATING_READINESS_VERSION,
    producerVersion: BETA_OPERATING_READINESS_VERSION,
    releaseId: input.releaseId,
    candidateSha: input.candidateSha,
    environment: input.environment,
    generatedAt: now.toISOString(),
    expiresAt: new Date(expiries.length > 0 ? Math.min(...expiries) : now.getTime()).toISOString(),
    decision: "NO_GO",
    localReady,
    criteria,
    boundaries: [
      { id: "AUTH-001", status: "BOUNDARY", nextAction: "Consume a current operating hosted proof receipt." },
      { id: "AUTH-002", status: "BOUNDARY", nextAction: "Consume a current auth-risk decision receipt." },
      { id: "AUTH-003", status: "BOUNDARY", nextAction: "Consume a current limited-cohort legal decision receipt." },
    ],
    artifacts: Object.fromEntries(REQUIRED_ARTIFACTS.map((name) => [name, {
      schemaVersion: input.artifacts[name]?.schemaVersion ?? "",
      producerVersion: input.artifacts[name]?.producerVersion ?? "",
      collectedAt: input.artifacts[name]?.collectedAt ?? "",
      expiresAt: input.artifacts[name]?.expiresAt ?? "",
    }])) as BetaOperatingReadinessReport["artifacts"],
  };
}

export function validateBetaOperatingReadinessReport(value: unknown, now = new Date()): BetaOperatingReadinessReport {
  const report = value as BetaOperatingReadinessReport | null;
  if (!report || report.schemaVersion !== BETA_OPERATING_READINESS_VERSION || report.producerVersion !== BETA_OPERATING_READINESS_VERSION || report.decision !== "NO_GO") fail("report identity is invalid");
  validateIdentity(report.releaseId, "release ID", /^[a-z0-9][a-z0-9-]{7,95}$/);
  validateIdentity(report.candidateSha, "candidate SHA", /^[a-f0-9]{40}$/);
  validateIdentity(report.environment, "environment", /^[a-z0-9][a-z0-9-]{1,63}$/);
  const generatedAt = timestamp(report.generatedAt, "generatedAt");
  const expiresAt = timestamp(report.expiresAt, "expiresAt");
  if (generatedAt > now.getTime() || expiresAt <= generatedAt || expiresAt <= now.getTime()) fail("report is stale or expired");
  if (!Array.isArray(report.criteria) || report.criteria.length !== 10 || !Array.isArray(report.boundaries) || report.boundaries.length !== 3) fail("criteria or boundaries are incomplete");
  if (!report.criteria.slice(0, 7).every((criterion, index) => criterion.id === LOCAL_CRITERIA[index] && (criterion.status === "PASS" || criterion.status === "FAIL"))) fail("local criteria are invalid");
  if (!report.criteria.slice(7).every((criterion, index) => criterion.id === BOUNDARY_CRITERIA[index] && criterion.status === "BOUNDARY")) fail("boundary criteria are invalid");
  if (!report.boundaries.every((boundary, index) => boundary.id === (["AUTH-001", "AUTH-002", "AUTH-003"] as const)[index] && boundary.status === "BOUNDARY" && Boolean(boundary.nextAction))) fail("authorization boundaries are invalid");
  return report;
}

export function renderBetaOperatingReadinessMarkdown(report: BetaOperatingReadinessReport) {
  return ["# Beta Operating Readiness", "", `Release: ${report.releaseId}`, `Candidate SHA: ${report.candidateSha}`, `Environment: ${report.environment}`, `Decision: ${report.decision}`, `Local criteria ready: ${report.localReady ? "yes" : "no"}`, "", "## Boundaries", ...report.boundaries.map((boundary) => `- ${boundary.id}: ${boundary.status} — ${boundary.nextAction}`), ""].join("\n");
}

if (import.meta.main) {
  const inputPath = process.env.BETA_OPERATING_READINESS_INPUT_FILE;
  const outputPath = process.env.BETA_OPERATING_READINESS_OUTPUT_FILE ?? ".ai/99_scratch/beta-operating-readiness-current.json";
  if (!inputPath || !existsSync(inputPath)) throw new Error("BETA_OPERATING_READINESS_INPUT_FILE must name a current operating input bundle.");
  const report = buildBetaOperatingReadiness(JSON.parse(readFileSync(resolve(inputPath), "utf8")) as BetaOperatingReadinessInput);
  const target = resolve(outputPath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(`${target}.md`, renderBetaOperatingReadinessMarkdown(report));
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.localReady ? 0 : 1;
}
