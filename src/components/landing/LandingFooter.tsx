import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";

import { ArchestimatorLogo } from "@/components/brand/ArchestimatorLogo";

import { MotionReveal } from "./MotionReveal";
import { loginHref, workshopHref } from "./constants";

const footerHighlights = [
  "Build around the offer, not a blank spreadsheet.",
  "Keep quantities, prices, supplier context, and proposal context connected.",
  "See what changed before a revision becomes a buyer problem.",
] as const;

export function LandingFooter({ isHomePage = true }: { isHomePage?: boolean }) {
  const currentYear = new Date().getFullYear();

  const footerLinkGroups = [
    {
      title: "Product",
      links: [
        { label: "Estimate Workspace", href: isHomePage ? "#product" : "/features" },
        { label: "Component Library", href: isHomePage ? "#product" : "/features" },
        { label: "Revision Intelligence", href: isHomePage ? "#product" : "/features" },
        { label: "Proposal Comparisons", href: isHomePage ? "#product" : "/features" },
      ],
    },
    {
      title: "Workflow",
      links: [
        { label: "Project hierarchy", href: isHomePage ? "#method" : "/#method" },
        { label: "Visual cost breakdowns", href: isHomePage ? "#solutions" : "/#solutions" },
        { label: "Proposal-ready outputs", href: isHomePage ? "#solutions" : "/#solutions" },
        { label: "Excel and PDF handoff", href: isHomePage ? "#pricing" : "/#pricing" },
      ],
    },
    {
      title: "Access",
      links: [
        { label: "Open workspace", href: workshopHref },
        { label: "Try Workspace", href: loginHref },
        { label: "Pricing", href: isHomePage ? "#pricing" : "/pricing" },
        { label: "About", href: "/about" },
        { label: "Contact", href: isHomePage ? "#contact" : "/contact" },
      ],
    },
  ];

  return (
    <footer
      className="scroll-mt-[68px] bg-[#111111] px-4 pb-12 pt-24 text-white sm:px-6 lg:min-h-[calc(100svh-68px)] lg:px-8"
      aria-labelledby="landing-footer-heading"
      data-landing-snap-section="true"
    >
      <MotionReveal>
        <div className="mx-auto w-full max-w-[1120px]">
          <div className="grid gap-10 border-b border-white/12 pb-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
            <div>
              <Link href="/" className="inline-flex items-center" aria-label="Archestimator home">
                <ArchestimatorLogo
                  tone="light"
                  markSize={36}
                  markClassName="size-9"
                  separatorClassName="bg-white/20"
                  wordmarkClassName="text-[17px] text-white"
                />
              </Link>

              <h2 id="landing-footer-heading" className="mt-8 max-w-[680px] text-[34px] font-normal leading-[1.03] tracking-[-0.052em] text-white sm:text-[46px]">
                A clearer quote and proposal workspace for sales teams, suppliers, and estimating teams.
              </h2>
              <p className="mt-5 max-w-[560px] text-[14px] leading-6 text-white/66">
                Less file hunting. Less version confusion. More clarity around the quote, the revision, and the proposal the buyer needs to understand.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={workshopHref}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[5px] bg-white px-4 text-[12px] font-semibold leading-none text-[#111111] transition hover:translate-y-[-1px] hover:bg-[#fff7ef] active:scale-95 focus-visible:ring-2 focus-visible:ring-[#ff7a1a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  Open workspace <ArrowRight className="size-4" weight="bold" />
                </Link>
                <Link
                  href={loginHref}
                  className="inline-flex min-h-10 items-center justify-center rounded-[5px] border border-white/18 px-4 text-[12px] font-semibold leading-none text-white transition hover:border-white/36 hover:bg-white/8 active:scale-95 focus-visible:ring-2 focus-visible:ring-[#ff7a1a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111] motion-reduce:transition-none"
                >
                  Try Workspace
                </Link>
              </div>
            </div>

            <div className="grid gap-7 sm:grid-cols-3 lg:pt-3">
              {footerLinkGroups.map((group) => (
                <nav key={group.title} aria-label={`${group.title} footer links`}>
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#ff7a1a]">
                    {group.title}
                  </p>
                  <ul className="mt-4 space-y-3 text-[13px] leading-none text-white/58">
                    {group.links.map((link) => (
                      <li key={`${group.title}-${link.label}`}>
                        <Link href={link.href} className="transition hover:text-white focus-visible:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff7a1a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111] motion-reduce:transition-none">
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              ))}
            </div>
          </div>

          <div className="grid gap-8 py-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
            <div className="rounded-[12px] border border-white/10 bg-white/[0.04] p-5">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-white/42">
                MVP preview
              </p>
              <p className="mt-3 text-[13px] leading-6 text-white/68">
                Archestimator is being shaped as an early quote, estimate, and proposal workspace. It supports human review instead of replacing commercial, purchasing, or legal judgment.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {footerHighlights.map((highlight) => (
                <div key={highlight} className="min-h-[112px] rounded-[12px] border border-white/10 bg-white/[0.035] p-4">
                  <span aria-hidden="true" className="text-[12px] font-bold leading-none text-[#ff7a1a]">
                    ✱
                  </span>
                  <p className="mt-4 text-[13px] leading-5 text-white/72">{highlight}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-white/12 pt-6 text-[11px] text-white/42 sm:flex-row sm:items-center sm:justify-between">
            <p>© {currentYear} Archestimator. All rights reserved.</p>
            <p>Built for quote and proposal workflows. No fake logos, legal-document automation, or savings guarantees.</p>
          </div>
        </div>
      </MotionReveal>
    </footer>
  );
}
