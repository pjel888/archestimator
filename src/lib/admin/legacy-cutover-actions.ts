"use server";

import { revalidatePath } from "next/cache";

import { writeAdminAuditEvent } from "@/lib/admin/audit";
import { requireAdminContext } from "@/lib/admin/require-admin";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import {
  cutoverLegacyWorkspaceToClientPortals,
  LegacyWorkspaceCutoverError,
  recoverLegacyWorkspaceCutoverBarrier,
  type LegacyWorkspaceCutoverReport,
  type LegacyWorkspaceCutoverRecoveryReport,
} from "@/lib/client-portal/legacy-cutover-service";

export type LegacyWorkspaceCutoverActionResult =
  | { ok: true; report: LegacyWorkspaceCutoverReport }
  | { ok: false; error: "audit" | "confirmation" | "d1_unavailable" | "failed" | "preflight" | "validation"; message: string };

export type LegacyWorkspaceCutoverRecoveryActionResult =
  | { ok: true; report: LegacyWorkspaceCutoverRecoveryReport }
  | { ok: false; error: "confirmation" | "d1_unavailable" | "failed" | "preflight" | "validation"; message: string };

const WORKSPACE_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,127}$/iu;

function completedAction<T>(report: T) {
  revalidatePath("/admin/data-quality");
  return { ok: true as const, report };
}

function failedAction(error: unknown, fallbackMessage: string) {
  return {
    ok: false as const,
    error: "failed" as const,
    message: error instanceof LegacyWorkspaceCutoverError ? error.message : fallbackMessage,
  };
}

export async function runLegacyWorkspaceCutoverAction(input: {
  apply?: boolean;
  confirmation?: string;
  expectedFingerprint?: string;
  workspaceId: string;
}): Promise<LegacyWorkspaceCutoverActionResult> {
  const admin = await requireAdminContext();
  const workspaceId = input.workspaceId.trim();
  const apply = input.apply === true;

  if (!WORKSPACE_ID_PATTERN.test(workspaceId)) {
    return { ok: false, error: "validation", message: "Enter a valid workspace ID." };
  }
  if (apply && input.confirmation?.trim() !== `CUTOVER ${workspaceId}`) {
    return {
      ok: false,
      error: "confirmation",
      message: `Type CUTOVER ${workspaceId} to confirm the workspace write freeze.`,
    };
  }
  if (apply && !/^[a-f0-9]{64}$/u.test(input.expectedFingerprint ?? "")) {
    return {
      ok: false,
      error: "preflight",
      message: "Run a fresh dry check before applying the workspace cutover.",
    };
  }

  const database = await getCloudflareD1Database();
  if (!database) {
    return {
      ok: false,
      error: "d1_unavailable",
      message: "The Client Portal database is unavailable.",
    };
  }

  try {
    const report = await cutoverLegacyWorkspaceToClientPortals({
      apply,
      database,
      expectedFingerprint: input.expectedFingerprint,
      operator: apply ? { email: admin.email, userId: admin.userId } : undefined,
      workspaceId,
    });
    if (!apply) {
      const audit = await writeAdminAuditEvent({
        action: "client_portal.legacy_workspace_cutover_inspected",
        actorEmail: admin.email,
        actorUserId: admin.userId,
        summary: {
          fingerprint: report.inventory.fingerprint,
          freezeEnabled: report.freezeEnabled,
          legacyPublications: report.inventory.legacyPublications,
          migrated: report.migrated,
          skipped: report.skipped,
          unresolved: report.unresolved.length,
        },
        targetId: workspaceId,
        targetType: "workspace",
      });
      if (audit.error) {
        return {
          ok: false,
          error: "audit",
          message: "The dry check completed, but its operator audit could not be recorded. Try again before applying.",
        };
      }
    }
    return completedAction(report);
  } catch (error) {
    return failedAction(error, "The legacy workspace cutover could not be completed.");
  }
}

export async function recoverLegacyWorkspaceCutoverAction(input: {
  action: "release" | "takeover";
  confirmation?: string;
  expectedFingerprint?: string;
  workspaceId: string;
}): Promise<LegacyWorkspaceCutoverRecoveryActionResult> {
  const admin = await requireAdminContext();
  const workspaceId = input.workspaceId.trim();
  if (input.action !== "takeover" && input.action !== "release") {
    return { ok: false, error: "validation", message: "Choose a valid legacy cutover recovery action." };
  }
  if (!WORKSPACE_ID_PATTERN.test(workspaceId)) {
    return { ok: false, error: "validation", message: "Enter a valid workspace ID." };
  }
  const confirmation = `${input.action === "takeover" ? "TAKEOVER" : "RELEASE"} ${workspaceId}`;
  if (input.confirmation?.trim() !== confirmation) {
    return { ok: false, error: "confirmation", message: `Type ${confirmation} to confirm this recovery action.` };
  }
  if (!/^[a-f0-9]{64}$/u.test(input.expectedFingerprint ?? "")) {
    return { ok: false, error: "preflight", message: "Run a fresh dry check before recovering the pending cutover." };
  }

  const database = await getCloudflareD1Database();
  if (!database) {
    return { ok: false, error: "d1_unavailable", message: "The Client Portal database is unavailable." };
  }
  try {
    const report = await recoverLegacyWorkspaceCutoverBarrier({
      action: input.action,
      database,
      expectedFingerprint: input.expectedFingerprint!,
      operator: { email: admin.email, userId: admin.userId },
      workspaceId,
    });
    return completedAction(report);
  } catch (error) {
    return failedAction(error, "The pending legacy workspace cutover could not be recovered.");
  }
}
