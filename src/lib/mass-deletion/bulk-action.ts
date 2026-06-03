import { isUuid } from "@/lib/ids";

export type BulkActionIssueCode =
  | "empty_selection"
  | "invalid_id"
  | "batch_limit_exceeded"
  | "not_found"
  | "forbidden"
  | "blocked"
  | "stale_preview"
  | "rpc_error"
  | "storage_cleanup_failed";

export type BulkActionIssue = {
  code: BulkActionIssueCode | string;
  message: string;
  id?: string;
  name?: string;
  details?: Record<string, unknown>;
};

export type BulkActionValidationResult = {
  ids: string[];
  issues: BulkActionIssue[];
};

export type BulkPreviewSummary = {
  requestedCount: number;
  eligibleCount: number;
  blockedCount: number;
  forbiddenCount?: number;
  notFoundCount?: number;
  [key: string]: unknown;
};

export type BulkActionPreviewResult = {
  ok: boolean;
  targetType: "project" | "estimate_sheet" | "library_component";
  ids: string[];
  eligibleIds: string[];
  previewHash: string | null;
  summary: BulkPreviewSummary;
  issues: BulkActionIssue[];
  blocked: BulkActionIssue[];
  storageTargets?: StorageCleanupTarget[];
};

export type BulkActionExecutionResult = {
  ok: boolean;
  targetType: "project" | "estimate_sheet" | "library_component";
  ids: string[];
  deletedIds?: string[];
  archivedIds?: string[];
  auditEventId?: string | null;
  previewHash?: string | null;
  summary: BulkPreviewSummary;
  issues: BulkActionIssue[];
  blocked?: BulkActionIssue[];
  storageTargets?: StorageCleanupTarget[];
  storageCleanup?: StorageCleanupReport;
};

export type StorageCleanupTarget = {
  bucket: string;
  path: string;
};

export type StorageCleanupReport = {
  removed: StorageCleanupTarget[];
  rejected: StorageCleanupTarget[];
  failed: Array<StorageCleanupTarget & { message: string }>;
};

const singularLabels = {
  project: "PROJECT",
  sheet: "SHEET",
  component: "COMPONENT",
} as const;

const pluralLabels = {
  project: "PROJECTS",
  sheet: "SHEETS",
  component: "COMPONENTS",
} as const;

export function normalizeBulkActionIds(
  ids: readonly string[],
  {
    label,
    max,
  }: {
    label: string;
    max: number;
  },
): BulkActionValidationResult {
  const normalizedIds: string[] = [];
  const seen = new Set<string>();
  const issues: BulkActionIssue[] = [];

  for (const rawId of ids) {
    const id = String(rawId ?? "").trim();
    if (!id || !isUuid(id)) {
      issues.push({
        code: "invalid_id",
        id,
        message: `${label} contains an invalid id.`,
      });
      continue;
    }
    if (!seen.has(id)) {
      seen.add(id);
      normalizedIds.push(id);
    }
  }

  if (ids.length === 0 || normalizedIds.length === 0) {
    issues.push({
      code: "empty_selection",
      message: `Select at least one ${label.replace(/s$/, "")}.`,
    });
  }

  if (normalizedIds.length > max) {
    issues.push({
      code: "batch_limit_exceeded",
      message: `${label} is limited to ${max} items per action.`,
    });
  }

  return { ids: normalizedIds.slice(0, max), issues };
}

export function getBulkActionConfirmationPhrase(
  target: keyof typeof singularLabels,
  count: number,
  action: "delete" | "archive" = "delete",
) {
  const verb = action === "archive" ? "ARCHIVE" : "DELETE";
  return count === 1 ? `${verb} ${singularLabels[target]}` : `${verb} ${count} ${pluralLabels[target]}`;
}

export function validateTypedConfirmationPhrase(input: string, requiredPhrase: string) {
  return input.trim() === requiredPhrase;
}

export function buildRejectedPreviewResult(
  targetType: BulkActionPreviewResult["targetType"],
  ids: string[],
  issues: BulkActionIssue[],
): BulkActionPreviewResult {
  return {
    ok: false,
    targetType,
    ids,
    eligibleIds: [],
    previewHash: null,
    summary: {
      requestedCount: ids.length,
      eligibleCount: 0,
      blockedCount: issues.length,
    },
    issues,
    blocked: issues,
  };
}

export function coerceBulkPreviewResult(
  value: unknown,
  fallback: Pick<BulkActionPreviewResult, "targetType" | "ids">,
): BulkActionPreviewResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return buildRejectedPreviewResult(fallback.targetType, fallback.ids, [{
      code: "rpc_error",
      message: "Mass deletion preview returned an invalid response.",
    }]);
  }
  const record = value as Partial<BulkActionPreviewResult>;
  return {
    ok: record.ok === true,
    targetType: record.targetType ?? fallback.targetType,
    ids: Array.isArray(record.ids) ? record.ids.filter((id): id is string => typeof id === "string") : fallback.ids,
    eligibleIds: Array.isArray(record.eligibleIds) ? record.eligibleIds.filter((id): id is string => typeof id === "string") : [],
    previewHash: typeof record.previewHash === "string" ? record.previewHash : null,
    summary: record.summary && typeof record.summary === "object" ? record.summary : {
      requestedCount: fallback.ids.length,
      eligibleCount: 0,
      blockedCount: 0,
    },
    issues: Array.isArray(record.issues) ? (record.issues as BulkActionIssue[]) : [],
    blocked: Array.isArray(record.blocked) ? (record.blocked as BulkActionIssue[]) : [],
    storageTargets: Array.isArray(record.storageTargets) ? (record.storageTargets as StorageCleanupTarget[]) : [],
  };
}

export function coerceBulkExecutionResult(
  value: unknown,
  fallback: Pick<BulkActionExecutionResult, "targetType" | "ids">,
): BulkActionExecutionResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      ok: false,
      targetType: fallback.targetType,
      ids: fallback.ids,
      summary: {
        requestedCount: fallback.ids.length,
        eligibleCount: 0,
        blockedCount: 1,
      },
      issues: [{
        code: "rpc_error",
        message: "Mass deletion execution returned an invalid response.",
      }],
    };
  }
  const record = value as Partial<BulkActionExecutionResult>;
  return {
    ok: record.ok === true,
    targetType: record.targetType ?? fallback.targetType,
    ids: Array.isArray(record.ids) ? record.ids.filter((id): id is string => typeof id === "string") : fallback.ids,
    deletedIds: Array.isArray(record.deletedIds) ? record.deletedIds.filter((id): id is string => typeof id === "string") : [],
    archivedIds: Array.isArray(record.archivedIds) ? record.archivedIds.filter((id): id is string => typeof id === "string") : [],
    auditEventId: typeof record.auditEventId === "string" ? record.auditEventId : null,
    previewHash: typeof record.previewHash === "string" ? record.previewHash : null,
    summary: record.summary && typeof record.summary === "object" ? record.summary : {
      requestedCount: fallback.ids.length,
      eligibleCount: 0,
      blockedCount: 0,
    },
    issues: Array.isArray(record.issues) ? (record.issues as BulkActionIssue[]) : [],
    blocked: Array.isArray(record.blocked) ? (record.blocked as BulkActionIssue[]) : [],
    storageTargets: Array.isArray(record.storageTargets) ? (record.storageTargets as StorageCleanupTarget[]) : [],
    storageCleanup: record.storageCleanup,
  };
}

export function createBulkActionCorrelationId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "00000000-0000-4000-8000-000000000000";
}
