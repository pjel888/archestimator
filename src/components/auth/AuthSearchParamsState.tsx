"use client";

import { useSearchParams } from "next/navigation";

import { AuthStatusBanner } from "@/components/auth/AuthStatusBanner";
import { ClosedBetaGate } from "@/components/auth/ClosedBetaGate";
import { LoginForm } from "@/components/auth/LoginForm";
import { sanitizeNextPath } from "@/lib/auth/redirects";

function getSearchParam(searchParams: ReturnType<typeof useSearchParams>, key: string) {
  const value = searchParams.get(key);
  return value && value.trim() ? value : null;
}

export function AuthStatusBannerFromSearchParams() {
  const searchParams = useSearchParams();
  return (
    <AuthStatusBanner
      sent={getSearchParam(searchParams, "sent")}
      errorCode={getSearchParam(searchParams, "error")}
    />
  );
}

export function LoginFormFromSearchParams() {
  const searchParams = useSearchParams();
  return <LoginForm next={sanitizeNextPath(getSearchParam(searchParams, "next"))} />;
}

export function ClosedBetaGateFromSearchParams() {
  const searchParams = useSearchParams();
  return <ClosedBetaGate next={sanitizeNextPath(getSearchParam(searchParams, "next"))} />;
}
