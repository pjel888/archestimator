import type { Metadata } from "next";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";
import { sanitizeNextPath } from "@/lib/auth/redirects";

export const metadata: Metadata = {
  title: "Sign in — Archestimator",
  description: "Sign in to your Archestimator workspace.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/login" },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; sent?: string; error?: string }>;
}) {
  const { next, sent, error } = await searchParams;
  const safeNext = sanitizeNextPath(next);

  return (
    <AuthLayout route="login" sent={sent} errorCode={error}>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[40px] leading-[1.04] tracking-[0.02em] text-landing-ink">
          Sign in
        </h1>
        <p className="text-[16px] leading-6 text-landing-ink-secondary">
          Sign in to your Archestimator workspace.
        </p>
      </div>
      <LoginForm next={safeNext} />
    </AuthLayout>
  );
}
