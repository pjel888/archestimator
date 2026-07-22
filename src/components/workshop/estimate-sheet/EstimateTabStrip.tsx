"use client";

import { useCallback, useEffect, useEffectEvent, useImperativeHandle, useMemo, useReducer, useRef, type DragEvent, type KeyboardEvent, type Ref } from "react";
import { CopySimple, PencilSimple, Trash } from "@phosphor-icons/react/dist/ssr";

import { ContextActionMenuContent, type ActionMenuGroup } from "@/components/ui/action-menu";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import {
  createEstimateTab,
  deleteEstimateTab,
  duplicateEstimateTab,
  renameEstimateTab,
  reorderEstimateTabs,
} from "@/lib/estimates/actions";
import {
  formatEstimatePageTabName,
  getEstimateTabDisplayName,
  sortEstimateTabsForDisplay,
} from "@/lib/estimates/tab-display";
import type { EstimateTabSummary } from "@/lib/estimates/types";
import { cn } from "@/lib/ui/cn";
import { useToast } from "@/components/ui/toast";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ESTIMATE_TEMPLATE_DRAG_MIME_TYPE, PROJECT_SOURCE_DRAG_MIME_TYPE } from "../component-library/templates";
import { ESTIMATE_TREE_DRAG_MIME_TYPE } from "./drag-types";

/** Imperative handle exposed via ref so the middle-panel header can trigger tab creation. */
export type EstimateTabStripHandle = {
  createTab: () => void;
};

export type EstimateTabStripProps = {
  tabs: readonly EstimateTabSummary[];
  activeTabId: string;
  projectId?: string;
  estimateId?: string;
  onTabChange: (tabId: string) => void;
  onTabsChange?: (tabs: EstimateTabSummary[]) => void;
  /**
   * When true, the strip exposes editor affordances: double-click / F2 rename
   * and the right-click context menu (Rename / Duplicate / Delete). The mount
   * gates this on `canEditEstimate` — release gate D-15 was lifted once tab-aware
   * export shipped (see .ai/03_plans/2026-06-13-Add-New-Tabs). Tests opt in
   * directly. When false the strip is a read-only tab switcher (no menu).
   */
  enableLifecycleActions?: boolean;
  /** When true (with `enableLifecycleActions`), renders the "+" create button. */
  canCreateTabs?: boolean;
  /**
   * Fired whenever the create-enabled or pending state changes so the parent
   * (middle-panel header) can reflect the button's enabled/disabled status
   * without relying on the ref causing a re-render.
   */
  onCreateTabStateChange?: (state: { canCreate: boolean; pending: boolean }) => void;
  className?: string;
  ref?: Ref<EstimateTabStripHandle>;
};

type PendingAction = "create" | "duplicate" | "rename" | "reorder" | "delete" | null;

type EstimateTabStripState = {
  editingTabId: string | null;
  editingName: string;
  editingWidth: string;
  pendingAction: PendingAction;
  error: string;
  announcement: string;
  contextMenuTabId: string | null;
  enteringTabIds: ReadonlySet<string>;
};

type EstimateTabStripAction =
  | { type: "renameStarted"; tabId: string; name: string; width: string }
  | { type: "renameNameChanged"; name: string }
  | { type: "renameEnded" }
  | { type: "pendingStarted"; pendingAction: NonNullable<PendingAction> }
  | { type: "pendingSettled" }
  | { type: "errorChanged"; error: string }
  | { type: "announcementChanged"; announcement: string }
  | { type: "contextMenuTabChanged"; tabId: string | null }
  | { type: "enteringTabIdsChanged"; tabIds: ReadonlySet<string> };

const INITIAL_ESTIMATE_TAB_STRIP_STATE: EstimateTabStripState = {
  editingTabId: null,
  editingName: "",
  editingWidth: "3ch",
  pendingAction: null,
  error: "",
  announcement: "",
  contextMenuTabId: null,
  enteringTabIds: new Set(),
};

