"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useMemo, useState, useSyncExternalStore, useTransition, type ReactNode } from "react";
import { useNavigationRouter } from "@/hooks/use-navigation-router";
import {
  CalendarBlank,
  Cards,
  ClockCounterClockwise,
  FolderSimple,
  GridFour,
  Plus,
  Rows,
  SortAscending,
  SortDescending,
  SquaresFour,
  StackSimple,
  TextAa,
  User,
} from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { ContextActionMenuContent } from "@/components/ui/action-menu";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { DropdownSelect, type DropdownSelectOption } from "@/components/ui/dropdown-select";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { BulkActionToolbar } from "@/components/workshop/BulkActionToolbar";
import { BulkDestructivePreviewModal } from "@/components/workshop/BulkDestructivePreviewModal";
import type { HeaderIconToolbarAddAction } from "@/components/ui/header-icon-toolbar";
import { executeBulkDeleteProjects, previewBulkDeleteProjects } from "@/lib/projects/actions";
import { createBulkActionCorrelationId, type BulkActionPreviewResult } from "@/lib/mass-deletion/bulk-action";
import { useToggleProjectFavorite } from "@/hooks/use-toggle-project-favorite";
import type { GroupAccentId } from "@/lib/workshop/group-accent";
import {
  bulkAssignProjectsToGroup,
  createProjectGroup,
  deleteProjectGroup,
  moveProjectToGroup,
  recolorProjectGroup,
  renameProjectGroup,
} from "@/lib/workshop/group-actions";
import type { Tables } from "@/lib/supabase/types";
import { cn } from "@/lib/ui/cn";
import type { CollaborationRole } from "@/lib/collaboration/types";
import type { ProjectPublicationListSummary } from "@/lib/publication/types";
import type {
  ProjectFavoriteEstimateSheetSummary,
  ProjectGroupSummary,
  WorkshopPendingInviteSummary,
} from "@/lib/repositories/workspace-repository";

import { LiveProjectCard, type ProjectAccessKind, type ProjectCardViewMode } from "./LiveProjectCard";
import { ManageGroupsPopover } from "./ManageGroupsPopover";
import { ProjectCard } from "./ProjectCard";
import { getProjectDateFlagLayoutClassName, getProjectGridClassName } from "./project-grid-layout";
import { ProjectGroupSection } from "./ProjectGroupSection";
import { WorkshopCollectionLayout } from "./WorkshopCollectionLayout";
import { sampleProjects } from "./workshop-sample-projects";

type ProjectsPageClientProps = {
  projects: Array<Tables<"projects"> | ProjectListItem>;
  favoriteProjectIds?: string[];
  favoritesScope: { workspaceId: string; userId: string };
  // Part 7c (Project Groups): ordered per-user group definitions for the projects page.
  // Consumed by Part 7d (group-mode rendering); wired here with a safe default.
  projectGroups?: ProjectGroupSummary[];
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
  // Part 7c (Project Groups): which user-group this project belongs to (null/absent = Ungrouped).
  // Optional so synthesized items (normalizeProjectListItem) stay valid; `?? null` collapses undefined.
  groupId?: string | null;
};

const EMPTY_FAVORITE_PROJECT_IDS: string[] = [];
const EMPTY_PROJECT_GROUPS: ProjectGroupSummary[] = [];
const EMPTY_PROJECT_LIST_ITEMS: ProjectListItem[] = [];
const PROJECT_VIEW_MODE_STORAGE_KEY = "archestimator_projects_view_mode_v1";
const PROJECT_VIEW_MODE_CHANGE_EVENT = "archestimator:projects-view-mode-change";

// Part 7d (Project Groups): the "Organize by" axis (None / Date / Group). Persisted
// in localStorage with the SAME useSyncExternalStore + custom-event + storage-event
// machinery as the view-mode preference, so it survives remounts and stays in sync
// across tabs.
type ProjectOrganizeBy = "none" | "date" | "group";
const PROJECT_ORGANIZE_BY_STORAGE_KEY = "archestimator_projects_organize_by_v1";
const PROJECT_ORGANIZE_BY_CHANGE_EVENT = "archestimator:projects-organize-by-change";
const PROJECT_ORGANIZE_BY_VALUES: ProjectOrganizeBy[] = ["none", "date", "group"];
const UNGROUPED_GROUP_KEY = "__ungrouped__";
const UNGROUPED_GROUP_LABEL = "Ungrouped";
const PROJECT_TOOLBAR_SELECT_TRIGGER_CLASS =
  "h-7 w-auto gap-1.5 border-0 border-transparent bg-transparent px-1.5 text-[10px] hover:border-transparent hover:bg-surfaceMuted focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-focus";
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
const PROJECT_ORGANIZE_BY_OPTIONS = [
  { value: "none", label: "No grouping", icon: <StackSimple size={12} weight="regular" aria-hidden="true" /> },
  { value: "date", label: "By date", icon: <CalendarBlank size={12} weight="regular" aria-hidden="true" /> },
  { value: "group", label: "By group", icon: <FolderSimple size={12} weight="regular" aria-hidden="true" /> },
] as const satisfies readonly DropdownSelectOption[];
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
  kind: "date" | "client";
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

