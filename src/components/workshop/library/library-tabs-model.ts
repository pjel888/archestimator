export type LibraryTabId = "overview" | "components" | "templates";

// Library Optimization Plan P3 T21 (F27): shared idBase so the tab strip emits
// role="tab" + aria-controls, and LibraryTabPanel can label the content region as the
// matching role="tabpanel". Keep the active-tab derivation in one place.
export const LIBRARY_TABS_ID_BASE = "library";

export function getLibraryActiveTab(pathname: string | null): LibraryTabId {
  if (pathname === "/workshop/library") return "overview";
  if (pathname?.startsWith("/workshop/library/templates")) return "templates";
  return "components";
}
