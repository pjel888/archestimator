import { getLandingAuthState } from "@/lib/landing/get-landing-auth-state";
import { PublicPageShell } from "@/components/landing";
import Link from "next/link";
import { Check, Info } from "@phosphor-icons/react/dist/ssr";

export default async function PricingPage() {
  const isLoggedIn = await getLandingAuthState();

  const inclusions = [
    "Create and organize unlimited projects",
    "Build custom multi-sheet estimates within projects",
    "Nest unlimited cost groups and work breakdown areas",
    "Edit quantities and Misc Cost allowances",
    "Access and search the early Component Library flow",
    "Protected login and secure data persistence",
  ];

  const futureHighlights = [
    { title: "Revision comparisons", desc: "Compare versions of the same sheet side-by-side to catch scope creep." },
    { title: "Excel (.xlsx) exports", desc: "Handoff complete cost sheets preserving hierarchy and formulas." },
    { title: "Document proposal packages", desc: "Format quote data into professional client packages after the document workflow ships." }
  ];

  const pricingFaq = [
    {
      q: "Is Archestimator production-ready?",
      a: "Archestimator is in a closed beta. It is useful for structured estimate sheets, reusable catalog logic, and workflow feedback, but it is not yet recommended as the sole repository for high-risk commercial, purchasing, legal, or corporate estimation files.",
    },
    {
      q: "Is payment required during closed beta?",
      a: "No payment is required during closed beta. Access is manually approved so we can work closely with a small number of testers and harden the database, export, and collaboration workflows before commercial release.",
    },
    {
      q: "When will pricing be available?",
      a: "Pricing will be announced after beta, once the core workflow, legal copy, support process, and operational readiness have been reviewed. There is no checkout, subscription, or paid-plan enforcement in this MVP.",
    },
    {
      q: "How do I request access?",
      a: "Use the contact page to request access with the Google account you want invited. Beta testers, investors, and incubator reviewers are allowlisted manually before they can enter the workshop.",
    },
  ];

  return (
    <PublicPageShell isLoggedIn={isLoggedIn} isHomePage={false}>
      {/* Page Header */}
      <section className="bg-gradient-to-b from-[#f5f5f3] to-[#eeeeec] py-20 md:py-28">
        <div className="mx-auto w-full max-w-[1120px] px-6 text-center">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ff7a1a]">
            Closed beta access
          </span>
          <h1 className="mt-5 text-[40px] font-normal leading-[1.08] tracking-[-0.04em] text-[#111111] md:text-[56px]">
            Invitation-only while the workspace hardens.
          </h1>
          <p className="mx-auto mt-6 max-w-[620px] text-[16px] leading-7 text-[#626260] md:text-[18px]">
            Archestimator is not selling public plans yet. Closed beta access is approved manually for testers and reviewers who can help validate real estimating workflows.
          </p>
        </div>
      </section>

      {/* Main Access Section */}
      <section className="bg-[#eeeeec] py-12 md:py-16">
        <div className="mx-auto w-full max-w-[1120px] px-6">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            
            <div className="rounded-[16px] border border-[#cfcfca] bg-[#f5f5f3] p-8 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[22px] font-semibold tracking-tight text-[#111111]">
                    Closed beta workspace
                  </h2>
                  <p className="mt-1 text-[13px] text-[#626260]">
                    Invite-only access, no payment required.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[14px] font-bold uppercase tracking-[0.08em] text-[#111111]">No checkout</span>
                  <span className="block font-mono text-[12px] text-[#626260]">pricing after beta</span>
                </div>
              </div>

              <div className="mt-6 rounded-[8px] bg-amber-500/5 p-4 border border-amber-500/15 flex gap-3 text-amber-800 dark:text-amber-300">
                <Info className="size-5 shrink-0 mt-0.5" />
                <p className="text-[13px] leading-5">
                  <strong>Notice:</strong> No payment is required for closed beta. Pricing will be announced after beta, and there is no Stripe, checkout, subscription, or plan enforcement in this MVP.
                </p>
              </div>

              <div className="mt-8">
                <h3 className="text-[11px] font-mono font-semibold uppercase tracking-[0.08em] text-[#111111]/60">
                  Included for approved testers
                </h3>
                <ul className="mt-4 space-y-3.5">
                  {inclusions.map((inc, index) => (
                    <li key={index} className="flex items-start gap-3 text-[14px] leading-5 text-[#1f201f]">
                      <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                        <Check className="size-3.5" weight="bold" />
                      </div>
                      <span>{inc}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-[#cfcfca]/60">
                <Link
                  href="/contact"
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-[5px] bg-[#ff7a1a] text-[13px] font-bold uppercase tracking-[0.04em] text-white transition hover:bg-[#e06610] active:scale-98"
                >
                  Request access
                </Link>
              </div>
            </div>

            {/* Panel: What we are shaping */}
            <div className="flex flex-col justify-between rounded-[16px] border border-[#cfcfca]/60 bg-[#f5f5f3]/60 p-8">
              <div>
                <h2 className="text-[20px] font-semibold tracking-tight text-[#111111]">
                  What beta access means
                </h2>
                <p className="mt-1.5 text-[14px] leading-6 text-[#626260]">
                  Approved testers get the current workshop while planned features stay behind verification gates. The goal is feedback and proof, not public payment conversion.
                </p>

                <div className="mt-8 space-y-6">
                  {futureHighlights.map((feat, index) => (
                    <div key={index} className="border-l-2 border-[#ff7a1a] pl-4">
                      <h3 className="text-[14px] font-bold text-[#111111]">
                        {feat.title}
                      </h3>
                      <p className="mt-1 text-[13px] leading-5 text-[#626260]">
                        {feat.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-[#cfcfca]/30 text-center sm:text-left">
                <p className="text-[12px] text-[#626260]">
                  Already invited?
                </p>
                <Link
                  href="/login"
                  className="mt-2 inline-flex items-center gap-1 text-[12px] font-bold uppercase tracking-[0.02em] text-[#ff7a1a] hover:underline"
                >
                  Sign in with the invited Google account →
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Access FAQs */}
      <section className="bg-[#eeeeec] py-16 md:py-24 border-t border-[#cfcfca]/40">
        <div className="mx-auto w-full max-w-[800px] px-6">
          <div className="text-center">
            <h2 className="text-[28px] font-semibold tracking-tight text-[#111111] md:text-[34px]">
              Closed Beta FAQ
            </h2>
            <p className="mt-3 text-[14px] text-[#626260]">
              Clear answers about access, payment, and what changes after beta.
            </p>
          </div>

          <div className="mt-12 space-y-8">
            {pricingFaq.map((faq, index) => (
              <div key={index} className="rounded-[12px] bg-[#f5f5f3] p-6 border border-[#cfcfca]/50">
                <h3 className="text-[16px] font-semibold text-[#111111]">
                  {faq.q}
                </h3>
                <p className="mt-2.5 text-[14px] leading-6 text-[#1f201f]">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicPageShell>
  );
}
