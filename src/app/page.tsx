import type { Metadata } from "next";

import { KimiLandingPage } from "./kimi3d/_components/kimi-landing-page";

export const metadata: Metadata = {
  title: {
    absolute: "Archestimator | Construction estimates built for review",
  },
  description:
    "Build itemized construction estimates from reusable cost components, publish client-ready versions, export Excel, and keep review tied to the issued estimate.",
};

export const dynamic = "force-static";

export default function LandingPage() {
  return <KimiLandingPage />;
}
