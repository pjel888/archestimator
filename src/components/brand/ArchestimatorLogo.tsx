import Image from "next/image";

import { cn } from "@/lib/ui/cn";

type ArchestimatorLogoTone = "dark" | "light";

type ArchestimatorLogoMarkProps = {
  tone?: ArchestimatorLogoTone;
  size?: number;
  className?: string;
  priority?: boolean;
};

export function ArchestimatorLogoMark({ tone = "dark", size = 32, className, priority = false }: ArchestimatorLogoMarkProps) {
  return (
    <Image
      src={tone === "light" ? "/archestimator_logo_white.svg" : "/archestimator_logo.svg"}
      alt=""
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      priority={priority}
    />
  );
}

type ArchestimatorWordmarkProps = {
  className?: string;
};

export function ArchestimatorWordmark({ className }: ArchestimatorWordmarkProps) {
  return <span className={cn("font-sans font-normal lowercase tracking-normal", className)}>archestimator</span>;
}

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
