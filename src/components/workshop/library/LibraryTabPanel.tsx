"use client";

import type { ReactNode } from "react";
import { usePathname, useSelectedLayoutSegments } from "next/navigation";

import { getLibraryActiveTab, LIBRARY_TABS_ID_BASE } from "./library-tabs-model";

/**
 * Library Optimization Plan P3 T21 (F27): labels the Library tab content region as the
 * `role="tabpanel"` controlled by the active tab in LibraryTabsLayoutClient, completing
 * the tab/panel ARIA relationship used by the Projects-style underline Tabs.
 * On the template-editor sub-route the breadcrumb owns orientation and the tabs are
 * hidden, so the panel semantics are dropped there too.
 */
export function LibraryTabPanel({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const segments = useSelectedLayoutSegments();
  const isTemplateEditorRoute = segments[0] === "templates" && segments.length > 1;

  // The editor sub-route has no tab strip; render children without panel semantics.
  if (isTemplateEditorRoute) return <>{children}</>;

  const activeTab = getLibraryActiveTab(pathname);
  // `display: contents` keeps this wrapper layout-transparent (the route's own root box
  // handles flex/height/overflow) while still exposing the tabpanel role to AT.
  return (
    <div
      role="tabpanel"
      id={`${LIBRARY_TABS_ID_BASE}-panel-${activeTab}`}
      aria-labelledby={`${LIBRARY_TABS_ID_BASE}-tab-${activeTab}`}
      className="contents"
    >
      {children}
    </div>
  );
}
