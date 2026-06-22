import Link from "next/link";
import { ArchestimatorLogo } from "@/components/brand/ArchestimatorLogo";
import { HeroSignalField } from "@/components/landing/gpt-taste/HeroSignalField";
import { LandingGsapMotion } from "@/components/landing/gpt-taste/LandingGsapMotion";
import { cn } from "@/lib/ui/cn";

const START_HREF = "/signup";
const WALKTHROUGH_HREF = "/contact?intent=walkthrough";

const navLinks = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Trust", href: "/trust" },
  { label: "Contact", href: "/contact" },
] as const;

const heroRows = [
  ["Library", "Rates", "Suppliers"],
  ["Estimate", "Areas", "Rows"],
  ["Record", "Revisions", "Export"],
] as const;

const bentoCards = [
  {
    title: "A cost library that remembers.",
    body: "Reusable costs, supplier context, variants, and attachments stay ready.",
    label: "Library",
    className: "lg:col-span-7",
    visual: "library",
  },
  {
    title: "Estimate in project structure.",
    body: "Groups, Areas, rows, quantities, and rollups keep scope legible.",
    label: "Tree",
    className: "lg:col-span-5",
    visual: "tree",
  },
  {
    title: "Drag work forward.",
    body: "Move assemblies into the sheet without rebuilding old files.",
    label: "Reuse",
    className: "lg:col-span-4",
    visual: null,
  },
  {
    title: "Keep the revision trail.",
    body: "Revisions and activity stay attached to the number.",
    label: "Record",
    className: "lg:col-span-4",
    visual: null,
  },
  {
    title: "Share one review surface.",
    body: "Publish one surface for comments, decisions, and export.",
    label: "Proposal",
    className: "lg:col-span-4",
    visual: null,
  },
] as const;

const proofCards = [
  {
    title: "Tree",
    text: "Scope, quantities, totals, and source stay together.",
  },
  {
    title: "Memory",
    text: "Prices, suppliers, variants, and templates carry forward.",
  },
  {
    title: "Handoff",
    text: "Proposal review and export keep the commercial trail intact.",
  },
] as const;

const roleSlices = [
  {
    role: "Estimators",
    line: "Turn prior judgment into a reusable system.",
    visual: "field",
  },
  {
    role: "Contractors",
    line: "Quote familiar scopes without rebuilding the file.",
    visual: "ledger",
  },
  {
    role: "Architects",
    line: "Send cost proposals with the same discipline as the drawings.",
    visual: "plan",
  },
  {
    role: "Suppliers",
    line: "Keep products, variants, and price context ready for proposal work.",
    visual: "catalog",
  },
] as const;

const marqueeItems = [
  "Estimate tree",
  "Cost library",
  "Supplier memory",
  "Version history",
  "Proposal link",
  "Client decisions",
  "Project charts",
] as const;

const pricingCells = [
  {
    title: "Solo estimate",
    text: "Build the record.",
  },
  {
    title: "Shared proposal",
    text: "Invite review.",
  },
  {
    title: "Firm memory",
    text: "Scale the library.",
  },
] as const;

function getBentoVisualStyle(visual: "library" | "tree") {
  if (visual === "library") {
    return {
      backgroundImage:
        "radial-gradient(circle at 1px 1px, rgba(242, 68, 5, 0.24) 1px, transparent 0), radial-gradient(80% 70% at 72% 22%, rgba(255, 178, 124, 0.36), transparent 58%), linear-gradient(135deg, #eef0f3, #ffffff 62%)",
      backgroundSize: "10px 10px, 100% 100%, 100% 100%",
    };
  }

  return {
    backgroundImage:
      "linear-gradient(90deg, rgba(18,18,18,0.08) 1px, transparent 1px), linear-gradient(0deg, rgba(18,18,18,0.08) 1px, transparent 1px), radial-gradient(90% 70% at 42% 28%, rgba(242, 68, 5, 0.22), transparent 62%), linear-gradient(135deg, #f1f2ef, #ffffff 66%)",
    backgroundSize: "56px 56px, 56px 56px, 100% 100%, 100% 100%",
  };
}

