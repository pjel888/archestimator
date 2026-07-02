#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type SecretInput = {
  name: "CRON_SECRET";
  present: boolean;
  source: string | null;
};

type CleanupCounts = {
  workspaces?: number;
  profiles?: number;
  workspaceMembers?: number;
  projects?: number;
  estimates?: number;
  projectMembers?: number;
  estimateMembers?: number;
  invitations?: number;
  tokens?: number;
  auditEvents?: number;
};

type CollaborationInvitationEndpointBody = {
  generatedAt?: string;
  mode?: string;
  proofSurface?: string;
  readiness?: {
    d1BindingPresent?: boolean;
    resolveStateReady?: boolean;
    revokedTerminalNulled?: boolean;
    acceptByTokenReady?: boolean;
    acceptByIdReady?: boolean;
    wrongAccountDenied?: boolean;
    replayDenied?: boolean;
    cleanupReady?: boolean;
    hostedCollaborationInvitationD1Ready?: boolean;
  };
  proof?: {
    activeResolve?: {
      passed?: boolean;
      state?: string | null;
      projectVisible?: boolean;
    };
    revokedResolve?: {
      passed?: boolean;
      state?: string | null;
      projectVisible?: boolean;
    };
    acceptByToken?: {
      passed?: boolean;
      state?: string | null;
      membershipRows?: number;
      acceptedAuditRows?: number;
    };
    replay?: {
      passed?: boolean;
      sameActorState?: string | null;
      otherActorState?: string | null;
      replayBlockedAuditRows?: number;
    };
    wrongAccount?: {
      passed?: boolean;
      state?: string | null;
      membershipRows?: number;
      wrongAccountAuditRows?: number;
    };
    acceptById?: {
      passed?: boolean;
      state?: string | null;
      replayState?: string | null;
      membershipRows?: number;
    };
  };
  cleanupBefore?: CleanupCounts;
  cleanupAfter?: CleanupCounts;
  passed?: boolean;
  error?: string | null;
  note?: string;
};

type HostedCollaborationInvitationProofReport = {
  generatedAt: string;
  mode: "cloudflare-hosted-collaboration-invitation-proof-verifier";
  baseUrl: string | null;
  endpointPath: "/api/internal/collaboration-invitation-proof";
  secretInput: SecretInput;
  responseStatus: number | null;
  responseOk: boolean;
  endpointMode: string | null;
  endpointProofSurface: string | null;
  readiness: {
    d1BindingPresent: boolean;
    resolveStateReady: boolean;
    revokedTerminalNulled: boolean;
    acceptByTokenReady: boolean;
    acceptByIdReady: boolean;
    wrongAccountDenied: boolean;
    replayDenied: boolean;
    cleanupReady: boolean;
    hostedCollaborationInvitationD1Ready: boolean;
    productionCutoverReady: false;
  };
  proof: CollaborationInvitationEndpointBody["proof"] | null;
  cleanupBefore: CleanupCounts | null;
  cleanupAfter: CleanupCounts | null;
  blockers: string[];
  note: string;
};

const PLAN_ROOT = ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence";
const DEFAULT_BASE_URL = "https://archestimator.com";
const DEFAULT_OUTPUT_FILE = `${PLAN_ROOT}/2026-07-02-cloudflare-hosted-collaboration-invitation-proof.json`;
const DEFAULT_MARKDOWN_FILE = `${PLAN_ROOT}/2026-07-02-cloudflare-hosted-collaboration-invitation-proof.md`;
const ENDPOINT_PATH = "/api/internal/collaboration-invitation-proof" as const;
const NOTE =
  "Calls the deployed Cloudflare Worker collaboration-invitation proof endpoint with a local bearer secret, then records sanitized D1 resolve, accept-by-token, accept-by-id, replay denial, wrong-account denial, revoked terminal-state, and cleanup evidence. It does not print secret values, delete provider resources, downgrade external providers, or touch real customer/project data.";

