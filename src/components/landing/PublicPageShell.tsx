import { ReactNode } from "react";
import { LandingHeader } from "./LandingHeader";
import { LandingFooter } from "./LandingFooter";
import { LandingSmoothScrollProvider } from "./LandingSmoothScrollProvider";

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

          <LandingSmoothScrollProvider>
            <main data-landing-page-root="true">
              {children}
            </main>
          </LandingSmoothScrollProvider>

          <LandingFooter isHomePage={isHomePage} />
        </>
      )}
    </div>
  );
}
