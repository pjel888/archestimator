import { CtaLink } from "./CtaLink";
import { PlaceholderMedia } from "./PlaceholderMedia";
import { workshopHref } from "./constants";

export function EstimatorEngineSection() {
  return (
    <section className="bg-white py-20 lg:py-28">
      <div className="grid w-full gap-8 px-6 lg:grid-cols-[0.65fr_1fr]">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7b7b78]">The Archestimator way</p>
          <h3 className="mt-5 text-[48px] font-normal leading-none tracking-[-0.055em]">Build, revise, compare, and explain quotes in one flow</h3>
          <p className="mt-5 text-[18px] leading-[1.45] tracking-[-0.02em] text-[#313130]">
            From first quantity to proposal handoff, Archestimator keeps catalog items, supplier context, assumptions, revisions, and visual breakdowns connected.
          </p>
          <div className="mt-7">
            <CtaLink href={workshopHref}>See the workspace</CtaLink>
          </div>
        </div>
        <PlaceholderMedia label="hero product image placeholder" className="min-h-[440px]" />
      </div>
    </section>
  );
}