function readEnv(name: string) {
  const value = process.env[name];
  return value?.trim() || undefined;
}

function unquoteEnvValue(value: string) {
  const trimmed = value.trim();
  const quote = trimmed[0];
  if ((quote === "\"" || quote === "'") && trimmed.endsWith(quote)) return trimmed.slice(1, -1);
  return trimmed;
}

function readEnvAssignment(file: string, name: string) {
  if (!existsSync(file)) return null;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^(?:export\s+)?([A-Z][A-Z0-9_]+)\s*=\s*(.*)$/);
    if (match?.[1] === name) return unquoteEnvValue(match[2]);
  }
  return null;
}

function loadSecretInput(envFiles: string[]): { secret: string | null; input: SecretInput } {
  const fromEnv = readEnv("CRON_SECRET");
  if (fromEnv) return { secret: fromEnv, input: { name: "CRON_SECRET", present: true, source: "process.env" } };

  for (const file of envFiles) {
    const value = readEnvAssignment(file, "CRON_SECRET");
    if (value?.trim()) return { secret: value, input: { name: "CRON_SECRET", present: true, source: file } };
  }

  return { secret: null, input: { name: "CRON_SECRET", present: false, source: null } };
}

function normalizeBaseUrl(value: string | undefined | null) {
  const raw = value?.trim();
  if (!raw) return null;
  const url = new URL(raw.replace(/\/+$/, ""));
  if (url.protocol !== "https:") throw new Error("Cloudflare collaboration-invitation proof base URL must use HTTPS.");
  return url.origin;
}

function chooseBaseUrl() {
  return normalizeBaseUrl(
    readEnv("CLOUDFLARE_HOSTED_COLLABORATION_INVITATION_BASE_URL")
      ?? readEnv("CLOUDFLARE_HOSTED_WORKER_BASE_URL")
      ?? readEnv("CLOUDFLARE_HOSTED_ROUTE_BASE_URL")
      ?? DEFAULT_BASE_URL,
  );
}

function cleanupCountsAreZero(counts: CleanupCounts | null | undefined) {
  if (!counts) return false;
  return Object.values(counts).every((value) => Number(value ?? 0) === 0);
}

function emptyReadiness(): HostedCollaborationInvitationProofReport["readiness"] {
  return {
    d1BindingPresent: false,
    resolveStateReady: false,
    revokedTerminalNulled: false,
    acceptByTokenReady: false,
    acceptByIdReady: false,
    wrongAccountDenied: false,
    replayDenied: false,
    cleanupReady: false,
    hostedCollaborationInvitationD1Ready: false,
    productionCutoverReady: false,
  };
}

function notReadyReport(input: {
  baseUrl: string | null;
  secretInput: SecretInput;
  blockers: string[];
}): HostedCollaborationInvitationProofReport {
  return {
    generatedAt: new Date().toISOString(),
    mode: "cloudflare-hosted-collaboration-invitation-proof-verifier",
    baseUrl: input.baseUrl,
    endpointPath: ENDPOINT_PATH,
    secretInput: input.secretInput,
    responseStatus: null,
    responseOk: false,
    endpointMode: null,
    endpointProofSurface: null,
    readiness: emptyReadiness(),
    proof: null,
    cleanupBefore: null,
    cleanupAfter: null,
    blockers: input.blockers,
    note: NOTE,
  };
}

