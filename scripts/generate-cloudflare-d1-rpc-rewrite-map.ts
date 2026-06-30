#!/usr/bin/env bun

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, resolve, sep } from "node:path";

import type { CloudflareMigrationInventory } from "./generate-cloudflare-migration-inventory";

type Artifact<T> = {
  source: string | null;
  present: boolean;
  value: T | null;
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

type CollaborationInvitationProofReport = {
  affectedRpcNames?: string[];
  readiness?: {
    localCollaborationInvitationD1SliceReady?: boolean;
    productionCollaborationInvitationD1Ready?: boolean;
  };
  localOnly?: boolean;
  providerBacked?: boolean;
};

type ClosedBetaProofReport = {
  affectedRpcNames?: string[];
  readiness?: {
    localClosedBetaD1SliceReady?: boolean;
    productionClosedBetaD1Ready?: boolean;
  };
  localOnly?: boolean;
  providerBacked?: boolean;
};

type ComponentLibraryProofReport = {
  affectedRpcNames?: string[];
  readiness?: {
    localComponentLibraryD1SliceReady?: boolean;
    productionComponentLibraryD1Ready?: boolean;
  };
  localOnly?: boolean;
  providerBacked?: boolean;
};

type EstimateHistoryProofReport = {
  affectedRpcNames?: string[];
  readiness?: {
    localEstimateHistoryD1SliceReady?: boolean;
    productionEstimateHistoryD1Ready?: boolean;
  };
  localOnly?: boolean;
  providerBacked?: boolean;
};

type RpcRewriteDomain =
  | "authorization"
  | "auth-profile"
  | "closed-beta"
  | "collaboration"
  | "estimate-history"
  | "bulk-delete"
  | "component-library"
  | "publication"
  | "uploads"
  | "navigation-read-model"
  | "activity-audit"
  | "workspace-read-model"
  | "unknown";

type RpcRewriteRow = {
  rpcName: string;
  callerFiles: string[];
  domain: RpcRewriteDomain;
  currentPostgresBehavior: string;
  d1RewriteStrategy: string;
  transactionNeeds: string[];
  idempotencyNeeds: string[];
  goldenFixtureRefs: string[];
  transactionProofRefs: string[];
  rollbackProofRefs: string[];
  idempotencyProofRefs: string[];
  status: "mapped" | "missing-strategy" | "missing-golden-fixture" | "missing-transaction-proof" | "missing-rollback-proof" | "missing-idempotency-proof";
};

type RpcRewriteInputs = {
  inventory: Artifact<Partial<CloudflareMigrationInventory>>;
  rpcTransactionProof?: Artifact<RpcTransactionProofReport>;
  collaborationInvitationProof?: Artifact<CollaborationInvitationProofReport>;
  closedBetaProof?: Artifact<ClosedBetaProofReport>;
  componentLibraryProof?: Artifact<ComponentLibraryProofReport>;
  estimateHistoryProof?: Artifact<EstimateHistoryProofReport>;
  testFileTextByPath: Record<string, string>;
  generatedAt?: string;
  sources?: Partial<CloudflareD1RpcRewriteMapReport["sources"]>;
};

export type CloudflareD1RpcRewriteMapReport = {
  generatedAt: string;
  mode: "cloudflare-d1-rpc-rewrite-map";
  sources: {
    inventory: string | null;
    rpcTransactionProof: string | null;
    collaborationInvitationProof: string | null;
    closedBetaProof: string | null;
    componentLibraryProof: string | null;
    estimateHistoryProof: string | null;
    testRoots: string[];
  };
  totalRpcNames: number;
  mappedRpcNames: number;
  goldenFixtureCount: number;
  transactionSensitiveRpcCount: number;
  idempotencySensitiveRpcCount: number;
  goldenFixturesReady: boolean;
  transactionProofReady: boolean;
  rollbackProofReady: boolean;
  idempotencyProofReady: boolean;
  localTransactionMechanicsReady: boolean;
  localRollbackMechanicsReady: boolean;
  localIdempotencyMechanicsReady: boolean;
  localRpcMechanicsProofReady: boolean;
  productionRpcRewriteReady: boolean;
  rows: RpcRewriteRow[];
  blockers: string[];
  note: string;
};

const PLAN_ROOT = ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence";

const DEFAULT_FILES = {
  inventory: `${PLAN_ROOT}/2026-06-30-cloudflare-migration-inventory.json`,
  rpcTransactionProof: `${PLAN_ROOT}/2026-06-30-cloudflare-d1-rpc-transaction-proof.json`,
  collaborationInvitationProof: `${PLAN_ROOT}/2026-06-30-cloudflare-d1-collaboration-invitation-proof.json`,
  closedBetaProof: `${PLAN_ROOT}/2026-06-30-cloudflare-d1-closed-beta-proof.json`,
  componentLibraryProof: `${PLAN_ROOT}/2026-06-30-cloudflare-d1-component-library-proof.json`,
  estimateHistoryProof: `${PLAN_ROOT}/2026-06-30-cloudflare-d1-estimate-history-proof.json`,
} as const;

const TEST_EXTENSIONS = new Set([".ts", ".tsx"]);

const TRANSACTION_PATTERN =
  /(?:_with_history|bulk|delete|archive|reorder|move|replace|insert|update|create|finalize|record_|approve|accept|issue|ensure|submit|response|upsert|set_)/i;

const IDEMPOTENCY_PATTERN =
  /(?:with_history|record|finalize|bulk|delete|delivery|upload|collaboration|mass_deletion|idempot|duplicate|retry|checksum|correlation)/i;

const MUTATING_RPC_PATTERN =
  /(?:^accept_|^approve_|^create_|^delete_|^duplicate_|^ensure_|^execute_|^finalize_|^increment_|^insert_|^issue_|^move_|^promote_|^record_|^rename_|^reorder_|^replace_|^resolve_|^restore_|^set_|^submit_|^unlink_|^update_|^upsert_|_with_history|mass_deletion)/i;

const READ_MODEL_RPC_PATTERN =
  /(?:^can_|^is_|^check_|^authorize_|^get_|^list_|^preview_|^read_|_route_context$|_summary$|_summaries(?:_for_[a-z0-9_]+)?$|_seed$)/i;

const TRANSACTION_PROOF_PATTERN = /\b(?:transaction|atomic|history|rollback|commit|all-or-nothing|seriali[sz]ed|correlation)\b/i;
const ROLLBACK_PROOF_PATTERN = /\b(?:rollback|rolls back|revert|cleanup|partial failure|fail(?:s)? closed|all-or-nothing|residue)\b/i;
const IDEMPOTENCY_PROOF_PATTERN = /\b(?:idempotent|idempotency|duplicate|retry|correlation|checksum|once|dedupe|deduplicate)\b/i;

function readEnv(name: string) {
  const value = process.env[name];
  return value?.trim() || undefined;
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

function isTestFile(path: string) {
  return TEST_EXTENSIONS.has(extname(path));
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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function classifyRpcDomain(name: string, callerFiles: string[]): RpcRewriteDomain {
  const haystack = `${name} ${callerFiles.join(" ")}`.toLowerCase();
  if (/^(can_|is_workspace_|authorize_|check_closed_beta)/.test(name)) return "authorization";
  if (/ensure_current_user_profile/.test(name)) return "auth-profile";
  if (/closed_beta|allowlist|beta/.test(haystack)) return "closed-beta";
  if (/collaboration|invitation|invite/.test(haystack)) return "collaboration";
  if (/bulk_delete|mass_deletion/.test(haystack)) return "bulk-delete";
  if (/estimate|tab|node|row_item|subtree|sheet_adjustment|with_history/.test(haystack)) return "estimate-history";
  if (/library|component|template|folder|brand|cost_library/.test(haystack)) return "component-library";
  if (/publication|recipient|client_comment|client_response|share/.test(haystack)) return "publication";
  if (/upload|scan|asset|image/.test(haystack)) return "uploads";
  if (/sidebar|route_context|summary|seed|overview/.test(haystack)) return "navigation-read-model";
  if (/activity|audit|retention/.test(haystack)) return "activity-audit";
  if (/workspace|homebase|project_estimate_list|projects_summary/.test(haystack)) return "workspace-read-model";
  return "unknown";
}

function postgresBehaviorFor(domain: RpcRewriteDomain) {
  switch (domain) {
    case "authorization":
      return "Postgres function evaluates Supabase auth claims, membership tables, and RLS ownership predicates.";
    case "auth-profile":
      return "Postgres function ensures profile/bootstrap rows for the authenticated Supabase user.";
    case "closed-beta":
      return "Postgres function gates beta access or admin allowlist mutations with Supabase auth/RLS.";
    case "collaboration":
      return "Postgres function resolves, issues, accepts, or records collaboration invitations atomically.";
    case "estimate-history":
      return "Postgres function mutates estimate structures while writing history/audit rows in one transaction.";
    case "bulk-delete":
      return "Postgres function previews or executes destructive scoped deletes with audit and cleanup state.";
    case "component-library":
      return "Postgres function reads or mutates workspace-scoped library/template/component data behind RLS.";
    case "publication":
      return "Postgres function gates recipient/publication access, comments, responses, or open telemetry.";
    case "uploads":
      return "Postgres function manages upload metadata, sessions, scan state, or override audit records.";
    case "navigation-read-model":
      return "Postgres function returns prejoined read models for navigation or route hydration.";
    case "activity-audit":
      return "Postgres function reads or records activity/audit/retention data under scoped auth.";
    case "workspace-read-model":
      return "Postgres function returns workspace/project summaries under RLS membership checks.";
    case "unknown":
      return "Postgres function behavior must be inspected before D1 migration.";
  }
}

function d1StrategyFor(domain: RpcRewriteDomain) {
  switch (domain) {
    case "authorization":
      return "Replace with shared D1 app-layer authorization helpers using server-derived user identity and explicit workspace/project/estimate membership queries.";
    case "auth-profile":
      return "Replace with Better Auth user/profile bootstrap service backed by D1 and request-scoped session identity.";
    case "closed-beta":
      return "Replace with D1 beta access repository plus platform-admin mutation guard.";
    case "collaboration":
      return "Replace with D1 invitation repository, token hashing, explicit project membership checks, and Durable Object/event fanout when realtime is needed.";
    case "estimate-history":
      return "Replace with D1 service methods that wrap estimate mutation and history writes in explicit D1 transactions with golden before/after fixtures.";
    case "bulk-delete":
      return "Replace with D1 two-phase preview/execute services, preview hashes, cleanup journals, and rollback/idempotency proof.";
    case "component-library":
      return "Replace with D1 component-library repositories plus workspace member/editor guards and history/audit writes where needed.";
    case "publication":
      return "Replace with D1 publication/recipient repositories, token-bound authorization, no-store route behavior, and Email Service event integration.";
    case "uploads":
      return "Replace with D1 upload metadata/session/scan repositories coordinated with R2 object authority and Queue/Cron workers.";
    case "navigation-read-model":
      return "Replace with D1 read-model queries with query-count budgets and golden payload fixtures.";
    case "activity-audit":
      return "Replace with D1 activity/audit repositories and retention queries with scoped access checks.";
    case "workspace-read-model":
      return "Replace with D1 workspace/project summary repositories with explicit membership guards and query-count budgets.";
    case "unknown":
      return "";
  }
}

function isReadModelRpc(name: string, domain: RpcRewriteDomain) {
  if (MUTATING_RPC_PATTERN.test(name)) return false;
  if (READ_MODEL_RPC_PATTERN.test(name)) return true;
  return ["navigation-read-model", "workspace-read-model"].includes(domain);
}

function transactionNeedsFor(name: string, domain: RpcRewriteDomain) {
  const needs = new Set<string>();
  if (isReadModelRpc(name, domain)) return [];
  if (TRANSACTION_PATTERN.test(name) || ["estimate-history", "bulk-delete", "component-library", "collaboration", "uploads"].includes(domain)) {
    needs.add("D1 transaction covering all state changes currently hidden inside the Postgres RPC");
  }
  if (/with_history|activity|audit|record|retention/.test(name)) {
    needs.add("Audit/history row parity with existing RPC side effects");
  }
  if (/bulk|delete|archive|restore/.test(name)) {
    needs.add("Rollback or cleanup journal for destructive operations");
  }
  return [...needs].sort();
}

function idempotencyNeedsFor(name: string, domain: RpcRewriteDomain) {
  const needs = new Set<string>();
  if (isReadModelRpc(name, domain)) return [];
  if (IDEMPOTENCY_PATTERN.test(name) || ["bulk-delete", "uploads", "collaboration"].includes(domain)) {
    needs.add("Stable retry/idempotency key or natural unique constraint for repeated Worker/Queue execution");
  }
  if (/upload|scan|asset/.test(name)) {
    needs.add("Checksum/object-key-bound idempotency across D1 metadata and R2 objects");
  }
  if (/collaboration|invitation|publication|recipient/.test(name)) {
    needs.add("Token/recipient uniqueness to prevent duplicate invitation or decision effects");
  }
  return [...needs].sort();
}

function testRefsForRpc(name: string, testFileTextByPath: Record<string, string>, pattern?: RegExp) {
  const rpcPattern = new RegExp(`["']${escapeRegExp(name)}["']|\\b${escapeRegExp(name)}\\b`, "i");
  return Object.entries(testFileTextByPath)
    .filter(([, text]) => rpcPattern.test(text) && (!pattern || pattern.test(text)))
    .map(([file]) => file)
    .sort()
    .slice(0, 12);
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values)).sort();
}

function collaborationInvitationProofRefsForRpc(name: string, inputs: RpcRewriteInputs) {
  const proof = inputs.collaborationInvitationProof;
  if (!proof?.present || !proof.source || proof.value?.readiness?.localCollaborationInvitationD1SliceReady !== true) {
    return [];
  }
  const affectedRpcNames = proof.value.affectedRpcNames ?? [];
  return affectedRpcNames.includes(name) ? [proof.source] : [];
}

function closedBetaProofRefsForRpc(name: string, inputs: RpcRewriteInputs) {
  const proof = inputs.closedBetaProof;
  if (!proof?.present || !proof.source || proof.value?.readiness?.localClosedBetaD1SliceReady !== true) {
    return [];
  }
  const affectedRpcNames = proof.value.affectedRpcNames ?? [];
  return affectedRpcNames.includes(name) ? [proof.source] : [];
}

function componentLibraryProofRefsForRpc(name: string, inputs: RpcRewriteInputs) {
  const proof = inputs.componentLibraryProof;
  if (!proof?.present || !proof.source || proof.value?.readiness?.localComponentLibraryD1SliceReady !== true) {
    return [];
  }
  const affectedRpcNames = proof.value.affectedRpcNames ?? [];
  return affectedRpcNames.includes(name) ? [proof.source] : [];
}

function estimateHistoryProofRefsForRpc(name: string, inputs: RpcRewriteInputs) {
  const proof = inputs.estimateHistoryProof;
  if (!proof?.present || !proof.source || proof.value?.readiness?.localEstimateHistoryD1SliceReady !== true) {
    return [];
  }
  const affectedRpcNames = proof.value.affectedRpcNames ?? [];
  return affectedRpcNames.includes(name) ? [proof.source] : [];
}

function rowStatus(row: RpcRewriteRow): RpcRewriteRow["status"] {
  if (!row.d1RewriteStrategy) return "missing-strategy";
  if (row.goldenFixtureRefs.length === 0) return "missing-golden-fixture";
  if (row.transactionNeeds.length > 0 && row.transactionProofRefs.length === 0) return "missing-transaction-proof";
  if (row.transactionNeeds.length > 0 && row.rollbackProofRefs.length === 0) return "missing-rollback-proof";
  if (row.idempotencyNeeds.length > 0 && row.idempotencyProofRefs.length === 0) return "missing-idempotency-proof";
  return "mapped";
}

function buildRows(inputs: RpcRewriteInputs) {
  return (inputs.inventory.value?.rpcCalls ?? [])
    .filter((row): row is { name: string; callerFiles: string[] } => (
      typeof row.name === "string" && Array.isArray(row.callerFiles)
    ))
    .map((rpc) => {
      const callerFiles = rpc.callerFiles.filter((file): file is string => typeof file === "string").sort();
      const domain = classifyRpcDomain(rpc.name, callerFiles);
      const transactionNeeds = transactionNeedsFor(rpc.name, domain);
      const idempotencyNeeds = idempotencyNeedsFor(rpc.name, domain);
      const collaborationInvitationProofRefs = collaborationInvitationProofRefsForRpc(rpc.name, inputs);
      const closedBetaProofRefs = closedBetaProofRefsForRpc(rpc.name, inputs);
      const componentLibraryProofRefs = componentLibraryProofRefsForRpc(rpc.name, inputs);
      const estimateHistoryProofRefs = estimateHistoryProofRefsForRpc(rpc.name, inputs);
      const row: RpcRewriteRow = {
        rpcName: rpc.name,
        callerFiles,
        domain,
        currentPostgresBehavior: postgresBehaviorFor(domain),
        d1RewriteStrategy: d1StrategyFor(domain),
        transactionNeeds,
        idempotencyNeeds,
        goldenFixtureRefs: uniqueSorted([
          ...testRefsForRpc(rpc.name, inputs.testFileTextByPath),
          ...collaborationInvitationProofRefs,
          ...closedBetaProofRefs,
          ...componentLibraryProofRefs,
          ...estimateHistoryProofRefs,
        ]),
        transactionProofRefs: uniqueSorted([
          ...testRefsForRpc(rpc.name, inputs.testFileTextByPath, TRANSACTION_PROOF_PATTERN),
          ...collaborationInvitationProofRefs,
          ...closedBetaProofRefs,
          ...componentLibraryProofRefs,
          ...estimateHistoryProofRefs,
        ]),
        rollbackProofRefs: uniqueSorted([
          ...testRefsForRpc(rpc.name, inputs.testFileTextByPath, ROLLBACK_PROOF_PATTERN),
          ...collaborationInvitationProofRefs,
          ...closedBetaProofRefs,
          ...componentLibraryProofRefs,
          ...estimateHistoryProofRefs,
        ]),
        idempotencyProofRefs: uniqueSorted([
          ...testRefsForRpc(rpc.name, inputs.testFileTextByPath, IDEMPOTENCY_PROOF_PATTERN),
          ...collaborationInvitationProofRefs,
          ...closedBetaProofRefs,
          ...componentLibraryProofRefs,
          ...estimateHistoryProofRefs,
        ]),
        status: "mapped",
      };
      row.status = rowStatus(row);
      return row;
    })
    .sort((a, b) => a.rpcName.localeCompare(b.rpcName));
}

function buildBlockers(rows: RpcRewriteRow[], inventoryPresent: boolean) {
  const blockers: string[] = [];
  const missingStrategy = rows.filter((row) => !row.d1RewriteStrategy);
  const missingGolden = rows.filter((row) => row.goldenFixtureRefs.length === 0);
  const transactionRows = rows.filter((row) => row.transactionNeeds.length > 0);
  const idempotencyRows = rows.filter((row) => row.idempotencyNeeds.length > 0);
  const missingTransaction = transactionRows.filter((row) => row.transactionProofRefs.length === 0);
  const missingRollback = transactionRows.filter((row) => row.rollbackProofRefs.length === 0);
  const missingIdempotency = idempotencyRows.filter((row) => row.idempotencyProofRefs.length === 0);

  if (!inventoryPresent) blockers.push("Cloudflare migration inventory artifact is missing; regenerate cf:inventory before trusting the RPC map.");
  if (rows.length === 0) blockers.push("No Supabase RPC names were discovered.");
  if (missingStrategy.length > 0) blockers.push(`${missingStrategy.length} RPCs do not have a D1 rewrite strategy.`);
  if (missingGolden.length > 0) blockers.push(`${missingGolden.length} RPCs lack matching golden fixture/test references.`);
  if (missingTransaction.length > 0) blockers.push(`${missingTransaction.length} transaction-sensitive RPCs lack transaction proof references.`);
  if (missingRollback.length > 0) blockers.push(`${missingRollback.length} transaction-sensitive RPCs lack rollback/fail-closed proof references.`);
  if (missingIdempotency.length > 0) blockers.push(`${missingIdempotency.length} idempotency-sensitive RPCs lack idempotency proof references.`);

  return blockers;
}

export function buildCloudflareD1RpcRewriteMap(inputs: RpcRewriteInputs): CloudflareD1RpcRewriteMapReport {
  const rows = buildRows(inputs);
  const mappedRpcNames = rows.filter((row) => row.d1RewriteStrategy).length;
  const goldenFixtureCount = rows.filter((row) => row.goldenFixtureRefs.length > 0).length;
  const transactionRows = rows.filter((row) => row.transactionNeeds.length > 0);
  const idempotencyRows = rows.filter((row) => row.idempotencyNeeds.length > 0);
  const goldenFixturesReady = rows.length > 0 && rows.every((row) => row.goldenFixtureRefs.length > 0);
  const transactionProofReady = rows.length > 0 && transactionRows.every((row) => row.transactionProofRefs.length > 0);
  const rollbackProofReady = rows.length > 0 && transactionRows.every((row) => row.rollbackProofRefs.length > 0);
  const idempotencyProofReady = rows.length > 0 && idempotencyRows.every((row) => row.idempotencyProofRefs.length > 0);
  const rpcTransactionProof = inputs.rpcTransactionProof?.value;
  const localTransactionMechanicsReady = rpcTransactionProof?.localTransactionMechanicsReady === true;
  const localRollbackMechanicsReady = rpcTransactionProof?.localRollbackMechanicsReady === true;
  const localIdempotencyMechanicsReady = rpcTransactionProof?.localIdempotencyMechanicsReady === true;
  const localRpcMechanicsProofReady = rpcTransactionProof?.localRpcMechanicsProofReady === true;
  const productionRpcRewriteReady = goldenFixturesReady
    && transactionProofReady
    && rollbackProofReady
    && idempotencyProofReady
    && rpcTransactionProof?.productionRpcRewriteReady === true;

  return {
    generatedAt: inputs.generatedAt ?? new Date().toISOString(),
    mode: "cloudflare-d1-rpc-rewrite-map",
    sources: {
      inventory: inputs.inventory.source,
      rpcTransactionProof: inputs.rpcTransactionProof?.source ?? null,
      collaborationInvitationProof: inputs.collaborationInvitationProof?.source ?? null,
      closedBetaProof: inputs.closedBetaProof?.source ?? null,
      componentLibraryProof: inputs.componentLibraryProof?.source ?? null,
      estimateHistoryProof: inputs.estimateHistoryProof?.source ?? null,
      testRoots: inputs.sources?.testRoots ?? [],
    },
    totalRpcNames: rows.length,
    mappedRpcNames,
    goldenFixtureCount,
    transactionSensitiveRpcCount: transactionRows.length,
    idempotencySensitiveRpcCount: idempotencyRows.length,
    goldenFixturesReady,
    transactionProofReady,
    rollbackProofReady,
    idempotencyProofReady,
    localTransactionMechanicsReady,
    localRollbackMechanicsReady,
    localIdempotencyMechanicsReady,
    localRpcMechanicsProofReady,
    productionRpcRewriteReady,
    rows,
    blockers: buildBlockers(rows, inputs.inventory.present),
    note:
      "Local D1 RPC rewrite map only. It reads sanitized inventory artifacts, local transaction mechanics proof, and Vitest files; it does not read env files, print secret values, call provider APIs, create D1 databases, mutate Cloudflare/Supabase, change DNS, deploy Workers, rewrite every RPC, or make Supabase removable.",
  };
}

function writeOutput(outputFile: string, report: CloudflareD1RpcRewriteMapReport) {
  const outputPath = resolve(outputFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

function markdownRows(rows: string[][]) {
  return rows.map((row) => `| ${row.map((cell) => cell.replaceAll("|", "\\|")).join(" | ")} |`);
}

export function writeMarkdown(report: CloudflareD1RpcRewriteMapReport, markdownFile: string) {
  const outputPath = resolve(markdownFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  const rowPreview = report.rows.slice(0, 80).map((row) => [
    `\`${row.rpcName}\``,
    row.status,
    row.domain,
    String(row.callerFiles.length),
    row.d1RewriteStrategy,
    row.transactionNeeds.length === 0 ? "" : row.transactionNeeds.join("<br>"),
    row.idempotencyNeeds.length === 0 ? "" : row.idempotencyNeeds.join("<br>"),
    String(row.goldenFixtureRefs.length),
    String(row.transactionProofRefs.length),
    String(row.rollbackProofRefs.length),
    String(row.idempotencyProofRefs.length),
  ]);
  const blockerLines = report.blockers.length > 0
    ? report.blockers.map((blocker) => `- ${blocker}`)
    : ["- (none)"];
  const lines = [
    "# Cloudflare D1 RPC Rewrite Map",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    report.note,
    "",
    "## Summary",
    "",
    "| Item | Value |",
    "| --- | ---: |",
    `| Total RPC names | ${report.totalRpcNames} |`,
    `| Mapped RPC names | ${report.mappedRpcNames} |`,
    `| RPCs with golden fixture refs | ${report.goldenFixtureCount} |`,
    `| Transaction-sensitive RPCs | ${report.transactionSensitiveRpcCount} |`,
    `| Idempotency-sensitive RPCs | ${report.idempotencySensitiveRpcCount} |`,
    `| Golden fixtures ready | ${report.goldenFixturesReady ? "yes" : "no"} |`,
    `| Transaction proof ready | ${report.transactionProofReady ? "yes" : "no"} |`,
    `| Rollback proof ready | ${report.rollbackProofReady ? "yes" : "no"} |`,
    `| Idempotency proof ready | ${report.idempotencyProofReady ? "yes" : "no"} |`,
    `| Local transaction mechanics ready | ${report.localTransactionMechanicsReady ? "yes" : "no"} |`,
    `| Local rollback mechanics ready | ${report.localRollbackMechanicsReady ? "yes" : "no"} |`,
    `| Local idempotency mechanics ready | ${report.localIdempotencyMechanicsReady ? "yes" : "no"} |`,
    `| Local RPC mechanics proof ready | ${report.localRpcMechanicsProofReady ? "yes" : "no"} |`,
    `| Production RPC rewrite ready | ${report.productionRpcRewriteReady ? "yes" : "no"} |`,
    "",
    "## RPC Map Preview",
    "",
    "The JSON artifact contains the full map. This table shows the first 80 sorted rows.",
    "",
    "| RPC | Status | Domain | Caller files | D1 rewrite strategy | Transaction needs | Idempotency needs | Golden refs | Transaction refs | Rollback refs | Idempotency refs |",
    "| --- | --- | --- | ---: | --- | --- | --- | ---: | ---: | ---: | ---: |",
    ...markdownRows(rowPreview),
    "",
    "## Blockers",
    "",
    ...blockerLines,
    "",
  ];
  writeFileSync(outputPath, lines.join("\n"));
}

function collectRepoInputs(): RpcRewriteInputs {
  const testRoots = ["tests/vitest"].map((path) => resolve(path)).filter(existsSync);
  const testFiles = testRoots.flatMap((root) => listFilesRecursively(root, isTestFile)).map(toRepoRelativePath);

  return {
    inventory: readArtifact<Partial<CloudflareMigrationInventory>>(
      readEnv("CLOUDFLARE_MIGRATION_INVENTORY_FILE") ?? DEFAULT_FILES.inventory,
    ),
    rpcTransactionProof: readArtifact<RpcTransactionProofReport>(
      readEnv("CLOUDFLARE_D1_RPC_TRANSACTION_PROOF_FILE") ?? DEFAULT_FILES.rpcTransactionProof,
    ),
    collaborationInvitationProof: readArtifact<CollaborationInvitationProofReport>(
      readEnv("CLOUDFLARE_D1_COLLABORATION_INVITATION_PROOF_FILE") ?? DEFAULT_FILES.collaborationInvitationProof,
    ),
    closedBetaProof: readArtifact<ClosedBetaProofReport>(
      readEnv("CLOUDFLARE_D1_CLOSED_BETA_PROOF_FILE") ?? DEFAULT_FILES.closedBetaProof,
    ),
    componentLibraryProof: readArtifact<ComponentLibraryProofReport>(
      readEnv("CLOUDFLARE_D1_COMPONENT_LIBRARY_PROOF_FILE") ?? DEFAULT_FILES.componentLibraryProof,
    ),
    estimateHistoryProof: readArtifact<EstimateHistoryProofReport>(
      readEnv("CLOUDFLARE_D1_ESTIMATE_HISTORY_PROOF_FILE") ?? DEFAULT_FILES.estimateHistoryProof,
    ),
    testFileTextByPath: readFiles(testFiles),
    sources: {
      testRoots: testRoots.map(toRepoRelativePath),
    },
  };
}

async function main() {
  const report = buildCloudflareD1RpcRewriteMap(collectRepoInputs());
  const outputFile = readEnv("OUTPUT_FILE") ?? `${PLAN_ROOT}/2026-06-30-cloudflare-d1-rpc-rewrite-map.json`;
  const markdownFile = readEnv("MARKDOWN_FILE") ?? `${PLAN_ROOT}/2026-06-30-cloudflare-d1-rpc-rewrite-map.md`;
  writeOutput(outputFile, report);
  writeMarkdown(report, markdownFile);
  console.log(JSON.stringify(report, null, 2));
  if (report.totalRpcNames === 0 || report.mappedRpcNames === 0) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
