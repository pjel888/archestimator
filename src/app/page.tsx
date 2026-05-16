import { calculateEstimateLineTotal } from "@/lib/estimates/calculations";
import { createLocalRepository } from "@/lib/local-data/repository";

const currency = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

export default async function Home() {
  const db = await createLocalRepository().getDatabase();
  const project = db.projects[0];
  const estimate = db.estimates.find((item) => item.id === project?.currentEstimateId) ?? db.estimates[0];

  const rows = estimate.lineItems.map((item) => {
    const total = calculateEstimateLineTotal({
      quantity: item.quantity,
      unitCost: item.unitCost,
      materialUnitCost: item.materialUnitCost,
      laborUnitCost: item.laborUnitCost,
    });

    return { ...item, total };
  });

  const grandTotal = rows.reduce((sum, row) => sum + row.total.total, 0);

  return (
    <main className="min-h-screen bg-background px-6 py-8 text-foreground lg:px-10">
      <section className="mx-auto flex max-w-7xl flex-col gap-8">
        <div className="flex flex-col gap-6 rounded-3xl border border-hairline bg-surface p-6 shadow-sm lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">Archestimator MVP</p>
            <h1 className="mt-3 text-4xl font-bold tracking-[-0.04em] lg:text-6xl">
              Contractor-first estimates with libraries, versions, and proposal packages.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
              Local-first Next.js + Bun setup. Estimate rows combine reusable library data with project-specific quantities while keeping proposal snapshots ready for future export flows.
            </p>
          </div>
          <div className="rounded-2xl bg-foreground p-5 text-white lg:min-w-72">
            <p className="text-sm text-white/70">Draft estimate total</p>
            <p className="mt-2 font-mono text-3xl font-semibold">{currency.format(grandTotal)}</p>
            <p className="mt-3 text-xs text-white/60">Source: local JSON seed repository</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="overflow-hidden rounded-3xl border border-hairline bg-surface shadow-sm">
            <div className="border-b border-hairline p-5">
              <p className="text-sm font-semibold text-muted">{project.name}</p>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-semibold tracking-[-0.025em]">{estimate.name}</h2>
                <span className="rounded-md bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                  {estimate.versionLabel} · {estimate.status}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] border-collapse text-sm">
                <thead className="bg-surface-muted text-left text-xs uppercase tracking-[0.12em] text-muted">
                  <tr>
                    <th className="border-b border-hairline px-4 py-3">Item</th>
                    <th className="border-b border-hairline px-4 py-3">Scope</th>
                    <th className="border-b border-hairline px-4 py-3 text-right">Qty</th>
                    <th className="border-b border-hairline px-4 py-3">Unit</th>
                    <th className="border-b border-hairline px-4 py-3 text-right">Material</th>
                    <th className="border-b border-hairline px-4 py-3 text-right">Labor</th>
                    <th className="border-b border-hairline px-4 py-3 text-right">Total</th>
                    <th className="border-b border-hairline px-4 py-3">Link</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-hairline last:border-0">
                      <td className="px-4 py-3">
                        <div className="font-medium">{row.itemName}</div>
                        <div className="mt-1 max-w-md text-xs leading-5 text-muted">{row.description}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-surface-muted px-2 py-1 text-xs font-semibold text-slate-700">
                          {row.scopeStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{row.quantity}</td>
                      <td className="px-4 py-3 text-muted">{row.unit}</td>
                      <td className="px-4 py-3 text-right font-mono">{currency.format(row.total.materialSubtotal)}</td>
                      <td className="px-4 py-3 text-right font-mono">{currency.format(row.total.laborSubtotal)}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">{currency.format(row.total.total)}</td>
                      <td className="px-4 py-3 text-xs text-muted">{row.linkState}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="flex flex-col gap-6">
            <section className="rounded-3xl border border-hairline bg-surface p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Cost library</h2>
              <p className="mt-1 text-sm text-muted">Reusable local seed items. Future data layer can migrate behind the repository boundary.</p>
              <div className="mt-4 space-y-3">
                {db.costLibraryItems.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-hairline p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="mt-1 text-xs text-muted">{item.category} · {item.unit} · {item.pricingDate}</p>
                      </div>
                      <p className="font-mono text-sm font-semibold">{currency.format(item.defaultUnitCost)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-hairline bg-proposal-paper p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Proposal package target</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Next implementation layer: turn this estimate into a frozen proposal snapshot with letter, summary, detailed BOQ, exclusions, terms, and conforme blocks.
              </p>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
