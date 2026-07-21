"use server";

import { revalidatePath } from "next/cache";

import { writeAdminAuditEvent } from "@/lib/admin/audit";
import { getFeatureFlag, updateFeatureFlagInD1, type AdminFeatureFlag } from "@/lib/admin/feature-flags";
import { requireAdminContext } from "@/lib/admin/require-admin";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { assertFeatureGateToggleAllowed } from "@/lib/feature-gates/enforce";
import { getFeatureGateDefinition } from "@/lib/feature-gates/catalog";

export type SetFeatureFlagResult =
  | { ok: true; flag: AdminFeatureFlag }
  | { ok: false; error: "validation" | "d1_unavailable" | "not_found" | "reserved" | "failed" };

function normalizeFlagKey(value: string): string {
  const key = value.trim();
  if (!key || key.length > 128 || !/^[a-z0-9_:-]+$/.test(key)) {
    throw new Error("Invalid feature flag key.");
  }
  return key;
}

export async function setFeatureFlag(input: { key: string; enabled: boolean }): Promise<SetFeatureFlagResult> {
  const admin = await requireAdminContext();
  const key = normalizeFlagKey(input.key);

  try {
    await assertFeatureGateToggleAllowed(key);
  } catch {
    return { ok: false, error: "reserved" };
  }

  const db = await getCloudflareD1Database();
  if (!db) return { ok: false, error: "d1_unavailable" };

  // Capture the prior value before mutation for audit trail completeness.
  const priorFlag = await getFeatureFlag(key);

  // Seed missing catalog rows on first toggle so operators can manage new gates
  // before/without a separate migration apply in local environments.
  if (!priorFlag && getFeatureGateDefinition(key)) {
    const now = new Date().toISOString();
    await db
      .prepare(
        `
          INSERT OR IGNORE INTO feature_flags(key, enabled, description, updated_at, updated_by)
          VALUES (?, ?, ?, ?, ?)
        `,
      )
      .bind(key, input.enabled ? 1 : 0, getFeatureGateDefinition(key)?.description ?? null, now, admin.userId)
      .run();
  }

  const flag = await updateFeatureFlagInD1(db, {
    key,
    enabled: input.enabled,
    updatedBy: admin.userId,
  });
  if (!flag) return { ok: false, error: "not_found" };

  await writeAdminAuditEvent({
    actorUserId: admin.userId,
    actorEmail: admin.email,
    action: "feature_flag.updated",
    targetType: "feature_flag",
    targetId: key,
    summary: { enabled: input.enabled, previousEnabled: priorFlag?.enabled ?? null },
  });
  revalidatePath("/admin/flags");
  revalidatePath("/workshop");
  return { ok: true, flag };
}
