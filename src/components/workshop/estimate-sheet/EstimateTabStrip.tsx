"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { CopySimple, PencilSimple, Plus, Trash } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { ContextActionMenuContent, type ActionMenuGroup } from "@/components/ui/action-menu";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu";
import {
  archiveEstimateTab,
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
  className?: string;
};

type PendingAction = "create" | "duplicate" | "rename" | "reorder" | "archive" | "delete" | null;

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
  const usedNames = new Set(tabs.map((tab) => tab.name.toLowerCase()));
  let index = tabs.length + 1;
  while (usedNames.has(`tab ${index}`)) index += 1;
  return `Tab ${index}`;
}

function sortTabs(tabs: readonly EstimateTabSummary[]) {
  return [...tabs].sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name));
}

export function EstimateTabStrip({
  tabs,
  activeTabId,
  projectId,
  estimateId,
  onTabChange,
  onTabsChange,
  enableLifecycleActions = false,
  canCreateTabs = false,
  className,
}: EstimateTabStripProps) {
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
    const nextName = editingName.trim();
    if (!nextName) {
      setError("Tab name is required.");
      return;
    }
    const currentTab = orderedTabs.find((tab) => tab.id === editingTabId);
    if (currentTab?.name === nextName) {
      setEditingTabId(null);
      setError("");
      window.requestAnimationFrame(() => focusTab(activeIndex));
      return;
    }

    setPendingAction("rename");
    setError("");
    try {
      const result = await renameEstimateTab({ projectId, estimateId, tabId: editingTabId, name: nextName });
      if (result.tabs) onTabsChange?.(result.tabs);
      setEditingTabId(null);
      setAnnouncement(`Renamed tab to ${nextName}.`);
      window.requestAnimationFrame(() => focusTab(activeIndex));
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : "Could not rename tab.");
    } finally {
      setPendingAction(null);
    }
  }, [activeIndex, editingName, editingTabId, estimateId, focusTab, onTabsChange, orderedTabs, projectId]);

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

  const duplicateTab = useCallback(async (tabId: string) => {
    if (!projectId || !estimateId || !lifecycleActionsReady) return;
    manageMenuCloseFocusRef.current = true;
    setPendingAction("duplicate");
    setError("");
    try {
      const result = await duplicateEstimateTab({ projectId, estimateId, tabId });
      if (result.tabs) onTabsChange?.(result.tabs);
      suppressNextSelectionAnnouncementRef.current = true;
      onTabChange(result.estimateTabId);
      pendingFocusTabIdRef.current = result.estimateTabId;
      const nextTab = result.tabs?.find((tab) => tab.id === result.estimateTabId);
      setAnnouncement(`Duplicated ${nextTab?.name ?? "tab"}.`);
    } catch (duplicateError) {
      manageMenuCloseFocusRef.current = false;
      setError(duplicateError instanceof Error ? duplicateError.message : "Could not duplicate tab.");
    } finally {
      setPendingAction(null);
    }
  }, [estimateId, lifecycleActionsReady, onTabChange, onTabsChange, projectId]);

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

  const archiveOrDeleteTab = useCallback(async (action: "archive" | "delete", tabId: string) => {
    if (!projectId || !estimateId || !lifecycleActionsReady || orderedTabs.length < 2) return;
    const targetTab = orderedTabs.find((tab) => tab.id === tabId);
    if (!targetTab) return;
    const targetIndex = orderedTabs.findIndex((tab) => tab.id === tabId);
    const targetWasActive = tabId === resolvedActiveTabId;
    if (targetWasActive) manageMenuCloseFocusRef.current = true;

    setPendingAction(action);
    setError("");
    try {
      const result = action === "archive"
        ? await archiveEstimateTab({ projectId, estimateId, tabId })
        : await deleteEstimateTab({ projectId, estimateId, tabId });
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
      setAnnouncement(`${targetTab.name} tab ${action === "archive" ? "archived" : "deleted"}.`);
    } catch (actionError) {
      manageMenuCloseFocusRef.current = false;
      setError(actionError instanceof Error ? actionError.message : `Could not ${action} tab.`);
    } finally {
      setPendingAction(null);
    }
  }, [estimateId, lifecycleActionsReady, onTabChange, onTabsChange, orderedTabs, projectId, resolvedActiveTabId]);

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
            onSelect: () => void archiveOrDeleteTab("delete", targetTab.id),
          },
        ],
      },
    ];
  }, [archiveOrDeleteTab, beginRename, contextMenuTabId, duplicateTab, orderedTabs, pendingAction]);

  const handleTabKeyDown = useCallback((event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const moveFocus = (nextIndex: number) => {
      event.preventDefault();
      focusTab(nextIndex);
    };

    if ((event.metaKey || event.ctrlKey) && event.shiftKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      event.preventDefault();
      void moveActiveTab(event.key === "ArrowLeft" ? -1 : 1);
      return;
    }

    if (event.key === "ArrowRight") {
      moveFocus((index + 1) % orderedTabs.length);
      return;
    }
    if (event.key === "ArrowLeft") {
      moveFocus((index - 1 + orderedTabs.length) % orderedTabs.length);
      return;
    }
    if (event.key === "Home") {
      moveFocus(0);
      return;
    }
    if (event.key === "End") {
      moveFocus(orderedTabs.length - 1);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const tab = orderedTabs[index];
      if (tab) onTabChange(tab.id);
      return;
    }
    if (event.key === "F2") {
      const tab = orderedTabs[index];
      if (tab) beginRename(tab);
    }
  }, [beginRename, focusTab, moveActiveTab, onTabChange, orderedTabs]);

  const tabListRegion = (
    <div
      className="flex min-h-8 items-end gap-1 overflow-x-auto px-2 pt-1"
      role="tablist"
      aria-label="Estimate tabs"
      onContextMenu={(event) => {
        // Only a tab opens the menu; right-clicks on the "+" or empty strip
        // space keep it closed (mirrors EstimateSheetTree).
        if (!(event.target instanceof Element) || !event.target.closest("[data-estimate-tab-id]")) {
          event.preventDefault();
        }
      }}
    >
      {orderedTabs.map((tab, index) => {
        const isActive = tab.id === resolvedActiveTabId;
        const isEditing = editingTabId === tab.id;
        return (
          <div key={tab.id} className="flex h-7 shrink-0 items-end">
            {isEditing ? (
              <input
                ref={attachRenameInputRef}
                className="h-7 w-32 rounded-xs border border-hairline bg-white px-2 text-[10px] font-medium leading-none text-ink outline-none focus:ring-2 focus:ring-focus"
                aria-label={`Rename ${tab.name} tab`}
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
            ) : (
              <button
                ref={(element) => {
                  tabRefs.current[index] = element;
                }}
                type="button"
                role="tab"
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                data-estimate-tab-id={tab.id}
                className={cn(
                  "relative inline-flex h-7 max-w-44 items-center gap-1 rounded-xs border border-b-0 px-3 text-[10px] font-medium leading-none tracking-normal transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                  isActive
                    ? "z-10 -mb-px border-hairline bg-white text-ink"
                    : "border-transparent bg-surfaceMuted text-tertiary hover:border-hairline hover:text-ink",
                )}
                onClick={() => onTabChange(tab.id)}
                onDoubleClick={() => beginRename(tab)}
                onContextMenu={() => setContextMenuTabId(tab.id)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                onDragOver={(event) => scheduleSpringLoadedTabTarget(event, tab.id)}
                onDragLeave={clearSpringLoadedTabTarget}
                onDrop={(event) => handleTabDrop(event, tab.id)}
              >
                <span className="truncate">{tab.name}</span>
                {tab.isDefault ? <span className="text-[8px] font-normal leading-none text-tertiary">Default</span> : null}
              </button>
            )}
          </div>
        );
      })}
      {lifecycleActionsReady && canCreateTabs ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="mb-0.5 size-6 shrink-0 rounded-xs text-tertiary"
          aria-label="Create tab"
          disabled={Boolean(pendingAction)}
          onClick={() => void createTab()}
        >
          <Plus size={12} weight="regular" aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  );

  return (
    <div className={cn("shrink-0 border-b border-hairline bg-surfaceMuted", className)} data-estimate-tab-strip>
      {lifecycleActionsReady ? (
        <ContextMenu>
          <ContextMenuTrigger asChild>{tabListRegion}</ContextMenuTrigger>
          <ContextMenuContent
            data-estimate-tab-context-menu="true"
            alignOffset={4}
            onCloseAutoFocus={handleContextMenuCloseAutoFocus}
          >
            <ContextActionMenuContent groups={contextMenuGroups} />
          </ContextMenuContent>
        </ContextMenu>
      ) : (
        tabListRegion
      )}
      {error ? <p role="alert" className="px-2 pb-1 text-[10px] leading-4 text-danger">{error}</p> : null}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}
