import { randomUUID } from "node:crypto";

import { createClient, type Session } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/types";

const runRlsProof = process.env.ARCHESTIMATOR_NOTIFICATION_RLS_PROOF === "1";
const branchSafeTargetAllowed = process.env.ARCHESTIMATOR_NOTIFICATION_RLS_BRANCH_SAFE === "1";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

type RlsProofUser = {
  id: string;
  email: string;
  password: string;
  session: Session;
};

type RlsProofFixture = {
  userA: RlsProofUser;
  userB: RlsProofUser;
  definitionA: string;
  definitionB: string;
  deliveryA: string;
  deliveryB: string;
};

type RlsProofCleanupTarget = {
  userA?: Pick<RlsProofUser, "id">;
  userB?: Pick<RlsProofUser, "id">;
  definitionA: string;
  definitionB: string;
  deliveryA: string;
  deliveryB: string;
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

function rlsProofSkipReason() {
  if (!runRlsProof) return "Set ARCHESTIMATOR_NOTIFICATION_RLS_PROOF=1 to run the database-backed notification RLS proof.";
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return "Supabase URL, anon key, and service-role key are required.";
  if (!isLocalSupabaseUrl(supabaseUrl) && !branchSafeTargetAllowed) {
    return "Notification RLS proof only runs against local Supabase or an explicitly branch-safe target.";
  }
  return null;
}

function requireSupabaseEnv() {
  const skipReason = rlsProofSkipReason();
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

async function createAuthenticatedClient(session: Session) {
  const supabase = createAnonClient();
  const { error } = await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  if (error) throw error;
  return supabase;
}

async function createRlsProofUser(label: string, onCreated?: (user: Pick<RlsProofUser, "id">) => void): Promise<RlsProofUser> {
  const admin = createAdminClient();
  const anon = createAnonClient();
  const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `notification-rls-${label}-${stamp}@archestimator.local`.toLowerCase();
  const password = `Notification-${label}-${stamp}!`;

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError) throw createError;
  if (!created.user) throw new Error("Supabase did not return the RLS proof user.");
  onCreated?.({ id: created.user.id });

  const { data: signedIn, error: signInError } = await anon.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  if (!signedIn.session) throw new Error("Supabase did not return the RLS proof session.");

  return { id: created.user.id, email, password, session: signedIn.session };
}

async function createRlsProofFixture(): Promise<RlsProofFixture> {
  const admin = createAdminClient();
  const definitionA = randomUUID();
  const definitionB = randomUUID();
  const deliveryA = randomUUID();
  const deliveryB = randomUUID();
  const cleanupTarget: RlsProofCleanupTarget = { definitionA, definitionB, deliveryA, deliveryB };

  try {
    const userA = await createRlsProofUser("a", (user) => {
      cleanupTarget.userA = user;
    });
    cleanupTarget.userA = userA;
    const userB = await createRlsProofUser("b", (user) => {
      cleanupTarget.userB = user;
    });
    cleanupTarget.userB = userB;
    const startsAt = new Date(Date.now() - 60_000).toISOString();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const { error: definitionError } = await admin.from("notification_definitions").insert([
      {
        id: definitionA,
        kind: "release_announcement",
        title: "RLS proof A",
        body: "Only user A should read this notification.",
        severity: "info",
        surface: "modal",
        release_version: "0.1.0-rls-a",
        dedupe_key: `notification-rls-a-${definitionA}`,
        action_href: "/workshop",
        payload_json: { schemaVersion: 1, source: "notification-rls-proof" },
        starts_at: startsAt,
        expires_at: expiresAt,
      },
      {
        id: definitionB,
        kind: "system_notice",
        title: "RLS proof B",
        body: "Only user B should read this notification.",
        severity: "warning",
        surface: "center",
        dedupe_key: `notification-rls-b-${definitionB}`,
        action_href: "/workshop/projects",
        payload_json: { schemaVersion: 1, source: "notification-rls-proof" },
        starts_at: startsAt,
        expires_at: expiresAt,
      },
    ]);
    if (definitionError) throw definitionError;

    const { error: deliveryError } = await admin.from("notification_deliveries").insert([
      {
        id: deliveryA,
        notification_id: definitionA,
        user_id: userA.id,
        delivery_reason: "rls_proof_user_a",
        payload_json: { schemaVersion: 1, source: "notification-rls-proof" },
      },
      {
        id: deliveryB,
        notification_id: definitionB,
        user_id: userB.id,
        delivery_reason: "rls_proof_user_b",
        payload_json: { schemaVersion: 1, source: "notification-rls-proof" },
      },
    ]);
    if (deliveryError) throw deliveryError;

    return { userA, userB, definitionA, definitionB, deliveryA, deliveryB };
  } catch (error) {
    await cleanupRlsProofFixture(cleanupTarget);
    throw error;
  }
}

async function cleanupRlsProofFixture(fixture: RlsProofFixture | RlsProofCleanupTarget | null) {
  if (!fixture) return;
  const admin = createAdminClient();
  await admin.from("notification_deliveries").delete().in("id", [fixture.deliveryA, fixture.deliveryB]);
  await admin.from("notification_definitions").delete().in("id", [fixture.definitionA, fixture.definitionB]);
  if (fixture.userA) await admin.auth.admin.deleteUser(fixture.userA.id);
  if (fixture.userB) await admin.auth.admin.deleteUser(fixture.userB.id);
}

const describeRlsProof = rlsProofSkipReason() ? describe.skip : describe;

describeRlsProof("notification RLS proof", () => {
  it("proves same-user reads, cross-user denial, direct write denial, and anonymous denial", async () => {
    let fixture: RlsProofFixture | null = null;

    try {
      fixture = await createRlsProofFixture();
      const userAClient = await createAuthenticatedClient(fixture.userA.session);
      const userBClient = await createAuthenticatedClient(fixture.userB.session);
      const anonymousClient = createAnonClient();

      const userAOwnDelivery = await userAClient.from("notification_deliveries").select("id,user_id").eq("id", fixture.deliveryA).maybeSingle();
      expect(userAOwnDelivery.error).toBeNull();
      expect(userAOwnDelivery.data?.id).toBe(fixture.deliveryA);

      const userAOwnDefinition = await userAClient.from("notification_definitions").select("id,title").eq("id", fixture.definitionA).maybeSingle();
      expect(userAOwnDefinition.error).toBeNull();
      expect(userAOwnDefinition.data?.id).toBe(fixture.definitionA);

      const crossUserDelivery = await userAClient.from("notification_deliveries").select("id").eq("id", fixture.deliveryB);
      expect(crossUserDelivery.error).toBeNull();
      expect(crossUserDelivery.data).toEqual([]);

      const crossUserDefinition = await userAClient.from("notification_definitions").select("id").eq("id", fixture.definitionB);
      expect(crossUserDefinition.error).toBeNull();
      expect(crossUserDefinition.data).toEqual([]);

      const userBUpdate = await userBClient
        .from("notification_deliveries")
        .update({ read_at: new Date().toISOString() })
        .eq("id", fixture.deliveryB);
      expect(userBUpdate.error).not.toBeNull();

      const authInsert = await userAClient.from("notification_definitions").insert({
        kind: "system_notice",
        title: "Browser insert should fail",
        body: "Authenticated browser clients must not create notification definitions.",
        severity: "info",
        surface: "center",
      });
      expect(authInsert.error).not.toBeNull();

      const anonymousRead = await anonymousClient.from("notification_deliveries").select("id").eq("id", fixture.deliveryA);
      expect(anonymousRead.error).not.toBeNull();
    } finally {
      await cleanupRlsProofFixture(fixture);
    }
  });
});
