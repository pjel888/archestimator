#!/usr/bin/env bun

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, resolve, sep } from "node:path";

import type { CloudflareMigrationInventory } from "./generate-cloudflare-migration-inventory";

type GateScope =
  | "database"
  | "d1"
  | "auth"
  | "authorization"
  | "rpc"
  | "realtime"
  | "restore"
  | "performance";

type Gate = {
  key: string;
  label: string;
  scope: GateScope;
  ready: boolean;
  evidence: string;
  blocker: string | null;
  source: string | null;
};

type Artifact<T> = {
  source: string | null;
  present: boolean;
  value: T | null;
};

type AccessMatrixReport = {
  accessPathCount?: number;
  positiveTestCount?: number;
  denialTestCount?: number;
  allProtectedAccessPathsCovered?: boolean;
  crossWorkspaceDenialsReady?: boolean;
  routeActionCoverageReady?: boolean;
};

type RpcRewriteReport = {
  mappedRpcNames?: number;
  totalRpcNames?: number;
  goldenFixturesReady?: boolean;
  transactionProofReady?: boolean;
  rollbackProofReady?: boolean;
  idempotencyProofReady?: boolean;
  localRpcMechanicsProofReady?: boolean;
  productionRpcRewriteReady?: boolean;
};

type RpcTransactionProofReport = {
  localTransactionMechanicsReady?: boolean;
  localRollbackMechanicsReady?: boolean;
  localIdempotencyMechanicsReady?: boolean;
  localRpcMechanicsProofReady?: boolean;
  productionRpcRewriteReady?: boolean;
  localOnly?: boolean;
  providerBacked?: boolean;
  fixture?: {
    coveredPatternCount?: number;
    coveredRpcDomains?: string[];
    rollbackResidueRows?: number;
    duplicateSideEffects?: number;
  };
};

type BetaFeedbackD1ProofReport = {
  readiness?: {
    schemaReady?: boolean;
    appLayerAuthzReady?: boolean;
    localBetaFeedbackD1SliceReady?: boolean;
    productionBetaFeedbackD1Ready?: boolean;
  };
  localOnly?: boolean;
  providerBacked?: boolean;
  fixture?: {
    feedbackRows?: number;
    forgedWorkspaceRows?: number;
    mismatchedProjectRows?: number;
    rollbackResidueRows?: number;
    duplicateStatusAuditRows?: number;
  };
};

type CollaborationInvitationD1ProofReport = {
  readiness?: {
    schemaReady?: boolean;
    tokenIssueReady?: boolean;
    resolveStateReady?: boolean;
    acceptByTokenReady?: boolean;
    acceptByIdReady?: boolean;
    localCollaborationInvitationD1SliceReady?: boolean;
    productionCollaborationInvitationD1Ready?: boolean;
  };
  affectedRpcNames?: string[];
  localOnly?: boolean;
  providerBacked?: boolean;
  fixture?: {
    tokenIssueRows?: number;
    activeTokensAfterIssue?: number;
    wrongAccountMembershipRows?: number;
    rollbackResidueRows?: number;
    duplicateAcceptAuditRows?: number;
    replayBlockedAuditRows?: number;
  };
};

type ClosedBetaD1ProofReport = {
  affectedRpcNames?: string[];
  readiness?: {
    schemaReady?: boolean;
    statusContractReady?: boolean;
    appLayerAdminGuardReady?: boolean;
    accessCheckReady?: boolean;
    queueReadReady?: boolean;
    createMutationReady?: boolean;
    updateMutationReady?: boolean;
    localClosedBetaD1SliceReady?: boolean;
    productionClosedBetaD1Ready?: boolean;
  };
  localOnly?: boolean;
  providerBacked?: boolean;
  fixture?: {
    adminQueueRows?: number;
    nonAdminQueueRows?: number;
    createRows?: number;
    duplicateCreateRows?: number;
    nonAdminCreateRows?: number;
    rollbackResidueRows?: number;
  };
};

type ComponentLibraryD1ProofReport = {
  affectedRpcNames?: string[];
  readiness?: {
    schemaReady?: boolean;
    appLayerEditorGuardReady?: boolean;
    folderDeleteReady?: boolean;
    folderReorderReady?: boolean;
    bulkArchiveReady?: boolean;
    componentUpdateReady?: boolean;
    lifecycleMutationReady?: boolean;
    priceOptionUpsertReady?: boolean;
    localComponentLibraryD1SliceReady?: boolean;
    productionComponentLibraryD1Ready?: boolean;
  };
  localOnly?: boolean;
  providerBacked?: boolean;
  fixture?: {
    viewerDeleteResidueRows?: number;
    rollbackResidueRows?: number;
    duplicatePriceHistoryRows?: number;
    duplicateBulkArchiveEventRows?: number;
    archivedComponentRows?: number;
    restoredComponentRows?: number;
  };
};

type EstimateHistoryD1ProofReport = {
  affectedRpcNames?: string[];
  readiness?: {
    schemaReady?: boolean;
    appLayerEditorGuardReady?: boolean;
    estimateTabMutationReady?: boolean;
    subtreeInsertReady?: boolean;
    rowMoveReady?: boolean;
    sheetAdjustmentReady?: boolean;
    packageApplyReady?: boolean;
    promoteToLibraryReady?: boolean;
    rollbackReady?: boolean;
    idempotencyReady?: boolean;
    queryBudgetReady?: boolean;
    restoreFixtureReady?: boolean;
    localEstimateHistoryD1SliceReady?: boolean;
    productionEstimateHistoryD1Ready?: boolean;
  };
  localOnly?: boolean;
  providerBacked?: boolean;
  fixture?: {
    viewerMutationResidueRows?: number;
    rollbackResidueRows?: number;
    duplicateSubtreeOperationRows?: number;
    projectPackageCommandRows?: number;
    libraryPackageCommandRows?: number;
    restoredHistoryRows?: number;
  };
};

type RestoreRehearsalReport = {
  d1ExportReady?: boolean;
  d1ImportReady?: boolean;
  restoreRehearsalReady?: boolean;
  destructiveRestoreDocumented?: boolean;
  localOnly?: boolean;
  providerBacked?: boolean;
};

type PerformanceProofReport = {
  queryCountBudgetsReady?: boolean;
  p95RouteProofReady?: boolean;
  hostedWorkerD1PerformanceReady?: boolean;
  localOnly?: boolean;
  providerBacked?: boolean;
};

type BetterAuthRouteGateProofReport = {
  readiness?: {
    localBetterAuthRouteGateProofReady?: boolean;
    productionBetterAuthReady?: boolean;
    betterAuthDependencyPresent?: boolean;
    d1DatabaseAdapterPatternReady?: boolean;
    nextRouteHandlerPatternReady?: boolean;
    secureServerSessionCheckPatternReady?: boolean;
    migrationCompilationHelperReady?: boolean;
    routeGateHelperTestCoverageReady?: boolean;
    routeGateD1SessionFixtureReady?: boolean;
    betterAuthD1SchemaSqlGenerated?: boolean;
    betterAuthD1SchemaSqlReviewReady?: boolean;
    hostedBetterAuthD1SchemaProofReady?: boolean;
    betterAuthSecretProviderReady?: boolean;
    providerBackedSessionFixtureReady?: boolean;
    providerBackedCallbackSessionCutoverReady?: boolean;
    betterAuthProviderProofReady?: boolean;
    routeGateParityMatrixReady?: boolean;
    currentSupabaseGatePreserved?: boolean;
  };
  scaffoldSummary?: {
    actualNextRouteMounted?: boolean;
    routeGateParityRows?: number;
  };
  providerProofSummary?: {
    schemaApplyReady?: boolean;
    expectedTablesPresent?: boolean;
    expectedIndexesPresent?: boolean;
    secretProviderReady?: boolean;
    baseUrlReady?: boolean;
    trustedOriginsReady?: boolean;
    providerSessionFixtureReady?: boolean;
    providerBackedCallbackSessionCutoverReady?: boolean;
    cleanupReady?: boolean;
    betterAuthProviderProofReady?: boolean;
    rowsRemaining?: number | null;
  };
  localOnly?: boolean;
  providerBacked?: boolean;
};

type SourceSignals = {
  d1Files: string[];
  betterAuthFiles: string[];
  betterAuthD1AdapterFiles: string[];
  betterAuthRouteGateFiles: string[];
  supabaseAuthFiles: string[];
  supabaseRealtimeFiles: string[];
  durableObjectRealtimeFiles: string[];
};

type CandidateD1Slice = {
  name: string;
  risk: "low" | "medium" | "high";
  reason: string;
  rpcNames: string[];
};

type CheckInputs = {
  inventory: Artifact<Partial<CloudflareMigrationInventory>>;
  packageJsonText: string | null;
  wranglerConfigText: string | null;
  generatedTypesText: string | null;
  sourceFileTextByPath: Record<string, string>;
  authzAccessMatrix: Artifact<AccessMatrixReport>;
  rpcRewriteMap: Artifact<RpcRewriteReport>;
  rpcTransactionProof: Artifact<RpcTransactionProofReport>;
  betaFeedbackD1Proof: Artifact<BetaFeedbackD1ProofReport>;
  collaborationInvitationD1Proof: Artifact<CollaborationInvitationD1ProofReport>;
  closedBetaD1Proof: Artifact<ClosedBetaD1ProofReport>;
  componentLibraryD1Proof: Artifact<ComponentLibraryD1ProofReport>;
  estimateHistoryD1Proof: Artifact<EstimateHistoryD1ProofReport>;
  restoreRehearsal: Artifact<RestoreRehearsalReport>;
  performanceProof: Artifact<PerformanceProofReport>;
  betterAuthRouteGateProof: Artifact<BetterAuthRouteGateProofReport>;
  generatedAt?: string;
  sources?: Partial<CloudflareD1AuthRealtimeReadinessReport["sources"]>;
};

