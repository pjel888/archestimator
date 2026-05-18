import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, CaretDown, X } from "@phosphor-icons/react/dist/ssr";

const workshopHref = "/workshop";

const collageTiles = ["Ocean site photo", "Crew silhouette", "Sunset progress", "Material close-up", "Sketch detail", "Color swatches"];
const heroTabs = ["Estimate workspace", "Natively integrated cost library", "AI-powered revision insights", "Self-improving proposal system"];
const customerLogos = ["Studio HA", "BuildCo", "Northpoint", "Forma", "MasonWorks", "ArcHaus", "Bahay", "Level10", "Quantify", "SiteOps", "Allied", "Draftline", "Permitly", "Constructa", "ScopeLab", "Ratebook", "CasaWorks", "Tenderly", "FieldOps", "Billwise", "Punchlist", "MetroBuild", "Draftwell", "QTO" ];

const solutionFeatures = [
  ["AI-powered estimator workspace", "A full-browser estimating sheet with project hierarchy, cost rows, component insertion, and proposal context in one working surface."],
  ["A seamless experience for estimates and proposals", "Rows, assumptions, inclusions, exclusions, and commercial notes move together so handoffs from estimate to proposal keep full context."],
  ["AI-powered insights across every revision", "Every quantity, unit rate, scope status, and proposal mapping can become a reviewable change instead of a hidden spreadsheet edit."],
  ["A self-improving cost system", "Reusable library items, supplier notes, and project overrides make every estimate easier to audit, update, and reuse."],
];

const helpdeskBlocks = [
  {
    title: "Resolve estimate questions faster",
    body: "Keep the selected lot, structure, floor, area, row items, and cost components visible so estimators do not lose context while pricing work.",
    cards: ["Context-aware rows", "Component replacement", "Area-targeted insertion"],
    reverse: false,
  },
  {
    title: "Deliver tailored proposals across every project type",
    body: "Translate estimate detail into client-ready packages with structured scope, assumptions, exclusions, allowances, and proposal sections.",
    cards: ["Proposal sections", "Commercial terms", "Frozen snapshots"],
    reverse: true,
  },
  {
    title: "Engage the client at the right moment",
    body: "Use versions, deltas, notes, and issued files to show what changed before a design revision becomes a client decision.",
    cards: ["Revision deltas", "Export history", "Client package status"],
    reverse: false,
  },
  {
    title: "Monitor and improve every estimate",
    body: "Surface pricing confidence, stale supplier assumptions, unassigned rows, and risky scope statuses before they become proposal mistakes.",
    cards: ["Cost confidence", "Source notes", "Risk review"],
    reverse: true,
  },
];

const partnerCards = [
  ["The company you can trust", "Built for contractors who need transparent assumptions, editable data, and proposal-grade traceability."],
  ["Expert support, at every stage", "From setup to revision workflows, the product is shaped around how estimates become real project commitments."],
  ["The estimating blueprint", "A repeatable path from project setup to hierarchy, cost library, revision review, and client-ready proposal issue."],
];

function CtaLink({ href, children, variant = "primary" }: { href: string; children: ReactNode; variant?: "primary" | "secondary" }) {
  return (
    <Link
      href={href}
      className={
        variant === "primary"
          ? "inline-flex min-h-10 items-center justify-center gap-2 rounded-[4px] bg-[#111111] px-4 text-[15px] font-semibold leading-none text-white transition hover:scale-[1.04] hover:bg-[#313130] active:scale-95"
          : "inline-flex min-h-10 items-center justify-center gap-2 rounded-[4px] border border-[#111111] bg-white px-4 text-[15px] font-semibold leading-none text-[#111111] transition hover:scale-[1.04] hover:bg-[#faf9f6] active:scale-95"
      }
    >
      {children}
    </Link>
  );
}

