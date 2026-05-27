"use client";

import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Cards, GridFour, Plus, Rows, SquaresFour } from "@phosphor-icons/react";

import type { HeaderIconToolbarAddAction } from "@/components/ui/header-icon-toolbar";
import { setProjectFavorite } from "@/lib/workshop/actions";
import type { Tables } from "@/lib/supabase/types";
import { cn } from "@/lib/ui/cn";
import type { CollaborationRole } from "@/lib/collaboration/types";

import { LiveProjectCard, type ProjectAccessKind, type ProjectCardViewMode } from "./LiveProjectCard";
import { NewProjectModal } from "./NewProjectModal";
import { ProjectCard } from "./ProjectCard";
import { ProjectDetailsModal } from "./ProjectDetailsModal";
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
  sharedEstimateCount?: number;
};

const EMPTY_FAVORITE_PROJECT_IDS: string[] = [];
const PROJECT_VIEW_MODE_STORAGE_KEY = "archestimator_projects_view_mode_v1";
const PROJECT_VIEW_MODE_CHANGE_EVENT = "archestimator:projects-view-mode-change";
let fallbackProjectViewMode: ProjectCardViewMode = "large";
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
    sharedEstimateCount: 0,
  };
}

function getProjectAccessSearchText(item: ProjectListItem) {
  const badge = item.accessKind === "project-member" ? "shared project" : item.accessKind === "sheet-member" ? "sheet-only" : "owned";
  return [badge, item.currentUserRole, item.ownerWorkspaceName, item.sharedEstimateCount ? `${item.sharedEstimateCount} shared sheets` : null]
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
  const router = useRouter();
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
  const displayProjects = hasLiveProjects ? filteredProjects : [];
  const displaySamples = filteredSamples;
  const projectLayoutClassName = getProjectGridClassName(projectViewMode);

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
                sharedEstimateCount={item.sharedEstimateCount}
                viewMode={projectViewMode}
                isFavorite={favoriteIds.has(item.project.id)}
                favoriteBusy={pendingFavoriteId === item.project.id}
                onToggleFavorite={toggleProjectFavorite}
                onExpand={setExpandedProject}
              />
            ))}
          </section>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-[11px] font-medium text-ink">
              No projects match your search
            </p>
            <p className="mt-1 text-[10px] text-tertiary">
              Try adjusting your search terms
            </p>
          </div>
        )
      ) : (
        <section aria-label="Sample project references" className="space-y-2">
          <div className="rounded-xs border border-dashed border-hairline bg-white p-2 text-[10px] leading-4 text-tertiary">
            No live projects yet. Create the first project to get started;
            sample cards below are references only.
          </div>
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
    </WorkshopCollectionLayout>
  );
}
