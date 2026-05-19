import { CtaLink } from "./CtaLink";
import { PlaceholderMedia } from "./PlaceholderMedia";
import { SectionIntro } from "./SectionIntro";
import { workshopHref } from "./constants";

const solutionFeatures = [
  [
    "Estimate Workspace",
    "Build estimates around the project structure: lot, structure, level, area, scope, trade, cost component, and line item.",
  ],
  [
    "Component Library",
    "Save repeated assemblies, materials, labor rates, and scope packages so every new estimate starts with proven cost logic.",
  ],
  [
    "Revision Intelligence",
    "Track quantity, unit-rate, scope, assumption, and proposal changes before they disappear into duplicated spreadsheet files.",
  ],
  [
    "Proposal Comparisons",
    "Compare estimate sheets, alternates, and value-engineering options with visual breakdowns clients can actually understand.",
  ],
  [
    "Industry Standard Export Formats",
    "Export estimates and proposal packages to Excel and PDF so teams can review, price, approve, and share in the formats they already use.",
  ],
];

export function SolutionSection() {
  return (
    <section id="solutions" className="bg-[#faf9f6] py-20 lg:py-28">
      <div className="w-full px-6">
        <SectionIntro
          title="The smarter way is not one feature. It is the whole estimating flow."
          body="Archestimator keeps the estimate, Component Library, revisions, proposal comparisons, and Excel/PDF exports connected, so construction cost estimators can move faster without losing the logic behind the numbers."
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
          <div className="grid gap-8 lg:grid-cols-2">
            {solutionFeatures.slice(3).map(([title, body], i) => (
              <article key={title} className="rounded-[8px] border border-[#dedbd6] bg-white p-7">
                <PlaceholderMedia
                  label={i === 0 ? "proposal comparisons preview" : "export formats preview"}
                  className="mb-6 min-h-[260px]"
                />
                <h3 className="text-[32px] font-normal leading-none tracking-[-0.045em]">{title}</h3>
                <p className="mt-4 text-[16px] leading-[1.5] text-[#626260]">{body}</p>
                {i === 1 ? (
                  <div className="mt-8">
                    <CtaLink href={workshopHref}>See the workspace</CtaLink>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
