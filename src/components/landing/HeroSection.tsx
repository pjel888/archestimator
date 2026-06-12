"use client";

import { useEffect, useRef } from "react";
import Link from 'next/link'
import Image from "next/image";
import dynamic from "next/dynamic";
import { annotate } from "rough-notation";
import { workshopHref } from './constants'
import { trackConversion } from "@/lib/ab-testing/experiment-tracker";

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
  "Work Smarter",
  "Propose Better",
  "Win Faster",
] as const;

const heroSignalItems = [
  "Project-Shaped Workflow",
  "Reusable Component Library",
  "Intuitive Estimating Experience",
  "Proposal Handoff",
  "Activity History",
] as const;

const HERO_HEADLINE_ANNOTATION_COLOR = "rgb(170, 65, 42)";
const PROPOSAL_TO_APPROVAL_HEADLINE = "The fastest path from proposal to approval.";
const PRECISION_TO_WIN_HEADLINE = "Estimate with Precision. Win with Clarity.";

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

function renderBrandHighlightedText(text: string) {
  return text.replace(/(archestimator)/gi, "\u200B$1\u200B").split("\u200B").map((seg, i) =>
    seg.toLowerCase() === "archestimator" ? (
      <span key={i} className="relative inline-block text-brand-orange">{seg}</span>
    ) : (
      <span key={i}>{seg}</span>
    ),
  );
}

function RoughHighlightText({ children }: { children: string }) {
  return (
    <span
      className="relative isolate inline-flex items-center overflow-visible px-2 py-0.5 text-white"
      data-testid="landing-hero-kicker-highlight"
    >
      <span className="pointer-events-none absolute -inset-x-1 -inset-y-0.5 z-0" aria-hidden="true">
        <svg className="block size-full overflow-visible" viewBox="0 0 180 34" preserveAspectRatio="none">
          <path
            d="M7 8 C45 4 92 5 172 8 L174 25 C120 30 60 29 6 26 Z"
            fill={HERO_HEADLINE_ANNOTATION_COLOR}
          />
          <path
            d="M8 9 C48 3 110 6 172 8 M173 25 C117 30 54 29 7 25"
            fill="none"
            stroke={HERO_HEADLINE_ANNOTATION_COLOR}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
        </svg>
      </span>
      <span className="relative z-10 text-white" data-testid="landing-hero-kicker-text">
        {children}
      </span>
    </span>
  );
}

function HeroHeadlineText({ headline }: { headline: string }) {
  const proposalRef = useRef<HTMLSpanElement | null>(null);
  const approvalRef = useRef<HTMLSpanElement | null>(null);
  const precisionRef = useRef<HTMLSpanElement | null>(null);
  const winRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (headline === PROPOSAL_TO_APPROVAL_HEADLINE && proposalRef.current && approvalRef.current) {
      const proposalUnderline = annotate(proposalRef.current, {
        type: "underline",
        color: HERO_HEADLINE_ANNOTATION_COLOR,
        strokeWidth: 2,
        padding: 3,
        iterations: 2,
        animationDuration: prefersReducedMotion ? 0 : 560,
        animate: !prefersReducedMotion,
      });
      const approvalCircle = annotate(approvalRef.current, {
        type: "circle",
        color: HERO_HEADLINE_ANNOTATION_COLOR,
        strokeWidth: 2,
        padding: 6,
        iterations: 2,
        animationDuration: prefersReducedMotion ? 0 : 680,
        animate: !prefersReducedMotion,
      });
      const timer = window.setTimeout(() => {
        proposalUnderline.show();
        approvalCircle.show();
      }, prefersReducedMotion ? 0 : 180);

      return () => {
        window.clearTimeout(timer);
        proposalUnderline.remove();
        approvalCircle.remove();
      };
    }

    if (headline === PRECISION_TO_WIN_HEADLINE && precisionRef.current && winRef.current) {
      const precisionUnderline = annotate(precisionRef.current, {
        type: "underline",
        color: HERO_HEADLINE_ANNOTATION_COLOR,
        strokeWidth: 2,
        padding: 3,
        iterations: 2,
        animationDuration: prefersReducedMotion ? 0 : 560,
        animate: !prefersReducedMotion,
      });
      const winCircle = annotate(winRef.current, {
        type: "circle",
        color: HERO_HEADLINE_ANNOTATION_COLOR,
        strokeWidth: 2,
        padding: 6,
        iterations: 2,
        animationDuration: prefersReducedMotion ? 0 : 680,
        animate: !prefersReducedMotion,
      });
      const timer = window.setTimeout(() => {
        precisionUnderline.show();
        winCircle.show();
      }, prefersReducedMotion ? 0 : 180);

      return () => {
        window.clearTimeout(timer);
        precisionUnderline.remove();
        winCircle.remove();
      };
    }

    return undefined;
  }, [headline]);

  if (headline === PRECISION_TO_WIN_HEADLINE) {
    return (
      <span className="relative inline-block">
        Estimate with{" "}
        <span ref={precisionRef} className="relative inline-block whitespace-nowrap">Precision</span>.
        <br aria-hidden="true" />
        <span ref={winRef} className="relative inline-block whitespace-nowrap">Win</span>{" "}
        with Clarity.
      </span>
    );
  }

  if (headline !== PROPOSAL_TO_APPROVAL_HEADLINE) {
    return <span className="relative inline-block">{renderBrandHighlightedText(headline)}</span>;
  }

  return (
    <span className="relative inline-block">
      The fastest path from{" "}
      <span className="relative inline-block whitespace-nowrap pb-[0.22em]">
        <span ref={proposalRef} className="relative inline-block">proposal</span>
        <span className="pointer-events-none absolute bottom-[-0.05em] left-[29%] right-[20%] z-[18] h-[0.52em]" aria-hidden="true">
          <svg className="block size-full overflow-visible" viewBox="0 0 128 28" preserveAspectRatio="none">
            <path d="M4 17 C36 29 77 27 121 9" fill="none" stroke={HERO_HEADLINE_ANNOTATION_COLOR} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M112 5 L123 9 L115 18" fill="none" stroke={HERO_HEADLINE_ANNOTATION_COLOR} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        {" "}to{" "}
        <span ref={approvalRef} className="relative inline-block">approval</span>.
      </span>
    </span>
  );
}

