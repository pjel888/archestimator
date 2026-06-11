export function EstimateWorkspacePreview() {
  return (
    <div className="relative w-full overflow-hidden rounded-[8px] border border-[#dedbd6] bg-[#e8dfd2] p-4 sm:p-8 lg:p-12">
      <div className="absolute left-6 top-6 size-2 bg-[#8d7664]" />
      <div className="absolute bottom-6 right-6 size-2 bg-[#111111]" />
      <div className="mx-auto overflow-hidden rounded-[6px] border border-black/15 bg-white shadow-[0_22px_70px_rgba(17,17,17,0.16)]">
        <div className="flex h-12 items-center justify-between border-b border-[#dedbd6] px-4">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-brand-orange" />
            <span className="text-[12px] font-semibold text-[#111111]">Interior Fit-out Estimate</span>
          </div>
          <span className="rounded-[4px] bg-[#111111] px-3 py-1.5 font-mono text-[12px] font-semibold text-white">₱4.82M</span>
        </div>
        <div className="grid min-h-[420px] grid-cols-[190px_1fr_270px] bg-[#faf9f6] max-lg:grid-cols-[160px_1fr] max-md:grid-cols-1">
          <aside className="border-r border-[#dedbd6] bg-white p-3 max-md:hidden">
            <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7b7b78]">Estimate tree</p>
            {["Lot 01", "Main structure", "Ground floor", "Kitchen", "Bathroom", "Project-wide"].map((item, index) => (
              <div
                key={item}
                className={`mb-1.5 rounded-[4px] px-2 py-2 text-[12px] ${
                  index === 3 ? "bg-[#111111] font-semibold text-white" : "border border-[#dedbd6] bg-[#faf9f6] text-[#313130]"
                }`}
              >
                {item}
              </div>
            ))}
          </aside>
          <section className="min-w-0 bg-white">
            <div className="grid grid-cols-[minmax(0,1.6fr)_72px_96px_108px] border-b border-[#dedbd6] px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[#7b7b78] max-sm:grid-cols-[1fr_72px]">
              <span>Component</span>
              <span>Qty</span>
              <span className="text-right max-sm:hidden">Unit</span>
              <span className="text-right max-sm:hidden">Total</span>
            </div>
            {["Porcelain floor tile package", "Waterproofing membrane", "Cabinetry allowance", "Ceiling framing labor", "Lighting rough-in", "Site protection"].map(
              (item, index) => (
                <div
                  key={item}
                  className="grid grid-cols-[minmax(0,1.6fr)_72px_96px_108px] items-center border-b border-[#dedbd6] px-3 py-3 text-[13px] text-[#626260] max-sm:grid-cols-[1fr_72px]"
                >
                  <span className="truncate pr-3 font-semibold text-[#111111]">{item}</span>
                  <span className="font-mono">{index + 2}</span>
                  <span className="text-right font-mono max-sm:hidden">₱{((index + 2) * 7800).toLocaleString()}</span>
                  <span className="text-right font-mono font-semibold text-[#111111] max-sm:hidden">
                    ₱{((index + 4) * 18600).toLocaleString()}
                  </span>
                </div>
              )
            )}
          </section>
          <aside className="border-l border-[#dedbd6] bg-[#faf9f6] p-3 max-lg:hidden">
            <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7b7b78]">Component picker</p>
            {["Supplier tile set", "Painter day rate", "Gypsum partition assembly"].map((item) => (
              <div key={item} className="mb-2 rounded-[6px] border border-[#dedbd6] bg-white p-2">
                <div className="mb-2 h-16 rounded-[4px] bg-[linear-gradient(135deg,#f1e6d8,#ffffff)]" />
                <p className="text-[12px] font-semibold text-[#111111]">{item}</p>
                <p className="mt-1 text-[11px] text-[#7b7b78]">Drag or insert into Kitchen</p>
              </div>
            ))}
          </aside>
        </div>
      </div>
    </div>
  );
}

