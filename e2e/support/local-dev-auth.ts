import { spawnSync } from "node:child_process";

import type { BrowserContext } from "@playwright/test";

const DEV_AUTH_COOKIE_NAME = "archestimator-dev-auth-bypass";

export type ProtectedRouteE2eAuth = {
  hasAuthenticatedStorageState: boolean;
  usesDevAuthBypass: boolean;
  bypassSecret: string;
};

let devAuthBypassPreflightPassed: boolean | undefined;

export function getProtectedRouteE2eAuth(): ProtectedRouteE2eAuth {
  const hasAuthenticatedStorageState = Boolean(process.env.PLAYWRIGHT_STORAGE_STATE);
  const bypassSecret = process.env.ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET?.trim() ?? "";
  const usesDevAuthBypass = !hasAuthenticatedStorageState
    && process.env.ARCHESTIMATOR_DEV_AUTH_BYPASS === "1"
    && bypassSecret.length >= 32;

  return { hasAuthenticatedStorageState, usesDevAuthBypass, bypassSecret };
}

export function isProtectedRouteE2eAuthReady(auth: ProtectedRouteE2eAuth) {
  return auth.hasAuthenticatedStorageState || auth.usesDevAuthBypass;
}

export function isLocalDevAuthBypassReady(auth: ProtectedRouteE2eAuth) {
  if (!auth.usesDevAuthBypass) return true;
  if (devAuthBypassPreflightPassed !== undefined) return devAuthBypassPreflightPassed;

  const result = spawnSync("bun", ["run", "ops:check-dev-auth-bypass"], {
    cwd: process.cwd(),
    stdio: "ignore",
    timeout: 35_000,
  });
  devAuthBypassPreflightPassed = result.status === 0 && !result.error && !result.signal;
  return devAuthBypassPreflightPassed;
}

export async function installLocalDevAuthBypass(context: BrowserContext, auth: ProtectedRouteE2eAuth) {
  if (!auth.usesDevAuthBypass) return;

  await context.addCookies([
    {
      name: DEV_AUTH_COOKIE_NAME,
      value: auth.bypassSecret,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: false,
      sameSite: "Lax",
    },
  ]);
}
