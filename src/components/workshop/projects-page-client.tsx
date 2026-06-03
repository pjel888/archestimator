"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { useNavigationRouter } from "@/hooks/use-navigation-router";
import { Cards, GridFour, Plus, Rows, SquaresFour } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { HeaderIconToolbarAddAction } from "@/components/ui/header-icon-toolbar";
import { Modal } from "@/components/ui/modal";
import { TreeBulkActionBar } from "@/components/workshop/tree-row-affordances";
import { deleteProjectsBulk } from "@/lib/projects/actions";
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
const PROJECT_ACCESS_FILTER_OPTIONS = ["all", "owned", "shared"] as const;

type ProjectAccessFilter = (typeof PROJECT_ACCESS_FILTER_OPTIONS)[number];

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

export function ProjectsPageClient({
  projects,
  favoriteProjectIds = EMPTY_FAVORITE_PROJECT_IDS,
}: ProjectsPageClientProps) {
  const router = useNavigationRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedProject, setExpandedProject] =
    useState<Tables<"projects"> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [accessFilter, setAccessFilter] = useState<ProjectAccessFilter>("all");
  const projectViewMode = useSyncExternalStore(
    subscribeProjectViewModePreference,
    readProjectViewModePreference,
    getProjectViewModeServerSnapshot,
  );
  const [favoriteOverrides, setFavoriteOverrides] = useState<Record<string, boolean>>({});
  const [pendingFavoriteId, setPendingFavoriteId] = useState<string | null>(null);
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(() => new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [deletePending, setDeletePending] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const favoriteIds = useMemo(() => {
    const ids = new Set(favoriteProjectIds);
    for (const [projectId, favorite] of Object.entries(favoriteOverrides)) {
      if (favorite) ids.add(projectId);
      else ids.delete(projectId);
    }
    return ids;
  }, [favoriteProjectIds, favoriteOverrides]);

  const projectItems = useMemo(() => projects.map(normalizeProjectListItem), [projects]);
  const hasSharedProjects = projectItems.some((item) => item.accessKind !== "owned");

  const filteredProjects = useMemo(() => {
    const byAccess = projectItems.filter((item) => {
      if (accessFilter === "owned") return item.accessKind === "owned";
      if (accessFilter === "shared") return item.accessKind !== "owned";
      return true;
    });
    if (!searchQuery.trim()) return byAccess;
    const q = searchQuery.toLowerCase();
    return byAccess.filter(
      (item) =>
        item.project.name?.toLowerCase().includes(q) ||
        item.project.client_name?.toLowerCase().includes(q) ||
        item.project.project_code?.toLowerCase().includes(q) ||
        item.project.location?.toLowerCase().includes(q) ||
        getProjectAccessSearchText(item).includes(q),
    );
  }, [accessFilter, projectItems, searchQuery]);

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
  const displayProjects = useMemo(() => (hasLiveProjects ? filteredProjects : []), [filteredProjects, hasLiveProjects]);
  const displaySamples = filteredSamples;
  const projectLayoutClassName = getProjectGridClassName(projectViewMode);
  const selectableProjectItems = useMemo(
    () => displayProjects.filter((item) => item.accessKind === "owned" && item.currentUserRole === "owner"),
    [displayProjects],
  );
  const selectedProjectItems = useMemo(
    () => selectableProjectItems.filter((item) => selectedProjectIds.has(item.project.id)),
    [selectableProjectItems, selectedProjectIds],
  );

  useEffect(() => {
    const visibleSelectableIds = new Set(selectableProjectItems.map((item) => item.project.id));
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setSelectedProjectIds((current) => {
        const next = new Set([...current].filter((projectId) => visibleSelectableIds.has(projectId)));
        return next.size === current.size && [...next].every((projectId) => current.has(projectId)) ? current : next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [selectableProjectItems]);

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

  function toggleProjectSelection(projectId: string, checked: boolean) {
    setSelectedProjectIds((current) => {
      const next = new Set(current);
      if (checked) next.add(projectId);
      else next.delete(projectId);
      return next;
    });
  }

  function clearProjectSelection() {
    setSelectedProjectIds(new Set());
  }

  function confirmDeleteSelectedProjects() {
    if (selectedProjectItems.length === 0 || deletePending || deleteConfirmationText !== "DELETE PROJECTS") return;
    const projectIds = selectedProjectItems.map((item) => item.project.id);
    setDeletePending(true);
    setBulkError(null);
    void deleteProjectsBulk(projectIds)
      .then(() => {
        clearProjectSelection();
        setDeleteConfirmOpen(false);
        setDeleteConfirmationText("");
        router.refresh();
      })
      .catch((error: unknown) => setBulkError(error instanceof Error ? error.message : "Could not delete selected projects."))
      .finally(() => setDeletePending(false));
  }

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
    >
      {bulkError ? (
        <p className="mb-2 rounded-xs border border-dangerSoft bg-dangerSoft/40 px-2 py-1 text-[10px] font-medium text-danger" role="alert">
          {bulkError}
        </p>
      ) : null}
      <TreeBulkActionBar
        selectedCount={selectedProjectIds.size}
        entityLabel="project"
        onClearSelection={clearProjectSelection}
        onDelete={() => setDeleteConfirmOpen(true)}
        deleteDisabled={deletePending || selectedProjectItems.length === 0}
        disabledReason={deletePending ? "Finish the current project delete before deleting more projects." : "Select at least one owned project."}
      />
      {hasSharedProjects ? (
        <div className="mb-2 inline-flex rounded-xs border border-hairline bg-white p-0.5" role="tablist" aria-label="Project access filter">
          {PROJECT_ACCESS_FILTER_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={accessFilter === option}
              className={cn(
                "h-6 rounded-xs px-2 text-[10px] font-medium capitalize text-tertiary transition hover:bg-surfaceMuted hover:text-ink",
                accessFilter === option ? "bg-surfaceMuted text-ink shadow-sm" : null,
              )}
              onClick={() => setAccessFilter(option)}
            >
              {option === "all" ? "All" : option === "owned" ? "Owned" : "Shared"}
            </button>
          ))}
        </div>
      ) : null}
      {hasLiveProjects ? (
        displayProjects.length > 0 ? (
          <section
            aria-label="Live projects"
            data-project-view-mode={projectViewMode}
            className={projectLayoutClassName}
          >
            {displayProjects.map((item) => (
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
                isFavorite={favoriteIds.has(item.project.id)}
                favoriteBusy={pendingFavoriteId === item.project.id}
                selectionMode={selectedProjectIds.size > 0}
                selectionChecked={selectedProjectIds.has(item.project.id)}
                selectionDisabled={item.accessKind !== "owned" || item.currentUserRole !== "owner"}
                selectionDisabledReason="Cannot delete shared projects"
                onToggleSelection={toggleProjectSelection}
                onToggleFavorite={toggleProjectFavorite}
                onExpand={setExpandedProject}
              />
            ))}
          </section>
        ) : (
          <EmptyState
            icon={<SquaresFour size={18} weight="regular" aria-hidden="true" />}
            title="No projects match your search"
            description="Try a project name, client, code, location, shared status, or owner."
            className="border-0 bg-white"
          />
        )
      ) : (
        <section aria-label="Sample project references" className="space-y-2">
          <EmptyState
            icon={<SquaresFour size={18} weight="regular" aria-hidden="true" />}
            title={searchQuery ? "No sample references match" : "Create the first live project"}
            description={
              searchQuery
                ? "Clear search or create a live project to start estimating from your own scope."
                : "Sample cards below are references only. Start a project to create estimates, insert components, and export a bid workbook."
            }
            action={
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setIsModalOpen(true)}
                aria-label="Create the first project"
              >
                <Plus size={12} weight="regular" aria-hidden="true" />
                Create project
              </Button>
            }
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
      )}

      {isModalOpen && <NewProjectModal onClose={() => setIsModalOpen(false)} />}
      {expandedProject ? (
        <ProjectDetailsModal
          project={expandedProject}
          onClose={() => setExpandedProject(null)}
        />
      ) : null}
      <Modal
        open={deleteConfirmOpen}
        title={`Delete ${selectedProjectItems.length} selected ${selectedProjectItems.length === 1 ? "project" : "projects"}`}
        description="Type DELETE PROJECTS to confirm this destructive action."
        onOpenChange={(open) => {
          if (!open && !deletePending) {
            setDeleteConfirmOpen(false);
            setDeleteConfirmationText("");
          }
        }}
        closeLabel="Cancel project bulk delete"
        className="max-w-sm"
      >
        <div className="space-y-3">
          <p className="text-[10px] leading-4 text-tertiary">
            This deletes selected owned projects and their dependent estimate data. Shared and pending invite projects are excluded.
          </p>
          <label className="block space-y-1 text-[10px] font-medium leading-4 text-ink">
            <span>Confirmation text</span>
            <input
              className="h-8 w-full rounded-xs border border-hairline px-2 text-[10px] font-medium text-ink outline-none focus:border-accent focus:ring-2 focus:ring-focus/25"
              value={deleteConfirmationText}
              onChange={(event) => setDeleteConfirmationText(event.currentTarget.value)}
              placeholder="DELETE PROJECTS"
              aria-label="Project delete confirmation"
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={deletePending}
              onClick={() => {
                setDeleteConfirmOpen(false);
                setDeleteConfirmationText("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={deletePending || deleteConfirmationText !== "DELETE PROJECTS" || selectedProjectItems.length === 0}
              onClick={confirmDeleteSelectedProjects}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </WorkshopCollectionLayout>
  );
}
