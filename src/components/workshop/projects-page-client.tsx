"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { useNavigationRouter } from "@/hooks/use-navigation-router";
import {
  CalendarBlank,
  Cards,
  ClockCounterClockwise,
  GridFour,
  Plus,
  Rows,
  SortAscending,
  SortDescending,
  SquaresFour,
  TextAa,
  User,
} from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { DropdownSelect, type DropdownSelectOption } from "@/components/ui/dropdown-select";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, type TabItem } from "@/components/ui/tabs";
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
import type {
  ProjectFavoriteEstimateSheetSummary,
  WorkshopPendingInviteSummary,
} from "@/lib/repositories/workspace-repository";

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
  favoriteEstimateSheets?: ProjectFavoriteEstimateSheetSummary[];
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
  { value: "small", label: "Small", icon: SquaresFour },
  { value: "medium", label: "Medium", icon: GridFour },
  { value: "large", label: "Large", icon: Cards },
];
const VIEW_SELECT_OPTIONS: DropdownSelectOption[] = PROJECT_VIEW_MODE_OPTIONS.map(({ value, label, icon: Icon }) => ({
  value,
  label,
  icon: <Icon size={12} weight="regular" aria-hidden="true" />,
}));
const PROJECT_SORT_FIELD_OPTIONS = [
  { value: "updated_at", label: "Last updated", icon: <ClockCounterClockwise size={12} weight="regular" aria-hidden="true" /> },
  { value: "created_at", label: "Date created", icon: <CalendarBlank size={12} weight="regular" aria-hidden="true" /> },
  { value: "client_name", label: "Client", icon: <User size={12} weight="regular" aria-hidden="true" /> },
  { value: "name", label: "Project name", icon: <TextAa size={12} weight="regular" aria-hidden="true" /> },
] as const satisfies readonly DropdownSelectOption[];
const PROJECT_ACCESS_TABS = [
  { id: "your-projects", label: "Projects" },
  { id: "shared-to-you", label: "Shared" },
] as const;
const PROJECT_ACCESS_TAB_ITEMS = PROJECT_ACCESS_TABS.map(({ id, label }) => ({ id, label })) satisfies readonly TabItem[];

type ProjectAccessTab = (typeof PROJECT_ACCESS_TABS)[number]["id"];
type ProjectSortField = (typeof PROJECT_SORT_FIELD_OPTIONS)[number]["value"];
type ProjectSortDirection = "asc" | "desc";
type ProjectDateGroup = {
  key: string;
  label: string;
  items: ProjectListItem[];
};
type ProjectAccessTabsProps = {
  activeTab: ProjectAccessTab;
  viewMode: ProjectCardViewMode;
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
    favoriteEstimateSheets: [],
  };
}

