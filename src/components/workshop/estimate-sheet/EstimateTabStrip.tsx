"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
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
import type { EstimateTabSummary } from "@/lib/estimates/types";
import { cn } from "@/lib/ui/cn";
import { useToast } from "@/components/ui/toast";
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
};

type PendingAction = "create" | "duplicate" | "rename" | "reorder" | "delete" | null;

const SPRING_LOADED_TAB_DELAY_MS = 450;
const CROSS_TAB_NODE_MOVE_TOAST_ID = "estimate-tab-cross-tab-node-move";
const CROSS_TAB_NODE_MOVE_MESSAGE = "Moving between tabs isn't supported yet — duplicate the tab or save the group as a template.";

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
  const usedNames = new Set(tabs.map((tab, index) => getTabDisplayName(tab, index).toLowerCase()));
  let index = tabs.length + 1;
  while (usedNames.has(formatPageTabName(index).toLowerCase())) index += 1;
  return formatPageTabName(index);
}

function sortTabs(tabs: readonly EstimateTabSummary[]) {
  return [...tabs].sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name));
}

function formatPageTabName(index: number) {
  return `Page ${String(index).padStart(3, "0")}`;
}

function getTabDisplayName(tab: EstimateTabSummary, index: number) {
  if (index === 0) return "Page 001";
  return tab.name;
}

