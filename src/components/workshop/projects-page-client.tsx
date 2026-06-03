"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, useState, useSyncExternalStore, useTransition, type KeyboardEvent } from "react";
import { useNavigationRouter } from "@/hooks/use-navigation-router";
import { Cards, GridFour, Plus, Rows, SquaresFour } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { BulkActionToolbar } from "@/components/workshop/BulkActionToolbar";
import { BulkDestructivePreviewModal } from "@/components/workshop/BulkDestructivePreviewModal";
import type { HeaderIconToolbarAddAction } from "@/components/ui/header-icon-toolbar";
import { executeBulkDeleteProjects, previewBulkDeleteProjects } from "@/lib/projects/actions";
import { createBulkActionCorrelationId, type BulkActionPreviewResult } from "@/lib/mass-deletion/bulk-action";
import { setProjectFavorite } from "@/lib/workshop/actions";
import type { Tables } from "@/lib/supabase/types";
import { cn } from "@/lib/ui/cn";
import type { CollaborationRole } from "@/lib/collaboration/types";
import type { ProjectPublicationListSummary } from "@/lib/publication/types";
import type { WorkshopPendingInviteSummary } from "@/lib/repositories/workspace-repository";

import { LiveProjectCard, type ProjectAccessKind, type ProjectCardViewMode } from "./LiveProjectCard";
import { ProjectCard } from "./ProjectCard";
import { WorkshopCollectionLayout } from "./WorkshopCollectionLayout";
import { sampleProjects } from "./workshop-sample-projects";

type ProjectsPageClientProps = {
  projects: Array<Tables<"projects"> | ProjectListItem>;
  favoriteProjectIds?: string[];
};

export type ProjectListItem = {
  project: Tables<"projects">;
  accessKind: ProjectAccessKind;
  currentUserRole: CollaborationRole;
  ownerWorkspaceName?: string | null;
  pendingInvite?: WorkshopPendingInviteSummary | null;
  pendingInviteCount?: number;
  publicationSummary?: ProjectPublicationListSummary | null;
  sharedEstimateCount?: number;
};

const EMPTY_FAVORITE_PROJECT_IDS: string[] = [];
const EMPTY_PROJECT_LIST_ITEMS: ProjectListItem[] = [];
const PROJECT_VIEW_MODE_STORAGE_KEY = "archestimator_projects_view_mode_v1";
const PROJECT_VIEW_MODE_CHANGE_EVENT = "archestimator:projects-view-mode-change";
let fallbackProjectViewMode: ProjectCardViewMode = "large";
const NewProjectModal = dynamic(() => import("./NewProjectModal").then((mod) => mod.NewProjectModal));
const ProjectDetailsModal = dynamic(() => import("./ProjectDetailsModal").then((mod) => mod.ProjectDetailsModal));
const PROJECT_VIEW_MODE_OPTIONS: Array<{
  value: ProjectCardViewMode;
  label: string;
  icon: typeof Rows;
}> = [
  { value: "list", label: "List", icon: Rows },
  { value: "small", label: "Small thumbnails", icon: SquaresFour },
  { value: "medium", label: "Medium thumbnails", icon: GridFour },
  { value: "large", label: "Large thumbnails", icon: Cards },
];
const PROJECT_ACCESS_TABS = [
  { id: "your-projects", label: "Your Projects" },
  { id: "shared-to-you", label: "Projects shared to you" },
] as const;

type ProjectAccessTab = (typeof PROJECT_ACCESS_TABS)[number]["id"];
type ProjectAccessTabsProps = {
  activeTab: ProjectAccessTab;
  ownedCount: number;
  sharedCount: number;
  onTabChange: (tab: ProjectAccessTab) => void;
};

function normalizeProjectListItem(projectOrItem: Tables<"projects"> | ProjectListItem): ProjectListItem {
  if ("project" in projectOrItem) return projectOrItem;
  return {
    project: projectOrItem,
    accessKind: "owned",
    currentUserRole: "owner",
    pendingInviteCount: 0,
    publicationSummary: null,
    sharedEstimateCount: 0,
  };
}

