import type { ReactNode } from "react";

import { LibraryTabPanel } from "@/components/workshop/library/LibraryTabPanel";
import { LibraryTabsLayoutClient } from "@/components/workshop/library/LibraryTabsLayoutClient";
import { LibraryTitleBarClient } from "@/components/workshop/library/LibraryTitleBarClient";
import { WorkshopPageShell } from "@/components/workshop/WorkshopPageShell";

export default function LibraryLayout({ children }: { children: ReactNode }) {
  return (
    <WorkshopPageShell
      title="Library"
      eyebrow="Library"
      showEyebrow={false}
      breadcrumbs={["Library"]}
      contentClassName=""
      titleSlot={<LibraryTitleBarClient />}
      subHeader={<LibraryTabsLayoutClient />}
    >
      <LibraryTabPanel>{children}</LibraryTabPanel>
    </WorkshopPageShell>
  );
}
