import { DownloadSimple, FilePdf } from "@phosphor-icons/react";

import { ButtonLink } from "@/components/ui/button";

export type ArtifactViewerProps = {
  contentUrl: string;
  downloadUrl?: string | null;
  fileName: string;
  revisionLabel?: string | null;
  sizeLabel?: string | null;
  title: string;
};

export function ArtifactViewer({
  contentUrl,
  downloadUrl,
  fileName,
  revisionLabel,
  sizeLabel,
  title,
}: ArtifactViewerProps) {
  return (
    <section className="grid min-h-0 gap-2" aria-label={`${title} document viewer`}>
      <header className="flex flex-wrap items-center justify-between gap-2 rounded-xs border border-hairline bg-white px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <FilePdf className="shrink-0 text-secondary" size={16} aria-hidden="true" />
          <div className="min-w-0">
            <h3 className="truncate text-[10px] font-medium text-ink">{title}</h3>
            <p className="truncate text-[9px] text-tertiary">
              {[fileName, revisionLabel, sizeLabel].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
        {downloadUrl ? (
          <ButtonLink href={downloadUrl} size="xs" variant="secondary">
            <DownloadSimple size={13} aria-hidden="true" /> Download
          </ButtonLink>
        ) : null}
      </header>
      <div className="h-[min(68vh,760px)] min-h-96 overflow-hidden rounded-xs border border-hairline bg-surfaceMuted">
        <iframe className="h-full w-full bg-white" src={contentUrl} title={`${title} PDF preview`} />
      </div>
    </section>
  );
}
