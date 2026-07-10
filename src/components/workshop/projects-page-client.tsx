"use client";

import dynamic from "next/dynamic";
import {
  Suspense,
  memo,
  useDeferredValue,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  type DragEvent,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import { useStableCallback } from "@/hooks/use-stable-callback";
import { useNavigationRouter } from "@/hooks/use-navigation-router";
import {
  CalendarBlank,
  Cards,
  ClockCounterClockwise,
  FolderPlus,
  FolderSimple,
  GridFour,
  ListBullets,
  MagnifyingGlass,
  Rows,
  SortAscending,
  SortDescending,
  SquaresFour,
  StackSimple,
  TextAa,
  Trash,
  User,
} from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import type { ActionMenuGroup } from "@/components/ui/action-menu";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import {
  ShadcnDropdownMenu,
  ShadcnDropdownMenuContent,
  ShadcnDropdownMenuItem,
  ShadcnDropdownMenuSub,
  ShadcnDropdownMenuSubContent,
  ShadcnDropdownMenuSubTrigger,
  ShadcnDropdownMenuTrigger,
} from "@/components/ui/shadcn-dropdown-menu";
import {
  DropdownSelect,
  type DropdownSelectOption,
} from "@/components/ui/dropdown-select";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { BulkActionToolbar } from "@/components/workshop/BulkActionToolbar";
import {
  HEADER_ICON_TOOLBAR_DIVIDER_CLASSNAME,
  type HeaderIconToolbarAddAction,
} from "@/components/ui/header-icon-toolbar";
import { ADD_BUTTON_CLASSNAME } from "@/components/ui/toolbar-icon-button";
import {
  executeBulkDeleteProjects,
  previewBulkDeleteProjects,
  updateProjectStatus,
} from "@/lib/projects/actions";
import {
  DEFAULT_PROJECT_STATUS,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_VALUES,
  normalizeProjectStatus,
  type ProjectStatus,
} from "@/lib/projects/status";
import {
  createBulkActionCorrelationId,
  type BulkActionPreviewResult,
} from "@/lib/mass-deletion/bulk-action";
import { useToggleProjectFavorite } from "@/hooks/use-toggle-project-favorite";
import {
  DEFAULT_GROUP_ACCENT,
  GROUP_ACCENT_SWATCHES,
  type GroupAccentId,
} from "@/lib/workshop/group-accent";
import { MAX_PROJECT_GROUPS } from "@/lib/workshop/group-constants";
import {
  bulkAssignProjectsToGroup,
  createProjectGroup,
  deleteProjectGroup,
  moveProjectToGroup,
  recolorProjectGroup,
  renameProjectGroup,
  reorderProjectGroups,
  reorderProjectsInGroup,
} from "@/lib/workshop/group-actions";
import type { ProjectRow } from "@/lib/types/database";
import { cn } from "@/lib/ui/cn";
import { filterMapBy } from "@/lib/util/array";
import type { CollaborationRole } from "@/lib/collaboration/types";
import type { ProjectPublicationListSummary } from "@/lib/publication/types";
import type {
  ProjectCardEstimateSheetSummary,
  ProjectFavoriteEstimateSheetSummary,
  ProjectGroupSummary,
  WorkshopPendingInviteSummary,
} from "@/lib/repositories/workspace-repository";

import {
  LiveProjectCard,
  type ProjectAccessKind,
  type ProjectCardSetupStatus,
  type ProjectCardViewMode,
} from "./LiveProjectCard";
import { ProjectCardDetailsControl } from "./ProjectCardDetailsControl";
import type { NewProjectOptimisticSnapshot } from "./NewProjectForm";
import {
  getProjectDateFlagLayoutClassName,
  getProjectGridClassName,
} from "./project-grid-layout";
import { createProjectClientOptions } from "./project-client-options";
import {
  ProjectGroupSection,
  type ProjectCardDropPosition,
  type ProjectCardDropTarget,
  type ProjectGroupDropPosition,
} from "./ProjectGroupSection";
import { WorkshopCollectionLayout } from "./WorkshopCollectionLayout";

type ProjectsPageClientProps = {
  projects: Array<ProjectRow | ProjectListItem>;
  favoriteProjectIds?: string[];
  favoritesScope: { workspaceId: string; userId: string };
  googleMapsApiKey?: string;
  googleMapsMapId?: string | null;
  // Part 7c (Project Groups): ordered per-user group definitions for the projects page.
  // Consumed by Part 7d (group-mode rendering); wired here with a safe default.
  projectGroups?: ProjectGroupSummary[];
};

export type ProjectListItem = {
  project: ProjectRow;
  accessKind: ProjectAccessKind;
  currentUserRole: CollaborationRole;
  ownerWorkspaceName?: string | null;
  pendingInvite?: WorkshopPendingInviteSummary | null;
  pendingInviteCount?: number;
  isOptimisticCreate?: boolean;
  setupStatus?: ProjectCardSetupStatus | null;
  setupNavigationDisabled?: boolean;
  publicationSummary?: ProjectPublicationListSummary | null;
  sharedEstimateCount?: number;
  favoriteEstimateSheets?: ProjectFavoriteEstimateSheetSummary[];
  estimateSheets?: ProjectCardEstimateSheetSummary[];
  // Part 7c (Project Groups): which user-group this project belongs to (null/absent = Ungrouped).
  // Optional so synthesized items (normalizeProjectListItem) stay valid; `?? null` collapses undefined.
  groupId?: string | null;
  // Manual card order inside a named group. Null/absent keeps the active sort fallback.
  groupPosition?: number | null;
};

const EMPTY_FAVORITE_PROJECT_IDS: string[] = [];
const EMPTY_PROJECT_GROUPS: ProjectGroupSummary[] = [];
const PROJECT_VIEW_MODE_STORAGE_KEY = "archestimator_projects_view_mode_v1";
const PROJECT_VIEW_MODE_CHANGE_EVENT =
  "archestimator:projects-view-mode-change";
const projectGroupMonthFormatter = new Intl.DateTimeFormat("en", {
  month: "long",
});

// Part 7d (Project Groups): the "Group by" axis is independent from sorting.
// Persisted with the SAME useSyncExternalStore + custom-event + storage-event
// machinery as the view-mode preference, so it survives remounts and stays in sync
// across tabs.
type ProjectGroupBy =
  | "none"
  | "group"
  | "updated_at"
  | "created_at"
  | "client_name";
const PROJECT_GROUP_BY_STORAGE_KEY = "archestimator_projects_group_by_v1";
const PROJECT_GROUP_BY_LEGACY_STORAGE_KEY =
  "archestimator_projects_organize_by_v1";
const PROJECT_GROUP_BY_CHANGE_EVENT = "archestimator:projects-group-by-change";
const PROJECT_GROUP_BY_VALUES: ProjectGroupBy[] = [
  "none",
  "group",
  "updated_at",
  "created_at",
  "client_name",
];
const UNGROUPED_GROUP_KEY = "__ungrouped__";
const UNGROUPED_GROUP_LABEL = "Ungrouped";
const PROJECT_GROUP_DRAG_MIME_TYPE =
  "application/x-archestimator-project-group";
const PROJECT_CARD_DRAG_MIME_TYPE = "application/x-archestimator-project-card";
const OPTIMISTIC_PROJECT_GROUP_ID_PREFIX = "__optimistic_project_group__";
const PROJECT_TOOLBAR_SELECT_TRIGGER_CLASS =
  "h-7 w-auto gap-1.5 border-0 border-transparent bg-transparent px-1.5 text-[10px] hover:border-transparent hover:bg-surfaceMuted focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-focus";
let fallbackProjectViewMode: ProjectCardViewMode = "large";
const NewProjectModal = dynamic(
  () => import("./NewProjectModal").then((mod) => mod.NewProjectModal),
  { ssr: false },
);
const ProjectDetailsModal = dynamic(
  () => import("./ProjectDetailsModal").then((mod) => mod.ProjectDetailsModal),
  { ssr: false },
);
// Interaction-only surfaces — kept out of the initial entry chunk and fetched on first use.
// BulkDestructivePreviewModal was statically imported, which pulled the whole dialog stack
// into the entry chunk and defeated the other modals' lazy split.
const BulkDestructivePreviewModal = dynamic(
  () =>
    import("@/components/workshop/BulkDestructivePreviewModal").then(
      (mod) => mod.BulkDestructivePreviewModal,
    ),
  { ssr: false },
);
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
const VIEW_SELECT_OPTIONS: DropdownSelectOption[] =
  PROJECT_VIEW_MODE_OPTIONS.map(({ value, label, icon: Icon }) => ({
    value,
    label,
    icon: <Icon size={12} weight="regular" aria-hidden="true" />,
  }));
const GROUP_BY_TRIGGER_ICON = (
  <ListBullets size={12} weight="regular" aria-hidden="true" />
);
const PROJECT_SORT_FIELD_OPTIONS = [
  {
    value: "updated_at",
    label: "Last updated",
    icon: (
      <ClockCounterClockwise size={12} weight="regular" aria-hidden="true" />
    ),
  },
  {
    value: "created_at",
    label: "Date created",
    icon: <CalendarBlank size={12} weight="regular" aria-hidden="true" />,
  },
  {
    value: "client_name",
    label: "Client",
    icon: <User size={12} weight="regular" aria-hidden="true" />,
  },
  {
    value: "name",
    label: "Project name",
    icon: <TextAa size={12} weight="regular" aria-hidden="true" />,
  },
] as const satisfies readonly DropdownSelectOption[];
const PROJECT_GROUP_BY_OPTIONS = [
  {
    value: "none",
    label: "No grouping",
    icon: <StackSimple size={12} weight="regular" aria-hidden="true" />,
  },
  {
    value: "group",
    label: "Manual group order",
    icon: <FolderSimple size={12} weight="regular" aria-hidden="true" />,
  },
  {
    value: "updated_at",
    label: "Last updated",
    triggerIcon: GROUP_BY_TRIGGER_ICON,
    icon: (
      <ClockCounterClockwise size={12} weight="regular" aria-hidden="true" />
    ),
  },
  {
    value: "created_at",
    label: "Date created",
    triggerIcon: GROUP_BY_TRIGGER_ICON,
    icon: <CalendarBlank size={12} weight="regular" aria-hidden="true" />,
  },
  {
    value: "client_name",
    label: "Client",
    triggerIcon: GROUP_BY_TRIGGER_ICON,
    icon: <User size={12} weight="regular" aria-hidden="true" />,
  },
] as const satisfies readonly DropdownSelectOption[];
type ProjectSortField = (typeof PROJECT_SORT_FIELD_OPTIONS)[number]["value"];
type ProjectSortDirection = "asc" | "desc";
type ProjectScalarGroupBy = Exclude<ProjectGroupBy, "none" | "group">;
type ProjectStatusTab = "all" | ProjectStatus;
type ProjectDeleteState = "idle" | "loading" | "ready" | "executing";
type StateUpdater<T> = T | ((current: T) => T);
const PROJECT_STATUS_TAB_ID_BASE = "project-status";
const PROJECT_STATUS_TAB_IDS = [
  "all",
  ...PROJECT_STATUS_VALUES,
] as const satisfies readonly ProjectStatusTab[];

function getProjectStatusTabId(tab: ProjectStatusTab) {
  return `${PROJECT_STATUS_TAB_ID_BASE}-tab-${tab}`;
}

function getProjectStatusPanelId(tab: ProjectStatusTab) {
  return `${PROJECT_STATUS_TAB_ID_BASE}-panel-${tab}`;
}

function getProjectStatusTabLabel(tab: ProjectStatusTab) {
  return tab === "all" ? "All Projects" : PROJECT_STATUS_LABELS[tab];
}

function getProjectStatusTabsLayoutClassName(viewMode: ProjectCardViewMode) {
  if (viewMode === "list" || viewMode === "small") {
    return "[&_[role=tablist]]:grid [&_[role=tablist]]:grid-cols-[repeat(auto-fill,minmax(132px,1fr))]";
  }
  if (viewMode === "medium") {
    return "[&_[role=tablist]]:grid [&_[role=tablist]]:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]";
  }
  return "[&_[role=tablist]]:grid [&_[role=tablist]]:grid-cols-[repeat(auto-fill,minmax(248px,1fr))]";
}

function ProjectStatusTabs({
  activeTab,
  tabs,
  viewMode,
  onTabChange,
}: {
  activeTab: ProjectStatusTab;
  tabs: readonly TabItem[];
  viewMode: ProjectCardViewMode;
  onTabChange: (tab: ProjectStatusTab) => void;
}) {
  return (
    <Tabs
      tabs={tabs}
      activeId={activeTab}
      onChange={(tab) => onTabChange(tab as ProjectStatusTab)}
      variant="underline"
      ariaLabel="Project status tabs"
      idBase={PROJECT_STATUS_TAB_ID_BASE}
      className={cn(
        "bg-transparent px-2 [&_[role=tablist]]:h-[41px] [&_[role=tablist]]:overflow-visible [&_[role=tablist]]:border-0",
        getProjectStatusTabsLayoutClassName(viewMode),
      )}
      getTabButtonProps={() => ({
        className: "h-full !min-h-[41px] w-full justify-start px-2.5",
      })}
    />
  );
}

type ProjectsPageClientState = {
  isModalOpen: boolean;
  expandedProject: ProjectRow | null;
  activeStatusTab: ProjectStatusTab;
  searchQuery: string;
  optimisticProjectCreates: Record<string, NewProjectOptimisticSnapshot>;
  optimisticProjectStatusOverrides: Record<string, ProjectStatus>;
  pendingStatusProjectId: string | null;
  favoriteOverrides: Record<string, boolean>;
  pendingFavoriteId: string | null;
  selectedProjectIds: Set<string>;
  sortField: ProjectSortField;
  sortDirection: ProjectSortDirection;
  sortTouched: boolean;
  optimisticGroupOrderIds: string[] | null;
  optimisticProjectGroups: ProjectGroupSummary[];
  optimisticProjectGroupOverrides: Record<string, OptimisticProjectGroupOverride>;
  optimisticProjectOrderIdsByGroup: Record<string, string[]>;
  groupOverrides: Record<string, string | null>;
  pendingGroupProjectId: string | null;
  collapsedGroupKeys: Set<string>;
  deleteProjectTargetIds: string[];
  deleteProjectPreview: BulkActionPreviewResult | null;
  deleteProjectError: string | null;
  deleteProjectState: ProjectDeleteState;
  bulkDeleteModalMounted: boolean;
};
type ProjectsPageClientAction =
  | { type: "setIsModalOpen"; value: StateUpdater<boolean> }
  | {
      type: "setExpandedProject";
      value: StateUpdater<ProjectRow | null>;
    }
  | { type: "setActiveStatusTab"; value: ProjectStatusTab }
  | { type: "setSearchQuery"; value: string }
  | {
      type: "setOptimisticProjectCreates";
      value: StateUpdater<Record<string, NewProjectOptimisticSnapshot>>;
    }
  | {
      type: "setOptimisticProjectStatusOverrides";
      value: StateUpdater<Record<string, ProjectStatus>>;
    }
  | { type: "setPendingStatusProjectId"; value: string | null }
  | {
      type: "setFavoriteOverrides";
      value: StateUpdater<Record<string, boolean>>;
    }
  | { type: "setPendingFavoriteId"; value: string | null }
  | { type: "setSelectedProjectIds"; value: StateUpdater<Set<string>> }
  | { type: "setSortField"; value: ProjectSortField }
  | { type: "setSortDirection"; value: ProjectSortDirection }
  | { type: "setSortTouched"; value: boolean }
  | { type: "setOptimisticGroupOrderIds"; value: StateUpdater<string[] | null> }
  | {
      type: "setOptimisticProjectGroups";
      value: StateUpdater<ProjectGroupSummary[]>;
    }
  | {
      type: "setOptimisticProjectGroupOverrides";
      value: StateUpdater<Record<string, OptimisticProjectGroupOverride>>;
    }
  | {
      type: "setOptimisticProjectOrderIdsByGroup";
      value: StateUpdater<Record<string, string[]>>;
    }
  | {
      type: "setGroupOverrides";
      value: StateUpdater<Record<string, string | null>>;
    }
  | { type: "setPendingGroupProjectId"; value: string | null }
  | { type: "setCollapsedGroupKeys"; value: StateUpdater<Set<string>> }
  | { type: "setDeleteProjectTargetIds"; value: string[] }
  | {
      type: "setDeleteProjectPreview";
      value: StateUpdater<BulkActionPreviewResult | null>;
    }
  | { type: "setDeleteProjectError"; value: string | null }
  | { type: "setDeleteProjectState"; value: ProjectDeleteState }
  | { type: "setBulkDeleteModalMounted"; value: boolean };
type ProjectDateGroup = {
  key: string;
  label: string;
  items: ProjectListItem[];
  kind: "date" | "client";
};
type OptimisticProjectGroupOverride = {
  name?: string;
  accentId?: GroupAccentId | null;
};
function resolveStateUpdater<T>(current: T, value: StateUpdater<T>): T {
  return typeof value === "function"
    ? (value as (current: T) => T)(current)
    : value;
}

function createProjectsPageClientState(): ProjectsPageClientState {
  return {
    isModalOpen: false,
    expandedProject: null,
    activeStatusTab: "all",
    searchQuery: "",
    optimisticProjectCreates: {},
    optimisticProjectStatusOverrides: {},
    pendingStatusProjectId: null,
    favoriteOverrides: {},
    pendingFavoriteId: null,
    selectedProjectIds: new Set(),
    sortField: "updated_at",
    sortDirection: "desc",
    sortTouched: false,
    optimisticGroupOrderIds: null,
    optimisticProjectGroups: [],
    optimisticProjectGroupOverrides: {},
    optimisticProjectOrderIdsByGroup: {},
    groupOverrides: {},
    pendingGroupProjectId: null,
    collapsedGroupKeys: new Set(),
    deleteProjectTargetIds: [],
    deleteProjectPreview: null,
    deleteProjectError: null,
    deleteProjectState: "idle",
    bulkDeleteModalMounted: false,
  };
}

function projectsPageClientReducer(
  state: ProjectsPageClientState,
  action: ProjectsPageClientAction,
): ProjectsPageClientState {
  switch (action.type) {
    case "setIsModalOpen":
      return {
        ...state,
        isModalOpen: resolveStateUpdater(state.isModalOpen, action.value),
      };
    case "setExpandedProject":
      return {
        ...state,
        expandedProject: resolveStateUpdater(
          state.expandedProject,
          action.value,
        ),
      };
    case "setActiveStatusTab":
      return { ...state, activeStatusTab: action.value };
    case "setSearchQuery":
      return { ...state, searchQuery: action.value };
    case "setOptimisticProjectCreates":
      return {
        ...state,
        optimisticProjectCreates: resolveStateUpdater(
          state.optimisticProjectCreates,
          action.value,
        ),
      };
    case "setOptimisticProjectStatusOverrides":
      return {
        ...state,
        optimisticProjectStatusOverrides: resolveStateUpdater(
          state.optimisticProjectStatusOverrides,
          action.value,
        ),
      };
    case "setPendingStatusProjectId":
      return { ...state, pendingStatusProjectId: action.value };
    case "setFavoriteOverrides":
      return {
        ...state,
        favoriteOverrides: resolveStateUpdater(
          state.favoriteOverrides,
          action.value,
        ),
      };
    case "setPendingFavoriteId":
      return { ...state, pendingFavoriteId: action.value };
    case "setSelectedProjectIds":
      return {
        ...state,
        selectedProjectIds: resolveStateUpdater(
          state.selectedProjectIds,
          action.value,
        ),
      };
    case "setSortField":
      return { ...state, sortField: action.value };
    case "setSortDirection":
      return { ...state, sortDirection: action.value };
    case "setSortTouched":
      return { ...state, sortTouched: action.value };
    case "setOptimisticGroupOrderIds":
      return {
        ...state,
        optimisticGroupOrderIds: resolveStateUpdater(
          state.optimisticGroupOrderIds,
          action.value,
        ),
      };
    case "setOptimisticProjectGroups":
      return {
        ...state,
        optimisticProjectGroups: resolveStateUpdater(
          state.optimisticProjectGroups,
          action.value,
        ),
      };
    case "setOptimisticProjectGroupOverrides":
      return {
        ...state,
        optimisticProjectGroupOverrides: resolveStateUpdater(
          state.optimisticProjectGroupOverrides,
          action.value,
        ),
      };
    case "setOptimisticProjectOrderIdsByGroup":
      return {
        ...state,
        optimisticProjectOrderIdsByGroup: resolveStateUpdater(
          state.optimisticProjectOrderIdsByGroup,
          action.value,
        ),
      };
    case "setGroupOverrides":
      return {
        ...state,
        groupOverrides: resolveStateUpdater(state.groupOverrides, action.value),
      };
    case "setPendingGroupProjectId":
      return { ...state, pendingGroupProjectId: action.value };
    case "setCollapsedGroupKeys":
      return {
        ...state,
        collapsedGroupKeys: resolveStateUpdater(
          state.collapsedGroupKeys,
          action.value,
        ),
      };
    case "setDeleteProjectTargetIds":
      return { ...state, deleteProjectTargetIds: action.value };
    case "setDeleteProjectPreview":
      return {
        ...state,
        deleteProjectPreview: resolveStateUpdater(
          state.deleteProjectPreview,
          action.value,
        ),
      };
    case "setDeleteProjectError":
      return { ...state, deleteProjectError: action.value };
    case "setDeleteProjectState":
      return { ...state, deleteProjectState: action.value };
    case "setBulkDeleteModalMounted":
      return { ...state, bulkDeleteModalMounted: action.value };
  }
}

function normalizeProjectListItem(
  projectOrItem: ProjectRow | ProjectListItem,
): ProjectListItem {
  if ("project" in projectOrItem) return projectOrItem;
  return {
    project: projectOrItem,
    accessKind: "owned",
    currentUserRole: "owner",
    pendingInviteCount: 0,
    publicationSummary: null,
    sharedEstimateCount: 0,
    favoriteEstimateSheets: [],
    estimateSheets: [],
  };
}

function optimisticProjectSnapshotToListItem(
  snapshot: NewProjectOptimisticSnapshot,
): ProjectListItem {
  return {
    project: snapshot.project,
    accessKind: "owned",
    currentUserRole: "owner",
    pendingInviteCount: 0,
    publicationSummary: null,
    sharedEstimateCount: 0,
    favoriteEstimateSheets: [],
    estimateSheets: [],
    groupId: null,
    isOptimisticCreate: true,
    setupStatus: snapshot.setupStatus,
    setupNavigationDisabled: snapshot.setupNavigationDisabled,
  };
}

function getProjectSearchMetadata(item: ProjectListItem) {
  const linkStatus =
    item.publicationSummary?.status === "published"
      ? "shared link published"
      : null;
  return [item.currentUserRole, linkStatus]
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
    const storedViewMode = window.localStorage.getItem(
      PROJECT_VIEW_MODE_STORAGE_KEY,
    );
    return isProjectViewMode(storedViewMode)
      ? storedViewMode
      : fallbackProjectViewMode;
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

function isProjectGroupBy(value: string | null): value is ProjectGroupBy {
  return (
    value !== null && PROJECT_GROUP_BY_VALUES.includes(value as ProjectGroupBy)
  );
}

function readProjectGroupByPreference(
  defaultValue: ProjectGroupBy,
): ProjectGroupBy {
  if (typeof window === "undefined") return defaultValue;
  try {
    const stored = window.localStorage.getItem(PROJECT_GROUP_BY_STORAGE_KEY);
    if (isProjectGroupBy(stored)) return stored;

    const legacyStored = window.localStorage.getItem(
      PROJECT_GROUP_BY_LEGACY_STORAGE_KEY,
    );
    if (legacyStored === "date") return "updated_at";
    if (legacyStored === "group") return "group";
    if (legacyStored === "none") return "none";
  } catch {}
  return defaultValue;
}

function writeProjectGroupByPreference(groupBy: ProjectGroupBy) {
  try {
    window.localStorage.setItem(PROJECT_GROUP_BY_STORAGE_KEY, groupBy);
  } catch {}
  window.dispatchEvent(new Event(PROJECT_GROUP_BY_CHANGE_EVENT));
}

function handleProjectGroupByChange(nextValue: string) {
  if (!isProjectGroupBy(nextValue)) return;
  writeProjectGroupByPreference(nextValue);
}

function getNextDefaultProjectGroupName(groups: readonly ProjectGroupSummary[]) {
  const baseName = "New group";
  const existingNames = new Set(
    groups.map((group) => group.name.trim().toLowerCase()),
  );
  if (!existingNames.has(baseName.toLowerCase())) return baseName;

  for (let index = 2; index <= MAX_PROJECT_GROUPS + 1; index += 1) {
    const candidate = `${baseName} ${index}`;
    if (!existingNames.has(candidate.toLowerCase())) return candidate;
  }

  return baseName;
}

function createOptimisticProjectGroupId() {
  const randomSuffix =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${OPTIMISTIC_PROJECT_GROUP_ID_PREFIX}${randomSuffix}`;
}

function isOptimisticProjectGroupId(groupId: string) {
  return groupId.startsWith(OPTIMISTIC_PROJECT_GROUP_ID_PREFIX);
}

function getProjectDropGroupId(groupKey: string) {
  return groupKey === UNGROUPED_GROUP_KEY ? null : groupKey;
}

function hasOwn<T extends object>(value: T, key: PropertyKey) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function hasOptimisticProjectGroupOverride(
  override: OptimisticProjectGroupOverride,
) {
  return hasOwn(override, "name") || hasOwn(override, "accentId");
}

function applyOptimisticProjectGroupOverride(
  group: ProjectGroupSummary,
  override: OptimisticProjectGroupOverride | undefined,
): ProjectGroupSummary {
  if (!override) return group;
  return {
    ...group,
    name: hasOwn(override, "name") ? (override.name ?? group.name) : group.name,
    accentId: hasOwn(override, "accentId")
      ? (override.accentId ?? null)
      : group.accentId,
  };
}

function renderGroupColorPreview(
  color: string,
  options?: { id?: string },
): ReactNode {
  return (
    <span
      aria-hidden="true"
      className="block size-3 rounded-full border border-black/15 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]"
      data-project-group-color-swatch={options?.id ?? color}
      style={{ backgroundColor: color }}
    />
  );
}

function areStringArraysEqual(first: readonly string[], second: readonly string[]) {
  return (
    first.length === second.length &&
    first.every((value, index) => value === second[index])
  );
}

function haveSameStringSet(first: readonly string[], second: readonly string[]) {
  if (first.length !== second.length) return false;
  const values = new Set(first);
  if (values.size !== second.length) return false;
  return second.every((value) => values.has(value));
}

function getProjectItemGroupPosition(item: ProjectListItem) {
  return typeof item.groupPosition === "number" ? item.groupPosition : null;
}

function orderProjectItemsByIds(
  items: readonly ProjectListItem[],
  orderedIds: readonly string[] | undefined,
): ProjectListItem[] {
  if (!orderedIds) return [...items];
  const byId = new Map(items.map((item) => [item.project.id, item]));
  const ordered: ProjectListItem[] = [];
  const seen = new Set<string>();

  for (const id of orderedIds) {
    const item = byId.get(id);
    if (!item) continue;
    ordered.push(item);
    seen.add(id);
  }

  for (const item of items) {
    if (!seen.has(item.project.id)) ordered.push(item);
  }

  return ordered;
}

function orderProjectItemsWithinUserGroup(
  items: readonly ProjectListItem[],
  orderedIds: readonly string[] | undefined,
): ProjectListItem[] {
  if (orderedIds) return orderProjectItemsByIds(items, orderedIds);
  return items.toSorted((first, second) => {
    const firstPosition = getProjectItemGroupPosition(first);
    const secondPosition = getProjectItemGroupPosition(second);
    if (firstPosition !== null && secondPosition !== null) {
      return firstPosition - secondPosition;
    }
    if (firstPosition !== null) return -1;
    if (secondPosition !== null) return 1;
    return 0;
  });
}

function orderProjectGroups(
  groups: readonly ProjectGroupSummary[],
  orderedIds: readonly string[] | null,
): ProjectGroupSummary[] {
  if (!orderedIds) return [...groups];
  const byId = new Map(groups.map((group) => [group.id, group]));
  const ordered: ProjectGroupSummary[] = [];
  const seen = new Set<string>();

  for (const id of orderedIds) {
    const group = byId.get(id);
    if (!group) continue;
    ordered.push(group);
    seen.add(id);
  }

  for (const group of groups) {
    if (!seen.has(group.id)) ordered.push(group);
  }

  return ordered;
}

function getVisibleProjectGroups(
  projectGroups: readonly ProjectGroupSummary[],
  optimisticProjectGroups: readonly ProjectGroupSummary[],
  optimisticProjectGroupOverrides: Record<string, OptimisticProjectGroupOverride>,
): ProjectGroupSummary[] {
  const serverIds = new Set<string>();
  const groups: ProjectGroupSummary[] = [];

  for (const group of projectGroups) {
    serverIds.add(group.id);
    groups.push(
      applyOptimisticProjectGroupOverride(
        group,
        optimisticProjectGroupOverrides[group.id],
      ),
    );
  }

  for (const group of optimisticProjectGroups) {
    if (serverIds.has(group.id)) continue;
    groups.push(
      applyOptimisticProjectGroupOverride(
        group,
        optimisticProjectGroupOverrides[group.id],
      ),
    );
  }

  return groups;
}

function moveProjectGroupId(
  ids: readonly string[],
  draggedId: string,
  targetId: string,
  position: ProjectGroupDropPosition,
) {
  if (draggedId === targetId) return [...ids];
  const withoutDragged = ids.filter((id) => id !== draggedId);
  const targetIndex = withoutDragged.indexOf(targetId);
  if (targetIndex === -1) return [...ids];
  const insertionIndex = position === "after" ? targetIndex + 1 : targetIndex;
  return withoutDragged.toSpliced(insertionIndex, 0, draggedId);
}

function moveProjectCardId(
  ids: readonly string[],
  draggedId: string,
  targetId: string | null,
  position: ProjectCardDropPosition,
) {
  const withoutDragged = ids.filter((id) => id !== draggedId);
  if (targetId === null || position === "end") {
    return withoutDragged.toSpliced(withoutDragged.length, 0, draggedId);
  }
  if (draggedId === targetId) return [...ids];
  const targetIndex = withoutDragged.indexOf(targetId);
  if (targetIndex === -1) return [...ids];
  const insertionIndex = position === "after" ? targetIndex + 1 : targetIndex;
  return withoutDragged.toSpliced(insertionIndex, 0, draggedId);
}

function getProjectGroupDropPosition(
  event: DragEvent<HTMLElement>,
): ProjectGroupDropPosition {
  const rect = event.currentTarget.getBoundingClientRect();
  return event.clientY >= rect.top + rect.height / 2 ? "after" : "before";
}

function subscribeProjectGroupByPreference(onStoreChange: () => void) {
  function handleStorage(event: StorageEvent) {
    if (
      event.key === PROJECT_GROUP_BY_STORAGE_KEY ||
      event.key === PROJECT_GROUP_BY_LEGACY_STORAGE_KEY
    )
      onStoreChange();
  }
  window.addEventListener(PROJECT_GROUP_BY_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(PROJECT_GROUP_BY_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", handleStorage);
  };
}

const projectNameCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

function isDateSortField(field: ProjectSortField) {
  return field === "updated_at" || field === "created_at";
}

function defaultSortDirectionForField(
  field: ProjectSortField,
): ProjectSortDirection {
  return isDateSortField(field) ? "desc" : "asc";
}

function getProjectSortDirectionLabel(
  field: ProjectSortField,
  direction: ProjectSortDirection,
) {
  if (isDateSortField(field))
    return direction === "desc" ? "Newest first" : "Oldest first";
  return direction === "asc" ? "A to Z" : "Z to A";
}

function getProjectSortValue(
  item: ProjectListItem,
  field: ProjectSortField,
): string | number | null {
  const value = item.project[field];
  if (field === "updated_at" || field === "created_at") {
    const time =
      typeof value === "string" ? new Date(value).getTime() : Number.NaN;
    return Number.isFinite(time) ? time : null;
  }
  if (typeof value !== "string") return null;
  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

function compareProjectsByName(a: ProjectListItem, b: ProjectListItem) {
  return projectNameCollator.compare(
    a.project.name ?? "",
    b.project.name ?? "",
  );
}

function compareProjectsBySort(
  a: ProjectListItem,
  b: ProjectListItem,
  field: ProjectSortField,
  direction: ProjectSortDirection,
) {
  const aValue = getProjectSortValue(a, field);
  const bValue = getProjectSortValue(b, field);
  if (aValue === null && bValue === null) return compareProjectsByName(a, b);
  if (aValue === null) return 1;
  if (bValue === null) return -1;

  const order = direction === "asc" ? 1 : -1;
  const primary =
    typeof aValue === "number" && typeof bValue === "number"
      ? aValue - bValue
      : projectNameCollator.compare(String(aValue), String(bValue));
  if (primary !== 0) return primary * order;
  return compareProjectsByName(a, b);
}

function compareProjectsByDateOnly(
  a: ProjectListItem,
  b: ProjectListItem,
  field: ProjectSortField,
  direction: ProjectSortDirection,
) {
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
  const month = projectGroupMonthFormatter.format(date);
  return `${date.getFullYear()} · ${month}`;
}

function getProjectDateGroup(item: ProjectListItem, field: ProjectSortField) {
  const value = item.project[field];
  const date = typeof value === "string" ? new Date(value) : null;
  if (!date || !Number.isFinite(date.getTime())) {
    return {
      key: `${field}:undated`,
      label:
        field === "created_at"
          ? "Created date missing"
          : "Updated date missing",
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
  const clientName =
    typeof item.project.client_name === "string"
      ? item.project.client_name.trim()
      : "";
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

function getProjectGroup(item: ProjectListItem, field: ProjectScalarGroupBy) {
  if (field === "client_name") return getProjectClientGroup(item);
  return getProjectDateGroup(item, field);
}

function groupProjects(
  items: ProjectListItem[],
  field: ProjectScalarGroupBy,
): ProjectDateGroup[] {
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
  options: {
    isSearching: boolean;
    showUngroupedWhenEmpty?: boolean;
    optimisticOrderIdsByGroup?: Record<string, string[]>;
  },
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
    const groupItems = orderProjectItemsWithinUserGroup(
      byGroup.get(group.id) ?? [],
      options.optimisticOrderIdsByGroup?.[group.id],
    );
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
  if (ungrouped.length > 0 || options.showUngroupedWhenEmpty) {
    sections.push({
      key: UNGROUPED_GROUP_KEY,
      label: UNGROUPED_GROUP_LABEL,
      accentId: null,
      isVirtual: true,
      kind: "group",
      items: orderProjectItemsWithinUserGroup(
        ungrouped,
        options.optimisticOrderIdsByGroup?.[UNGROUPED_GROUP_KEY],
      ),
    });
  }

  return sections;
}

function isProjectSetupBlocking(
  status: ProjectCardSetupStatus | null | undefined,
) {
  return status?.state === "creating" || status?.state === "preparing";
}

function canSelectProjectForDeletion(item: ProjectListItem) {
  if (isProjectSetupBlocking(item.setupStatus)) return false;
  if (
    item.accessKind === "pending-invite" ||
    item.accessKind === "sheet-member"
  )
    return false;
  if (item.accessKind === "owned") return true;
  return item.currentUserRole === "owner" || item.currentUserRole === "admin";
}

// LD-2/D9 assignment-eligibility gate, INDEPENDENT of delete eligibility. The SSR
// repository already derived accessKind === "owned" using the LD-2 ownership predicate
// (workspace-role membership OR created_by === profileId, created_by-nullable-safe), so
// the client check is simply accessKind === "owned". Shared/invited rows are routed to
// the proposals/share surfaces before this Projects view renders. This intentionally does
// NOT consult the delete gate, so an owned project the delete flow would block (e.g. an
// active shared link) stays bulk-groupable.
function canAssignProjectToGroup(item: ProjectListItem) {
  return (
    item.accessKind === "owned" && !isProjectSetupBlocking(item.setupStatus)
  );
}

type ProjectCardRowProps = {
  item: ProjectListItem;
  viewMode: ProjectCardViewMode;
  googleMapsApiKey: string;
  canFavorite: boolean;
  isFavorite: boolean;
  favoriteBusy: boolean;
  selectedForDeletion: boolean;
  selectionActive: boolean;
  canSelect: boolean;
  setupStatus?: ProjectCardSetupStatus | null;
  setupNavigationDisabled?: boolean;
  statusBusy: boolean;
  onToggleSelected: (projectId: string) => void;
  onToggleFavorite: (projectId: string, nextFavorite: boolean) => void;
  onChangeProjectStatus: (projectId: string, status: ProjectStatus) => void;
  onExpand: (project: ProjectRow) => void;
  // Group-menu inputs are passed as PRIMITIVES so this row's memo can compare them by value.
  // The menu node is built inside the memo boundary, so an unrelated parent re-render (search
  // keystroke, another card's star) no longer creates a fresh `groupAssignMenu` for every card.
  showGroupMenu: boolean;
  projectGroups: ProjectGroupSummary[];
  effectiveGroupId: string | null;
  groupBusy: boolean;
  onAssignToGroup: (projectId: string, groupId: string | null) => void;
  canDragToGroup: boolean;
  onProjectDragStart: (
    projectId: string,
    event: DragEvent<HTMLButtonElement>,
  ) => void;
  onProjectDragEnd: () => void;
};

// Memoized list row. In group-organize mode the per-card "Move to group" menu used to be a
// fresh ReactNode prop on every parent render, defeating `memo(LiveProjectCard)` for ALL owned
// cards. Building it here from primitive inputs means only the card whose effective group /
// busy state actually changed re-renders (O(1) instead of O(N) per interaction).
const ProjectCardRow = memo(function ProjectCardRow({
  item,
  viewMode,
  googleMapsApiKey,
  canFavorite,
  isFavorite,
  favoriteBusy,
  selectedForDeletion,
  selectionActive,
  canSelect,
  setupStatus,
  setupNavigationDisabled,
  statusBusy,
  onToggleSelected,
  onToggleFavorite,
  onChangeProjectStatus,
  onExpand,
  showGroupMenu,
  projectGroups,
  effectiveGroupId,
  groupBusy,
  onAssignToGroup,
  canDragToGroup,
  onProjectDragStart,
  onProjectDragEnd,
}: ProjectCardRowProps) {
  const groupAssignMenu = useMemo<ReactNode>(() => {
    if (!showGroupMenu) return undefined;
    // LD-10: the current (effective, override-aware) group shows a trailing Check.
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
            aria-busy={groupBusy}
          >
            <FolderSimple size={13} weight="regular" aria-hidden="true" />
          </Button>
        }
      >
        {projectGroups.map((group) => (
          <DropdownMenu.Item
            key={group.id}
            label={group.name}
            selected={effectiveGroupId === group.id}
            onClick={() => onAssignToGroup(item.project.id, group.id)}
          />
        ))}
        <DropdownMenu.Item
          label="Ungrouped"
          selected={effectiveGroupId === null}
          onClick={() => onAssignToGroup(item.project.id, null)}
          disabled={effectiveGroupId === null}
        />
      </DropdownMenu>
    );
  }, [
    showGroupMenu,
    projectGroups,
    effectiveGroupId,
    groupBusy,
    item.project.id,
    item.project.name,
    onAssignToGroup,
  ]);
  const projectStatus = normalizeProjectStatus(item.project.status);
  const projectActionsMenu = useMemo<ReactNode>(() => {
    if (item.accessKind !== "owned") return undefined;
    return (
      <ShadcnDropdownMenu>
        <ShadcnDropdownMenuTrigger asChild>
          <ProjectCardDetailsControl
            className="workshop-project-card-control size-6 border-hairline relative z-20 text-ink"
            disabled={Boolean(setupNavigationDisabled)}
            projectName={item.project.name}
            ariaLabel={`Open actions for ${item.project.name}`}
          />
        </ShadcnDropdownMenuTrigger>
        <ShadcnDropdownMenuContent align="end" className="min-w-36">
          <ShadcnDropdownMenuItem onSelect={() => onExpand(item.project)}>
            Edit project
          </ShadcnDropdownMenuItem>
          <ShadcnDropdownMenuSub>
            <ShadcnDropdownMenuSubTrigger disabled={statusBusy}>
              Change status
            </ShadcnDropdownMenuSubTrigger>
            <ShadcnDropdownMenuSubContent className="min-w-32">
              {PROJECT_STATUS_VALUES.map((status) => (
                <ShadcnDropdownMenuItem
                  key={status}
                  selected={projectStatus === status}
                  disabled={statusBusy || projectStatus === status}
                  onSelect={() => onChangeProjectStatus(item.project.id, status)}
                >
                  {PROJECT_STATUS_LABELS[status]}
                </ShadcnDropdownMenuItem>
              ))}
            </ShadcnDropdownMenuSubContent>
          </ShadcnDropdownMenuSub>
        </ShadcnDropdownMenuContent>
      </ShadcnDropdownMenu>
    );
  }, [
    item.accessKind,
    item.project,
    onChangeProjectStatus,
    onExpand,
    projectStatus,
    setupNavigationDisabled,
    statusBusy,
  ]);

  return (
    <LiveProjectCard
      project={item.project}
      accessKind={item.accessKind}
      googleMapsApiKey={googleMapsApiKey}
      currentUserRole={item.currentUserRole}
      ownerWorkspaceName={item.ownerWorkspaceName}
      pendingInvite={item.pendingInvite}
      pendingInviteCount={item.pendingInviteCount}
      setupStatus={setupStatus}
      setupNavigationDisabled={setupNavigationDisabled}
      publicationSummary={item.publicationSummary}
      sharedEstimateCount={item.sharedEstimateCount}
      favoriteEstimateSheets={item.favoriteEstimateSheets}
      estimateSheets={item.estimateSheets}
      viewMode={viewMode}
      isFavorite={isFavorite}
      favoriteBusy={favoriteBusy}
      selectedForDeletion={selectedForDeletion}
      selectionActive={selectionActive}
      onToggleSelected={canSelect ? onToggleSelected : undefined}
      onToggleFavorite={canFavorite ? onToggleFavorite : undefined}
      onExpand={onExpand}
      canDragToGroup={canDragToGroup}
      onProjectDragStart={onProjectDragStart}
      onProjectDragEnd={onProjectDragEnd}
      groupAssignMenu={groupAssignMenu}
      projectActionsMenu={projectActionsMenu}
    />
  );
});

// react-doctor-disable-next-line react-doctor/no-giant-component -- Structural split tracked in .ai/03_plans/2026-06-23-react-doctor-warning-cleanup.md; broad refactor needs behavior tests.
export function ProjectsPageClient({
  projects,
  favoriteProjectIds = EMPTY_FAVORITE_PROJECT_IDS,
  favoritesScope,
  googleMapsApiKey = "",
  googleMapsMapId = null,
  projectGroups = EMPTY_PROJECT_GROUPS,
}: ProjectsPageClientProps) {
  const router = useNavigationRouter();
  const { toast } = useToast();
  const toggleProjectFavoriteMutation =
    useToggleProjectFavorite(favoritesScope);
  const serverProjectItems = useMemo(
    // react-doctor-disable-next-line react-doctor/no-event-handler -- False positive: pure server project normalization in render, not effect-driven event logic.
    () => projects.map(normalizeProjectListItem),
    [projects],
  );
  const [pageState, dispatchPageState] = useReducer(
    projectsPageClientReducer,
    undefined,
    createProjectsPageClientState,
  );
  const {
    isModalOpen,
    expandedProject,
    activeStatusTab,
    searchQuery,
    optimisticProjectCreates,
    optimisticProjectStatusOverrides,
    pendingStatusProjectId,
    favoriteOverrides,
    pendingFavoriteId,
    selectedProjectIds,
    sortField,
    sortDirection,
    sortTouched,
    optimisticGroupOrderIds,
    optimisticProjectGroups,
    optimisticProjectGroupOverrides,
    optimisticProjectOrderIdsByGroup,
    groupOverrides,
    pendingGroupProjectId,
    collapsedGroupKeys,
    deleteProjectTargetIds,
    deleteProjectPreview,
    deleteProjectError,
    deleteProjectState,
    bulkDeleteModalMounted,
  } = pageState;
  const pageStateSetters = useMemo(
    () => ({
      setIsModalOpen: (value: StateUpdater<boolean>) =>
        dispatchPageState({ type: "setIsModalOpen", value }),
      setExpandedProject: (value: StateUpdater<ProjectRow | null>) =>
        dispatchPageState({ type: "setExpandedProject", value }),
      setActiveStatusTab: (value: ProjectStatusTab) =>
        dispatchPageState({ type: "setActiveStatusTab", value }),
      setSearchQuery: (value: string) =>
        dispatchPageState({ type: "setSearchQuery", value }),
      setOptimisticProjectCreates: (
        value: StateUpdater<Record<string, NewProjectOptimisticSnapshot>>,
      ) => dispatchPageState({ type: "setOptimisticProjectCreates", value }),
      setOptimisticProjectStatusOverrides: (
        value: StateUpdater<Record<string, ProjectStatus>>,
      ) =>
        dispatchPageState({
          type: "setOptimisticProjectStatusOverrides",
          value,
        }),
      setPendingStatusProjectId: (value: string | null) =>
        dispatchPageState({ type: "setPendingStatusProjectId", value }),
      setFavoriteOverrides: (value: StateUpdater<Record<string, boolean>>) =>
        dispatchPageState({ type: "setFavoriteOverrides", value }),
      setPendingFavoriteId: (value: string | null) =>
        dispatchPageState({ type: "setPendingFavoriteId", value }),
      setSelectedProjectIds: (value: StateUpdater<Set<string>>) =>
        dispatchPageState({ type: "setSelectedProjectIds", value }),
      setSortField: (value: ProjectSortField) =>
        dispatchPageState({ type: "setSortField", value }),
      setSortDirection: (value: ProjectSortDirection) =>
        dispatchPageState({ type: "setSortDirection", value }),
      setSortTouched: (value: boolean) =>
        dispatchPageState({ type: "setSortTouched", value }),
      setOptimisticGroupOrderIds: (value: StateUpdater<string[] | null>) =>
        dispatchPageState({ type: "setOptimisticGroupOrderIds", value }),
      setOptimisticProjectGroups: (
        value: StateUpdater<ProjectGroupSummary[]>,
      ) => dispatchPageState({ type: "setOptimisticProjectGroups", value }),
      setOptimisticProjectGroupOverrides: (
        value: StateUpdater<Record<string, OptimisticProjectGroupOverride>>,
      ) =>
        dispatchPageState({
          type: "setOptimisticProjectGroupOverrides",
          value,
        }),
      setOptimisticProjectOrderIdsByGroup: (
        value: StateUpdater<Record<string, string[]>>,
      ) =>
        dispatchPageState({
          type: "setOptimisticProjectOrderIdsByGroup",
          value,
        }),
      setGroupOverrides: (value: StateUpdater<Record<string, string | null>>) =>
        dispatchPageState({ type: "setGroupOverrides", value }),
      setPendingGroupProjectId: (value: string | null) =>
        dispatchPageState({ type: "setPendingGroupProjectId", value }),
      setCollapsedGroupKeys: (value: StateUpdater<Set<string>>) =>
        dispatchPageState({ type: "setCollapsedGroupKeys", value }),
      setDeleteProjectTargetIds: (value: string[]) =>
        dispatchPageState({ type: "setDeleteProjectTargetIds", value }),
      setDeleteProjectPreview: (
        value: StateUpdater<BulkActionPreviewResult | null>,
      ) => dispatchPageState({ type: "setDeleteProjectPreview", value }),
      setDeleteProjectError: (value: string | null) =>
        dispatchPageState({ type: "setDeleteProjectError", value }),
      setDeleteProjectState: (value: ProjectDeleteState) =>
        dispatchPageState({ type: "setDeleteProjectState", value }),
      setBulkDeleteModalMounted: (value: boolean) =>
        dispatchPageState({ type: "setBulkDeleteModalMounted", value }),
    }),
    [],
  );
  const {
    setIsModalOpen,
    setExpandedProject,
    setActiveStatusTab,
    setSearchQuery,
    setOptimisticProjectCreates,
    setOptimisticProjectStatusOverrides,
    setPendingStatusProjectId,
    setFavoriteOverrides,
    setPendingFavoriteId,
    setSelectedProjectIds,
    setSortField,
    setSortDirection,
    setSortTouched,
    setOptimisticGroupOrderIds,
    setOptimisticProjectGroups,
    setOptimisticProjectGroupOverrides,
    setOptimisticProjectOrderIdsByGroup,
    setGroupOverrides,
    setPendingGroupProjectId,
    setCollapsedGroupKeys,
    setDeleteProjectTargetIds,
    setDeleteProjectPreview,
    setDeleteProjectError,
    setDeleteProjectState,
    setBulkDeleteModalMounted,
  } = pageStateSetters;
  const optimisticProjectItems = useMemo(
    () =>
      Object.values(optimisticProjectCreates).map(
        optimisticProjectSnapshotToListItem,
      ),
    [optimisticProjectCreates],
  );
  const optimisticProjectItemIds = useMemo(
    () => new Set(optimisticProjectItems.map((item) => item.project.id)),
    [optimisticProjectItems],
  );
  const optimisticRealProjectIds = useMemo(
    () =>
      new Set(
        filterMapBy(
          optimisticProjectItems,
          (item) => !item.project.id.startsWith("pending-project-"),
          (item) => item.project.id,
        ),
      ),
    [optimisticProjectItems],
  );
  const projectItems = useMemo(() => {
    const items = [
      ...optimisticProjectItems,
      ...serverProjectItems.filter(
        (item) => !optimisticRealProjectIds.has(item.project.id),
      ),
    ];
    if (Object.keys(optimisticProjectStatusOverrides).length === 0) {
      return items;
    }
    return items.map((item) => {
      const status = optimisticProjectStatusOverrides[item.project.id];
      if (!status || normalizeProjectStatus(item.project.status) === status) {
        return item;
      }
      return {
        ...item,
        project: {
          ...item.project,
          status,
        },
      };
    });
  }, [
    optimisticProjectItems,
    optimisticProjectStatusOverrides,
    optimisticRealProjectIds,
    serverProjectItems,
  ]);
  const ownedProjectItems = useMemo(
    () => projectItems.filter((item) => item.accessKind === "owned"),
    [projectItems],
  );
  useEffect(() => {
    if (Object.keys(optimisticProjectStatusOverrides).length === 0) return;
    const serverStatusById = new Map(
      serverProjectItems.map((item) => [
        item.project.id,
        normalizeProjectStatus(item.project.status),
      ]),
    );
    setOptimisticProjectStatusOverrides((current) => {
      let changed = false;
      const next = { ...current };
      for (const [projectId, status] of Object.entries(current)) {
        const serverStatus = serverStatusById.get(projectId);
        if (!serverStatus || serverStatus === status) {
          delete next[projectId];
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [
    optimisticProjectStatusOverrides,
    serverProjectItems,
    setOptimisticProjectStatusOverrides,
  ]);
  const projectClientOptions = useMemo(
    () =>
      createProjectClientOptions(
        ownedProjectItems.map((item) => item.project.client_name ?? ""),
      ).map((option) => option.label),
    [ownedProjectItems],
  );
  const projectViewMode = useSyncExternalStore(
    subscribeProjectViewModePreference,
    readProjectViewModePreference,
    getProjectViewModeServerSnapshot,
  );
  const groupByDefault: ProjectGroupBy = "none";
  const storedGroupBy = useSyncExternalStore(
    subscribeProjectGroupByPreference,
    () => readProjectGroupByPreference(groupByDefault),
    () => groupByDefault,
  );
  const groupBy = storedGroupBy;
  // Task 6 (LD-6): the override map is keyed by groupId (string | null), not a boolean.
  // Effective group for a project = groupOverrides[id] if the key is present, else
  // item.groupId ?? null. The override is set immediately on assign and cleared ONLY by
  // the reconciliation effect once the transition settles AND SSR is authoritative —
  // never inside a non-awaitable router.refresh().then().
  // Defer the BulkDestructivePreviewModal chunk until the first delete is initiated, then keep
  // it mounted so its open/close animation stays intact (re-opens are instant — chunk cached).
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
  const [draggingProjectGroupId, setDraggingProjectGroupId] = useState<
    string | null
  >(null);
  const [groupDropTarget, setGroupDropTarget] = useState<{
    targetId: string;
    position: ProjectGroupDropPosition;
  } | null>(null);
  const groupReorderPersistenceFrameRef = useRef<number | null>(null);
  const [draggingProjectCardId, setDraggingProjectCardId] = useState<
    string | null
  >(null);
  // Keep the active drag id in a ref so dragover can resolve the source even
  // before the deferred React state commit (custom MIME getData is blank mid-drag).
  const draggingProjectCardIdRef = useRef<string | null>(null);
  const projectCardDragUiFrameRef = useRef<number | null>(null);
  const [projectCardDropTarget, setProjectCardDropTarget] =
    useState<ProjectCardDropTarget | null>(null);

  const visibleProjectGroups = useMemo(
    () =>
      getVisibleProjectGroups(
        // react-doctor-disable-next-line react-doctor/no-event-handler -- False positive: pure visible group derivation in render memo, not effect-driven event logic.
        projectGroups,
        optimisticProjectGroups,
        optimisticProjectGroupOverrides,
      ),
    [projectGroups, optimisticProjectGroups, optimisticProjectGroupOverrides],
  );
  const orderedProjectGroups = useMemo(
    () => orderProjectGroups(visibleProjectGroups, optimisticGroupOrderIds),
    [visibleProjectGroups, optimisticGroupOrderIds],
  );
  const assignableProjectGroups = useMemo(
    () =>
      orderedProjectGroups.filter(
        (group) => !isOptimisticProjectGroupId(group.id),
      ),
    [orderedProjectGroups],
  );

  useEffect(() => {
    const serverIds = new Set(projectGroups.map((group) => group.id));
    if (serverIds.size === 0) return;
    setOptimisticProjectGroups((current) => {
      if (current.length === 0) return current;
      const next = current.filter((group) => !serverIds.has(group.id));
      return next.length === current.length ? current : next;
    });
  }, [projectGroups, setOptimisticProjectGroups]);

  useEffect(() => {
    setOptimisticProjectGroupOverrides((current) => {
      let changed = false;
      const next = { ...current };
      for (const group of projectGroups) {
        const override = next[group.id];
        if (!override) continue;
        const updatedOverride = { ...override };
        if (hasOwn(updatedOverride, "name") && updatedOverride.name === group.name) {
          delete updatedOverride.name;
          changed = true;
        }
        if (
          hasOwn(updatedOverride, "accentId") &&
          updatedOverride.accentId === group.accentId
        ) {
          delete updatedOverride.accentId;
          changed = true;
        }
        if (hasOptimisticProjectGroupOverride(updatedOverride)) {
          next[group.id] = updatedOverride;
        } else {
          delete next[group.id];
        }
      }
      return changed ? next : current;
    });
  }, [projectGroups, setOptimisticProjectGroupOverrides]);

  useEffect(() => {
    if (!optimisticGroupOrderIds) return;
    const serverIds = projectGroups.map((group) => group.id);
    if (areStringArraysEqual(optimisticGroupOrderIds, serverIds)) {
      setOptimisticGroupOrderIds(null);
      return;
    }
    if (haveSameStringSet(optimisticGroupOrderIds, serverIds)) return;
    const serverIdSet = new Set(serverIds);
    const reconciledIds = [
      ...optimisticGroupOrderIds.filter((id) => serverIdSet.has(id)),
      ...serverIds.filter((id) => !optimisticGroupOrderIds.includes(id)),
    ];
    setOptimisticGroupOrderIds(
      areStringArraysEqual(reconciledIds, serverIds) ? null : reconciledIds,
    );
  }, [optimisticGroupOrderIds, projectGroups, setOptimisticGroupOrderIds]);

  useEffect(
    () => () => {
      const frameId = groupReorderPersistenceFrameRef.current;
      if (
        frameId !== null &&
        typeof window !== "undefined" &&
        typeof window.cancelAnimationFrame === "function"
      ) {
        window.cancelAnimationFrame(frameId);
      }
    },
    [],
  );

  const favoriteIds = useMemo(() => {
    const ids = new Set(favoriteProjectIds);
    for (const [projectId, favorite] of Object.entries(favoriteOverrides)) {
      if (favorite) ids.add(projectId);
      else ids.delete(projectId);
    }
    return ids;
  }, [favoriteProjectIds, favoriteOverrides]);

  // Perf: filter against a deferred copy of the query so each keystroke no longer blocks a
  // full re-filter + re-sort of every card; the input stays bound to `searchQuery`.
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const normalizedSearchQuery = searchQuery.trim();
  const normalizedDeferredSearchQuery = deferredSearchQuery.trim();
  const projectStatusTabs = useMemo<TabItem[]>(
    () =>
      PROJECT_STATUS_TAB_IDS.map((id) => ({
        id,
        label: getProjectStatusTabLabel(id),
      })),
    [],
  );
  const statusFilteredProjectItems = useMemo(
    () =>
      activeStatusTab === "all"
        ? ownedProjectItems
        : ownedProjectItems.filter(
            (item) =>
              normalizeProjectStatus(item.project.status) === activeStatusTab,
          ),
    [activeStatusTab, ownedProjectItems],
  );

  // Identity-stable handlers so memoized project cards can skip re-render when only an
  // unrelated parent state slice changes (the wrappers always invoke the latest closure).
  const stableToggleProjectFavorite = useStableCallback(toggleProjectFavorite);
  const stableToggleProjectSelection = useStableCallback(
    toggleProjectSelection,
  );
  const stableChangeProjectStatus = useStableCallback(changeProjectStatus);
  const stableAssignProjectToGroup = useStableCallback(assignProjectToGroup);
  const stableProjectCardDragStart = useStableCallback(handleProjectCardDragStart);
  const stableProjectCardDragEnd = useStableCallback(handleProjectCardDragEnd);

  const displayProjects = useMemo(() => {
    const query = normalizedDeferredSearchQuery.toLowerCase();
    const searchedProjects = !query
      ? statusFilteredProjectItems
      : statusFilteredProjectItems.filter(
          (item) =>
            optimisticProjectItemIds.has(item.project.id) ||
            item.project.name?.toLowerCase().includes(query) ||
            item.project.client_name?.toLowerCase().includes(query) ||
            item.project.project_code?.toLowerCase().includes(query) ||
            item.project.location?.toLowerCase().includes(query) ||
            getProjectSearchMetadata(item).includes(query),
        );
    if (!sortTouched && isDateSortField(sortField)) {
      return searchedProjects.toSorted((a, b) =>
        compareProjectsByDateOnly(a, b, sortField, sortDirection),
      );
    }
    if (!sortTouched) return searchedProjects;
    return searchedProjects.toSorted((a, b) =>
      compareProjectsBySort(a, b, sortField, sortDirection),
    );
  }, [
    normalizedDeferredSearchQuery,
    optimisticProjectItemIds,
    sortDirection,
    sortField,
    sortTouched,
    statusFilteredProjectItems,
  ]);

  const displayLiveProjects = displayProjects;
  const projectLayoutClassName = getProjectGridClassName(projectViewMode);
  const projectDateFlagLayoutClassName =
    getProjectDateFlagLayoutClassName(projectViewMode);
  const scalarGroupBy: ProjectScalarGroupBy | null =
    groupBy !== "none" && groupBy !== "group" ? groupBy : null;
  // D4 decouple: grouping is its own axis, not a hidden side effect of the sort field.
  // The sort controls order cards; the group control chooses section boundaries.
  const shouldGroupProjects =
    scalarGroupBy !== null && displayLiveProjects.length > 0;
  const groupedLiveProjects = useMemo(
    () =>
      shouldGroupProjects && scalarGroupBy
        ? groupProjects(displayLiveProjects, scalarGroupBy)
        : [],
    [displayLiveProjects, scalarGroupBy, shouldGroupProjects],
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

  useEffect(() => {
    setOptimisticProjectOrderIdsByGroup((current) => {
      const groupKeys = Object.keys(current);
      if (groupKeys.length === 0) return current;

      const itemsWithOverrides = projectItems.map((item) => {
        const override = groupOverrides[item.project.id];
        if (override === undefined) return item;
        return { ...item, groupId: override };
      });
      const serverSections = groupProjectsByUserGroup(
        itemsWithOverrides,
        orderedProjectGroups,
        { isSearching: false },
      );
      const serverIdsByGroup = new Map(
        serverSections.map((section) => [
          section.key,
          section.items.map((item) => item.project.id),
        ]),
      );

      let changed = false;
      const next = { ...current };
      for (const groupKey of groupKeys) {
        const serverIds = serverIdsByGroup.get(groupKey) ?? [];
        if (areStringArraysEqual(current[groupKey] ?? [], serverIds)) {
          delete next[groupKey];
          changed = true;
          continue;
        }
        if (haveSameStringSet(current[groupKey] ?? [], serverIds)) continue;
        const currentIds = current[groupKey] ?? [];
        const serverIdSet = new Set(serverIds);
        const currentIdSet = new Set(currentIds);
        next[groupKey] = [
          ...currentIds.filter((id) => serverIdSet.has(id)),
          ...serverIds.filter((id) => !currentIdSet.has(id)),
        ];
        changed = true;
      }
      return changed ? next : current;
    });
  }, [
    groupOverrides,
    orderedProjectGroups,
    projectItems,
    setOptimisticProjectOrderIdsByGroup,
  ]);

  const isSearching = normalizedSearchQuery.length > 0;
  const hasNoSearchResults =
    isSearching &&
    normalizedDeferredSearchQuery.length > 0 &&
    displayLiveProjects.length === 0;
  const hasNoStatusResults =
    !isSearching &&
    activeStatusTab !== "all" &&
    displayLiveProjects.length === 0;
  const hasProjectEmptyState = hasNoSearchResults || hasNoStatusResults;
  const emptySearchQuery =
    normalizedDeferredSearchQuery || normalizedSearchQuery;
  const groupedByUserGroup = useMemo(
    () =>
      groupBy === "group"
        ? groupProjectsByUserGroup(groupItemsWithOverrides, orderedProjectGroups, {
            isSearching,
            showUngroupedWhenEmpty: draggingProjectCardId !== null,
            optimisticOrderIdsByGroup: optimisticProjectOrderIdsByGroup,
          })
        : [],
    [
      groupBy,
      groupItemsWithOverrides,
      orderedProjectGroups,
      optimisticProjectOrderIdsByGroup,
      isSearching,
      draggingProjectCardId,
    ],
  );
  const isUserGroupOrganize = groupBy === "group";
  const activeGroupedProjectSectionKeys = useMemo(() => {
    if (hasProjectEmptyState) return [];
    if (isUserGroupOrganize)
      return groupedByUserGroup.map((group) => group.key);
    if (shouldGroupProjects)
      return groupedLiveProjects.map((group) => group.key);
    return [];
  }, [
    groupedByUserGroup,
    groupedLiveProjects,
    hasProjectEmptyState,
    isUserGroupOrganize,
    shouldGroupProjects,
  ]);
  const hasGroupedProjectSections = activeGroupedProjectSectionKeys.length > 0;
  const selectableDisplayProjectIds = useMemo(
    () =>
      filterMapBy(
        displayLiveProjects,
        canSelectProjectForDeletion,
        (item) => item.project.id,
      ),
    [displayLiveProjects],
  );
  const selectedVisibleProjectIds = useMemo(
    () =>
      selectableDisplayProjectIds.filter((id) => selectedProjectIds.has(id)),
    [selectableDisplayProjectIds, selectedProjectIds],
  );
  // LD-5: the assignment selection is its OWN source, gated on canAssignProjectToGroup
  // (LD-2 ownership: accessKind === "owned"), NOT the delete-gated canSelectProjectForDeletion.
  // So an owned project blocked from DELETE by an active shared link is still bulk-groupable.
  // Reads the SAME selectedProjectIds set as delete, but filters it differently — the two
  // selected-sets diverging off one shared selection is the realized D9 gate.
  const selectableForAssignmentProjectIds = useMemo(
    () =>
      filterMapBy(
        displayLiveProjects,
        canAssignProjectToGroup,
        (item) => item.project.id,
      ),
    [displayLiveProjects],
  );
  const selectedAssignableProjectIds = useMemo(
    () =>
      selectableForAssignmentProjectIds.filter((id) =>
        selectedProjectIds.has(id),
      ),
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
    dispatchPageState({
      type: "setGroupOverrides",
      value: (current) => {
        const keys = Object.keys(current);
        if (keys.length === 0) return current;
        const ssrGroupById = new Map(
          projectItems.map((entry) => [
            entry.project.id,
            entry.groupId ?? null,
          ]),
        );
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
      },
    });
  }, [isGroupAssignPending, projectItems]);
  const expandedProjectItem = useMemo(
    () =>
      expandedProject
        ? (projectItems.find(
            (item) => item.project.id === expandedProject.id,
          ) ?? null)
        : null,
    [expandedProject, projectItems],
  );

  useEffect(() => {
    const serverProjectIds = new Set(
      serverProjectItems.map((item) => item.project.id),
    );
    // Intentional setState-in-effect: optimistic create rows can only be retired when
    // refreshed server props prove the project row is present. router.refresh() is
    // non-awaitable, and clearing earlier would recreate the observed empty-list lag.
    dispatchPageState({
      type: "setOptimisticProjectCreates",
      value: (current) => {
        const entries = Object.entries(current);
        if (entries.length === 0) return current;
        let changed = false;
        const next = { ...current };
        for (const [clientId, snapshot] of entries) {
          if (
            !snapshot.project.id.startsWith("pending-project-") &&
            serverProjectIds.has(snapshot.project.id)
          ) {
            delete next[clientId];
            changed = true;
          }
        }
        return changed ? next : current;
      },
    });
  }, [serverProjectItems]);

  const canDeleteExpandedProject = expandedProjectItem
    ? canSelectProjectForDeletion(expandedProjectItem)
    : false;
  const deleteProjectPhrase =
    deleteProjectTargetIds.length === 1
      ? "DELETE PROJECT"
      : `DELETE ${deleteProjectTargetIds.length} PROJECTS`;
  const deleteProjectModalTitle =
    deleteProjectTargetIds.length === 1
      ? "Delete project"
      : `Delete ${deleteProjectTargetIds.length} projects`;
  const deleteProjectDescription =
    deleteProjectTargetIds.length === 1
      ? "This permanently deletes the project, its estimates, and project data. Active shared links will be revoked."
      : "This permanently deletes the selected projects, their estimates, and project data. Active shared links will be revoked upon deletion.";

  const projectToolbarActions: HeaderIconToolbarAddAction[] = [
    {
      id: "add-group",
      label: "Add group",
      icon: <FolderPlus size={12} weight="regular" aria-hidden="true" />,
      onClick: handleCreateDefaultGroup,
      disabled: visibleProjectGroups.length >= MAX_PROJECT_GROUPS,
      className: ADD_BUTTON_CLASSNAME,
    },
    {
      label: "Add projects",
      icon: <Cards size={12} weight="regular" aria-hidden="true" />,
      onClick: () => dispatchPageState({ type: "setIsModalOpen", value: true }),
      className: ADD_BUTTON_CLASSNAME,
    },
  ];
  const sortDirectionOptions = useMemo<DropdownSelectOption[]>(
    () => [
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
    ],
    [sortField],
  );
  function handleSortFieldChange(nextValue: string) {
    if (
      !PROJECT_SORT_FIELD_OPTIONS.some((option) => option.value === nextValue)
    )
      return;
    const nextField = nextValue as ProjectSortField;
    setSortField(nextField);
    setSortDirection(defaultSortDirectionForField(nextField));
    setSortTouched(true);
  }

  function handleSortDirectionChange(nextDirection: string) {
    setSortDirection(nextDirection as ProjectSortDirection);
    setSortTouched(true);
  }

  function handleOptimisticProjectChange(
    snapshot: NewProjectOptimisticSnapshot,
  ) {
    if (snapshot.remove) {
      setOptimisticProjectCreates((current) => {
        if (!Object.prototype.hasOwnProperty.call(current, snapshot.clientId))
          return current;
        const next = { ...current };
        delete next[snapshot.clientId];
        return next;
      });
      if (snapshot.errorMessage)
        toast({ message: snapshot.errorMessage, tone: "error" });
      return;
    }
    if (snapshot.errorMessage)
      toast({ message: snapshot.errorMessage, tone: "error" });
    setOptimisticProjectCreates((current) => ({
      ...current,
      [snapshot.clientId]: snapshot,
    }));
  }

  function toggleGroupCollapsed(key: string) {
    setCollapsedGroupKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function expandAllProjectGroups() {
    setCollapsedGroupKeys(new Set());
  }

  function collapseAllProjectGroups() {
    setCollapsedGroupKeys(new Set(activeGroupedProjectSectionKeys));
  }

  function handleCreateGroup(name: string, accentId: GroupAccentId | null) {
    if (visibleProjectGroups.length >= MAX_PROJECT_GROUPS) return;
    const optimisticId = createOptimisticProjectGroupId();
    const optimisticGroup: ProjectGroupSummary = {
      id: optimisticId,
      name,
      accentId,
      position: visibleProjectGroups.length,
    };
    setOptimisticProjectGroups((current) => [...current, optimisticGroup]);
    startTransition(() => {
      void createProjectGroup({ name, accentId })
        .then((result) => {
          setOptimisticProjectGroups((current) =>
            current.map((group) =>
              group.id === optimisticId ? { ...group, id: result.id } : group,
            ),
          );
          setOptimisticGroupOrderIds((current) =>
            current
              ? current.map((id) => (id === optimisticId ? result.id : id))
              : current,
          );
          router.refresh();
        })
        .catch(() => {
          setOptimisticProjectGroups((current) =>
            current.filter((group) => group.id !== optimisticId),
          );
          setOptimisticGroupOrderIds((current) =>
            current ? current.filter((id) => id !== optimisticId) : current,
          );
          toast({ message: "Could not create the group.", tone: "error" });
        });
    });
  }
  function handleCreateDefaultGroup() {
    writeProjectGroupByPreference("group");
    handleCreateGroup(getNextDefaultProjectGroupName(visibleProjectGroups), null);
  }
  function handleRenameGroup(groupId: string, name: string) {
    const nextName = name.trim();
    const group = visibleProjectGroups.find((entry) => entry.id === groupId);
    if (!group || nextName.length === 0 || nextName === group.name) return;
    const previousOverride = optimisticProjectGroupOverrides[groupId];
    const hadNameOverride = previousOverride
      ? hasOwn(previousOverride, "name")
      : false;
    const previousNameOverride = previousOverride?.name;
    setOptimisticProjectGroupOverrides((current) => ({
      ...current,
      [groupId]: {
        ...current[groupId],
        name: nextName,
      },
    }));
    startTransition(() => {
      void renameProjectGroup({ groupId, name: nextName })
        .then(() => router.refresh())
        .catch(() => {
          setOptimisticProjectGroupOverrides((current) => {
            const currentOverride = current[groupId];
            if (!currentOverride || currentOverride.name !== nextName) {
              return current;
            }
            const nextGroupOverride = { ...currentOverride };
            if (hadNameOverride && previousNameOverride !== undefined) {
              nextGroupOverride.name = previousNameOverride;
            } else {
              delete nextGroupOverride.name;
            }
            const next = { ...current };
            if (hasOptimisticProjectGroupOverride(nextGroupOverride)) {
              next[groupId] = nextGroupOverride;
            } else {
              delete next[groupId];
            }
            return next;
          });
          toast({
            message: "Could not rename the group.",
            tone: "error",
          });
        });
    });
  }
  function handleRecolorGroup(groupId: string, accentId: GroupAccentId | null) {
    const group = visibleProjectGroups.find((entry) => entry.id === groupId);
    if (!group || group.accentId === accentId) return;
    const previousOverride = optimisticProjectGroupOverrides[groupId];
    const hadAccentOverride = previousOverride
      ? hasOwn(previousOverride, "accentId")
      : false;
    const previousAccentOverride = previousOverride?.accentId;
    setOptimisticProjectGroupOverrides((current) => ({
      ...current,
      [groupId]: {
        ...current[groupId],
        accentId,
      },
    }));
    startTransition(() => {
      void recolorProjectGroup({ groupId, accentId })
        .then(() => router.refresh())
        .catch(() => {
          setOptimisticProjectGroupOverrides((current) => {
            const currentOverride = current[groupId];
            if (
              !currentOverride ||
              !hasOwn(currentOverride, "accentId") ||
              currentOverride.accentId !== accentId
            ) {
              return current;
            }
            const nextGroupOverride = { ...currentOverride };
            if (hadAccentOverride) {
              nextGroupOverride.accentId = previousAccentOverride ?? null;
            } else {
              delete nextGroupOverride.accentId;
            }
            const next = { ...current };
            if (hasOptimisticProjectGroupOverride(nextGroupOverride)) {
              next[groupId] = nextGroupOverride;
            } else {
              delete next[groupId];
            }
            return next;
          });
          toast({
            message: "Could not update the group color.",
            tone: "error",
          });
        });
    });
  }
  function handleDeleteGroup(groupId: string) {
    startTransition(() => {
      void deleteProjectGroup({ groupId })
        .then(() => router.refresh())
        .catch(() =>
          toast({ message: "Could not delete the group.", tone: "error" }),
        );
    });
  }

  function handleGroupReorderDragStart(
    groupId: string,
    event: DragEvent<HTMLElement>,
  ) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", groupId);
    event.dataTransfer.setData(PROJECT_GROUP_DRAG_MIME_TYPE, groupId);
    setDraggingProjectGroupId(groupId);
    setGroupDropTarget(null);
  }

  function readDraggedProjectGroupId(event: DragEvent<HTMLElement>) {
    return (
      draggingProjectGroupId ||
      event.dataTransfer.getData(PROJECT_GROUP_DRAG_MIME_TYPE)
    );
  }

  function handleGroupReorderDragOver(
    targetId: string,
    event: DragEvent<HTMLElement>,
  ) {
    const draggedId = readDraggedProjectGroupId(event);
    if (!draggedId || draggedId === targetId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const position = getProjectGroupDropPosition(event);
    setGroupDropTarget((current) =>
      current?.targetId === targetId && current.position === position
        ? current
        : { targetId, position },
    );
  }

  function handleGroupReorderDrop(
    targetId: string,
    event: DragEvent<HTMLElement>,
  ) {
    const draggedId = readDraggedProjectGroupId(event);
    if (!draggedId || draggedId === targetId) {
      setDraggingProjectGroupId(null);
      setGroupDropTarget(null);
      return;
    }
    event.preventDefault();
    const position = getProjectGroupDropPosition(event);
    const previousOrderIds: string[] = [];
    for (const group of orderedProjectGroups) {
      if (!isOptimisticProjectGroupId(group.id)) {
        previousOrderIds.push(group.id);
      }
    }
    const nextOrderIds = moveProjectGroupId(
      previousOrderIds,
      draggedId,
      targetId,
      position,
    );
    if (areStringArraysEqual(previousOrderIds, nextOrderIds)) {
      setDraggingProjectGroupId(null);
      setGroupDropTarget(null);
      return;
    }

    flushSync(() => {
      setDraggingProjectGroupId(null);
      setGroupDropTarget(null);
      setOptimisticGroupOrderIds(nextOrderIds);
    });
    const persistGroupOrder = () => {
      groupReorderPersistenceFrameRef.current = null;
      startTransition(() => {
        void reorderProjectGroups({ orderedGroupIds: nextOrderIds })
          .then(() => router.refresh())
          .catch(() => {
            setOptimisticGroupOrderIds(previousOrderIds);
            toast({
              message: "Could not reorder the groups.",
              tone: "error",
            });
          });
      });
    };
    const pendingFrameId = groupReorderPersistenceFrameRef.current;
    if (
      pendingFrameId !== null &&
      typeof window !== "undefined" &&
      typeof window.cancelAnimationFrame === "function"
    ) {
      window.cancelAnimationFrame(pendingFrameId);
    }
    if (
      typeof window !== "undefined" &&
      typeof window.requestAnimationFrame === "function"
    ) {
      groupReorderPersistenceFrameRef.current =
        window.requestAnimationFrame(persistGroupOrder);
      return;
    }
    persistGroupOrder();
  }

  function handleGroupReorderDragEnd() {
    setDraggingProjectGroupId(null);
    setGroupDropTarget(null);
  }

  function handleProjectCardDragStart(
    projectId: string,
    event: DragEvent<HTMLButtonElement>,
  ) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", projectId);
    event.dataTransfer.setData(PROJECT_CARD_DRAG_MIME_TYPE, projectId);
    // Publish the drag id synchronously for dragover, but defer React UI state.
    // A setState commit inside dragstart mutates drop-section DOM and cancels
    // native HTML5 drag in Chromium (~tens of ms after dragstart).
    draggingProjectCardIdRef.current = projectId;
    setProjectCardDropTarget(null);
    setGroupDropTarget(null);
    if (projectCardDragUiFrameRef.current !== null) {
      window.cancelAnimationFrame(projectCardDragUiFrameRef.current);
      projectCardDragUiFrameRef.current = null;
    }
    projectCardDragUiFrameRef.current = window.requestAnimationFrame(() => {
      projectCardDragUiFrameRef.current = null;
      setDraggingProjectCardId(projectId);
    });
  }

  function readDraggedProjectCardId(event: DragEvent<HTMLElement>) {
    return (
      draggingProjectCardIdRef.current ||
      draggingProjectCardId ||
      event.dataTransfer.getData(PROJECT_CARD_DRAG_MIME_TYPE) ||
      event.dataTransfer.getData("text/plain") ||
      null
    );
  }

  function getEffectiveProjectGroupId(projectId: string) {
    const item = projectItems.find((entry) => entry.project.id === projectId);
    if (!item) return undefined;
    const override = groupOverrides[projectId];
    return override !== undefined ? override : (item.groupId ?? null);
  }

  function getEffectiveProjectGroupKey(projectId: string) {
    const groupId = getEffectiveProjectGroupId(projectId);
    if (groupId === undefined) return undefined;
    return groupId ?? UNGROUPED_GROUP_KEY;
  }

  function canUseProjectCardDrag(projectId: string) {
    const item = projectItems.find((entry) => entry.project.id === projectId);
    return Boolean(item && canAssignProjectToGroup(item));
  }

  function canDropProjectCardOnGroup(projectId: string, groupKey: string) {
    if (groupKey !== UNGROUPED_GROUP_KEY && isOptimisticProjectGroupId(groupKey)) {
      return false;
    }
    if (!canUseProjectCardDrag(projectId)) return false;
    return getEffectiveProjectGroupId(projectId) !== getProjectDropGroupId(groupKey);
  }

  function getProjectGroupItems(groupKey: string) {
    return groupedByUserGroup.find((group) => group.key === groupKey)?.items ?? [];
  }

  function canReorderProjectCardInGroup(
    projectId: string,
    groupKey: string,
    targetProjectId: string | null,
    position: ProjectCardDropPosition,
  ) {
    if (isSearching) return false;
    if (groupKey === UNGROUPED_GROUP_KEY || isOptimisticProjectGroupId(groupKey)) return false;
    if (!canUseProjectCardDrag(projectId)) return false;
    if (getEffectiveProjectGroupKey(projectId) !== groupKey) return false;
    if (targetProjectId && getEffectiveProjectGroupKey(targetProjectId) !== groupKey) return false;
    const ids = getProjectGroupItems(groupKey).map((item) => item.project.id);
    if (ids.length < 2 || !ids.includes(projectId)) return false;
    if (targetProjectId === projectId) return false;
    const nextIds = moveProjectCardId(ids, projectId, targetProjectId, position);
    return !areStringArraysEqual(ids, nextIds);
  }

  function canDropProjectCardAtGroupEnd(projectId: string, groupKey: string) {
    if (canDropProjectCardOnGroup(projectId, groupKey)) return true;
    return canReorderProjectCardInGroup(projectId, groupKey, null, "end");
  }

  function handleProjectCardDragOver(
    groupKey: string,
    event: DragEvent<HTMLElement>,
  ) {
    const projectId = readDraggedProjectCardId(event);
    if (!projectId || !canDropProjectCardAtGroupEnd(projectId, groupKey)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setProjectCardDropTarget((current) =>
      current?.groupKey === groupKey && current.position === "end"
        ? current
        : { groupKey, projectId: null, position: "end" },
    );
  }

  function handleProjectCardDrop(
    groupKey: string,
    event: DragEvent<HTMLElement>,
  ) {
    const projectId = readDraggedProjectCardId(event);
    draggingProjectCardIdRef.current = null;
    if (projectCardDragUiFrameRef.current !== null) {
      window.cancelAnimationFrame(projectCardDragUiFrameRef.current);
      projectCardDragUiFrameRef.current = null;
    }
    setDraggingProjectCardId(null);
    setProjectCardDropTarget(null);
    if (!projectId || !canDropProjectCardAtGroupEnd(projectId, groupKey)) return;
    event.preventDefault();
    if (canDropProjectCardOnGroup(projectId, groupKey)) {
      assignProjectToGroup(projectId, getProjectDropGroupId(groupKey));
      return;
    }
    reorderProjectCardInGroup(projectId, groupKey, null, "end");
  }

  function handleProjectCardSlotDragOver(
    groupKey: string,
    targetProjectId: string,
    event: DragEvent<HTMLElement>,
  ) {
    const projectId = readDraggedProjectCardId(event);
    const position = getProjectGroupDropPosition(event);
    if (
      !projectId ||
      !canReorderProjectCardInGroup(projectId, groupKey, targetProjectId, position)
    ) {
      if (projectId && getEffectiveProjectGroupKey(projectId) === groupKey) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    setProjectCardDropTarget((current) =>
      current?.groupKey === groupKey &&
      current.projectId === targetProjectId &&
      current.position === position
        ? current
        : { groupKey, projectId: targetProjectId, position },
    );
  }

  function handleProjectCardSlotDrop(
    groupKey: string,
    targetProjectId: string,
    event: DragEvent<HTMLElement>,
  ) {
    const projectId = readDraggedProjectCardId(event);
    const position = getProjectGroupDropPosition(event);
    draggingProjectCardIdRef.current = null;
    if (projectCardDragUiFrameRef.current !== null) {
      window.cancelAnimationFrame(projectCardDragUiFrameRef.current);
      projectCardDragUiFrameRef.current = null;
    }
    setDraggingProjectCardId(null);
    setProjectCardDropTarget(null);
    if (
      !projectId ||
      !canReorderProjectCardInGroup(projectId, groupKey, targetProjectId, position)
    ) {
      if (projectId && getEffectiveProjectGroupKey(projectId) === groupKey) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    reorderProjectCardInGroup(projectId, groupKey, targetProjectId, position);
  }

  function handleProjectCardDragLeave(
    groupKey: string,
    event: DragEvent<HTMLElement>,
  ) {
    const relatedTarget = event.relatedTarget;
    if (
      relatedTarget instanceof Node &&
      event.currentTarget.contains(relatedTarget)
    ) {
      return;
    }
    setProjectCardDropTarget((current) =>
      current?.groupKey === groupKey ? null : current,
    );
  }

  function handleProjectCardDragEnd() {
    draggingProjectCardIdRef.current = null;
    if (projectCardDragUiFrameRef.current !== null) {
      window.cancelAnimationFrame(projectCardDragUiFrameRef.current);
      projectCardDragUiFrameRef.current = null;
    }
    setDraggingProjectCardId(null);
    setProjectCardDropTarget(null);
  }

  function reorderProjectCardInGroup(
    projectId: string,
    groupKey: string,
    targetProjectId: string | null,
    position: ProjectCardDropPosition,
  ) {
    if (groupKey === UNGROUPED_GROUP_KEY) return;
    const previousOrderIds = getProjectGroupItems(groupKey).map((item) => item.project.id);
    const nextOrderIds = moveProjectCardId(
      previousOrderIds,
      projectId,
      targetProjectId,
      position,
    );
    if (areStringArraysEqual(previousOrderIds, nextOrderIds)) return;

    setOptimisticProjectOrderIdsByGroup((current) => ({
      ...current,
      [groupKey]: nextOrderIds,
    }));
    setPendingGroupProjectId(projectId);
    startGroupAssignTransition(() => {
      void reorderProjectsInGroup({ groupId: groupKey, orderedProjectIds: nextOrderIds })
        .then(() => {
          router.refresh();
        })
        .catch(() => {
          setOptimisticProjectOrderIdsByGroup((current) => ({
            ...current,
            [groupKey]: previousOrderIds,
          }));
          toast({
            message: "Could not reorder the projects. Try again.",
            tone: "error",
          });
        })
        .finally(() => setPendingGroupProjectId(null));
    });
  }

  // LD-6 optimistic single-card move. Set the override immediately, then wrap the action
  // call AND router.refresh() in startTransition so isGroupMutationPending tracks the RSC
  // refresh. router.refresh() is NON-awaitable (returns void) — there is NO .then() to
  // clear in. The override is cleared by the reconciliation effect below, never here. On
  // failure: restore the previous override value (or delete the key if none) + toast.
  function assignProjectToGroup(projectId: string, nextGroupId: string | null) {
    const hadOverride = Object.prototype.hasOwnProperty.call(
      groupOverrides,
      projectId,
    );
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
            if (hadOverride && previousOverride !== undefined)
              next[projectId] = previousOverride;
            else delete next[projectId];
            return next;
          });
          toast({
            message: "Could not move the project. Try again.",
            tone: "error",
          });
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
          [
            id,
            [
              Object.prototype.hasOwnProperty.call(groupOverrides, id),
              groupOverrides[id],
            ] as const,
          ] as const,
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
          toast({
            message: "Could not move the selected projects. Try again.",
            tone: "error",
          });
        });
    });
  }

  function toggleProjectFavorite(projectId: string, nextFavorite: boolean) {
    const item = projectItems.find((entry) => entry.project.id === projectId);
    const previousFavorite = favoriteIds.has(projectId);
    setFavoriteOverrides((current) => ({
      ...current,
      [projectId]: nextFavorite,
    }));
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
        onError: () =>
          setFavoriteOverrides((current) => ({
            ...current,
            [projectId]: previousFavorite,
          })),
        onSettled: () => setPendingFavoriteId(null),
      },
    );
  }

  function changeProjectStatus(projectId: string, nextStatus: ProjectStatus) {
    const item = projectItems.find((entry) => entry.project.id === projectId);
    if (!item) return;
    const previousStatus = normalizeProjectStatus(
      item.project.status ?? DEFAULT_PROJECT_STATUS,
    );
    if (previousStatus === nextStatus) return;
    setOptimisticProjectStatusOverrides((current) => ({
      ...current,
      [projectId]: nextStatus,
    }));
    setPendingStatusProjectId(projectId);
    startTransition(() => {
      void updateProjectStatus({ projectId, status: nextStatus })
        .then(() => router.refresh())
        .catch(() => {
          setOptimisticProjectStatusOverrides((current) => {
            if (current[projectId] !== nextStatus) return current;
            return {
              ...current,
              [projectId]: previousStatus,
            };
          });
          toast({
            message: "Could not update project status.",
            tone: "error",
          });
        })
        .finally(() => setPendingStatusProjectId(null));
    });
  }

  // D8 card kebab: the per-card "Move to group" menu (owned cards in Group mode only) is built
  // inside the memoized ProjectCardRow from the primitive inputs computed here — see
  // ProjectCardRow for why this preserves memo while keeping the override-aware checkmark (LD-10).
  function renderLiveProjectCard(item: ProjectListItem) {
    const canFavoriteProject = item.accessKind === "owned";
    const isProjectSetupPending = isProjectSetupBlocking(item.setupStatus);
    const showGroupMenu =
      item.accessKind === "owned" &&
      groupBy === "group" &&
      !isProjectSetupPending;
    const canDragToGroup = showGroupMenu && assignableProjectGroups.length > 0;
    const override = groupOverrides[item.project.id];
    const effectiveGroupId =
      override !== undefined ? override : (item.groupId ?? null);

    return (
      <ProjectCardRow
        key={item.project.id}
        item={item}
        viewMode={projectViewMode}
        googleMapsApiKey={googleMapsApiKey}
        canFavorite={canFavoriteProject && !isProjectSetupPending}
        isFavorite={canFavoriteProject && favoriteIds.has(item.project.id)}
        favoriteBusy={
          canFavoriteProject && pendingFavoriteId === item.project.id
        }
        selectedForDeletion={selectedProjectIds.has(item.project.id)}
        selectionActive={selectedVisibleProjectIds.length > 0}
        canSelect={canSelectProjectForDeletion(item) && !isProjectSetupPending}
        setupStatus={item.setupStatus}
        setupNavigationDisabled={item.setupNavigationDisabled}
        statusBusy={pendingStatusProjectId === item.project.id}
        onToggleSelected={stableToggleProjectSelection}
        onToggleFavorite={stableToggleProjectFavorite}
        onChangeProjectStatus={stableChangeProjectStatus}
        onExpand={setExpandedProject}
        showGroupMenu={showGroupMenu}
        projectGroups={assignableProjectGroups}
        effectiveGroupId={effectiveGroupId}
        groupBusy={pendingGroupProjectId === item.project.id}
        onAssignToGroup={stableAssignProjectToGroup}
        canDragToGroup={canDragToGroup}
        onProjectDragStart={stableProjectCardDragStart}
        onProjectDragEnd={stableProjectCardDragEnd}
      />
    );
  }

  function getGroupHeaderActionGroups(groupKey: string): ActionMenuGroup[] {
    const group = orderedProjectGroups.find((entry) => entry.id === groupKey);
    const currentAccentId = group?.accentId ?? null;

    return [
      {
        id: "group-color",
        label: "Color",
        items: [
          {
            id: "group-color-neutral",
            label: "Neutral grey",
            icon: renderGroupColorPreview(DEFAULT_GROUP_ACCENT.ruleColor, {
              id: "neutral",
            }),
            selected: currentAccentId === null,
            onSelect: () => handleRecolorGroup(groupKey, null),
          },
          ...GROUP_ACCENT_SWATCHES.map((swatch) => ({
            id: `group-color-${swatch.id}`,
            label: swatch.label,
            icon: renderGroupColorPreview(swatch.ruleColor, { id: swatch.id }),
            selected: currentAccentId === swatch.id,
            onSelect: () =>
              handleRecolorGroup(groupKey, swatch.id as GroupAccentId),
          })),
        ],
      },
      {
        id: "group-danger",
        items: [
          {
            id: "delete-group",
            label: "Delete group",
            icon: <Trash size={12} weight="regular" aria-hidden="true" />,
            tone: "destructive",
            onSelect: () => handleDeleteGroup(groupKey),
          },
        ],
      },
    ];
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
    const allowedIds = new Set(
      filterMapBy(
        projectItems,
        canSelectProjectForDeletion,
        (item) => item.project.id,
      ),
    );
    const ids = Array.from(new Set(projectIds)).filter((id) =>
      allowedIds.has(id),
    );
    if (ids.length === 0) return;
    setBulkDeleteModalMounted(true);
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
          setDeleteProjectError(
            error instanceof Error
              ? error.message
              : "Could not load project delete preview.",
          );
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
            setDeleteProjectPreview((current) =>
              current
                ? {
                    ...current,
                    issues: result.issues,
                    blocked: result.blocked ?? current.blocked,
                    ok: false,
                  }
                : current,
            );
            setDeleteProjectError(
              result.issues[0]?.message ?? "Could not delete projects.",
            );
            setDeleteProjectState("ready");
            return;
          }
          const removedIds = result.deletedIds?.length
            ? result.deletedIds
            : deleteProjectTargetIds;
          setSelectedProjectIds((current) => {
            const next = new Set(current);
            for (const id of removedIds) next.delete(id);
            return next;
          });
          if (expandedProject && removedIds.includes(expandedProject.id))
            setExpandedProject(null);
          closeProjectDeletePreview();
          router.refresh();
        })
        .catch((error: unknown) => {
          setDeleteProjectError(
            error instanceof Error
              ? error.message
              : "Could not delete projects.",
          );
          setDeleteProjectState("ready");
        });
    });
  }

  const bulkMoveToGroupSlot =
    selectedAssignableProjectIds.length > 0 &&
    groupBy === "group" ? (
      <DropdownMenu
        align="start"
        side="top"
        trigger={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-8 rounded-xs border border-transparent text-secondary hover:-translate-y-0.5 hover:border-hairline hover:bg-surfaceMuted hover:text-ink focus-visible:-translate-y-0.5 focus-visible:bg-surfaceMuted focus-visible:text-ink"
            aria-label="Move selected projects to group"
            title="Move selected projects to group"
            aria-busy={isGroupAssignPending}
          >
            <FolderSimple size={14} weight="regular" aria-hidden="true" />
          </Button>
        }
      >
        {assignableProjectGroups.map((group) => (
          <DropdownMenu.Item
            key={group.id}
            label={group.name}
            onClick={() => bulkAssignSelectedToGroup(group.id)}
          />
        ))}
        <DropdownMenu.Item
          label="Ungrouped"
          onClick={() => bulkAssignSelectedToGroup(null)}
        />
      </DropdownMenu>
    ) : null;

  return (
    <WorkshopCollectionLayout
      searchLabel="Search projects"
      searchPlaceholder="Search projects"
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      toolbarLabel="Project tools"
      toolbarPrefix="projects"
      onExpandAll={expandAllProjectGroups}
      expandAllDisabled={!hasGroupedProjectSections}
      onCollapseAll={collapseAllProjectGroups}
      collapseAllDisabled={!hasGroupedProjectSections}
      filterSlot={
        <div className="flex min-w-0 flex-nowrap items-center gap-1.5">
          <DropdownSelect
            aria-label="View"
            options={VIEW_SELECT_OPTIONS}
            value={projectViewMode}
            onValueChange={(next) =>
              writeProjectViewModePreference(next as ProjectCardViewMode)
            }
            variant="boxed"
            triggerDisplay="icon"
            triggerTitlePrefix="View"
            className={PROJECT_TOOLBAR_SELECT_TRIGGER_CLASS}
          />
          <span
            aria-hidden="true"
            className={HEADER_ICON_TOOLBAR_DIVIDER_CLASSNAME}
            data-project-toolbar-view-divider=""
          />
          <DropdownSelect
            aria-label="Group by"
            options={PROJECT_GROUP_BY_OPTIONS}
            value={groupBy}
            onValueChange={handleProjectGroupByChange}
            variant="boxed"
            triggerDisplay="icon"
            triggerTitlePrefix="Group by"
            className={PROJECT_TOOLBAR_SELECT_TRIGGER_CLASS}
          />
          <DropdownSelect
            aria-label="Sort field"
            options={PROJECT_SORT_FIELD_OPTIONS}
            value={sortField}
            onValueChange={handleSortFieldChange}
            variant="boxed"
            triggerDisplay="icon"
            triggerTitlePrefix="Sort by"
            className={PROJECT_TOOLBAR_SELECT_TRIGGER_CLASS}
          />
          <DropdownSelect
            aria-label="Sort direction"
            options={sortDirectionOptions}
            value={sortDirection}
            onValueChange={handleSortDirectionChange}
            variant="boxed"
            triggerDisplay="icon"
            triggerTitlePrefix="Sort order"
            className={PROJECT_TOOLBAR_SELECT_TRIGGER_CLASS}
          />
        </div>
      }
      addActions={projectToolbarActions}
      toolbarPanel={
        <ProjectStatusTabs
          activeTab={activeStatusTab}
          tabs={projectStatusTabs}
          viewMode={projectViewMode}
          onTabChange={setActiveStatusTab}
        />
      }
    >
      <section
        aria-label="Projects"
        role="tabpanel"
        id={getProjectStatusPanelId(activeStatusTab)}
        aria-labelledby={getProjectStatusTabId(activeStatusTab)}
        className={cn(
          hasProjectEmptyState
            ? "flex h-full min-h-0 flex-col gap-2"
            : "space-y-2",
          selectedVisibleProjectIds.length ? "pb-20" : null,
        )}
      >
        <BulkActionToolbar
          selectedCount={selectedVisibleProjectIds.length}
          actionLabel="Delete selected projects"
          helperText="Active shared links will be revoked when deleted."
          placement="bottom-dock"
          onAction={() => openProjectDeletePreview(selectedVisibleProjectIds)}
          onClear={() => setSelectedProjectIds(new Set())}
          onSelectVisible={() =>
            setSelectedProjectIds(new Set(selectableDisplayProjectIds))
          }
          secondaryActionSlot={bulkMoveToGroupSlot}
        />
        <section
          aria-label="Live projects"
          data-project-view-mode={projectViewMode}
          className={
            hasProjectEmptyState
              ? "min-h-0 flex-1"
              : shouldGroupProjects || isUserGroupOrganize
              ? "space-y-4"
              : projectLayoutClassName
          }
        >
          {hasNoSearchResults ? (
            <div
              className="grid h-full min-h-[420px] place-items-center px-4 py-10"
            >
              <section
                aria-live="polite"
                aria-label={`No search results for ${emptySearchQuery}`}
                data-project-search-empty-state=""
                className="flex w-full max-w-[420px] flex-col items-center rounded-[12px] border border-white/80 bg-white px-5 py-6 text-center shadow-[0_10px_24px_rgba(30,35,50,0.075),0_2px_7px_rgba(30,35,50,0.045),inset_0_1px_0_rgba(255,255,255,0.88)]"
              >
                <div className="grid size-9 place-items-center rounded-full border border-divider bg-surfaceMuted/60 text-secondary">
                  <MagnifyingGlass
                    size={16}
                    weight="regular"
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-3 max-w-full text-[12px] font-medium leading-5 text-ink">
                  No search results for{" "}
                  <span className="break-words text-secondary">
                    &quot;{emptySearchQuery}&quot;
                  </span>
                </p>
                <p className="mt-1 max-w-[300px] text-[10px] leading-4 text-tertiary">
                  Try a project name, client, location, or project code.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  className="mt-4 min-w-[104px] border-white/70 bg-white/75 hover:bg-white/90"
                  onClick={() => setSearchQuery("")}
                >
                  Clear search
                </Button>
              </section>
            </div>
          ) : hasNoStatusResults ? (
            <div
              className="grid h-full min-h-[420px] place-items-center px-4 py-10"
            >
              <section
                aria-live="polite"
                aria-label={`No ${getProjectStatusTabLabel(activeStatusTab).toLowerCase()} projects`}
                data-project-status-empty-state=""
                className="flex w-full max-w-[420px] flex-col items-center rounded-[12px] border border-white/80 bg-white px-5 py-6 text-center shadow-[0_10px_24px_rgba(30,35,50,0.075),0_2px_7px_rgba(30,35,50,0.045),inset_0_1px_0_rgba(255,255,255,0.88)]"
              >
                <div className="grid size-9 place-items-center rounded-full border border-divider bg-surfaceMuted/60 text-secondary">
                  <FolderSimple
                    size={16}
                    weight="regular"
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-3 max-w-full text-[12px] font-medium leading-5 text-ink">
                  No {getProjectStatusTabLabel(activeStatusTab).toLowerCase()} projects yet.
                </p>
                <p className="mt-1 max-w-[300px] text-[10px] leading-4 text-tertiary">
                  Change a project status from the card actions menu.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  className="mt-4 min-w-[104px] border-white/70 bg-white/75 hover:bg-white/90"
                  onClick={() => setActiveStatusTab("all")}
                >
                  Show all projects
                </Button>
              </section>
            </div>
          ) : isUserGroupOrganize
            ? groupedByUserGroup.map((group) => (
                <ProjectGroupSection
                  key={group.key}
                  mode="group"
                  group={{
                    key: group.key,
                    label: group.label,
                    accentId: group.accentId,
                    isVirtual: group.isVirtual,
                  }}
                  items={group.items}
                  viewMode={projectViewMode}
                  getCardNode={renderLiveProjectCard}
                  layoutClassName={projectLayoutClassName}
                  flagLayoutClassName={projectDateFlagLayoutClassName}
                  collapsed={collapsedGroupKeys.has(group.key)}
                  onToggleCollapse={toggleGroupCollapsed}
                  onRenameGroup={
                    group.isVirtual || isOptimisticProjectGroupId(group.key)
                      ? undefined
                      : handleRenameGroup
                  }
                  reorderState={{
                    isReorderable:
                      !group.isVirtual && !isOptimisticProjectGroupId(group.key),
                    isDragging: draggingProjectGroupId === group.key,
                    dropPosition:
                      groupDropTarget?.targetId === group.key
                        ? groupDropTarget.position
                        : null,
                  }}
                  onReorderDragStart={handleGroupReorderDragStart}
                  onReorderDragOver={handleGroupReorderDragOver}
                  onReorderDrop={handleGroupReorderDrop}
                  onReorderDragEnd={handleGroupReorderDragEnd}
                  projectCardDropState={{
                    isDragActive: draggingProjectCardId !== null,
                    isDropAvailable: draggingProjectCardId
                      ? canDropProjectCardAtGroupEnd(
                          draggingProjectCardId,
                          group.key,
                        )
                      : false,
                    isDropTarget: projectCardDropTarget?.groupKey === group.key,
                    target:
                      projectCardDropTarget?.groupKey === group.key
                        ? projectCardDropTarget
                        : null,
                  }}
                  onProjectDragOver={handleProjectCardDragOver}
                  onProjectDrop={handleProjectCardDrop}
                  onProjectDragLeave={handleProjectCardDragLeave}
                  onProjectCardDragOver={handleProjectCardSlotDragOver}
                  onProjectCardDrop={handleProjectCardSlotDrop}
                  headerActionGroups={
                    group.isVirtual || isOptimisticProjectGroupId(group.key)
                      ? undefined
                      : getGroupHeaderActionGroups(group.key)
                  }
                />
              ))
            : shouldGroupProjects
              ? groupedLiveProjects.map((group) => (
                  <ProjectGroupSection
                    key={group.key}
                    mode={group.kind === "client" ? "client" : "date"}
                    group={{ key: group.key, label: group.label }}
                    items={group.items}
                    viewMode={projectViewMode}
                    getCardNode={renderLiveProjectCard}
                    layoutClassName={projectLayoutClassName}
                    flagLayoutClassName={projectDateFlagLayoutClassName}
                    collapsed={collapsedGroupKeys.has(group.key)}
                    onToggleCollapse={toggleGroupCollapsed}
                    legacyHeaderDataAttr={
                      group.kind === "date"
                        ? "data-project-date-group-label"
                        : undefined
                    }
                    legacySectionDataAttr={
                      group.kind === "date"
                        ? { "data-project-date-group": group.key }
                        : { "data-project-client-group": group.key }
                    }
                  />
                ))
              : displayLiveProjects.map(renderLiveProjectCard)}
        </section>
      </section>
      <Suspense fallback={null}>
        {isModalOpen && (
          <NewProjectModal
            onClose={() => setIsModalOpen(false)}
            onOptimisticProjectChange={handleOptimisticProjectChange}
            googleMapsApiKey={googleMapsApiKey}
            googleMapsMapId={googleMapsMapId}
            clientOptions={projectClientOptions}
          />
        )}
        {expandedProject ? (
          <ProjectDetailsModal
            project={expandedProject}
            onClose={() => setExpandedProject(null)}
            onSaved={() => router.refresh()}
            googleMapsApiKey={googleMapsApiKey}
            googleMapsMapId={googleMapsMapId}
            clientOptions={projectClientOptions}
            onDeleteProject={
              canDeleteExpandedProject
                ? (project) => {
                    setExpandedProject(null);
                    openProjectDeletePreview([project.id]);
                  }
                : undefined
            }
          />
        ) : null}
      </Suspense>
      {bulkDeleteModalMounted && (
        <BulkDestructivePreviewModal
          open={deleteProjectTargetIds.length > 0}
          title={deleteProjectModalTitle}
          description={deleteProjectDescription}
          requiredPhrase={deleteProjectPhrase}
          executeLabel={
            deleteProjectTargetIds.length === 1
              ? "Delete project"
              : "Delete projects"
          }
          loading={deleteProjectState === "loading"}
          executing={deleteProjectState === "executing"}
          preview={deleteProjectPreview}
          previewError={deleteProjectError}
          onExecute={executeProjectDeletePreview}
          onOpenChange={(open) => {
            if (!open) closeProjectDeletePreview();
          }}
        />
      )}
    </WorkshopCollectionLayout>
  );
}
