"use server";

import { requireAuth } from "@/lib/auth/session";
import {
  readPublisherWorkspaceActivity,
  type PublisherWorkspaceActivityResult,
} from "@/lib/publisher/activity-repository";

export async function loadPublisherWorkspaceActivity({
  cursor,
  limit,
  projectId,
}: {
  cursor?: string | null;
  limit?: number;
  projectId?: string | null;
} = {}): Promise<PublisherWorkspaceActivityResult> {
  await requireAuth();
  return readPublisherWorkspaceActivity({ cursor, limit, projectId });
}
