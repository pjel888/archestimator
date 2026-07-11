"use client";

import {
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

import { fetchProjectCollaborationSummary } from "@/lib/collaboration/summary-actions";
import type {
  CollaborationRole,
  ProjectCollaborationSummary,
} from "@/lib/collaboration/types";

/**
 * TanStack Query wrapper for the project collaboration summary.
 *
 * Plan: Teamspace Improvement Plan T2.1 / decision R-15. Seeded with the SSR
 * summary so the header paints instantly (no loading flash, no double-fetch),
 * then refreshed by `invalidateProjectCollaboration` after a mutation — exactly
 * one collaboration refetch, never the publication header or sheets.
 */
function projectCollaborationQueryKey(projectId: string | null | undefined) {
  return ["project-collaboration", projectId ?? "none"] as const;
}

export function useProjectCollaborationQuery(
  initialSummary: ProjectCollaborationSummary | null,
) {
  const projectId = initialSummary?.projectId ?? null;

  return useQuery({
    queryKey: projectCollaborationQueryKey(projectId),
    queryFn: () => fetchProjectCollaborationSummary(projectId as string),
    enabled: Boolean(projectId),
    initialData: initialSummary ?? undefined,
    // Long enough that hydration never triggers an immediate refetch; mutations
    // invalidate explicitly.
    staleTime: 60_000,
  });
}

/** Invalidate exactly the collaboration query for a project. */
export function invalidateProjectCollaboration(
  queryClient: QueryClient,
  projectId: string,
) {
  return queryClient.invalidateQueries({
    queryKey: projectCollaborationQueryKey(projectId),
  });
}

/**
 * Optimistically patch a collaborator's role in the cached summary so the row
 * updates instantly; the subsequent invalidate reconciles with the server.
 */
export function optimisticallySetCollaboratorRole(
  queryClient: QueryClient,
  projectId: string,
  userId: string,
  role: CollaborationRole,
) {
  queryClient.setQueryData<ProjectCollaborationSummary | null>(
    projectCollaborationQueryKey(projectId),
    (current) => {
      if (!current) return current;
      return {
        ...current,
        collaborators: current.collaborators.map((collaborator) =>
          collaborator.id === userId ? { ...collaborator, role } : collaborator,
        ),
      };
    },
  );
}

/**
 * Overlays the authorized project-channel presence state onto the already
 * scoped collaboration summary. The server snapshot remains the authority for
 * membership and metadata; this only changes the transient `online` fields.
 */
export function withProjectCollaborationPresence(
  summary: ProjectCollaborationSummary,
  onlineUserIds: ReadonlySet<string>,
): ProjectCollaborationSummary {
  let changed = false;
  const applyPresence = <T extends { id: string; online: boolean }>(
    member: T,
  ) => {
    const online = onlineUserIds.has(member.id);
    if (member.online === online) return member;
    changed = true;
    return { ...member, online };
  };

  const collaborators = summary.collaborators.map(applyPresence);
  const estimateSheets = summary.estimateSheets.map((sheet) => {
    const members = sheet.members.map(applyPresence);
    return members === sheet.members ? sheet : { ...sheet, members };
  });

  return changed ? { ...summary, collaborators, estimateSheets } : summary;
}

/** Update the shared query so all authorized Teamwork consumers render the same presence overlay. */
export function overlayProjectCollaborationPresence(
  queryClient: QueryClient,
  projectId: string,
  onlineUserIds: ReadonlySet<string>,
) {
  queryClient.setQueryData<ProjectCollaborationSummary | null>(
    projectCollaborationQueryKey(projectId),
    (current) =>
      current
        ? withProjectCollaborationPresence(current, onlineUserIds)
        : current,
  );
}

export { useQueryClient };
