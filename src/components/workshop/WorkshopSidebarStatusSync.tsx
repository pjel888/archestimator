"use client";

import { useLayoutEffect } from "react";

import type { MainSidebarStatus } from "@/components/sidebar/MainSidebar";
import { useWorkshopSidebarStatusStore } from "@/stores/workshop-sidebar-status-store";

/** Writes home-page pending-invite badge into the layout-owned sidebar store. */
export function WorkshopSidebarStatusSync({ status }: { status: MainSidebarStatus }) {
  const setStatus = useWorkshopSidebarStatusStore((state) => state.setStatus);

  useLayoutEffect(() => {
    setStatus(status);
    return () => {
      setStatus(undefined);
    };
  }, [setStatus, status]);

  return null;
}
