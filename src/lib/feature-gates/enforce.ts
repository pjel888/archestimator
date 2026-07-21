import "server-only";

import { redirect } from "next/navigation";

import { getFeatureFlag, isFeatureFlagEnabled, listFeatureFlags } from "@/lib/admin/feature-flags";
import {
  getFeatureGateDefinition,
  isToggleableFeatureGate,
  listBetaNavGateKeys,
  resolveDisabledNavIds,
  resolveFeatureGateForPath,
  type FeatureGateKey,
} from "@/lib/feature-gates/catalog";
import { isPlatformAdmin } from "@/lib/auth/roles";
import type { CurrentUserContext } from "@/lib/auth/session";

export async function isBetaFeatureEnabled(key: FeatureGateKey | string): Promise<boolean> {
  const definition = getFeatureGateDefinition(key);
  if (definition?.enforcement === "reserved") {
    // Reserved gates must not unlock product behavior until wired.
    return false;
  }

  const row = await getFeatureFlag(key);
  if (row) return row.enabled;
  return definition?.defaultEnabled ?? false;
}

export async function getDisabledWorkshopNavIds(): Promise<Set<string>> {
  const flags = await listFeatureFlags();
  const enabledByKey = new Map(flags.map((flag) => [flag.key, flag.enabled]));
  // Missing rows default to catalog defaultEnabled so a not-yet-migrated DB
  // does not accidentally hide core beta surfaces like Share.
  for (const key of listBetaNavGateKeys()) {
    if (enabledByKey.has(key)) continue;
    const definition = getFeatureGateDefinition(key);
    enabledByKey.set(key, definition?.defaultEnabled ?? false);
  }
  return resolveDisabledNavIds(enabledByKey);
}

export async function assertBetaFeaturePathAllowed(pathname: string): Promise<void> {
  const gate = resolveFeatureGateForPath(pathname);
  if (!gate) return;
  if (await isBetaFeatureEnabled(gate.key)) return;
  redirect(`/workshop?feature=${encodeURIComponent(gate.key)}`);
}

export async function assertFeatureGateToggleAllowed(key: string): Promise<void> {
  if (!isToggleableFeatureGate(key)) {
    throw new Error("This feature gate is reserved and cannot be toggled yet.");
  }
}

/**
 * Blocks workshop write mutations while maintenance mode is on.
 * Platform admins retain write access so they can recover the cohort.
 */
export async function assertWorkshopWritable(context: CurrentUserContext): Promise<void> {
  if (isPlatformAdmin(context)) return;
  if (!(await isFeatureFlagEnabled("admin_maintenance_mode"))) return;
  throw new Error("Workshop edits are paused while maintenance mode is on.");
}

export async function isWorkshopMaintenanceModeEnabled(): Promise<boolean> {
  return isFeatureFlagEnabled("admin_maintenance_mode");
}

export async function isSupportChatEnabled(): Promise<boolean> {
  return isBetaFeatureEnabled("admin_support_realtime");
}
