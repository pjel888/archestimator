import type { Metadata } from "next";

import { FrontdoorPage } from "@/components/frontdoor";
import { getLandingAuthState } from "@/lib/landing/get-landing-auth-state";

export const metadata: Metadata = {
  title: "Archestimator | Cost intelligence for estimates",
  description:
    "Connect cost libraries, supplier evidence, estimate revisions, and proposal handoff in one estimating workspace.",
  alternates: { canonical: "/" },
};

export default async function LandingPage() {
  const isLoggedIn = await getLandingAuthState();
  return <FrontdoorPage isLoggedIn={isLoggedIn} />;
}
