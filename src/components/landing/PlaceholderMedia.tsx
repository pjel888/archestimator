export function PlaceholderMedia({ label, className = "" }: { label: string; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-[8px] border border-[#dedbd6] bg-[#e8dfd2] ${className}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.95),transparent_24%),linear-gradient(135deg,#e8dfd2,#faf9f6_45%,#d9d0c1)]" />
      <div className="absolute left-5 top-5 size-2 bg-[#006cff]" />
      <div className="absolute bottom-5 right-5 size-2 bg-[#111111]" />
      <div className="absolute inset-x-7 bottom-8 top-12 rounded-[6px] border border-black/10 bg-white/65 shadow-[0_18px_50px_rgba(17,17,17,0.10)]" />
      <span className="absolute left-7 top-7 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#626260]">{label}</span>
    </div>
  );
}
