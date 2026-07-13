import { ArchestimatorWordmark } from "@/components/brand/ArchestimatorWordmark";
import type { ProjectPublicationSnapshot } from "@/lib/publication/types";

export function SharePageFooter({ snapshot }: { snapshot: ProjectPublicationSnapshot }) {
  return (
    <footer className="share-print-hidden mt-auto flex min-h-14 items-center justify-between gap-3 border-t border-hairline text-[10px] leading-[14px] text-secondary" data-share-page-footer>
      <p>Private proposal link</p>
      {snapshot.project.showArchestimatorBranding !== false ? <ArchestimatorWordmark className="text-[10px] text-ink" /> : null}
    </footer>
  );
}
