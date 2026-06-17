export const SIDEBAR_WIDTH_EXPANDED = 288;
export const SIDEBAR_PADDING = 8;
export const SIDEBAR_ICON_SLOT = 48;
export const SIDEBAR_WIDTH_COLLAPSED = SIDEBAR_PADDING * 2 + SIDEBAR_ICON_SLOT;
export const SIDEBAR_BACKGROUND_COLOR = "#eeeeee";
export const SIDEBAR_TRANSITION = {
  expandDuration: 160,
  collapseDuration: 130,
  easing: "cubic-bezier(0.22, 1, 0.36, 1)",
} as const;

export type SidebarNavItem = {
  badgeCount?: number;
  badgeLabel?: string;
  id: string;
  href: string;
  label: string;
  shortcut?: string;
};

export type MainSidebarFavoriteEstimateSheet = {
  href: string;
  id: string;
  name: string;
  projectId: string;
  sheetCode: string | null;
  favoriteCreatedAt: string;
};

export type MainSidebarFavoriteProject = {
  favoriteEstimateSheets: MainSidebarFavoriteEstimateSheet[];
  href: string;
  id: string;
  name: string;
  projectCode: string | null;
  favoriteCreatedAt: string;
};
