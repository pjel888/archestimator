import Link from "next/link";
import { ArchestimatorLogo } from "@/components/brand/ArchestimatorLogo";
import { MaturityTag } from "@/components/landing/shell/MaturityTag";
import { FOOTER_CLAIM_ROWS } from "@/components/landing/claims-ledger/claims-data";
import { StatusPill } from "@/components/landing/shared/StatusPill";

/**
 * LandingFooter - glass sitemap for public pages.
 */

const REQUEST_EARLY_ACCESS_HREF = "/contact?intent=early-access";

const FOOTER_COLUMNS: Array<{ heading: string; links: Array<{ label: string; href: string }> }> = [
  {
    heading: "Product",
    links: [
      { label: "Features", href: "/features" },
      { label: "Pricing", href: "/pricing" },
      { label: "Trust", href: "/trust" },
      { label: "Request early access", href: REQUEST_EARLY_ACCESS_HREF },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Book a walkthrough", href: "/contact?intent=walkthrough" },
    ],
  },
  {
    heading: "Account",
    links: [
      { label: "Sign in", href: "/login" },
      { label: "Request early access", href: REQUEST_EARLY_ACCESS_HREF },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer
      className="relative isolate px-[var(--landing-section-pad-x)] pt-[var(--landing-space-3xl)] pb-[var(--landing-space-xl)]"
      data-visual-reference="amigo-footer"
    >
      <div className="dashboard-glass mx-auto w-full max-w-[1180px] rounded-landing-panel border border-landing-hairline p-[var(--landing-space-xl)]">
        {/* Top row: wordmark + tagline */}
        <div className="flex flex-col gap-[var(--landing-space-md)] border-b border-landing-hairline pb-[var(--landing-space-lg)] md:flex-row md:items-center md:justify-between">
          <Link href="/" aria-label="Archestimator home" className="inline-flex items-center">
            <ArchestimatorLogo
              tone="dark"
              markSize={36}
              markClassName="size-9"
              separatorClassName="hidden"
              wordmarkClassName="text-[18px] text-landing-ink"
            />
          </Link>
          <p className="font-display text-landing-text-body-sm leading-landing-tight text-landing-ink-secondary md:text-right">
            Archestimator - the cost intelligence layer for AEC teams.
            <br className="hidden sm:block" />
            From cost proposal to client approval.
          </p>
        </div>

        {/* Sitemap columns */}
        <nav
          aria-label="Footer"
          className="grid grid-cols-2 gap-[var(--landing-space-lg)] py-[var(--landing-space-lg)] sm:grid-cols-4"
        >
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.heading} className="flex flex-col gap-[var(--landing-space-sm)]">
              <p className="font-numeric text-landing-text-label uppercase tracking-landing-label text-landing-ink-muted">
                {col.heading}
              </p>
              <ul className="flex flex-col gap-[var(--landing-space-2xs)]">
                {col.links.map((link) => (
                  <li key={`${col.heading}-${link.label}`}>
                    <Link
                      href={link.href}
                      className="text-landing-text-body-sm text-landing-ink-secondary transition hover:text-landing-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 focus-visible:ring-offset-landing-canvas"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Honesty abbreviation. */}
        <dl className="grid grid-cols-1 gap-[var(--landing-space-2xs)] border-t border-landing-hairline pt-[var(--landing-space-lg)] sm:grid-cols-3">
          {FOOTER_CLAIM_ROWS.map((row) => (
            <div key={row.claim} className="flex flex-col gap-[var(--landing-space-3xs)]">
              <div className="flex items-center gap-[var(--landing-space-2xs)]">
                <StatusPill status={row.status} redline={row.redline} size="sm" />
                <dt className="text-landing-text-caption text-landing-ink-muted">{row.source}</dt>
              </div>
              <dd className="text-landing-text-caption leading-landing-prose text-landing-ink-secondary">
                {row.claim}
              </dd>
            </div>
          ))}
        </dl>

        {/* Status line */}
        <div className="mt-[var(--landing-space-lg)] flex flex-col gap-[var(--landing-space-sm)] border-t border-landing-hairline pt-[var(--landing-space-lg)] text-landing-text-caption text-landing-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-[var(--landing-space-sm)]">
            <MaturityTag size="md" />
            <span>Not production-hardened enterprise SaaS. Exports are working documents, not immutable issued records. AI is on the roadmap.</span>
          </div>
          <span>© {new Date().getFullYear()} Archestimator.</span>
        </div>
      </div>
    </footer>
  );
}
