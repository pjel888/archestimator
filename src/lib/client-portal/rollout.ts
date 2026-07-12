import "server-only";

import { isFeatureFlagEnabled } from "@/lib/admin/feature-flags";

export const CLIENT_PORTAL_LEGACY_MIGRATION_FLAG_KEY = "client_portal_legacy_migration";
export const CLIENT_PORTAL_LEGACY_WRITE_FREEZE_FLAG_KEY = "client_portal_legacy_write_freeze";

export async function isClientPortalLegacyMigrationEnabled() {
  return isFeatureFlagEnabled(CLIENT_PORTAL_LEGACY_MIGRATION_FLAG_KEY);
}

export async function isClientPortalLegacyWriteFreezeEnabled() {
  return isFeatureFlagEnabled(CLIENT_PORTAL_LEGACY_WRITE_FREEZE_FLAG_KEY);
}
