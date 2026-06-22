import { ArchestimatorLogo } from "@/components/brand/ArchestimatorLogo";
import { BrandComposition } from "@/components/landing/shared/BrandComposition";
import { cn } from "@/lib/ui/cn";

/**
 * AuthGlassPanel — the decorative LEFT column of the full-page 2-col auth
 * surface (keystone decision D-2 / `23-AUTH-EXPERIENCE.md`).
 *
 * It is PURE presentational brand material: the signal-orange logo slab over a
 * `.dashboard-glass` surface that carries a `BrandComposition variant="auth-panel"`
 * tasteful brand composition. No copy, no fake product screenshots, no stock
 * photos (D-2 / radical honesty). The whole subtree is `aria-hidden="true"` and
 * removed from the tab order — it is decoration, never information.
 *
 * RSC-safe: no hooks, no "use client".
 *
 * Variants:
 *  - "full":     the ~52% brand panel visible at `lg:` and above.
 *  - "compact":  the ~120px brand header the panel collapses to below `md:`.
 */
export type AuthGlassPanelVariant = "full" | "compact";

export interface AuthGlassPanelProps {
  variant?: AuthGlassPanelVariant;
  className?: string;
}

export function AuthGlassPanel({ variant = "full", className }: AuthGlassPanelProps) {
  if (variant === "compact") {
    return (
      <div
        aria-hidden="true"
        className={cn(
          "dashboard-glass relative isolate flex items-center gap-3 overflow-hidden rounded-landing-panel border border-landing-hairline px-4 py-4",
          className,
        )}
      >
        <ArchestimatorLogo
          tone="dark"
          markSize={28}
          showWordmark={true}
          className="relative z-10 text-landing-ink"
          wordmarkClassName="text-[14px] text-landing-ink"
        />
        {/* Thin gradient strip echoing the full panel's bloom. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-0 bg-[linear-gradient(90deg,var(--brand-orange)_0%,var(--brand-amber)_55%,var(--brand-peach)_100%)] opacity-[0.18]"
        />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        "dashboard-glass relative isolate flex h-full min-h-[480px] flex-col overflow-hidden rounded-landing-panel border border-landing-hairline p-6",
        className,
      )}
    >
      {/* Signal-orange logo slab pinned to the top of the brand panel. */}
      <div className="relative z-10 flex items-center">
        <span className="inline-flex items-center gap-2 rounded-landing-dense bg-brand-orange px-3 py-2">
          <ArchestimatorLogo
            tone="light"
            markSize={28}
            showWordmark={true}
            wordmarkClassName="text-[14px] text-white"
          />
        </span>
      </div>

      {/* Tasteful brand composition fills the remainder of the panel. */}
      <div className="relative z-0 mt-4 flex-1">
        <BrandComposition variant="auth-panel" className="h-full min-h-0" />
      </div>
    </div>
  );
}
