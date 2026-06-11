import type { ReactNode } from "react";

import { LibraryTabsLayoutClient } from "@/components/workshop/library/LibraryTabsLayoutClient";
import { WorkshopPageShell } from "@/components/workshop/WorkshopPageShell";

export default function LibraryLayout({ children }: { children: ReactNode }) {
  return (
    <WorkshopPageShell
      title="Library"
      eyebrow="Library"
      showEyebrow={false}
      breadcrumbs={["Library"]}
      contentClassName=""
      subHeader={<LibraryTabsLayoutClient />}
    >
      {children}
    </WorkshopPageShell>
  );
}
