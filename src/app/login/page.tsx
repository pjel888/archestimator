import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthLayout } from "@/components/auth/AuthLayout";
import {
  AuthStatusBannerFromSearchParams,
  LoginFormFromSearchParams,
} from "@/components/auth/AuthSearchParamsState";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign in — Archestimator",
  description: "Sign in to your Archestimator workspace.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/login" },
};

export default function LoginPage() {
  return (
    <AuthLayout
      route="login"
      statusSlot={
        <Suspense fallback={null}>
          <AuthStatusBannerFromSearchParams />
        </Suspense>
      }
    >
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[40px] leading-[1.04] tracking-[0.02em] text-landing-ink">
          Sign in
        </h1>
        <p className="text-[16px] leading-6 text-landing-ink-secondary">
          Sign in to your Archestimator workspace.
        </p>
      </div>
      <Suspense fallback={<LoginForm next="/workshop" />}>
        <LoginFormFromSearchParams />
      </Suspense>
    </AuthLayout>
  );
}
