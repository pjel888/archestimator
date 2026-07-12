import { createHash } from "node:crypto";

export const RELEASE_HOSTED_DISCOVERY_VERSION = "RELEASE-HOSTED-DISCOVERY-v1" as const;
export const RELEASE_BOUNDARY_PACKET_VERSION = "RELEASE-BOUNDARY-PACKET-v1" as const;

export type HostedEndpointStatus = "OBSERVED" | "UNKNOWN";
export type HostedEndpointInput = {
  endpointId: string;
  command: string;
  exitCode: number | null;
  httpStatus: number | null;
  collectedAt: string;
  paginationComplete: boolean;
  unavailableReason?: "missing-credentials" | "unsupported-feature" | "network-error";
};

export type HostedEndpointRecord = {
  endpointId: string;
  commandIdentity: string;
  exitCode: number | null;
  httpStatus: number | null;
  collectedAt: string;
  paginationComplete: boolean;
  status: HostedEndpointStatus;
  responseDigest: string;
};

export type GitHubDiscoveryRaw = HostedEndpointInput & {
  summary?: {
    repositoryVisibility?: "public" | "private" | "internal";
    defaultBranch?: string;
    rulesetCount?: number;
    bypassActorCount?: number;
    requiredCheckCount?: number;
    mergeQueueEnabled?: boolean;
    environmentCount?: number;
    workflowRunCount?: number;
    artifactExpiryObserved?: boolean;
    codeqlStatus?: "pass" | "fail" | "unknown";
    dependabotStatus?: "pass" | "fail" | "unknown";
    secretScanningStatus?: "pass" | "fail" | "unknown";
    secretScanningHideSecretApplied?: boolean;
  };
  rawResponse?: unknown;
};

export type SanitizedGitHubDiscovery = HostedEndpointRecord & {
  summary: NonNullable<GitHubDiscoveryRaw["summary"]>;
};

export type ReleaseBoundary = "AUTH-001" | "AUTH-002" | "AUTH-003";
export type ReleaseBoundaryPacket = {
  schemaVersion: typeof RELEASE_BOUNDARY_PACKET_VERSION;
  boundary: ReleaseBoundary;
  authorizationRequired: true;
  actor: string;
  resource: string;
  action: string;
  target: string;
  prerequisites: string[];
  requestedCommands: string[];
  expectedEffect: string;
  costPosture: "free-tier-only";
  rollback: string;
  proof: string[];
  expiresAt: string;
  exclusions: string[];
};

export type ReleaseBoundaryPacketInput = {
  releaseId: string;
  candidateSha: string;
  now?: Date;
  expiresAt: string;
};

function fail(message: string): never {
  throw new Error(`Invalid release hosted discovery: ${message}`);
}

function digest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function commandIdentity(command: string) {
  const normalized = command.trim();
  if (!normalized || /(?:token|authorization|secret|password|cookie|bearer|--header)/i.test(normalized)) {
    fail("command identity contains secret-bearing material");
  }
  return normalized.replace(/\s+/g, " ");
}

function safeSummary(raw: GitHubDiscoveryRaw["summary"]): NonNullable<GitHubDiscoveryRaw["summary"]> {
  const summary = raw ?? {};
  if (summary.defaultBranch && !/^[A-Za-z0-9._/-]+$/.test(summary.defaultBranch)) fail("default branch is unsafe");
  for (const [key, value] of Object.entries(summary)) {
    if (typeof value === "number" && (!Number.isSafeInteger(value) || value < 0)) fail(`${key} must be a non-negative integer`);
  }
  return {
    repositoryVisibility: summary.repositoryVisibility,
    defaultBranch: summary.defaultBranch,
    rulesetCount: summary.rulesetCount,
    bypassActorCount: summary.bypassActorCount,
    requiredCheckCount: summary.requiredCheckCount,
    mergeQueueEnabled: summary.mergeQueueEnabled,
    environmentCount: summary.environmentCount,
    workflowRunCount: summary.workflowRunCount,
    artifactExpiryObserved: summary.artifactExpiryObserved,
    codeqlStatus: summary.codeqlStatus,
    dependabotStatus: summary.dependabotStatus,
    secretScanningStatus: summary.secretScanningStatus,
    secretScanningHideSecretApplied: summary.secretScanningHideSecretApplied,
  };
}

export function classifyHostedEndpointStatus(input: HostedEndpointInput): HostedEndpointStatus {
  if (input.unavailableReason || !input.paginationComplete || input.exitCode !== 0) return "UNKNOWN";
  if (input.httpStatus === null || input.httpStatus < 200 || input.httpStatus >= 300) return "UNKNOWN";
  return "OBSERVED";
}

