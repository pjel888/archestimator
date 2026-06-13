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
          <p className="text-[12px] font-medium uppercase leading-[16px] tracking-normal text-tertiary">Proposal Review</p>
          <h1 className="mt-1.5 text-[22px] font-medium leading-[28px] tracking-normal text-ink lg:text-[26px] lg:leading-[32px]">{project.name}</h1>
          <p className="mt-1 max-w-[600px] text-[13px] leading-[18px] tracking-normal text-secondary">Prepared for your review</p>
          {metaItems.length > 0 ? (
            <p className="mt-1 max-w-[600px] text-[13px] leading-[18px] tracking-normal text-secondary">{metaItems.join(" • ")}</p>
          ) : null}
        </div>
        <div className="shrink-0 rounded-xs border border-hairline bg-surfaceMuted px-2 py-1 text-[12px] font-medium leading-[16px] tracking-normal text-tertiary">
          Awaiting your review
        </div>
      </div>
    </section>
  );
}
