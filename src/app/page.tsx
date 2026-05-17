import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page-shell";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Calculator, BookOpen, GitBranch, FileText, ArrowRight, CheckCircle } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-hairline bg-surface/80 backdrop-blur">
        <PageContainer className="flex h-14 items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight text-foreground">
            Archestimator
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/projects">
              <Button variant="secondary" size="sm">Open workspace</Button>
            </Link>
          </nav>
        </PageContainer>
      </header>

      <main>
        {/* Hero */}
        <section className="border-b border-hairline bg-surface">
          <PageContainer className="py-16 lg:py-24">
            <div className="max-w-3xl">
              <h1 className="text-4xl font-bold tracking-[-0.04em] lg:text-6xl lg:tracking-[-0.055em]">
                Precise construction estimating
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-muted">
                For contractors, architects, and design-build teams who need estimates they can trust—and proposals that look professional.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/projects">
                  <Button variant="primary" size="md">
                    Start estimating
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/projects">
                  <Button variant="secondary" size="md">View demo project</Button>
                </Link>
              </div>
              <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-700" />
                  <span>Local-first data</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-700" />
                  <span>No signup required</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-700" />
                  <span>Professional proposals</span>
                </li>
              </ul>
            </div>
          </PageContainer>
        </section>

        {/* Features */}
        <section className="bg-background py-16 lg:py-24">
          <PageContainer>
            <h2 className="text-2xl font-semibold tracking-[-0.025em]">Built for the way you build</h2>
            <p className="mt-3 max-w-2xl text-muted">
              Archestimator combines spreadsheet familiarity with structured data safety—so you can estimate faster without sacrificing accuracy.
            </p>
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card className="p-6">
                <Calculator className="h-6 w-6 text-accent" />
                <CardTitle className="mt-4 text-base">Familiar estimate sheets</CardTitle>
                <CardDescription className="mt-2">
                  Edit like a spreadsheet with structured rows, sections, and spaces underneath. No broken formulas.
                </CardDescription>
              </Card>
              <Card className="p-6">
                <BookOpen className="h-6 w-6 text-accent" />
                <CardTitle className="mt-4 text-base">Reusable cost library</CardTitle>
                <CardDescription className="mt-2">
                  Build a library of materials, labor rates, and assemblies. Link items to estimates so pricing stays traceable.
                </CardDescription>
              </Card>
              <Card className="p-6">
                <GitBranch className="h-6 w-6 text-accent" />
                <CardTitle className="mt-4 text-base">Version history</CardTitle>
                <CardDescription className="mt-2">
                  Duplicate drafts, compare revisions, and see exactly what changed between estimates.
                </CardDescription>
              </Card>
              <Card className="p-6">
                <FileText className="h-6 w-6 text-accent" />
                <CardTitle className="mt-4 text-base">Client-ready proposals</CardTitle>
                <CardDescription className="mt-2">
                  Issue immutable proposal snapshots with formal terms, scope detail, and professional formatting.
                </CardDescription>
              </Card>
            </div>
          </PageContainer>
        </section>

        {/* Workflow */}
        <section className="border-t border-hairline bg-surface py-16 lg:py-24">
          <PageContainer>
            <h2 className="text-2xl font-semibold tracking-[-0.025em]">From takeoff to proposal</h2>
            <div className="mt-10 grid gap-8 md:grid-cols-3">
              <div>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted text-sm font-bold text-accent">1</span>
                <h3 className="mt-4 text-lg font-semibold tracking-[-0.02em]">Build your estimate</h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Add line items from your cost library or create custom entries. Organize by space and section for clarity.
                </p>
              </div>
              <div>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted text-sm font-bold text-accent">2</span>
                <h3 className="mt-4 text-lg font-semibold tracking-[-0.02em]">Review & revise</h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Track versions, compare changes, and adjust quantities until the numbers are right.
                </p>
              </div>
              <div>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted text-sm font-bold text-accent">3</span>
                <h3 className="mt-4 text-lg font-semibold tracking-[-0.02em]">Issue proposals</h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Generate a professional proposal package with terms, exclusions, and a clear cost summary.
                </p>
              </div>
            </div>
          </PageContainer>
        </section>

        {/* CTA */}
        <section className="bg-foreground py-16 lg:py-24">
          <PageContainer className="text-center">
            <h2 className="text-2xl font-semibold tracking-[-0.025em] text-white">
              Ready to estimate with confidence?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/70">
              Open the workspace and try Archestimator with the demo project—no account needed.
            </p>
            <Link href="/projects" className="mt-8 inline-block">
              <Button variant="primary" size="md">Open the workspace</Button>
            </Link>
          </PageContainer>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-hairline bg-background py-8">
        <PageContainer className="flex flex-col items-center justify-between gap-4 text-sm text-muted sm:flex-row">
          <span>© {new Date().getFullYear()} Archestimator</span>
          <span>Local-first. No signup required to try.</span>
        </PageContainer>
      </footer>
    </div>
  );
}
