"use client";

import Link from "next/link";

import { ControlInput } from "@/components/ui/control-input";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { MagicLinkButton } from "@/components/auth/MagicLinkButton";
import { signInWithEmail, signInWithGoogle } from "@/lib/auth/actions";

/**
 * SignupForm — the near-identical twin of `LoginForm`. Because
 * `signInWithEmail` is `shouldCreateUser:true`, signup is the SAME server action
 * as login; only the user-facing copy differs ("Email me a signup link" vs
 * "Email me a sign-in link", and the cross-link points back to /login). The H1
 * "Start free" is rendered by the ROUTE (`src/app/signup/page.tsx`), not here.
 *
 * `"use client"`: form boundary that may receive focus / submit events.
 *
 * Honeypot: `name="company_url"` (see LoginForm docs). Off-flow + zero-opacity
 * so the field serializes into FormData but is unreachable by keyboard/AT.
 */
export interface SignupFormProps {
  next: string;
}

const HONEYPOT_CLASS = "absolute -z-10 h-0 w-0 opacity-0";

export function SignupForm({ next }: SignupFormProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Google OAuth leaf */}
      <form action={signInWithGoogle} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <div aria-hidden="true" className={HONEYPOT_CLASS}>
          <label htmlFor="signup-company-url">Company URL</label>
          <input
            id="signup-company-url"
            name="company_url"
            type="text"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>
        <GoogleButton label="Continue with Google" className="w-full" />
      </form>

      {/* "or" divider */}
      <div
        className="flex items-center gap-3 text-[14px] text-landing-ink-secondary"
        aria-hidden="true"
      >
        <span className="h-px flex-1 bg-landing-hairline-strong" />
        <span>or</span>
        <span className="h-px flex-1 bg-landing-hairline-strong" />
      </div>

      {/* Email magic-link leaf (signup: shouldCreateUser:true on the action) */}
      <form action={signInWithEmail} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <div aria-hidden="true" className={HONEYPOT_CLASS}>
          <label htmlFor="signup-company-url-2">Company URL</label>
          <input
            id="signup-company-url-2"
            name="company_url"
            type="text"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[14px] font-medium text-landing-ink">Email</span>
          <ControlInput
            name="email"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            required
            className="min-h-11 px-3 text-[16px]"
          />
        </label>

        <MagicLinkButton label="Email me a signup link" className="w-full" />
      </form>

      {/* Cross-link */}
      <p className="text-[14px] text-landing-ink-secondary">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-[color:var(--brand-orange-dark)] underline decoration-landing-hairline-strong underline-offset-2 hover:decoration-[color:var(--brand-orange-dark)]"
        >
          Sign in →
        </Link>
      </p>

      {/* Legal row */}
      <p className="text-[14px] leading-5 text-landing-ink-secondary">
        By continuing you agree to our{" "}
        <Link
          href="/terms"
          className="font-medium text-landing-ink underline decoration-landing-hairline-strong underline-offset-2 hover:decoration-landing-ink"
        >
          Terms
        </Link>{" "}
        and{" "}
        <Link
          href="/privacy"
          className="font-medium text-landing-ink underline decoration-landing-hairline-strong underline-offset-2 hover:decoration-landing-ink"
        >
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
