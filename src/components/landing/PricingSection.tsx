import { PlaceholderMedia } from "./PlaceholderMedia";
import { CtaLink } from "./CtaLink";
import { workshopHref } from "./constants";

export function PricingSection() {
  return (
    <section id="pricing" className="bg-white py-20 lg:py-28">
      <div className="w-full px-6">
        <h2 className="text-[56px] font-normal leading-none tracking-[-0.055em]">MVP preview access</h2>
        <div className="mt-10 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
          <article className="rounded-[8px] border border-[#dedbd6] bg-[#faf9f6] p-7">
            <h3 className="text-[36px] font-normal leading-none tracking-[-0.045em]">Archestimator workspace</h3>
            <p className="mt-4 text-[16px] leading-[1.5] text-[#626260]">
              Explore the early estimating workspace while the core flow is being shaped: Estimate Workspace, Component Library, revision history, proposal comparisons, visual cost breakdowns, and industry-standard Excel/PDF exports.
            </p>
            <div className="mt-8 flex items-end gap-2">
              <span className="text-[56px] font-normal leading-none tracking-[-0.055em]">₱0</span>
              <span className="pb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7b7b78]">MVP preview</span>
            </div>
            <div className="mt-8">
              <CtaLink href={workshopHref}>See the workspace</CtaLink>
            </div>
          </article>
          <PlaceholderMedia label="pricing image placeholder" className="min-h-[360px]" />
        </div>
      </div>
    </section>
  );
}
