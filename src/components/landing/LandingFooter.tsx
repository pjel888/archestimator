import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";

import { ArchestimatorLogo } from "@/components/brand/ArchestimatorLogo";

import { MotionReveal } from "./MotionReveal";
import { featuresHref, requestAccessHref, workshopHref } from "./constants";

export function LandingFooter({ isHomePage = true, isLoggedIn = false }: { isHomePage?: boolean; isLoggedIn?: boolean }) {
  const currentYear = new Date().getFullYear();
  const primaryHref = isLoggedIn ? workshopHref : requestAccessHref;
  const primaryLabel = isLoggedIn ? "Open workspace" : "Request access";

  const footerLinkGroups = [
    {
      title: "Product",
      links: [
        { label: "Feature status", href: featuresHref },
      ],
    },
    {
      title: "Page",
      links: [
        { label: "Method", href: isHomePage ? "#method" : "/#method" },
        { label: "Access", href: isHomePage ? "#access" : "/#access" },
      ],
    },
    {
      title: "Access",
      links: [
        { label: isLoggedIn ? "Open workspace" : "Request access", href: primaryHref },
        { label: "Contact", href: isHomePage ? "#contact" : "/contact" },
      ],
    },
  ];

  return (
    <footer
      className="scroll-mt-[68px] bg-[#111111] px-4 pb-12 pt-20 text-white sm:px-6 lg:px-8"
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

              <h2 id="landing-footer-heading" className="mt-8 max-w-[680px] text-[34px] font-normal leading-[1.03] tracking-normal text-white sm:text-[46px]">
                Estimate. Revise. Propose.
              </h2>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={primaryHref}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[5px] bg-white px-4 text-[12px] font-semibold leading-none text-[#111111] transition hover:translate-y-[-1px] hover:bg-[#fff7ef] active:scale-95 focus-visible:ring-2 focus-visible:ring-[#ff7a1a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  {primaryLabel} <ArrowRight className="size-4" weight="bold" />
                </Link>
              </div>
            </div>

            <div className="grid gap-7 sm:grid-cols-3 lg:pt-3">
              {footerLinkGroups.map((group) => (
                <nav key={group.title} aria-label={`${group.title} footer links`}>
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-normal text-[#ff7a1a]">
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

          <div className="flex flex-col gap-3 border-t border-white/12 pt-6 text-[11px] text-white/42 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <span>© {currentYear} Archestimator. All rights reserved.</span>
              <Link href="/privacy" className="transition hover:text-white">
                Privacy Policy
              </Link>
              <Link href="/terms" className="transition hover:text-white">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </MotionReveal>
    </footer>
  );
}
