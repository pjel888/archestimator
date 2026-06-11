export function ProductPreview() {
  return (
    <div className="relative w-full overflow-hidden rounded-[8px] border border-[#dedbd6] bg-[#e8dfd2] p-4 sm:p-8 lg:p-12">
      <div className="absolute left-6 top-6 size-2 bg-[#006cff]" />
      <div className="absolute bottom-6 right-6 size-2 bg-[#111111]" />
      <div className="mx-auto overflow-hidden rounded-[6px] border border-black/15 bg-white shadow-[0_22px_70px_rgba(17,17,17,0.16)]">
        <div className="flex h-12 items-center justify-between border-b border-[#dedbd6] px-4">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-[#ff5600]" />
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
