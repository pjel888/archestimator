"use client";

import { create } from "zustand";

import type { MainSidebarStatus } from "@/components/sidebar/MainSidebar";

type WorkshopSidebarStatusState = {
  status: MainSidebarStatus | undefined;
  setStatus: (status: MainSidebarStatus | undefined) => void;
};

/**
 * OPEN-1 default: home page writes pending-invite badge count; MainSidebar
 * (inside layout-owned WorkshopShell) reads it. Layout cannot receive child props.
 */
export const useWorkshopSidebarStatusStore = create<WorkshopSidebarStatusState>((set) => ({
  status: undefined,
  setStatus: (status) => set({ status }),
}));
