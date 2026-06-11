"use client";

import Link from 'next/link'
import Image from "next/image";
import dynamic from "next/dynamic";
import { workshopHref } from './constants'
import { trackConversion } from "@/lib/ab-testing/experiment-tracker";
import { ArrowsClockwise, ArrowsLeftRight, CheckCircle } from "@phosphor-icons/react/dist/ssr";

const NeatWireframeBackground = dynamic(() =>
  import("./NeatWireframeBackground").then((module) => module.NeatWireframeBackground),
  {
    loading: () => null,
    ssr: false,
  },
);

const heroVisualSlides = [
  {
    src: "/landing/hero-slides/construction-slide-01.jpg",
    alt: "Frosted commercial construction site with crane",
    motion: "landing-hero-slide-motion-a",
  },
  {
    src: "/landing/hero-slides/construction-slide-02.jpg",
    alt: "Frosted structural construction site with cranes",
    motion: "landing-hero-slide-motion-b",
  },
  {
    src: "/landing/hero-slides/construction-slide-03.jpg",
    alt: "Frosted interior framing construction preview",
    motion: "landing-hero-slide-motion-c",
  },
  {
    src: "/landing/hero-slides/construction-slide-04.jpg",
    alt: "Frosted rebar and construction drawings preview",
    motion: "landing-hero-slide-motion-d",
  },
  {
    src: "/landing/hero-slides/construction-slide-05.jpg",
    alt: "Frosted residential framing and materials preview",
    motion: "landing-hero-slide-motion-e",
  },
  {
    src: "/landing/hero-slides/construction-slide-06.jpg",
    alt: "Frosted architectural estimating desk preview",
    motion: "landing-hero-slide-motion-f",
  },
  {
    src: "/landing/hero-slides/construction-slide-07.jpg",
    alt: "Frosted facade installation construction preview",
    motion: "landing-hero-slide-motion-g",
  },
  {
    src: "/landing/hero-slides/construction-slide-08.jpg",
    alt: "Frosted renovation corridor construction preview",
    motion: "landing-hero-slide-motion-h",
  },
  {
    src: "/landing/hero-slides/construction-slide-09.jpg",
    alt: "Frosted site office and proposal package preview",
    motion: "landing-hero-slide-motion-i",
  },
] as const;

const heroDiagramSteps = [
  {
    number: "01",
    label: "Estimate Faster",
    icon: ArrowsClockwise,
    detail: "Work in an intuitive interface that actually understands how you build. By componentizing your pricing, archestimator ensures you never start from scratch. Build your scopes and assemblies once, then instantly reuse them across future projects.",
  },
  {
    number: "02",
    label: "Centralized Workflow",
    icon: ArrowsLeftRight,
    detail: "Eliminate the chaos of disconnected tools by keeping your estimates, revisions, and client feedback united in a single workflow.",
  },
  {
    number: "03",
    label: "Accelerate Approvals",
    icon: CheckCircle,
    detail: "Move from draft to decision with absolute clarity by tracking every revision and review along the way.",
  },
] as const;

const heroSignalItems = [
  "Project-Shaped Workflow",
  "Reusable Component Library",
  "Intuitive Estimating Experience",
  "Proposal Handoff",
  "Activity History",
] as const;

export const heroCopyVariants = [
  {
    id: 'connected-workflow',
    headline: 'The fastest path from proposal to approval.',
    support:
      "Stop wasting time on messy spreadsheets and scattered feedback. archestimator gives you a single, centralized workflow to build pricing, manage revisions, and get faster approvals.",
    evidenceGate: 'Closed beta preview',
  },
  {
    id: 'review-ready-quotes',
    headline: 'Estimate with Precision. Win with Clarity.',
    support:
      "Replace the chaos of manual data entry with a system that scales. archestimator connects your proven pricing data directly to your client proposals, keeping every revision organized until the contract is signed.",
    evidenceGate: 'Closed beta preview',
  },
] as const

