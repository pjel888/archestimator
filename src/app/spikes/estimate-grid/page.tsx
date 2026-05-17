import Link from "next/link";
import { EstimateGridSpikeLoader } from "@/components/estimate-grid-spike-loader";
import { PageContainer, PageShell, SectionHeader } from "@/components/ui/page-shell";
import { createMutableLocalRepository } from "@/lib/local-data/repository";

export const dynamic = "force-dynamic";

export default async function EstimateGridSpikePage() {
  const repository = await createMutableLocalRepository();
  const database = await repository.getDatabase();
  const project = database.projects[0];

  return (
    <PageShell>
      <PageContainer>
        <SectionHeader
          eyebrow="Spike"
          title="Estimate grid + library drag/drop"
          description="Throwaway feasibility screen for Glide Data Grid plus dnd-kit. This route tests whether the future estimate sheet can feel spreadsheet-like while keeping canonical estimate data separate from grid cells."
          action={<Link className="rounded-xl border border-hairline bg-white px-3 py-2 text-sm font-semibold" href="/">Back to projects</Link>}
        />
        <div className="mt-6">
          <EstimateGridSpikeLoader database={database} projectId={project.id} />
        </div>
      </PageContainer>
    </PageShell>
  );
}
