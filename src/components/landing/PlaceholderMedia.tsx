export function PlaceholderMedia({ label, className = "" }: { label: string; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-[12px] border border-[#dedbd6] bg-[#f4f1ea] ${className}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(255,255,255,0.98),transparent_24%),linear-gradient(135deg,#f4f1ea,#fbfaf7_48%,#e5ded2)]" />
      <div className="absolute inset-x-6 bottom-7 top-12 rounded-[10px] border border-black/8 bg-white/72 shadow-[0_18px_50px_rgba(17,17,17,0.08)]" />
      <div className="absolute left-5 top-5 h-1.5 w-8 rounded-full bg-brand-orange/70" />
      <span className="absolute left-6 top-7 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-[#626260]">{label}</span>
    </div>
  );
}