function PlaceholderMedia({ label, className = "" }: { label: string; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-[8px] border border-[#dedbd6] bg-[#e8dfd2] ${className}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.95),transparent_24%),linear-gradient(135deg,#e8dfd2,#faf9f6_45%,#d9d0c1)]" />
      <div className="absolute left-5 top-5 size-2 bg-[#006cff]" />
      <div className="absolute bottom-5 right-5 size-2 bg-[#111111]" />
      <div className="absolute inset-x-7 bottom-8 top-12 rounded-[6px] border border-black/10 bg-white/65 shadow-[0_18px_50px_rgba(17,17,17,0.10)]" />
      <span className="absolute left-7 top-7 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#626260]">{label}</span>
    </div>
  );
}

function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[1180px] overflow-hidden rounded-[8px] border border-[#dedbd6] bg-[#e8dfd2] p-4 sm:p-8 lg:p-12">
      <div className="absolute left-6 top-6 size-2 bg-[#006cff]" />
      <div className="absolute bottom-6 right-6 size-2 bg-[#111111]" />
      <div className="mx-auto overflow-hidden rounded-[6px] border border-black/15 bg-white shadow-[0_22px_70px_rgba(17,17,17,0.16)]">
        <div className="flex h-12 items-center justify-between border-b border-[#dedbd6] px-4">
          <div className="flex items-center gap-2"><span className="size-2 rounded-full bg-[#ff5600]" /><span className="text-[12px] font-semibold text-[#111111]">Grand Hyatt Renovation</span></div>
          <span className="rounded-[4px] bg-[#111111] px-3 py-1.5 font-mono text-[12px] font-semibold text-white">₱4.82M</span>
        </div>
        <div className="grid min-h-[420px] grid-cols-[190px_1fr_270px] bg-[#faf9f6] max-lg:grid-cols-[160px_1fr] max-md:grid-cols-1">
          <aside className="border-r border-[#dedbd6] bg-white p-3 max-md:hidden">
            <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7b7b78]">Estimate tree</p>
            {["Lot 01", "Main structure", "Ground floor", "Kitchen", "Bathroom", "Project-wide"].map((item, index) => <div key={item} className={`mb-1.5 rounded-[4px] px-2 py-2 text-[12px] ${index === 3 ? "bg-[#111111] font-semibold text-white" : "border border-[#dedbd6] bg-[#faf9f6] text-[#313130]"}`}>{item}</div>)}
          </aside>
          <section className="min-w-0 bg-white">
            <div className="grid grid-cols-[minmax(0,1.6fr)_72px_96px_108px] border-b border-[#dedbd6] px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[#7b7b78] max-sm:grid-cols-[1fr_72px]"><span>Component</span><span>Qty</span><span className="text-right max-sm:hidden">Unit</span><span className="text-right max-sm:hidden">Total</span></div>
            {["Porcelain floor tile package", "Waterproofing membrane", "Cabinetry allowance", "Ceiling framing labor", "Lighting rough-in", "Site protection"].map((item, index) => (
              <div key={item} className="grid grid-cols-[minmax(0,1.6fr)_72px_96px_108px] items-center border-b border-[#dedbd6] px-3 py-3 text-[13px] text-[#626260] max-sm:grid-cols-[1fr_72px]"><span className="truncate pr-3 font-semibold text-[#111111]">{item}</span><span className="font-mono">{index + 2}</span><span className="text-right font-mono max-sm:hidden">₱{((index + 2) * 7800).toLocaleString()}</span><span className="text-right font-mono font-semibold text-[#111111] max-sm:hidden">₱{((index + 4) * 18600).toLocaleString()}</span></div>
            ))}
          </section>
          <aside className="border-l border-[#dedbd6] bg-[#faf9f6] p-3 max-lg:hidden">
            <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7b7b78]">Component picker</p>
            {["Supplier tile set", "Painter day rate", "Gypsum partition assembly"].map((item) => <div key={item} className="mb-2 rounded-[6px] border border-[#dedbd6] bg-white p-2"><div className="mb-2 h-16 rounded-[4px] bg-[linear-gradient(135deg,#f1e6d8,#ffffff)]" /><p className="text-[12px] font-semibold text-[#111111]">{item}</p><p className="mt-1 text-[11px] text-[#7b7b78]">Drag or insert into Kitchen</p></div>)}
          </aside>
        </div>
      </div>
    </div>
  );
}