export function sanitizeGitHubDiscovery(input: GitHubDiscoveryRaw): SanitizedGitHubDiscovery {
  if (!/^[a-z0-9][a-z0-9-]{2,95}$/.test(input.endpointId)) fail("endpoint ID is invalid");
  if (!Number.isInteger(input.exitCode) && input.exitCode !== null) fail("exit code is invalid");
  if (!Number.isInteger(input.httpStatus) && input.httpStatus !== null) fail("HTTP status is invalid");
  if (!Number.isFinite(Date.parse(input.collectedAt))) fail("collection time is invalid");
  const summary = safeSummary(input.summary);
  const command = commandIdentity(input.command);
  const status = classifyHostedEndpointStatus(input);
  return {
    endpointId: input.endpointId,
    commandIdentity: command,
    exitCode: input.exitCode,
    httpStatus: input.httpStatus,
    collectedAt: input.collectedAt,
    paginationComplete: input.paginationComplete,
    status,
    responseDigest: digest({ endpointId: input.endpointId, command, status, paginationComplete: input.paginationComplete, summary }),
    summary,
  };
}

function packet(
  boundary: ReleaseBoundary,
  releaseId: string,
  candidateSha: string,
  expiresAt: string,
  details: Omit<ReleaseBoundaryPacket, "schemaVersion" | "boundary" | "authorizationRequired" | "expiresAt">,
): ReleaseBoundaryPacket {
  return { schemaVersion: RELEASE_BOUNDARY_PACKET_VERSION, boundary, authorizationRequired: true, expiresAt, ...details };
}

export function buildReleaseBoundaryPackets(input: ReleaseBoundaryPacketInput): ReleaseBoundaryPacket[] {
  if (!/^[a-z0-9][a-z0-9-]{7,95}$/.test(input.releaseId) || !/^[a-f0-9]{40}$/.test(input.candidateSha)) {
    fail("release identity is invalid");
  }
  const now = input.now ?? new Date();
  const expiresAt = Date.parse(input.expiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt <= now.getTime()) fail("authorization packet expiry is invalid");
  const candidate = `${input.releaseId}:${input.candidateSha}`;
  return [
    packet("AUTH-001", input.releaseId, input.candidateSha, input.expiresAt, {
      actor: "repository-owner-or-authorized-release-operator",
      resource: "target-github-repository-and-default-branch",
      action: "mutate-rulesets-required-checks-environments-retention-or-scanning-controls",
      target: candidate,
      prerequisites: ["verified-local-candidate", "complete-read-only-discovery", "workflow-source-pin-and-fail-closed-receipt"],
      requestedCommands: ["gh api --method PATCH <approved-ruleset-endpoint>", "gh api --method GET <approved-ruleset-readback-endpoint>"],
      expectedEffect: "Required controls apply only to the approved repository and branch target.",
      costPosture: "free-tier-only",
      rollback: "Restore the exact prior ruleset/environment/scanning configuration captured by readback.",
      proof: ["before-and-after-ruleset-readback", "required-check-source-and-eligibility", "environment-retention-and-scanning-readback"],
      exclusions: ["No secret values", "No unrelated repository", "No staging mutation", "No production deployment"],
    }),
    packet("AUTH-002", input.releaseId, input.candidateSha, input.expiresAt, {
      actor: "approved-staging-operator",
      resource: "explicitly-identified-isolated-non-production-cloudflare-surface",
      action: "create-or-mutate-staging-fixture-and-run-hosted-golden-path",
      target: candidate,
      prerequisites: ["approved-staging-resource-identity", "signed-fixture-cleanup-manifest", "foreign-canary", "browser-project-list"],
      requestedCommands: ["wrangler d1 execute <approved-staging-database> --remote --file=<approved-fixture>", "playwright test e2e/beta-golden-path.spec.ts --project=<approved-project>"],
      expectedEffect: "Only run-owned fixture data changes on the approved isolated staging surface.",
      costPosture: "free-tier-only",
      rollback: "Run signed manifest cleanup twice and verify the foreign canary remains unchanged.",
      proof: ["staging-url-hash", "fixture-and-cleanup-digest", "chromium-and-webkit-step-receipts", "resource-readback"],
      exclusions: ["No production host", "No paid add-on", "No foreign fixture data", "No real-recipient email"],
    }),
    packet("AUTH-003", input.releaseId, input.candidateSha, input.expiresAt, {
      actor: "approved-production-release-operator",
      resource: "cloudflare-worker-archestimator-proof-and-approved-domain",
      action: "upload-promote-smoke-and-code-rollback-rehearsal-for-exact-candidate",
      target: candidate,
      prerequisites: ["verified-upload-input-manifest", "github-control-readback", "staging-golden-path-proof", "recovery-receipt", "current-no-go-blocker-review"],
      requestedCommands: ["opennextjs-cloudflare upload <verified-candidate>", "wrangler deployments list --name archestimator-proof", "wrangler rollback <verified-prior-version>"],
      expectedEffect: "Only the exact verified Worker candidate is promoted after final readback.",
      costPosture: "free-tier-only",
      rollback: "Code rollback only; data and schema recovery remain separate and require their own verified receipt.",
      proof: ["returned-worker-version-id", "authenticated-smoke-receipt", "rollback-and-repromotion-receipt", "final-traffic-readback"],
      exclusions: ["No data rollback", "No paid add-on", "No unrelated Cloudflare resource", "No real-recipient email"],
    }),
  ];
}
