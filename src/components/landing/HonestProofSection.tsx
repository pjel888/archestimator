import { MotionReveal } from "./MotionReveal";

/* Claims-safe proof strip: every fact is verifiable in the product today.
   No invented customers, no invented metrics, no carousel, no autoplay. */
const proofFacts = [
  { fact: "Working estimate workspace", qualifier: "live in closed beta" },
  { fact: "Reusable component library", qualifier: "live in closed beta" },
  {
    fact: "Multiple estimate sheets per project",
    qualifier: "options, alternates, revisions",
  },
  {
    fact: "Proposal share pages",
    qualifier: "clients open them in the browser",
  },
] as const;

export function HonestProofSection() {
  return (
    <section
      id="proof"
      aria-labelledby="proof-heading"
      className="bg-paper-1 px-6 py-20 sm:px-8 sm:py-24 lg:px-12"
    >
      <MotionReveal>
        <div className="mx-auto w-full max-w-[1100px]">
          <h2
            id="proof-heading"
            className="landing-headline-lg max-w-[760px] text-ink-1"
          >
            Built in the open, with the teams using it.
          </h2>

          <ul className="mt-10 flex flex-wrap gap-4">
            {proofFacts.map(({ fact, qualifier }) => (
              <li
                key={fact}
                className="rounded-[3px] border border-line-1 bg-paper-0 px-5 py-4"
              >
                <p className="text-[13px] font-medium text-ink-1">{fact}</p>
                <p className="mt-1 text-[11px] text-ink-3">{qualifier}</p>
              </li>
            ))}
          </ul>

          <blockquote className="mt-14 max-w-[640px] border-l border-line-2 pl-5">
            <p className="landing-body italic text-ink-2">
              Archestimator exists because skilled estimators lose too much time
              reconnecting work that should have stayed connected. We are
              building the clearer way, with the teams who quote for a living.
            </p>
            <p className="mt-3 text-[12px] not-italic text-ink-3">
              Philip — founder, Archestimator
            </p>
          </blockquote>
        </div>
      </MotionReveal>
    </section>
  );
}
