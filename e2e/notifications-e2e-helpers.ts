import { randomUUID } from "node:crypto";

import type { Page } from "@playwright/test";
import { createClient, type Session } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

const cookieChunkSize = 3180;
const runNotificationE2E = process.env.ARCHESTIMATOR_E2E_NOTIFICATIONS === "1";
const branchSafeTargetAllowed = process.env.ARCHESTIMATOR_E2E_NOTIFICATIONS_BRANCH_SAFE === "1";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export type NotificationE2EFixture = {
  userId: string;
  email: string;
  password: string;
  session: Session;
  releaseDefinitionId: string;
  releaseDeliveryId: string;
  centerDefinitionId: string;
  centerDeliveryId: string;
};

function isLocalSupabaseUrl(value: string | undefined) {
  if (!value) return false;
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname.endsWith(".localhost");
  } catch {
    return false;
  }
}

export function notificationE2ESkipReason() {
  if (!runNotificationE2E) return "Set ARCHESTIMATOR_E2E_NOTIFICATIONS=1 to run notification E2E specs.";
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return "Supabase URL, anon key, and service-role key are required.";
  if (!isLocalSupabaseUrl(supabaseUrl) && !branchSafeTargetAllowed) {
    return "Notification E2E only runs against local Supabase or an explicitly branch-safe target.";
  }
  return null;
}

function requireSupabaseEnv() {
  const skipReason = notificationE2ESkipReason();
  if (skipReason) throw new Error(skipReason);
  return {
    supabaseUrl: supabaseUrl as string,
    anonKey: anonKey as string,
    serviceRoleKey: serviceRoleKey as string,
  };
}

