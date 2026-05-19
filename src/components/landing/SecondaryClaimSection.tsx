const workflowPillars = [
  "Project-Shaped Estimates",
  "Component Library",
  "Traceable Revisions",
  "Proposal Comparisons",
  "Visual Cost Breakdowns",
  "Proposal-Ready Outputs",
  "Industry Standard Export Formats",
];

export function SecondaryClaimSection() {
  return (
    <section id="method" className="border-y border-[#dedbd6] bg-white py-14 sm:py-16">
      <div className="w-full px-6">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.46fr)] lg:items-end">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7b7b78]">
              The Archestimator way
            </p>
            <h2 className="mt-5 max-w-[980px] text-[48px] font-normal leading-[0.95] tracking-[-0.058em] text-[#111111] sm:text-[68px] lg:text-[82px]">
              The most intuitive way to create construction cost estimates
            </h2>
          </div>
          <p className="max-w-[560px] text-[18px] leading-[1.45] tracking-[-0.025em] text-[#4f4f4d] lg:pb-2">
            Archestimator turns the estimate into a structured workspace where project hierarchy, reusable cost components, revisions, proposal comparisons, and Excel/PDF handoff stay connected.
          </p>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {workflowPillars.map((pillar) => (
            <span
              key={pillar}
              className="flex min-h-[72px] items-center rounded-[8px] border border-[#dedbd6] bg-[#faf9f6] px-4 text-[12px] font-semibold leading-[1.15] tracking-[-0.02em] text-[#313130]"
            >
              {pillar}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
