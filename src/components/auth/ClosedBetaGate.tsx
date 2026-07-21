import Link from "next/link";

/**
 * ClosedBetaGate — the request-access variant of the signup surface. This is the
 * SAFE DEFAULT until L-FUN-2 enables self-serve signup: instead of a live
 * magic-link form, the visitor leaves an email and the request is queued via the
 * `/contact` intake with `intent=beta-request`.
 *
 * Form action: there is no contact server action in `src/lib/landing/` (the
 * existing `/contact` page renders a client `mailto`-builder), so per the auth
 * spec this gate posts a plain HTML form to `/contact` with a hidden
 * `intent=beta-request` field. The honeypot `name="company_url"` is included to
 * honor the "every auth form carries a honeypot" hard contract.
 *
 * This gate OWNS the H1 ("Start free") — the route does NOT render it.
 *
 * RSC-safe: no hooks, no "use client".
 */
export interface ClosedBetaGateProps {
  /** Optional `next` to remember through the beta-request intake. */
  next?: string;
}

const HONEYPOT_CLASS = "absolute -z-10 h-0 w-0 opacity-0";

export function ClosedBetaGate({ next }: ClosedBetaGateProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[40px] leading-[1.04] tracking-[0.02em] text-landing-ink">
          Start free
        </h1>
        <p className="text-[16px] leading-6 text-landing-ink-secondary">
          Archestimator is in closed beta. Request your invite and we&apos;ll
          reach out.
        </p>
      </div>

      <form
        action="/contact"
        method="post"
        className="flex flex-col gap-4"
      >
        <input type="hidden" name="intent" value="beta-request" />
        {next ? <input type="hidden" name="next" value={next} /> : null}

        {/* Honeypot — see LoginForm docs. */}
        <div aria-hidden="true" className={HONEYPOT_CLASS}>
          <label htmlFor="beta-company-url">Company URL</label>
          <input
            id="beta-company-url"
            name="company_url"
            type="text"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <label htmlFor="beta-access-email" className="flex flex-col gap-1.5">
          <span className="text-[14px] font-medium text-landing-ink">Email</span>
          <input
            id="beta-access-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            required
            className="min-h-[52px] w-full min-w-0 rounded-full border border-landing-hairline-strong bg-white px-5 text-[16px] leading-none text-landing-ink outline-none transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] placeholder:text-landing-ink-muted hover:border-landing-ink-muted focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/15"
          />
        </label>

        <button
          type="submit"
          className="group inline-flex min-h-[52px] w-full cursor-pointer items-center justify-between gap-3 rounded-full bg-brand-orange pl-6 pr-2 text-left text-[15px] font-medium leading-none text-white shadow-[0_1px_2px_rgba(194,56,4,0.25),inset_0_1px_0_rgba(255,255,255,0.18)] outline-none transition-[background-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-brand-orange-dark focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50"
        >
          <span className="flex-1 text-center">Request access</span>
          <span
            aria-hidden="true"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-white/15 transition-[transform,background-color] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:bg-white/25"
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              className="size-4"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M2.5 8h11m0 0L9 3.5M13.5 8 9 12.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>
      </form>

      <p className="text-[14px] text-landing-ink-secondary">
        Already invited?{" "}
        <Link
          href="/login"
          className="font-medium text-[color:var(--brand-orange-dark)] underline decoration-landing-hairline-strong underline-offset-2 hover:decoration-[color:var(--brand-orange-dark)]"
        >
          Sign in →
        </Link>
      </p>
    </div>
  );
}
