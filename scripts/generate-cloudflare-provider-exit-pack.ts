#!/usr/bin/env bun

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";

type Artifact<T extends Record<string, unknown> = Record<string, unknown>> = {
  path: string;
  present: boolean;
  generatedAt: string | null;
  value: T | null;
};

type LegacyProvider = "supabase" | "vercel" | "resend";
type ReferenceSeverity = "blocker" | "informational";
type ProviderExitOperatorRecord = Record<string, unknown>;

export type LegacyProviderReference = {
  provider: LegacyProvider;
  severity: ReferenceSeverity;
  file: string;
  line: number;
  snippet: string;
};

type Gate = {
  key: string;
  label: string;
  ready: boolean;
  evidence: string | null;
  blocker: string | null;
};

export type OperatorRecordDiagnostic = {
  gateKey: string;
  section: string;
  ready: boolean;
  status: string | null;
  acceptedDeferral: boolean;
  missingFields: string[];
};

export type ProviderExitPackReport = {
  generatedAt: string;
  mode: "cloudflare-provider-exit-pack";
  sources: Record<string, string>;
  artifacts: Record<string, {
    present: boolean;
    generatedAt: string | null;
  }>;
  legacyProviderScan: {
    scannedPaths: string[];
    blockerCount: number;
    informationalCount: number;
    blockers: LegacyProviderReference[];
    informational: LegacyProviderReference[];
  };
  operatorRecordDiagnostics: {
    path: string;
    present: boolean;
    templatePath: string;
    diagnostics: OperatorRecordDiagnostic[];
  };
  gates: Gate[];
  readiness: {
    appRuntimeExitPrerequisitesReady: boolean;
    providerExitReady: boolean;
  };
  blockers: string[];
  note: string;
};

const PLAN_ROOT = ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex";
const EVIDENCE_ROOT = `${PLAN_ROOT}/evidence`;
const DEFAULT_OUTPUT_FILE = `${EVIDENCE_ROOT}/2026-07-03-cloudflare-provider-exit-pack.json`;
const DEFAULT_MARKDOWN_FILE = `${EVIDENCE_ROOT}/2026-07-03-cloudflare-provider-exit-pack.md`;
const DEFAULT_OPERATOR_RECORD_TEMPLATE_FILE = `${EVIDENCE_ROOT}/2026-07-03-cloudflare-provider-exit-operator-record.template.json`;
const DEFAULT_SCAN_PATHS = ["src", "worker.ts", "package.json", "wrangler.jsonc"];
const TEXT_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".jsonc"]);

const ARTIFACT_PATHS = {
  releaseGates: `${EVIDENCE_ROOT}/2026-07-01-cloudflare-release-gates.json`,
  providerResources: `${EVIDENCE_ROOT}/2026-06-30-cloudflare-provider-resource-readback.json`,
  emailReadiness: `${EVIDENCE_ROOT}/2026-06-30-cloudflare-email-readiness.json`,
  hostedAuthMatrix: `${EVIDENCE_ROOT}/2026-07-02-cloudflare-hosted-auth-synthetic-cookie-matrix.json`,
  operatorRecord: `${EVIDENCE_ROOT}/2026-07-03-cloudflare-provider-exit-operator-record.json`,
};

const NOTE =
  "Non-destructive provider-exit evidence pack. This script reads current source and sanitized evidence artifacts only. It does not read .env files, print secrets, create exports, deploy, rotate secrets, cancel providers, delete data, change DNS, or prove real mailbox/persona access.";

function readEnv(name: string) {
  const value = process.env[name];
  return value?.trim() || undefined;
}

