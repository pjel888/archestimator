import { cn } from "@/lib/ui/cn";

export function StatCard({ label, value, dark = false, className }: { label: string; value: string; dark?: boolean; className?: string }) {
  return <div className={cn("rounded-2xl p-4", dark ? "bg-foreground text-white" : "border border-hairline bg-surface", className)}><p className={cn("text-xs", dark ? "text-white/70" : "text-muted")}>{label}</p><p className="mt-1 font-mono text-xl font-semibold">{value}</p></div>;
}
