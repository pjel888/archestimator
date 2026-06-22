"use client";

import { cn } from "@/lib/ui/cn";
import {
  getComponentSourceTrustChips,
  getTemplateSourceTrustChips,
  type SourceTrustChipSpec,
  type SourceTrustChipTone,
} from "./source-trust-model";

export { getComponentSourceTrustChips, getTemplateSourceTrustChips };
export type { SourceTrustChipSpec, SourceTrustChipTone };

const TRUST_CHIP_TONE_CLASSES: Record<SourceTrustChipTone, string> = {
  neutral: "border-hairline bg-surfaceMuted text-secondary",
  success: "border-success/20 bg-successSoft text-success",
  warning: "border-warning/20 bg-warningSoft text-warning",
  danger: "border-danger/20 bg-dangerSoft text-danger",
};

export function SourceTrustChips({
  chips,
  ariaLabel,
  className,
  chipClassName,
  maxChips,
}: {
  chips: SourceTrustChipSpec[];
  ariaLabel: string;
  className?: string;
  chipClassName?: string;
  maxChips?: number;
}) {
  if (chips.length === 0) return null;
  const visibleChips = typeof maxChips === "number" ? chips.slice(0, maxChips) : chips;

  return (
    <ul className={cn("flex min-w-0 flex-wrap items-center gap-1", className)} aria-label={ariaLabel}>
      {visibleChips.map((chip) => (
        <li key={chip.id} className="min-w-0">
          <span
            className={cn(
              "inline-flex max-w-full items-center rounded-xs border px-1 py-0.5 text-[8px] font-medium leading-3",
              TRUST_CHIP_TONE_CLASSES[chip.tone],
              chipClassName,
            )}
            title={chip.title}
            data-library-source-trust-chip={chip.id}
          >
            <span className="truncate">{chip.label}</span>
          </span>
        </li>
      ))}
      {visibleChips.length < chips.length ? (
        <li>
          <span
            className={cn(
              "inline-flex items-center rounded-xs border border-hairline bg-surfaceMuted px-1 py-0.5 text-[8px] font-medium leading-3 text-tertiary",
              chipClassName,
            )}
            data-library-source-trust-chip="more"
          >
            +{chips.length - visibleChips.length}
          </span>
        </li>
      ) : null}
    </ul>
  );
}
