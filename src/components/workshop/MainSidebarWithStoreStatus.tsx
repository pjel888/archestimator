"use client";

import { MainSidebar, type MainSidebarStatus } from "@/components/sidebar/MainSidebar";
import type { MainSidebarFavoriteProject } from "@/components/sidebar/sidebar-types";
import { useWorkshopSidebarStatusStore } from "@/stores/workshop-sidebar-status-store";

type MainSidebarUser = {
  displayName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
};

type MainSidebarWithStoreStatusProps = {
  favoriteProjects?: MainSidebarFavoriteProject[];
  favoriteProjectsFresh?: boolean;
  favoritesScope?: { workspaceId: string; userId: string } | null;
  status?: MainSidebarStatus;
  user?: MainSidebarUser;
};

/** Merges layout/prop status with OPEN-1 home-page store writes. */
export function MainSidebarWithStoreStatus({
  status,
  ...props
}: MainSidebarWithStoreStatusProps) {
  const storeStatus = useWorkshopSidebarStatusStore((state) => state.status);
  return <MainSidebar {...props} status={storeStatus ?? status} />;
}
