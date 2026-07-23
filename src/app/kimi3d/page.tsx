import type { Metadata } from "next";

import { KimiLandingPage } from "./_components/kimi-landing-page";

export const metadata: Metadata = {
  title: {
    absolute: "Archestimator | Construction estimates built for review",
  },
  description:
    "Build itemized construction estimates from reusable cost components, publish client-ready versions, export Excel, and keep review tied to the issued estimate.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-static";

export default function Kimi3dLandingRoute() {
  return <KimiLandingPage />;
}
