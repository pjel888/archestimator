import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PublicPageShell } from "@/components/landing";
import Link from "next/link";
import { Info } from "@phosphor-icons/react/dist/ssr";

async function getLandingAuthState() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return Boolean(user);
  } catch {
    return false;
  }
}

export default async function AboutPage() {
  const isLoggedIn = await getLandingAuthState();

  const theWayElements = [
    {
      title: "Start with Project Structure",
      desc: "Organize estimates by physical layout, trade, or phase. The estimate structure matches the project's reality, not a flat table."
    },
    {
      title: "Price in Context",
      desc: "Insert unit rates, labor assumptions, and supplier links directly alongside the line items they govern."
    },
    {
      title: "Reuse What Repeats",
      desc: "Compile common assemblies (like specific wall build-ups or foundation structures) and drop them into new sheets instantly."
    },
    {
      title: "Keep Assumptions Attached",
      desc: "Notes, calculations, and formulas reside directly in the workspace so team members don't have to search email threads."
    }
  ];

  return (
    <PublicPageShell isLoggedIn={isLoggedIn} isHomePage={false}>
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-[#f5f5f3] to-[#eeeeec] py-20 md:py-28">
        <div className="mx-auto w-full max-w-[1120px] px-6 text-center">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ff7a1a]">
            Our Mission & Logic
          </span>
          <h1 className="mt-5 text-[40px] font-normal leading-[1.08] tracking-[-0.04em] text-[#111111] md:text-[56px]">
            Why Archestimator exists.
          </h1>
          <p className="mx-auto mt-6 max-w-[620px] text-[16px] leading-7 text-[#626260] md:text-[18px]">
            Construction estimating has moved from paper ledger books to Excel, but the core challenge remains: keeping quantities, rates, revisions, and proposals connected.
          </p>
        </div>
      </section>

      {/* Narrative Section: The Messy Workflow */}
      <section className="bg-[#eeeeec] py-12 md:py-16">
        <div className="mx-auto w-full max-w-[760px] px-6">
          <h2 className="text-[24px] font-semibold tracking-tight text-[#111111] md:text-[30px]">
            The Connected Workflow Problem
          </h2>
          <div className="mt-6 space-y-6 text-[15px] leading-7 text-[#1f201f]">
            <p>
              Excel is the most powerful calculator ever created. The enemy isn&apos;t the spreadsheet itself, and it certainly isn&apos;t the estimator. The enemy is the <strong>disconnected file workflow</strong>.
            </p>
            <p>
              When estimates live in separate spreadsheets scattered across localized hard drives, bid risk multiplies. Rates become obsolete, formulas break silently during row additions, revision changes get lost in client email threads, and the final PDF proposal sheet loses its connection to the underlying rate logic.
            </p>
            <p>
              Archestimator was built to create a workspace where estimate structures, reusable rates, change history, and client proposal packages reside in one unified, auditable environment.
            </p>
          </div>
        </div>
      </section>

      {/* The Archestimator Way */}
      <section className="bg-[#eeeeec] py-16 md:py-24 border-t border-[#cfcfca]/40">
        <div className="mx-auto w-full max-w-[920px] px-6">
          <div className="text-center">
            <h2 className="text-[28px] font-semibold tracking-tight text-[#111111] md:text-[34px]">
              The Archestimator Way
            </h2>
            <p className="mt-3 text-[14px] text-[#626260]">
              How we approach construction estimating differently.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {theWayElements.map((item, idx) => (
              <div key={idx} className="rounded-[12px] bg-[#f5f5f3] p-6 border border-[#cfcfca]/50">
                <h3 className="text-[16px] font-semibold text-[#111111]">
                  {item.title}
                </h3>
                <p className="mt-2 text-[14px] leading-6 text-[#626260]">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What We Are Not Section */}
      <section className="bg-[#eeeeec] py-16 md:py-24 border-t border-[#cfcfca]/40">
        <div className="mx-auto w-full max-w-[760px] px-6">
          <div className="rounded-[16px] border border-[#cfcfca]/80 bg-[#111111] p-8 text-white">
            <div className="flex items-center gap-3">
              <Info className="size-6 text-[#ff7a1a]" weight="bold" />
              <h2 className="text-[20px] font-semibold tracking-tight text-white md:text-[24px]">
                What Archestimator is not
              </h2>
            </div>
            
            <p className="mt-4 text-[14px] leading-6 text-white/70">
              We want to be transparent about the boundaries of our workspace. To keep the product fast and reliable:
            </p>

            <div className="mt-6 space-y-5 text-[14px] leading-6">
              <div>
                <strong className="text-white block font-mono text-[11px] uppercase tracking-wider text-[#ff7a1a]">
                  Not a broad ERP
                </strong>
                <p className="text-white/60 mt-1">
                  We do not build HR modules, direct field payroll, inventory registries, or general ledger accounting tools. We focus exclusively on pre-construction estimation and proposal generation.
                </p>
              </div>
              <div>
                <strong className="text-white block font-mono text-[11px] uppercase tracking-wider text-[#ff7a1a]">
                  Not a takeoff-first tool
                </strong>
                <p className="text-white/60 mt-1">
                  We focus on cost structures, quantity math, and rate libraries. We do not currently process raw blueprint files or PDF pixel-measurements directly on the canvas.
                </p>
              </div>
              <div>
                <strong className="text-white block font-mono text-[11px] uppercase tracking-wider text-[#ff7a1a]">
                  Not AI magic
                </strong>
                <p className="text-white/60 mt-1">
                  We do not generate estimates from simple text descriptions. Unit costs, waste factors, and structural relationships remain firmly under the estimator&apos;s professional control.
                </p>
              </div>
              <div>
                <strong className="text-white block font-mono text-[11px] uppercase tracking-wider text-[#ff7a1a]">
                  Not a finished enterprise platform
                </strong>
                <p className="text-white/60 mt-1">
                  Archestimator is currently in early MVP preview. Features like Excel exports, PDF packages, and revision tracking are planned next and will roll out as the platform matures.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-[#111111] py-16 text-white md:py-24 border-t border-white/10">
        <div className="mx-auto w-full max-w-[800px] px-6 text-center">
          <h2 className="text-[30px] font-normal leading-tight tracking-[-0.04em] text-white sm:text-[40px]">
            Join our early-access program
          </h2>
          <p className="mt-4 text-[15px] leading-6 text-white/60">
            Open a workspace today to test our project cost hierarchy, component library, and estimator grid.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center justify-center rounded-[5px] bg-[#ff7a1a] px-6 text-[12px] font-bold uppercase tracking-[0.02em] text-white transition hover:bg-[#e06610] active:scale-95"
            >
              Try Workspace
            </Link>
            <Link
              href="/contact"
              className="inline-flex min-h-11 items-center justify-center rounded-[5px] border border-white/20 px-6 text-[12px] font-bold uppercase tracking-[0.02em] text-white transition hover:bg-white/10 active:scale-95"
            >
              Contact Team
            </Link>
          </div>
        </div>
      </section>
    </PublicPageShell>
  );
}
