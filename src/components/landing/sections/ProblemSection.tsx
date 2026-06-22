/**
 * ProblemSection — homepage Section 2.
 *
 * One tight statement, not a brochure block. RSC.
 */
export function ProblemSection() {
  return (
    <section
      id="problem"
      aria-label="The problem with estimating today"
      data-landing-section="problem"
      data-reveal="true"
      className="border-y border-landing-hairline bg-surface py-20 sm:py-28"
    >
      <div className="mx-auto grid w-full max-w-[min(1680px,calc(100vw-32px))] gap-8 px-4 md:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] md:items-end lg:px-6">
        <h2 className="max-w-[16ch] font-landing-display text-[clamp(2.2rem,5vw,5.8rem)] font-semibold leading-[0.98] tracking-normal text-landing-ink text-balance">
          <span data-gsap-scrub-word>Every estimate</span>{" "}
          <span data-gsap-scrub-word>should become</span>{" "}
          <span data-gsap-scrub-word className="text-brand-orange-dark">
            reusable memory.
          </span>
        </h2>

        <p className="max-w-[38rem] text-[clamp(1.05rem,0.5vw+1rem,1.28rem)] leading-[1.5] text-landing-ink-secondary text-pretty">
          Spreadsheets reset the job. Archestimator keeps the prices, suppliers, revisions, and
          proposal trail that your next estimate needs.
        </p>

        <div className="md:col-span-2 grid gap-px overflow-hidden rounded-landing-panel border border-landing-hairline bg-landing-hairline sm:grid-cols-2">
          <div className="bg-surface p-5">
            <p className="font-numeric text-[11px] uppercase tracking-normal text-landing-ink-muted">
              On your side
            </p>
            <p className="mt-1.5 text-sm leading-[1.55] text-landing-ink-secondary">
              Stop hunting old files for a rate you already decided.
            </p>
          </div>
          <div className="bg-surface p-5">
            <p className="font-numeric text-[11px] uppercase tracking-normal text-landing-ink-muted">
              Your client&rsquo;s side
            </p>
            <p className="mt-1.5 text-sm leading-[1.55] text-landing-ink-secondary">
              Review one proposal link with the revision trail behind it.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
