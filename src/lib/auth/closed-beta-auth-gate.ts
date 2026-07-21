import "server-only";

import { APIError } from "better-auth";

import {
  getClosedBetaAccessForEmail,
  normalizeClosedBetaEmail,
  resolveClosedBetaRuntimeEnv,
  type ClosedBetaAccessResult,
} from "@/lib/auth/closed-beta-access";
import {
  getClosedBetaAccessFromD1,
  markClosedBetaAllowlistAcceptedInD1,
} from "@/lib/auth/closed-beta-d1-store";
import type { D1DatabaseLike } from "@/lib/cloudflare/d1";

const CLOSED_BETA_DENIED_CODE = "CLOSED_BETA_DENIED";
const CLOSED_BETA_DENIED_MESSAGE = "This account is not enabled for Archestimator access.";

type BetterAuthUserEmailRow = {
  email: string | null;
};

function throwClosedBetaDenied() {
  throw new APIError("FORBIDDEN", {
    code: CLOSED_BETA_DENIED_CODE,
    message: CLOSED_BETA_DENIED_MESSAGE,
  });
}

export async function resolveClosedBetaAccessForEmailAgainstD1(
  d1Database: D1DatabaseLike,
  email: string | null | undefined,
): Promise<ClosedBetaAccessResult> {
  const env = await resolveClosedBetaRuntimeEnv();
  return getClosedBetaAccessForEmail({
    email,
    env,
    store: {
      checkAccess: (normalizedEmail) => getClosedBetaAccessFromD1(d1Database, normalizedEmail),
    },
  });
}

async function promoteInvitedAllowlistOnSuccessfulAccess(
  d1Database: D1DatabaseLike,
  access: ClosedBetaAccessResult,
) {
  if (!access.allowed || access.status !== "invited") return;
  try {
    await markClosedBetaAllowlistAcceptedInD1(d1Database, access.normalizedEmail);
  } catch {
    // Access remains allowed even if status promotion fails; reconcile later.
  }
}

export async function assertClosedBetaEmailAllowedForAuth(
  d1Database: D1DatabaseLike,
  email: string | null | undefined,
): Promise<void> {
  const access = await resolveClosedBetaAccessForEmailAgainstD1(d1Database, email);
  if (!access.allowed) throwClosedBetaDenied();
  await promoteInvitedAllowlistOnSuccessfulAccess(d1Database, access);
}

export async function assertClosedBetaUserIdAllowedForAuth(
  d1Database: D1DatabaseLike,
  userId: string | null | undefined,
): Promise<void> {
  const id = typeof userId === "string" ? userId.trim() : "";
  if (!id) throwClosedBetaDenied();

  const row = await d1Database
    .prepare<BetterAuthUserEmailRow>(
      `
        SELECT email
        FROM "user"
        WHERE id = ?
        LIMIT 1
      `,
    )
    .bind(id)
    .first<BetterAuthUserEmailRow>();

  await assertClosedBetaEmailAllowedForAuth(d1Database, row?.email ?? null);
}

export function readClosedBetaEmailCandidate(value: unknown) {
  if (typeof value !== "string") return "";
  return normalizeClosedBetaEmail(value);
}

export { CLOSED_BETA_DENIED_CODE, CLOSED_BETA_DENIED_MESSAGE };
