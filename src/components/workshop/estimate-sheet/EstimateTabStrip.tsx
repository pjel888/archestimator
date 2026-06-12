"use client";

import { useCallback, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { CopySimple, PencilSimple, Plus } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { createEstimateTab, duplicateEstimateTab, renameEstimateTab, reorderEstimateTabs } from "@/lib/estimates/actions";
import type { EstimateTabSummary } from "@/lib/estimates/types";
import { cn } from "@/lib/ui/cn";

export type EstimateTabStripProps = {
  tabs: readonly EstimateTabSummary[];
  activeTabId: string;
  projectId?: string;
  estimateId?: string;
  onTabChange: (tabId: string) => void;
  onTabsChange?: (tabs: EstimateTabSummary[]) => void;
  /**
   * Release gate D-15: lifecycle controls stay hidden in the editor until the
   * tab-aware export phase ships in the same release train. Tests can opt in
   * to exercise the internal path without exposing it in beta UI.
   */
  enableLifecycleActions?: boolean;
  canCreateTabs?: boolean;
  canDuplicateTabs?: boolean;
  className?: string;
};

type PendingAction = "create" | "duplicate" | "rename" | "reorder" | null;

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
  canDuplicateTabs = false,
  className,
}: EstimateTabStripProps) {
  const orderedTabs = useMemo(() => sortTabs(tabs), [tabs]);
  const resolvedActiveTabId = orderedTabs.some((tab) => tab.id === activeTabId)
    ? activeTabId
    : orderedTabs[0]?.id ?? activeTabId;
  const activeIndex = Math.max(0, orderedTabs.findIndex((tab) => tab.id === resolvedActiveTabId));
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [error, setError] = useState("");
  const lifecycleActionsReady = enableLifecycleActions && Boolean(projectId && estimateId);

  const focusTab = useCallback((index: number) => {
    const tab = orderedTabs[index];
    if (!tab) return;
    tabRefs.current[index]?.focus();
  }, [orderedTabs]);

  const beginRename = useCallback((tab: EstimateTabSummary) => {
    if (!lifecycleActionsReady) return;
    setError("");
    setEditingTabId(tab.id);
    setEditingName(tab.name);
  }, [lifecycleActionsReady]);

  const commitRename = useCallback(async () => {
    if (!projectId || !estimateId || !editingTabId) return;
    const nextName = editingName.trim();
    if (!nextName) {
      setError("Tab name is required.");
      return;
    }
    const currentTab = orderedTabs.find((tab) => tab.id === editingTabId);
    if (currentTab?.name === nextName) {
      setEditingTabId(null);
      setError("");
      return;
    }

    setPendingAction("rename");
    setError("");
    try {
      const result = await renameEstimateTab({ projectId, estimateId, tabId: editingTabId, name: nextName });
      if (result.tabs) onTabsChange?.(result.tabs);
      setEditingTabId(null);
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : "Could not rename tab.");
    } finally {
      setPendingAction(null);
    }
  }, [editingName, editingTabId, estimateId, onTabsChange, orderedTabs, projectId]);

  const createTab = useCallback(async () => {
    if (!projectId || !estimateId || !lifecycleActionsReady || !canCreateTabs) return;
    setPendingAction("create");
    setError("");
    try {
      const result = await createEstimateTab({ projectId, estimateId, name: getNextTabName(orderedTabs) });
      if (result.tabs) onTabsChange?.(result.tabs);
      onTabChange(result.estimateTabId);
      const nextTab = result.tabs?.find((tab) => tab.id === result.estimateTabId);
      if (nextTab) beginRename(nextTab);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not create tab.");
    } finally {
      setPendingAction(null);
    }
  }, [beginRename, canCreateTabs, estimateId, lifecycleActionsReady, onTabChange, onTabsChange, orderedTabs, projectId]);

  const duplicateActiveTab = useCallback(async () => {
    if (!projectId || !estimateId || !lifecycleActionsReady || !canDuplicateTabs) return;
    setPendingAction("duplicate");
    setError("");
    try {
      const result = await duplicateEstimateTab({ projectId, estimateId, tabId: resolvedActiveTabId });
      if (result.tabs) onTabsChange?.(result.tabs);
      onTabChange(result.estimateTabId);
    } catch (duplicateError) {
      setError(duplicateError instanceof Error ? duplicateError.message : "Could not duplicate tab.");
    } finally {
      setPendingAction(null);
    }
  }, [canDuplicateTabs, estimateId, lifecycleActionsReady, onTabChange, onTabsChange, projectId, resolvedActiveTabId]);

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
      window.requestAnimationFrame(() => focusTab(nextIndex));
    } catch (reorderError) {
      setError(reorderError instanceof Error ? reorderError.message : "Could not reorder tabs.");
    } finally {
      setPendingAction(null);
    }
  }, [estimateId, focusTab, lifecycleActionsReady, onTabsChange, orderedTabs, projectId, resolvedActiveTabId]);

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

  return (
    <div className={cn("shrink-0 border-b border-hairline bg-surfaceMuted", className)} data-estimate-tab-strip>
      <div className="flex min-h-8 items-end gap-1 overflow-x-auto px-2 pt-1" role="tablist" aria-label="Estimate tabs">
        {orderedTabs.map((tab, index) => {
          const isActive = tab.id === resolvedActiveTabId;
          const isEditing = editingTabId === tab.id;
          return (
            <div key={tab.id} className="flex h-7 shrink-0 items-end">
              {isEditing ? (
                <input
                  className="h-7 w-32 rounded-xs border border-hairline bg-white px-2 text-[10px] font-medium leading-none text-ink outline-none focus:ring-2 focus:ring-focus"
                  aria-label={`Rename ${tab.name} tab`}
                  value={editingName}
                  autoFocus
                  disabled={pendingAction === "rename"}
                  onChange={(event) => setEditingName(event.target.value)}
                  onBlur={() => void commitRename()}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void commitRename();
                    }
                    if (event.key === "Escape") {
                      event.preventDefault();
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
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
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
        {lifecycleActionsReady && canDuplicateTabs ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="mb-0.5 size-6 shrink-0 rounded-xs text-tertiary"
            aria-label="Duplicate tab"
            disabled={Boolean(pendingAction)}
            onClick={() => void duplicateActiveTab()}
          >
            <CopySimple size={12} weight="regular" aria-hidden="true" />
          </Button>
        ) : null}
        {lifecycleActionsReady ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="mb-0.5 size-6 shrink-0 rounded-xs text-tertiary"
            aria-label="Rename active tab"
            disabled={Boolean(pendingAction)}
            onClick={() => {
              const activeTab = orderedTabs[activeIndex];
              if (activeTab) beginRename(activeTab);
            }}
          >
            <PencilSimple size={12} weight="regular" aria-hidden="true" />
          </Button>
        ) : null}
      </div>
      {error ? <p role="alert" className="px-2 pb-1 text-[10px] leading-4 text-danger">{error}</p> : null}
    </div>
  );
}