function SectionIntro({ eyebrow, title, body }: { eyebrow?: string; title: string; body: string }) {
  return (
    <div className="mx-auto max-w-[900px] text-center">
      {eyebrow ? <p className="mb-5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7b7b78]">{eyebrow}</p> : null}
      <h2 className="text-[48px] font-normal leading-none tracking-[-0.055em] text-[#111111] sm:text-[64px]">{title}</h2>
      <p className="mx-auto mt-5 max-w-[650px] text-[18px] leading-[1.45] tracking-[-0.02em] text-[#313130]">{body}</p>
      <div className="mt-7 flex justify-center gap-3"><CtaLink href={workshopHref}>Start free trial</CtaLink><CtaLink href="#demo" variant="secondary">View demo</CtaLink></div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-[#111111]">
      <div className="flex min-h-9 items-center justify-center border-b border-[#dedbd6] bg-white px-4 text-center text-[13px] text-[#313130]"><span className="font-semibold">Archestimator 2 — estimating workspace, component library, and proposal package.</span><Link href={workshopHref} className="ml-1 underline underline-offset-4">Open workspace</Link><X className="absolute right-5 size-4 text-[#626260]" weight="bold" /></div>
      <header className="sticky top-0 z-50 border-b border-[#dedbd6] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[68px] w-full max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-2 text-[18px] font-semibold tracking-[-0.03em] text-[#111111]">
            <Image src="/archestimator_logo.png" alt="" width={32} height={32} className="size-8 shrink-0" priority />
            <span className="font-poppins font-normal lowercase">archestimator</span>
          </Link>
          <nav className="hidden items-center gap-7 text-[15px] text-[#111111] md:flex"><a href="#product" className="inline-flex items-center gap-1 hover:text-[#626260]">Product <CaretDown className="size-3" /></a><a href="#customers" className="hover:text-[#626260]">Customers</a><a href="#resources" className="inline-flex items-center gap-1 hover:text-[#626260]">Resources <CaretDown className="size-3" /></a><a href="#pricing" className="hover:text-[#626260]">Pricing</a></nav>
          <nav className="flex items-center gap-4 text-[15px] text-[#111111]"><Link href="/login" className="hidden hover:text-[#626260] sm:inline">Log in</Link><a href="#contact" className="hidden hover:text-[#626260] lg:inline">Contact sales</a><a href="#demo" className="hidden hover:text-[#626260] lg:inline">View demo</a><CtaLink href={workshopHref}>Start free trial</CtaLink></nav>
        </div>
      </header>

      <main>
        <section className="overflow-hidden bg-white">
          <div className="mx-auto w-full max-w-[1440px] px-4 pb-14 pt-14 sm:px-6 lg:px-8 lg:pb-20 lg:pt-20">
            <div className="grid gap-8 lg:grid-cols-[1.08fr_0.55fr] lg:items-end"><h1 className="max-w-[900px] text-[64px] font-normal leading-[0.95] tracking-[-0.065em] text-[#111111] sm:text-[88px] lg:text-[112px]">The only estimate workspace designed for the proposal era</h1><div className="max-w-[440px] lg:pb-3"><p className="text-[18px] font-normal leading-[1.45] tracking-[-0.02em] text-[#313130]">Archestimator brings project hierarchy, reusable cost components, revisions, and client-ready proposal snapshots into one natively connected estimating system.</p><div className="mt-7 flex flex-wrap gap-3"><CtaLink href={workshopHref}>Start free trial <ArrowRight className="size-4" weight="bold" /></CtaLink><CtaLink href="#product" variant="secondary">View demo</CtaLink></div></div></div>
            <div className="mt-14 grid grid-cols-6 items-end gap-3 sm:gap-5 lg:mt-20">{collageTiles.map((label, index) => <div key={label} className={`group relative overflow-hidden rounded-[6px] border border-[#dedbd6] bg-[#faf9f6] ${index % 3 === 0 ? "h-24 sm:h-36" : index % 3 === 1 ? "h-16 sm:h-28" : "h-20 sm:h-32"}`}><div className={`absolute inset-0 ${index === 0 ? "bg-[linear-gradient(135deg,#96c8f8,#f7efe5)]" : index === 1 ? "bg-[radial-gradient(circle_at_30%_20%,#111_0_10%,transparent_11%),linear-gradient(135deg,#f0e1d4,#d8d1c6)]" : index === 2 ? "bg-[linear-gradient(135deg,#ffd4aa,#f9f0e4_50%,#a4c8ff)]" : index === 3 ? "bg-[radial-gradient(circle_at_55%_45%,#111_0_8%,#e8d9c9_9%_100%)]" : index === 4 ? "bg-[repeating-linear-gradient(135deg,#111_0_1px,transparent_1px_10px),#faf9f6]" : "bg-[linear-gradient(135deg,#ff5600,#ffd166,#65b5ff)]"}`} /><span className="absolute bottom-2 left-2 rounded-[3px] bg-white/80 px-1.5 py-1 text-[10px] font-semibold text-[#313130] opacity-0 transition group-hover:opacity-100">{label}</span></div>)}</div>
            <div id="product" className="mt-16 border-t border-[#dedbd6] pt-6"><div className="grid gap-3 text-[15px] font-semibold text-[#9c9fa5] md:grid-cols-4">{heroTabs.map((tab, index) => <button key={tab} className={`border-b pb-4 text-left transition ${index === 0 ? "border-[#111111] text-[#111111]" : "border-[#dedbd6] hover:text-[#111111]"}`}>{tab}</button>)}</div><div className="mt-8"><ProductPreview /></div></div>
          </div>
        </section>

        <section id="customers" className="border-y border-[#dedbd6] bg-white py-10"><div className="mx-auto grid w-full max-w-[1180px] grid-cols-2 gap-x-10 gap-y-6 px-4 text-center font-semibold tracking-[-0.03em] text-[#7b7b78] sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">{customerLogos.map((logo) => <span key={logo}>{logo}</span>)}</div></section>

        <section className="bg-[#faf9f6] py-20 lg:py-28"><div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6 lg:px-8"><SectionIntro title="A complete solution for estimators and contractors" body="Archestimator and its cost library are built together, so you have full visibility across the estimating operation and can collaborate from first takeoff to final proposal." /><div className="mt-16 grid gap-8"><div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]"><PlaceholderMedia label="workspace image placeholder" className="min-h-[520px]" /><article className="self-end rounded-[8px] border border-[#dedbd6] bg-white p-7"><h3 className="text-[32px] font-normal leading-none tracking-[-0.045em]">{solutionFeatures[0][0]}</h3><p className="mt-4 text-[16px] leading-[1.5] text-[#626260]">{solutionFeatures[0][1]}</p></article></div><div className="grid gap-8 lg:grid-cols-2">{solutionFeatures.slice(1,3).map(([title, body], i) => <article key={title} className="rounded-[8px] border border-[#dedbd6] bg-white p-7"><PlaceholderMedia label={`feature image ${i + 1}`} className="mb-6 min-h-[260px]" /><h3 className="text-[32px] font-normal leading-none tracking-[-0.045em]">{title}</h3><p className="mt-4 text-[16px] leading-[1.5] text-[#626260]">{body}</p></article>)}</div><div className="grid gap-8 lg:grid-cols-[0.75fr_1fr]"><article className="rounded-[8px] border border-[#dedbd6] bg-white p-7"><h3 className="text-[32px] font-normal leading-none tracking-[-0.045em]">{solutionFeatures[3][0]}</h3><p className="mt-4 text-[16px] leading-[1.5] text-[#626260]">{solutionFeatures[3][1]}</p><div className="mt-8"><CtaLink href={workshopHref}>Learn more</CtaLink></div></article><PlaceholderMedia label="self improving system image" className="min-h-[360px]" /></div></div></div></section>

        <section className="bg-white py-20 lg:py-28"><div className="mx-auto grid w-full max-w-[1180px] gap-8 px-4 sm:px-6 lg:grid-cols-[0.65fr_1fr] lg:px-8"><div><p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7b7b78]">Estimator engine</p><h3 className="mt-5 text-[48px] font-normal leading-none tracking-[-0.055em]">A world-class estimating workspace</h3><p className="mt-5 text-[18px] leading-[1.45] tracking-[-0.02em] text-[#313130]">A focused operating system for contractors who need faster estimates, clearer revisions, and proposal packages that preserve the commercial truth.</p><div className="mt-7"><CtaLink href={workshopHref}>Learn more</CtaLink></div></div><PlaceholderMedia label="hero product image placeholder" className="min-h-[440px]" /></div></section>

        <section className="border-y border-[#dedbd6] bg-[#faf9f6] py-16"><figure className="mx-auto grid w-full max-w-[1180px] gap-8 px-4 sm:px-6 lg:grid-cols-[0.35fr_1fr] lg:px-8"><PlaceholderMedia label="headshot placeholder" className="min-h-[280px]" /><div><blockquote className="text-[36px] font-normal leading-[1.05] tracking-[-0.045em] text-[#111111]">“If you’re trying to replace spreadsheet chaos with a single estimating system, my advice would be to start where revisions and proposal risk actually happen.”</blockquote><figcaption className="mt-8 text-[15px] text-[#626260]"><strong className="text-[#111111]">Mara Santos</strong><br />Principal Estimator at Northpoint Build</figcaption></div></figure></section>

        <section id="resources" className="bg-white py-20 lg:py-28"><div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6 lg:px-8"><SectionIntro title="A fully-featured proposal-powered estimate system" body="Archestimator has the core surfaces contractors need to price work faster, manage reusable costs, engage clients clearly, and continuously improve proposal quality." /><div className="mt-16 grid gap-14">{helpdeskBlocks.map((block) => <div key={block.title} className={`grid gap-8 lg:grid-cols-2 lg:items-center ${block.reverse ? "lg:[&>*:first-child]:order-2" : ""}`}><PlaceholderMedia label={`${block.title} image placeholder`} className="min-h-[420px]" /><article><h3 className="text-[44px] font-normal leading-none tracking-[-0.055em]">{block.title}</h3><p className="mt-5 text-[18px] leading-[1.45] tracking-[-0.02em] text-[#313130]">{block.body}</p><div className="mt-8 grid gap-3">{block.cards.map((card) => <div key={card} className="rounded-[8px] border border-[#dedbd6] bg-[#faf9f6] p-4"><h4 className="flex items-center justify-between text-[20px] font-normal tracking-[-0.03em]"><span>{card}</span><span aria-hidden="true" className="text-[#7b7b78]">+</span></h4><p className="mt-2 text-[14px] leading-[1.45] text-[#626260]">Placeholder feature detail following Intercom’s compact expandable-card pattern.</p></div>)}</div></article></div>)}</div></div></section>

        <section className="border-y border-[#dedbd6] bg-[#faf9f6] py-16"><figure className="mx-auto grid w-full max-w-[1180px] gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_0.35fr] lg:px-8"><div><blockquote className="text-[36px] font-normal leading-[1.05] tracking-[-0.045em] text-[#111111]">“Our estimating team is dramatically faster when quantities, pricing assumptions, and proposal language stay connected in one workspace.”</blockquote><figcaption className="mt-8 text-[15px] text-[#626260]"><strong className="text-[#111111]">Luis Mercado</strong><br />Operations Lead at MasonWorks</figcaption></div><PlaceholderMedia label="customer image placeholder" className="min-h-[280px]" /></figure></section>

        <section className="bg-white py-20 lg:py-28"><div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6 lg:px-8"><SectionIntro title="A true partner with deep estimating expertise" body="We partner with construction teams to set up repeatable estimate workflows, component libraries, proposal structures, and revision practices that protect margin and client trust." /><div className="mt-16 grid gap-4 lg:grid-cols-3">{partnerCards.map(([title, body]) => <article key={title} className="rounded-[8px] border border-[#dedbd6] bg-[#faf9f6] p-6"><PlaceholderMedia label="support image" className="mb-6 min-h-[210px]" /><h3 className="text-[28px] font-normal leading-none tracking-[-0.045em]">{title}</h3><p className="mt-4 text-[15px] leading-[1.5] text-[#626260]">{body}</p></article>)}</div></div></section>

        <section className="border-y border-[#dedbd6] bg-[#faf9f6] py-16"><figure className="mx-auto grid w-full max-w-[1180px] gap-8 px-4 sm:px-6 lg:grid-cols-[0.35fr_1fr] lg:px-8"><PlaceholderMedia label="partner headshot" className="min-h-[280px]" /><div><blockquote className="text-[36px] font-normal leading-[1.05] tracking-[-0.045em] text-[#111111]">“The best part is not just producing a total faster. It is knowing what changed, why it changed, and what the client is actually agreeing to.”</blockquote><figcaption className="mt-8 text-[15px] text-[#626260]"><strong className="text-[#111111]">George Dilthey</strong><br />Head of Support at FieldOps Builders</figcaption></div></figure></section>

        <section id="pricing" className="bg-white py-20 lg:py-28"><div className="mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-8"><h2 className="text-[56px] font-normal leading-none tracking-[-0.055em]">Transparent pricing</h2><div className="mt-10 grid gap-4 lg:grid-cols-[1fr_0.8fr]"><article className="rounded-[8px] border border-[#dedbd6] bg-[#faf9f6] p-7"><h3 className="text-[36px] font-normal leading-none tracking-[-0.045em]">Archestimator workspace</h3><p className="mt-4 text-[16px] leading-[1.5] text-[#626260]">Combine estimating, cost library, revisions, and proposal snapshots in a single contractor-first system.</p><div className="mt-8 flex items-end gap-2"><span className="text-[56px] font-normal leading-none tracking-[-0.055em]">₱0</span><span className="pb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7b7b78]">MVP preview</span></div><div className="mt-8"><CtaLink href={workshopHref}>Learn more</CtaLink></div></article><PlaceholderMedia label="pricing image placeholder" className="min-h-[360px]" /></div></div></section>

        <section className="bg-[#111111] py-20 text-white lg:py-28"><div className="mx-auto flex w-full max-w-[1240px] flex-col items-start justify-between gap-8 px-4 sm:px-6 lg:flex-row lg:items-end lg:px-8"><div><p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">Start estimating</p><h2 className="mt-4 max-w-[820px] text-[48px] font-normal leading-none tracking-[-0.055em] sm:text-[72px]">Perfect proposal experiences, powered by Archestimator</h2></div><Link href={workshopHref} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[4px] bg-white px-4 text-[15px] font-semibold leading-none text-[#111111] transition hover:scale-[1.04] active:scale-95">Open workspace <ArrowRight className="size-4" weight="bold" /></Link></div></section>
      </main>
    </div>
  );
}
