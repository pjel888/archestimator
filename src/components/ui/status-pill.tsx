type StatusPillProps = {
  children: React.ReactNode;
  tone?: "neutral" | "approved" | "review" | "danger";
};

const toneClasses = {
  neutral: "bg-surface-muted text-slate-700",
  approved: "bg-green-100 text-green-800",
  review: "bg-amber-100 text-amber-800",
  danger: "bg-red-100 text-red-800",
};

export function StatusPill({ children, tone = "neutral" }: StatusPillProps) {
  return (
    <span className={`rounded-md px-2 py-1 text-xs font-semibold ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}
