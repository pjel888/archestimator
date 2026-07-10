import type { ReactNode } from "react";

import { LibraryTabPanel } from "@/components/workshop/library/LibraryTabPanel";
import { LibraryTabsLayoutClient } from "@/components/workshop/library/LibraryTabsLayoutClient";
import { LibraryTitleBarClient } from "@/components/workshop/library/LibraryTitleBarClient";
import { WorkshopCanvasWash } from "@/components/workshop/WorkshopCanvasWash";
import { WorkshopRouteHeader } from "@/components/workshop/WorkshopRouteHeader";

export default function LibraryLayout({ children }: { children: ReactNode }) {
  return (
    <WorkshopRouteHeader
      title="Library"
      eyebrow="Library"
      showEyebrow={false}
      breadcrumbs={["Library"]}
      contentClassName=""
      titleSlot={<LibraryTitleBarClient />}
      subHeader={<LibraryTabsLayoutClient />}
    >
      <WorkshopCanvasWash className="library-canvas-wash" />
      <LibraryTabPanel>{children}</LibraryTabPanel>
    </WorkshopRouteHeader>
  );
}
