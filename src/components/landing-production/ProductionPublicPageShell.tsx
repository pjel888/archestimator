import type { ReactNode } from "react";

import { CookieConsentBanner } from "@/components/landing/CookieConsentBanner";
import { LandingAnalyticsLoader } from "@/components/landing/LandingAnalyticsLoader";

export function ProductionPublicPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-[#111111]">
      <style>{`
        @keyframes workspace-arrow-bounce {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(4px); }
        }
      `}</style>
      {children}
      <CookieConsentBanner />
      <LandingAnalyticsLoader />
    </div>
  );
}
