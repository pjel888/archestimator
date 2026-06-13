"use client";

import { usePathname, useSelectedLayoutSegments } from "next/navigation";
import { Blueprint, Package, SquaresFour } from "@phosphor-icons/react/dist/ssr";

import { TabStrip } from "@/components/ui/tab-strip";

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

const LIBRARY_TABS = [
  {
    id: "overview" as const,
    label: "Overview",
    href: "/workshop/library",
    icon: <SquaresFour />,
  },
  {
    id: "components" as const,
    label: "Components",
    href: "/workshop/library/components",
    icon: <Package />,
  },
  {
    id: "templates" as const,
    label: "Templates",
    href: "/workshop/library/templates",
    icon: <Blueprint />,
  },
] satisfies Array<{ id: LibraryTabId; label: string; href: string; icon: React.ReactNode }>;

/**
 * Page-level tab strip for the unified Library surface. Lives in the
 * library layout so the strip persists across tab navigation; hidden on
 * the template editor route, where the breadcrumb owns orientation.
 */
export function LibraryTabsLayoutClient() {
  const pathname = usePathname();
  const segments = useSelectedLayoutSegments();

  const isTemplateEditorRoute = segments[0] === "templates" && segments.length > 1;
  if (isTemplateEditorRoute) return null;

  const activeTab = getLibraryActiveTab(pathname);

  return <TabStrip tabs={LIBRARY_TABS} activeTab={activeTab} ariaLabel="Library sections" idBase={LIBRARY_TABS_ID_BASE} />;
}