function createAdminClient() {
  const env = requireSupabaseEnv();
  return createClient<Database>(env.supabaseUrl, env.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function createAnonClient() {
  const env = requireSupabaseEnv();
  return createClient<Database>(env.supabaseUrl, env.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function readAuthCookieName() {
  const env = requireSupabaseEnv();
  const host = new URL(env.supabaseUrl).hostname;
  const projectRef = host.split(".")[0];
  if (!projectRef) throw new Error("Could not derive Supabase project ref for auth cookies.");
  return `sb-${projectRef}-auth-token`;
}

function base64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function getCookieUrls(baseURL: string) {
  const urls = [baseURL];
  const parsed = new URL(baseURL);
  if (parsed.hostname === "127.0.0.1") {
    urls.push(`${parsed.protocol}//localhost${parsed.port ? `:${parsed.port}` : ""}`);
  }
  if (parsed.hostname === "localhost") {
    urls.push(`${parsed.protocol}//127.0.0.1${parsed.port ? `:${parsed.port}` : ""}`);
  }
  return Array.from(new Set(urls));
}

function createAuthCookies(session: Session, baseURL: string) {
  const encoded = `base64-${base64Url(JSON.stringify(session))}`;
  const cookieName = readAuthCookieName();
  const chunks = encoded.length <= cookieChunkSize
    ? [{ name: cookieName, value: encoded }]
    : Array.from({ length: Math.ceil(encoded.length / cookieChunkSize) }, (_, index) => ({
        name: `${cookieName}.${index}`,
        value: encoded.slice(index * cookieChunkSize, (index + 1) * cookieChunkSize),
      }));

  return getCookieUrls(baseURL).flatMap((url) =>
    chunks.map((cookie) => ({
      ...cookie,
      url,
      httpOnly: false,
      sameSite: "Lax" as const,
      expires: Math.floor(Date.now() / 1000) + 60 * 60,
    })),
  );
}

export async function authenticateNotificationE2EPage(page: Page, baseURL: string, session: Session) {
  await page.context().addCookies(createAuthCookies(session, baseURL));
}

export async function createNotificationE2EFixture(): Promise<NotificationE2EFixture> {
  const admin = createAdminClient();
  const anon = createAnonClient();
  const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `notification-e2e-${stamp}@archestimator.local`.toLowerCase();
  const password = `Notification-${stamp}!`;
  const releaseDefinitionId = randomUUID();
  const centerDefinitionId = randomUUID();
  const releaseDeliveryId = randomUUID();
  const centerDeliveryId = randomUUID();

  const { data: createdUser, error: createUserError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: "Notification E2E" },
  });
  if (createUserError) throw createUserError;
  if (!createdUser.user) throw new Error("Supabase did not return the notification E2E user.");

  const userId = createdUser.user.id;
  const now = new Date();
  const startsAt = new Date(now.getTime() - 60_000).toISOString();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const { error: profileError } = await admin.from("profiles").upsert({
    id: userId,
    email,
    display_name: "Notification E2E",
    avatar_url: null,
    role: "member",
    default_workspace_id: null,
  });
  if (profileError) throw profileError;

  const { error: allowlistError } = await admin.from("closed_beta_allowed_emails").upsert(
    {
      normalized_email: email,
      status: "active",
      metadata: { e2e: true, source: "notifications-e2e" },
      notes: "Notification E2E deterministic fixture",
    },
    { onConflict: "normalized_email" },
  );
  if (allowlistError) throw allowlistError;

  const { error: definitionsError } = await admin.from("notification_definitions").insert([
    {
      id: releaseDefinitionId,
      kind: "release_announcement",
      title: "New release",
      body: "Archestimator has a new in-app notification proof build.",
      severity: "info",
      surface: "modal",
      release_version: "0.1.0-notification-e2e",
      priority: 10,
      dedupe_key: `notification-e2e-release-${stamp}`,
      action_label: "View workshop",
      action_href: "/workshop",
      payload_json: { schemaVersion: 1, releaseVersion: "0.1.0-notification-e2e" },
      starts_at: startsAt,
      expires_at: expiresAt,
    },
    {
      id: centerDefinitionId,
      kind: "system_notice",
      title: "Review notification center",
      body: "This unread E2E notification should be readable and dismissible.",
      severity: "success",
      surface: "center",
      priority: 1,
      dedupe_key: `notification-e2e-center-${stamp}`,
      action_label: "Open projects",
      action_href: "/workshop/projects",
      payload_json: { schemaVersion: 1, source: "notifications-e2e" },
      starts_at: startsAt,
      expires_at: expiresAt,
    },
  ]);
  if (definitionsError) throw definitionsError;

  const { error: deliveriesError } = await admin.from("notification_deliveries").insert([
    {
      id: releaseDeliveryId,
      notification_id: releaseDefinitionId,
      user_id: userId,
      delivery_reason: "e2e_release_modal",
      payload_json: { schemaVersion: 1, source: "notifications-e2e" },
    },
    {
      id: centerDeliveryId,
      notification_id: centerDefinitionId,
      user_id: userId,
      delivery_reason: "e2e_center",
      payload_json: { schemaVersion: 1, source: "notifications-e2e" },
    },
  ]);
  if (deliveriesError) throw deliveriesError;

  const { data: signIn, error: signInError } = await anon.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  if (!signIn.session) throw new Error("Supabase did not return a notification E2E session.");

  return {
    userId,
    email,
    password,
    session: signIn.session,
    releaseDefinitionId,
    releaseDeliveryId,
    centerDefinitionId,
    centerDeliveryId,
  };
}

export async function cleanupNotificationE2EFixture(fixture: NotificationE2EFixture | null) {
  if (!fixture) return;
  const admin = createAdminClient();

  await admin.from("notification_deliveries").delete().in("id", [fixture.releaseDeliveryId, fixture.centerDeliveryId]);
  await admin.from("notification_definitions").delete().in("id", [fixture.releaseDefinitionId, fixture.centerDefinitionId]);
  await admin.from("closed_beta_allowed_emails").delete().eq("normalized_email", fixture.email);
  await admin.from("profiles").delete().eq("id", fixture.userId);
  await admin.auth.admin.deleteUser(fixture.userId);
}
