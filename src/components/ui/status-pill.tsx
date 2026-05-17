type StatusPillProps = {
  children: React.ReactNode;
  tone?: "neutral" | "approved" | "review" | "danger";
};

const toneClasses = {
  neutral: "bg-surfaceMuted text-secondary",
  approved: "bg-successSoft text-success",
  review: "bg-warningSoft text-warning",
  danger: "bg-dangerSoft text-danger",
};

export function StatusPill({ children, tone = "neutral" }: StatusPillProps) {
  return (
    <span className={`rounded-md px-2 py-1 text-xs font-semibold ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}
