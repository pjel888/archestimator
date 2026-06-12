import { getLandingAuthState } from "@/lib/landing/get-landing-auth-state";
import { PublicPageShell } from "@/components/landing";
import Link from "next/link";
import { 
  SquaresFour, 
  GitDiff, 
  ChartBar, 
  FileXls, 
  Layout, 
  TreeStructure,
  Coins
} from "@phosphor-icons/react/dist/ssr";

export default async function FeaturesPage() {
  const isLoggedIn = await getLandingAuthState();

  const features = [
    {
      id: "workspace",
      icon: Layout,
      title: "Estimate Workspace",
      maturity: "Available in MVP preview",
      maturityColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      description: "Create and manage structured quote, estimate, and proposal sheets in an early workspace for teams that price and document sales work.",
      problem: "Replaces scattered browser tabs, hidden formulas, and blank spreadsheet setup lag.",
      details: [
        "Protected workspace routes requiring user login.",
        "Interactive grid designed for direct entry of quantities and rates.",
        "Side-by-side node and sheet navigation for quick lookups."
      ]
    },
    {
      id: "hierarchy",
      icon: TreeStructure,
      title: "Project-Shaped Hierarchy",
      maturity: "Available in MVP preview",
      maturityColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      description: "Organize the quote or estimate with flexible groups that follow the commercial breakdown of the offer.",
      problem: "Replaces flat list items that are hard to audit or explain to buyers.",
      details: [
        "Flexible nesting: group by package, location, product family, phase, or scope.",
        "Line items belong to the specific quote section they support.",
        "Roll-up totals match the structure of the offer."
      ]
    },
    {
      id: "components",
      icon: Coins,
      title: "Scope-Targeted Cost Rows",
      maturity: "Available in MVP preview",
      maturityColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      description: "Build itemized pricing directly within the designated sections of the quote structure.",
      problem: "Replaces disconnected rows where you don't know which rate belongs to which scope.",
      details: [
        "Edit quantities and Misc Cost allowances.",
        "Auto-calculating running totals that update instantly across the tree.",
        "Track row-level base cost and miscellaneous allowances without extra columns."
      ]
    },
    {
      id: "library",
      icon: SquaresFour,
      title: "Component Library Workflow",
      maturity: "Partially available in MVP preview",
      maturityColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      description: "Use an early catalog flow to insert reusable products, assemblies, services, and rates into your quote sheets.",
      problem: "Replaces copying and pasting rows between older estimate files, bringing along obsolete rates.",
      details: [
        "Insert pre-configured cost items instantly.",
        "Adjust component quantities and rates dynamically in context without altering the library source.",
        "Context tracking: keep supplier details, tags, and pricing sources beside your cost rows."
      ]
    },
    {
      id: "revisions",
      icon: GitDiff,
      title: "Revision Intelligence",
      maturity: "Planned next",
      maturityColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      description: "Track version indicators as the quote matures to pinpoint exactly how and why prices changed.",
      problem: "Replaces filename suffix madness and blind buyer updates.",
      details: [
        "Version-labeled sheets with unique tracking codes.",
        "Planned revision history timeline indicating who changed what and when.",
        "Future snapshot comparison tool to trace price changes before presenting proposals."
      ]
    },
    {
      id: "comparisons",
      icon: ChartBar,
      title: "Proposal Comparisons",
      maturity: "Planned next",
      maturityColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      description: "Build multiple estimates inside one workspace to compare different options.",
      problem: "Replaces duplicating entire folders and manually cross-referencing alternate bids.",
      details: [
        "Support for alternate quote structures (e.g. Option A vs Option B).",
        "Future comparison dashboard to inspect alternate specifications side-by-side.",
        "Clear highlights of total, material, and labor deltas."
      ]
    },
    {
      id: "handoff",
      icon: FileXls,
      title: "Excel & PDF Handoff",
      maturity: "Planned next",
      maturityColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      description: "Prepare structured quote and proposal data for planned spreadsheet and document handoff workflows.",
      problem: "Replaces hours spent clean-formatting raw spreadsheets and rebuilding PDFs for clients.",
      details: [
        "Planned Excel (.xlsx) export preserving project hierarchy and formulas.",
        "Planned document package generation with custom header and cost summaries.",
        "Clean column mappings ready for team, buyer, or client review."
      ]
    }
  ];

  return (
    <PublicPageShell isLoggedIn={isLoggedIn} isHomePage={false}>
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-[#f5f5f3] to-[#eeeeec] py-20 md:py-28">
        <div className="mx-auto w-full max-w-[1120px] px-6 text-center">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-orange">
            Product Capabilities
          </span>
          <h1 className="mt-5 text-[40px] font-normal leading-[1.08] tracking-[-0.04em] text-[#111111] md:text-[56px]">
            Designed for quote and proposal clarity.
          </h1>
          <p className="mx-auto mt-6 max-w-[620px] text-[16px] leading-7 text-[#626260] md:text-[18px]">
            Explore the features shaping the Archestimator workflow. We keep your structure, component database, revisions, and outputs connected in one workspace.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center justify-center rounded-[5px] bg-[#17181c] px-6 text-[12px] font-bold uppercase tracking-[0.02em] text-white transition hover:bg-[#2a2b30] active:scale-95"
            >
              Try Workspace
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Chapters */}
      <section className="bg-[#eeeeec] py-16 md:py-24">
        <div className="mx-auto w-full max-w-[920px] px-6">
          <div className="space-y-16 md:space-y-24">
            {features.map((feat) => {
              const Icon = feat.icon;
              return (
                <div 
                  key={feat.id}
                  id={feat.id}
                  className="group relative flex flex-col gap-6 rounded-[16px] border border-[#cfcfca]/60 bg-[#f5f5f3] p-6 transition-all duration-300 hover:border-[#cfcfca] hover:shadow-sm md:p-8"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-[8px] bg-[#111111]/5 text-[#111111]">
                        <Icon className="size-5" weight="bold" />
                      </div>
                      <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-[#111111] md:text-[24px]">
                        {feat.title}
                      </h2>
                    </div>
                    <div>
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-mono font-medium ${feat.maturityColor}`}>
                        {feat.maturity}
                      </span>
                    </div>
                  </div>

                  <p className="text-[15px] leading-7 text-[#1f201f] md:text-[16px]">
                    {feat.description}
                  </p>

                  <div className="rounded-[8px] bg-[#eeeeec]/50 p-4 border border-[#cfcfca]/30">
                    <p className="text-[12px] font-mono font-semibold uppercase tracking-[0.08em] text-brand-orange">
                      The Problem We Replace
                    </p>
                    <p className="mt-1 text-[13px] leading-5 text-[#626260]">
                      {feat.problem}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-[12px] font-mono font-semibold uppercase tracking-[0.08em] text-[#111111]/60">
                      Workflow Elements
                    </h3>
                    <ul className="mt-3 space-y-2.5">
                      {feat.details.map((detail, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-[14px] leading-6 text-[#1f201f]">
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-orange" />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Feature CTA */}
      <section className="bg-[#111111] py-16 text-white md:py-24">
        <div className="mx-auto w-full max-w-[800px] px-6 text-center">
          <h2 className="text-[30px] font-normal leading-tight tracking-[-0.04em] text-white sm:text-[40px]">
            Ready to experience a clearer quote workflow?
          </h2>
          <p className="mt-4 text-[15px] leading-6 text-white/60">
            Archestimator is currently in early MVP preview. Open a workspace to explore the structure and build quote models.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center justify-center rounded-[5px] bg-brand-orange px-6 text-[12px] font-bold uppercase tracking-[0.02em] text-white transition hover:bg-brand-orange-dark active:scale-95"
            >
              Try Workspace
            </Link>
            <Link
              href="/contact"
              className="inline-flex min-h-11 items-center justify-center rounded-[5px] border border-white/20 px-6 text-[12px] font-bold uppercase tracking-[0.02em] text-white transition hover:bg-white/10 active:scale-95"
            >
              Request Access
            </Link>
          </div>
        </div>
      </section>
    </PublicPageShell>
  );
}
