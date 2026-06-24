import { cn } from "@/lib/ui/cn";

type ArchestimatorWordmarkProps = {
  className?: string;
};

export function ArchestimatorWordmark({ className }: ArchestimatorWordmarkProps) {
  return <span className={cn("font-sans font-normal lowercase tracking-normal", className)}>archestimator</span>;
}
