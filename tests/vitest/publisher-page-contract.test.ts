import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Publisher page contract", () => {
  it("renders the direct Publisher route through the bounded roster helper", () => {
    const source = readFileSync("src/app/workshop/publisher/page.tsx", "utf8");

    expect(source).toContain("parseRosterFilters");
    expect(source).toContain("readWorkspacePublicationsRoster");
    expect(source).toContain("PublisherRosterClient");
    expect(source).not.toContain("isPublisherEnabled()");
    expect(source).not.toContain("PublisherDisabledEmptyState");
    expect(source).not.toContain("createSupabaseServiceRoleClient");
    expect(source).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("keeps copy behavior local to the Publisher client island", () => {
    const source = readFileSync("src/components/workshop/publisher/PublisherRosterClient.tsx", "utf8");

    expect(source).toContain("navigator.clipboard.writeText");
    expect(source).toContain("router.replace");
    expect(source).not.toContain("router.push");
    expect(source).toContain("Publication manager roster");
    expect(source).toContain("PublisherDrawer");
  });

  it("wires the Publisher drawer to reused manager actions and controls", () => {
    const drawerSource = readFileSync("src/components/workshop/publisher/PublisherDrawer.tsx", "utf8");
    const querySource = readFileSync("src/components/workshop/publisher/usePublisherDrawer.ts", "utf8");
    const dataActionSource = readFileSync("src/lib/publisher/drawer-actions.ts", "utf8");

    expect(drawerSource).toContain("Drawer");
    expect(drawerSource).toContain("RecipientEmailComposer");
    expect(drawerSource).toContain("SheetPickerList");
    expect(drawerSource).toContain("PublisherActivityFeed");
    expect(drawerSource).toContain("PublisherProjectMembersPanel");
    expect(drawerSource).toContain("ConfirmDialog");
    expect(readFileSync("src/components/workshop/publisher/PublisherActivityFeed.tsx", "utf8")).toContain("SharedLinkActivityFeed");
    expect(querySource).toContain("republishProjectPublication");
    expect(querySource).toContain("rotateProjectPublicationLink");
    expect(querySource).toContain("revokeProjectPublication");
    expect(querySource).toContain("@tanstack/react-query");
    expect(querySource).toContain("router.refresh()");
    expect(dataActionSource).toContain('"use server"');
    expect(dataActionSource).toContain("canReadPublisherRosterProject");
    expect(dataActionSource).toContain("listCurrentWorkspaceProjects");
    expect(dataActionSource).toContain("getProjectPublicationSummary");
    expect(dataActionSource).toContain("getProjectCollaborationSummary");
    expect(dataActionSource).toContain("listProjectEstimateSheets");
  });

  it("wires Publisher access management through shared collaboration actions", () => {
    const panelSource = readFileSync("src/components/workshop/publisher/PublisherProjectMembersPanel.tsx", "utf8");
    const collaborationActionsSource = readFileSync("src/lib/collaboration/actions.ts", "utf8");
    const collaborationTypesSource = readFileSync("src/lib/collaboration/types.ts", "utf8");

    expect(panelSource).toContain("useProjectCollaborationQuery");
    expect(panelSource).toContain("inviteEstimateSheetCollaborator");
    expect(panelSource).toContain("setEstimateSheetAccessMode");
    expect(panelSource).toContain("removeEstimateSheetCollaborator");
    expect(panelSource).toContain("DataTable");
    expect(panelSource).toContain("Avatar");
    expect(panelSource).toContain("StatusBadge");
    expect(collaborationActionsSource).toContain("export async function removeEstimateSheetCollaborator");
    expect(collaborationActionsSource).toContain("assertEstimateAccessManager(projectId, estimateId)");
    expect(collaborationActionsSource).toContain("Every restricted estimate needs at least one owner or admin.");
    expect(collaborationTypesSource).toContain("EstimateSheetMemberSummary");
    expect(collaborationTypesSource).toContain("members: EstimateSheetMemberSummary[]");
  });

  it("keeps Publisher activity on the planned five-source workspace union without service-role reads", () => {
    const repositorySource = readFileSync("src/lib/publisher/activity-repository.ts", "utf8");
    const actionSource = readFileSync("src/lib/publisher/activity-actions.ts", "utf8");
    const sharedFeedSource = readFileSync("src/components/share/SharedLinkActivityFeed.tsx", "utf8");

    expect(actionSource).toContain('"use server"');
    expect(actionSource).toContain("requireAuth");
    expect(repositorySource).toContain("getCloudflareD1Database");
    expect(repositorySource).not.toContain("createSupabaseServerClient");
    expect(repositorySource).not.toContain("@/lib/supabase");
    expect(repositorySource).toContain("listCurrentWorkspaceProjects");
    expect(repositorySource).toContain("canReadPublisherRosterProject");
    for (const table of [
      "shared_link_events",
      "shared_link_comments",
      "shared_link_responses",
      "collaboration_audit_events",
      "estimate_sheet_events",
    ]) {
      expect(repositorySource).toContain(table);
    }
    expect(repositorySource).toContain("activityCursorClause");
    expect(repositorySource).toContain("isBeforeSharedLinkActivityCursor");
    expect(repositorySource).toContain("partial");
    expect(sharedFeedSource).toContain("loadActivity");
    expect(sharedFeedSource).toContain("Partial activity");
    expect(repositorySource).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(repositorySource).not.toContain("createPublicationAdminClient");
  });

  it("uses the workshop route error boundary", () => {
    const source = readFileSync("src/app/workshop/publisher/error.tsx", "utf8");

    expect(source).toContain("WorkshopRouteErrorState");
    expect(source).toContain('routeLabel="Publisher"');
  });

  it("consolidates project header publication and access entry points into Publisher links", () => {
    const source = readFileSync("src/components/workshop/ProjectChromeAsync.tsx", "utf8");

    expect(source).toContain("getPublisherProjectHref(projectId)");
    expect(source).toContain("new URLSearchParams({ project: projectId, drawer: projectId })");
    expect(source).toContain('getPublisherProjectHref(projectId, "access")');
    expect(source).toContain('params.set("tab", tab)');
    expect(source).toContain('data-publisher-project-link="publication"');
    expect(source).toContain('data-publisher-project-link="access"');
    expect(source).toContain('data-workshop-layout="project-publication-header"');
    expect(source).toContain('data-workshop-layout="project-teamspace-header"');
    expect(source).not.toContain("isPublisherEnabled()");
    expect(source).not.toContain("if (!publisherEnabled)");
    expect(source).not.toContain("@/components/workshop/ProjectPublicationHeader");
    expect(source).not.toContain("@/components/workshop/ProjectTeamspaceHeader");
    expect(source).not.toContain("<ProjectPublicationHeader");
    expect(source).not.toContain("<ProjectTeamspaceHeader");
  });
});