function getRoleVisualStyle(visual: (typeof roleSlices)[number]["visual"]) {
  const common =
    "radial-gradient(circle at 1px 1px, rgba(18,18,18,0.13) 1px, transparent 0)";

  if (visual === "field") {
    return {
      backgroundImage: `${common}, radial-gradient(120% 80% at 78% 12%, rgba(242,68,5,0.24), transparent 54%), linear-gradient(135deg, rgba(255,255,255,0.94), rgba(238,240,243,0.86))`,
      backgroundSize: "10px 10px, 100% 100%, 100% 100%",
    };
  }

  if (visual === "ledger") {
    return {
      backgroundImage:
        "linear-gradient(90deg, rgba(18,18,18,0.12) 1px, transparent 1px), linear-gradient(0deg, rgba(18,18,18,0.08) 1px, transparent 1px), radial-gradient(90% 70% at 18% 84%, rgba(242,68,5,0.22), transparent 58%), linear-gradient(135deg, rgba(255,255,255,0.92), rgba(241,242,239,0.94))",
      backgroundSize: "44px 44px, 44px 44px, 100% 100%, 100% 100%",
    };
  }

  if (visual === "plan") {
    return {
      backgroundImage:
        "linear-gradient(35deg, transparent 48%, rgba(18,18,18,0.18) 49%, rgba(18,18,18,0.18) 50%, transparent 51%), linear-gradient(115deg, transparent 48%, rgba(242,68,5,0.22) 49%, rgba(242,68,5,0.22) 50%, transparent 51%), radial-gradient(95% 70% at 50% 20%, rgba(255,178,124,0.24), transparent 58%), linear-gradient(135deg, rgba(255,255,255,0.94), rgba(238,240,243,0.9))",
      backgroundSize: "96px 96px, 124px 124px, 100% 100%, 100% 100%",
    };
  }

  return {
    backgroundImage:
      "repeating-linear-gradient(90deg, rgba(18,18,18,0.12) 0 1px, transparent 1px 18px), repeating-linear-gradient(0deg, rgba(18,18,18,0.08) 0 1px, transparent 1px 28px), radial-gradient(95% 70% at 76% 74%, rgba(242,68,5,0.24), transparent 56%), linear-gradient(135deg, rgba(255,255,255,0.94), rgba(241,242,239,0.94))",
    backgroundSize: "100% 100%, 100% 100%, 100% 100%, 100% 100%",
  };
}

