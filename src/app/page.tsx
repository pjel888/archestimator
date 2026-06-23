import type { Metadata } from "next";

import { FrontdoorPage } from "@/components/frontdoor";
import { getLandingAuthState } from "@/lib/landing/get-landing-auth-state";

export const metadata: Metadata = {
  title: "Archestimator | Construction estimating workflow",
  description:
    "Keep prices, source evidence, estimate revisions, and proposal packages connected for estimating teams.",
  alternates: { canonical: "/" },
};

export default async function LandingPage() {
  const isLoggedIn = await getLandingAuthState();
  return <FrontdoorPage isLoggedIn={isLoggedIn} />;
}