function estimateTabStripReducer(state: EstimateTabStripState, action: EstimateTabStripAction): EstimateTabStripState {
  switch (action.type) {
    case "renameStarted":
      return {
        ...state,
        editingTabId: action.tabId,
        editingName: action.name,
        editingWidth: action.width,
        error: "",
      };
    case "renameNameChanged":
      return {
        ...state,
        editingName: action.name,
      };
    case "renameEnded":
      return {
        ...state,
        editingTabId: null,
        error: "",
      };
    case "pendingStarted":
      return {
        ...state,
        pendingAction: action.pendingAction,
        error: "",
      };
    case "pendingSettled":
      return {
        ...state,
        pendingAction: null,
      };
    case "errorChanged":
      return {
        ...state,
        error: action.error,
      };
    case "announcementChanged":
      return {
        ...state,
        announcement: action.announcement,
      };
    case "contextMenuTabChanged":
      return {
        ...state,
        contextMenuTabId: action.tabId,
      };
    case "enteringTabIdsChanged":
      return {
        ...state,
        enteringTabIds: action.tabIds,
      };
    default:
      return state;
  }
}

const SPRING_LOADED_TAB_DELAY_MS = 450;
const CROSS_TAB_NODE_MOVE_TOAST_ID = "estimate-tab-cross-tab-node-move";
const CROSS_TAB_NODE_MOVE_MESSAGE = "Moving between tabs isn't supported yet — duplicate the tab or save the group as a template.";
const ESTIMATE_TAB_STRIP_ERROR_TOAST_ID = "estimate-tab-strip-error";

function getDragTypes(event: DragEvent<HTMLElement>) {
  return Array.from(event.dataTransfer?.types ?? []);
}

function isEstimateTreeNodeDrag(event: DragEvent<HTMLElement>) {
  return getDragTypes(event).includes(ESTIMATE_TREE_DRAG_MIME_TYPE);
}

function canSpringLoadTabDrag(event: DragEvent<HTMLElement>) {
  const types = getDragTypes(event);
  return types.includes(ESTIMATE_TEMPLATE_DRAG_MIME_TYPE) || types.includes(PROJECT_SOURCE_DRAG_MIME_TYPE);
}

function getNextTabName(tabs: readonly EstimateTabSummary[]) {
  const usedNames = new Set(sortEstimateTabsForDisplay(tabs).map((tab, index) => getEstimateTabDisplayName(tab, index).toLowerCase()));
  let index = tabs.length + 1;
  while (usedNames.has(formatEstimatePageTabName(index).toLowerCase())) index += 1;
  return formatEstimatePageTabName(index);
}

function focusInputAtEnd(input: HTMLInputElement | null) {
  if (!input) return;
  input.focus();
  const caretPosition = input.value.length;
  input.setSelectionRange(caretPosition, caretPosition);
}