export function HeroSection({ variant = "A", isLoggedIn = false }: { variant?: "A" | "B"; isLoggedIn?: boolean }) {
  const activeHeroCopy = variant === "B" ? heroCopyVariants[1] : heroCopyVariants[0];
  const primaryCtaHref = isLoggedIn ? workshopHref : "/contact";
  const primaryCtaTarget = isLoggedIn ? "workspace" : "book_walkthrough";

  return (
    <section className='relative isolate z-10 w-full overflow-hidden bg-[#fffdf9] px-6 pb-[184px] pt-20 text-[#171514] sm:px-8 lg:px-12 lg:pb-[187px] lg:pt-[59px]'>
      <div
        className='pointer-events-none absolute inset-x-0 top-12 h-[620px] bg-[linear-gradient(112deg,rgba(255,253,249,0)_0%,rgba(255,253,249,0.84)_32%,rgba(139,83,68,0.12)_68%,rgba(111,88,78,0.16)_100%)] lg:top-[30px]'
        aria-hidden='true'
      />
      <div
        className='pointer-events-none absolute right-[-12vw] top-10 h-[640px] w-[82vw] max-w-[1180px] bg-[radial-gradient(ellipse_at_55%_38%,rgba(139,83,68,0.18),transparent_58%),linear-gradient(135deg,rgba(139,83,68,0.08),rgba(111,88,78,0.12)_58%,transparent)] blur-3xl'
        aria-hidden='true'
      />
      <div
        className='landing-hero-plus-grid pointer-events-none absolute right-[-10vw] top-20 h-[620px] w-[86vw] max-w-[1280px]'
        aria-hidden='true'
      />

      <div className='relative z-10 grid w-full gap-y-12 lg:grid-cols-[minmax(0,635px)_minmax(0,1fr)] lg:gap-x-0 lg:items-start'>
        <div
          data-testid='landing-hero-copy-block'
          className='relative flex max-w-[635px] flex-col lg:h-[603px] lg:justify-between lg:border-l lg:border-[#d6cec5] lg:pl-7'
        >
          <div className='relative z-10'>
            <p className='max-w-[440px] text-[13px] font-medium leading-6 text-brand-orange'>
              {variant === "B" ? "Win More Bids." : "Close Projects Faster."}
            </p>

            <h1 className='mt-3 text-[38px] font-normal leading-[1.06] tracking-normal text-[#171514] text-balance sm:mt-4 sm:text-[48px] sm:leading-[1.05] lg:text-[54px]'>
              <span className="relative inline-block">
                {activeHeroCopy.headline.replace(/(archestimator)/gi, "\u200B$1\u200B").split("\u200B").map((seg, i) =>
                  seg.toLowerCase() === "archestimator" ? (
                    <span key={i} className="relative inline-block text-brand-orange">{seg}</span>
                  ) : (
                    <span key={i}>{seg}</span>
                  )
                )}
              </span>
            </h1>
          </div>

          <div className='relative z-10 mt-4 lg:mt-5'>
            <p className='max-w-[420px] border-l border-[#d9d1c8] pl-5 text-[12px] font-normal leading-6 text-[#473f39] text-pretty sm:text-[14px] sm:leading-7 lg:border-l-0 lg:pl-0'>
              {activeHeroCopy.support.split("\n").map((part, i) => (
                <span key={i}>
                  {i > 0 && <br aria-hidden="true" />}
                  {part.replace(/(archestimator)/gi, "\u200B$1\u200B").split("\u200B").map((seg, j) =>
                    seg.toLowerCase() === "archestimator" ? (
                      <span key={j} className="relative inline-block text-brand-orange">{seg}</span>
                    ) : (
                      <span key={j}>{seg}</span>
                    )
                  )}
                </span>
              ))}
            </p>

            <div className='mt-7 flex flex-row flex-wrap gap-3'>
              <Link
                href={primaryCtaHref}
                onClick={() => trackConversion("hero-cta-copy", "cta_click", { location: "hero", target: primaryCtaTarget, variant })}
                className='inline-flex min-h-10 items-center justify-center rounded-[6px] bg-brand-orange px-4 text-[12px] font-semibold text-white transition hover:bg-brand-orange-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 sm:min-h-11 sm:px-5 sm:text-[13px]'
              >
                Start Winning
              </Link>
            </div>
          </div>
        </div>

        <div
          data-testid='landing-hero-frosted-visual'
          data-visual-reference='amigo-right-rail'
          className='relative min-h-[320px] overflow-hidden rounded-[6px] bg-[#9f4b29] shadow-[0_18px_44px_rgba(83,51,30,0.14)] sm:min-h-[470px] lg:h-[603px] lg:min-h-0'
        >
          <Image
            src={heroVisualSlides[0].src}
            alt={heroVisualSlides[0].alt}
            fill
            priority
            sizes='(min-width: 1024px) 58vw, 100vw'
            className='landing-hero-slide landing-hero-slide-01 landing-hero-slide-motion-a absolute inset-0 size-full object-cover'
            data-testid='landing-hero-slide'
          />
          {heroVisualSlides.slice(1).map((slide, index) => (
            <Image
              key={slide.src}
              src={slide.src}
              alt=''
              aria-hidden='true'
              fill
              sizes='(min-width: 1024px) 58vw, 100vw'
              className={`landing-hero-slide landing-hero-slide-${String(index + 2).padStart(2, "0")} ${slide.motion} absolute inset-0 size-full object-cover`}
              data-testid='landing-hero-slide'
            />
          ))}
          <div className='absolute inset-0 bg-[linear-gradient(118deg,rgba(255,246,236,0.28),rgba(139,83,68,0.08)_38%,rgba(39,34,30,0.5)),radial-gradient(ellipse_at_28%_18%,rgba(139,83,68,0.18),transparent_46%)]' aria-hidden='true' />
          <div className='absolute inset-0 bg-[#1d1511]/[0.1] backdrop-blur-[1.5px]' aria-hidden='true' />
          <div className='absolute inset-0 opacity-45 mix-blend-screen' aria-hidden='true' data-testid='neat-wireframe-background'>
            <NeatWireframeBackground />
          </div>
          <div className='landing-hero-flow-stage pointer-events-none absolute inset-x-0 bottom-16 top-0 z-10 hidden lg:grid' aria-hidden='true'>
            <div className='landing-hero-flow-card-area flex items-center'>
              <div className='landing-hero-flow-track grid w-full items-center'>
                {heroDiagramSteps.map((step, index) => (
                  <div key={step.label} className='contents'>
                    <div className='translate-y-[181px] pointer-events-auto'>
                      <div className={`landing-hero-diagram-node landing-hero-diagram-node-${index + 1} relative h-[420px] px-3 pt-3 rounded-[3px] overflow-hidden transition-transform duration-500 ease-out hover:-translate-y-2`}>
                        <div
                          className='absolute inset-x-0 top-0 h-full bg-white/90 blur-[0.5px]'
                          style={{
                            WebkitMaskImage:
                              "linear-gradient(180deg, #000 0%, rgba(0,0,0,0.92) 7%, rgba(0,0,0,0.78) 16%, rgba(0,0,0,0.55) 28%, rgba(0,0,0,0.34) 40%, rgba(0,0,0,0.16) 50%, transparent 61%, transparent 100%)",
                            maskImage:
                              "linear-gradient(180deg, #000 0%, rgba(0,0,0,0.92) 7%, rgba(0,0,0,0.78) 16%, rgba(0,0,0,0.55) 28%, rgba(0,0,0,0.34) 40%, rgba(0,0,0,0.16) 50%, transparent 61%, transparent 100%)",
                          }}
                          aria-hidden='true'
                        />
                        <div className='landing-hero-diagram-text-scrim' aria-hidden='true' />
                        <div className='absolute inset-x-0 top-0 h-px bg-white/55' aria-hidden='true' />
                        <p className='relative z-10 text-[8px] font-semibold leading-none text-[#6b625c]'>{step.number}</p>
                        {step.icon && (
                          <step.icon size={16} weight="regular" className="relative z-10 mt-2 text-[#6b625c]" />
                        )}
                        <p className='landing-hero-diagram-title relative z-10 mt-1 font-semibold leading-none text-brand-orange'>{step.label}</p>
                        <div className='landing-hero-diagram-divider relative z-10 mt-1.5 border-b border-[#d8d2cc]' aria-hidden='true' />
                        {"detail" in step && step.detail ? (
                          <p className='landing-hero-diagram-detail relative z-10 mt-2 font-normal text-[#3f3934] text-pretty'>{step.detail}</p>
                        ) : null}
                      </div>
                    </div>
                    {index < heroDiagramSteps.length - 1 ? (
                      <div className={`landing-hero-flow-line landing-hero-flow-line-${index + 1} h-px bg-white/50`} />
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
            <div className='landing-hero-signal-rail flex items-start border-l border-white/16 text-white pointer-events-auto select-text pt-[240px]'>
              <div className='w-full'>
                {heroSignalItems.map((item, index) => (
                  <div
                    key={item}
                    className={`landing-hero-signal-row landing-hero-signal-row-${index + 1} flex items-center border-b border-white/10 py-1.5 font-medium leading-none last:border-b-0`}
                  >
                    <span className='h-1.5 w-1.5 rounded-full bg-white/46' />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className='landing-hero-status-bar absolute inset-x-0 bottom-0 z-10 min-h-16 border-t border-white/22 bg-[#4a403a]/42 backdrop-blur-lg'>
            <div className='landing-hero-status-card-area flex items-center'>
              <span className='landing-hero-beta-badge inline-flex min-h-8 items-center justify-center rounded-[3px] border border-white/35 bg-white/16 px-3 text-center text-[10px] font-semibold text-white backdrop-blur-md'>
                Now On Closed Beta
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
