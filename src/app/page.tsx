import { createProjectAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { ObjectCard } from "@/components/ui/object-card";
import { PageContainer, PageShell, SectionHeader } from "@/components/ui/page-shell";
import { createMutableLocalRepository } from "@/lib/local-data/repository";
import { calculateEstimateTotals } from "@/lib/estimates/totals";
import { formatMoney } from "@/lib/money/format";

export const dynamic = "force-dynamic";

export default async function ProjectsIndexPage() {
  const database = await (await createMutableLocalRepository()).getDatabase();

  return (
    <PageShell>
      <PageContainer>
        <SectionHeader
          eyebrow="Archestimator"
          title="Projects"
          description="Local-first project dashboard. Create a project, open its estimate sheet, pull cost-library items into the estimate, then issue proposal snapshots."
          action={
            <form action={createProjectAction} className="grid min-w-[320px] gap-3 rounded-2xl border border-hairline bg-surface-muted p-4">
              <p className="text-sm font-semibold">Create project</p>
              <Field label="Project name"><TextInput name="name" required placeholder="e.g. Makati condo fit-out" /></Field>
              <Field label="Client name"><TextInput name="clientName" required placeholder="Client / owner" /></Field>
              <Field label="Location"><TextInput name="location" required placeholder="Project location" /></Field>
              <Button type="submit" variant="primary">Create draft project</Button>
            </form>
          }
        />

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {database.projects.map((project) => {
            const estimate = database.estimates.find((item) => item.id === project.currentEstimateId);
            const totals = estimate ? calculateEstimateTotals(estimate) : null;
            const proposalCount = database.proposalSnapshots.filter((snapshot) => snapshot.projectId === project.id).length;
            return (
              <ObjectCard
                key={project.id}
                href={`/projects/${project.id}`}
                eyebrow={project.status}
                title={project.name}
                meta={`${project.clientName} · ${project.location}`}
                value={totals ? formatMoney(totals.grandTotal, database.workspace.defaultCurrency) : "No estimate"}
                footer={estimate ? `Current estimate: ${estimate.versionLabel} · ${estimate.lineItems.length} rows · ${proposalCount} proposals` : "No estimate yet"}
              />
            );
          })}
        </div>
      </PageContainer>
    </PageShell>
  );
}