// react-doctor-disable-next-line react-doctor/no-giant-component -- Structural split tracked in .ai/03_plans/2026-06-23-react-doctor-warning-cleanup.md; broad refactor needs behavior tests.
export function EstimateTabStrip({
  tabs,
  activeTabId,
  projectId,
  estimateId,
  onTabChange,
  onTabsChange,
  enableLifecycleActions = false,
  canCreateTabs = false,
  onCreateTabStateChange,
  className,
  ref,
}: EstimateTabStripProps) {
  const { toast } = useToast();
  const orderedTabs = useMemo(() => sortEstimateTabsForDisplay(tabs), [tabs]);
  const resolvedActiveTabId = orderedTabs.some((tab) => tab.id === activeTabId)
    ? activeTabId
    : orderedTabs[0]?.id ?? activeTabId;
  const activeIndex = Math.max(0, orderedTabs.findIndex((tab) => tab.id === resolvedActiveTabId));
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const springLoadTimerRef = useRef<number | null>(null);
  const springLoadTargetRef = useRef<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const renameCommitStartedRef = useRef(false);
  // After a context-menu action that changes the active tab (delete/duplicate),
  // focus the resulting tab once the new list renders — deterministically,
  // instead of racing the Radix close-auto-focus return-to-trigger.
  const pendingFocusTabIdRef = useRef<string | null>(null);
  const manageMenuCloseFocusRef = useRef(false);
  const [state, dispatch] = useReducer(estimateTabStripReducer, INITIAL_ESTIMATE_TAB_STRIP_STATE);
  const {
    editingTabId,
    editingName,
    editingWidth,
    pendingAction,
    error,
    announcement,
    contextMenuTabId,
    enteringTabIds,
  } = state;
  const lastAnnouncedTabIdRef = useRef<string | null>(null);
  const lastToastedErrorRef = useRef("");
  const suppressNextSelectionAnnouncementRef = useRef(false);
  // Mirrors EstimateSheetTree: a menu-triggered rename must survive the Radix
  // close-auto-focus, which would otherwise return focus to the trigger and fire
  // the rename input's onBlur → a premature/empty commit.
  const suppressContextMenuCloseAutoFocusRef = useRef(false);
  const ignoreRenameBlurDuringContextMenuCloseRef = useRef(false);
  const lifecycleActionsReady = enableLifecycleActions && Boolean(projectId && estimateId);

  // Browser-grade polish (U5): pinned "+", scroll-into-view, overflow fade, and
  // restrained enter motion — all respecting prefers-reduced-motion.
  const previousTabIdsRef = useRef<Set<string>>(null!);
  if (previousTabIdsRef.current === null) previousTabIdsRef.current = new Set(orderedTabs.map((tab) => tab.id));
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  useEffect(() => {
    if (!error) {
      lastToastedErrorRef.current = "";
      return;
    }
    if (lastToastedErrorRef.current === error) return;
    lastToastedErrorRef.current = error;
    toast({
      id: ESTIMATE_TAB_STRIP_ERROR_TOAST_ID,
      message: error,
      tone: "error",
    });
  }, [error, toast]);

  const focusTab = useCallback((index: number) => {
    const tab = orderedTabs[index];
    if (!tab) return;
    tabRefs.current[index]?.focus();
  }, [orderedTabs]);

  const clearSpringLoadedTabTarget = useCallback(() => {
    if (springLoadTimerRef.current !== null) {
      window.clearTimeout(springLoadTimerRef.current);
      springLoadTimerRef.current = null;
    }
    springLoadTargetRef.current = null;
  }, []);

  useEffect(() => clearSpringLoadedTabTarget, [clearSpringLoadedTabTarget]);

  useEffect(() => {
    const activeTab = orderedTabs[activeIndex];
    if (!activeTab) return;
    if (lastAnnouncedTabIdRef.current && lastAnnouncedTabIdRef.current !== activeTab.id) {
      if (suppressNextSelectionAnnouncementRef.current) {
        suppressNextSelectionAnnouncementRef.current = false;
      } else {
        dispatch({ type: "announcementChanged", announcement: `${activeTab.name} tab selected.` });
      }
    }
    lastAnnouncedTabIdRef.current = activeTab.id;
  }, [activeIndex, orderedTabs]);

  // Focus the inline rename input across the menu-close dance. The ref callback
  // skips focusing for menu-triggered renames (the close handler does it instead)
  // so the menu's focus return cannot win and blur the just-mounted editor.
  const attachRenameInputRef = useCallback((input: HTMLInputElement | null) => {
    renameInputRef.current = input;
    if (!input || document.activeElement === input) return;
    if (suppressContextMenuCloseAutoFocusRef.current || ignoreRenameBlurDuringContextMenuCloseRef.current) return;
    focusInputAtEnd(input);
  }, []);

  const armContextMenuRenameHandoff = useCallback(() => {
    suppressContextMenuCloseAutoFocusRef.current = true;
    ignoreRenameBlurDuringContextMenuCloseRef.current = true;
  }, []);

  const handleContextMenuCloseAutoFocus = useCallback((event: Event) => {
    if (suppressContextMenuCloseAutoFocusRef.current) {
      // Rename: keep focus off the trigger so it can move to the inline input.
      event.preventDefault();
      window.setTimeout(() => {
        focusInputAtEnd(renameInputRef.current);
        suppressContextMenuCloseAutoFocusRef.current = false;
        ignoreRenameBlurDuringContextMenuCloseRef.current = false;
      }, 0);
      return;
    }
    // Delete/duplicate: a tab-focus effect places focus on the resulting tab once
    // the updated list renders; stop Radix from yanking focus back to the trigger.
    if (manageMenuCloseFocusRef.current) event.preventDefault();
  }, []);

  useEffect(() => {
    if (!editingTabId) {
      suppressContextMenuCloseAutoFocusRef.current = false;
      ignoreRenameBlurDuringContextMenuCloseRef.current = false;
      return undefined;
    }
    let focusAnimationFrame: number | null = null;
    let focusTimeout: number | null = null;
    const focusRenameInput = () => {
      focusInputAtEnd(renameInputRef.current);
    };
    const menuCloseAnimationFrame = window.requestAnimationFrame(() => {
      focusAnimationFrame = window.requestAnimationFrame(() => {
        focusRenameInput();
        focusTimeout = window.setTimeout(() => {
          focusRenameInput();
          ignoreRenameBlurDuringContextMenuCloseRef.current = false;
        }, 0);
      });
    });
    return () => {
      window.cancelAnimationFrame(menuCloseAnimationFrame);
      if (focusAnimationFrame !== null) window.cancelAnimationFrame(focusAnimationFrame);
      if (focusTimeout !== null) window.clearTimeout(focusTimeout);
      suppressContextMenuCloseAutoFocusRef.current = false;
      ignoreRenameBlurDuringContextMenuCloseRef.current = false;
    };
  }, [editingTabId]);

  useEffect(() => {
    const targetTabId = pendingFocusTabIdRef.current;
    if (!targetTabId) return;
    const index = orderedTabs.findIndex((tab) => tab.id === targetTabId);
    if (index < 0) return;
    pendingFocusTabIdRef.current = null;
    manageMenuCloseFocusRef.current = false;
    tabRefs.current[index]?.focus();
  }, [orderedTabs]);

  const scrollTabIntoView = useCallback((tabId: string) => {
    const index = orderedTabs.findIndex((tab) => tab.id === tabId);
    if (index < 0) return;
    const target = tabRefs.current[index];
    if (!target || target.closest("[inert]")) return;
    target.scrollIntoView?.({ inline: "nearest", block: "nearest", behavior: prefersReducedMotion ? "auto" : "smooth" });
  }, [orderedTabs, prefersReducedMotion]);

  // Keep the active tab in view (covers activate + create switching to the new tab).
  useEffect(() => {
    scrollTabIntoView(resolvedActiveTabId);
  }, [resolvedActiveTabId, scrollTabIntoView]);

  // Scroll the rename target into view even when it is a background/overflowed tab.
  useEffect(() => {
    if (!editingTabId) return;
    const fallbackButton = tabRefs.current[orderedTabs.findIndex((tab) => tab.id === editingTabId)];
    const target = renameInputRef.current ?? fallbackButton;
    target?.scrollIntoView?.({ inline: "nearest", block: "nearest", behavior: prefersReducedMotion ? "auto" : "smooth" });
  }, [editingTabId, orderedTabs, prefersReducedMotion]);

  // Briefly mark newly added tabs so they animate in (skipped under reduced motion).
  useEffect(() => {
    const currentIds = orderedTabs.map((tab) => tab.id);
    const previousIds = previousTabIdsRef.current;
    const addedIds = currentIds.filter((id) => !previousIds.has(id));
    previousTabIdsRef.current = new Set(currentIds);
    if (addedIds.length === 0 || prefersReducedMotion) return undefined;
    dispatch({ type: "enteringTabIdsChanged", tabIds: new Set(addedIds) });
    const timer = window.setTimeout(() => dispatch({ type: "enteringTabIdsChanged", tabIds: new Set() }), 200);
    return () => window.clearTimeout(timer);
  }, [orderedTabs, prefersReducedMotion]);

  const scheduleSpringLoadedTabTarget = useCallback((event: DragEvent<HTMLButtonElement>, tabId: string) => {
    if (isEstimateTreeNodeDrag(event)) {
      clearSpringLoadedTabTarget();
      if (tabId !== resolvedActiveTabId) {
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "none";
      }
      return;
    }

    if (!canSpringLoadTabDrag(event)) {
      clearSpringLoadedTabTarget();
      return;
    }

    if (tabId === resolvedActiveTabId || editingTabId === tabId) {
      clearSpringLoadedTabTarget();
      return;
    }

    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = event.dataTransfer.dropEffect === "move" ? "move" : "copy";
    }

    if (springLoadTargetRef.current === tabId) return;

    clearSpringLoadedTabTarget();
    springLoadTargetRef.current = tabId;
    springLoadTimerRef.current = window.setTimeout(() => {
      springLoadTimerRef.current = null;
      springLoadTargetRef.current = null;
      onTabChange(tabId);
    }, SPRING_LOADED_TAB_DELAY_MS);
  }, [clearSpringLoadedTabTarget, editingTabId, onTabChange, resolvedActiveTabId]);

  const handleTabDrop = useCallback((event: DragEvent<HTMLButtonElement>, tabId: string) => {
    clearSpringLoadedTabTarget();
    if (!isEstimateTreeNodeDrag(event) || tabId === resolvedActiveTabId) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "none";
    toast({
      id: CROSS_TAB_NODE_MOVE_TOAST_ID,
      message: CROSS_TAB_NODE_MOVE_MESSAGE,
      tone: "error",
    });
    dispatch({ type: "announcementChanged", announcement: CROSS_TAB_NODE_MOVE_MESSAGE });
  }, [clearSpringLoadedTabTarget, resolvedActiveTabId, toast]);

  const beginRename = useCallback((tab: EstimateTabSummary) => {
    if (!lifecycleActionsReady) return;
    const tabIndex = orderedTabs.findIndex((candidate) => candidate.id === tab.id);
    const label = tabIndex >= 0
      ? tabRefs.current[tabIndex]?.querySelector<HTMLElement>("[data-estimate-tab-label]")
      : null;
    const preEditLabelWidth = Math.max(label?.getBoundingClientRect().width ?? 0, label?.scrollWidth ?? 0);
    const fallbackLabel = tabIndex >= 0 ? getEstimateTabDisplayName(tab, tabIndex) : tab.name;
    const editingWidth = preEditLabelWidth > 0
      ? `${preEditLabelWidth}px`
      : `${Math.max(fallbackLabel.length, 3)}ch`;
    renameCommitStartedRef.current = false;
    armContextMenuRenameHandoff();
    dispatch({ type: "renameStarted", tabId: tab.id, name: tab.name, width: editingWidth });
  }, [armContextMenuRenameHandoff, lifecycleActionsReady, orderedTabs]);

  const commitRename = useCallback(async () => {
    if (!projectId || !estimateId || !editingTabId || renameCommitStartedRef.current) return;
    renameCommitStartedRef.current = true;
    suppressContextMenuCloseAutoFocusRef.current = false;
    ignoreRenameBlurDuringContextMenuCloseRef.current = false;
    const renamedTabId = editingTabId;
    // Return focus to the tab that was renamed (it may be a background tab), not
    // assume the active tab. Rename does not reorder, so its index is stable.
    const focusRenamedTab = () => focusTab(orderedTabs.findIndex((tab) => tab.id === renamedTabId));
    const nextName = editingName.trim();
    if (!nextName) {
      renameCommitStartedRef.current = false;
      dispatch({ type: "errorChanged", error: "Tab name is required." });
      return;
    }
    const currentTab = orderedTabs.find((tab) => tab.id === editingTabId);
    if (currentTab?.name === nextName) {
      dispatch({ type: "renameEnded" });
      window.requestAnimationFrame(focusRenamedTab);
      return;
    }

    dispatch({ type: "pendingStarted", pendingAction: "rename" });
    try {
      const result = await renameEstimateTab({ projectId, estimateId, tabId: editingTabId, name: nextName });
      if (result.tabs) onTabsChange?.(result.tabs);
      dispatch({ type: "renameEnded" });
      dispatch({ type: "announcementChanged", announcement: `Renamed tab to ${nextName}.` });
      window.requestAnimationFrame(focusRenamedTab);
    } catch (renameError) {
      renameCommitStartedRef.current = false;
      dispatch({ type: "errorChanged", error: renameError instanceof Error ? renameError.message : "Could not rename tab." });
    } finally {
      dispatch({ type: "pendingSettled" });
    }
  }, [editingName, editingTabId, estimateId, focusTab, onTabsChange, orderedTabs, projectId]);

  const createTab = useCallback(async () => {
    if (!projectId || !estimateId || !lifecycleActionsReady || !canCreateTabs) return;
    dispatch({ type: "pendingStarted", pendingAction: "create" });
    try {
      const result = await createEstimateTab({ projectId, estimateId, name: getNextTabName(orderedTabs) });
      if (result.tabs) onTabsChange?.(result.tabs);
      suppressNextSelectionAnnouncementRef.current = true;
      onTabChange(result.estimateTabId);
      const nextTab = result.tabs?.find((tab) => tab.id === result.estimateTabId);
      dispatch({ type: "announcementChanged", announcement: `Created ${nextTab?.name ?? "tab"}.` });
      if (nextTab) beginRename(nextTab);
    } catch (createError) {
      dispatch({ type: "errorChanged", error: createError instanceof Error ? createError.message : "Could not create tab." });
    } finally {
      dispatch({ type: "pendingSettled" });
    }
  }, [beginRename, canCreateTabs, estimateId, lifecycleActionsReady, onTabChange, onTabsChange, orderedTabs, projectId]);

  // Expose createTab imperatively so the middle-panel header (a sibling component)
  // can trigger tab creation without prop-drilling through EstimateSheetContent.
  useImperativeHandle(ref, () => ({ createTab: () => void createTab() }), [createTab]);

  // Notify the parent when create-enabled or pending state changes. The parent
  // holds a useState that drives the header button's visibility/disabled state.
  // We use an effect (not a ref) so the parent re-renders on each transition.
  const canCreate = lifecycleActionsReady && canCreateTabs;
  // Disable "New tab" while ANY tab lifecycle action is in flight (create,
  // rename, delete, duplicate) — preserving the original in-strip button's
  // `disabled={Boolean(pendingAction)}` serialization guard.
  const actionPending = Boolean(pendingAction);
  const reportCreateTabStateChange = useEffectEvent((state: { canCreate: boolean; pending: boolean }) => {
    onCreateTabStateChange?.(state);
  });
  useEffect(() => {
    // react-doctor-disable-next-line react-doctor/no-pass-data-to-parent -- TabStrip owns lifecycle pending state and reports it to the sibling header button.
    reportCreateTabStateChange({ canCreate, pending: actionPending });
  }, [actionPending, canCreate]);

  const releaseMenuCloseFocusToActiveTab = useCallback(() => {
    if (!manageMenuCloseFocusRef.current) return;
    manageMenuCloseFocusRef.current = false;
    pendingFocusTabIdRef.current = null;
    window.requestAnimationFrame(() => focusTab(activeIndex));
  }, [activeIndex, focusTab]);

  const duplicateTab = useCallback(async (tabId: string) => {
    if (!projectId || !estimateId || !lifecycleActionsReady) return;
    manageMenuCloseFocusRef.current = true;
    dispatch({ type: "pendingStarted", pendingAction: "duplicate" });
    try {
      const result = await duplicateEstimateTab({ projectId, estimateId, tabId });
      // Only arm the pending-focus handoff when a canonical list comes back; the
      // new tab can only enter the rendered list (and clear the focus refs) via it.
      if (result.tabs) {
        onTabsChange?.(result.tabs);
        suppressNextSelectionAnnouncementRef.current = true;
        onTabChange(result.estimateTabId);
        pendingFocusTabIdRef.current = result.estimateTabId;
        const nextTab = result.tabs.find((tab) => tab.id === result.estimateTabId);
        dispatch({ type: "announcementChanged", announcement: `Duplicated ${nextTab?.name ?? "tab"}.` });
      } else {
        releaseMenuCloseFocusToActiveTab();
      }
    } catch (duplicateError) {
      releaseMenuCloseFocusToActiveTab();
      dispatch({ type: "errorChanged", error: duplicateError instanceof Error ? duplicateError.message : "Could not duplicate tab." });
    } finally {
      dispatch({ type: "pendingSettled" });
    }
  }, [estimateId, lifecycleActionsReady, onTabChange, onTabsChange, projectId, releaseMenuCloseFocusToActiveTab]);

  const moveActiveTab = useCallback(async (direction: -1 | 1) => {
    if (!projectId || !estimateId || !lifecycleActionsReady || orderedTabs.length < 2) return;
    const currentIndex = orderedTabs.findIndex((tab) => tab.id === resolvedActiveTabId);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= orderedTabs.length) return;
    const reordered = [...orderedTabs];
    const [moved] = reordered.splice(currentIndex, 1);
    if (!moved) return;
    reordered.splice(nextIndex, 0, moved);

    dispatch({ type: "pendingStarted", pendingAction: "reorder" });
    try {
      const result = await reorderEstimateTabs({
        projectId,
        estimateId,
        updates: reordered.map((tab, index) => ({ id: tab.id, sortOrder: index })),
      });
      onTabsChange?.(result.tabs ?? reordered.map((tab, index) => ({ ...tab, sortOrder: index })));
      dispatch({ type: "announcementChanged", announcement: `${moved.name} tab moved ${direction < 0 ? "left" : "right"}.` });
      window.requestAnimationFrame(() => focusTab(nextIndex));
    } catch (reorderError) {
      dispatch({ type: "errorChanged", error: reorderError instanceof Error ? reorderError.message : "Could not reorder tabs." });
    } finally {
      dispatch({ type: "pendingSettled" });
    }
  }, [estimateId, focusTab, lifecycleActionsReady, onTabsChange, orderedTabs, projectId, resolvedActiveTabId]);

  const deleteTab = useCallback(async (tabId: string) => {
    if (!projectId || !estimateId || !lifecycleActionsReady || orderedTabs.length < 2) return;
    const targetTab = orderedTabs.find((tab) => tab.id === tabId);
    if (!targetTab) return;
    const targetIndex = orderedTabs.findIndex((tab) => tab.id === tabId);
    const targetWasActive = tabId === resolvedActiveTabId;
    if (targetWasActive) manageMenuCloseFocusRef.current = true;

    dispatch({ type: "pendingStarted", pendingAction: "delete" });
    try {
      const result = await deleteEstimateTab({ projectId, estimateId, tabId });
      const nextTabs = result.tabs ?? orderedTabs.filter((tab) => tab.id !== tabId);
      if (result.tabs) onTabsChange?.(result.tabs);
      // Browser semantics: removing a background tab leaves the active tab as-is;
      // only switch when the removed tab was the active one. Focus moves to the
      // replacement via the pending-focus effect (deterministic vs. the menu-close
      // focus return).
      if (targetWasActive) {
        const replacementTabId = result.replacementTabId ?? nextTabs[Math.min(targetIndex, Math.max(0, nextTabs.length - 1))]?.id ?? null;
        if (replacementTabId) {
          suppressNextSelectionAnnouncementRef.current = true;
          onTabChange(replacementTabId);
          pendingFocusTabIdRef.current = replacementTabId;
        } else {
          manageMenuCloseFocusRef.current = false;
        }
      }
      dispatch({ type: "announcementChanged", announcement: `${targetTab.name} tab deleted.` });
    } catch (deleteError) {
      // The menu already closed with focus held off the trigger; hand focus back
      // to the active tab so keyboard users keep their place after a failed delete.
      releaseMenuCloseFocusToActiveTab();
      dispatch({ type: "errorChanged", error: deleteError instanceof Error ? deleteError.message : "Could not delete tab." });
    } finally {
      dispatch({ type: "pendingSettled" });
    }
  }, [estimateId, lifecycleActionsReady, onTabChange, onTabsChange, orderedTabs, projectId, releaseMenuCloseFocusToActiveTab, resolvedActiveTabId]);

  const contextMenuGroups = useMemo<ActionMenuGroup[]>(() => {
    const targetTab = orderedTabs.find((tab) => tab.id === contextMenuTabId);
    if (!targetTab) return [];
    const actionPending = Boolean(pendingAction);
    const isLastTab = orderedTabs.length <= 1;
    return [
      {
        id: "tab-actions",
        items: [
          {
            id: "rename",
            label: "Rename",
            icon: <PencilSimple size={12} weight="regular" aria-hidden="true" />,
            disabled: actionPending,
            disabledReason: actionPending ? "Finish the current tab action first." : undefined,
            onSelect: () => beginRename(targetTab),
          },
          {
            id: "duplicate",
            label: "Duplicate",
            icon: <CopySimple size={12} weight="regular" aria-hidden="true" />,
            disabled: actionPending,
            disabledReason: actionPending ? "Finish the current tab action first." : undefined,
            onSelect: () => void duplicateTab(targetTab.id),
          },
        ],
      },
      {
        id: "tab-danger",
        items: [
          {
            id: "delete",
            label: "Delete",
            icon: <Trash size={12} weight="regular" aria-hidden="true" />,
            tone: "destructive" as const,
            disabled: actionPending || isLastTab,
            disabledReason: isLastTab
              ? "An estimate needs at least one tab."
              : actionPending
                ? "Finish the current tab action first."
                : undefined,
            onSelect: () => void deleteTab(targetTab.id),
          },
        ],
      },
    ];
  }, [beginRename, contextMenuTabId, deleteTab, duplicateTab, orderedTabs, pendingAction]);

  const handleTabKeyDown = useCallback((event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if ((event.metaKey || event.ctrlKey) && event.shiftKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      event.preventDefault();
      void moveActiveTab(event.key === "ArrowLeft" ? -1 : 1);
      return;
    }

    if (event.key === "F2") {
      const tab = orderedTabs[index];
      if (tab) beginRename(tab);
    }
  }, [beginRename, moveActiveTab, orderedTabs]);

  const navigationTabs = useMemo<readonly TabItem[]>(() =>
    orderedTabs.map((tab, index) => {
        const isEditing = editingTabId === tab.id;
        const displayName = getEstimateTabDisplayName(tab, index);
        return {
          id: tab.id,
          label: isEditing ? (
            <span className="inline-flex max-w-44 items-center ring-1 ring-inset ring-focus" data-estimate-tab-id={tab.id}>
                <input
                  ref={attachRenameInputRef}
                  className="min-w-0 max-w-[150px] bg-transparent text-[10px] font-medium leading-none text-ink outline-none"
                  style={{ width: editingWidth }}
                  aria-label={`Rename ${displayName} tab`}
                  placeholder="Tab name"
                  value={editingName}
                  disabled={pendingAction === "rename"}
                  onChange={(event) => dispatch({ type: "renameNameChanged", name: event.target.value })}
                  onBlur={() => {
                    // Ignore the transient blur from the menu-close focus return on an
                    // unchanged name so it does not commit prematurely (see U2 contract).
                    if (ignoreRenameBlurDuringContextMenuCloseRef.current && editingName === tab.name) return;
                    void commitRename();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void commitRename();
                    }
                    if (event.key === "Escape") {
                      event.preventDefault();
                      suppressContextMenuCloseAutoFocusRef.current = false;
                      ignoreRenameBlurDuringContextMenuCloseRef.current = false;
                      renameCommitStartedRef.current = false;
                      dispatch({ type: "renameEnded" });
                      window.requestAnimationFrame(() => focusTab(index));
                    }
                  }}
                />
              </span>
          ) : (
            <span className="truncate" data-estimate-tab-id={tab.id} data-estimate-tab-label>{displayName}</span>
          ),
        };
      }),
    [attachRenameInputRef, commitRename, editingName, editingTabId, editingWidth, focusTab, orderedTabs, pendingAction],
  );

  // The "New tab" button has been relocated to the middle-panel header toolbar
  // (Task C3 / Req 13). It is no longer rendered inside the tab strip.

  const tabList = (
    <Tabs
      tabs={navigationTabs}
      activeId={resolvedActiveTabId}
      onChange={onTabChange}
      ariaLabel="Estimate tabs"
      activationMode="manual"
      className="min-w-0 flex-1"
      onContextMenu={(event) => {
        if (!(event.target instanceof Element) || !event.target.closest("[data-estimate-tab-id]")) {
          event.preventDefault();
        }
      }}
      onTabButtonMount={(_tab, index, element) => {
        tabRefs.current[index] = element;
      }}
      getTabButtonProps={(tab, index) => ({
        "data-estimate-tab-id": tab.id,
        className: cn(
          "max-w-44",
          enteringTabIds.has(tab.id) && "animate-in fade-in-0 slide-in-from-bottom-1 duration-150",
        ),
        onDoubleClick: () => {
          const targetTab = orderedTabs[index];
          if (targetTab) beginRename(targetTab);
        },
        onContextMenu: () => dispatch({ type: "contextMenuTabChanged", tabId: tab.id }),
        onKeyDown: (event) => handleTabKeyDown(event, index),
        onDragOver: (event) => scheduleSpringLoadedTabTarget(event, tab.id),
        onDragLeave: clearSpringLoadedTabTarget,
        onDrop: (event) => handleTabDrop(event, tab.id),
      })}
    />
  );

  return (
    <div className={cn("shrink-0 border-b border-hairline bg-white", className)} data-estimate-tab-strip>
      <div className="flex min-h-10 items-stretch gap-1 px-2" data-estimate-tab-strip-row>
        <div className="relative flex min-w-0 flex-1 items-end">
          {lifecycleActionsReady ? (
            <ContextMenu>
              <ContextMenuTrigger asChild>{tabList}</ContextMenuTrigger>
              <ContextMenuContent
                data-estimate-tab-context-menu="true"
                alignOffset={4}
                onCloseAutoFocus={handleContextMenuCloseAutoFocus}
              >
                <ContextActionMenuContent groups={contextMenuGroups} />
              </ContextMenuContent>
            </ContextMenu>
          ) : (
            tabList
          )}
        </div>
      </div>
      <output aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </output>
    </div>
  );
}