export type CloudflareD1AuthRealtimeReadinessReport = {
  generatedAt: string;
  mode: "cloudflare-d1-auth-realtime-readiness";
  sources: {
    inventory: string | null;
    packageJson: string | null;
    wranglerConfig: string | null;
    generatedTypes: string | null;
    sourceRoots: string[];
    authzAccessMatrix: string | null;
    rpcRewriteMap: string | null;
    rpcTransactionProof: string | null;
    betaFeedbackD1Proof: string | null;
    collaborationInvitationD1Proof: string | null;
    closedBetaD1Proof: string | null;
    componentLibraryD1Proof: string | null;
    estimateHistoryD1Proof: string | null;
    restoreRehearsal: string | null;
    performanceProof: string | null;
    betterAuthRouteGateProof: string | null;
  };
  inventorySummary: {
    appRoutes: number | null;
    providerCoupledFiles: number | null;
    distinctRpcNames: number | null;
    appliedMigrationFiles: number | null;
    functionDeclarationMatches: number | null;
    rlsPolicyStorageAuthMatches: number | null;
  };
  manifestSummary: {
    d1DatabaseBindings: string[];
    typedD1Bindings: string[];
    durableObjectBindings: string[];
    typedDurableObjectBindings: string[];
    hasBetterAuthDependency: boolean;
  };
  sourceSignals: SourceSignals;
  candidateFirstD1Slices: CandidateD1Slice[];
  gates: Gate[];
  readiness: {
    databaseInventoryReady: boolean;
    d1BindingReady: boolean;
    betterAuthLocalProofReady: boolean;
    hostedBetterAuthD1SchemaProofReady: boolean;
    betterAuthSecretProviderReady: boolean;
    providerBackedSessionFixtureReady: boolean;
    providerBackedCallbackSessionCutoverReady: boolean;
    betterAuthProviderProofReady: boolean;
    authReplacementReady: boolean;
    appLayerAuthzSpecReady: boolean;
    localRpcTransactionMechanicsReady: boolean;
    localBetaFeedbackD1SliceReady: boolean;
    localCollaborationInvitationD1SliceReady: boolean;
    localClosedBetaD1SliceReady: boolean;
    localComponentLibraryD1SliceReady: boolean;
    localEstimateHistoryD1SliceReady: boolean;
    rpcRewritePlanReady: boolean;
    realtimeReplacementReady: boolean;
    restoreProofReady: boolean;
    performanceProofReady: boolean;
    localRedesignReadinessReportReady: boolean;
    productionD1AuthRealtimeReady: boolean;
  };
  blockers: string[];
  note: string;
};

const PLAN_ROOT = ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence";

const DEFAULT_FILES = {
  inventory: `${PLAN_ROOT}/2026-06-30-cloudflare-migration-inventory.json`,
  authzAccessMatrix: `${PLAN_ROOT}/2026-06-30-cloudflare-d1-authz-access-matrix.json`,
  rpcRewriteMap: `${PLAN_ROOT}/2026-06-30-cloudflare-d1-rpc-rewrite-map.json`,
  rpcTransactionProof: `${PLAN_ROOT}/2026-06-30-cloudflare-d1-rpc-transaction-proof.json`,
  betaFeedbackD1Proof: `${PLAN_ROOT}/2026-06-30-cloudflare-d1-beta-feedback-proof.json`,
  collaborationInvitationD1Proof: `${PLAN_ROOT}/2026-06-30-cloudflare-d1-collaboration-invitation-proof.json`,
  closedBetaD1Proof: `${PLAN_ROOT}/2026-06-30-cloudflare-d1-closed-beta-proof.json`,
  componentLibraryD1Proof: `${PLAN_ROOT}/2026-06-30-cloudflare-d1-component-library-proof.json`,
  estimateHistoryD1Proof: `${PLAN_ROOT}/2026-06-30-cloudflare-d1-estimate-history-proof.json`,
  restoreRehearsal: `${PLAN_ROOT}/2026-06-30-cloudflare-d1-restore-rehearsal.json`,
  performanceProof: `${PLAN_ROOT}/2026-06-30-cloudflare-d1-performance-proof.json`,
  betterAuthRouteGateProof: `${PLAN_ROOT}/2026-06-30-cloudflare-better-auth-route-gate-proof.json`,
} as const;

const SOURCE_EXTENSIONS = new Set([".cjs", ".cts", ".js", ".jsx", ".mjs", ".mts", ".ts", ".tsx"]);

function readEnv(name: string) {
  const value = process.env[name];
  return value?.trim() || undefined;
}

function readText(path: string) {
  return existsSync(path) ? readFileSync(path, "utf8") : null;
}

function readArtifact<T>(source: string | undefined): Artifact<T> {
  if (!source || !existsSync(source)) {
    return { source: source ?? null, present: false, value: null };
  }
  return {
    source,
    present: true,
    value: JSON.parse(readFileSync(source, "utf8")) as T,
  };
}

function normalizeRepoPath(path: string) {
  return path.split(sep).join("/");
}

function toRepoRelativePath(path: string) {
  const normalized = normalizeRepoPath(path);
  const cwd = normalizeRepoPath(process.cwd());
  return normalized.startsWith(`${cwd}/`) ? normalized.slice(cwd.length + 1) : normalized;
}

function isSourceFile(path: string) {
  return SOURCE_EXTENSIONS.has(extname(path));
}

function listFilesRecursively(path: string, includeFile: (path: string) => boolean) {
  if (!existsSync(path)) return [];
  const stats = statSync(path);
  if (stats.isFile()) return includeFile(path) ? [normalizeRepoPath(path)] : [];
  const files: string[] = [];

  for (const entry of readdirSync(path, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const childPath = resolve(path, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursively(childPath, includeFile));
    } else if (entry.isFile() && includeFile(childPath)) {
      files.push(normalizeRepoPath(childPath));
    }
  }

  return files.sort();
}

function readFiles(paths: string[]) {
  const textByPath: Record<string, string> = {};
  for (const path of paths) {
    textByPath[toRepoRelativePath(path)] = readFileSync(path, "utf8");
  }
  return textByPath;
}

function boolLabel(value: unknown) {
  if (value === true) return "yes";
  if (value === false) return "no";
  return "(missing)";
}

function numberLabel(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "(missing)";
}

function gate(
  key: string,
  label: string,
  scope: GateScope,
  ready: boolean,
  evidence: string,
  blocker: string,
  source: string | null,
): Gate {
  return {
    key,
    label,
    scope,
    ready,
    evidence,
    blocker: ready ? null : blocker,
    source,
  };
}

function stripJsonComments(input: string) {
  let output = "";
  let inString = false;
  let escaped = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      output += char;
      continue;
    }

    if (char === "/" && next === "/") {
      while (index < input.length && input[index] !== "\n") index += 1;
      output += "\n";
      continue;
    }

    if (char === "/" && next === "*") {
      index += 2;
      while (index < input.length && !(input[index] === "*" && input[index + 1] === "/")) index += 1;
      index += 1;
      continue;
    }

    output += char;
  }

  return output;
}

