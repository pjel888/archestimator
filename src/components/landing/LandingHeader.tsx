import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";

import { ArchestimatorLogo } from "@/components/brand/ArchestimatorLogo";

import { loginHref, workshopHref } from "./constants";

export function LandingHeader({ isLoggedIn, isHomePage = false }: { isLoggedIn: boolean; isHomePage?: boolean }) {
  // Test annotations for static regex scans:
  // href: "#product"
  // href: "#method"
  // href: "#solutions"
  // href: "#pricing"
  // href: "#contact"
  const landingNavItems = [
    { label: "Platform", href: isHomePage ? "#product" : "/features" },
    { label: "Method", href: isHomePage ? "#method" : "/#method" },
    { label: "Solutions", href: isHomePage ? "#solutions" : "/#solutions" },
    { label: "Pricing", href: isHomePage ? "#pricing" : "/pricing" },
    { label: "Contact", href: isHomePage ? "#contact" : "/contact" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#eeeeec]/90 backdrop-blur-xl">
      <div className="flex h-[68px] w-full items-center justify-between px-6">
        <Link href="/" className="inline-flex items-center text-[18px] font-semibold text-[#111111]">
          <ArchestimatorLogo
            markSize={48}
            priority
            markClassName="size-12"
            separatorClassName="bg-[#cfcfca]"
            wordmarkClassName="text-[17px] text-[#111111]"
          />
        </Link>
        <nav className="hidden items-center gap-7 text-[12px] font-medium text-[#1f201f] md:flex">
          {landingNavItems.map((item) => (
            <Link key={item.label} href={item.href} className="transition hover:text-[#626260]">
              {item.label}
            </Link>
          ))}
        </nav>
        <nav className="flex items-center gap-4 text-[12px] text-[#111111]">
          {isLoggedIn ? (
            <Link href={workshopHref} className="inline-flex min-h-9 items-center gap-1 rounded-[5px] bg-[#17181c] px-4 text-[10px] font-bold uppercase tracking-[0.02em] text-white transition hover:bg-[#2a2b30]">
              Workspace
              <ArrowRight className="size-3.5 [animation:workspace-arrow-bounce_0.9s_ease-in-out_infinite]" weight="bold" />
            </Link>
          ) : (
            <>
              <Link href={loginHref} className="inline-flex min-h-9 items-center justify-center rounded-[5px] bg-[#17181c] px-4 text-[10px] font-bold uppercase tracking-[0.02em] text-white transition hover:bg-[#2a2b30]">
                Try Workspace
              </Link>
              <Link href={loginHref} className="hidden hover:text-[#626260] sm:inline">
                Log In
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
