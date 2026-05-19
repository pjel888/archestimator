const customerLogos = [
  "Studio HA", "BuildCo", "Northpoint", "Forma", "MasonWorks", "ArcHaus",
  "Bahay", "Level10", "Quantify", "SiteOps", "Allied", "Draftline",
  "Permitly", "Constructa", "ScopeLab", "Ratebook", "CasaWorks", "Tenderly",
  "FieldOps", "Billwise", "Punchlist", "MetroBuild", "Draftwell", "QTO",
];

export function CustomerLogosSection() {
  return (
    <section id="customers" className="border-y border-[#dedbd6] bg-white py-10">
      <div className="grid w-full grid-cols-2 gap-x-10 gap-y-6 px-6 text-center font-semibold tracking-[-0.03em] text-[#7b7b78] sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {customerLogos.map((logo) => (
          <span key={logo}>{logo}</span>
        ))}
      </div>
    </section>
  );
}
