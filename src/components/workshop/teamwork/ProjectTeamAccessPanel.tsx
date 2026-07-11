"use client";

import { useEffect } from "react";

import { PublisherProjectMembersPanel } from "@/components/workshop/publisher/PublisherProjectMembersPanel";
import {
  overlayProjectCollaborationPresence,
  useProjectCollaborationQuery,
  useQueryClient,
} from "@/hooks/use-project-collaboration-query";
import { useProjectPresence } from "@/hooks/use-project-presence";
import type { ProjectCollaborationSummary } from "@/lib/collaboration/types";

type ProjectTeamAccessPanelProps = {
  initialSummary: ProjectCollaborationSummary | null;
  projectId: string;
};

function ProjectTeamPresenceBridge({
  initialSummary,
  projectId,
}: ProjectTeamAccessPanelProps) {
  const queryClient = useQueryClient();
  const query = useProjectCollaborationQuery(initialSummary);
  const summary = query.data ?? initialSummary;
  const currentCollaborator = summary?.collaborators.find(
    (collaborator) => collaborator.id === summary.currentUserId,
  );
  const canJoinProjectPresence = currentCollaborator?.source !== "sheet";
  const { onlineUserIds } = useProjectPresence({
    projectId,
    currentUser: summary?.currentUserId ? { id: summary.currentUserId } : null,
    activeSurface: "overview",
    enabled: Boolean(summary && canJoinProjectPresence),
  });

  useEffect(() => {
    if (!summary || !canJoinProjectPresence) return;
    overlayProjectCollaborationPresence(
      queryClient,
      summary.projectId,
      onlineUserIds,
    );
  }, [canJoinProjectPresence, onlineUserIds, queryClient, summary]);

  return null;
}

/**
 * Project-scoped entry point for the existing access surface. The Publisher
 * caller remains a compatibility consumer until its plan-pack receipt moves
 * the implementation itself into this Teamwork directory.
 */
export function ProjectTeamAccessPanel(props: ProjectTeamAccessPanelProps) {
  return (
    <>
      <ProjectTeamPresenceBridge {...props} />
      <PublisherProjectMembersPanel {...props} />
    </>
  );
}
