import { CtaLink } from "./CtaLink";
import { PlaceholderMedia } from "./PlaceholderMedia";
import { SectionIntro } from "./SectionIntro";
import { workshopHref } from "./constants";

const solutionFeatures = [
  [
    "AI-powered estimator workspace",
    "A full-browser estimating sheet with project hierarchy, cost rows, component insertion, and proposal context in one working surface.",
  ],
  [
    "A seamless experience for estimates and proposals",
    "Rows, assumptions, inclusions, exclusions, and commercial notes move together so handoffs from estimate to proposal keep full context.",
  ],
  [
    "AI-powered insights across every revision",
    "Every quantity, unit rate, scope status, and proposal mapping can become a reviewable change instead of a hidden spreadsheet edit.",
  ],
  [
    "A self-improving cost system",
    "Reusable library items, supplier notes, and project overrides make every estimate easier to audit, update, and reuse.",
  ],
];

export function SolutionSection() {
  return (
    <section className="bg-[#faf9f6] py-20 lg:py-28">
      <div className="w-full px-6">
        <SectionIntro
          title="A complete solution for estimators and contractors"
          body="Archestimator and its cost library are built together, so you have full visibility across the estimating operation and can collaborate from first takeoff to final proposal."
        />
        <div className="mt-16 grid gap-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
            <PlaceholderMedia label="workspace image placeholder" className="min-h-[520px]" />
            <article className="self-end rounded-[8px] border border-[#dedbd6] bg-white p-7">
              <h3 className="text-[32px] font-normal leading-none tracking-[-0.045em]">{solutionFeatures[0][0]}</h3>
              <p className="mt-4 text-[16px] leading-[1.5] text-[#626260]">{solutionFeatures[0][1]}</p>
            </article>
          </div>
          <div className="grid gap-8 lg:grid-cols-2">
            {solutionFeatures.slice(1, 3).map(([title, body], i) => (
              <article key={title} className="rounded-[8px] border border-[#dedbd6] bg-white p-7">
                <PlaceholderMedia label={`feature image ${i + 1}`} className="mb-6 min-h-[260px]" />
                <h3 className="text-[32px] font-normal leading-none tracking-[-0.045em]">{title}</h3>
                <p className="mt-4 text-[16px] leading-[1.5] text-[#626260]">{body}</p>
              </article>
            ))}
          </div>
          <div className="grid gap-8 lg:grid-cols-[0.75fr_1fr]">
            <article className="rounded-[8px] border border-[#dedbd6] bg-white p-7">
              <h3 className="text-[32px] font-normal leading-none tracking-[-0.045em]">{solutionFeatures[3][0]}</h3>
              <p className="mt-4 text-[16px] leading-[1.5] text-[#626260]">{solutionFeatures[3][1]}</p>
              <div className="mt-8">
                <CtaLink href={workshopHref}>Learn more</CtaLink>
              </div>
            </article>
            <PlaceholderMedia label="self improving system image" className="min-h-[360px]" />
          </div>
        </div>
      </div>
    </section>
  );
}
