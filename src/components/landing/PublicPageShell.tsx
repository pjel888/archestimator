import { ReactNode } from "react";
import { CookieConsentBanner } from "./CookieConsentBanner";
import { LandingHeader } from "./LandingHeader";
import { LandingFooter } from "./LandingFooter";
import { LandingAnalyticsLoader } from "./LandingAnalyticsLoader";


interface PublicPageShellProps {
  children: ReactNode;
  isLoggedIn: boolean;
  isHomePage?: boolean;
}

export function PublicPageShell({
  children,
  isLoggedIn,
  isHomePage = false,
}: PublicPageShellProps) {
  return (
    <div className="min-h-screen bg-[#eeeeec] text-[#111111]">
      <style>{`
        @keyframes workspace-arrow-bounce {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(4px); }
        }
      `}</style>

      {isHomePage ? (
        children
      ) : (
        <>
          <LandingHeader isLoggedIn={isLoggedIn} isHomePage={isHomePage} />

          <main data-landing-page-root="true">
            {children}
          </main>

          <LandingFooter isHomePage={isHomePage} />
        </>
      )}
      <CookieConsentBanner />
      <LandingAnalyticsLoader />
    </div>
  );
}