export function ComponentLibraryPreview() {
  const components = [
    { name: "Ceramic tile package", unit: "sqm", rate: "₱1,240", category: "Finishes" },
    { name: "Painter day rate", unit: "day", rate: "₱850", category: "Labor" },
    { name: "Gypsum partition assembly", unit: "lm", rate: "₱3,200", category: "Walls" },
    { name: "Waterproofing membrane", unit: "sqm", rate: "₱2,100", category: "Wet areas" },
    { name: "Ceiling framing labor", unit: "sqm", rate: "₱980", category: "Ceiling" },
  ];

  return (
    <div className="relative w-full overflow-hidden rounded-[8px] border border-[#dedbd6] bg-[#e8dfd2] p-4 sm:p-8 lg:p-12">
      <div className="absolute left-6 top-6 size-2 bg-[#8d7664]" />
      <div className="absolute bottom-6 right-6 size-2 bg-[#111111]" />
      <div className="mx-auto overflow-hidden rounded-[6px] border border-black/15 bg-white shadow-[0_22px_70px_rgba(17,17,17,0.16)]">
        <div className="flex h-12 items-center justify-between border-b border-[#dedbd6] px-4">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-brand-orange" />
            <span className="text-[12px] font-semibold text-[#111111]">Component Library</span>
          </div>
          <span className="rounded-[4px] bg-[#111111] px-3 py-1.5 font-mono text-[12px] font-semibold text-white">42 items</span>
        </div>
        <div className="min-h-[420px] bg-[#faf9f6] p-4">
          <div className="mb-3 flex items-center gap-2">
            {["All", "Finishes", "Labor", "Wet areas", "Ceiling"].map((f, i) => (
              <span
                key={f}
                className={`rounded-[4px] px-2.5 py-1 text-[11px] font-semibold ${
                  i === 0 ? "bg-[#111111] text-white" : "border border-[#dedbd6] bg-white text-[#313130]"
                }`}
              >
                {f}
              </span>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {components.map((c) => (
              <div key={c.name} className="rounded-[8px] border border-[#dedbd6] bg-white p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="rounded-[3px] bg-[#faf9f6] px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-[#7b7b78]">
                    {c.category}
                  </span>
                  <span className="text-[11px] font-semibold text-brand-orange">{c.rate}</span>
                </div>
                <p className="text-[13px] font-semibold text-[#111111]">{c.name}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="font-mono text-[10px] text-[#7b7b78]">Unit: {c.unit}</span>
                  <span className="ml-auto rounded-[4px] bg-[#111111] px-2 py-1 text-[10px] font-semibold text-white">
                    Insert preview
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[12px] text-[#7b7b78]">
            Reuse repeated assemblies, materials, labor rates, and scope packages so every new estimate starts with proven cost logic.
          </p>
        </div>
      </div>
    </div>
  );
}

export function RevisionIntelligencePreview() {
  const changes = [
    { label: "Quantity", before: "120 sqm", after: "145 sqm", delta: "+25 sqm", type: "up" },
    { label: "Unit rate", before: "₱1,240", after: "₱1,310", delta: "+₱70", type: "up" },
    { label: "Scope note", before: "Excludes primer", after: "Includes primer + sealer", delta: "Changed", type: "neutral" },
    { label: "Assumption", before: "Single supplier", after: "Dual-source pricing", delta: "Changed", type: "neutral" },
  ];

  return (
    <div className="relative w-full overflow-hidden rounded-[8px] border border-[#dedbd6] bg-[#e8dfd2] p-4 sm:p-8 lg:p-12">
      <div className="absolute left-6 top-6 size-2 bg-[#8d7664]" />
      <div className="absolute bottom-6 right-6 size-2 bg-[#111111]" />
      <div className="mx-auto overflow-hidden rounded-[6px] border border-black/15 bg-white shadow-[0_22px_70px_rgba(17,17,17,0.16)]">
        <div className="flex h-12 items-center justify-between border-b border-[#dedbd6] px-4">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-brand-orange" />
            <span className="text-[12px] font-semibold text-[#111111]">Revision Intelligence</span>
            <span className="rounded-full bg-brand-orange/10 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-brand-orange-dark">
              Planned preview
            </span>
          </div>
          <span className="rounded-[4px] bg-brand-orange px-3 py-1.5 font-mono text-[12px] font-semibold text-white">+₱187,400</span>
        </div>
        <div className="min-h-[420px] bg-[#faf9f6] p-4">
          <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7b7b78]">
            Planned changes since last proposal draft
          </p>
          <div className="grid gap-2">
            {changes.map((c) => (
              <div
                key={c.label}
                className="flex items-center gap-3 rounded-[8px] border border-[#dedbd6] bg-white p-3"
              >
                <span className="w-[100px] text-[11px] font-semibold uppercase tracking-[0.06em] text-[#7b7b78]">
                  {c.label}
                </span>
                <span className="flex-1 text-[12px] text-[#626260] line-through">{c.before}</span>
                <span className="flex-1 text-[12px] font-semibold text-[#111111]">{c.after}</span>
                <span
                  className={`rounded-[4px] px-2 py-1 font-mono text-[10px] font-semibold ${
                    c.type === "up"
                      ? "bg-brand-orange/10 text-brand-orange"
                      : "bg-[#8d7664]/10 text-[#8d7664]"
                  }`}
                >
                  {c.delta}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-[8px] border border-[#dedbd6] bg-white p-3">
            <p className="text-[12px] font-semibold text-[#111111]">Planned proposal impact</p>
            <p className="mt-1 text-[12px] text-[#626260]">
              In the planned workflow, the client-facing total would show the increase before it becomes a proposal handoff.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProposalComparisonsPreview() {
  return (
    <div className="relative w-full overflow-hidden rounded-[8px] border border-[#dedbd6] bg-[#e8dfd2] p-4 sm:p-8 lg:p-12">
      <div className="absolute left-6 top-6 size-2 bg-[#8d7664]" />
      <div className="absolute bottom-6 right-6 size-2 bg-[#111111]" />
      <div className="mx-auto overflow-hidden rounded-[6px] border border-black/15 bg-white shadow-[0_22px_70px_rgba(17,17,17,0.16)]">
        <div className="flex h-12 items-center justify-between border-b border-[#dedbd6] px-4">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-brand-orange" />
            <span className="text-[12px] font-semibold text-[#111111]">Proposal Comparisons</span>
            <span className="rounded-full bg-brand-orange/10 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-brand-orange-dark">
              Planned preview
            </span>
          </div>
          <span className="rounded-[4px] bg-[#111111] px-3 py-1.5 font-mono text-[12px] font-semibold text-white">2 options</span>
        </div>
        <div className="min-h-[420px] bg-[#faf9f6] p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-[10px] border border-[#dedbd6] bg-white p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7b7b78]">Option A</span>
                <span className="rounded-[4px] bg-[#faf9f6] px-2 py-1 font-mono text-[10px] font-semibold text-[#313130]">Baseline</span>
              </div>
              <p className="mt-2 text-[18px] font-normal tracking-[-0.03em] text-[#111111]">₱4.82M</p>
              <div className="mt-3 space-y-1.5">
                {["Porcelain floor tile package", "Waterproofing membrane", "Cabinetry allowance", "Ceiling framing labor", "Lighting rough-in"].map((item) => (
                  <div key={item} className="flex items-center justify-between text-[11px]">
                    <span className="text-[#626260]">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[10px] border border-brand-orange/30 bg-white p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7b7b78]">Option B</span>
                <span className="rounded-[4px] bg-brand-orange/10 px-2 py-1 font-mono text-[10px] font-semibold text-brand-orange">Value engineering</span>
              </div>
              <p className="mt-2 text-[18px] font-normal tracking-[-0.03em] text-[#111111]">₱4.31M</p>
              <div className="mt-3 space-y-1.5">
                {["Ceramic tile package", "Waterproofing membrane", "Standard cabinetry", "Metal furring ceiling", "LED rough-in"].map((item) => (
                  <div key={item} className="flex items-center justify-between text-[11px]">
                    <span className="text-[#626260]">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-[8px] border border-[#dedbd6] bg-white p-3">
            <span className="text-[12px] font-semibold text-[#111111]">Delta</span>
            <span className="font-mono text-[14px] font-semibold text-brand-orange">−₱510,000 (−10.6%)</span>
          </div>
          <p className="mt-3 text-[12px] text-[#7b7b78]">
            Planned comparison views should help teams compare estimate sheets, alternates, and value-engineering options before client handoff.
          </p>
        </div>
      </div>
    </div>
  );
}
