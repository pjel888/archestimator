import type { D1DatabaseLike } from "@/lib/cloudflare/d1";
import {
  deliverPendingClosedBetaInviteEmailsFromD1,
  reconcileClosedBetaAllowlistAcceptedFromUsersInD1,
} from "@/lib/auth/closed-beta-d1-store";
import type { CloudflareEmailClientOptions } from "@/lib/email/cloudflare-email-client";

export type ClosedBetaAllowlistMaintenanceEnv = {
  ARCH_DB?: D1DatabaseLike;
  EMAIL?: CloudflareEmailClientOptions["binding"];
  ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED?: string;
  ARCHESTIMATOR_EMAIL_PROVIDER?: string;
  CLOUDFLARE_EMAIL_FROM?: string;
  CLOUDFLARE_EMAIL_REPLY_TO?: string;
  NEXT_PUBLIC_APP_URL?: string;
  NEXT_PUBLIC_SITE_URL?: string;
  BETTER_AUTH_URL?: string;
  ARCHESTIMATOR_ALLOWED_APP_ORIGINS?: string;
};

export async function runClosedBetaAllowlistMaintenance(env: ClosedBetaAllowlistMaintenanceEnv) {
  const db = env.ARCH_DB;
  if (!db) {
    return {
      promoted: 0,
      inviteDelivery: { attempted: 0, sent: 0, failed: 0 },
    };
  }

  const reconciled = await reconcileClosedBetaAllowlistAcceptedFromUsersInD1(db);
  const inviteDelivery = await deliverPendingClosedBetaInviteEmailsFromD1({
    db,
    cloudflareOptions: {
      binding: env.EMAIL,
      // Worker env is a broader binding bag than the email client's typed context.
      context: { env: env as never },
      env: env as Record<string, string | undefined>,
    },
  });

  return {
    promoted: reconciled.promoted,
    inviteDelivery,
  };
}
