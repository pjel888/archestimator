"use client";

import { PublisherProjectMembersPanel } from "@/components/workshop/publisher/PublisherProjectMembersPanel";
import type { ProjectCollaborationSummary } from "@/lib/collaboration/types";

type ProjectTeamAccessPanelProps = {
  initialSummary: ProjectCollaborationSummary | null;
  projectId: string;
};

/**
 * Project-scoped entry point for the existing access surface. The Publisher
 * caller remains a compatibility consumer until its plan-pack receipt moves
 * the implementation itself into this Teamwork directory.
 */
export function ProjectTeamAccessPanel(props: ProjectTeamAccessPanelProps) {
  return <PublisherProjectMembersPanel {...props} />;
}
