import { createProjectAction } from "@/app/actions";
import { AppWorkspaceShell, WorkspaceTopBar } from "@/components/app-shell/app-workspace-shell";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { ObjectCard } from "@/components/ui/object-card";
import { StatCard } from "@/components/ui/stat-card";
import { createMutableLocalRepository } from "@/lib/local-data/repository";
import { calculateEstimateTotals } from "@/lib/estimates/totals";
import { formatMoney } from "@/lib/money/format";

export const dynamic = "force-dynamic";

export default async function ProjectsIndexPage() {
  const database = await (await createMutableLocalRepository()).getDatabase();
  const projectCards = database.projects.map((project) => {
    const estimate = database.estimates.find((item) => item.id === project.currentEstimateId);
    const totals = estimate ? calculateEstimateTotals(estimate) : null;
    const proposalCount = database.proposalSnapshots.filter((snapshot) => snapshot.projectId === project.id).length;
    return { project, estimate, totals, proposalCount };
  });
  const portfolioTotal = projectCards.reduce((sum, card) => sum + (card.totals?.grandTotal ?? 0), 0);
  const rowCount = projectCards.reduce((sum, card) => sum + (card.estimate?.lineItems.length ?? 0), 0);

  return (
    <AppWorkspaceShell
      activeItem="Projects"
      topBar={<WorkspaceTopBar eyebrow={database.workspace.name} title="Projects" meta="Local-first estimating dashboard" />}
    >
      <div className="grid min-h-full gap-2 p-2 lg:p-2">
        <section className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-lg border border-hairline bg-surface p-2">
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-accent">Archestimator</p>
            <h1 className="mt-3 max-w-4xl text-4xl font-medium tracking-[-0.045em] text-ink lg:text-6xl">
              Project command center
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-muted">
              Open estimates, track proposal snapshots, and start new local-first project work without leaving the app shell.
            </p>
            <div className="mt-8 grid gap-2 md:grid-cols-3">
              <StatCard label="Active projects" value={String(database.projects.length)} dark />
              <StatCard label="Portfolio total" value={formatMoney(portfolioTotal, database.workspace.defaultCurrency)} />
              <StatCard label="Estimate rows" value={String(rowCount)} />
            </div>
          </div>

          <form action={createProjectAction} className="grid content-start gap-2 rounded-lg border border-hairline bg-surface p-2">
            <div>
              <p className="text-lg font-medium tracking-[-0.02em] text-ink">Create project</p>
              <p className="mt-1 text-sm leading-6 text-muted">Start a draft estimate with local JSON persistence.</p>
            </div>
            <Field label="Project name"><TextInput name="name" required placeholder="e.g. Makati condo fit-out" /></Field>
            <Field label="Client name"><TextInput name="clientName" required placeholder="Client / owner" /></Field>
            <Field label="Location"><TextInput name="location" required placeholder="Project location" /></Field>
            <Button type="submit" variant="primary">Create draft project</Button>
          </form>
        </section>

        <section className="grid gap-2">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-2xl font-medium tracking-[-0.03em] text-ink">Current projects</h2>
              <p className="mt-1 text-sm text-muted">Each card opens the full estimate workspace with library, version, and proposal tools docked.</p>
            </div>
            <p className="rounded-full border border-divider bg-surface px-2 py-1 text-xs font-medium text-secondary">{database.proposalSnapshots.length} issued proposals</p>
          </div>
          <div className="grid gap-2 md:grid-cols-2 2xl:grid-cols-3">
            {projectCards.map(({ project, estimate, totals, proposalCount }) => (
              <ObjectCard
                key={project.id}
                href={`/projects/${project.id}`}
                eyebrow={project.status}
                title={project.name}
                meta={`${project.clientName} · ${project.location}`}
                value={totals ? formatMoney(totals.grandTotal, database.workspace.defaultCurrency) : "No estimate"}
                footer={estimate ? `Current estimate: ${estimate.versionLabel} · ${estimate.lineItems.length} rows · ${proposalCount} proposals` : "No estimate yet"}
              />
            ))}
          </div>
        </section>
      </div>
    </AppWorkspaceShell>
  );
}