function envFlag(name: string) {
  const value = readEnv(name)?.toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

function operatorRecordArtifactPath() {
  return readEnv("PROVIDER_EXIT_OPERATOR_RECORD_FILE") ?? ARTIFACT_PATHS.operatorRecord;
}

function operatorRecordTemplatePath() {
  return readEnv("OPERATOR_RECORD_TEMPLATE_FILE") ?? DEFAULT_OPERATOR_RECORD_TEMPLATE_FILE;
}

function readJsonArtifact<T extends Record<string, unknown>>(path: string): Artifact<T> {
  if (!existsSync(path)) {
    return { path, present: false, generatedAt: null, value: null };
  }
  const value = JSON.parse(readFileSync(path, "utf8")) as T;
  return {
    path,
    present: true,
    generatedAt: typeof value.generatedAt === "string" ? value.generatedAt : null,
    value,
  };
}

function getPath(value: unknown, path: Array<string | number>): unknown {
  let current = value;
  for (const segment of path) {
    if (current === null || current === undefined) return undefined;
    if (typeof segment === "number") {
      if (!Array.isArray(current)) return undefined;
      current = current[segment];
      continue;
    }
    if (typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function boolAt(value: unknown, path: Array<string | number>) {
  return getPath(value, path) === true;
}

function stringAt(value: unknown, path: Array<string | number>) {
  const candidate = getPath(value, path);
  if (typeof candidate !== "string") {
    return null;
  }

  const trimmed = candidate.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function stringArrayAt(value: unknown, path: Array<string | number>) {
  const candidate = getPath(value, path);
  return Array.isArray(candidate) ? candidate.filter((item): item is string => typeof item === "string") : [];
}

function hasNonEmptyStringArrayAt(value: unknown, path: Array<string | number>) {
  return stringArrayAt(value, path).some((item) => item.trim().length > 0);
}

function sectionStatus(record: ProviderExitOperatorRecord | null, sectionName: string) {
  return stringAt(record, [sectionName, "status"]);
}

function acceptedDeferralReady(record: ProviderExitOperatorRecord | null, sectionName: string) {
  return (
    sectionStatus(record, sectionName) === "accepted-deferral" &&
    stringAt(record, [sectionName, "acceptedBy"]) !== null &&
    stringAt(record, [sectionName, "deferralRationale"]) !== null
  );
}

function finalExportsOrRetentionReady(record: ProviderExitOperatorRecord | null) {
  if (sectionStatus(record, "finalExportsOrRetentionDecision") !== "recorded") {
    return false;
  }

  const decision = stringAt(record, ["finalExportsOrRetentionDecision", "decision"]);
  if (!decision || !["exported", "accepted-retention", "accepted-loss"].includes(decision)) {
    return false;
  }

  if (stringAt(record, ["finalExportsOrRetentionDecision", "acceptedBy"]) === null) {
    return false;
  }

  if (stringAt(record, ["finalExportsOrRetentionDecision", "rollbackDecision"]) === null) {
    return false;
  }

  if (decision === "exported" && stringAt(record, ["finalExportsOrRetentionDecision", "backupLocationDescription"]) === null) {
    return false;
  }

  return true;
}

function resendAccountStatusReady(record: ProviderExitOperatorRecord | null) {
  return (
    sectionStatus(record, "resendStatus") === "recorded" &&
    stringAt(record, ["resendStatus", "accountPlanStatus"]) !== null &&
    stringAt(record, ["resendStatus", "apiKeyStatus"]) !== null &&
    stringAt(record, ["resendStatus", "sendingDomainStatus"]) !== null &&
    stringAt(record, ["resendStatus", "domainEvidenceSource"]) !== null
  );
}

function obsoleteSecretRotationReady(record: ProviderExitOperatorRecord | null) {
  return (
    sectionStatus(record, "obsoleteSecretRotation") === "recorded" &&
    boolAt(record, ["obsoleteSecretRotation", "cloudflareSecretNamesReviewed"]) &&
    boolAt(record, ["obsoleteSecretRotation", "obsoleteProviderSecretsRemovedOrRotated"]) &&
    boolAt(record, ["obsoleteSecretRotation", "secretValuesNotRecorded"])
  );
}

function postExitSmokeReady(record: ProviderExitOperatorRecord | null) {
  return (
    sectionStatus(record, "postExitSmoke") === "recorded" &&
    boolAt(record, ["postExitSmoke", "cloudflareSmokePassed"]) &&
    stringAt(record, ["postExitSmoke", "runAt"]) !== null &&
    hasNonEmptyStringArrayAt(record, ["postExitSmoke", "commands"])
  );
}

function nonOwnerGoogleProofReady(record: ProviderExitOperatorRecord | null) {
  if (acceptedDeferralReady(record, "nonOwnerGoogleProof")) {
    return true;
  }

  return (
    sectionStatus(record, "nonOwnerGoogleProof") === "recorded" &&
    stringAt(record, ["nonOwnerGoogleProof", "policyOutcome"]) !== null &&
    stringAt(record, ["nonOwnerGoogleProof", "evidenceSource"]) !== null &&
    boolAt(record, ["nonOwnerGoogleProof", "noCredentialsOrCookiesRecorded"])
  );
}

function recipientMailboxProofReady(record: ProviderExitOperatorRecord | null) {
  if (acceptedDeferralReady(record, "recipientMailboxProofOrDeferral")) {
    return true;
  }

  return (
    sectionStatus(record, "recipientMailboxProofOrDeferral") === "recorded" &&
    boolAt(record, ["recipientMailboxProofOrDeferral", "mailboxReceiptObserved"]) &&
    boolAt(record, ["recipientMailboxProofOrDeferral", "recipientScopedActionObserved"]) &&
    boolAt(record, ["recipientMailboxProofOrDeferral", "noPrivateEmailContentRecorded"])
  );
}

function missingRecordDiagnostic(gateKey: string, section: string): OperatorRecordDiagnostic {
  return {
    gateKey,
    section,
    ready: false,
    status: null,
    acceptedDeferral: false,
    missingFields: ["operator record file"],
  };
}

function missingString(record: ProviderExitOperatorRecord | null, section: string, field: string) {
  return stringAt(record, [section, field]) === null;
}

function addMissingString(missingFields: string[], record: ProviderExitOperatorRecord | null, section: string, field: string) {
  if (missingString(record, section, field)) {
    missingFields.push(`${section}.${field}`);
  }
}

function addMissingTrue(missingFields: string[], record: ProviderExitOperatorRecord | null, section: string, field: string) {
  if (!boolAt(record, [section, field])) {
    missingFields.push(`${section}.${field}=true`);
  }
}

function addMissingNonEmptyStringArray(
  missingFields: string[],
  record: ProviderExitOperatorRecord | null,
  section: string,
  field: string,
) {
  if (!hasNonEmptyStringArrayAt(record, [section, field])) {
    missingFields.push(`${section}.${field}[]`);
  }
}

function operatorDiagnostic(
  gateKey: string,
  section: string,
  record: ProviderExitOperatorRecord | null,
  missingFields: string[],
  acceptedDeferral = false,
): OperatorRecordDiagnostic {
  return {
    gateKey,
    section,
    ready: missingFields.length === 0,
    status: sectionStatus(record, section),
    acceptedDeferral,
    missingFields,
  };
}

function finalExportsOrRetentionDiagnostic(record: ProviderExitOperatorRecord | null, present: boolean) {
  const section = "finalExportsOrRetentionDecision";
  if (!present || !record) {
    return missingRecordDiagnostic("exports-or-retention-decision-recorded", section);
  }

  const missingFields: string[] = [];
  if (sectionStatus(record, section) !== "recorded") {
    missingFields.push(`${section}.status=recorded`);
  }

  const decision = stringAt(record, [section, "decision"]);
  if (!decision || !["exported", "accepted-retention", "accepted-loss"].includes(decision)) {
    missingFields.push(`${section}.decision(exported|accepted-retention|accepted-loss)`);
  }

  addMissingString(missingFields, record, section, "acceptedBy");
  addMissingString(missingFields, record, section, "rollbackDecision");

  if (decision === "exported") {
    addMissingString(missingFields, record, section, "backupLocationDescription");
  }

  return operatorDiagnostic("exports-or-retention-decision-recorded", section, record, missingFields);
}

function resendAccountStatusDiagnostic(record: ProviderExitOperatorRecord | null, present: boolean) {
  const section = "resendStatus";
  if (!present || !record) {
    return missingRecordDiagnostic("resend-account-status-recorded", section);
  }

  const missingFields: string[] = [];
  if (sectionStatus(record, section) !== "recorded") {
    missingFields.push(`${section}.status=recorded`);
  }
  addMissingString(missingFields, record, section, "accountPlanStatus");
  addMissingString(missingFields, record, section, "apiKeyStatus");
  addMissingString(missingFields, record, section, "sendingDomainStatus");
  addMissingString(missingFields, record, section, "domainEvidenceSource");

  return operatorDiagnostic("resend-account-status-recorded", section, record, missingFields);
}

function obsoleteSecretRotationDiagnostic(record: ProviderExitOperatorRecord | null, present: boolean) {
  const section = "obsoleteSecretRotation";
  if (!present || !record) {
    return missingRecordDiagnostic("obsolete-secret-rotation-recorded", section);
  }

  const missingFields: string[] = [];
  if (sectionStatus(record, section) !== "recorded") {
    missingFields.push(`${section}.status=recorded`);
  }
  addMissingTrue(missingFields, record, section, "cloudflareSecretNamesReviewed");
  addMissingTrue(missingFields, record, section, "obsoleteProviderSecretsRemovedOrRotated");
  addMissingTrue(missingFields, record, section, "secretValuesNotRecorded");

  return operatorDiagnostic("obsolete-secret-rotation-recorded", section, record, missingFields);
}

function postExitSmokeDiagnostic(record: ProviderExitOperatorRecord | null, present: boolean) {
  const section = "postExitSmoke";
  if (!present || !record) {
    return missingRecordDiagnostic("post-exit-smoke-recorded", section);
  }

  const missingFields: string[] = [];
  if (sectionStatus(record, section) !== "recorded") {
    missingFields.push(`${section}.status=recorded`);
  }
  addMissingTrue(missingFields, record, section, "cloudflareSmokePassed");
  addMissingString(missingFields, record, section, "runAt");
  addMissingNonEmptyStringArray(missingFields, record, section, "commands");

  return operatorDiagnostic("post-exit-smoke-recorded", section, record, missingFields);
}

function acceptedDeferralMissingFields(record: ProviderExitOperatorRecord | null, section: string) {
  const missingFields: string[] = [];
  if (sectionStatus(record, section) !== "accepted-deferral") {
    missingFields.push(`${section}.status=accepted-deferral`);
  }
  addMissingString(missingFields, record, section, "acceptedBy");
  addMissingString(missingFields, record, section, "deferralRationale");
  return missingFields;
}

function nonOwnerGoogleProofDiagnostic(record: ProviderExitOperatorRecord | null, present: boolean) {
  const section = "nonOwnerGoogleProof";
  if (!present || !record) {
    return missingRecordDiagnostic("non-owner-google-proof-recorded", section);
  }

  if (sectionStatus(record, section) === "accepted-deferral") {
    return operatorDiagnostic(
      "non-owner-google-proof-recorded",
      section,
      record,
      acceptedDeferralMissingFields(record, section),
      true,
    );
  }

  const missingFields: string[] = [];
  if (sectionStatus(record, section) !== "recorded") {
    missingFields.push(`${section}.status=recorded|accepted-deferral`);
  }
  addMissingString(missingFields, record, section, "policyOutcome");
  addMissingString(missingFields, record, section, "evidenceSource");
  addMissingTrue(missingFields, record, section, "noCredentialsOrCookiesRecorded");

  return operatorDiagnostic("non-owner-google-proof-recorded", section, record, missingFields);
}

function recipientMailboxProofDiagnostic(record: ProviderExitOperatorRecord | null, present: boolean) {
  const section = "recipientMailboxProofOrDeferral";
  if (!present || !record) {
    return missingRecordDiagnostic("recipient-mailbox-proof-or-deferral-recorded", section);
  }

  if (sectionStatus(record, section) === "accepted-deferral") {
    return operatorDiagnostic(
      "recipient-mailbox-proof-or-deferral-recorded",
      section,
      record,
      acceptedDeferralMissingFields(record, section),
      true,
    );
  }

  const missingFields: string[] = [];
  if (sectionStatus(record, section) !== "recorded") {
    missingFields.push(`${section}.status=recorded|accepted-deferral`);
  }
  addMissingTrue(missingFields, record, section, "mailboxReceiptObserved");
  addMissingTrue(missingFields, record, section, "recipientScopedActionObserved");
  addMissingTrue(missingFields, record, section, "noPrivateEmailContentRecorded");

  return operatorDiagnostic("recipient-mailbox-proof-or-deferral-recorded", section, record, missingFields);
}

export function buildOperatorRecordDiagnostics(params: {
  record: ProviderExitOperatorRecord | null;
  path: string;
  present: boolean;
}) {
  const { record, path, present } = params;
  return {
    path,
    present,
    templatePath: operatorRecordTemplatePath(),
    diagnostics: [
      finalExportsOrRetentionDiagnostic(record, present),
      resendAccountStatusDiagnostic(record, present),
      obsoleteSecretRotationDiagnostic(record, present),
      postExitSmokeDiagnostic(record, present),
      nonOwnerGoogleProofDiagnostic(record, present),
      recipientMailboxProofDiagnostic(record, present),
    ],
  };
}

export function buildOperatorRecordTemplate(generatedAt = new Date().toISOString()): ProviderExitOperatorRecord {
  return {
    generatedAt,
    mode: "cloudflare-provider-exit-operator-record",
    boundary: "Sanitized operator record only. Do not record secrets, tokens, cookies, raw mailbox content, provider screenshots with private values, private backup paths, or credential material.",
    finalExportsOrRetentionDecision: {
      status: "missing",
      decision: "",
      acceptedBy: "",
      rollbackDecision: "",
      backupLocationDescription: "",
    },
    resendStatus: {
      status: "missing",
      accountPlanStatus: "",
      apiKeyStatus: "",
      sendingDomainStatus: "",
      domainEvidenceSource: "",
    },
    obsoleteSecretRotation: {
      status: "missing",
      cloudflareSecretNamesReviewed: false,
      obsoleteProviderSecretsRemovedOrRotated: false,
      secretValuesNotRecorded: false,
    },
    postExitSmoke: {
      status: "missing",
      runAt: "",
      cloudflareSmokePassed: false,
      commands: [],
    },
    nonOwnerGoogleProof: {
      status: "missing",
      policyOutcome: "",
      evidenceSource: "",
      noCredentialsOrCookiesRecorded: false,
      acceptedBy: "",
      deferralRationale: "",
    },
    recipientMailboxProofOrDeferral: {
      status: "missing",
      mailboxReceiptObserved: false,
      recipientScopedActionObserved: false,
      noPrivateEmailContentRecorded: false,
      acceptedBy: "",
      deferralRationale: "",
    },
  };
}

function isTextFile(path: string) {
  return TEXT_EXTENSIONS.has(extname(path));
}

function listFiles(path: string): string[] {
  if (!existsSync(path)) return [];
  const stat = statSync(path);
  if (stat.isFile()) return isTextFile(path) ? [path] : [];
  if (!stat.isDirectory()) return [];

  const files: string[] = [];
  for (const entry of readdirSync(path)) {
    if (entry === "node_modules" || entry === ".next" || entry === ".open-next") continue;
    files.push(...listFiles(join(path, entry)));
  }
  return files;
}

function normalizeSnippet(line: string) {
  return line.replace(/\s+/g, " ").trim().slice(0, 240);
}

function classifySourceLine(file: string, lineNumber: number, line: string): LegacyProviderReference[] {
  const references: LegacyProviderReference[] = [];
  const snippet = normalizeSnippet(line);
  const lower = line.toLowerCase();

  if (/@supabase|from\s+["'][^"']*supabase|import\s+.*["'][^"']*supabase|supabase_/i.test(line)) {
    references.push({ provider: "supabase", severity: "blocker", file, line: lineNumber, snippet });
  }

  if (/@vercel|process\.env\.vercel|vercel_/i.test(line)) {
    references.push({ provider: "vercel", severity: "blocker", file, line: lineNumber, snippet });
  }

  if (/from\s+["']resend["']|new\s+Resend\s*\(|RESEND_API_KEY|process\.env\.RESEND/i.test(line)) {
    references.push({ provider: "resend", severity: "blocker", file, line: lineNumber, snippet });
  } else if (lower.includes("resend")) {
    references.push({ provider: "resend", severity: "informational", file, line: lineNumber, snippet });
  }

  return references;
}

export function scanLegacyProviderReferences(paths = DEFAULT_SCAN_PATHS): ProviderExitPackReport["legacyProviderScan"] {
  const scannedPaths = paths.filter((path) => existsSync(path));
  const references: LegacyProviderReference[] = [];

  for (const scanPath of scannedPaths) {
    for (const file of listFiles(scanPath)) {
      const relativeFile = relative(process.cwd(), file) || file;
      const lines = readFileSync(file, "utf8").split(/\r?\n/);
      lines.forEach((line, index) => {
        references.push(...classifySourceLine(relativeFile, index + 1, line));
      });
    }
  }

  const blockers = references.filter((reference) => reference.severity === "blocker");
  const informational = references.filter((reference) => reference.severity === "informational");

  return {
    scannedPaths,
    blockerCount: blockers.length,
    informationalCount: informational.length,
    blockers,
    informational,
  };
}

function artifactSummary(artifacts: Record<string, Artifact>) {
  return Object.fromEntries(Object.entries(artifacts).map(([key, artifact]) => [
    key,
    { present: artifact.present, generatedAt: artifact.generatedAt },
  ]));
}

function gate(
  key: string,
  label: string,
  ready: boolean,
  evidence: string | null,
  blocker: string | null,
): Gate {
  return { key, label, ready, evidence, blocker: ready ? null : blocker };
}

export function buildProviderExitPackReport(params: {
  generatedAt?: string;
  scan?: ProviderExitPackReport["legacyProviderScan"];
  artifacts?: Record<string, Artifact>;
} = {}): ProviderExitPackReport {
  const generatedAt = params.generatedAt ?? new Date().toISOString();
  const artifacts = {
    ...(params.artifacts ?? {
      releaseGates: readJsonArtifact(ARTIFACT_PATHS.releaseGates),
      providerResources: readJsonArtifact(ARTIFACT_PATHS.providerResources),
      emailReadiness: readJsonArtifact(ARTIFACT_PATHS.emailReadiness),
      hostedAuthMatrix: readJsonArtifact(ARTIFACT_PATHS.hostedAuthMatrix),
    }),
  };
  artifacts.operatorRecord ??= readJsonArtifact(operatorRecordArtifactPath());
  const scan = params.scan ?? scanLegacyProviderReferences();

  const releaseGateReady = artifacts.releaseGates.present
    && boolAt(artifacts.releaseGates.value, ["readiness", "productionCutoverReady"])
    && stringArrayAt(artifacts.releaseGates.value, ["blockers"]).length === 0;
  const providerResourcesReady = artifacts.providerResources.present
    && boolAt(artifacts.providerResources.value, ["readiness", "providerResourceReadbackReady"])
    && stringArrayAt(artifacts.providerResources.value, ["blockers"]).length === 0;
  const cloudflareEmailReady = artifacts.emailReadiness.present
    && boolAt(artifacts.emailReadiness.value, ["productionEmailReady"])
    && stringArrayAt(artifacts.emailReadiness.value, ["blockers"]).length === 0;
  const authMatrixCases = getPath(artifacts.hostedAuthMatrix.value, ["authResult", "cases"]);
  const authCaseNames = Array.isArray(authMatrixCases)
    ? authMatrixCases
      .map((item) => item && typeof item === "object" ? (item as Record<string, unknown>).name : null)
      .filter((name): name is string => typeof name === "string")
    : [];
  const requiredAuthCases = ["signedOut", "allowed", "denied", "revoked", "expired", "malformed"];
  const hostedAuthMatrixReady = artifacts.hostedAuthMatrix.present
    && boolAt(artifacts.hostedAuthMatrix.value, ["passed"])
    && boolAt(artifacts.hostedAuthMatrix.value, ["cleanupPassed"])
    && requiredAuthCases.every((name) => authCaseNames.includes(name));
  const noActiveLegacyProviderRuntime = scan.blockerCount === 0;
  const operatorRecord = artifacts.operatorRecord.value as ProviderExitOperatorRecord | null;
  const operatorEvidence = artifacts.operatorRecord.present
    ? artifacts.operatorRecord.path
    : "sanitized provider-exit operator record required";
  const operatorRecordDiagnostics = buildOperatorRecordDiagnostics({
    record: operatorRecord,
    path: artifacts.operatorRecord.path,
    present: artifacts.operatorRecord.present,
  });

  const gates: Gate[] = [
    gate(
      "release-gates-green",
      "Cloudflare release gates green",
      releaseGateReady,
      artifacts.releaseGates.path,
      "Release gates are missing, stale, or have blockers.",
    ),
    gate(
      "provider-resources-readable",
      "Cloudflare provider resources readable",
      providerResourcesReady,
      artifacts.providerResources.path,
      "Cloudflare Worker/D1/R2/Queue/secret-name readback is missing or blocked.",
    ),
    gate(
      "cloudflare-email-ready",
      "Cloudflare Email ready",
      cloudflareEmailReady,
      artifacts.emailReadiness.path,
      "Cloudflare Email readiness is missing or blocked.",
    ),
    gate(
      "hosted-auth-matrix-ready",
      "Hosted auth matrix ready",
      hostedAuthMatrixReady,
      artifacts.hostedAuthMatrix.path,
      "Hosted auth matrix must pass signedOut/allowed/denied/revoked/expired/malformed with cleanup.",
    ),
    gate(
      "no-active-legacy-provider-runtime",
      "No active Supabase/Vercel/Resend runtime dependency in scanned source",
      noActiveLegacyProviderRuntime,
      "source scan",
      "Active source still has blocker-level Supabase, Vercel, or Resend references.",
    ),
    gate(
      "exports-or-retention-decision-recorded",
      "Provider exports or accepted-retention/accepted-loss decision recorded",
      finalExportsOrRetentionReady(operatorRecord),
      operatorEvidence,
      "No repository evidence proves final exports are stored outside the repo or that accepted-retention/accepted-loss is recorded.",
    ),
    gate(
      "resend-account-status-recorded",
      "Resend account/API-key/domain status recorded",
      resendAccountStatusReady(operatorRecord),
      operatorEvidence,
      "Cloudflare Email is ready, but Resend account/API-key/sending-domain status is not recorded.",
    ),
    gate(
      "obsolete-secret-rotation-recorded",
      "Obsolete provider secret removal/rotation recorded",
      obsoleteSecretRotationReady(operatorRecord),
      operatorEvidence,
      "No evidence shows obsolete provider secrets were removed or rotated after exit decisions.",
    ),
    gate(
      "post-exit-smoke-recorded",
      "Post-exit Cloudflare smoke recorded",
      postExitSmokeReady(operatorRecord),
      operatorEvidence,
      "No post-exit smoke exists after provider export/retention/secret decisions.",
    ),
    gate(
      "non-owner-google-proof-recorded",
      "Real non-owner Google proof recorded",
      nonOwnerGoogleProofReady(operatorRecord),
      operatorEvidence,
      "No real non-owner Google account journey evidence is recorded.",
    ),
    gate(
      "recipient-mailbox-proof-or-deferral-recorded",
      "Real recipient mailbox proof or accepted deferral recorded",
      recipientMailboxProofReady(operatorRecord),
      operatorEvidence,
      "No real recipient mailbox receipt proof or accepted deferral is recorded.",
    ),
  ];

  const appRuntimeGateKeys = new Set([
    "release-gates-green",
    "provider-resources-readable",
    "cloudflare-email-ready",
    "hosted-auth-matrix-ready",
    "no-active-legacy-provider-runtime",
  ]);
  const appRuntimeExitPrerequisitesReady = gates
    .filter((item) => appRuntimeGateKeys.has(item.key))
    .every((item) => item.ready);
  const providerExitReady = gates.every((item) => item.ready);
  const blockers = gates
    .filter((item) => !item.ready && item.blocker)
    .map((item) => `${item.label}: ${item.blocker}`);

  return {
    generatedAt,
    mode: "cloudflare-provider-exit-pack",
    sources: {
      runbook: `${PLAN_ROOT}/35_PROVIDER_EXIT_AND_FINAL_PROOF_RUNBOOK.md`,
      ledger: `${PLAN_ROOT}/36_COMPREHENSIVE_FOLLOWUP_QA_LEDGER.md`,
      handoff: `${PLAN_ROOT}/37_GLM52_CLOUDFLARE_MIGRATION_HANDOFF.md`,
    },
    artifacts: artifactSummary(artifacts),
    legacyProviderScan: scan,
    operatorRecordDiagnostics,
    gates,
    readiness: {
      appRuntimeExitPrerequisitesReady,
      providerExitReady,
    },
    blockers,
    note: NOTE,
  };
}

function writeJson(path: string, value: unknown) {
  const resolved = resolve(path);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(value, null, 2)}\n`);
}

function checkMark(value: boolean) {
  return value ? "PASS" : "OPEN";
}

function tableCell(value: string) {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

export function renderMarkdown(report: ProviderExitPackReport) {
  const gateRows = report.gates
    .map((item) => `| ${item.label} | ${checkMark(item.ready)} | ${item.evidence ?? ""} | ${item.blocker ?? ""} |`)
    .join("\n");
  const diagnosticRows = report.operatorRecordDiagnostics.diagnostics
    .map((item) => {
      const missingFields = item.missingFields.length ? item.missingFields.join(", ") : "none";
      const status = item.status ?? "missing";
      const acceptedDeferral = item.acceptedDeferral ? "yes" : "no";
      return `| ${tableCell(item.gateKey)} | ${checkMark(item.ready)} | ${tableCell(item.section)} | ${tableCell(status)} | ${acceptedDeferral} | ${tableCell(missingFields)} |`;
    })
    .join("\n");
  const blockerRows = report.legacyProviderScan.blockers.length
    ? report.legacyProviderScan.blockers
      .map((item) => `| ${item.provider} | ${item.file}:${item.line} | ${item.snippet.replace(/\|/g, "\\|")} |`)
      .join("\n")
    : "| none | n/a | n/a |";
  const informationalRows = report.legacyProviderScan.informational.slice(0, 20)
    .map((item) => `| ${item.provider} | ${item.file}:${item.line} | ${item.snippet.replace(/\|/g, "\\|")} |`)
    .join("\n") || "| none | n/a | n/a |";

  return `# Cloudflare Provider Exit Pack

Status: **${report.readiness.providerExitReady ? "READY" : "OPEN / NOT READY"}**

Generated: \`${report.generatedAt}\`

App runtime exit prerequisites: **${checkMark(report.readiness.appRuntimeExitPrerequisitesReady)}**

Provider exit ready: **${checkMark(report.readiness.providerExitReady)}**

Operator evidence record: **${report.artifacts.operatorRecord?.present ? "PRESENT" : "MISSING"}**

Default operator record path: \`${ARTIFACT_PATHS.operatorRecord}\`

Operator record template path: \`${report.operatorRecordDiagnostics.templatePath}\`

## Gates

| Gate | Result | Evidence | Blocker |
| --- | --- | --- | --- |
${gateRows}

## Operator Record Diagnostics

This section names missing sanitized fields only. It does not echo operator
values from the provider-exit record.

| Gate Key | Result | Section | Status | Accepted Deferral | Missing Fields |
| --- | --- | --- | --- | --- | --- |
${diagnosticRows}

## Active Legacy Provider Runtime Scan

Scanned paths: ${report.legacyProviderScan.scannedPaths.map((item) => `\`${item}\``).join(", ")}

Blocker references: ${report.legacyProviderScan.blockerCount}

Informational Resend lexical references: ${report.legacyProviderScan.informationalCount}

| Provider | Location | Snippet |
| --- | --- | --- |
${blockerRows}

Informational references are retained because names such as invite resend actions
or legacy \`resend_*\` data columns are not Resend-service API usage by
themselves.

| Provider | Location | Snippet |
| --- | --- | --- |
${informationalRows}

## Open Blockers

${report.blockers.map((item) => `- ${item}`).join("\n")}

## Boundary

${report.note}
`;
}

function writeMarkdown(path: string, report: ProviderExitPackReport) {
  const resolved = resolve(path);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, renderMarkdown(report));
}

async function main() {
  const outputFile = readEnv("OUTPUT_FILE") ?? DEFAULT_OUTPUT_FILE;
  const markdownFile = readEnv("MARKDOWN_FILE") ?? DEFAULT_MARKDOWN_FILE;
  const report = buildProviderExitPackReport();
  let operatorRecordTemplateFile: string | undefined;

  writeJson(outputFile, report);
  writeMarkdown(markdownFile, report);

  if (envFlag("WRITE_OPERATOR_RECORD_TEMPLATE")) {
    operatorRecordTemplateFile = operatorRecordTemplatePath();
    writeJson(operatorRecordTemplateFile, buildOperatorRecordTemplate(report.generatedAt));
  }

  const summary: Record<string, unknown> = {
    generatedAt: report.generatedAt,
    mode: report.mode,
    appRuntimeExitPrerequisitesReady: report.readiness.appRuntimeExitPrerequisitesReady,
    providerExitReady: report.readiness.providerExitReady,
    blockerCount: report.blockers.length,
    activeLegacyProviderRuntimeBlockers: report.legacyProviderScan.blockerCount,
    outputFile,
    markdownFile,
  };

  if (operatorRecordTemplateFile) {
    summary.operatorRecordTemplateFile = operatorRecordTemplateFile;
  }

  console.log(JSON.stringify(summary, null, 2));
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