function getProjectAccessSearchText(item: ProjectListItem) {
  const badge = item.accessKind === "pending-invite"
    ? "pending invite"
    : item.accessKind === "project-member"
      ? "shared project"
      : item.accessKind === "sheet-member"
        ? "sheet-only"
        : "owned";
  const linkStatus = item.publicationSummary?.status === "published" ? "shared link published" : null;
  return [
    badge,
    item.currentUserRole,
    item.ownerWorkspaceName,
    item.pendingInvite?.projectCode,
    item.pendingInvite?.inviterLabel,
    item.pendingInvite?.estimateName,
    item.sharedEstimateCount ? `${item.sharedEstimateCount} shared sheets` : null,
    linkStatus,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isProjectViewMode(value: string | null): value is ProjectCardViewMode {
  return PROJECT_VIEW_MODE_OPTIONS.some((option) => option.value === value);
}

function readProjectViewModePreference(): ProjectCardViewMode {
  if (typeof window === "undefined") return fallbackProjectViewMode;

  try {
    const storedViewMode = window.localStorage.getItem(PROJECT_VIEW_MODE_STORAGE_KEY);
    return isProjectViewMode(storedViewMode) ? storedViewMode : fallbackProjectViewMode;
  } catch {
    return fallbackProjectViewMode;
  }
}

function writeProjectViewModePreference(viewMode: ProjectCardViewMode) {
  fallbackProjectViewMode = viewMode;
  try {
    window.localStorage.setItem(PROJECT_VIEW_MODE_STORAGE_KEY, viewMode);
  } catch {}
  window.dispatchEvent(new Event(PROJECT_VIEW_MODE_CHANGE_EVENT));
}

function subscribeProjectViewModePreference(onStoreChange: () => void) {
  function handleStorage(event: StorageEvent) {
    if (event.key === PROJECT_VIEW_MODE_STORAGE_KEY) onStoreChange();
  }

  window.addEventListener(PROJECT_VIEW_MODE_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(PROJECT_VIEW_MODE_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", handleStorage);
  };
}

function getProjectViewModeServerSnapshot(): ProjectCardViewMode {
  return "large";
}

function getProjectGridClassName(viewMode: ProjectCardViewMode) {
  if (viewMode === "list") return "flex flex-col gap-1.5";
  if (viewMode === "small") return "grid grid-cols-[repeat(auto-fill,minmax(128px,156px))] gap-2";
  if (viewMode === "medium") return "grid grid-cols-[repeat(auto-fill,minmax(180px,220px))] gap-2";

  return "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5";
}

function getProjectAccessTabId(tab: ProjectAccessTab) {
  return `projects-tab-${tab}`;
}

function getProjectAccessPanelId(tab: ProjectAccessTab) {
  return `projects-panel-${tab}`;
}

function formatProjectCount(count: number) {
  return `${count} ${count === 1 ? "project" : "projects"}`;
}

function ProjectAccessTabs({
  activeTab,
  ownedCount,
  sharedCount,
  onTabChange,
}: ProjectAccessTabsProps) {
  const tabRefs = useRef<Record<ProjectAccessTab, HTMLButtonElement | null>>({
    "your-projects": null,
    "shared-to-you": null,
  });

  function activateTab(tab: ProjectAccessTab) {
    onTabChange(tab);
    tabRefs.current[tab]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, currentTab: ProjectAccessTab) {
    const currentIndex = PROJECT_ACCESS_TABS.findIndex((tab) => tab.id === currentTab);
    let nextTab: ProjectAccessTab | null = null;

    if (event.key === "ArrowRight") {
      nextTab = PROJECT_ACCESS_TABS[(currentIndex + 1) % PROJECT_ACCESS_TABS.length].id;
    } else if (event.key === "ArrowLeft") {
      nextTab = PROJECT_ACCESS_TABS[(currentIndex - 1 + PROJECT_ACCESS_TABS.length) % PROJECT_ACCESS_TABS.length].id;
    } else if (event.key === "Home") {
      nextTab = PROJECT_ACCESS_TABS[0].id;
    } else if (event.key === "End") {
      nextTab = PROJECT_ACCESS_TABS[PROJECT_ACCESS_TABS.length - 1].id;
    }

    if (!nextTab) return;
    event.preventDefault();
    activateTab(nextTab);
  }

  return (
    <div className="border-b border-hairline bg-white px-2 py-1">
      <div
        role="tablist"
        aria-label="Project access tabs"
        className="inline-flex max-w-full items-center rounded-xs border border-hairline bg-surfaceMuted p-0.5"
      >
        {PROJECT_ACCESS_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = tab.id === "your-projects" ? ownedCount : sharedCount;

          return (
            <button
              key={tab.id}
              id={getProjectAccessTabId(tab.id)}
              ref={(node) => {
                tabRefs.current[tab.id] = node;
              }}
              type="button"
              role="tab"
              aria-controls={getProjectAccessPanelId(tab.id)}
              aria-label={`${tab.label}, ${formatProjectCount(count)}`}
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              className={cn(
                "inline-flex h-6 min-w-0 items-center gap-1 rounded-xs px-2 text-[10px] font-medium leading-3 tracking-normal text-tertiary transition hover:bg-white/70 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1",
                isActive ? "bg-white text-ink shadow-sm" : null,
              )}
              onClick={() => activateTab(tab.id)}
              onKeyDown={(event) => handleKeyDown(event, tab.id)}
            >
              <span>{tab.label}</span>
              <span
                aria-hidden="true"
                className={cn(
                  "ml-1 rounded-xs border border-hairline bg-white/80 px-1 text-[8px] font-medium leading-[10px] text-tertiary",
                  isActive ? "text-secondary" : null,
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function canSelectProjectForDeletion(item: ProjectListItem) {
  if (item.accessKind === "pending-invite" || item.accessKind === "sheet-member") return false;
  if (item.accessKind === "owned") return true;
  return item.currentUserRole === "owner" || item.currentUserRole === "admin";
}

function getProjectDeletionDisabledReason(item: ProjectListItem) {
  if (canSelectProjectForDeletion(item)) return null;
  if (item.accessKind === "sheet-member") return "Sheet-only access cannot delete the project.";
  if (item.accessKind === "pending-invite") return "Accept the invite before managing the project.";
  return "Only project owners and admins can delete projects.";
}

export function ProjectsPageClient({
  projects,
  favoriteProjectIds = EMPTY_FAVORITE_PROJECT_IDS,
}: ProjectsPageClientProps) {
  const router = useNavigationRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedProject, setExpandedProject] =
    useState<Tables<"projects"> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const projectItems = useMemo(() => projects.map(normalizeProjectListItem), [projects]);
  const ownedProjectItems = useMemo(
    () => projectItems.filter((item) => item.accessKind === "owned"),
    [projectItems],
  );
  const sharedProjectItems = useMemo(
    () => projectItems.filter((item) => item.accessKind !== "owned"),
    [projectItems],
  );
  const initialTab: ProjectAccessTab =
    ownedProjectItems.length === 0 && sharedProjectItems.length > 0 ? "shared-to-you" : "your-projects";
  const [activeTab, setActiveTab] = useState<ProjectAccessTab>(initialTab);
  const projectViewMode = useSyncExternalStore(
    subscribeProjectViewModePreference,
    readProjectViewModePreference,
    getProjectViewModeServerSnapshot,
  );
  const [favoriteOverrides, setFavoriteOverrides] = useState<Record<string, boolean>>({});
  const [pendingFavoriteId, setPendingFavoriteId] = useState<string | null>(null);
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(() => new Set());
  const [deleteProjectTargetIds, setDeleteProjectTargetIds] = useState<string[]>([]);
  const [deleteProjectPreview, setDeleteProjectPreview] = useState<BulkActionPreviewResult | null>(null);
  const [deleteProjectError, setDeleteProjectError] = useState<string | null>(null);
  const [deleteProjectState, setDeleteProjectState] = useState<"idle" | "loading" | "ready" | "executing">("idle");
  const [, startTransition] = useTransition();

  const favoriteIds = useMemo(() => {
    const ids = new Set(favoriteProjectIds);
    for (const [projectId, favorite] of Object.entries(favoriteOverrides)) {
      if (favorite) ids.add(projectId);
      else ids.delete(projectId);
    }
    return ids;
  }, [favoriteProjectIds, favoriteOverrides]);

  const activeBaseProjects = activeTab === "your-projects" ? ownedProjectItems : sharedProjectItems;

  const displayProjects = useMemo(() => {
    if (!searchQuery.trim()) return activeBaseProjects;
    const q = searchQuery.toLowerCase();
    return activeBaseProjects.filter(
      (item) =>
        item.project.name?.toLowerCase().includes(q) ||
        item.project.client_name?.toLowerCase().includes(q) ||
        item.project.project_code?.toLowerCase().includes(q) ||
        item.project.location?.toLowerCase().includes(q) ||
        getProjectAccessSearchText(item).includes(q),
    );
  }, [activeBaseProjects, searchQuery]);

  const filteredSamples = useMemo(() => {
    if (!searchQuery.trim()) return sampleProjects;
    const q = searchQuery.toLowerCase();
    return sampleProjects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.client.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  const hasLiveProjects = projectItems.length > 0;
  const hasActiveProjects = activeBaseProjects.length > 0;
  const displayLiveProjects = hasLiveProjects ? displayProjects : EMPTY_PROJECT_LIST_ITEMS;
  const displaySamples = filteredSamples;
  const projectLayoutClassName = getProjectGridClassName(projectViewMode);
  const selectableDisplayProjectIds = useMemo(
    () => displayLiveProjects.filter(canSelectProjectForDeletion).map((item) => item.project.id),
    [displayLiveProjects],
  );
  const selectedVisibleProjectIds = useMemo(
    () => selectableDisplayProjectIds.filter((id) => selectedProjectIds.has(id)),
    [selectableDisplayProjectIds, selectedProjectIds],
  );
  const deleteProjectPhrase = deleteProjectTargetIds.length === 1 ? "DELETE PROJECT" : `DELETE ${deleteProjectTargetIds.length} PROJECTS`;
  const deleteProjectModalTitle = deleteProjectTargetIds.length === 1 ? "Delete project" : `Delete ${deleteProjectTargetIds.length} projects`;

  const projectViewModeActions = useMemo<HeaderIconToolbarAddAction[]>(() => {
    return PROJECT_VIEW_MODE_OPTIONS.map((option) => {
      const Icon = option.icon;
      const isActive = projectViewMode === option.value;

      return {
        label: `View projects as ${option.label}`,
        icon: <Icon size={12} weight="regular" aria-hidden="true" />,
        onClick: () => writeProjectViewModePreference(option.value),
        pressed: isActive,
        className: cn(
          "text-tertiary hover:bg-surfaceMuted hover:text-ink",
          isActive ? "bg-surfaceMuted text-ink shadow-sm" : null,
        ),
      };
    });
  }, [projectViewMode]);

  const projectToolbarActions = useMemo<HeaderIconToolbarAddAction[]>(() => {
    return [
      {
        label: "Add projects",
        icon: <Plus size={12} weight="regular" aria-hidden="true" />,
        onClick: () => setIsModalOpen(true),
        className:
          "bg-orange-50 text-orange-700 hover:bg-orange-100 hover:text-orange-800 focus-visible:bg-orange-100 focus-visible:text-orange-800",
      },
    ];
  }, []);

  function toggleProjectFavorite(projectId: string, nextFavorite: boolean) {
    const previousFavorite = favoriteIds.has(projectId);
    setFavoriteOverrides((current) => ({ ...current, [projectId]: nextFavorite }));
    setPendingFavoriteId(projectId);
    startTransition(() => {
      void setProjectFavorite({ projectId, favorite: nextFavorite })
        .then(() => router.refresh())
        .catch(() => setFavoriteOverrides((current) => ({ ...current, [projectId]: previousFavorite })))
        .finally(() => setPendingFavoriteId(null));
    });
  }

  function renderCreateProjectAction(ariaLabel: string) {
    return (
      <Button
        type="button"
        variant="primary"
        size="sm"
        onClick={() => setIsModalOpen(true)}
        aria-label={ariaLabel}
      >
        <Plus size={12} weight="regular" aria-hidden="true" />
        Create project
      </Button>
    );
  }

  function renderTabEmptyState() {
    const hasSearch = Boolean(searchQuery.trim());

    if (activeTab === "shared-to-you") {
      return (
        <EmptyState
          icon={<SquaresFour size={18} weight="regular" aria-hidden="true" />}
          title={hasSearch && hasActiveProjects ? "No shared projects match your search" : "No projects shared to you yet"}
          description={
            hasSearch && hasActiveProjects
              ? "Try a project name, owner, invite code, role, or shared sheet."
              : "When someone invites you as a viewer, editor, admin, or sheet collaborator, the project will appear here."
          }
          className="border-0 bg-white"
        />
      );
    }

    return (
      <EmptyState
        icon={<SquaresFour size={18} weight="regular" aria-hidden="true" />}
        title={hasSearch && hasActiveProjects ? "No projects match your search" : "No projects created yet"}
        description={
          hasSearch && hasActiveProjects
            ? "Try an owned project name, client, code, or location."
            : "Create your first project here, or switch to shared projects to open work others invited you into."
        }
        action={hasSearch ? undefined : renderCreateProjectAction("Create your first project")}
        className="border-0 bg-white"
      />
    );
  }

  function toggleProjectSelection(projectId: string) {
    setSelectedProjectIds((current) => {
      const next = new Set(current);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  }

  function openProjectDeletePreview(projectIds: string[]) {
    const allowedIds = new Set(projectItems.filter(canSelectProjectForDeletion).map((item) => item.project.id));
    const ids = Array.from(new Set(projectIds)).filter((id) => allowedIds.has(id));
    if (ids.length === 0) return;
    setDeleteProjectTargetIds(ids);
    setDeleteProjectPreview(null);
    setDeleteProjectError(null);
    setDeleteProjectState("loading");
    startTransition(() => {
      void previewBulkDeleteProjects({ projectIds: ids })
        .then((preview) => {
          setDeleteProjectPreview(preview);
          setDeleteProjectState("ready");
        })
        .catch((error: unknown) => {
          setDeleteProjectError(error instanceof Error ? error.message : "Could not load project delete preview.");
          setDeleteProjectState("ready");
        });
    });
  }

  function closeProjectDeletePreview() {
    setDeleteProjectTargetIds([]);
    setDeleteProjectPreview(null);
    setDeleteProjectError(null);
    setDeleteProjectState("idle");
  }

  function executeProjectDeletePreview() {
    if (!deleteProjectPreview?.previewHash) return;
    const previewHash = deleteProjectPreview.previewHash;
    setDeleteProjectState("executing");
    startTransition(() => {
      void executeBulkDeleteProjects({
        projectIds: deleteProjectTargetIds,
        expectedPreviewHash: previewHash,
        correlationId: createBulkActionCorrelationId(),
      })
        .then((result) => {
          if (!result.ok) {
            setDeleteProjectPreview((current) => current ? { ...current, issues: result.issues, blocked: result.blocked ?? current.blocked, ok: false } : current);
            setDeleteProjectError(result.issues[0]?.message ?? "Could not delete projects.");
            setDeleteProjectState("ready");
            return;
          }
          const removedIds = result.deletedIds?.length ? result.deletedIds : deleteProjectTargetIds;
          setSelectedProjectIds((current) => {
            const next = new Set(current);
            for (const id of removedIds) next.delete(id);
            return next;
          });
          if (expandedProject && removedIds.includes(expandedProject.id)) setExpandedProject(null);
          closeProjectDeletePreview();
          router.refresh();
        })
        .catch((error: unknown) => {
          setDeleteProjectError(error instanceof Error ? error.message : "Could not delete projects.");
          setDeleteProjectState("ready");
        });
    });
  }

  const inactiveAccessTabs = PROJECT_ACCESS_TABS.filter((tab) => tab.id !== activeTab);

  return (
    <WorkshopCollectionLayout
      searchLabel="Search projects"
      searchPlaceholder="Search projects"
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      toolbarLabel="Project tools"
      toolbarPrefix="projects"
      leadingActions={projectViewModeActions}
      leadingActionsLabel="Project view mode"
      addActions={projectToolbarActions}
      toolbarPanel={
        <ProjectAccessTabs
          activeTab={activeTab}
          ownedCount={ownedProjectItems.length}
          sharedCount={sharedProjectItems.length}
          onTabChange={setActiveTab}
        />
      }
    >
      <section
        id={getProjectAccessPanelId(activeTab)}
        role="tabpanel"
        aria-labelledby={getProjectAccessTabId(activeTab)}
        aria-label={activeTab === "your-projects" ? "Your projects" : "Projects shared to you"}
        className="space-y-2"
      >
        <BulkActionToolbar
          selectedCount={selectedVisibleProjectIds.length}
          actionLabel="Delete selected projects"
          helperText="Project deletion blocks active shared links and runs a dependency preview first."
          onAction={() => openProjectDeletePreview(selectedVisibleProjectIds)}
          onClear={() => setSelectedProjectIds(new Set())}
          onSelectVisible={() => setSelectedProjectIds(new Set(selectableDisplayProjectIds))}
        />
        {hasLiveProjects ? (
          displayLiveProjects.length > 0 ? (
            <section
              aria-label="Live projects"
              data-project-view-mode={projectViewMode}
              className={projectLayoutClassName}
            >
              {displayLiveProjects.map((item) => {
                const canFavoriteProject = item.accessKind === "owned";

                return (
                  <LiveProjectCard
                    key={item.project.id}
                    project={item.project}
                    accessKind={item.accessKind}
                    currentUserRole={item.currentUserRole}
                    ownerWorkspaceName={item.ownerWorkspaceName}
                    pendingInvite={item.pendingInvite}
                    pendingInviteCount={item.pendingInviteCount}
                    publicationSummary={item.publicationSummary}
                    sharedEstimateCount={item.sharedEstimateCount}
                    viewMode={projectViewMode}
                    isFavorite={canFavoriteProject && favoriteIds.has(item.project.id)}
                    favoriteBusy={canFavoriteProject && pendingFavoriteId === item.project.id}
                    selectedForDeletion={selectedProjectIds.has(item.project.id)}
                    selectionDisabledReason={getProjectDeletionDisabledReason(item)}
                    onToggleSelected={canSelectProjectForDeletion(item) ? toggleProjectSelection : undefined}
                    onToggleFavorite={canFavoriteProject ? toggleProjectFavorite : undefined}
                    onExpand={setExpandedProject}
                  />
                );
              })}
            </section>
          ) : (
            renderTabEmptyState()
          )
        ) : activeTab === "your-projects" ? (
          <section aria-label="Sample project references" className="space-y-2">
            <EmptyState
              icon={<SquaresFour size={18} weight="regular" aria-hidden="true" />}
              title={searchQuery ? "No sample references match" : "Create the first live project"}
              description={
                searchQuery
                  ? "Clear search or create a live project to start estimating from your own scope."
                  : "Sample cards below are references only. Start a project to create estimates, insert components, and export a bid workbook."
              }
              action={renderCreateProjectAction("Create the first project")}
              className="bg-white"
            />
            <div
              data-project-view-mode={projectViewMode}
              className={cn(
                projectViewMode === "large"
                  ? "grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  : projectLayoutClassName,
              )}
            >
              {displaySamples.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </section>
        ) : (
          renderTabEmptyState()
        )}
      </section>
      {inactiveAccessTabs.map((tab) => (
        <section
          key={tab.id}
          id={getProjectAccessPanelId(tab.id)}
          role="tabpanel"
          aria-labelledby={getProjectAccessTabId(tab.id)}
          aria-label={tab.label}
          hidden
        />
      ))}

      {isModalOpen && <NewProjectModal onClose={() => setIsModalOpen(false)} />}
      {expandedProject ? (
        <ProjectDetailsModal
          project={expandedProject}
          onClose={() => setExpandedProject(null)}
          onDeleteProject={(project) => {
            setExpandedProject(null);
            openProjectDeletePreview([project.id]);
          }}
        />
      ) : null}
      <BulkDestructivePreviewModal
        open={deleteProjectTargetIds.length > 0}
        title={deleteProjectModalTitle}
        description="Deleting projects removes estimates and project data after active shared links and permissions are checked."
        requiredPhrase={deleteProjectPhrase}
        executeLabel="Delete projects"
        loading={deleteProjectState === "loading"}
        executing={deleteProjectState === "executing"}
        preview={deleteProjectPreview}
        previewError={deleteProjectError}
        onExecute={executeProjectDeletePreview}
        onOpenChange={(open) => {
          if (!open) closeProjectDeletePreview();
        }}
      />
    </WorkshopCollectionLayout>
  );
}
