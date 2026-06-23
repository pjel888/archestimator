import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ControlInput } from "@/components/ui/control-input";

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
          <ControlInput
            id="beta-access-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            required
            className="min-h-11 px-3 text-[16px]"
          />
        </label>

        <Button type="submit" variant="brand" className="w-full">
          Request access
        </Button>
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
