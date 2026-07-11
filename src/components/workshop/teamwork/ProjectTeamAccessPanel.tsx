"use client";

import { useEffect } from "react";

import { ProjectMembersAccessPanel } from "@/components/workshop/teamwork/ProjectMembersAccessPanel";
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
 * Project-scoped entry point for Teamwork-owned collaboration management.
 */
export function ProjectTeamAccessPanel(props: ProjectTeamAccessPanelProps) {
  return (
    <>
      <ProjectTeamPresenceBridge {...props} />
      <ProjectMembersAccessPanel {...props} />
    </>
  );
}
