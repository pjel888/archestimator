import "server-only";

import { APIError } from "better-auth";

import {
  getClosedBetaAccessForEmail,
  normalizeClosedBetaEmail,
  type ClosedBetaAccessResult,
} from "@/lib/auth/closed-beta-access";
import { getClosedBetaAccessFromD1 } from "@/lib/auth/closed-beta-d1-store";
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
  return getClosedBetaAccessForEmail({
    email,
    store: {
      checkAccess: (normalizedEmail) => getClosedBetaAccessFromD1(d1Database, normalizedEmail),
    },
  });
}

export async function assertClosedBetaEmailAllowedForAuth(
  d1Database: D1DatabaseLike,
  email: string | null | undefined,
): Promise<void> {
  const access = await resolveClosedBetaAccessForEmailAgainstD1(d1Database, email);
  if (!access.allowed) throwClosedBetaDenied();
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