export async function buildReport(input: {
  baseUrl: string | null;
  secret: string | null;
  secretInput: SecretInput;
  fetchImpl?: typeof fetch;
}): Promise<HostedCollaborationInvitationProofReport> {
  const blockers: string[] = [];
  if (!input.baseUrl) blockers.push("No HTTPS deployed Worker base URL is configured.");
  if (!input.secret) blockers.push("CRON_SECRET is missing from process.env or configured local env files.");
  if (blockers.length > 0) return notReadyReport({ baseUrl: input.baseUrl, secretInput: input.secretInput, blockers });

  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(`${input.baseUrl}${ENDPOINT_PATH}`, {
    method: "POST",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${input.secret}`,
    },
  });
  const body = await response.json().catch(() => ({ error: "non_json_response" })) as CollaborationInvitationEndpointBody;
  const endpointReadiness = body.readiness ?? {};
  const cleanupReady = endpointReadiness.cleanupReady === true && cleanupCountsAreZero(body.cleanupAfter);
  const readiness = {
    d1BindingPresent: endpointReadiness.d1BindingPresent === true,
    resolveStateReady: endpointReadiness.resolveStateReady === true,
    revokedTerminalNulled: endpointReadiness.revokedTerminalNulled === true,
    acceptByTokenReady: endpointReadiness.acceptByTokenReady === true,
    acceptByIdReady: endpointReadiness.acceptByIdReady === true,
    wrongAccountDenied: endpointReadiness.wrongAccountDenied === true,
    replayDenied: endpointReadiness.replayDenied === true,
    cleanupReady,
    hostedCollaborationInvitationD1Ready:
      response.ok
      && body.passed === true
      && endpointReadiness.hostedCollaborationInvitationD1Ready === true
      && cleanupReady,
    productionCutoverReady: false,
  };

  if (!response.ok) blockers.push(`Collaboration-invitation proof endpoint returned HTTP ${response.status}.`);
  if (!readiness.d1BindingPresent) blockers.push("Cloudflare D1 ARCH_DB binding was not present.");
  if (!readiness.resolveStateReady) blockers.push("Active invitation token resolve proof did not pass.");
  if (!readiness.revokedTerminalNulled) blockers.push("Revoked invitation terminal-state proof did not null project/customer data.");
  if (!readiness.acceptByTokenReady) blockers.push("Invitation accept-by-token proof did not pass.");
  if (!readiness.acceptByIdReady) blockers.push("Invitation accept-by-id proof did not pass.");
  if (!readiness.wrongAccountDenied) blockers.push("Wrong-account invitation denial proof did not pass.");
  if (!readiness.replayDenied) blockers.push("Invitation replay denial proof did not pass.");
  if (!readiness.cleanupReady) blockers.push("Synthetic collaboration invitation proof fixture cleanup did not return to zero.");
  if (body.error) blockers.push(`Endpoint error: ${body.error}`);

  return {
    generatedAt: new Date().toISOString(),
    mode: "cloudflare-hosted-collaboration-invitation-proof-verifier",
    baseUrl: input.baseUrl,
    endpointPath: ENDPOINT_PATH,
    secretInput: input.secretInput,
    responseStatus: response.status,
    responseOk: response.ok,
    endpointMode: body.mode ?? null,
    endpointProofSurface: body.proofSurface ?? null,
    readiness,
    proof: body.proof ?? null,
    cleanupBefore: body.cleanupBefore ?? null,
    cleanupAfter: body.cleanupAfter ?? null,
    blockers,
    note: NOTE,
  };
}

function writeOutput(report: HostedCollaborationInvitationProofReport, outputFile: string) {
  const outputPath = resolve(outputFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

function writeMarkdown(report: HostedCollaborationInvitationProofReport, markdownFile: string) {
  const outputPath = resolve(markdownFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  const blockers = report.blockers.length > 0 ? report.blockers.map((blocker) => `- ${blocker}`) : ["- (none)"];
  const proof = report.proof ?? {};
  const lines = [
    "# Cloudflare Hosted Collaboration Invitation Proof",
    "",
    `Generated: ${report.generatedAt}`,
    `Base URL: ${report.baseUrl ?? "(missing)"}`,
    `Endpoint: ${report.endpointPath}`,
    `Response status: ${report.responseStatus ?? "(none)"}`,
    `Secret input present: ${report.secretInput.present ? "yes" : "no"}`,
    `Secret input source: ${report.secretInput.source ?? "(none)"}`,
    "",
    report.note,
    "",
    "## Summary",
    "",
    "| Gate | Ready |",
    "| --- | --- |",
    `| D1 binding | ${report.readiness.d1BindingPresent ? "yes" : "no"} |`,
    `| Active resolve | ${report.readiness.resolveStateReady ? "yes" : "no"} |`,
    `| Revoked terminal-state redaction | ${report.readiness.revokedTerminalNulled ? "yes" : "no"} |`,
    `| Accept by token | ${report.readiness.acceptByTokenReady ? "yes" : "no"} |`,
    `| Accept by invitation id | ${report.readiness.acceptByIdReady ? "yes" : "no"} |`,
    `| Wrong-account denial | ${report.readiness.wrongAccountDenied ? "yes" : "no"} |`,
    `| Replay denial | ${report.readiness.replayDenied ? "yes" : "no"} |`,
    `| Cleanup zero | ${report.readiness.cleanupReady ? "yes" : "no"} |`,
    `| Hosted collaboration invitation D1 proof | ${report.readiness.hostedCollaborationInvitationD1Ready ? "yes" : "no"} |`,
    `| Production cutover | ${report.readiness.productionCutoverReady ? "yes" : "no"} |`,
    "",
    "## Sanitized Results",
    "",
    `- Active resolve state: ${proof.activeResolve?.state ?? "(none)"}`,
    `- Active resolve project visible: ${proof.activeResolve?.projectVisible === true ? "yes" : "no"}`,
    `- Revoked resolve state: ${proof.revokedResolve?.state ?? "(none)"}`,
    `- Revoked resolve project visible: ${proof.revokedResolve?.projectVisible === true ? "yes" : "no"}`,
    `- Accept-by-token state: ${proof.acceptByToken?.state ?? "(none)"}`,
    `- Accept-by-token membership rows: ${proof.acceptByToken?.membershipRows ?? "(none)"}`,
    `- Accept-by-token audit rows: ${proof.acceptByToken?.acceptedAuditRows ?? "(none)"}`,
    `- Replay same actor state: ${proof.replay?.sameActorState ?? "(none)"}`,
    `- Replay other actor state: ${proof.replay?.otherActorState ?? "(none)"}`,
    `- Replay blocked audit rows: ${proof.replay?.replayBlockedAuditRows ?? "(none)"}`,
    `- Wrong-account state: ${proof.wrongAccount?.state ?? "(none)"}`,
    `- Wrong-account membership rows: ${proof.wrongAccount?.membershipRows ?? "(none)"}`,
    `- Wrong-account audit rows: ${proof.wrongAccount?.wrongAccountAuditRows ?? "(none)"}`,
    `- Accept-by-id state: ${proof.acceptById?.state ?? "(none)"}`,
    `- Accept-by-id replay state: ${proof.acceptById?.replayState ?? "(none)"}`,
    `- Accept-by-id membership rows: ${proof.acceptById?.membershipRows ?? "(none)"}`,
    `- Cleanup after: ${JSON.stringify(report.cleanupAfter ?? {})}`,
    "",
    "## Blockers",
    "",
    ...blockers,
    "",
  ];
  writeFileSync(outputPath, lines.join("\n"));
}

async function main() {
  const envFiles = (readEnv("CLOUDFLARE_COLLABORATION_INVITATION_PROOF_ENV_FILES")?.split(",").map((item) => item.trim()).filter(Boolean)
    ?? [".env.local", ".dev.vars"]);
  const baseUrl = chooseBaseUrl();
  const { secret, input } = loadSecretInput(envFiles);
  const report = await buildReport({ baseUrl, secret, secretInput: input });
  const outputFile = readEnv("OUTPUT_FILE") ?? DEFAULT_OUTPUT_FILE;
  const markdownFile = readEnv("MARKDOWN_FILE") ?? DEFAULT_MARKDOWN_FILE;
  writeOutput(report, outputFile);
  writeMarkdown(report, markdownFile);
  console.log(JSON.stringify(report, null, 2));
  if (!report.readiness.hostedCollaborationInvitationD1Ready) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
