import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthLayout } from "@/components/auth/AuthLayout";
import {
  AuthStatusBannerFromSearchParams,
  ClosedBetaGateFromSearchParams,
} from "@/components/auth/AuthSearchParamsState";
import { ClosedBetaGate } from "@/components/auth/ClosedBetaGate";

export const metadata: Metadata = {
  title: "Start free — Archestimator",
  description: "Estimating and proposal workspace for AEC teams. Build structured estimates from your own prices and suppliers.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/signup" },
};

export const dynamic = "force-static";

export default function SignupPage() {
  // L-FUN-2 GATED: when self-serve is enabled, replace <ClosedBetaGate> with
  // <SignupForm>. Until then the signup route is a request-access gate that
  // routes access requests through the /contact intake with intent=started.
  return (
    <AuthLayout
      route="signup"
      statusSlot={
        <Suspense fallback={null}>
          <AuthStatusBannerFromSearchParams />
        </Suspense>
      }
    >
      <Suspense fallback={<ClosedBetaGate />}>
        <ClosedBetaGateFromSearchParams />
      </Suspense>
    </AuthLayout>
  );
}
