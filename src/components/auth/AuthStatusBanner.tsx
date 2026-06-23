import { getPublicAuthError } from "@/lib/auth/error-mapping";
import { cn } from "@/lib/ui/cn";

/**
 * AuthStatusBanner — the single aria-live status region for the auth surface.
 * Renders the success ("Check your email…") banner when `sent` is truthy, the
 * error banner (mapped through `getPublicAuthError`) when `errorCode` is set,
 * and nothing at all when neither is present (the common first paint).
 *
 * It sits at the TOP of the RIGHT column so a screen reader announces the
 * outcome before the form. `role="status"` + `aria-live="polite"` keeps it
 * non-interrupting (the auth flow never produces a true alert urgency).
 *
 * RSC-safe: no hooks, no "use client".
 */
export interface AuthStatusBannerProps {
  sent?: string | null;
  errorCode?: string | null;
  className?: string;
}

export function AuthStatusBanner({ sent, errorCode, className }: AuthStatusBannerProps) {
  const success = sent ? true : false;
  const publicError = errorCode ? getPublicAuthError(errorCode) : null;

  if (!success && !publicError) return null;

  return (
    <output
      aria-live="polite"
      className={cn(
        "rounded-landing-dense border px-4 py-3 text-[14px] leading-5",
        success
          ? "border-[color:var(--brand-orange)]/30 bg-[color:var(--brand-orange-soft)] text-[color:var(--brand-orange-dark)]"
          : "border-[color:var(--danger)]/30 bg-[color:var(--danger-soft)]/40 text-[color:var(--danger)]",
        className,
      )}
    >
      {success
        ? "Check your email — we sent a sign-in link to your inbox."
        : publicError?.message}
    </output>
  );
}
