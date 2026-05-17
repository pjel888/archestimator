import Link from "next/link";
import { ArrowRight, CheckCircle, CurrencyCircleDollar, FileText, GitBranch, GridFour, Stack } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";

const workshopHref = "/workshop";

const featureCards = [
  {
    icon: GridFour,
    title: "Estimate in the workspace, not a cramped card",
    description: "A full-browser sheet keeps hierarchy, rows, component insertion, and proposal controls in one focused estimating surface.",
  },
  {
    icon: CurrencyCircleDollar,
    title: "Cost clarity from row to proposal",
    description: "Material, labor, quantity, location, and scope data stay structured so every total has a traceable source.",
  },
  {
    icon: GitBranch,
    title: "Revision history with context",
    description: "Duplicate estimate versions and keep deltas visible before a changed scope becomes a client-facing proposal.",
  },
  {
    icon: FileText,
    title: "Client-ready proposal snapshots",
    description: "Issue immutable proposal packages from the same local-first estimate data and print them from the browser.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f7f4ee] text-ink">
      <header className="sticky top-0 z-50 border-b border-black/10 bg-[#f7f4ee]/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-base font-semibold text-ink">
            Archestimator
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium text-secondary">
            <a href="#product" className="hidden hover:text-ink sm:inline">Product</a>
            <a href="#workflow" className="hidden hover:text-ink sm:inline">Workflow</a>
            <Link href={workshopHref} className="hover:text-ink">Workshop</Link>
            <Link href={workshopHref}>
              <Button variant="primary" size="sm">Start blank</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-black/10 bg-[#f7f4ee]">
          <div className="mx-auto w-full max-w-[1440px] px-4 pb-8 pt-12 sm:px-6 lg:px-8 lg:pb-12 lg:pt-16">
            <div className="max-w-5xl">
              <p className="inline-flex min-h-8 items-center gap-2 rounded-full border border-black/15 bg-white px-3 text-xs font-semibold text-secondary">
                <Stack className="size-4 text-[#ff7a1a]" weight="duotone" /> Contractor-first estimating workspace
              </p>
              <h1 className="mt-8 max-w-5xl text-5xl font-semibold leading-none text-ink sm:text-6xl lg:text-7xl">
                Construction estimates, revisions, and proposals in one focused workspace.
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-secondary">
                Archestimator turns project areas, reusable cost components, editable estimate rows, revision deltas, and proposal snapshots into a single local-first workflow for contractors.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={workshopHref}>
                  <Button variant="primary" size="md">
                    Open blank workshop <ArrowRight className="size-4" weight="bold" />
                  </Button>
                </Link>
                <a href="#product">
                  <Button variant="secondary" size="md">Review product direction</Button>
                </a>
              </div>
              <div className="mt-8 grid max-w-3xl gap-3 text-sm text-secondary sm:grid-cols-3">
                {["Editable estimate hierarchy", "Reusable component library", "Immutable proposal snapshots"].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle className="size-4 text-[#11865b]" weight="duotone" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-12 overflow-hidden rounded-lg border border-black/10 bg-white shadow-[0_24px_80px_rgba(17,17,17,0.12)]">
              <div className="flex min-h-12 items-center justify-between border-b border-black/10 px-4">
                <div>
                  <p className="text-xs font-semibold text-muted">Grand Hyatt Sample</p>
                  <p className="text-sm font-semibold text-ink">Interactive estimate workspace</p>
                </div>
                <div className="rounded bg-black px-3 py-2 text-right text-white">
                  <p className="text-[11px] text-white/65">Draft total</p>
                  <p className="font-mono text-sm font-semibold">₱4.82M</p>
                </div>
              </div>
              <div className="grid min-h-[360px] grid-cols-[180px_1fr_260px] bg-[#f5f5f0] max-lg:grid-cols-[150px_1fr] max-md:grid-cols-1">
                <div className="border-r border-black/10 bg-white p-3 max-md:hidden">
                  <p className="text-[11px] font-semibold text-muted">Estimate tree</p>
                  {["GF-01 · Bathroom", "GEN · Project-wide", "Level · Ground Floor", "Area · Kitchen"].map((item, index) => (
                    <div key={item} className={`mt-2 rounded px-2 py-2 text-xs ${index === 0 ? "bg-black text-white" : "bg-[#f5f5f0] text-secondary"}`}>{item}</div>
                  ))}
                </div>
                <div className="min-w-0 bg-white">
                  <div className="grid grid-cols-[minmax(0,1.6fr)_80px_110px_120px] border-b border-black/10 px-3 py-2 text-[11px] font-semibold text-muted">
                    <span>Materials</span><span>Qty</span><span className="text-right">Subtotal</span><span className="text-right">Cost</span>
                  </div>
                  {["Tile A - bathroom floor", "Waterproofing membrane", "Vanity install package", "Ceiling paint labor", "Lighting point rough-in", "Mobilization allowance"].map((item, index) => (
                    <div key={item} className="grid grid-cols-[minmax(0,1.6fr)_80px_110px_120px] items-center border-b border-black/10 px-3 py-3 text-sm text-secondary">
                      <span className="truncate pr-3 font-semibold text-ink">{item}</span>
                      <span className="font-mono">{index + 2}</span>
                      <span className="text-right font-mono">₱{((index + 3) * 18400).toLocaleString()}</span>
                      <span className="text-right font-mono">₱{((index + 5) * 9200).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="border-l border-black/10 bg-[#fbfaf6] p-3 max-lg:hidden">
                  <p className="text-[11px] font-semibold text-muted">Component picker</p>
                  {["Painter labor day rate", "Tile adhesive", "Gypsum board assembly"].map((item) => (
                    <div key={item} className="mt-3 rounded border border-black/10 bg-white p-2 text-xs">
                      <p className="font-semibold text-ink">{item}</p>
                      <p className="mt-1 text-muted">Drag into selected context</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="product" className="bg-[#fbfaf6] py-16 lg:py-20">
          <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold text-[#ff7a1a]">Product system</p>
              <h2 className="mt-3 text-4xl font-semibold leading-tight text-ink lg:text-5xl">A calmer operating system for estimates.</h2>
              <p className="mt-4 text-base leading-7 text-secondary">The public page follows Intercom’s direct SaaS clarity; the app itself follows the legacy v4 full-browser workspace pattern.</p>
            </div>
            <div className="mt-10 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {featureCards.map(({ icon: Icon, title, description }) => (
                <article key={title} className="rounded-lg border border-black/10 bg-white p-4">
                  <Icon className="size-6 text-[#ff7a1a]" weight="duotone" />
                  <h3 className="mt-5 text-lg font-semibold text-ink">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-secondary">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" className="border-y border-black/10 bg-[#f7f4ee] py-16 lg:py-20">
          <div className="mx-auto grid w-full max-w-[1440px] gap-8 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
            <div>
              <p className="text-sm font-semibold text-[#ff7a1a]">Workflow</p>
              <h2 className="mt-3 text-4xl font-semibold leading-tight text-ink lg:text-5xl">From project setup to client proposal.</h2>
            </div>
            <div className="grid gap-3">
              {[
                ["01", "Open the dashboard", "Review active estimate totals, revision state, export status, and hierarchy before opening the editor."],
                ["02", "Estimate in context", "Select a section, floor, or room; then add rows or insert reusable components into that exact context."],
                ["03", "Issue with confidence", "Save the estimate, duplicate revisions, review terms, and issue immutable proposal snapshots."],
              ].map(([step, title, body]) => (
                <div key={step} className="grid gap-3 rounded-lg border border-black/10 bg-white p-4 sm:grid-cols-[72px_1fr]">
                  <span className="font-mono text-sm text-muted">{step}</span>
                  <div>
                    <h3 className="text-xl font-semibold text-ink">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-secondary">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-black py-14 text-white lg:py-16">
          <div className="mx-auto flex w-full max-w-[1440px] flex-col items-start justify-between gap-6 px-4 sm:px-6 lg:flex-row lg:items-center lg:px-8">
            <div>
              <p className="text-sm font-semibold text-white/60">Try the workspace</p>
              <h2 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight lg:text-5xl">Open the sample project and edit a real estimate structure.</h2>
            </div>
            <Link href={workshopHref}>
              <Button variant="secondary" size="md" className="border-white bg-white text-ink hover:bg-white/90">Open blank workshop</Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
