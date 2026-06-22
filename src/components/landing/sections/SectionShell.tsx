import { type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

/**
 * SectionShell — the shared wrapper for every homepage section. Encodes the
 * section rhythm (doc 03 §3.5 `--landing-section-pad-y/x`) + the optional
 * accent rail (D-3 presence mark on section openers) + the `data-reveal`
 * marker the LandingShellClient reveals on scroll. RSC-safe.
 */
export interface SectionShellProps {
  /** Optional inner content. Some sections (hero, intro) render only the header. */
  children?: ReactNode;
  /** Semantic label for the section (used as aria-label on the <section>). */
  label: string;
  /** Optional id for in-page anchoring (#features, #how-it-works). */
  id?: string;
  /** Optional short label rendered above the heading. */
  eyebrow?: string;
  /** The section <h2> (or heading-level passed via `as`). */
  heading?: ReactNode;
  /** Optional lead paragraph under the heading. */
  lead?: ReactNode;
  /** Renders a 2px --brand-orange accent rail at the left edge of the section opener (D-3). */
  accentRail?: boolean;
  /** Background treatment. Default = transparent (floats on the canvas wash). */
  surface?: "canvas" | "glass";
  /** Heading level for the heading (default h2). Hero passes h1 separately. */
  as?: ElementType;
  className?: string;
  /** Inner content max width. */
  innerClassName?: string;
}

export function SectionShell({
  children,
  label,
  id,
  eyebrow,
  heading,
  lead,
  accentRail = false,
  surface = "canvas",
  as,
  className,
  innerClassName,
}: SectionShellProps) {
  const Heading = (as ?? "h2") as ElementType;
  return (
    <section
      id={id}
      aria-label={label}
      data-reveal="true"
      data-landing-section={id ?? label}
      className={cn(
        "relative w-full",
        "py-[var(--landing-section-pad-y)] px-[var(--landing-section-pad-x)]",
        surface === "glass" && "bg-landing-canvas/0",
        className,
      )}
    >
      <div className={cn("mx-auto w-full max-w-[min(1680px,calc(100vw-32px))]", innerClassName)}>
        {(eyebrow || heading || lead) && (
          <header
            className={cn(
              "flex flex-col gap-[var(--landing-space-xs)]",
              "mb-[var(--landing-space-xl)]",
            )}
          >
            {eyebrow ? (
              <p
                className={cn(
                  "inline-flex items-center gap-[var(--landing-space-2xs)]",
                  "font-numeric text-landing-text-label uppercase tracking-normal text-landing-ink-muted",
                )}
              >
                {accentRail ? (
                  <span
                    aria-hidden="true"
                    className="inline-block h-[14px] w-[2px] rounded-full bg-brand-orange"
                  />
                ) : null}
                {eyebrow}
              </p>
            ) : null}
            {heading ? (
              <Heading
                className={cn(
                  "max-w-[56rem] font-landing-display text-landing-headline leading-landing-headline tracking-landing-headline text-landing-ink text-balance",
                )}
              >
                {heading}
              </Heading>
            ) : null}
            {lead ? (
              <p className="max-w-[var(--landing-measure-prose)] text-landing-text-body-lg leading-landing-prose text-landing-ink-secondary text-pretty">
                {lead}
              </p>
            ) : null}
          </header>
        )}
        {children}
      </div>
    </section>
  );
}
