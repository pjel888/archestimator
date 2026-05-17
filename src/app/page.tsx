import Link from "next/link";
import { ArrowRight, CheckCircle, CircleDollarSign, FileText, GitBranch, Grid3X3, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const featureCards = [
  {
    icon: Grid3X3,
    title: "Estimate in the workspace, not a cramped card",
    description: "A full-browser sheet gives the grid priority while keeping project structure, library items, and proposal controls within reach.",
  },
  {
    icon: CircleDollarSign,
    title: "Cost clarity from row to proposal",
    description: "Material, labor, scope, and location data stay structured so totals remain traceable as the estimate changes.",
  },
  {
    icon: GitBranch,
    title: "Revision history with context",
    description: "Duplicate, compare, and persist change records so teams can see exactly what moved between estimate versions.",
  },
  {
    icon: FileText,
    title: "Client-ready proposal snapshots",
    description: "Issue proposal packages from the same estimate data without losing terms, exclusions, or scope references.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-ink">
      <header className="sticky top-0 z-50 border-b border-divider bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between px-2 sm:px-2 lg:px-2">
          <Link href="/" className="text-base font-medium tracking-[-0.02em] text-ink">
            Archestimator
          </Link>
          <nav className="flex items-center gap-2 text-sm font-medium text-secondary">
            <a href="#product" className="hidden hover:text-ink sm:inline">Product</a>
            <a href="#workflow" className="hidden hover:text-ink sm:inline">Workflow</a>
            <Link href="/projects">
              <Button variant="primary" size="sm">Open workspace</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="overflow-hidden border-b border-divider bg-background">
          <div className="mx-auto grid w-full max-w-[1600px] gap-2 px-2 py-2 sm:px-2 lg:grid-cols-[minmax(0,0.95fr)_minmax(520px,1.05fr)] lg:px-2 lg:py-2">
            <div className="flex flex-col justify-center">
              <p className="inline-flex w-fit items-center gap-2 rounded-full border border-divider bg-surface px-2 py-1 text-xs font-medium text-secondary">
                <Sparkles className="size-3.5 text-accent" /> Intercom-grade UX for construction estimating
              </p>
              <h1 className="mt-7 max-w-4xl text-4xl font-medium leading-[0.98] tracking-[-0.055em] text-ink sm:text-5xl lg:text-6xl">
                Estimates that feel as focused as your best spreadsheet.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-secondary">
                Archestimator combines a full-browser estimate workspace, local-first project data, revision tracking, and proposal snapshots for design-build teams that need precision without clutter.
              </p>
              <div className="mt-8 flex flex-wrap gap-2">
                <Link href="/projects">
                  <Button variant="primary" size="md">
                    Start estimating <ArrowRight className="size-4" />
                  </Button>
                </Link>
                <Link href="/projects">
                  <Button variant="secondary" size="md">View demo project</Button>
                </Link>
              </div>
              <div className="mt-8 grid gap-2 text-sm text-secondary sm:grid-cols-3">
                {['Full-browser workspace', 'Local-first data', 'Proposal snapshots'].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle className="size-4 text-success" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="halftone-panel relative min-h-[500px] rounded-[24px] border border-divider bg-surfaceWarm p-2 lg:min-h-[580px]">
              <div className="halftone-field absolute right-4 top-2 h-56 w-28 opacity-80" aria-hidden="true" />
              <div className="halftone-field absolute bottom-6 left-5 h-32 w-40 opacity-50" aria-hidden="true" />
              <div className="absolute -right-10 -top-2 size-40 rounded-full bg-accentSoft blur-2xl" />
              <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-divider bg-white shadow-[0_28px_80px_rgba(17,17,17,0.12)]">
                <div className="flex items-center justify-between border-b border-divider px-2 py-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">Grand Hyatt Sample</p>
                    <p className="mt-1 text-lg font-medium tracking-[-0.03em]">Interactive estimate workspace</p>
                  </div>
                  <div className="rounded-md bg-primary px-2 py-2 text-right text-white">
                    <p className="text-[11px] text-white/65">Draft total</p>
                    <p className="font-mono text-sm font-medium">₱4.82M</p>
                  </div>
                </div>
                <div className="grid min-h-0 flex-1 grid-cols-[140px_1fr_170px] gap-2 bg-canvas p-2">
                  <div className="rounded-lg border border-hairline bg-white p-2">
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">Project tree</p>
                    {['Preliminaries', 'Architecture', 'MEPF', 'Bathroom', 'Kitchen'].map((item, index) => (
                      <div key={item} className={`mt-2 rounded-md px-2 py-2 text-xs ${index === 1 ? 'bg-primary text-white' : 'bg-surfaceMuted text-secondary'}`}>{item}</div>
                    ))}
                  </div>
                  <div className="rounded-lg border border-hairline bg-white p-2">
                    <div className="grid grid-cols-[2fr_0.6fr_1fr] border-b border-divider pb-2 text-[10px] font-medium uppercase tracking-[0.1em] text-muted">
                      <span>Item</span><span>Qty</span><span className="text-right">Total</span>
                    </div>
                    {['Wall framing', 'Gypsum board', 'Waterproofing', 'Floor tile', 'Ceiling paint', 'Vanity install', 'Lighting points'].map((item, index) => (
                      <div key={item} className="grid grid-cols-[2fr_0.6fr_1fr] items-center border-b border-hairline py-2.5 text-[11px] text-secondary">
                        <span className="truncate pr-2 font-medium text-ink">{item}</span><span>{index + 2}</span><span className="text-right font-mono">₱{(index + 4) * 24800}</span>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-lg border border-hairline bg-white p-2">
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">Dock</p>
                    <p className="mt-2 text-sm font-medium text-ink">Selected row controls</p>
                    <div className="mt-3 space-y-2">
                      {['Proposal section', 'Scope status', 'Location', 'Unit cost'].map((item) => <div key={item} className="rounded-md border border-hairline bg-surfaceMuted px-2 py-2 text-xs text-secondary">{item}</div>)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="product" className="bg-canvas py-2 lg:py-2">
          <div className="mx-auto w-full max-w-[1600px] px-2 sm:px-2 lg:px-2">
            <div className="max-w-3xl">
              <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent">Product system</p>
              <h2 className="mt-3 text-3xl font-medium tracking-[-0.045em] text-ink lg:text-5xl">A calmer operating system for estimates.</h2>
              <p className="mt-4 text-base leading-7 text-secondary">Inspired by Intercom’s editorial SaaS clarity and Archestimator v4’s full-height workspace: fewer floating cards, more usable canvas.</p>
            </div>
            <div className="mt-10 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {featureCards.map(({ icon: Icon, title, description }) => (
                <article key={title} className="halftone-panel rounded-lg border border-divider bg-surface p-2">
                  <Icon className="size-6 text-accent" />
                  <h3 className="mt-5 text-lg font-medium tracking-[-0.025em] text-ink">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-secondary">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" className="border-y border-divider bg-surface py-2 lg:py-2">
          <div className="mx-auto grid w-full max-w-[1600px] gap-2 px-2 sm:px-2 lg:grid-cols-[0.9fr_1.1fr] lg:px-2">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent">Workflow</p>
              <h2 className="mt-3 text-3xl font-medium tracking-[-0.045em] text-ink lg:text-5xl">From project setup to client proposal.</h2>
            </div>
            <div className="grid gap-2">
              {[
                ['01', 'Open the dashboard', 'Use the left app sidebar to move through projects, library, proposals, and workspace surfaces.'],
                ['02', 'Estimate in context', 'Navigate the project tree, edit the grid, and keep row controls docked to the side.'],
                ['03', 'Issue with confidence', 'Persist revisions and proposal snapshots from the same traceable estimate data.'],
              ].map(([step, title, body]) => (
                <div key={step} className="grid gap-2 rounded-lg border border-divider bg-canvas p-2 sm:grid-cols-[72px_1fr]">
                  <span className="font-mono text-sm text-muted">{step}</span>
                  <div>
                    <h3 className="text-xl font-medium tracking-[-0.03em] text-ink">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-secondary">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="halftone-panel overflow-hidden bg-primary py-2 text-white lg:py-2">
          <div className="mx-auto flex w-full max-w-[1600px] flex-col items-start justify-between gap-2 px-2 sm:px-2 lg:flex-row lg:items-center lg:px-2">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.14em] text-white/60">Try the workspace</p>
              <h2 className="mt-3 max-w-3xl text-3xl font-medium tracking-[-0.045em] lg:text-5xl">Stop squeezing estimates into the middle of the browser.</h2>
            </div>
            <Link href="/projects">
              <Button variant="secondary" size="md" className="border-white bg-white text-ink hover:bg-white/90">Open Archestimator</Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
