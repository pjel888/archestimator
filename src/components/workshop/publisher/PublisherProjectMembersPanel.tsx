"use client";

import {
  ProjectMembersAccessPanel,
  type ProjectMembersAccessPanelProps,
} from "@/components/workshop/teamwork/ProjectMembersAccessPanel";

export type PublisherProjectMembersPanelProps = ProjectMembersAccessPanelProps;

export function PublisherProjectMembersPanel(props: PublisherProjectMembersPanelProps) {
  return <ProjectMembersAccessPanel {...props} />;
}
