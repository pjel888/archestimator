import { cn } from "@/lib/ui/cn";
import { ArchestimatorLogoMark } from "./ArchestimatorLogoMark";
import { ArchestimatorWordmark } from "./ArchestimatorWordmark";
import type { ArchestimatorLogoTone } from "./ArchestimatorLogoTypes";

export { ArchestimatorLogoMark } from "./ArchestimatorLogoMark";
export { ArchestimatorWordmark } from "./ArchestimatorWordmark";
export type { ArchestimatorLogoTone } from "./ArchestimatorLogoTypes";

type ArchestimatorLogoProps = {
  tone?: ArchestimatorLogoTone;
  markSize?: number;
  showWordmark?: boolean;
  priority?: boolean;
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
  separatorClassName?: string;
};

export function ArchestimatorLogo({
  tone = "dark",
  markSize = 32,
  showWordmark = true,
  priority = false,
  className,
  markClassName,
  wordmarkClassName,
  separatorClassName,
}: ArchestimatorLogoProps) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2", className)}>
      <ArchestimatorLogoMark tone={tone} size={markSize} className={markClassName} priority={priority} />
      {showWordmark && (
        <>
          <span aria-hidden="true" className={cn("h-7 w-px shrink-0 bg-current/20", separatorClassName)} />
          <ArchestimatorWordmark className={cn("min-w-0 truncate", wordmarkClassName)} />
        </>
      )}
    </span>
  );
}
