"use client";

import { usePathname, useSelectedLayoutSegments } from "next/navigation";
import { Blueprint, Package } from "@phosphor-icons/react/dist/ssr";

import { TabStrip } from "@/components/ui/tab-strip";

type LibraryTabId = "components" | "templates";

const LIBRARY_TABS = [
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

  const activeTab: LibraryTabId = pathname?.startsWith("/workshop/library/templates")
    ? "templates"
    : "components";

  return <TabStrip tabs={LIBRARY_TABS} activeTab={activeTab} ariaLabel="Library sections" />;
}