function isProjectOrganizeBy(value: string | null): value is ProjectOrganizeBy {
  return value !== null && PROJECT_ORGANIZE_BY_VALUES.includes(value as ProjectOrganizeBy);
}

// Q1 default: "By date" is "group by the active sort dimension", so the default is
// "date" whenever the current sort field is a *grouping* sort — a date field
// (updated_at/created_at) OR client_name — and "none" otherwise (e.g. project name).
// sortField inits to "updated_at" ⇒ the first-load default is "date", which means
// zero rendered-DOM change on first paint (the date flags render exactly as today).
function defaultOrganizeByForSortField(field: ProjectSortField): ProjectOrganizeBy {
  return isDateSortField(field) || field === "client_name" ? "date" : "none";
}

function readProjectOrganizeByPreference(defaultValue: ProjectOrganizeBy): ProjectOrganizeBy {
  if (typeof window === "undefined") return defaultValue;
  try {
    const stored = window.localStorage.getItem(PROJECT_ORGANIZE_BY_STORAGE_KEY);
    if (isProjectOrganizeBy(stored)) return stored;
  } catch {}
  return defaultValue;
}

function writeProjectOrganizeByPreference(organizeBy: ProjectOrganizeBy) {
  try {
    window.localStorage.setItem(PROJECT_ORGANIZE_BY_STORAGE_KEY, organizeBy);
  } catch {}
  window.dispatchEvent(new Event(PROJECT_ORGANIZE_BY_CHANGE_EVENT));
}

function subscribeProjectOrganizeByPreference(onStoreChange: () => void) {
  function handleStorage(event: StorageEvent) {
    if (event.key === PROJECT_ORGANIZE_BY_STORAGE_KEY) onStoreChange();
  }
  window.addEventListener(PROJECT_ORGANIZE_BY_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(PROJECT_ORGANIZE_BY_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", handleStorage);
  };
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
      kind: "date" as const,
    };
  }

  const label = getProjectDateGroupLabel(date);
  return {
    key: `${field}:${label}`,
    label,
    kind: "date" as const,
  };
}

function getProjectClientGroup(item: ProjectListItem) {
  const clientName = typeof item.project.client_name === "string" ? item.project.client_name.trim() : "";
  if (!clientName) {
    return {
      key: "client_name:missing",
      label: "No client yet",
      kind: "client" as const,
    };
  }

  return {
    key: `client_name:${clientName.toLocaleLowerCase()}`,
    label: clientName,
    kind: "client" as const,
  };
}

function getProjectGroup(item: ProjectListItem, field: ProjectSortField) {
  if (field === "client_name") return getProjectClientGroup(item);
  return getProjectDateGroup(item, field);
}

function groupProjects(items: ProjectListItem[], field: ProjectSortField): ProjectDateGroup[] {
  const groups: ProjectDateGroup[] = [];
  let currentGroup: ProjectDateGroup | null = null;

  for (const item of items) {
    const group = getProjectGroup(item, field);
    if (!currentGroup || currentGroup.key !== group.key) {
      currentGroup = { ...group, items: [] };
      groups.push(currentGroup);
    }
    currentGroup.items.push(item);
  }

  return groups;
}

type ProjectUserGroup = {
  key: string;
  label: string;
  accentId: string | null;
  isVirtual: boolean;
  kind: "group";
  items: ProjectListItem[];
};

