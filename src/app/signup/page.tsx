import type { Metadata } from "next";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { ClosedBetaGate } from "@/components/auth/ClosedBetaGate";
import { sanitizeNextPath } from "@/lib/auth/redirects";

export const metadata: Metadata = {
  title: "Start free — Archestimator",
  description: "Request access to the Archestimator closed beta.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/signup" },
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; sent?: string; error?: string }>;
}) {
  const { next, sent, error } = await searchParams;
  const safeNext = sanitizeNextPath(next);

  // L-FUN-2 GATED: when self-serve is enabled, replace <ClosedBetaGate> with
  // <SignupForm>. Until then the signup route is a request-access gate that
  // routes beta requests through the /contact intake with intent=beta-request.
  return (
    <AuthLayout route="signup" sent={sent} errorCode={error}>
      <ClosedBetaGate next={safeNext} />
    </AuthLayout>
  );
}
