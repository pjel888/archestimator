import Link from "next/link";

import { ArchestimatorLogo } from "@/components/brand/ArchestimatorLogo";

const footerColor = "rgb(8, 50, 65)";

export function LandingFooter() {
  return (
    <footer
      className="relative isolate flex min-h-[520px] items-center justify-center overflow-hidden px-5 py-24 text-white sm:px-8 lg:min-h-[640px] lg:px-12"
      style={{ backgroundColor: footerColor }}
      data-landing-snap-section="true"
      data-visual-reference="amigo-footer"
    >
      <Link href="/" className="inline-flex items-center" aria-label="Archestimator home">
        <ArchestimatorLogo
          tone="light"
          markSize={48}
          markClassName="size-12"
          separatorClassName="hidden"
          wordmarkClassName="text-[38px] text-white"
        />
      </Link>
    </footer>
  );
}