function getProjectAccessSearchText(item: ProjectListItem) {
  const badge = item.accessKind === "pending-invite"
    ? "pending invite"
    : item.accessKind === "project-member"
      ? "shared project"
      : item.accessKind === "sheet-member"
        ? "estimate-only"
        : "owned";
  const linkStatus = item.publicationSummary?.status === "published" ? "shared link published" : null;
  return [
    badge,
    item.currentUserRole,
    item.ownerWorkspaceName,
    item.pendingInvite?.projectCode,
    item.pendingInvite?.inviterLabel,
    item.pendingInvite?.estimateName,
    item.sharedEstimateCount ? `${item.sharedEstimateCount} shared estimates` : null,
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
  if (viewMode === "list")
    return "flex flex-col divide-y divide-hairline overflow-hidden rounded-xs border border-hairline";
  if (viewMode === "small") return "grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-2";
  if (viewMode === "medium") return "grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3";

  return "grid grid-cols-[repeat(auto-fill,minmax(248px,1fr))] gap-3";
}

function getProjectDateFlagLayoutClassName(viewMode: ProjectCardViewMode) {
  return viewMode === "list" ? getProjectGridClassName("small") : getProjectGridClassName(viewMode);
}

function getProjectAccessTabsLayoutClassName(viewMode: ProjectCardViewMode) {
  if (viewMode === "list" || viewMode === "small")
    return "[&_[role=tablist]]:grid [&_[role=tablist]]:grid-cols-[repeat(auto-fill,minmax(132px,1fr))] [&_[role=tablist]]:gap-2";
  if (viewMode === "medium")
    return "[&_[role=tablist]]:grid [&_[role=tablist]]:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] [&_[role=tablist]]:gap-3";

  return "[&_[role=tablist]]:grid [&_[role=tablist]]:grid-cols-[repeat(auto-fill,minmax(248px,1fr))] [&_[role=tablist]]:gap-3";
}

function getProjectAccessTabId(tab: ProjectAccessTab) {
  return `tab-${tab}`;
}

function getProjectAccessPanelId(tab: ProjectAccessTab) {
  return `panel-${tab}`;
}

const projectNameCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

function isDateSortField(field: ProjectSortField) {
  return field === "updated_at" || field === "created_at";
}

function defaultSortDirectionForField(field: ProjectSortField): ProjectSortDirection {
  return isDateSortField(field) ? "desc" : "asc";
}

function getProjectSortDirectionLabel(field: ProjectSortField, direction: ProjectSortDirection) {
  if (isDateSortField(field)) return direction === "desc" ? "Newest first" : "Oldest first";
  return direction === "asc" ? "A to Z" : "Z to A";
}

function getProjectSortValue(item: ProjectListItem, field: ProjectSortField): string | number | null {
  const value = item.project[field];
  if (field === "updated_at" || field === "created_at") {
    const time = typeof value === "string" ? new Date(value).getTime() : Number.NaN;
    return Number.isFinite(time) ? time : null;
  }
  if (typeof value !== "string") return null;
  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

function compareProjectsByName(a: ProjectListItem, b: ProjectListItem) {
  return projectNameCollator.compare(a.project.name ?? "", b.project.name ?? "");
}

function compareProjectsBySort(a: ProjectListItem, b: ProjectListItem, field: ProjectSortField, direction: ProjectSortDirection) {
  const aValue = getProjectSortValue(a, field);
  const bValue = getProjectSortValue(b, field);
  if (aValue === null && bValue === null) return compareProjectsByName(a, b);
  if (aValue === null) return 1;
  if (bValue === null) return -1;

  const order = direction === "asc" ? 1 : -1;
  const primary = typeof aValue === "number" && typeof bValue === "number"
    ? aValue - bValue
    : projectNameCollator.compare(String(aValue), String(bValue));
  if (primary !== 0) return primary * order;
  return compareProjectsByName(a, b);
}

function compareProjectsByDateOnly(a: ProjectListItem, b: ProjectListItem, field: ProjectSortField, direction: ProjectSortDirection) {
  const aValue = getProjectSortValue(a, field);
  const bValue = getProjectSortValue(b, field);
  if (aValue === null && bValue === null) return 0;
  if (aValue === null) return 1;
  if (bValue === null) return -1;
  if (typeof aValue !== "number" || typeof bValue !== "number") return 0;

  const order = direction === "asc" ? 1 : -1;
  return (aValue - bValue) * order;
}

function getProjectDateGroupLabel(date: Date) {
  const month = new Intl.DateTimeFormat("en", { month: "long" }).format(date);
  return `${date.getFullYear()} · ${month}`;
}

function getProjectDateGroup(item: ProjectListItem, field: ProjectSortField) {
  const value = item.project[field];
  const date = typeof value === "string" ? new Date(value) : null;
  if (!date || !Number.isFinite(date.getTime())) {
    return {
      key: `${field}:undated`,
      label: field === "created_at" ? "Created date missing" : "Updated date missing",
    };
  }

  const label = getProjectDateGroupLabel(date);
  return {
    key: `${field}:${label}`,
    label,
  };
}

function groupProjectsByDate(items: ProjectListItem[], field: ProjectSortField): ProjectDateGroup[] {
  const groups: ProjectDateGroup[] = [];
  let currentGroup: ProjectDateGroup | null = null;

  for (const item of items) {
    const group = getProjectDateGroup(item, field);
    if (!currentGroup || currentGroup.key !== group.key) {
      currentGroup = { ...group, items: [] };
      groups.push(currentGroup);
    }
    currentGroup.items.push(item);
  }

  return groups;
}

function ProjectAccessTabs({
  activeTab,
  viewMode,
  onTabChange,
}: ProjectAccessTabsProps) {
  return (
    <Tabs
      tabs={PROJECT_ACCESS_TAB_ITEMS}
      activeId={activeTab}
      onChange={(nextTab) => onTabChange(nextTab as ProjectAccessTab)}
      variant="underline"
      ariaLabel="Project access tabs"
      className={cn(
        "bg-white px-2 [&_[role=tablist]]:h-[41px] [&_[role=tablist]]:overflow-visible [&_[role=tablist]]:border-hairline",
        getProjectAccessTabsLayoutClassName(viewMode),
      )}
      getTabButtonProps={() => ({ className: "h-full !min-h-[41px] w-full justify-start px-2.5" })}
    />
  );
}

function canSelectProjectForDeletion(item: ProjectListItem) {
  if (item.accessKind === "pending-invite" || item.accessKind === "sheet-member") return false;
  if (item.accessKind === "owned") return true;
  return item.currentUserRole === "owner" || item.currentUserRole === "admin";
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
  const [sortField, setSortField] = useState<ProjectSortField>("updated_at");
  const [sortDirection, setSortDirection] = useState<ProjectSortDirection>("desc");
  const [sortTouched, setSortTouched] = useState(false);
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
    const searchedProjects = !searchQuery.trim() ? activeBaseProjects : activeBaseProjects.filter(
      (item) =>
        item.project.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.project.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.project.project_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.project.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getProjectAccessSearchText(item).includes(searchQuery.toLowerCase()),
    );
    if (!sortTouched && isDateSortField(sortField)) {
      return [...searchedProjects].sort((a, b) => compareProjectsByDateOnly(a, b, sortField, sortDirection));
    }
    if (!sortTouched) return searchedProjects;
    return [...searchedProjects].sort((a, b) => compareProjectsBySort(a, b, sortField, sortDirection));
  }, [activeBaseProjects, searchQuery, sortDirection, sortField, sortTouched]);

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
  const projectControlsDisabled = !hasActiveProjects;
  const displayLiveProjects = hasLiveProjects ? displayProjects : EMPTY_PROJECT_LIST_ITEMS;
  const displaySamples = filteredSamples;
  const projectLayoutClassName = getProjectGridClassName(projectViewMode);
  const projectDateFlagLayoutClassName = getProjectDateFlagLayoutClassName(projectViewMode);
  const shouldGroupProjectsByDate = isDateSortField(sortField) && displayLiveProjects.length > 0;
  const dateGroupedLiveProjects = useMemo(
    () => shouldGroupProjectsByDate ? groupProjectsByDate(displayLiveProjects, sortField) : [],
    [displayLiveProjects, shouldGroupProjectsByDate, sortField],
  );
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
  const sortDirectionOptions = useMemo<DropdownSelectOption[]>(() => [
    {
      value: "desc",
      label: getProjectSortDirectionLabel(sortField, "desc"),
      icon: <SortDescending size={12} weight="regular" aria-hidden="true" />,
    },
    {
      value: "asc",
      label: getProjectSortDirectionLabel(sortField, "asc"),
      icon: <SortAscending size={12} weight="regular" aria-hidden="true" />,
    },
  ], [sortField]);

  function handleSortFieldChange(nextField: string) {
    const field = nextField as ProjectSortField;
    setSortField(field);
    setSortDirection(defaultSortDirectionForField(field));
    setSortTouched(true);
  }

  function handleSortDirectionChange(nextDirection: string) {
    setSortDirection(nextDirection as ProjectSortDirection);
    setSortTouched(true);
  }

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

  function renderLiveProjectCard(item: ProjectListItem) {
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
        favoriteEstimateSheets={item.favoriteEstimateSheets}
        viewMode={projectViewMode}
        isFavorite={canFavoriteProject && favoriteIds.has(item.project.id)}
        favoriteBusy={canFavoriteProject && pendingFavoriteId === item.project.id}
        selectedForDeletion={selectedProjectIds.has(item.project.id)}
        selectionActive={selectedVisibleProjectIds.length > 0}
        onToggleSelected={canSelectProjectForDeletion(item) ? toggleProjectSelection : undefined}
        onToggleFavorite={canFavoriteProject ? toggleProjectFavorite : undefined}
        onExpand={setExpandedProject}
      />
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
      filterSlot={
        <div className="flex min-w-0 flex-nowrap items-center gap-1.5">
          <DropdownSelect
            aria-label={projectControlsDisabled ? "View, disabled until this tab has projects" : "View"}
            options={VIEW_SELECT_OPTIONS}
            value={projectViewMode}
            onValueChange={(next) => writeProjectViewModePreference(next as ProjectCardViewMode)}
            disabled={projectControlsDisabled}
            variant="boxed"
            triggerDisplay="icon"
            className="h-7 w-11 px-2 text-[10px]"
          />
          {projectControlsDisabled ? null : (
            <>
              <DropdownSelect
                aria-label="Sort field"
                options={PROJECT_SORT_FIELD_OPTIONS}
                value={sortField}
                onValueChange={handleSortFieldChange}
                variant="boxed"
                triggerDisplay="icon"
                className="h-7 w-11 px-2 text-[10px]"
              />
              <DropdownSelect
                aria-label="Sort direction"
                options={sortDirectionOptions}
                value={sortDirection}
                onValueChange={handleSortDirectionChange}
                variant="boxed"
                triggerDisplay="icon"
                className="h-7 w-11 px-2 text-[10px]"
              />
            </>
          )}
        </div>
      }
      addActions={projectToolbarActions}
      toolbarPanel={
        <ProjectAccessTabs
          activeTab={activeTab}
          viewMode={projectViewMode}
          onTabChange={setActiveTab}
        />
      }
    >
      <section
        id={getProjectAccessPanelId(activeTab)}
        role="tabpanel"
        aria-labelledby={getProjectAccessTabId(activeTab)}
        aria-label={activeTab === "your-projects" ? "Projects" : "Shared"}
        className={cn("space-y-2", selectedVisibleProjectIds.length ? "pb-20" : null)}
      >
        <BulkActionToolbar
          selectedCount={selectedVisibleProjectIds.length}
          actionLabel="Delete selected projects"
          helperText="Project deletion blocks active shared links and runs a dependency preview first."
          placement="bottom-dock"
          onAction={() => openProjectDeletePreview(selectedVisibleProjectIds)}
          onClear={() => setSelectedProjectIds(new Set())}
          onSelectVisible={() => setSelectedProjectIds(new Set(selectableDisplayProjectIds))}
        />
        {hasLiveProjects ? (
          displayLiveProjects.length > 0 ? (
            <section
              aria-label="Live projects"
              data-project-view-mode={projectViewMode}
              className={shouldGroupProjectsByDate ? "space-y-4" : projectLayoutClassName}
            >
              {shouldGroupProjectsByDate
                ? dateGroupedLiveProjects.map((group) => (
                  <section
                    key={group.key}
                    aria-label={group.label}
                    className="space-y-2"
                    data-project-date-group={group.key}
                  >
                    <div className="pt-1">
                      <div aria-hidden="true" className="h-px bg-hairline" />
                      <div
                        className={cn(
                          "min-w-0 text-[9px] leading-3",
                          projectDateFlagLayoutClassName,
                        )}
                      >
                        <h3
                          className="min-w-0 border-x border-b border-hairline bg-hairline px-1 py-1.5 text-[9px] font-medium leading-3 tracking-normal text-secondary"
                          data-project-date-group-label
                        >
                          {group.label}
                        </h3>
                      </div>
                    </div>
                    <div className={projectLayoutClassName}>
                      {group.items.map(renderLiveProjectCard)}
                    </div>
                  </section>
                ))
                : displayLiveProjects.map(renderLiveProjectCard)}
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
                "grid",
                projectViewMode === "small" || projectViewMode === "list"
                  ? "grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2"
                  : projectViewMode === "medium"
                    ? "grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3"
                    : "grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3",
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