export function HeroSection({ variant = "A", isLoggedIn = false }: { variant?: "A" | "B"; isLoggedIn?: boolean }) {
  const activeHeroCopy = variant === "B" ? heroCopyVariants[1] : heroCopyVariants[0];
  const primaryCtaHref = isLoggedIn ? workshopHref : "/contact";
  const primaryCtaTarget = isLoggedIn ? "workspace" : "book_walkthrough";

  return (
    <section className='relative isolate z-10 flex min-h-[calc(100dvh-73px)] w-full items-center overflow-hidden bg-white px-6 py-10 text-[#171514] shadow-[0_30px_70px_-42px_rgba(17,24,39,0.48)] sm:px-8 sm:py-12 lg:px-12 lg:py-0'>
      <div
        className='landing-hero-plus-grid pointer-events-none absolute right-[-10vw] top-20 h-[620px] w-[86vw] max-w-[1280px]'
        aria-hidden='true'
      />

      <div className='relative z-10 grid w-full gap-y-12 lg:grid-cols-[minmax(0,635px)_minmax(0,1fr)] lg:gap-x-0 lg:items-start'>
        <div
          data-testid='landing-hero-copy-block'
          className='relative flex max-w-[635px] flex-col lg:h-[603px] lg:border-l lg:border-[#d6cec5] lg:pl-7'
        >
          <div className='relative z-10'>
            <p className='max-w-[440px] text-[13px] font-medium leading-6'>
              <RoughHighlightText>
                {variant === "B" ? "Win More Bids." : "Close Projects Faster."}
              </RoughHighlightText>
            </p>

            <h1 className='mt-3 text-[38px] font-normal leading-[1.06] tracking-normal text-[#171514] text-balance sm:mt-4 sm:text-[48px] sm:leading-[1.05] lg:text-[54px]'>
              <HeroHeadlineText headline={activeHeroCopy.headline} />
            </h1>
          </div>

          <div className='relative z-10 mt-4 lg:mt-5'>
            <p className='max-w-[420px] border-l border-t border-[#d9d1c8] pl-5 pt-5 text-[12px] font-normal leading-6 text-[#473f39] text-pretty sm:text-[14px] sm:leading-7 lg:border-l-0 lg:pl-0 lg:pt-7'>
              {activeHeroCopy.support.split("\n").map((part, i) => (
                <span key={i}>
                  {i > 0 && <br aria-hidden="true" />}
                  {renderBrandHighlightedText(part)}
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
          className='relative min-h-[320px] overflow-hidden rounded-[6px] bg-[#6e7780] shadow-[0_18px_44px_rgba(31,41,55,0.14)] sm:min-h-[470px] lg:h-[603px] lg:min-h-0'
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
          <div className='absolute inset-0 bg-[linear-gradient(118deg,rgba(15,23,42,0.34),rgba(51,65,85,0.42)_48%,rgba(17,24,39,0.54)_100%)]' aria-hidden='true' />
          <div className='absolute inset-0 bg-slate-950/24 backdrop-blur-[3px] backdrop-saturate-50' aria-hidden='true' />
          <div className='absolute inset-0 opacity-45 mix-blend-screen' aria-hidden='true' data-testid='neat-wireframe-background'>
            <NeatWireframeBackground />
          </div>
          <div className='landing-hero-flow-stage pointer-events-none absolute inset-0 z-10 hidden lg:grid' aria-hidden='true'>
            <div className='landing-hero-flow-card-area flex items-center'>
              <div className='landing-hero-flow-track grid w-full items-center'>
                {heroDiagramSteps.map((step, index) => (
                  <div key={step} className='contents'>
                    <div className='pointer-events-auto'>
                      <div className={`landing-hero-diagram-node landing-hero-diagram-node-${index + 1} relative flex min-h-12 items-center justify-center px-3 text-center transition-transform duration-500 ease-out hover:-translate-y-1`}>
                        <p className='landing-hero-diagram-title !text-[12px] font-normal leading-none text-white'>{step}</p>
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
        </div>
      </div>
    </section>
  )
}
