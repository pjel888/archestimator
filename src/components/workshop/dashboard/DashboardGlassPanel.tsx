import type { ReactNode } from "react";

import { cn } from "@/lib/ui/cn";

type DashboardPanelSurface = "glass" | "warm" | "plain";

type DashboardGlassPanelProps = {
  /** `glass` + `warm` frost over the bloom (chrome only); `plain` = crisp white for dense data. */
  surface?: DashboardPanelSurface;
  className?: string;
  /** Optional faint drafting dot-grid behind content (decorative surfaces only). */
  pattern?: boolean;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  role?: string;
  children: ReactNode;
};

const SURFACE_CLASS: Record<DashboardPanelSurface, string> = {
  // Frosted recipes carry their own 12px radius + shadow via the CSS class.
  glass: "dashboard-glass",
  warm: "dashboard-glass-warm",
  // Dense, legible data stays plain white with a hairline + xs radius (no blur).
  plain: "rounded-xs border border-hairline bg-white",
};

/**
 * The dashboard's single surface primitive. Caps blur usage: prefer a few large
 * `glass`/`warm` panels for chrome and `plain` for text-dense lists so the data
 * never sits on a blurred layer. Content is always crisp on top.
 */
export function DashboardGlassPanel({
  surface = "glass",
  className,
  pattern = false,
  children,
  role,
  ...aria
}: DashboardGlassPanelProps) {
  return (
    <section
      role={role}
      aria-label={aria["aria-label"]}
      aria-labelledby={aria["aria-labelledby"]}
      className={cn("relative overflow-hidden", SURFACE_CLASS[surface], className)}
    >
      {pattern ? (
        <span aria-hidden="true" className="dashboard-grid-pattern pointer-events-none absolute inset-0" />
      ) : null}
      <div className="relative">{children}</div>
    </section>
  );
}
