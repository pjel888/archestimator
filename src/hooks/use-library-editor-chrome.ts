"use client";

import { create } from "zustand";

export type LibraryEditorBreadcrumb = {
  templateId: string;
  templateName: string;
  category: string;
};

export type LibraryEditorSaveState =
  | { state: "saved" }
  | { state: "saving" }
  | { state: "error"; message: string };

type LibraryEditorChromeState = {
  /** Set by the template editor page so the layout title bar can render its breadcrumb. */
  breadcrumb: LibraryEditorBreadcrumb | null;
  saveState: LibraryEditorSaveState;
  setBreadcrumb: (breadcrumb: LibraryEditorBreadcrumb) => void;
  clearBreadcrumb: (templateId: string) => void;
  setSaveState: (saveState: LibraryEditorSaveState) => void;
};

/**
 * Ephemeral, memory-only bridge between the template editor page and the
 * library layout's title bar (pages cannot pass props up to layouts).
 * Mirrors the workspace-state store pattern: no persistence.
 */
export const useLibraryEditorChrome = create<LibraryEditorChromeState>((set) => ({
  breadcrumb: null,
  saveState: { state: "saved" },
  setBreadcrumb: (breadcrumb) => set({ breadcrumb }),
  clearBreadcrumb: (templateId) =>
    set((state) =>
      state.breadcrumb?.templateId === templateId
        ? { breadcrumb: null, saveState: { state: "saved" } }
        : state,
    ),
  setSaveState: (saveState) => set({ saveState }),
}));
