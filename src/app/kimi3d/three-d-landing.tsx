"use client";

import { useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import {
  Buildings,
  Crane,
  HardHat,
  Ruler,
  Warehouse,
} from "@phosphor-icons/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const MARQUEE_ITEMS = [
  { icon: Buildings, label: "Meridian Build" },
  { icon: Crane, label: "Northspan" },
  { icon: HardHat, label: "Atlas & Co" },
  { icon: Ruler, label: "Fieldline" },
  { icon: Warehouse, label: "Steelworks United" },
];

const GALLERY = [
  { seed: "concrete-form", caption: "Quantity takeoff" },
  { seed: "steel-frame", caption: "Live cost model" },
  { seed: "timber-detail", caption: "Client-ready proposal" },
];

export function ThreeDLanding() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.from("[data-hero-reveal]", {
        y: 48,
        opacity: 0,
        duration: 1.1,
        ease: "power3.out",
        stagger: 0.12,
        delay: 0.15,
      });

      gsap.utils.toArray<HTMLElement>("[data-bento-card]").forEach((card) => {
        gsap.from(card, {
          y: 64,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: { trigger: card, start: "top 85%" },
        });
      });

      gsap.utils.toArray<HTMLElement>("[data-gallery-item]").forEach((item) => {
        gsap.fromTo(
          item,
          { scale: 0.85, opacity: 0.25 },
          {
            scale: 1,
            opacity: 1,
            ease: "none",
            scrollTrigger: {
              trigger: item,
              start: "top 95%",
              end: "top 35%",
              scrub: true,
            },
          },
        );
        gsap.to(item, {
          opacity: 0.15,
          ease: "none",
          scrollTrigger: {
            trigger: item,
            start: "bottom 30%",
            end: "bottom -10%",
            scrub: true,
          },
        });
      });

      ScrollTrigger.create({
        trigger: "[data-pinned-section]",
        start: "top top",
        end: "bottom bottom",
        pin: "[data-pinned-title]",
        pinSpacing: false,
      });
    },
    { scope: root },
  );

  return (
    <main
      ref={root}
      className="w-full max-w-full overflow-x-hidden bg-[#fafaf8] font-[family-name:var(--font-geist)] text-[#141412] antialiased"
    >
      <style>{`
        @keyframes marquee-3d {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .marquee-track-3d {
          animation: marquee-3d 32s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .marquee-track-3d { animation: none; }
        }
      `}</style>

      {/* Ambient background */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, rgba(217, 119, 6, 0.10), transparent 70%), radial-gradient(40% 40% at 80% 80%, rgba(37, 99, 235, 0.06), transparent 70%)",
        }}
      />

      {/* Navigation — floating glass pill */}
      <header className="fixed inset-x-0 top-6 z-50 flex justify-center px-6">
        <nav className="flex w-full max-w-3xl items-center justify-between rounded-full border border-black/10 bg-white/70 px-6 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.06)] backdrop-blur-xl">
          <Link href="/kimi3d" className="text-sm font-semibold tracking-tight">
            Archestimator
          </Link>
          <div className="hidden items-center gap-8 text-sm text-black/60 sm:flex">
            <a href="#platform" className="transition-colors hover:text-black">
              Platform
            </a>
            <a href="#proof" className="transition-colors hover:text-black">
              Proof
            </a>
          </div>
          <Link
            href="/signup"
            className="rounded-full bg-[#141412] px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-black/80"
          >
            Get started
          </Link>
        </nav>
      </header>

      {/* ATTENTION — Cinematic center hero */}
      <section className="relative z-10 flex min-h-svh flex-col items-center justify-center px-6 pt-32 pb-24 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://picsum.photos/seed/blueprint-dusk/1920/1080"
          alt=""
          className="absolute inset-0 -z-20 h-full w-full object-cover opacity-25 grayscale"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(70% 60% at 50% 100%, rgba(250, 250, 248, 0.55), #fafaf8 80%)",
          }}
        />
        <p
          data-hero-reveal
          className="mb-8 text-sm font-medium tracking-[0.3em] text-amber-700 uppercase"
        >
          Estimation, without the spreadsheet
        </p>
        <h1
          data-hero-reveal
          className="mx-auto max-w-6xl text-[clamp(2.75rem,6vw,5.5rem)] leading-[1.02] font-semibold tracking-tight text-balance"
        >
          Price the job. Win the work.
        </h1>
        <p
          data-hero-reveal
          className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-black/60"
        >
          Archestimator turns drawings into defensible numbers — takeoff,
          pricing, and proposal in one calm workspace.
        </p>
        <div
          data-hero-reveal
          className="mt-12 flex flex-col items-center gap-4 sm:flex-row"
        >
          <Link
            href="/signup"
            className="rounded-full bg-[#141412] px-8 py-3.5 text-base font-medium text-white transition-transform duration-300 hover:scale-105"
          >
            Start estimating
          </Link>
          <a
            href="#platform"
            className="rounded-full border border-black/20 px-8 py-3.5 text-base font-medium text-[#141412] transition-colors duration-300 hover:border-black/50"
          >
            See how it works
          </a>
        </div>
      </section>

      {/* INTEREST — statement + gapless bento */}
      <section id="platform" className="relative z-10 px-6 py-32 md:py-48">
        <div className="mx-auto max-w-6xl">
          <h2 className="max-w-5xl text-[clamp(2rem,4.5vw,4rem)] leading-[1.1] font-semibold tracking-tight text-balance">
            From
            <span
              className="mx-3 inline-block h-[0.85em] w-[1.9em] rounded-full bg-cover bg-center align-middle grayscale contrast-125"
              style={{
                backgroundImage:
                  "url(https://picsum.photos/seed/raw-drawing/400/240)",
              }}
            />
            raw drawings to a
            <span
              className="mx-3 inline-block h-[0.85em] w-[1.9em] rounded-full bg-cover bg-center align-middle grayscale contrast-125"
              style={{
                backgroundImage:
                  "url(https://picsum.photos/seed/signed-contract/400/240)",
              }}
            />
            signed proposal in hours, not weeks.
          </h2>

          <div className="mt-24 grid grid-flow-dense grid-cols-1 gap-4 md:grid-cols-3">
            <div
              data-bento-card
              className="group relative overflow-hidden rounded-3xl border border-black/10 md:col-span-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://picsum.photos/seed/site-survey/1280/720"
                alt="Quantity takeoff over a site drawing"
                className="aspect-[16/9] w-full object-cover grayscale transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-8 text-white">
                <h3 className="text-2xl font-semibold">Takeoff that reads the plan</h3>
                <p className="mt-2 max-w-md text-sm text-white/70">
                  Measure once. Every quantity flows straight into your cost
                  model — no re-keying, no version drift.
                </p>
              </div>
            </div>

            <div
              data-bento-card
              className="flex flex-col justify-between rounded-3xl border border-black/10 bg-white p-8 shadow-[0_2px_16px_rgba(0,0,0,0.04)]"
            >
              <Ruler size={32} weight="duotone" className="text-amber-700" />
              <div>
                <h3 className="mt-16 text-xl font-semibold">Assemblies, not rows</h3>
                <p className="mt-2 text-sm leading-relaxed text-black/60">
                  Price by system — wall, roof, fit-out — and let labor,
                  material, and waste resolve themselves.
                </p>
              </div>
            </div>

            <div
              data-bento-card
              className="flex flex-col justify-between rounded-3xl border border-black/10 bg-white p-8 shadow-[0_2px_16px_rgba(0,0,0,0.04)]"
            >
              <HardHat size={32} weight="duotone" className="text-amber-700" />
              <div>
                <h3 className="mt-16 text-xl font-semibold">Numbers you can defend</h3>
                <p className="mt-2 text-sm leading-relaxed text-black/60">
                  Every line traces back to a measurement and a rate. Walk the
                  client through it with confidence.
                </p>
              </div>
            </div>

            <div
              data-bento-card
              className="group relative overflow-hidden rounded-3xl border border-black/10 md:col-span-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://picsum.photos/seed/desk-proposal/1280/720"
                alt="A finished proposal on a desk"
                className="aspect-[16/9] w-full object-cover grayscale transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-8 text-white">
                <h3 className="text-2xl font-semibold">Proposals that close</h3>
                <p className="mt-2 max-w-md text-sm text-white/70">
                  Send a branded, itemized proposal the same day you measured.
                  Clients sign faster when the number makes sense.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Marquee */}
      <section className="relative z-10 border-y border-black/10 py-10">
        <div className="overflow-hidden">
          <div className="marquee-track-3d flex w-max items-center gap-16 pr-16">
            {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
              <div
                key={`${item.label}-${i}`}
                className="flex items-center gap-3 text-black/40"
              >
                <item.icon size={22} weight="duotone" />
                <span className="text-lg font-medium whitespace-nowrap">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DESIRE — pinned split gallery */}
      <section
        id="proof"
        data-pinned-section
        className="relative z-10 px-6 py-32 md:py-48"
      >
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-16 md:grid-cols-2">
          <div className="relative">
            <div data-pinned-title className="flex h-svh flex-col justify-center">
              <h2 className="max-w-md text-[clamp(2rem,4vw,3.5rem)] leading-[1.05] font-semibold tracking-tight text-balance">
                Three steps between the drawing and the signature.
              </h2>
              <p className="mt-6 max-w-sm text-black/60">
                Scroll through the flow — measure, model, present. Each stage
                hands its output to the next without a copy-paste in sight.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-24 py-[20vh]">
            {GALLERY.map((item, index) => (
              <figure key={item.seed} data-gallery-item className="origin-center">
                <div className="group overflow-hidden rounded-3xl border border-black/10 shadow-[0_8px_40px_rgba(0,0,0,0.08)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://picsum.photos/seed/${item.seed}/960/640`}
                    alt={item.caption}
                    className="aspect-[3/2] w-full object-cover grayscale transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                </div>
                <figcaption className="mt-4 flex items-baseline gap-4">
                  <span className="text-sm font-medium text-amber-700">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-lg font-medium">{item.caption}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ACTION — massive CTA + footer */}
      <section className="relative z-10 px-6 py-32 text-center md:py-48">
        <h2 className="mx-auto max-w-5xl text-[clamp(2.5rem,6vw,5rem)] leading-[1.02] font-semibold tracking-tight text-balance">
          Your next bid could be out tonight.
        </h2>
        <Link
          href="/signup"
          className="mt-12 inline-block rounded-full bg-[#141412] px-10 py-4 text-lg font-medium text-white transition-transform duration-300 hover:scale-105"
        >
          Start estimating
        </Link>
      </section>

      <footer className="relative z-10 border-t border-black/10 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 text-sm text-black/40 sm:flex-row">
          <span className="font-semibold text-black/70">Archestimator</span>
          <div className="flex items-center gap-8">
            <Link href="/privacy" className="transition-colors hover:text-black">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-black">
              Terms
            </Link>
            <Link href="/contact" className="transition-colors hover:text-black">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
