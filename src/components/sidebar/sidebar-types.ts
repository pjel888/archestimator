export const SIDEBAR_WIDTH_EXPANDED = 288;
export const SIDEBAR_PADDING = 8;
const SIDEBAR_ICON_SLOT = 48;
export const SIDEBAR_WIDTH_COLLAPSED = SIDEBAR_PADDING * 2 + SIDEBAR_ICON_SLOT;
/**
 * Outer corner radius of the floating glass panel (matches the `--glass-radius`
 * CSS token). Used inline for the collapse clip-path rounding.
 */
export const SIDEBAR_GLASS_RADIUS = 12;
// NOTE: the floating rail inset (8px) and the content offset (80px) live as the
// `--sidebar-content-offset` CSS token in globals.css — the single runtime source
// both shells consume via `lg:pl-[var(--sidebar-content-offset)]`, so they can't
// drift. Geometry: INSET(8) + COLLAPSED(64) + GAP(8) = 80.
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
  /**
   * Latest favorite timestamp for sorting the sidebar container. For sheet-only
   * containers this is the newest nested sheet favorite.
   */
  favoriteCreatedAt: string;
  href: string;
  id: string;
  name: string;
  projectCode: string | null;
  /**
   * Timestamp for the project favorite itself. `null` means the project is only
   * present as a grouping parent for favorite estimate sheets. Undefined is
   * treated as a legacy project-favorite container.
   */
  projectFavoriteCreatedAt?: string | null;
};