function parseJsonObject(input: string | null): Record<string, unknown> {
  if (!input) return {};
  try {
    return JSON.parse(stripJsonComments(input)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function stringArrayFromUnknown(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.length > 0) : [];
}

function extractPackageDependencyNames(packageJsonText: string | null) {
  const parsed = parseJsonObject(packageJsonText);
  const dependencies = parsed.dependencies && typeof parsed.dependencies === "object"
    ? Object.keys(parsed.dependencies)
    : [];
  const devDependencies = parsed.devDependencies && typeof parsed.devDependencies === "object"
    ? Object.keys(parsed.devDependencies)
    : [];
  return new Set([...dependencies, ...devDependencies].sort());
}

function extractD1Bindings(wranglerConfigText: string | null) {
  const parsed = parseJsonObject(wranglerConfigText);
  const bindings = Array.isArray(parsed.d1_databases)
    ? parsed.d1_databases
      .map((entry) => entry && typeof entry === "object" ? (entry as { binding?: unknown }).binding : null)
      .filter((binding): binding is string => typeof binding === "string" && binding.length > 0)
    : [];
  return Array.from(new Set(bindings)).sort();
}

function extractDurableObjectBindings(wranglerConfigText: string | null) {
  const parsed = parseJsonObject(wranglerConfigText);
  const durableObjects = parsed.durable_objects;
  if (!durableObjects || typeof durableObjects !== "object") return [];
  const bindings = (durableObjects as { bindings?: unknown }).bindings;
  if (!Array.isArray(bindings)) return [];
  return Array.from(new Set(bindings
    .map((entry) => entry && typeof entry === "object" ? (entry as { name?: unknown }).name : null)
    .filter((name): name is string => typeof name === "string" && name.length > 0))).sort();
}

function extractEnvInterfaceBlock(generatedTypesText: string | null) {
  const match = generatedTypesText?.match(/interface\s+__BaseEnv_CloudflareEnv\s*{([\s\S]*?)\n\s*}/);
  return match?.[1] ?? "";
}

function extractTypedBindings(generatedTypesText: string | null, bindingType: "D1Database" | "DurableObjectNamespace") {
  const block = extractEnvInterfaceBlock(generatedTypesText);
  const names = new Set<string>();
  const regex = new RegExp(`\\b([A-Z][A-Z0-9_]*)\\s*:\\s*${bindingType}(?:<[^;]+>)?\\s*;`, "g");
  for (const match of block.matchAll(regex)) {
    names.add(match[1]);
  }
  return [...names].sort();
}

function filesMatching(sourceFileTextByPath: Record<string, string>, pattern: RegExp) {
  return Object.entries(sourceFileTextByPath)
    .filter(([, text]) => pattern.test(text))
    .map(([file]) => file)
    .sort();
}

function detectSourceSignals(sourceFileTextByPath: Record<string, string>): SourceSignals {
  return {
    d1Files: filesMatching(sourceFileTextByPath, /\bD1Database\b|\bd1_databases\b|\.prepare\s*\(/i),
    betterAuthFiles: filesMatching(sourceFileTextByPath, /\bbetter-auth\b|betterAuth\s*\(/i),
    betterAuthD1AdapterFiles: filesMatching(
      sourceFileTextByPath,
      /\bbetter-auth\b[\s\S]{0,400}\b(?:d1(?:adapter|database)?|sqlite|cloudflare)\b|\b(?:d1(?:adapter|database)?|D1Database|sqlite|cloudflare)\b[\s\S]{0,400}\bbetter-auth\b/i,
    ),
    betterAuthRouteGateFiles: filesMatching(
      sourceFileTextByPath,
      /\bbetter-auth\b[\s\S]{0,400}\b(?:getSession|api|middleware|proxy|route gate|requireUser)\b|\b(?:getSession|middleware|proxy|requireUser)\b[\s\S]{0,400}\bbetter-auth\b/i,
    ),
    supabaseAuthFiles: filesMatching(
      sourceFileTextByPath,
      /supabase\.auth|\.auth\.getUser\s*\(|\.auth\.signOut\s*\(|exchangeCodeForSession|@supabase\/ssr/i,
    ),
    supabaseRealtimeFiles: filesMatching(sourceFileTextByPath, /\.channel\s*\(|RealtimeChannel|\brealtime\b/i),
    durableObjectRealtimeFiles: filesMatching(
      sourceFileTextByPath,
      /extends\s+DurableObject|\bDurableObject\b[\s\S]{0,120}\bfrom\s+["']cloudflare:workers["']|acceptWebSocket|webSocketMessage|WebSocketPair/i,
    ),
  };
}

function summarizeInventory(inventory: Artifact<Partial<CloudflareMigrationInventory>>) {
  const counts = inventory.value?.counts;
  const sql = inventory.value?.sqlInventory;
  return {
    appRoutes: typeof counts?.appRoutes === "number" ? counts.appRoutes : null,
    providerCoupledFiles: typeof counts?.providerCoupledFiles === "number" ? counts.providerCoupledFiles : null,
    distinctRpcNames: typeof counts?.distinctRpcNames === "number" ? counts.distinctRpcNames : null,
    appliedMigrationFiles: typeof sql?.appliedMigrationFiles === "number" ? sql.appliedMigrationFiles : null,
    functionDeclarationMatches: typeof sql?.functionDeclarationMatches === "number" ? sql.functionDeclarationMatches : null,
    rlsPolicyStorageAuthMatches: typeof sql?.rlsPolicyStorageAuthMatches === "number"
      ? sql.rlsPolicyStorageAuthMatches
      : null,
  };
}

function getInventoryRpcNames(inventory: Artifact<Partial<CloudflareMigrationInventory>>) {
  return (inventory.value?.rpcCalls ?? [])
    .map((row) => row.name)
    .filter((name): name is string => typeof name === "string")
    .sort();
}

function matchingRpcNames(rpcNames: string[], pattern: RegExp) {
  return rpcNames.filter((name) => pattern.test(name)).slice(0, 12);
}

function buildCandidateD1Slices(inventory: Artifact<Partial<CloudflareMigrationInventory>>): CandidateD1Slice[] {
  const rpcNames = getInventoryRpcNames(inventory);
  return [
    {
      name: "Beta feedback submissions",
      risk: "low",
      reason: "Narrow prelaunch data shape with limited workflow coupling.",
      rpcNames: matchingRpcNames(rpcNames, /beta|feedback/i),
    },
    {
      name: "Closed-beta allowlist",
      risk: "low",
      reason: "Sensitive but narrow prelaunch access-control table with bounded admin mutations and existing route/action tests.",
      rpcNames: matchingRpcNames(rpcNames, /closed_beta|allowlist/i),
    },
    {
      name: "Collaboration invitation tokens",
      risk: "medium",
      reason: "Token issue/resolve/accept touches memberships and audit rows, but is bounded enough for a local D1 domain proof before core estimate writes.",
      rpcNames: matchingRpcNames(rpcNames, /collaboration_invitation|invitation_token|pending_collaboration/i),
    },
    {
      name: "Upload metadata and scan state",
      risk: "medium",
      reason: "R2 byte storage has local adapters, but metadata authorization still needs D1/app-layer proof.",
      rpcNames: matchingRpcNames(rpcNames, /upload|asset|scan|cleanup/i),
    },
    {
      name: "Library read models",
      risk: "medium",
      reason: "Read-heavy catalogs are useful for D1 query-count and p95 proof before core estimate writes.",
      rpcNames: matchingRpcNames(rpcNames, /library|component|template|brand/i),
    },
    {
      name: "Component-library mutations",
      risk: "medium",
      reason: "Folder, component versioning, price option, lifecycle, and bulk archive writes exercise D1 transaction and idempotency patterns before estimate-history rewrites.",
      rpcNames: matchingRpcNames(rpcNames, /delete_library_folder|execute_bulk_archive_library_components|reorder_library_folders|set_cost_library_component_lifecycle_state|update_cost_library_component|upsert_cost_library_component_price_option/i),
    },
    {
      name: "Estimate-history mutations",
      risk: "high",
      reason: "Core estimating writes touch tabs, rows, subtrees, package apply commands, and history/audit rows; keep this as a proven local D1 slice before live D1 replacement.",
      rpcNames: matchingRpcNames(rpcNames, /estimate_tab_with_history|estimate_subtree|move_estimate_row_item_with_history|sheet_adjustment_with_history|project_estimate_package|ai_package_library_components|promote_estimate_row_to_library_component/i),
    },
    {
      name: "Workspace/project authorization core",
      risk: "high",
      reason: "This is the RLS replacement boundary and must wait for access matrices plus denial tests.",
      rpcNames: matchingRpcNames(rpcNames, /can_|authorize|workspace|project|collaboration|member/i),
    },
  ];
}

function buildGates(inputs: CheckInputs, manifestSummary: CloudflareD1AuthRealtimeReadinessReport["manifestSummary"], sourceSignals: SourceSignals) {
  const inventorySummary = summarizeInventory(inputs.inventory);
  const gates: Gate[] = [];

  gates.push(gate(
    "database-inventory",
    "Supabase database behavior inventory ready",
    "database",
    inputs.inventory.present
      && Boolean(inventorySummary.appRoutes)
      && Boolean(inventorySummary.providerCoupledFiles)
      && Boolean(inventorySummary.distinctRpcNames)
      && Boolean(inventorySummary.appliedMigrationFiles)
      && Boolean(inventorySummary.functionDeclarationMatches)
      && Boolean(inventorySummary.rlsPolicyStorageAuthMatches),
    `routes=${numberLabel(inventorySummary.appRoutes)}, providerCoupledFiles=${numberLabel(inventorySummary.providerCoupledFiles)}, rpcNames=${numberLabel(inventorySummary.distinctRpcNames)}, sqlMigrations=${numberLabel(inventorySummary.appliedMigrationFiles)}, sqlFunctions=${numberLabel(inventorySummary.functionDeclarationMatches)}, rlsPolicyStorageAuthMatches=${numberLabel(inventorySummary.rlsPolicyStorageAuthMatches)}`,
    "Repeatable Supabase route/provider/RPC/RLS inventory is missing or incomplete.",
    inputs.inventory.source,
  ));

  gates.push(gate(
    "d1-binding-config",
    "D1 database binding configured and typed",
    "d1",
    manifestSummary.d1DatabaseBindings.length > 0
      && manifestSummary.d1DatabaseBindings.every((binding) => manifestSummary.typedD1Bindings.includes(binding)),
    `wranglerD1Bindings=${manifestSummary.d1DatabaseBindings.length === 0 ? "(none)" : manifestSummary.d1DatabaseBindings.join(", ")}, typedD1Bindings=${manifestSummary.typedD1Bindings.length === 0 ? "(none)" : manifestSummary.typedD1Bindings.join(", ")}`,
    "Wrangler has no D1 database binding that is also typed in cloudflare-env.d.ts.",
    inputs.sources?.wranglerConfig ?? null,
  ));

  gates.push(gate(
    "better-auth-local-route-gate-proof",
    "Better Auth D1 local route-gate proof ready",
    "auth",
    manifestSummary.hasBetterAuthDependency
      && sourceSignals.betterAuthFiles.length > 0
      && sourceSignals.betterAuthD1AdapterFiles.length > 0
      && sourceSignals.betterAuthRouteGateFiles.length > 0
      && inputs.betterAuthRouteGateProof.present
      && inputs.betterAuthRouteGateProof.value?.readiness?.localBetterAuthRouteGateProofReady === true,
    `betterAuthDependency=${boolLabel(manifestSummary.hasBetterAuthDependency)}, betterAuthFiles=${sourceSignals.betterAuthFiles.length}, d1AdapterFiles=${sourceSignals.betterAuthD1AdapterFiles.length}, routeGateFiles=${sourceSignals.betterAuthRouteGateFiles.length}, localProof=${boolLabel(inputs.betterAuthRouteGateProof.value?.readiness?.localBetterAuthRouteGateProofReady)}, routeGateHelperTests=${boolLabel(inputs.betterAuthRouteGateProof.value?.readiness?.routeGateHelperTestCoverageReady)}, routeGateD1SessionFixture=${boolLabel(inputs.betterAuthRouteGateProof.value?.readiness?.routeGateD1SessionFixtureReady)}, schemaSqlGenerated=${boolLabel(inputs.betterAuthRouteGateProof.value?.readiness?.betterAuthD1SchemaSqlGenerated)}, schemaSqlReview=${boolLabel(inputs.betterAuthRouteGateProof.value?.readiness?.betterAuthD1SchemaSqlReviewReady)}, parityRows=${numberLabel(inputs.betterAuthRouteGateProof.value?.scaffoldSummary?.routeGateParityRows)}, existingSupabaseAuthFiles=${sourceSignals.supabaseAuthFiles.length}`,
    "Local Better Auth dependency, D1 database factory, secure route-gate session check, parity matrix, or proof artifact is missing.",
    inputs.betterAuthRouteGateProof.source,
  ));

  const betterAuthRouteMounted = inputs.betterAuthRouteGateProof.value?.scaffoldSummary?.actualNextRouteMounted === true;
  const betterAuthSchemaSqlReady = inputs.betterAuthRouteGateProof.value?.readiness?.betterAuthD1SchemaSqlGenerated === true
    && inputs.betterAuthRouteGateProof.value?.readiness?.betterAuthD1SchemaSqlReviewReady === true;
  const betterAuthHostedSchemaProofReady = inputs.betterAuthRouteGateProof.value?.readiness?.hostedBetterAuthD1SchemaProofReady === true;
  const betterAuthProviderSecretReady = inputs.betterAuthRouteGateProof.value?.readiness?.betterAuthSecretProviderReady === true;
  const betterAuthProviderSessionFixtureReady = inputs.betterAuthRouteGateProof.value?.readiness?.providerBackedSessionFixtureReady === true;
  const betterAuthProviderCallbackSessionCutoverReady = inputs.betterAuthRouteGateProof.value?.readiness?.providerBackedCallbackSessionCutoverReady === true;
  const betterAuthProviderProofReady = inputs.betterAuthRouteGateProof.value?.readiness?.betterAuthProviderProofReady === true;
  const betterAuthReplacementBlocker = betterAuthProviderProofReady
    ? betterAuthProviderCallbackSessionCutoverReady
      ? "Better Auth production cutover proof is missing: OAuth provider credential proof, live route cutover, or Supabase auth removal is incomplete."
      : "Better Auth production cutover proof is missing: OAuth/magic-link callback flow, provider-backed callback/session cutover tests, or Supabase auth removal is incomplete."
    : betterAuthRouteMounted
      ? "Better Auth production cutover proof is missing: hosted D1 schema apply/provider proof, provider secrets, OAuth/magic-link secrets, provider-backed callback/session tests, or Supabase auth removal is incomplete."
      : "Better Auth production cutover proof is missing: route mount, hosted D1 schema apply/provider proof, provider secrets, OAuth/magic-link secrets, provider-backed callback/session tests, or Supabase auth removal is incomplete.";

  gates.push(gate(
    "better-auth-replacement",
    "Better Auth D1 production replacement ready",
    "auth",
    manifestSummary.hasBetterAuthDependency
      && sourceSignals.betterAuthFiles.length > 0
      && sourceSignals.betterAuthD1AdapterFiles.length > 0
      && sourceSignals.betterAuthRouteGateFiles.length > 0
      && inputs.betterAuthRouteGateProof.present
      && inputs.betterAuthRouteGateProof.value?.readiness?.productionBetterAuthReady === true,
    `betterAuthDependency=${boolLabel(manifestSummary.hasBetterAuthDependency)}, betterAuthFiles=${sourceSignals.betterAuthFiles.length}, d1AdapterFiles=${sourceSignals.betterAuthD1AdapterFiles.length}, routeGateFiles=${sourceSignals.betterAuthRouteGateFiles.length}, localProof=${boolLabel(inputs.betterAuthRouteGateProof.value?.readiness?.localBetterAuthRouteGateProofReady)}, routeGateD1SessionFixture=${boolLabel(inputs.betterAuthRouteGateProof.value?.readiness?.routeGateD1SessionFixtureReady)}, schemaSqlReady=${boolLabel(betterAuthSchemaSqlReady)}, hostedSchemaProof=${boolLabel(betterAuthHostedSchemaProofReady)}, providerSecret=${boolLabel(betterAuthProviderSecretReady)}, providerSessionFixture=${boolLabel(betterAuthProviderSessionFixtureReady)}, providerCallbackSession=${boolLabel(betterAuthProviderCallbackSessionCutoverReady)}, providerProof=${boolLabel(betterAuthProviderProofReady)}, productionProof=${boolLabel(inputs.betterAuthRouteGateProof.value?.readiness?.productionBetterAuthReady)}, actualRouteMounted=${boolLabel(inputs.betterAuthRouteGateProof.value?.scaffoldSummary?.actualNextRouteMounted)}, localOnly=${boolLabel(inputs.betterAuthRouteGateProof.value?.localOnly)}, providerBacked=${boolLabel(inputs.betterAuthRouteGateProof.value?.providerBacked)}`,
    betterAuthReplacementBlocker,
    inputs.betterAuthRouteGateProof.source,
  ));

  gates.push(gate(
    "app-layer-authz-access-matrix",
    "App-layer authorization access matrix and denial tests ready",
    "authorization",
    inputs.authzAccessMatrix.present
      && inputs.authzAccessMatrix.value?.allProtectedAccessPathsCovered === true
      && inputs.authzAccessMatrix.value.crossWorkspaceDenialsReady === true
      && inputs.authzAccessMatrix.value.routeActionCoverageReady === true
      && Boolean(inputs.authzAccessMatrix.value.accessPathCount)
      && Boolean(inputs.authzAccessMatrix.value.denialTestCount)
      && Boolean(inputs.authzAccessMatrix.value.positiveTestCount),
    `present=${boolLabel(inputs.authzAccessMatrix.present)}, accessPaths=${numberLabel(inputs.authzAccessMatrix.value?.accessPathCount)}, positiveTests=${numberLabel(inputs.authzAccessMatrix.value?.positiveTestCount)}, denialTests=${numberLabel(inputs.authzAccessMatrix.value?.denialTestCount)}, allCovered=${boolLabel(inputs.authzAccessMatrix.value?.allProtectedAccessPathsCovered)}, crossWorkspaceDenials=${boolLabel(inputs.authzAccessMatrix.value?.crossWorkspaceDenialsReady)}, routeActionCoverage=${boolLabel(inputs.authzAccessMatrix.value?.routeActionCoverageReady)}`,
    "Executable app-layer authorization matrix with positive and cross-workspace denial coverage is missing.",
    inputs.authzAccessMatrix.source,
  ));

  gates.push(gate(
    "d1-beta-feedback-local-domain-proof",
    "D1 beta-feedback local domain proof ready",
    "d1",
    inputs.betaFeedbackD1Proof.present
      && inputs.betaFeedbackD1Proof.value?.readiness?.schemaReady === true
      && inputs.betaFeedbackD1Proof.value.readiness.appLayerAuthzReady === true
      && inputs.betaFeedbackD1Proof.value.readiness.localBetaFeedbackD1SliceReady === true,
    `present=${boolLabel(inputs.betaFeedbackD1Proof.present)}, schema=${boolLabel(inputs.betaFeedbackD1Proof.value?.readiness?.schemaReady)}, appLayerAuthz=${boolLabel(inputs.betaFeedbackD1Proof.value?.readiness?.appLayerAuthzReady)}, localSlice=${boolLabel(inputs.betaFeedbackD1Proof.value?.readiness?.localBetaFeedbackD1SliceReady)}, productionProof=${boolLabel(inputs.betaFeedbackD1Proof.value?.readiness?.productionBetaFeedbackD1Ready)}, feedbackRows=${numberLabel(inputs.betaFeedbackD1Proof.value?.fixture?.feedbackRows)}, forgedWorkspaceRows=${numberLabel(inputs.betaFeedbackD1Proof.value?.fixture?.forgedWorkspaceRows)}, mismatchedProjectRows=${numberLabel(inputs.betaFeedbackD1Proof.value?.fixture?.mismatchedProjectRows)}, rollbackResidueRows=${numberLabel(inputs.betaFeedbackD1Proof.value?.fixture?.rollbackResidueRows)}, duplicateStatusAuditRows=${numberLabel(inputs.betaFeedbackD1Proof.value?.fixture?.duplicateStatusAuditRows)}, localOnly=${boolLabel(inputs.betaFeedbackD1Proof.value?.localOnly)}, providerBacked=${boolLabel(inputs.betaFeedbackD1Proof.value?.providerBacked)}`,
    "Local D1 beta-feedback schema/authz/denial/rollback/idempotency/query proof is missing or failed.",
    inputs.betaFeedbackD1Proof.source,
  ));

  gates.push(gate(
    "d1-collaboration-invitation-local-domain-proof",
    "D1 collaboration-invitation local domain proof ready",
    "d1",
    inputs.collaborationInvitationD1Proof.present
      && inputs.collaborationInvitationD1Proof.value?.readiness?.schemaReady === true
      && inputs.collaborationInvitationD1Proof.value.readiness.tokenIssueReady === true
      && inputs.collaborationInvitationD1Proof.value.readiness.resolveStateReady === true
      && inputs.collaborationInvitationD1Proof.value.readiness.acceptByTokenReady === true
      && inputs.collaborationInvitationD1Proof.value.readiness.acceptByIdReady === true
      && inputs.collaborationInvitationD1Proof.value.readiness.localCollaborationInvitationD1SliceReady === true,
    `present=${boolLabel(inputs.collaborationInvitationD1Proof.present)}, schema=${boolLabel(inputs.collaborationInvitationD1Proof.value?.readiness?.schemaReady)}, tokenIssue=${boolLabel(inputs.collaborationInvitationD1Proof.value?.readiness?.tokenIssueReady)}, resolveState=${boolLabel(inputs.collaborationInvitationD1Proof.value?.readiness?.resolveStateReady)}, acceptByToken=${boolLabel(inputs.collaborationInvitationD1Proof.value?.readiness?.acceptByTokenReady)}, acceptById=${boolLabel(inputs.collaborationInvitationD1Proof.value?.readiness?.acceptByIdReady)}, localSlice=${boolLabel(inputs.collaborationInvitationD1Proof.value?.readiness?.localCollaborationInvitationD1SliceReady)}, productionProof=${boolLabel(inputs.collaborationInvitationD1Proof.value?.readiness?.productionCollaborationInvitationD1Ready)}, affectedRpcNames=${numberLabel(inputs.collaborationInvitationD1Proof.value?.affectedRpcNames?.length)}, tokenIssueRows=${numberLabel(inputs.collaborationInvitationD1Proof.value?.fixture?.tokenIssueRows)}, activeTokensAfterIssue=${numberLabel(inputs.collaborationInvitationD1Proof.value?.fixture?.activeTokensAfterIssue)}, wrongAccountMembershipRows=${numberLabel(inputs.collaborationInvitationD1Proof.value?.fixture?.wrongAccountMembershipRows)}, rollbackResidueRows=${numberLabel(inputs.collaborationInvitationD1Proof.value?.fixture?.rollbackResidueRows)}, duplicateAcceptAuditRows=${numberLabel(inputs.collaborationInvitationD1Proof.value?.fixture?.duplicateAcceptAuditRows)}, replayBlockedAuditRows=${numberLabel(inputs.collaborationInvitationD1Proof.value?.fixture?.replayBlockedAuditRows)}, localOnly=${boolLabel(inputs.collaborationInvitationD1Proof.value?.localOnly)}, providerBacked=${boolLabel(inputs.collaborationInvitationD1Proof.value?.providerBacked)}`,
    "Local D1 collaboration-invitation schema/token/resolve/accept/denial/rollback/idempotency/query proof is missing or failed.",
    inputs.collaborationInvitationD1Proof.source,
  ));

  gates.push(gate(
    "d1-closed-beta-local-domain-proof",
    "D1 closed-beta local domain proof ready",
    "d1",
    inputs.closedBetaD1Proof.present
      && inputs.closedBetaD1Proof.value?.readiness?.schemaReady === true
      && inputs.closedBetaD1Proof.value.readiness.statusContractReady === true
      && inputs.closedBetaD1Proof.value.readiness.appLayerAdminGuardReady === true
      && inputs.closedBetaD1Proof.value.readiness.accessCheckReady === true
      && inputs.closedBetaD1Proof.value.readiness.queueReadReady === true
      && inputs.closedBetaD1Proof.value.readiness.createMutationReady === true
      && inputs.closedBetaD1Proof.value.readiness.updateMutationReady === true
      && inputs.closedBetaD1Proof.value.readiness.localClosedBetaD1SliceReady === true,
    `present=${boolLabel(inputs.closedBetaD1Proof.present)}, schema=${boolLabel(inputs.closedBetaD1Proof.value?.readiness?.schemaReady)}, statusContract=${boolLabel(inputs.closedBetaD1Proof.value?.readiness?.statusContractReady)}, appLayerAdminGuard=${boolLabel(inputs.closedBetaD1Proof.value?.readiness?.appLayerAdminGuardReady)}, accessCheck=${boolLabel(inputs.closedBetaD1Proof.value?.readiness?.accessCheckReady)}, queueRead=${boolLabel(inputs.closedBetaD1Proof.value?.readiness?.queueReadReady)}, createMutation=${boolLabel(inputs.closedBetaD1Proof.value?.readiness?.createMutationReady)}, updateMutation=${boolLabel(inputs.closedBetaD1Proof.value?.readiness?.updateMutationReady)}, localSlice=${boolLabel(inputs.closedBetaD1Proof.value?.readiness?.localClosedBetaD1SliceReady)}, productionProof=${boolLabel(inputs.closedBetaD1Proof.value?.readiness?.productionClosedBetaD1Ready)}, affectedRpcNames=${numberLabel(inputs.closedBetaD1Proof.value?.affectedRpcNames?.length)}, adminQueueRows=${numberLabel(inputs.closedBetaD1Proof.value?.fixture?.adminQueueRows)}, nonAdminQueueRows=${numberLabel(inputs.closedBetaD1Proof.value?.fixture?.nonAdminQueueRows)}, createRows=${numberLabel(inputs.closedBetaD1Proof.value?.fixture?.createRows)}, duplicateCreateRows=${numberLabel(inputs.closedBetaD1Proof.value?.fixture?.duplicateCreateRows)}, nonAdminCreateRows=${numberLabel(inputs.closedBetaD1Proof.value?.fixture?.nonAdminCreateRows)}, rollbackResidueRows=${numberLabel(inputs.closedBetaD1Proof.value?.fixture?.rollbackResidueRows)}, localOnly=${boolLabel(inputs.closedBetaD1Proof.value?.localOnly)}, providerBacked=${boolLabel(inputs.closedBetaD1Proof.value?.providerBacked)}`,
    "Local D1 closed-beta schema/status/admin-guard/access/queue/mutation/rollback/query proof is missing or failed.",
    inputs.closedBetaD1Proof.source,
  ));

  gates.push(gate(
    "d1-component-library-local-domain-proof",
    "D1 component-library local domain proof ready",
    "d1",
    inputs.componentLibraryD1Proof.present
      && inputs.componentLibraryD1Proof.value?.readiness?.schemaReady === true
      && inputs.componentLibraryD1Proof.value.readiness.appLayerEditorGuardReady === true
      && inputs.componentLibraryD1Proof.value.readiness.folderDeleteReady === true
      && inputs.componentLibraryD1Proof.value.readiness.folderReorderReady === true
      && inputs.componentLibraryD1Proof.value.readiness.bulkArchiveReady === true
      && inputs.componentLibraryD1Proof.value.readiness.componentUpdateReady === true
      && inputs.componentLibraryD1Proof.value.readiness.lifecycleMutationReady === true
      && inputs.componentLibraryD1Proof.value.readiness.priceOptionUpsertReady === true
      && inputs.componentLibraryD1Proof.value.readiness.localComponentLibraryD1SliceReady === true,
    `present=${boolLabel(inputs.componentLibraryD1Proof.present)}, schema=${boolLabel(inputs.componentLibraryD1Proof.value?.readiness?.schemaReady)}, editorGuard=${boolLabel(inputs.componentLibraryD1Proof.value?.readiness?.appLayerEditorGuardReady)}, folderDelete=${boolLabel(inputs.componentLibraryD1Proof.value?.readiness?.folderDeleteReady)}, folderReorder=${boolLabel(inputs.componentLibraryD1Proof.value?.readiness?.folderReorderReady)}, bulkArchive=${boolLabel(inputs.componentLibraryD1Proof.value?.readiness?.bulkArchiveReady)}, componentUpdate=${boolLabel(inputs.componentLibraryD1Proof.value?.readiness?.componentUpdateReady)}, lifecycleMutation=${boolLabel(inputs.componentLibraryD1Proof.value?.readiness?.lifecycleMutationReady)}, priceOptionUpsert=${boolLabel(inputs.componentLibraryD1Proof.value?.readiness?.priceOptionUpsertReady)}, localSlice=${boolLabel(inputs.componentLibraryD1Proof.value?.readiness?.localComponentLibraryD1SliceReady)}, productionProof=${boolLabel(inputs.componentLibraryD1Proof.value?.readiness?.productionComponentLibraryD1Ready)}, affectedRpcNames=${numberLabel(inputs.componentLibraryD1Proof.value?.affectedRpcNames?.length)}, archivedComponentRows=${numberLabel(inputs.componentLibraryD1Proof.value?.fixture?.archivedComponentRows)}, viewerDeleteResidueRows=${numberLabel(inputs.componentLibraryD1Proof.value?.fixture?.viewerDeleteResidueRows)}, rollbackResidueRows=${numberLabel(inputs.componentLibraryD1Proof.value?.fixture?.rollbackResidueRows)}, duplicatePriceHistoryRows=${numberLabel(inputs.componentLibraryD1Proof.value?.fixture?.duplicatePriceHistoryRows)}, duplicateBulkArchiveEventRows=${numberLabel(inputs.componentLibraryD1Proof.value?.fixture?.duplicateBulkArchiveEventRows)}, restoredComponentRows=${numberLabel(inputs.componentLibraryD1Proof.value?.fixture?.restoredComponentRows)}, localOnly=${boolLabel(inputs.componentLibraryD1Proof.value?.localOnly)}, providerBacked=${boolLabel(inputs.componentLibraryD1Proof.value?.providerBacked)}`,
    "Local D1 component-library schema/editor-guard/folder/component/lifecycle/price/bulk/rollback/idempotency/query proof is missing or failed.",
    inputs.componentLibraryD1Proof.source,
  ));

  gates.push(gate(
    "d1-estimate-history-local-domain-proof",
    "D1 estimate-history local domain proof ready",
    "d1",
    inputs.estimateHistoryD1Proof.present
      && inputs.estimateHistoryD1Proof.value?.readiness?.schemaReady === true
      && inputs.estimateHistoryD1Proof.value.readiness.appLayerEditorGuardReady === true
      && inputs.estimateHistoryD1Proof.value.readiness.estimateTabMutationReady === true
      && inputs.estimateHistoryD1Proof.value.readiness.subtreeInsertReady === true
      && inputs.estimateHistoryD1Proof.value.readiness.rowMoveReady === true
      && inputs.estimateHistoryD1Proof.value.readiness.sheetAdjustmentReady === true
      && inputs.estimateHistoryD1Proof.value.readiness.packageApplyReady === true
      && inputs.estimateHistoryD1Proof.value.readiness.promoteToLibraryReady === true
      && inputs.estimateHistoryD1Proof.value.readiness.rollbackReady === true
      && inputs.estimateHistoryD1Proof.value.readiness.idempotencyReady === true
      && inputs.estimateHistoryD1Proof.value.readiness.queryBudgetReady === true
      && inputs.estimateHistoryD1Proof.value.readiness.restoreFixtureReady === true
      && inputs.estimateHistoryD1Proof.value.readiness.localEstimateHistoryD1SliceReady === true,
    `present=${boolLabel(inputs.estimateHistoryD1Proof.present)}, schema=${boolLabel(inputs.estimateHistoryD1Proof.value?.readiness?.schemaReady)}, editorGuard=${boolLabel(inputs.estimateHistoryD1Proof.value?.readiness?.appLayerEditorGuardReady)}, tabMutation=${boolLabel(inputs.estimateHistoryD1Proof.value?.readiness?.estimateTabMutationReady)}, subtreeInsert=${boolLabel(inputs.estimateHistoryD1Proof.value?.readiness?.subtreeInsertReady)}, rowMove=${boolLabel(inputs.estimateHistoryD1Proof.value?.readiness?.rowMoveReady)}, sheetAdjustment=${boolLabel(inputs.estimateHistoryD1Proof.value?.readiness?.sheetAdjustmentReady)}, packageApply=${boolLabel(inputs.estimateHistoryD1Proof.value?.readiness?.packageApplyReady)}, promoteToLibrary=${boolLabel(inputs.estimateHistoryD1Proof.value?.readiness?.promoteToLibraryReady)}, rollback=${boolLabel(inputs.estimateHistoryD1Proof.value?.readiness?.rollbackReady)}, idempotency=${boolLabel(inputs.estimateHistoryD1Proof.value?.readiness?.idempotencyReady)}, queryBudget=${boolLabel(inputs.estimateHistoryD1Proof.value?.readiness?.queryBudgetReady)}, restoreFixture=${boolLabel(inputs.estimateHistoryD1Proof.value?.readiness?.restoreFixtureReady)}, localSlice=${boolLabel(inputs.estimateHistoryD1Proof.value?.readiness?.localEstimateHistoryD1SliceReady)}, productionProof=${boolLabel(inputs.estimateHistoryD1Proof.value?.readiness?.productionEstimateHistoryD1Ready)}, affectedRpcNames=${numberLabel(inputs.estimateHistoryD1Proof.value?.affectedRpcNames?.length)}, viewerMutationResidueRows=${numberLabel(inputs.estimateHistoryD1Proof.value?.fixture?.viewerMutationResidueRows)}, rollbackResidueRows=${numberLabel(inputs.estimateHistoryD1Proof.value?.fixture?.rollbackResidueRows)}, duplicateSubtreeOperationRows=${numberLabel(inputs.estimateHistoryD1Proof.value?.fixture?.duplicateSubtreeOperationRows)}, projectPackageCommandRows=${numberLabel(inputs.estimateHistoryD1Proof.value?.fixture?.projectPackageCommandRows)}, libraryPackageCommandRows=${numberLabel(inputs.estimateHistoryD1Proof.value?.fixture?.libraryPackageCommandRows)}, restoredHistoryRows=${numberLabel(inputs.estimateHistoryD1Proof.value?.fixture?.restoredHistoryRows)}, localOnly=${boolLabel(inputs.estimateHistoryD1Proof.value?.localOnly)}, providerBacked=${boolLabel(inputs.estimateHistoryD1Proof.value?.providerBacked)}`,
    "Local D1 estimate-history schema/editor-guard/tab/subtree/row/sheet/package/promote/rollback/idempotency/query/restore proof is missing or failed.",
    inputs.estimateHistoryD1Proof.source,
  ));

  gates.push(gate(
    "supabase-rpc-rewrite-map",
    "Supabase RPC rewrite map and transaction proof ready",
    "rpc",
    inputs.rpcRewriteMap.present
      && typeof inputs.rpcRewriteMap.value?.mappedRpcNames === "number"
      && inputs.rpcRewriteMap.value.mappedRpcNames >= (inventorySummary.distinctRpcNames ?? Number.POSITIVE_INFINITY)
      && inputs.rpcRewriteMap.value.goldenFixturesReady === true
      && inputs.rpcRewriteMap.value.transactionProofReady === true
      && inputs.rpcRewriteMap.value.rollbackProofReady === true
      && inputs.rpcRewriteMap.value.idempotencyProofReady === true,
    `present=${boolLabel(inputs.rpcRewriteMap.present)}, mappedRpcNames=${numberLabel(inputs.rpcRewriteMap.value?.mappedRpcNames)}, inventoryRpcNames=${numberLabel(inventorySummary.distinctRpcNames)}, goldenFixtures=${boolLabel(inputs.rpcRewriteMap.value?.goldenFixturesReady)}, transactions=${boolLabel(inputs.rpcRewriteMap.value?.transactionProofReady)}, rollback=${boolLabel(inputs.rpcRewriteMap.value?.rollbackProofReady)}, idempotency=${boolLabel(inputs.rpcRewriteMap.value?.idempotencyProofReady)}, localMechanics=${boolLabel(inputs.rpcRewriteMap.value?.localRpcMechanicsProofReady)}, productionRewrite=${boolLabel(inputs.rpcRewriteMap.value?.productionRpcRewriteReady)}`,
    "Per-RPC rewrite map, golden fixtures, and transaction/rollback/idempotency proof are incomplete.",
    inputs.rpcRewriteMap.source,
  ));

  gates.push(gate(
    "d1-rpc-local-transaction-mechanics",
    "D1 RPC local transaction/rollback/idempotency mechanics ready",
    "rpc",
    inputs.rpcTransactionProof.present
      && inputs.rpcTransactionProof.value?.localTransactionMechanicsReady === true
      && inputs.rpcTransactionProof.value.localRollbackMechanicsReady === true
      && inputs.rpcTransactionProof.value.localIdempotencyMechanicsReady === true
      && inputs.rpcTransactionProof.value.localRpcMechanicsProofReady === true,
    `present=${boolLabel(inputs.rpcTransactionProof.present)}, transactions=${boolLabel(inputs.rpcTransactionProof.value?.localTransactionMechanicsReady)}, rollback=${boolLabel(inputs.rpcTransactionProof.value?.localRollbackMechanicsReady)}, idempotency=${boolLabel(inputs.rpcTransactionProof.value?.localIdempotencyMechanicsReady)}, localProof=${boolLabel(inputs.rpcTransactionProof.value?.localRpcMechanicsProofReady)}, productionProof=${boolLabel(inputs.rpcTransactionProof.value?.productionRpcRewriteReady)}, coveredPatterns=${numberLabel(inputs.rpcTransactionProof.value?.fixture?.coveredPatternCount)}, rollbackResidueRows=${numberLabel(inputs.rpcTransactionProof.value?.fixture?.rollbackResidueRows)}, duplicateSideEffects=${numberLabel(inputs.rpcTransactionProof.value?.fixture?.duplicateSideEffects)}, localOnly=${boolLabel(inputs.rpcTransactionProof.value?.localOnly)}, providerBacked=${boolLabel(inputs.rpcTransactionProof.value?.providerBacked)}`,
    "Local D1 RPC transaction/rollback/idempotency mechanics proof artifact is missing or failed.",
    inputs.rpcTransactionProof.source,
  ));

  gates.push(gate(
    "durable-objects-realtime",
    "Durable Objects/WebSockets realtime replacement wired",
    "realtime",
    manifestSummary.durableObjectBindings.length > 0
      && manifestSummary.durableObjectBindings.every((binding) => manifestSummary.typedDurableObjectBindings.includes(binding))
      && sourceSignals.durableObjectRealtimeFiles.length > 0,
    `wranglerDurableObjectBindings=${manifestSummary.durableObjectBindings.length === 0 ? "(none)" : manifestSummary.durableObjectBindings.join(", ")}, typedDurableObjectBindings=${manifestSummary.typedDurableObjectBindings.length === 0 ? "(none)" : manifestSummary.typedDurableObjectBindings.join(", ")}, durableObjectRealtimeFiles=${sourceSignals.durableObjectRealtimeFiles.length}, existingSupabaseRealtimeFiles=${sourceSignals.supabaseRealtimeFiles.length}`,
    "Durable Object namespace, generated binding type, or WebSocket/hibernation source proof is missing.",
    inputs.sources?.wranglerConfig ?? null,
  ));

  gates.push(gate(
    "d1-restore-rehearsal",
    "D1 export/import restore rehearsal ready",
    "restore",
    inputs.restoreRehearsal.present
      && inputs.restoreRehearsal.value?.d1ExportReady === true
      && inputs.restoreRehearsal.value.d1ImportReady === true
      && inputs.restoreRehearsal.value.restoreRehearsalReady === true
      && inputs.restoreRehearsal.value.destructiveRestoreDocumented === true,
    `present=${boolLabel(inputs.restoreRehearsal.present)}, export=${boolLabel(inputs.restoreRehearsal.value?.d1ExportReady)}, import=${boolLabel(inputs.restoreRehearsal.value?.d1ImportReady)}, rehearsal=${boolLabel(inputs.restoreRehearsal.value?.restoreRehearsalReady)}, destructiveRestoreDocumented=${boolLabel(inputs.restoreRehearsal.value?.destructiveRestoreDocumented)}, localOnly=${boolLabel(inputs.restoreRehearsal.value?.localOnly)}, providerBacked=${boolLabel(inputs.restoreRehearsal.value?.providerBacked)}`,
    "D1 export/import restore rehearsal and destructive-restore documentation are missing.",
    inputs.restoreRehearsal.source,
  ));

  const performanceProofValue = inputs.performanceProof.value;
  const performanceBlocker = performanceProofValue?.queryCountBudgetsReady === true
    && performanceProofValue.p95RouteProofReady === true
    && performanceProofValue.hostedWorkerD1PerformanceReady !== true
    ? "Hosted Worker+D1 performance proof is missing."
    : "D1 query-count budgets, route p95 proof, or hosted Worker+D1 performance evidence is missing.";

  gates.push(gate(
    "d1-performance-proof",
    "D1 query-count and hosted p95 performance proof ready",
    "performance",
    inputs.performanceProof.present
      && performanceProofValue?.queryCountBudgetsReady === true
      && performanceProofValue.p95RouteProofReady === true
      && performanceProofValue.hostedWorkerD1PerformanceReady === true,
    `present=${boolLabel(inputs.performanceProof.present)}, queryCountBudgets=${boolLabel(performanceProofValue?.queryCountBudgetsReady)}, p95RouteProof=${boolLabel(performanceProofValue?.p95RouteProofReady)}, hostedWorkerD1Performance=${boolLabel(performanceProofValue?.hostedWorkerD1PerformanceReady)}, localOnly=${boolLabel(performanceProofValue?.localOnly)}, providerBacked=${boolLabel(performanceProofValue?.providerBacked)}`,
    performanceBlocker,
    inputs.performanceProof.source,
  ));

  return gates;
}

function gateReady(gates: Gate[], key: string) {
  return gates.find((item) => item.key === key)?.ready === true;
}

export function checkCloudflareD1AuthRealtimeReadiness(inputs: CheckInputs): CloudflareD1AuthRealtimeReadinessReport {
  const sourceSignals = detectSourceSignals(inputs.sourceFileTextByPath);
  const manifestSummary = {
    d1DatabaseBindings: extractD1Bindings(inputs.wranglerConfigText),
    typedD1Bindings: extractTypedBindings(inputs.generatedTypesText, "D1Database"),
    durableObjectBindings: extractDurableObjectBindings(inputs.wranglerConfigText),
    typedDurableObjectBindings: extractTypedBindings(inputs.generatedTypesText, "DurableObjectNamespace"),
    hasBetterAuthDependency: extractPackageDependencyNames(inputs.packageJsonText).has("better-auth"),
  };
  const gates = buildGates(inputs, manifestSummary, sourceSignals);
  const databaseInventoryReady = gateReady(gates, "database-inventory");
  const d1BindingReady = gateReady(gates, "d1-binding-config");
  const betterAuthLocalProofReady = gateReady(gates, "better-auth-local-route-gate-proof");
  const hostedBetterAuthD1SchemaProofReady = inputs.betterAuthRouteGateProof.value?.readiness?.hostedBetterAuthD1SchemaProofReady === true;
  const betterAuthSecretProviderReady = inputs.betterAuthRouteGateProof.value?.readiness?.betterAuthSecretProviderReady === true;
  const providerBackedSessionFixtureReady = inputs.betterAuthRouteGateProof.value?.readiness?.providerBackedSessionFixtureReady === true;
  const providerBackedCallbackSessionCutoverReady = inputs.betterAuthRouteGateProof.value?.readiness?.providerBackedCallbackSessionCutoverReady === true;
  const betterAuthProviderProofReady = inputs.betterAuthRouteGateProof.value?.readiness?.betterAuthProviderProofReady === true;
  const authReplacementReady = gateReady(gates, "better-auth-replacement");
  const appLayerAuthzSpecReady = gateReady(gates, "app-layer-authz-access-matrix");
  const localRpcTransactionMechanicsReady = gateReady(gates, "d1-rpc-local-transaction-mechanics");
  const localBetaFeedbackD1SliceReady = gateReady(gates, "d1-beta-feedback-local-domain-proof");
  const localCollaborationInvitationD1SliceReady = gateReady(gates, "d1-collaboration-invitation-local-domain-proof");
  const localClosedBetaD1SliceReady = gateReady(gates, "d1-closed-beta-local-domain-proof");
  const localComponentLibraryD1SliceReady = gateReady(gates, "d1-component-library-local-domain-proof");
  const localEstimateHistoryD1SliceReady = gateReady(gates, "d1-estimate-history-local-domain-proof");
  const rpcRewritePlanReady = gateReady(gates, "supabase-rpc-rewrite-map");
  const realtimeReplacementReady = gateReady(gates, "durable-objects-realtime");
  const restoreProofReady = gateReady(gates, "d1-restore-rehearsal");
  const performanceProofReady = gateReady(gates, "d1-performance-proof");
  const localRedesignReadinessReportReady = databaseInventoryReady
    && Boolean(inputs.packageJsonText)
    && Boolean(inputs.wranglerConfigText)
    && Boolean(inputs.generatedTypesText);
  const productionD1AuthRealtimeReady = gates.every((item) => item.ready);

  return {
    generatedAt: inputs.generatedAt ?? new Date().toISOString(),
    mode: "cloudflare-d1-auth-realtime-readiness",
    sources: {
      inventory: inputs.inventory.source,
      packageJson: inputs.sources?.packageJson ?? null,
      wranglerConfig: inputs.sources?.wranglerConfig ?? null,
      generatedTypes: inputs.sources?.generatedTypes ?? null,
      sourceRoots: inputs.sources?.sourceRoots ?? [],
      authzAccessMatrix: inputs.authzAccessMatrix.source,
      rpcRewriteMap: inputs.rpcRewriteMap.source,
      rpcTransactionProof: inputs.rpcTransactionProof.source,
      betaFeedbackD1Proof: inputs.betaFeedbackD1Proof.source,
      collaborationInvitationD1Proof: inputs.collaborationInvitationD1Proof.source,
      closedBetaD1Proof: inputs.closedBetaD1Proof.source,
      componentLibraryD1Proof: inputs.componentLibraryD1Proof.source,
      estimateHistoryD1Proof: inputs.estimateHistoryD1Proof.source,
      restoreRehearsal: inputs.restoreRehearsal.source,
      performanceProof: inputs.performanceProof.source,
      betterAuthRouteGateProof: inputs.betterAuthRouteGateProof.source,
    },
    inventorySummary: summarizeInventory(inputs.inventory),
    manifestSummary,
    sourceSignals,
    candidateFirstD1Slices: buildCandidateD1Slices(inputs.inventory),
    gates,
    readiness: {
      databaseInventoryReady,
      d1BindingReady,
      betterAuthLocalProofReady,
      hostedBetterAuthD1SchemaProofReady,
      betterAuthSecretProviderReady,
      providerBackedSessionFixtureReady,
      providerBackedCallbackSessionCutoverReady,
      betterAuthProviderProofReady,
      authReplacementReady,
      appLayerAuthzSpecReady,
      localRpcTransactionMechanicsReady,
      localBetaFeedbackD1SliceReady,
      localCollaborationInvitationD1SliceReady,
      localClosedBetaD1SliceReady,
      localComponentLibraryD1SliceReady,
      localEstimateHistoryD1SliceReady,
      rpcRewritePlanReady,
      realtimeReplacementReady,
      restoreProofReady,
      performanceProofReady,
      localRedesignReadinessReportReady,
      productionD1AuthRealtimeReady,
    },
    blockers: gates.filter((item) => !item.ready && item.blocker).map((item) => `${item.label}: ${item.blocker}`),
    note:
      "Local D1/Auth/Realtime redesign readiness inventory only. It reads repository source, package, generated type, wrangler, and sanitized evidence artifacts; it does not read env files, print secret values, call provider APIs, create D1 databases, mutate Cloudflare/Supabase, change DNS, deploy Workers, or make Supabase removable.",
  };
}

function writeOutput(outputFile: string, report: CloudflareD1AuthRealtimeReadinessReport) {
  const outputPath = resolve(outputFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

function markdownRows(rows: string[][]) {
  return rows.map((row) => `| ${row.map((cell) => cell.replaceAll("|", "\\|")).join(" | ")} |`);
}

export function writeMarkdown(report: CloudflareD1AuthRealtimeReadinessReport, markdownFile: string) {
  const outputPath = resolve(markdownFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  const gateRows = report.gates.map((item) => [
    item.scope,
    item.label,
    item.ready ? "PASS" : "FAIL",
    item.evidence,
    item.blocker ?? "",
  ]);
  const sliceRows = report.candidateFirstD1Slices.map((slice) => [
    slice.name,
    slice.risk,
    slice.reason,
    slice.rpcNames.length === 0 ? "(none found)" : slice.rpcNames.map((name) => `\`${name}\``).join(", "),
  ]);
  const blockerLines = report.blockers.length > 0
    ? report.blockers.map((blocker) => `- ${blocker}`)
    : ["- (none)"];
  const lines = [
    "# Cloudflare D1/Auth/Realtime Readiness",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    report.note,
    "",
    "## Summary",
    "",
    "| Gate | Ready |",
    "| --- | --- |",
    `| Database inventory ready | ${report.readiness.databaseInventoryReady ? "yes" : "no"} |`,
    `| D1 binding ready | ${report.readiness.d1BindingReady ? "yes" : "no"} |`,
    `| Better Auth local route-gate proof ready | ${report.readiness.betterAuthLocalProofReady ? "yes" : "no"} |`,
    `| Hosted Better Auth D1 schema proof ready | ${report.readiness.hostedBetterAuthD1SchemaProofReady ? "yes" : "no"} |`,
    `| Better Auth provider secret/origin proof ready | ${report.readiness.betterAuthSecretProviderReady ? "yes" : "no"} |`,
    `| Provider-backed Better Auth session fixture ready | ${report.readiness.providerBackedSessionFixtureReady ? "yes" : "no"} |`,
    `| Provider-backed Better Auth callback/session cutover proof ready | ${report.readiness.providerBackedCallbackSessionCutoverReady ? "yes" : "no"} |`,
    `| Better Auth provider proof ready | ${report.readiness.betterAuthProviderProofReady ? "yes" : "no"} |`,
    `| Auth replacement ready | ${report.readiness.authReplacementReady ? "yes" : "no"} |`,
    `| App-layer authorization spec ready | ${report.readiness.appLayerAuthzSpecReady ? "yes" : "no"} |`,
    `| Local RPC transaction mechanics ready | ${report.readiness.localRpcTransactionMechanicsReady ? "yes" : "no"} |`,
    `| Local beta-feedback D1 slice ready | ${report.readiness.localBetaFeedbackD1SliceReady ? "yes" : "no"} |`,
    `| Local collaboration-invitation D1 slice ready | ${report.readiness.localCollaborationInvitationD1SliceReady ? "yes" : "no"} |`,
    `| Local closed-beta D1 slice ready | ${report.readiness.localClosedBetaD1SliceReady ? "yes" : "no"} |`,
    `| Local component-library D1 slice ready | ${report.readiness.localComponentLibraryD1SliceReady ? "yes" : "no"} |`,
    `| Local estimate-history D1 slice ready | ${report.readiness.localEstimateHistoryD1SliceReady ? "yes" : "no"} |`,
    `| RPC rewrite plan ready | ${report.readiness.rpcRewritePlanReady ? "yes" : "no"} |`,
    `| Realtime replacement ready | ${report.readiness.realtimeReplacementReady ? "yes" : "no"} |`,
    `| Restore proof ready | ${report.readiness.restoreProofReady ? "yes" : "no"} |`,
    `| Performance proof ready | ${report.readiness.performanceProofReady ? "yes" : "no"} |`,
    `| Local redesign readiness report ready | ${report.readiness.localRedesignReadinessReportReady ? "yes" : "no"} |`,
    `| Production D1/Auth/Realtime ready | ${report.readiness.productionD1AuthRealtimeReady ? "yes" : "no"} |`,
    "",
    "## Inventory Snapshot",
    "",
    "| Item | Count |",
    "| --- | ---: |",
    `| App routes | ${numberLabel(report.inventorySummary.appRoutes)} |`,
    `| Provider-coupled files | ${numberLabel(report.inventorySummary.providerCoupledFiles)} |`,
    `| Distinct Supabase RPC names | ${numberLabel(report.inventorySummary.distinctRpcNames)} |`,
    `| Applied SQL migration files | ${numberLabel(report.inventorySummary.appliedMigrationFiles)} |`,
    `| SQL function declaration matches | ${numberLabel(report.inventorySummary.functionDeclarationMatches)} |`,
    `| RLS/policy/storage/auth SQL matches | ${numberLabel(report.inventorySummary.rlsPolicyStorageAuthMatches)} |`,
    "",
    "## Manifest Snapshot",
    "",
    "| Item | Value |",
    "| --- | --- |",
    `| D1 bindings in Wrangler | ${report.manifestSummary.d1DatabaseBindings.length === 0 ? "(none)" : report.manifestSummary.d1DatabaseBindings.join(", ")} |`,
    `| Typed D1 bindings | ${report.manifestSummary.typedD1Bindings.length === 0 ? "(none)" : report.manifestSummary.typedD1Bindings.join(", ")} |`,
    `| Durable Object bindings in Wrangler | ${report.manifestSummary.durableObjectBindings.length === 0 ? "(none)" : report.manifestSummary.durableObjectBindings.join(", ")} |`,
    `| Typed Durable Object bindings | ${report.manifestSummary.typedDurableObjectBindings.length === 0 ? "(none)" : report.manifestSummary.typedDurableObjectBindings.join(", ")} |`,
    `| Better Auth dependency | ${report.manifestSummary.hasBetterAuthDependency ? "yes" : "no"} |`,
    "",
    "## Checks",
    "",
    "| Scope | Check | Result | Evidence | Blocker |",
    "| --- | --- | --- | --- | --- |",
    ...markdownRows(gateRows),
    "",
    "## Candidate First D1 Slices",
    "",
    "| Slice | Risk | Reason | Matching RPC names |",
    "| --- | --- | --- | --- |",
    ...markdownRows(sliceRows),
    "",
    "## Blockers",
    "",
    ...blockerLines,
    "",
  ];
  writeFileSync(outputPath, lines.join("\n"));
}

function collectRepoInputs(): CheckInputs {
  const sourceRoots = ["src/app", "src/lib", "src/components", "src/hooks", "src/proxy", "src/middleware.ts", "worker.ts"]
    .map((path) => resolve(path))
    .filter(existsSync);
  const sourceFiles = sourceRoots.flatMap((root) => listFilesRecursively(root, isSourceFile)).map(toRepoRelativePath);

  return {
    inventory: readArtifact<Partial<CloudflareMigrationInventory>>(
      readEnv("CLOUDFLARE_D1_AUTH_REALTIME_INVENTORY_FILE") ?? DEFAULT_FILES.inventory,
    ),
    packageJsonText: readText("package.json"),
    wranglerConfigText: readText("wrangler.jsonc"),
    generatedTypesText: readText("cloudflare-env.d.ts"),
    sourceFileTextByPath: readFiles(sourceFiles),
    authzAccessMatrix: readArtifact<AccessMatrixReport>(
      readEnv("CLOUDFLARE_D1_AUTHZ_MATRIX_FILE") ?? DEFAULT_FILES.authzAccessMatrix,
    ),
    rpcRewriteMap: readArtifact<RpcRewriteReport>(
      readEnv("CLOUDFLARE_D1_RPC_REWRITE_FILE") ?? DEFAULT_FILES.rpcRewriteMap,
    ),
    rpcTransactionProof: readArtifact<RpcTransactionProofReport>(
      readEnv("CLOUDFLARE_D1_RPC_TRANSACTION_PROOF_FILE") ?? DEFAULT_FILES.rpcTransactionProof,
    ),
    betaFeedbackD1Proof: readArtifact<BetaFeedbackD1ProofReport>(
      readEnv("CLOUDFLARE_D1_BETA_FEEDBACK_PROOF_FILE") ?? DEFAULT_FILES.betaFeedbackD1Proof,
    ),
    collaborationInvitationD1Proof: readArtifact<CollaborationInvitationD1ProofReport>(
      readEnv("CLOUDFLARE_D1_COLLABORATION_INVITATION_PROOF_FILE") ?? DEFAULT_FILES.collaborationInvitationD1Proof,
    ),
    closedBetaD1Proof: readArtifact<ClosedBetaD1ProofReport>(
      readEnv("CLOUDFLARE_D1_CLOSED_BETA_PROOF_FILE") ?? DEFAULT_FILES.closedBetaD1Proof,
    ),
    componentLibraryD1Proof: readArtifact<ComponentLibraryD1ProofReport>(
      readEnv("CLOUDFLARE_D1_COMPONENT_LIBRARY_PROOF_FILE") ?? DEFAULT_FILES.componentLibraryD1Proof,
    ),
    estimateHistoryD1Proof: readArtifact<EstimateHistoryD1ProofReport>(
      readEnv("CLOUDFLARE_D1_ESTIMATE_HISTORY_PROOF_FILE") ?? DEFAULT_FILES.estimateHistoryD1Proof,
    ),
    restoreRehearsal: readArtifact<RestoreRehearsalReport>(
      readEnv("CLOUDFLARE_D1_RESTORE_REHEARSAL_FILE") ?? DEFAULT_FILES.restoreRehearsal,
    ),
    performanceProof: readArtifact<PerformanceProofReport>(
      readEnv("CLOUDFLARE_D1_PERFORMANCE_PROOF_FILE") ?? DEFAULT_FILES.performanceProof,
    ),
    betterAuthRouteGateProof: readArtifact<BetterAuthRouteGateProofReport>(
      readEnv("CLOUDFLARE_BETTER_AUTH_ROUTE_GATE_PROOF_FILE") ?? DEFAULT_FILES.betterAuthRouteGateProof,
    ),
    sources: {
      packageJson: "package.json",
      wranglerConfig: "wrangler.jsonc",
      generatedTypes: "cloudflare-env.d.ts",
      sourceRoots: sourceRoots.map(toRepoRelativePath),
    },
  };
}

async function main() {
  const report = checkCloudflareD1AuthRealtimeReadiness(collectRepoInputs());
  const outputFile = readEnv("OUTPUT_FILE") ?? `${PLAN_ROOT}/2026-06-30-cloudflare-d1-auth-realtime-readiness.json`;
  const markdownFile = readEnv("MARKDOWN_FILE") ?? `${PLAN_ROOT}/2026-06-30-cloudflare-d1-auth-realtime-readiness.md`;
  writeOutput(outputFile, report);
  writeMarkdown(report, markdownFile);
  console.log(JSON.stringify(report, null, 2));
  if (!report.readiness.localRedesignReadinessReportReady) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
