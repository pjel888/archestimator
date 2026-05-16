import Link from "next/link";
import { createMutableLocalRepository } from "@/lib/local-data/repository";
import { calculateEstimateTotals } from "@/lib/estimates/totals";
import { formatMoney } from "@/lib/money/format";

export const dynamic = "force-dynamic";

export default async function ProjectsIndexPage() {
  const database = await (await createMutableLocalRepository()).getDatabase();

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground lg:px-8">
      <section className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-hairline bg-surface p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">Archestimator</p>
          <h1 className="mt-2 text-4xl font-bold tracking-[-0.04em]">Projects</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            Local-first project dashboard. Data is read from mutable local JSON and can later migrate behind the same repository boundary.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {database.projects.map((project) => {
            const estimate = database.estimates.find((item) => item.id === project.currentEstimateId);
            const totals = estimate ? calculateEstimateTotals(estimate) : null;
            return (
              <Link key={project.id} className="rounded-3xl border border-hairline bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" href={`/projects/${project.id}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{project.status}</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{project.name}</h2>
                    <p className="mt-1 text-sm text-muted">{project.clientName} · {project.location}</p>
                  </div>
                  <p className="font-mono text-lg font-semibold">{totals ? formatMoney(totals.grandTotal, database.workspace.defaultCurrency) : "No estimate"}</p>
                </div>
                {estimate ? <p className="mt-4 text-sm text-muted">Current estimate: {estimate.versionLabel} · {estimate.lineItems.length} rows</p> : null}
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