export const EstimateTabStrip = forwardRef<EstimateTabStripHandle, EstimateTabStripProps>(function EstimateTabStrip({
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
}: EstimateTabStripProps, ref) {
  const { toast } = useToast();
  const orderedTabs = useMemo(() => sortTabs(tabs), [tabs]);
  const resolvedActiveTabId = orderedTabs.some((tab) => tab.id === activeTabId)
    ? activeTabId
    : orderedTabs[0]?.id ?? activeTabId;
  const activeIndex = Math.max(0, orderedTabs.findIndex((tab) => tab.id === resolvedActiveTabId));
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const springLoadTimerRef = useRef<number | null>(null);
  const springLoadTargetRef = useRef<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  // After a context-menu action that changes the active tab (delete/duplicate),
  // focus the resulting tab once the new list renders — deterministically,
  // instead of racing the Radix close-auto-focus return-to-trigger.
  const pendingFocusTabIdRef = useRef<string | null>(null);
  const manageMenuCloseFocusRef = useRef(false);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [contextMenuTabId, setContextMenuTabId] = useState<string | null>(null);
  const lastAnnouncedTabIdRef = useRef<string | null>(null);
  const suppressNextSelectionAnnouncementRef = useRef(false);
  // Mirrors EstimateSheetTree: a menu-triggered rename must survive the Radix
  // close-auto-focus, which would otherwise return focus to the trigger and fire
  // the rename input's onBlur → a premature/empty commit.
  const suppressContextMenuCloseAutoFocusRef = useRef(false);
  const ignoreRenameBlurDuringContextMenuCloseRef = useRef(false);
  const lifecycleActionsReady = enableLifecycleActions && Boolean(projectId && estimateId);

  // Browser-grade polish (U5): pinned "+", scroll-into-view, overflow fade, and
  // restrained enter motion — all respecting prefers-reduced-motion.
  const previousTabIdsRef = useRef<Set<string>>(new Set(orderedTabs.map((tab) => tab.id)));
  const [enteringTabIds, setEnteringTabIds] = useState<ReadonlySet<string>>(() => new Set());
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

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
        setAnnouncement(`${activeTab.name} tab selected.`);
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
    input.focus();
    input.select();
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
        renameInputRef.current?.focus();
        renameInputRef.current?.select();
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
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
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

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => setPrefersReducedMotion(media.matches);
    handleChange();
    media.addEventListener?.("change", handleChange);
    return () => media.removeEventListener?.("change", handleChange);
  }, []);

  const scrollTabIntoView = useCallback((tabId: string) => {
    const index = orderedTabs.findIndex((tab) => tab.id === tabId);
    if (index < 0) return;
    tabRefs.current[index]?.scrollIntoView?.({ inline: "nearest", block: "nearest", behavior: prefersReducedMotion ? "auto" : "smooth" });
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
    setEnteringTabIds(new Set(addedIds));
    const timer = window.setTimeout(() => setEnteringTabIds(new Set()), 200);
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
    setAnnouncement(CROSS_TAB_NODE_MOVE_MESSAGE);
  }, [clearSpringLoadedTabTarget, resolvedActiveTabId, toast]);

  const beginRename = useCallback((tab: EstimateTabSummary) => {
    if (!lifecycleActionsReady) return;
    armContextMenuRenameHandoff();
    setError("");
    setEditingTabId(tab.id);
    setEditingName(tab.name);
  }, [armContextMenuRenameHandoff, lifecycleActionsReady]);

  const commitRename = useCallback(async () => {
    if (!projectId || !estimateId || !editingTabId) return;
    suppressContextMenuCloseAutoFocusRef.current = false;
    ignoreRenameBlurDuringContextMenuCloseRef.current = false;
    const renamedTabId = editingTabId;
    // Return focus to the tab that was renamed (it may be a background tab), not
    // assume the active tab. Rename does not reorder, so its index is stable.
    const focusRenamedTab = () => focusTab(orderedTabs.findIndex((tab) => tab.id === renamedTabId));
    const nextName = editingName.trim();
    if (!nextName) {
      setError("Tab name is required.");
      return;
    }
    const currentTab = orderedTabs.find((tab) => tab.id === editingTabId);
    if (currentTab?.name === nextName) {
      setEditingTabId(null);
      setError("");
      window.requestAnimationFrame(focusRenamedTab);
      return;
    }

    setPendingAction("rename");
    setError("");
    try {
      const result = await renameEstimateTab({ projectId, estimateId, tabId: editingTabId, name: nextName });
      if (result.tabs) onTabsChange?.(result.tabs);
      setEditingTabId(null);
      setAnnouncement(`Renamed tab to ${nextName}.`);
      window.requestAnimationFrame(focusRenamedTab);
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : "Could not rename tab.");
    } finally {
      setPendingAction(null);
    }
  }, [editingName, editingTabId, estimateId, focusTab, onTabsChange, orderedTabs, projectId]);

  const createTab = useCallback(async () => {
    if (!projectId || !estimateId || !lifecycleActionsReady || !canCreateTabs) return;
    setPendingAction("create");
    setError("");
    try {
      const result = await createEstimateTab({ projectId, estimateId, name: getNextTabName(orderedTabs) });
      if (result.tabs) onTabsChange?.(result.tabs);
      suppressNextSelectionAnnouncementRef.current = true;
      onTabChange(result.estimateTabId);
      const nextTab = result.tabs?.find((tab) => tab.id === result.estimateTabId);
      setAnnouncement(`Created ${nextTab?.name ?? "tab"}.`);
      if (nextTab) beginRename(nextTab);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not create tab.");
    } finally {
      setPendingAction(null);
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
  useEffect(() => {
    onCreateTabStateChange?.({ canCreate, pending: actionPending });
  }, [canCreate, actionPending, onCreateTabStateChange]);

  const releaseMenuCloseFocusToActiveTab = useCallback(() => {
    if (!manageMenuCloseFocusRef.current) return;
    manageMenuCloseFocusRef.current = false;
    pendingFocusTabIdRef.current = null;
    window.requestAnimationFrame(() => focusTab(activeIndex));
  }, [activeIndex, focusTab]);

  const duplicateTab = useCallback(async (tabId: string) => {
    if (!projectId || !estimateId || !lifecycleActionsReady) return;
    manageMenuCloseFocusRef.current = true;
    setPendingAction("duplicate");
    setError("");
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
        setAnnouncement(`Duplicated ${nextTab?.name ?? "tab"}.`);
      } else {
        releaseMenuCloseFocusToActiveTab();
      }
    } catch (duplicateError) {
      releaseMenuCloseFocusToActiveTab();
      setError(duplicateError instanceof Error ? duplicateError.message : "Could not duplicate tab.");
    } finally {
      setPendingAction(null);
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

    setPendingAction("reorder");
    setError("");
    try {
      const result = await reorderEstimateTabs({
        projectId,
        estimateId,
        updates: reordered.map((tab, index) => ({ id: tab.id, sortOrder: index })),
      });
      onTabsChange?.(result.tabs ?? reordered.map((tab, index) => ({ ...tab, sortOrder: index })));
      setAnnouncement(`${moved.name} tab moved ${direction < 0 ? "left" : "right"}.`);
      window.requestAnimationFrame(() => focusTab(nextIndex));
    } catch (reorderError) {
      setError(reorderError instanceof Error ? reorderError.message : "Could not reorder tabs.");
    } finally {
      setPendingAction(null);
    }
  }, [estimateId, focusTab, lifecycleActionsReady, onTabsChange, orderedTabs, projectId, resolvedActiveTabId]);

  const deleteTab = useCallback(async (tabId: string) => {
    if (!projectId || !estimateId || !lifecycleActionsReady || orderedTabs.length < 2) return;
    const targetTab = orderedTabs.find((tab) => tab.id === tabId);
    if (!targetTab) return;
    const targetIndex = orderedTabs.findIndex((tab) => tab.id === tabId);
    const targetWasActive = tabId === resolvedActiveTabId;
    if (targetWasActive) manageMenuCloseFocusRef.current = true;

    setPendingAction("delete");
    setError("");
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
      setAnnouncement(`${targetTab.name} tab deleted.`);
    } catch (deleteError) {
      // The menu already closed with focus held off the trigger; hand focus back
      // to the active tab so keyboard users keep their place after a failed delete.
      releaseMenuCloseFocusToActiveTab();
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete tab.");
    } finally {
      setPendingAction(null);
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
        const displayName = getTabDisplayName(tab, index);
        return {
          id: tab.id,
          label: isEditing ? (
            <span className="inline-flex max-w-44 items-center ring-1 ring-inset ring-focus" data-estimate-tab-id={tab.id}>
                <input
                  ref={attachRenameInputRef}
                  size={Math.max(editingName.length, 3)}
                  className="min-w-0 max-w-[150px] bg-transparent text-[10px] font-medium leading-none text-ink outline-none"
                  aria-label={`Rename ${displayName} tab`}
                  value={editingName}
                  disabled={pendingAction === "rename"}
                  onChange={(event) => setEditingName(event.target.value)}
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
                      setEditingTabId(null);
                      setError("");
                    }
                  }}
                />
              </span>
          ) : (
            <span className="truncate" data-estimate-tab-id={tab.id}>{displayName}</span>
          ),
        };
      }),
    [attachRenameInputRef, commitRename, editingName, editingTabId, orderedTabs, pendingAction],
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
        onContextMenu: () => setContextMenuTabId(tab.id),
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
      {error ? <p role="alert" className="px-2 pb-1 text-[10px] leading-4 text-danger">{error}</p> : null}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </div>
  );
});
