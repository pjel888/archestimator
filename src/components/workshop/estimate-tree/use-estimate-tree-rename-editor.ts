"use client";

import { useCallback, useEffect, useRef } from "react";

import type { EstimateTreeNode } from "@/components/workshop/estimate-tree-data";

type StateUpdater<T> = T | ((current: T) => T);

type UseEstimateTreeRenameEditorInput = {
  editingNodeId: string | null;
  canEditEstimate: boolean;
  isTreeMutationSaving: boolean;
  setEditingNodeId: (nodeId: StateUpdater<string | null>) => void;
  setEditingNodeName: (name: string) => void;
  setEditingNodeError: (error: string | null) => void;
};

export function useEstimateTreeRenameEditor({
  editingNodeId,
  canEditEstimate,
  isTreeMutationSaving,
  setEditingNodeId,
  setEditingNodeName,
  setEditingNodeError,
}: UseEstimateTreeRenameEditorInput) {
  const skipRenameAutoSelectRef = useRef(false);
  const renameDraftDirtyRef = useRef(false);
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const suppressContextMenuCloseAutoFocusRef = useRef(false);
  const ignoreRenameBlurDuringContextMenuCloseRef = useRef(false);

  useEffect(() => {
    if (!editingNodeId) {
      suppressContextMenuCloseAutoFocusRef.current = false;
      ignoreRenameBlurDuringContextMenuCloseRef.current = false;
      return undefined;
    }
    if (skipRenameAutoSelectRef.current) {
      skipRenameAutoSelectRef.current = false;
      const input = renameInputRef.current;
      if (input) {
        if (document.activeElement !== input) input.focus();
        if (renameDraftDirtyRef.current) {
          const caretPosition = input.value.length;
          input.setSelectionRange(caretPosition, caretPosition);
        } else {
          input.select();
        }
      }
      return undefined;
    }

    let focusAnimationFrame: number | null = null;
    let focusTimeout: number | null = null;
    const focusAndSelectRenameInput = () => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    };
    const menuCloseAnimationFrame = window.requestAnimationFrame(() => {
      focusAnimationFrame = window.requestAnimationFrame(() => {
        focusAndSelectRenameInput();
        focusTimeout = window.setTimeout(() => {
          focusAndSelectRenameInput();
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
  }, [editingNodeId]);

  const attachRenameInputRef = useCallback((input: HTMLInputElement | null) => {
    renameInputRef.current = input;
    if (!input || document.activeElement === input) return;
    if (suppressContextMenuCloseAutoFocusRef.current || ignoreRenameBlurDuringContextMenuCloseRef.current) return;
    input.focus();
    if (renameDraftDirtyRef.current) {
      const caretPosition = input.value.length;
      input.setSelectionRange(caretPosition, caretPosition);
    } else {
      input.select();
    }
  }, []);

  const armContextMenuRenameHandoff = useCallback(() => {
    suppressContextMenuCloseAutoFocusRef.current = true;
    ignoreRenameBlurDuringContextMenuCloseRef.current = true;
  }, []);

  const beginRenameNode = useCallback((node: EstimateTreeNode, options?: { fromContextMenu?: boolean }) => {
    if (!canEditEstimate || isTreeMutationSaving) return;
    if (options?.fromContextMenu) {
      armContextMenuRenameHandoff();
    } else {
      suppressContextMenuCloseAutoFocusRef.current = false;
      ignoreRenameBlurDuringContextMenuCloseRef.current = false;
    }
    renameDraftDirtyRef.current = false;
    setEditingNodeId(node.id);
    setEditingNodeName(node.name);
    setEditingNodeError(null);
  }, [
    armContextMenuRenameHandoff,
    canEditEstimate,
    isTreeMutationSaving,
    setEditingNodeError,
    setEditingNodeId,
    setEditingNodeName,
  ]);

  const beginRenameForCreatedNode = useCallback((nodeId: string, name: string) => {
    renameDraftDirtyRef.current = false;
    setEditingNodeId(nodeId);
    setEditingNodeName(name);
    setEditingNodeError(null);
  }, [setEditingNodeError, setEditingNodeId, setEditingNodeName]);

  const cancelRenameNode = useCallback(() => {
    suppressContextMenuCloseAutoFocusRef.current = false;
    ignoreRenameBlurDuringContextMenuCloseRef.current = false;
    setEditingNodeId(null);
    setEditingNodeName("");
    setEditingNodeError(null);
  }, [setEditingNodeError, setEditingNodeId, setEditingNodeName]);

  const remapEditingNodeId = useCallback((fromNodeId: string, toNodeId: string) => {
    setEditingNodeId((current) => {
      if (current !== fromNodeId) return current;
      skipRenameAutoSelectRef.current = true;
      return toNodeId;
    });
  }, [setEditingNodeId]);

  const resetContextMenuRenameHandoff = useCallback(() => {
    suppressContextMenuCloseAutoFocusRef.current = false;
    ignoreRenameBlurDuringContextMenuCloseRef.current = false;
  }, []);

  const focusAndSelectRenameInput = useCallback(() => {
    renameInputRef.current?.focus();
    renameInputRef.current?.select();
  }, []);

  const markRenameDraftDirty = useCallback(() => {
    renameDraftDirtyRef.current = true;
  }, []);

  const shouldIgnoreRenameBlur = useCallback((draftName: string, originalName: string) => (
    ignoreRenameBlurDuringContextMenuCloseRef.current && draftName === originalName
  ), []);

  const handleContextMenuCloseAutoFocus = useCallback((event: Event) => {
    if (!suppressContextMenuCloseAutoFocusRef.current) return;
    event.preventDefault();
    window.setTimeout(() => {
      focusAndSelectRenameInput();
      suppressContextMenuCloseAutoFocusRef.current = false;
      ignoreRenameBlurDuringContextMenuCloseRef.current = false;
    }, 0);
  }, [focusAndSelectRenameInput]);

  return {
    armContextMenuRenameHandoff,
    attachRenameInputRef,
    beginRenameForCreatedNode,
    beginRenameNode,
    cancelRenameNode,
    focusAndSelectRenameInput,
    handleContextMenuCloseAutoFocus,
    markRenameDraftDirty,
    remapEditingNodeId,
    resetContextMenuRenameHandoff,
    shouldIgnoreRenameBlur,
  };
}
