import { isDevRemoteBindingsEnabled } from "@/lib/cloudflare/dev-remote-bindings";

/**
 * Persistent warning when local workshop is bound to production D1/R2.
 * Server-only; never shown when the opt-in flag is off.
 */
export function DevRemoteBindingsBanner() {
  if (process.env.NODE_ENV === "production" || !isDevRemoteBindingsEnabled()) {
    return null;
  }

  return (
    <div
      role="status"
      className="border-b border-[color:var(--glass-border)] bg-[color:var(--color-surface-muted)] px-3 py-1.5 text-[11px] leading-snug text-[color:var(--color-muted-foreground)]"
    >
      Local workshop is using production D1 and R2. Saves, deletes, and uploads
      change live archestimator.com data. Unset ARCH_DEV_USE_REMOTE_BINDINGS to
      return to isolated local bindings.
    </div>
  );
}