export function RedesignedLandingPage({ isLoggedIn }: { isLoggedIn: boolean }) {
  const primaryHref = isLoggedIn ? "/workshop" : START_HREF;
  const primaryLabel = isLoggedIn ? "Open workspace" : "Start free";

  return (
    <main
      id="main-content"
      data-landing-page-root="true"
      data-gpt-taste-landing="reset"
      className="w-full max-w-full overflow-x-hidden bg-[#eef0f3] text-[#121212]"
    >
      <LandingGsapMotion />
      <a href="#main-content" className="sr-only focus:not-sr-only">
        Skip to content
      </a>

      <nav className="pointer-events-none fixed left-0 right-0 top-0 z-[var(--landing-z-sticky)] px-3 py-3 sm:px-6">
        <div className="mx-auto flex w-full max-w-[1720px] items-center justify-between gap-3">
          <Link
            href="/"
            aria-label="Archestimator home"
            className="pointer-events-auto inline-flex h-12 items-center rounded-full border border-black/10 bg-white/70 px-3 shadow-[0_8px_22px_rgba(30,35,50,0.08),inset_0_1px_rgba(255,255,255,0.78)] backdrop-blur-2xl"
          >
            <ArchestimatorLogo
              tone="dark"
              markSize={30}
              markClassName="size-7"
              separatorClassName="hidden"
              wordmarkClassName="hidden text-[15px] text-[#121212] sm:inline"
            />
          </Link>

          <div className="pointer-events-auto flex h-12 items-center gap-1 rounded-full border border-black/10 bg-white/70 p-1 shadow-[0_8px_22px_rgba(30,35,50,0.08),inset_0_1px_rgba(255,255,255,0.78)] backdrop-blur-2xl">
            <div className="hidden items-center gap-1 lg:flex">
              {navLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex h-10 items-center rounded-full px-4 text-sm font-medium text-[#5a5a5a] transition hover:bg-white/70 hover:text-[#121212]"
                >
                  {item.label}
                </Link>
              ))}
            </div>
            {!isLoggedIn ? (
              <Link href="/login" className="hidden h-10 items-center rounded-full px-4 text-sm font-medium text-[#121212] transition hover:bg-white/70 sm:inline-flex">
                Sign in
              </Link>
            ) : null}
            <Link
              href={primaryHref}
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#111111] px-5 text-sm font-semibold text-white shadow-[inset_0_1px_rgba(255,255,255,0.18)] transition hover:bg-[#2c2c2c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2"
            >
              {primaryLabel}
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative isolate min-h-[100svh] overflow-hidden px-4 pb-6 pt-24 sm:px-6 lg:flex lg:items-end lg:pb-8">
        <div aria-hidden="true" className="absolute inset-0 workshop-dashboard-bloom opacity-85" />
        <div
          aria-hidden="true"
          className="dashboard-grid-pattern absolute inset-x-0 bottom-0 h-[70vh] opacity-30 [mask-image:linear-gradient(to_top,rgba(0,0,0,0.75),transparent)]"
        />
        <div aria-hidden="true" className="absolute left-0 top-0 h-px w-full bg-black/10" />

        <div className="relative z-10 mx-auto grid w-full max-w-[1720px] gap-6 lg:min-h-[calc(100svh-8rem)] lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,1.08fr)] lg:items-end">
          <div className="gsap-hero-copy flex flex-col items-start pb-6 text-left lg:pb-14">
            <h1 className="w-full max-w-6xl font-landing-display text-[clamp(2.75rem,5.35vw,6.15rem)] font-semibold leading-[0.98] tracking-normal text-[#111111] text-balance">
              Estimates that remember
              <br className="hidden sm:block" /> every job.
            </h1>
            <p className="mt-6 max-w-2xl text-[clamp(1.05rem,0.9vw,1.28rem)] leading-[1.5] text-[#4d4d4d] text-pretty">
              Your prices, suppliers, revisions, and proposals become commercial memory.
            </p>
            <div className="mt-8 flex flex-wrap justify-start gap-3">
              <Link
                href={primaryHref}
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#111111] px-7 text-sm font-semibold text-white shadow-[0_18px_50px_rgba(0,0,0,0.22),inset_0_1px_rgba(255,255,255,0.18)] transition hover:bg-[#2c2c2c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2"
              >
                {primaryLabel}
              </Link>
              <Link
                href={WALKTHROUGH_HREF}
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-black/12 bg-white/76 px-7 text-sm font-semibold text-[#121212] shadow-[inset_0_1px_rgba(255,255,255,0.78)] backdrop-blur-xl transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2"
              >
                Book a walkthrough
              </Link>
            </div>
          </div>

          <div className="gsap-hero-visual relative hidden min-h-[560px] overflow-hidden rounded-[12px] border border-[color:var(--glass-border)] bg-white/58 shadow-[0_30px_110px_rgba(30,35,50,0.16),inset_0_1px_rgba(255,255,255,0.82)] backdrop-blur-[18px] lg:block">
            <div aria-hidden="true" className="absolute inset-0 workshop-dashboard-bloom opacity-70" />
            <div aria-hidden="true" className="dashboard-grid-pattern absolute inset-0 opacity-35" />
            <HeroSignalField />
            <div className="absolute left-5 top-5 w-[min(360px,47%)] space-y-2">
              {heroRows.map((row) => (
                <div
                  key={row.join("-")}
                  className="grid grid-cols-[0.9fr_0.7fr_0.8fr] gap-2 rounded-[8px] border border-white/48 bg-white/46 px-3 py-2 text-xs font-semibold text-[#242424] shadow-[inset_0_1px_rgba(255,255,255,0.78)] backdrop-blur-lg"
                >
                  {row.map((cell) => (
                    <span key={cell} className="truncate">
                      {cell}
                    </span>
                  ))}
                </div>
              ))}
            </div>
            <div className="absolute inset-x-5 bottom-5 grid grid-cols-3 gap-2">
              {["Cost library", "Estimate tree", "Proposal record"].map((item) => (
                <div
                  key={item}
                  className="rounded-[8px] border border-white/58 bg-white/54 px-4 py-3 text-sm font-semibold text-[#1d1d1d] shadow-[inset_0_1px_rgba(255,255,255,0.82)] backdrop-blur-xl"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-32 sm:px-6 md:py-48" aria-labelledby="system-heading">
        <div className="mx-auto w-full max-w-[1720px]">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,0.6fr)] lg:items-end">
            <h2
              id="system-heading"
              className="max-w-5xl font-landing-display text-[clamp(2.75rem,5vw,6rem)] font-semibold leading-[1] tracking-normal text-[#111111] text-balance"
            >
              A memory layer for pricing work{" "}
              <span
                aria-hidden="true"
                className="inline-block h-[0.56em] w-[1.35em] rounded-full align-middle"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 2px 2px, rgba(242,68,5,0.34) 1px, transparent 0), linear-gradient(135deg, rgba(255,178,124,0.28), rgba(242,68,5,0.24))",
                  backgroundSize: "8px 8px, 100% 100%",
                }}
              />
            </h2>
            <p className="max-w-xl text-lg leading-[1.55] text-[#5b5b5b]">
              Cost data, estimate structure, revision context, and proposal handoff in one system.
            </p>
          </div>

          <div className="mt-16 grid grid-flow-dense gap-3 lg:grid-cols-12" data-gpt-taste-dense-grid="true">
            {bentoCards.map((card) => (
              <article
                key={card.title}
                className={cn(
                  "group gsap-mechanic-card min-h-[330px] overflow-hidden rounded-[12px] border border-black/10 bg-white/78 shadow-[inset_0_1px_rgba(255,255,255,0.8)] backdrop-blur-lg",
                  "transition duration-500 hover:-translate-y-1 hover:bg-white/90",
                  card.className,
                )}
              >
                {card.visual ? (
                  <div
                    aria-hidden="true"
                    className="h-48 overflow-hidden border-b border-black/10 bg-[#e9edf0]"
                  >
                    <div
                      className="gsap-image-scale h-full w-full bg-cover bg-center opacity-90 transition-transform duration-700 ease-out group-hover:scale-105"
                      style={getBentoVisualStyle(card.visual)}
                    />
                  </div>
                ) : null}
                <div className="flex min-h-[280px] flex-col justify-between p-6 sm:p-8">
                  <p className="font-numeric text-xs uppercase tracking-normal text-[color:var(--brand-orange-dark)]">{card.label}</p>
                  <div>
                    <h3 className="max-w-xl font-landing-display text-[clamp(1.65rem,2vw,2.4rem)] font-semibold leading-[1.05] tracking-normal text-[#111111]">
                      {card.title}
                    </h3>
                    <p className="mt-4 max-w-xl text-base leading-[1.55] text-[#5b5b5b]">{card.body}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="gsap-pin-proof px-4 py-28 sm:px-6 md:py-44" aria-labelledby="proof-heading">
        <div className="mx-auto grid w-full max-w-[1720px] gap-12 lg:grid-cols-[minmax(300px,0.64fr)_minmax(0,1.1fr)]">
          <div className="gsap-pin-title lg:min-h-[60vh]">
            <h2
              id="proof-heading"
              className="max-w-3xl font-landing-display text-[clamp(2.75rem,4.9vw,5.9rem)] font-semibold leading-[1] tracking-normal text-[#111111] text-balance"
            >
              The record stays attached.
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-[1.55] text-[#5b5b5b]">
              No rediscovering the same number twice.
            </p>
          </div>

          <div className="border-y border-black/12">
            {proofCards.map((card, index) => (
              <article
                key={card.title}
                className="gsap-stack-card grid min-h-[220px] border-b border-black/12 py-8 last:border-b-0 sm:grid-cols-[96px_minmax(0,0.5fr)_minmax(0,0.7fr)] sm:gap-6 sm:py-10"
              >
                <span className="font-numeric text-sm text-[color:var(--brand-orange-dark)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-6 font-landing-display text-[clamp(2rem,3vw,3.8rem)] font-semibold leading-[1] tracking-normal text-[#111111] sm:mt-0">
                  {card.title}
                </h3>
                <p className="mt-5 max-w-2xl text-lg leading-[1.5] text-[#505050] sm:mt-1">{card.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden py-12" aria-label="Archestimator workflow primitives">
        <div className="landing-gpt-marquee flex whitespace-nowrap border-y border-black/10 bg-[#111111] py-5 text-white">
          {[0, 1].map((row) => (
            <div key={row} className="landing-gpt-marquee-track flex shrink-0 items-center gap-10 px-5">
              {marqueeItems.map((item) => (
                <span
                  key={`${row}-${item}`}
                  className="font-landing-display text-[clamp(2rem,4vw,4.5rem)] font-semibold leading-none tracking-normal"
                >
                  {item}
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-32 sm:px-6 md:py-48" aria-labelledby="roles-heading">
        <div className="mx-auto w-full max-w-[1720px]">
          <h2
            id="roles-heading"
            className="max-w-5xl font-landing-display text-[clamp(2.6rem,5vw,6rem)] font-semibold leading-[1] tracking-normal text-[#111111] text-balance"
          >
            For the people who price the work.
          </h2>
          <div className="mt-16 flex flex-col overflow-hidden rounded-[12px] border border-black/12 bg-white lg:h-[620px] lg:flex-row">
            {roleSlices.map((slice) => (
              <article
                key={slice.role}
                className="group gsap-role-card relative min-h-[360px] flex-1 overflow-hidden border-b border-black/10 transition-[flex] duration-700 ease-out last:border-b-0 hover:flex-[1.55] lg:border-b-0 lg:border-r lg:last:border-r-0"
              >
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-cover bg-center opacity-80 transition duration-700 group-hover:scale-105 group-hover:opacity-100"
                  style={getRoleVisualStyle(slice.visual)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/72 to-white/8" />
                <div className="relative z-10 flex h-full flex-col justify-end p-7">
                  <h3 className="font-landing-display text-[clamp(2rem,3vw,3.8rem)] font-semibold leading-[1] tracking-normal text-[#111111]">
                    {slice.role}
                  </h3>
                  <p className="mt-4 max-w-md text-base leading-[1.5] text-[#555555]">{slice.line}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-32 sm:px-6 md:py-48" aria-labelledby="pricing-heading">
        <div className="mx-auto grid w-full max-w-[1720px] overflow-hidden rounded-[12px] bg-[#111111] text-white lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.5fr)]">
          <div className="p-8 sm:p-12 lg:p-16">
              <h2
                id="pricing-heading"
                className="max-w-4xl font-landing-display text-[clamp(2.7rem,5vw,6rem)] font-semibold leading-[1] tracking-normal text-white text-balance"
              >
                Start with one estimate. Scale when the team needs it.
              </h2>
          </div>
          <div className="border-t border-white/14 p-8 sm:p-12 lg:border-l lg:border-t-0 lg:p-16">
              <p className="text-lg leading-[1.55] text-white/72">
                Start free. Add collaboration, governance, and firm-wide memory when the work asks for it.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={primaryHref}
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-7 text-sm font-semibold text-[#111111] transition hover:bg-white/88 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]"
                >
                  {primaryLabel}
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/18 bg-white/8 px-7 text-sm font-semibold text-white transition hover:bg-white/14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]"
                >
                  See pricing
                </Link>
              </div>
          </div>
        </div>

        <div className="mx-auto mt-3 grid w-full max-w-[1720px] border-y border-black/12 lg:grid-cols-3">
          {pricingCells.map((item) => (
            <div key={item.title} className="min-h-[220px] border-b border-black/10 py-8 last:border-b-0 lg:border-b-0 lg:border-r lg:px-8 lg:last:border-r-0">
              <p className="font-numeric text-xs uppercase tracking-normal text-[color:var(--brand-orange-dark)]">{item.title}</p>
              <p className="mt-20 max-w-xs font-landing-display text-2xl font-semibold leading-[1.12] text-[#111111]">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer className="px-4 pb-8 sm:px-6">
        <div className="mx-auto flex w-full max-w-[1720px] flex-col gap-6 border-t border-black/12 pt-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <ArchestimatorLogo
              tone="dark"
              markSize={34}
              markClassName="size-8"
              separatorClassName="hidden"
              wordmarkClassName="text-[18px] text-[#111111]"
            />
            <p className="mt-5 max-w-xl text-sm leading-[1.6] text-[#5b5b5b]">
              The cost intelligence layer for AEC teams that want every estimate to make the next
              one faster.
            </p>
          </div>
          <div className="flex flex-wrap gap-5 text-sm text-[#5b5b5b]">
            <Link href="/features" className="hover:text-[#111111]">Features</Link>
            <Link href="/pricing" className="hover:text-[#111111]">Pricing</Link>
            <Link href="/trust" className="hover:text-[#111111]">Trust</Link>
            <Link href="/contact" className="hover:text-[#111111]">Contact</Link>
            <span>© {new Date().getFullYear()} Archestimator</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
