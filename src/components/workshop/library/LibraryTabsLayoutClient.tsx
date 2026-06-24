"use client";

import { usePathname, useSelectedLayoutSegments } from "next/navigation";
import { Blueprint, Package, SquaresFour } from "@phosphor-icons/react/dist/ssr";

import { TabStrip } from "@/components/ui/tab-strip";
import { getLibraryActiveTab, LIBRARY_TABS_ID_BASE, type LibraryTabId } from "./library-tabs-model";

const LIBRARY_TABS = [
  {
    id: "overview" as const,
    label: "Overview",
    href: "/workshop/library",
    prefetch: false,
    icon: <SquaresFour />,
  },
  {
    id: "components" as const,
    label: "Components",
    href: "/workshop/library/components",
    prefetch: false,
    icon: <Package />,
  },
  {
    id: "templates" as const,
    label: "Templates",
    href: "/workshop/library/templates",
    prefetch: false,
    icon: <Blueprint />,
  },
] satisfies Array<{ id: LibraryTabId; label: string; href: string; prefetch: false; icon: React.ReactNode }>;

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
