"use server";

import { revalidatePath } from "next/cache";

import { writeAdminAuditEvent } from "@/lib/admin/audit";
import { updateFeatureFlagInD1, type AdminFeatureFlag } from "@/lib/admin/feature-flags";
import { requireAdminContext } from "@/lib/admin/require-admin";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";

export type SetFeatureFlagResult =
  | { ok: true; flag: AdminFeatureFlag }
  | { ok: false; error: "validation" | "d1_unavailable" | "not_found" | "failed" };

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
  const db = await getCloudflareD1Database();
  if (!db) return { ok: false, error: "d1_unavailable" };

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
    summary: { enabled: input.enabled },
  });
  revalidatePath("/admin/flags");
  return { ok: true, flag };
}
