import type { ProjectPublicationSnapshot } from "@/lib/publication/types";
import { ProposalStatusBadge } from "@/components/share/ProposalStatusBadge";

type SharePageProposalHeaderProps = {
  project: ProjectPublicationSnapshot["project"];
  token?: string;
};

export function SharePageProposalHeader({ project, token }: SharePageProposalHeaderProps) {
  const metaItems = [
    project.projectCode ? `Project ${project.projectCode}` : null,
  ].filter((item): item is string => Boolean(item));

  return (
    <section className="border-b border-hairline pb-3 text-ink">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[9px] font-medium leading-[12px] text-tertiary">Proposal</p>
          <h1 className="mt-1 text-[18px] font-medium leading-[24px] text-ink sm:text-[20px] sm:leading-[26px]">{project.name}</h1>
          {metaItems.length > 0 ? (
            <p className="mt-1 max-w-[760px] text-[10px] leading-[14px] text-secondary">{metaItems.join(" · ")}</p>
          ) : null}
        </div>
        <ProposalStatusBadge token={token} />
      </div>
    </section>
  );
}
