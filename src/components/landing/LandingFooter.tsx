import Link from "next/link";
import type { CSSProperties } from "react";
import { EnvelopeSimple, LinkedinLogo } from "@phosphor-icons/react/dist/ssr";

import { ArchestimatorLogo } from "@/components/brand/ArchestimatorLogo";

import { MotionReveal } from "./MotionReveal";
import { workshopHref } from "./constants";

const footerColor = "var(--brand-petrol-deep)";

const footerNavGroups = [
  {
    title: "Platform",
    links: [
      { label: "Platform", href: "#product" },
      { label: "Workspace", href: workshopHref },
    ],
  },
  {
    title: "Insights",
    links: [
      { label: "Estimate guide", href: "#method" },
      { label: "Pricing access", href: "#pricing" },
    ],
  },
  {
    title: "Connect",
    links: [
      { label: "Contact us", href: "/contact", icon: EnvelopeSimple },
      { label: "LinkedIn", href: "https://www.linkedin.com/company/archestimator/", icon: LinkedinLogo },
    ],
  },
  {
    title: "Specialties",
    links: [
      { label: "General contractors", href: "#method" },
      { label: "Specialty trades", href: "#method" },
      { label: "Cost planning", href: "#product" },
      { label: "Closed beta", href: "#pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Careers", href: "/contact" },
      { label: "Beta access", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Trust notes", href: "#contact" },
      { label: "Privacy policy", href: "/privacy" },
      { label: "Terms of service", href: "/terms" },
    ],
  },
] as const;

function FooterGraphBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-[44%] overflow-hidden opacity-70" aria-hidden="true">
      <div className="absolute left-[23%] top-0 h-[58%] w-px bg-white/34" />
      <div className="absolute left-[23%] top-[21%] size-2 bg-[#d8c3d2]" />
      <div className="absolute left-[54%] top-0 h-[70%] w-px bg-white/26" />
      <div className="absolute right-[28%] top-[16%] h-[62%] w-px bg-white/22" />
      <div className="absolute left-[30%] top-[20%] h-28 w-[39%] bg-[linear-gradient(180deg,rgba(224,210,228,0.98),rgba(224,210,228,0.5)_36%,rgba(224,210,228,0)_100%)] blur-[0.5px]" />
      <div className="absolute left-[30%] top-[20%] h-28 w-[12%] bg-[#d8c3d2]/70" />
      <div className="absolute left-[42%] top-[25%] h-24 w-[12%] bg-[#d8c3d2]/60" />
      <div className="absolute left-[54%] top-[20%] h-20 w-[13%] bg-[#d8c3d2]/70" />
      <div className="absolute left-[67%] top-[16%] h-16 w-[13%] bg-[#d8c3d2]/65" />
      <div className="absolute left-[14%] top-[9%] font-mono text-[12px] font-semibold uppercase leading-4 tracking-[0.16em] text-white/22">
        Scope
        <br />
        Logic
      </div>
      <div className="absolute right-[16%] top-[39%] font-mono text-[12px] font-semibold uppercase leading-4 tracking-[0.16em] text-white/34">
        Revision
        <br />
        Handoff
      </div>
    </div>
  );
}

export function LandingFooter({ isHomePage = true }: { isHomePage?: boolean }) {
  const currentYear = new Date().getFullYear();
  const resolveHref = (href: string) => {
    if (isHomePage || !href.startsWith("#")) return href;
    return `/${href}`;
  };

  return (
    <footer
      className="relative isolate overflow-hidden px-5 pb-16 pt-28 text-white sm:px-8 lg:min-h-[1040px] lg:px-12 lg:pb-24 lg:pt-[360px]"
      style={{ backgroundColor: footerColor }}
      aria-labelledby="landing-footer-heading"
      data-landing-snap-section="true"
      data-visual-reference="amigo-footer"
    >
      <FooterGraphBackdrop />

      <MotionReveal className="relative z-10 mx-auto grid w-full max-w-[1480px] gap-16 lg:grid-cols-[minmax(280px,0.72fr)_minmax(680px,1.28fr)] lg:items-start">
        <div className="max-w-[420px]">
          <Link href="/" className="inline-flex items-center" aria-label="Archestimator home">
            <ArchestimatorLogo
              tone="light"
              markSize={42}
              markClassName="size-[42px]"
              separatorClassName="hidden"
              wordmarkClassName="text-[34px] text-white"
            />
          </Link>

          <h2 id="landing-footer-heading" className="mt-8 max-w-[380px] text-[28px] font-normal leading-[1.13] tracking-normal text-white sm:text-[34px]">
            Estimate infrastructure for building and handing off construction proposals.
          </h2>
        </div>

        <div className="grid gap-y-12 border-white/24 lg:grid-cols-3">
          {footerNavGroups.map((group) => (
            <nav
              key={group.title}
              aria-label={`${group.title} footer links`}
              className="border-white/24 pb-2 lg:min-h-[230px] lg:border-l lg:pl-8"
            >
              <p className="text-[18px] font-normal leading-none text-white">
                {group.title}
              </p>
              <ul className="mt-8 space-y-4">
                {group.links.map((link) => {
                  const Icon = "icon" in link ? link.icon : null;

                  return (
                    <li key={`${group.title}-${link.label}`}>
                      <Link
                        href={resolveHref(link.href)}
                        className="inline-flex items-center gap-4 font-mono text-[12px] font-medium uppercase leading-none tracking-[0.14em] text-white/58 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 motion-reduce:transition-none"
                        style={{ "--tw-ring-offset-color": footerColor } as CSSProperties}
                      >
                        {Icon ? <Icon className="size-3.5 text-white/58" weight="fill" aria-hidden="true" /> : null}
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          ))}
        </div>
      </MotionReveal>

      <div className="relative z-10 mx-auto mt-24 flex w-full max-w-[1480px] justify-end lg:mt-28">
        <p className="font-mono text-[12px] font-medium uppercase tracking-[0.18em] text-white/28">
          © {currentYear} Archestimator. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
