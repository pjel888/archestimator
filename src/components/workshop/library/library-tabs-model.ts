export type LibraryTabId = "overview" | "components" | "templates";

export const LIBRARY_TABS_ID_BASE = "library";

export function getLibraryActiveTab(pathname: string | null): LibraryTabId {
  if (pathname === "/workshop/library") return "overview";
  if (pathname?.startsWith("/workshop/library/templates")) return "templates";
  return "components";
}
