"use server";

import { requireAuth } from "@/lib/auth/session";
import { getProjectCollaborationSummary } from "@/lib/repositories/workspace-repository";
import type { ProjectCollaborationSummary } from "@/lib/collaboration/types";

/**
 * Client-callable read of the project collaboration summary.
 *
 * Plan: Teamspace Improvement Plan T2.1 / F-P6 / F-P8 / decision R-15. The
 * summary now lives in a TanStack Query (`["project-collaboration", projectId]`)
 * seeded with the layout's SSR data; mutating clients re-fetch ONLY this query
 * instead of revalidating the whole project layout (which re-ran the collaboration
 * + publication + sheets fans on every role change).
 */
export async function fetchProjectCollaborationSummary(
  projectId: string,
): Promise<ProjectCollaborationSummary | null> {
  await requireAuth();
  return getProjectCollaborationSummary(projectId);
}
