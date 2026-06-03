import type { ProjectPublicationSnapshot } from "@/lib/publication/types";

type SharePageProposalHeaderProps = {
  project: ProjectPublicationSnapshot["project"];
};

export function SharePageProposalHeader({ project }: SharePageProposalHeaderProps) {
  const metaItems = [
    project.clientName ? `Prepared for ${project.clientName}` : null,
    project.projectCode ? `Project ${project.projectCode}` : null,
    project.location,
  ].filter((item): item is string => Boolean(item));

  return (
    <section className="rounded-xs border border-hairline bg-white p-3 text-ink">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[9px] font-medium uppercase leading-3 text-tertiary">Proposal Review</p>
          <h1 className="mt-1.5 truncate text-[12px] font-medium leading-4 text-ink">{project.name}</h1>
          <p className="mt-1 text-[10px] leading-4 text-secondary">Prepared for your review</p>
          {metaItems.length > 0 ? (
            <p className="mt-1 text-[10px] leading-4 text-secondary">{metaItems.join(" • ")}</p>
          ) : null}
        </div>
        <div className="shrink-0 rounded-xs border border-hairline bg-surfaceMuted px-2 py-1 text-[9px] font-medium leading-3 text-tertiary">
          Awaiting your review
        </div>
      </div>
    </section>
  );
}