// Part 7d: bucket projects by their user-group, iterating the SERVER `groups` in
// position order. Empty named groups render when NOT searching; during an active
// search a group with zero matches is hidden. Projects whose groupId is null OR a
// dangling id (a group deleted in another tab) fall to the virtual "Ungrouped"
// bucket, which is always pinned LAST and hidden when empty.
function groupProjectsByUserGroup(
  items: ProjectListItem[],
  groups: ProjectGroupSummary[],
  options: { isSearching: boolean },
): ProjectUserGroup[] {
  const known = new Set(groups.map((group) => group.id));
  const byGroup = new Map<string, ProjectListItem[]>();
  const ungrouped: ProjectListItem[] = [];

  for (const item of items) {
    const groupId = item.groupId ?? null;
    if (groupId && known.has(groupId)) {
      const bucket = byGroup.get(groupId);
      if (bucket) bucket.push(item);
      else byGroup.set(groupId, [item]);
    } else {
      // null OR a dangling id deleted in another tab → Ungrouped (D12 defense).
      ungrouped.push(item);
    }
  }

  const sections: ProjectUserGroup[] = [];
  // groups arrive in position order from the repository read.
  for (const group of groups) {
    const groupItems = byGroup.get(group.id) ?? [];
    // During search, hide any group with zero matches; otherwise render empty named groups.
    if (options.isSearching && groupItems.length === 0) continue;
    sections.push({
      key: group.id,
      label: group.name,
      accentId: group.accentId,
      isVirtual: false,
      kind: "group",
      items: groupItems,
    });
  }

  // Ungrouped: always last; hidden when empty (search or not).
  if (ungrouped.length > 0) {
    sections.push({
      key: UNGROUPED_GROUP_KEY,
      label: UNGROUPED_GROUP_LABEL,
      accentId: null,
      isVirtual: true,
      kind: "group",
      items: ungrouped,
    });
  }

  return sections;
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
        "bg-transparent px-2 [&_[role=tablist]]:h-[41px] [&_[role=tablist]]:overflow-visible [&_[role=tablist]]:border-transparent",
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

// LD-2/D9 assignment-eligibility gate, INDEPENDENT of delete eligibility. The SSR
// repository already derived accessKind === "owned" using the LD-2 ownership predicate
// (workspace-role membership OR created_by === profileId, created_by-nullable-safe), so
// the client check is simply accessKind === "owned". Shared/invited projects are out of
// v1 group scope (D11). This intentionally does NOT consult the delete gate, so an owned
// project the delete flow would block (e.g. an active shared link) stays bulk-groupable.
function canAssignProjectToGroup(item: ProjectListItem) {
  return item.accessKind === "owned";
}

export function ProjectsPageClient({
  projects,
  favoriteProjectIds = EMPTY_FAVORITE_PROJECT_IDS,
  favoritesScope,
  projectGroups = EMPTY_PROJECT_GROUPS,
}: ProjectsPageClientProps) {
  const router = useNavigationRouter();
  const { toast } = useToast();
  const toggleProjectFavoriteMutation = useToggleProjectFavorite(favoritesScope);
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
  const organizeByDefault = defaultOrganizeByForSortField(sortField);
  const storedOrganizeBy = useSyncExternalStore(
    subscribeProjectOrganizeByPreference,
    () => readProjectOrganizeByPreference(organizeByDefault),
    () => organizeByDefault,
  );
  // D11: Group mode is Your-Projects-only. On Shared, coerce away from "group" to the
  // Q1 default WITHOUT persisting (so switching back to Your Projects restores the
  // pick), and without clobbering a stored "date"/"none" preference (only "group" is
  // coerced).
  const organizeBy: ProjectOrganizeBy =
    activeTab === "shared-to-you" && storedOrganizeBy === "group" ? organizeByDefault : storedOrganizeBy;
  // Task 6 (LD-6): the override map is keyed by groupId (string | null), not a boolean.
  // Effective group for a project = groupOverrides[id] if the key is present, else
  // item.groupId ?? null. The override is set immediately on assign and cleared ONLY by
  // the reconciliation effect once the transition settles AND SSR is authoritative —
  // never inside a non-awaitable router.refresh().then().
  const [groupOverrides, setGroupOverrides] = useState<Record<string, string | null>>({});
  const [pendingGroupProjectId, setPendingGroupProjectId] = useState<string | null>(null);
  const [collapsedGroupKeys, setCollapsedGroupKeys] = useState<Set<string>>(() => new Set());
  const [manageGroupsOpen, setManageGroupsOpen] = useState(false);
  const [deleteProjectTargetIds, setDeleteProjectTargetIds] = useState<string[]>([]);
  const [deleteProjectPreview, setDeleteProjectPreview] = useState<BulkActionPreviewResult | null>(null);
  const [deleteProjectError, setDeleteProjectError] = useState<string | null>(null);
  const [deleteProjectState, setDeleteProjectState] = useState<"idle" | "loading" | "ready" | "executing">("idle");
  // Shared transition for group-CRUD (create/rename/recolor/delete) and the
  // delete-preview/execute flow. Its pending flag is intentionally NOT consumed — the
  // reconciliation gate tracks the assignment-only transition below (F3), so only the
  // dispatcher (startTransition) is bound here.
  const [, startTransition] = useTransition();
  // F3: a SEPARATE transition dedicated to membership assignment (single move + bulk).
  // The reconciliation gate must track ONLY the assignment RSC refresh — not unrelated
  // group-CRUD or delete-preview/execute transitions, which would otherwise extend the
  // gate and stall (or mis-time) override clearing. Group-CRUD + delete still use the
  // shared `startTransition` above (their byte-identity is unchanged).
  const [isGroupAssignPending, startGroupAssignTransition] = useTransition();

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
  // D4 decouple: grouping is gated on the organizeBy axis, NOT on the sort field.
  // Date/client grouping fires ONLY in organizeBy === "date" (the Q1 default makes
  // this true on first load for date sorts, so every existing date/client flag
  // assertion holds). This re-gates ONLY the grouping boolean — the
  // `!sortTouched && isDateSortField` ORDERING branch in displayProjects is untouched,
  // so default newest-first order survives in all three modes (incl. "none").
  const shouldGroupProjects =
    organizeBy === "date" &&
    displayLiveProjects.length > 0 &&
    (isDateSortField(sortField) || sortField === "client_name");
  const groupedLiveProjects = useMemo(
    () => shouldGroupProjects ? groupProjects(displayLiveProjects, sortField) : [],
    [displayLiveProjects, shouldGroupProjects, sortField],
  );
  // Stamp the effective groupId (optimistic override wins) onto each displayed item,
  // then bucket by user-group. The override map is declared for Task 6's optimistic
  // assignment; in this chunk it is always empty so the SSR groupId is authoritative.
  const groupItemsWithOverrides = useMemo(
    () =>
      displayLiveProjects.map((item) => {
        const override = groupOverrides[item.project.id];
        if (override === undefined) return item;
        return { ...item, groupId: override };
      }),
    [displayLiveProjects, groupOverrides],
  );
  const isSearching = Boolean(searchQuery.trim());
  const groupedByUserGroup = useMemo(
    () =>
      organizeBy === "group"
        ? groupProjectsByUserGroup(groupItemsWithOverrides, projectGroups, { isSearching })
        : [],
    [organizeBy, groupItemsWithOverrides, projectGroups, isSearching],
  );
  const isUserGroupOrganize = organizeBy === "group" && displayLiveProjects.length > 0;
  // LD-10: groups exist but the active search hid them all (and nothing is Ungrouped) ⇒
  // reuse the standard search-empty surface rather than a blank Group-mode wall.
  const groupModeHasNoVisibleSections =
    isUserGroupOrganize && projectGroups.length > 0 && groupedByUserGroup.length === 0;
  const selectableDisplayProjectIds = useMemo(
    () => displayLiveProjects.filter(canSelectProjectForDeletion).map((item) => item.project.id),
    [displayLiveProjects],
  );
  const selectedVisibleProjectIds = useMemo(
    () => selectableDisplayProjectIds.filter((id) => selectedProjectIds.has(id)),
    [selectableDisplayProjectIds, selectedProjectIds],
  );
  // LD-5: the assignment selection is its OWN source, gated on canAssignProjectToGroup
  // (LD-2 ownership: accessKind === "owned"), NOT the delete-gated canSelectProjectForDeletion.
  // So an owned project blocked from DELETE by an active shared link is still bulk-groupable.
  // Reads the SAME selectedProjectIds set as delete, but filters it differently — the two
  // selected-sets diverging off one shared selection is the realized D9 gate.
  const selectableForAssignmentProjectIds = useMemo(
    () => displayLiveProjects.filter(canAssignProjectToGroup).map((item) => item.project.id),
    [displayLiveProjects],
  );
  const selectedAssignableProjectIds = useMemo(
    () => selectableForAssignmentProjectIds.filter((id) => selectedProjectIds.has(id)),
    [selectableForAssignmentProjectIds, selectedProjectIds],
  );

  // LD-6 reconciliation effect. Clears each per-project override ONLY once the ASSIGNMENT
  // transition has settled (isGroupAssignPending === false, F3) AND the incoming SSR
  // groupId for that id equals the override value — i.e. SSR is now authoritative for the
  // move, with no early-clear flicker. NEVER cleared inside a router.refresh().then()
  // (router.refresh is non-awaitable). This handles single-move, bulk-move, and the
  // rapid-reassign interleaving case: an override that no longer matches SSR (the user
  // reassigned again) is left intact until ITS own refresh lands, so the card never
  // flickers to stale SSR.
  //
  // F1: iterate the FULL normalized item set (projectItems), NOT the search-filtered,
  // tab-scoped displayLiveProjects. If a project is filtered out (search) or tab-switched
  // before its refresh settles, the filtered loop would never visit it and its override
  // would stick forever (masking later legitimate SSR moves and leaking the map). Keying
  // reconciliation off the authoritative SSR groupId of EVERY known project clears the
  // override as soon as SSR is authoritative, regardless of the active filter/tab.
  useEffect(() => {
    if (isGroupAssignPending) return; // wait for the assignment RSC refresh to settle
    // Intentional setState-in-effect: the D14/LD-6 optimistic reconciliation. router.refresh()
    // is non-awaitable, so overrides can only be cleared once the assignment transition settles
    // AND SSR is authoritative for each id. The updater returns the SAME reference when nothing
    // changed (`changed ? next : current`), so this cannot cascade renders.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGroupOverrides((current) => {
      const keys = Object.keys(current);
      if (keys.length === 0) return current;
      const ssrGroupById = new Map(projectItems.map((entry) => [entry.project.id, entry.groupId ?? null]));
      let changed = false;
      const next = { ...current };
      for (const id of keys) {
        // A project that vanished from SSR entirely (deleted) also drops its stale override.
        if (!ssrGroupById.has(id)) {
          delete next[id];
          changed = true;
          continue;
        }
        // SSR is authoritative for this id ⇒ drop the now-redundant override.
        if (ssrGroupById.get(id) === (next[id] ?? null)) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [isGroupAssignPending, projectItems]);
  const expandedProjectItem = useMemo(
    () => expandedProject ? projectItems.find((item) => item.project.id === expandedProject.id) ?? null : null,
    [expandedProject, projectItems],
  );
  const canDeleteExpandedProject = expandedProjectItem ? canSelectProjectForDeletion(expandedProjectItem) : false;
  const deleteProjectPhrase = deleteProjectTargetIds.length === 1 ? "DELETE PROJECT" : `DELETE ${deleteProjectTargetIds.length} PROJECTS`;
  const deleteProjectModalTitle = deleteProjectTargetIds.length === 1 ? "Delete project" : `Delete ${deleteProjectTargetIds.length} projects`;
  const deleteProjectDescription = deleteProjectTargetIds.length === 1
    ? "This permanently deletes the project, its estimates, and project data. Active shared links will be revoked."
    : "This permanently deletes the selected projects, their estimates, and project data. Active shared links will be revoked upon deletion.";

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

  function handleOrganizeByChange(next: string) {
    if (isProjectOrganizeBy(next)) writeProjectOrganizeByPreference(next);
  }

  function toggleGroupCollapsed(key: string) {
    setCollapsedGroupKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleCreateGroup(name: string, accentId: GroupAccentId | null) {
    startTransition(() => {
      void createProjectGroup({ name, accentId })
        .then(() => router.refresh())
        .catch(() => toast({ message: "Could not create the group.", tone: "error" }));
    });
  }
  function handleRenameGroup(groupId: string, name: string) {
    startTransition(() => {
      void renameProjectGroup({ groupId, name })
        .then(() => router.refresh())
        .catch(() => toast({ message: "Could not rename the group.", tone: "error" }));
    });
  }
  function handleRecolorGroup(groupId: string, accentId: GroupAccentId | null) {
    startTransition(() => {
      void recolorProjectGroup({ groupId, accentId })
        .then(() => router.refresh())
        .catch(() => toast({ message: "Could not update the group color.", tone: "error" }));
    });
  }
  function handleDeleteGroup(groupId: string) {
    startTransition(() => {
      void deleteProjectGroup({ groupId })
        .then(() => router.refresh())
        .catch(() => toast({ message: "Could not delete the group.", tone: "error" }));
    });
  }

  // LD-6 optimistic single-card move. Set the override immediately, then wrap the action
  // call AND router.refresh() in startTransition so isGroupMutationPending tracks the RSC
  // refresh. router.refresh() is NON-awaitable (returns void) — there is NO .then() to
  // clear in. The override is cleared by the reconciliation effect below, never here. On
  // failure: restore the previous override value (or delete the key if none) + toast.
  function assignProjectToGroup(projectId: string, nextGroupId: string | null) {
    const hadOverride = Object.prototype.hasOwnProperty.call(groupOverrides, projectId);
    const previousOverride = groupOverrides[projectId];
    setGroupOverrides((current) => ({ ...current, [projectId]: nextGroupId }));
    setPendingGroupProjectId(projectId);
    // F3: assignment uses its OWN transition so the reconciliation gate tracks only the
    // membership RSC refresh, not unrelated group-CRUD/delete transitions.
    startGroupAssignTransition(() => {
      void moveProjectToGroup({ projectId, groupId: nextGroupId })
        .then(() => {
          // LD-6: trigger the RSC refresh INSIDE the transition so isPending tracks it.
          // Do NOT clear the override here — the reconciliation effect clears it once SSR
          // is authoritative.
          router.refresh();
        })
        .catch(() => {
          setGroupOverrides((current) => {
            const next = { ...current };
            // F4: restore the prior override only when it was a real present value
            // (string | null). If there was no prior override — or the prior value was
            // `undefined` — DELETE the key instead of writing `undefined`, keeping the
            // three-state contract clean (absent = no override; present-string = group;
            // present-null = Ungrouped). A key-present-with-undefined is interpreted
            // inconsistently by the menu render and the reconcile effect.
            if (hadOverride && previousOverride !== undefined) next[projectId] = previousOverride;
            else delete next[projectId];
            return next;
          });
          toast({ message: "Could not move the project. Try again.", tone: "error" });
        })
        .finally(() => setPendingGroupProjectId(null));
    });
  }

  // LD-5/LD-11 optimistic bulk move. Reads the assignment-specific selection
  // (selectedAssignableProjectIds), NOT the delete selection. The action returns the
  // typed { movedProjectIds, skippedProjectIds }: keep moved ids optimistic (cleared by
  // the reconciliation effect once SSR is authoritative), roll back skipped ids
  // immediately, and toast partial failure with tone "error" (ToastTone has no "warning").
  function bulkAssignSelectedToGroup(nextGroupId: string | null) {
    const ids = selectedAssignableProjectIds; // LD-5: assignment selection, not delete selection
    if (ids.length === 0) return;
    const snapshot = new Map(
      ids.map(
        (id) =>
          [id, [Object.prototype.hasOwnProperty.call(groupOverrides, id), groupOverrides[id]] as const] as const,
      ),
    );
    setGroupOverrides((current) => {
      const next = { ...current };
      for (const id of ids) next[id] = nextGroupId;
      return next;
    });
    // F3: bulk assignment uses the assignment-only transition so the reconciliation gate
    // tracks only the membership RSC refresh.
    startGroupAssignTransition(() => {
      void bulkAssignProjectsToGroup({ projectIds: ids, groupId: nextGroupId })
        .then((result) => {
          // LD-11: roll back the skipped ids (not owned / not verified); keep moved ids
          // optimistic until the refresh makes SSR authoritative.
          const skipped = new Set(result.skippedProjectIds);
          if (skipped.size > 0) {
            setGroupOverrides((current) => {
              const next = { ...current };
              for (const id of ids) {
                if (!skipped.has(id)) continue;
                // F2: non-destructive rollback. Only restore the pre-bulk value if the
                // CURRENT override still equals what THIS bulk optimistically wrote
                // (nextGroupId). If it differs, a newer action (e.g. a single-move that
                // raced this bulk) owns the key — leave it untouched. F4: never write
                // `undefined`; delete the key when there was no prior override.
                if ((next[id] ?? null) !== (nextGroupId ?? null)) continue;
                const [had, prev] = snapshot.get(id)!;
                if (had && prev !== undefined) next[id] = prev;
                else delete next[id];
              }
              return next;
            });
            toast({
              message:
                result.movedProjectIds.length > 0
                  ? `Moved ${result.movedProjectIds.length}; ${skipped.size} could not be moved.`
                  : "Could not move the selected projects. Try again.",
              tone: "error",
            });
          }
          // F5: prune the MOVED ids from the selection on success so a repeat bulk-move or
          // the delete dock cannot reuse a stale selection (and overlapping bulks cannot
          // snapshot each other's optimistic values). Skipped ids stay selected for retry.
          if (result.movedProjectIds.length > 0) {
            const moved = new Set(result.movedProjectIds);
            setSelectedProjectIds((current) => {
              if (current.size === 0) return current;
              let changed = false;
              const nextSelection = new Set(current);
              for (const id of moved) {
                if (nextSelection.delete(id)) changed = true;
              }
              return changed ? nextSelection : current;
            });
          }
          // LD-6: trigger the refresh inside the transition; the reconciliation effect
          // clears the moved overrides once SSR reflects them. Never clear here.
          router.refresh();
        })
        .catch(() => {
          // Total failure (threw before returning a result): roll back ids this bulk still
          // owns. F2: only restore an id whose CURRENT override still equals nextGroupId
          // (a newer action that raced the bulk keeps its write). F4: delete rather than
          // write `undefined`. Selection is intentionally NOT pruned (keep ids for retry).
          setGroupOverrides((current) => {
            const next = { ...current };
            for (const id of ids) {
              if ((next[id] ?? null) !== (nextGroupId ?? null)) continue;
              const [had, prev] = snapshot.get(id)!;
              if (had && prev !== undefined) next[id] = prev;
              else delete next[id];
            }
            return next;
          });
          toast({ message: "Could not move the selected projects. Try again.", tone: "error" });
        });
    });
  }

  function toggleProjectFavorite(projectId: string, nextFavorite: boolean) {
    const item = projectItems.find((entry) => entry.project.id === projectId);
    const previousFavorite = favoriteIds.has(projectId);
    setFavoriteOverrides((current) => ({ ...current, [projectId]: nextFavorite }));
    setPendingFavoriteId(projectId);
    toggleProjectFavoriteMutation.toggle(
      {
        project: {
          id: projectId,
          name: item?.project.name ?? "",
          projectCode: item?.project.project_code ?? null,
          href: `/workshop/projects/${projectId}/estimates`,
          favoriteCreatedAt: null,
        },
        favorite: nextFavorite,
      },
      {
        // One error signal rolls back both surfaces: the hook restores the shared
        // sidebar cache from its snapshot; this caller restores the local card star.
        onError: () => setFavoriteOverrides((current) => ({ ...current, [projectId]: previousFavorite })),
        onSettled: () => setPendingFavoriteId(null),
      },
    );
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

  // D8 card kebab: the per-card "Move to group" menu, rendered in the LiveProjectCard
  // DETAILS-ACTION menu (not the C3 hover overlay) via the optional groupAssignMenu prop.
  // Only owned cards in Group mode get it. The checked item reflects the EFFECTIVE current
  // group (override wins over SSR, LD-10 trailing Check via DropdownMenu.Item selected).
  function renderProjectGroupMenu(item: ProjectListItem): ReactNode {
    if (item.accessKind !== "owned" || organizeBy !== "group") return undefined;
    const override = groupOverrides[item.project.id];
    const effectiveGroupId = override !== undefined ? override : item.groupId ?? null;
    const busy = pendingGroupProjectId === item.project.id;
    return (
      <DropdownMenu
        align="end"
        trigger={
          <Button
            type="button"
            variant="secondary"
            size="icon-xs"
            className="size-6 border-hairline bg-white"
            aria-label={`Move ${item.project.name} to a group`}
            aria-busy={busy}
          >
            <FolderSimple size={13} weight="regular" aria-hidden="true" />
          </Button>
        }
      >
        {projectGroups.map((group) => (
          <DropdownMenu.Item
            key={group.id}
            label={group.name}
            // LD-10: the current (effective, override-aware) group shows a trailing Check.
            selected={effectiveGroupId === group.id}
            onClick={() => assignProjectToGroup(item.project.id, group.id)}
          />
        ))}
        <DropdownMenu.Item
          label="Ungrouped"
          selected={effectiveGroupId === null}
          onClick={() => assignProjectToGroup(item.project.id, null)}
          disabled={effectiveGroupId === null}
        />
      </DropdownMenu>
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
        groupAssignMenu={renderProjectGroupMenu(item)}
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

  // P0-1: when the user is in Group mode but has created NO groups yet, lead with a
  // CTA EmptyState ABOVE the single Ungrouped flag so the mode is discoverable and
  // never reads as broken. The CTA opens the same controlled Manage-groups popover.
  function renderZeroGroupsEmptyState() {
    return (
      <EmptyState
        icon={<FolderSimple size={18} weight="regular" aria-hidden="true" />}
        title="Organize projects into groups"
        description="Create a group to start sorting your projects. Until then, everything stays under Ungrouped."
        action={
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setManageGroupsOpen(true)}
          >
            <Plus size={12} weight="regular" aria-hidden="true" />
            Create your first group
          </Button>
        }
        className="border-0 bg-white"
      />
    );
  }

  // Per-group section header right-click menu. v1 ships exactly two items:
  // "Manage groups" (opens the popover where rename/recolor live) and
  // "Delete group" (inline delete, D10).
  function renderGroupHeaderMenu(groupKey: string) {
    return (
      <ContextActionMenuContent
        groups={[
          {
            id: "group-actions",
            items: [
              {
                id: "manage-groups",
                label: "Manage groups",
                onSelect: () => setManageGroupsOpen(true),
              },
              {
                id: "delete-group",
                label: "Delete group",
                tone: "destructive",
                onSelect: () => handleDeleteGroup(groupKey),
              },
            ],
          },
        ]}
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
            className={PROJECT_TOOLBAR_SELECT_TRIGGER_CLASS}
          />
          <span
            aria-hidden="true"
            className="h-4 w-px shrink-0 bg-hairline"
            data-project-toolbar-view-divider=""
          />
          {projectControlsDisabled ? null : (
            <>
              <DropdownSelect
                aria-label={
                  activeTab === "shared-to-you"
                    ? "Organize by, grouping unavailable on shared projects"
                    : "Organize by"
                }
                options={
                  activeTab === "shared-to-you"
                    ? PROJECT_ORGANIZE_BY_OPTIONS.map((option) =>
                        option.value === "group" ? { ...option, disabled: true } : option,
                      )
                    : PROJECT_ORGANIZE_BY_OPTIONS
                }
                value={organizeBy}
                onValueChange={handleOrganizeByChange}
                variant="boxed"
                triggerDisplay="icon"
                className={PROJECT_TOOLBAR_SELECT_TRIGGER_CLASS}
              />
              <DropdownSelect
                aria-label="Sort field"
                options={PROJECT_SORT_FIELD_OPTIONS}
                value={sortField}
                onValueChange={handleSortFieldChange}
                variant="boxed"
                triggerDisplay="icon"
                className={PROJECT_TOOLBAR_SELECT_TRIGGER_CLASS}
              />
              <DropdownSelect
                aria-label="Sort direction"
                options={sortDirectionOptions}
                value={sortDirection}
                onValueChange={handleSortDirectionChange}
                variant="boxed"
                triggerDisplay="icon"
                className={PROJECT_TOOLBAR_SELECT_TRIGGER_CLASS}
              />
              {organizeBy === "group" && activeTab === "your-projects" ? (
                <ManageGroupsPopover
                  groups={projectGroups}
                  onCreate={handleCreateGroup}
                  onRename={handleRenameGroup}
                  onRecolor={handleRecolorGroup}
                  onDelete={handleDeleteGroup}
                  open={manageGroupsOpen}
                  onOpenChange={setManageGroupsOpen}
                />
              ) : null}
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
        {/* D9 bulk "Move to group" affordance. In-flow (NOT the fixed delete dock, to
            avoid colliding with the C2 delete-dock contract), gated on group mode + Your
            Projects. LD-5: it reads selectedAssignableProjectIds (the assignment selection),
            so an owned project blocked from delete by a shared link is still bulk-groupable. */}
        {selectedAssignableProjectIds.length > 0 && organizeBy === "group" && activeTab === "your-projects" ? (
          <div className="flex justify-center" data-bulk-move-to-group="">
            <DropdownMenu
              align="start"
              trigger={
                <Button type="button" variant="secondary" size="sm" className="h-7 gap-1 px-2">
                  <FolderSimple size={12} weight="regular" aria-hidden="true" />
                  Move to group
                </Button>
              }
            >
              {projectGroups.map((group) => (
                <DropdownMenu.Item
                  key={group.id}
                  label={group.name}
                  onClick={() => bulkAssignSelectedToGroup(group.id)}
                />
              ))}
              <DropdownMenu.Item label="Ungrouped" onClick={() => bulkAssignSelectedToGroup(null)} />
            </DropdownMenu>
          </div>
        ) : null}
        <BulkActionToolbar
          selectedCount={selectedVisibleProjectIds.length}
          actionLabel="Delete selected projects"
          helperText="Active shared links will be revoked when deleted."
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
              className={shouldGroupProjects || isUserGroupOrganize ? "space-y-4" : projectLayoutClassName}
            >
              {isUserGroupOrganize && groupModeHasNoVisibleSections ? (
                // LD-10: groups exist but the active search hid them all ⇒ standard search-empty surface.
                renderTabEmptyState()
              ) : isUserGroupOrganize ? (
                <>
                  {/* P0-1: zero-groups Group-mode CTA, ABOVE the single Ungrouped flag. */}
                  {projectGroups.length === 0 ? renderZeroGroupsEmptyState() : null}
                  {groupedByUserGroup.map((group) => (
                    <ProjectGroupSection
                      key={group.key}
                      mode="group"
                      group={{ key: group.key, label: group.label, accentId: group.accentId, isVirtual: group.isVirtual }}
                      items={group.items}
                      viewMode={projectViewMode}
                      renderCard={renderLiveProjectCard}
                      layoutClassName={projectLayoutClassName}
                      flagLayoutClassName={projectDateFlagLayoutClassName}
                      collapsed={collapsedGroupKeys.has(group.key)}
                      onToggleCollapse={toggleGroupCollapsed}
                      headerMenuSlot={group.isVirtual ? undefined : renderGroupHeaderMenu(group.key)}
                    />
                  ))}
                </>
              ) : shouldGroupProjects ? (
                groupedLiveProjects.map((group) => (
                  <ProjectGroupSection
                    key={group.key}
                    mode={group.kind === "client" ? "client" : "date"}
                    group={{ key: group.key, label: group.label }}
                    items={group.items}
                    viewMode={projectViewMode}
                    renderCard={renderLiveProjectCard}
                    layoutClassName={projectLayoutClassName}
                    flagLayoutClassName={projectDateFlagLayoutClassName}
                    legacyHeaderDataAttr={group.kind === "date" ? "data-project-date-group-label" : undefined}
                    legacySectionDataAttr={
                      group.kind === "date"
                        ? { "data-project-date-group": group.key }
                        : { "data-project-client-group": group.key }
                    }
                  />
                ))
              ) : (
                displayLiveProjects.map(renderLiveProjectCard)
              )}
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

      <Suspense fallback={null}>
        {isModalOpen && <NewProjectModal onClose={() => setIsModalOpen(false)} />}
        {expandedProject ? (
          <ProjectDetailsModal
            project={expandedProject}
            onClose={() => setExpandedProject(null)}
            onSaved={() => router.refresh()}
            onDeleteProject={canDeleteExpandedProject
              ? (project) => {
                setExpandedProject(null);
                openProjectDeletePreview([project.id]);
              }
              : undefined}
          />
        ) : null}
      </Suspense>
      <BulkDestructivePreviewModal
        open={deleteProjectTargetIds.length > 0}
        title={deleteProjectModalTitle}
        description={deleteProjectDescription}
        requiredPhrase={deleteProjectPhrase}
        executeLabel={deleteProjectTargetIds.length === 1 ? "Delete project" : "Delete projects"}
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
