"use server";

import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import {
  migrateLegacyPublicationToClientPortal,
  rollbackLegacyPublicationClientPortalMigration,
} from "@/lib/client-portal/legacy-migration-service";
import { isClientPortalLegacyMigrationEnabled, isClientPortalLegacyWriteFreezeEnabled } from "@/lib/client-portal/rollout";
import { assertProjectPublicationManager } from "@/lib/publication/actions";

async function readAuthorizedMigrationContext({ legacyPublicationId, projectId, requireLegacyWriteFreeze = false }: { legacyPublicationId: string; projectId: string; requireLegacyWriteFreeze?: boolean }) {
  const [manager, database] = await Promise.all([assertProjectPublicationManager(projectId), getCloudflareD1Database()]);
  if (!database) throw new Error("Client Portal D1 database is unavailable.");
  if (!await isClientPortalLegacyMigrationEnabled()) throw new Error("Client Portal legacy migration is not enabled for this rollout cohort.");
  if (requireLegacyWriteFreeze && !await isClientPortalLegacyWriteFreezeEnabled()) throw new Error("Legacy publication writes must be frozen before Client Portal migration can apply.");
  const publication = await database.prepare<{ project_id: string; workspace_id: string }>("SELECT project_id, workspace_id FROM project_publications WHERE id = ? LIMIT 1").bind(legacyPublicationId).first<{ project_id: string; workspace_id: string }>();
  if (!publication || publication.project_id !== manager.project.id || publication.workspace_id !== manager.project.workspace_id) throw new Error("Legacy publication was not found.");
  return database;
}

export async function migrateLegacyPublicationToClientPortalAction({ apply = false, legacyPublicationId, projectId }: { apply?: boolean; legacyPublicationId: string; projectId: string }) {
  const database = await readAuthorizedMigrationContext({ legacyPublicationId, projectId, requireLegacyWriteFreeze: apply });
  return migrateLegacyPublicationToClientPortal({ apply, database, legacyPublicationId });
}

export async function rollbackLegacyPublicationClientPortalMigrationAction({ legacyPublicationId, projectId }: { legacyPublicationId: string; projectId: string }) {
  const database = await readAuthorizedMigrationContext({ legacyPublicationId, projectId });
  return rollbackLegacyPublicationClientPortalMigration({ database, legacyPublicationId });
}
