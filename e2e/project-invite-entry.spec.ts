import { createHash, randomBytes } from "node:crypto";
import { expect, test, type BrowserContext } from "@playwright/test";
import { createClient, type Session } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

const runInviteEntryE2E = process.env.ARCHESTIMATOR_E2E_INVITE_ENTRY === "1";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const invitePepper = process.env.ARCHESTIMATOR_INVITE_TOKEN_PEPPER;
const inviteEntryEnabled = process.env.PROJECT_INVITE_ENTRY_ENABLED === "true";

const projectId = "22222222-2222-4222-8222-222222222222";
const workspaceId = "0c0919ba-1770-459a-a2a8-63fa3ddadbe5";
const authCookieName = "sb-ebxxqidacheyapmmzavr-auth-token";
const cookieChunkSize = 3180;

type E2EUser = {
  id: string;
  email: string;
  password: string;
  displayName: string;
  session: Session;
};

type E2EInvite = {
  invitationId: string;
  rawToken: string;
  email: string;
};

test.skip(!runInviteEntryE2E, "Set ARCHESTIMATOR_E2E_INVITE_ENTRY=1 to run the live invite-entry smoke.");
test.skip(!inviteEntryEnabled || !invitePepper, "PROJECT_INVITE_ENTRY_ENABLED=true and ARCHESTIMATOR_INVITE_TOKEN_PEPPER are required.");
test.skip(!supabaseUrl || !anonKey || !serviceRoleKey, "Supabase URL, anon key, and service-role key are required.");

function requireSupabaseEnv() {
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !invitePepper) throw new Error("Invite E2E environment is missing.");
  return { supabaseUrl, anonKey, serviceRoleKey, invitePepper };
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
  const chunks = encoded.length <= cookieChunkSize
    ? [{ name: authCookieName, value: encoded }]
    : Array.from({ length: Math.ceil(encoded.length / cookieChunkSize) }, (_, index) => ({
        name: `${authCookieName}.${index}`,
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

function hashInviteToken(rawToken: string) {
  const { invitePepper: pepper } = requireSupabaseEnv();
  const digest = createHash("sha256")
    .update(`v1:${pepper.trim()}:${rawToken.trim()}`)
    .digest("hex");
  return `v1:${digest}`;
}

async function resolveInviteState(rawToken: string) {
  const anon = createAnonClient();
  const { data, error } = await anon.rpc("resolve_collaboration_invitation", {
    invitation_token_hash: hashInviteToken(rawToken),
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : null;
  return row && typeof row === "object" && "state" in row ? row.state : null;
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

async function createE2EUser(label: string, projectRole?: "owner" | "admin" | "editor" | "viewer") {
  const admin = createAdminClient();
  const anon = createAnonClient();
  const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `invite-${label.toLowerCase()}-${stamp}@archestimator.local`;
  const password = `Invite-${stamp}!`;
  const displayName = `Invite ${label}`;

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      display_name: displayName,
    },
  });
  if (createError) throw createError;
  if (!created.user) throw new Error("Supabase did not return the created user.");

  await admin.from("profiles").upsert({
    id: created.user.id,
    email,
    display_name: displayName,
    avatar_url: null,
    role: "member",
    default_workspace_id: null,
  });

  if (projectRole) {
    await admin.from("project_members").upsert(
      {
        project_id: projectId,
        workspace_id: workspaceId,
        user_id: created.user.id,
        role: projectRole,
        added_by: created.user.id,
      },
      { onConflict: "project_id,user_id" },
    );
  }

  const { data: signIn, error: signInError } = await anon.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  if (!signIn.session) throw new Error("Supabase did not return a session.");

  return {
    id: created.user.id,
    email,
    password,
    displayName,
    session: signIn.session,
  };
}

async function createProjectInvite({
  inviter,
  email,
  state = "active",
}: {
  inviter: E2EUser;
  email: string;
  state?: "active" | "expired" | "revoked" | "used";
}): Promise<E2EInvite> {
  const admin = createAdminClient();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + (state === "expired" ? -60_000 : 24 * 60 * 60 * 1000)).toISOString();
  const rawToken = randomBytes(32).toString("base64url");

  const { data: invitation, error: invitationError } = await admin
    .from("collaboration_invitations")
    .insert({
      workspace_id: workspaceId,
      project_id: projectId,
      estimate_id: null,
      scope: "project",
      email: email.toLowerCase(),
      role: "viewer",
      invited_by: inviter.id,
      expires_at: expiresAt,
      lifecycle_state: "pending",
    })
    .select("id")
    .single();
  if (invitationError) throw invitationError;

  const { error: tokenError } = await admin
    .from("collaboration_invitation_tokens")
    .insert({
      invitation_id: invitation.id,
      token_hash: hashInviteToken(rawToken),
      token_hint: rawToken.slice(-6),
      delivery_method: "copy_url",
      created_by: inviter.id,
      expires_at: expiresAt,
      used_at: state === "used" ? now.toISOString() : null,
      revoked_at: state === "revoked" ? now.toISOString() : null,
      revoked_by: state === "revoked" ? inviter.id : null,
    });
  if (tokenError) throw tokenError;

  return { invitationId: invitation.id, rawToken, email };
}

async function createAuthenticatedContext(browserContext: BrowserContext, baseURL: string, session: Session) {
  await browserContext.addCookies(createAuthCookies(session, baseURL));
}

async function cleanupE2EData(users: E2EUser[], invites: E2EInvite[]) {
  if (!users.length && !invites.length) return;
  const admin = createAdminClient();
  const userIds = users.map((user) => user.id);
  const invitationIds = invites.map((invite) => invite.invitationId);

  if (invitationIds.length) {
    await admin.from("collaboration_audit_events").delete().in("invitation_id", invitationIds);
    await admin.from("collaboration_invitation_tokens").delete().in("invitation_id", invitationIds);
    await admin.from("collaboration_invitations").delete().in("id", invitationIds);
  }
  if (userIds.length) {
    await admin.from("project_members").delete().eq("project_id", projectId).in("user_id", userIds);
    await admin.from("estimate_sheet_members").delete().eq("project_id", projectId).in("user_id", userIds);
    await admin.from("workspace_members").delete().in("user_id", userIds);
    await admin.from("workspaces").delete().in("created_by", userIds);
    await Promise.all(users.map((user) => admin.auth.admin.deleteUser(user.id)));
  }
}

test.describe.serial("Project invite entry", () => {
  const users: E2EUser[] = [];
  const invites: E2EInvite[] = [];

  test.afterAll(async () => {
    await cleanupE2EData(users, invites);
  });

  test("accepts signed-out invitees through workshop and labels shared project access", async ({ browser, baseURL }, testInfo) => {
    test.setTimeout(90_000);
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    const inviter = await createE2EUser("Manager", "owner");
    const recipient = await createE2EUser("Recipient");
    users.push(inviter, recipient);

    const invite = await createProjectInvite({ inviter, email: recipient.email });
    invites.push(invite);

    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    await page.goto(`/invite/${invite.rawToken}`);
    await expect(page.locator("[data-invite-state]")).toHaveAttribute("data-invite-state", "signed-out-preview");
    await expect(page.getByText("Project invite")).toBeVisible();
    await expect(page.getByRole("link", { name: "Continue to Archestimator" })).toBeVisible();
    await page.screenshot({ fullPage: true, path: testInfo.outputPath("signed-out-preview-desktop.png") });

    await page.getByRole("link", { name: "Continue to Archestimator" }).click();
    await expect(page).toHaveURL(/\/login\?next=%2Fworkshop/);
    await createAuthenticatedContext(context, baseURL, recipient.session);
    await page.goto("/workshop");
    const projectAddedBanner = page.getByRole("region", { name: "Project added" });
    await expect(projectAddedBanner).toBeVisible({ timeout: 20_000 });
    await expect(projectAddedBanner.getByRole("link", { name: "Open project" })).toBeVisible();
    await page.screenshot({ fullPage: true, path: testInfo.outputPath("workshop-project-added-desktop.png") });

    await page.goto("/workshop/projects");
    await expect(page.locator('[data-project-access-kind="project-member"]').first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Shared project").first()).toBeVisible();

    const admin = createAdminClient();
    const { data: membership, error: membershipError } = await admin
      .from("project_members")
      .select("role")
      .eq("project_id", projectId)
      .eq("user_id", recipient.id)
      .maybeSingle();
    if (membershipError) throw membershipError;
    expect(membership?.role).toBe("viewer");

    await context.close();
  });

  test("renders matching-account, wrong-account, and terminal invite states", async ({ browser, baseURL }, testInfo) => {
    test.setTimeout(90_000);
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    const inviter = await createE2EUser("Reviewer", "owner");
    const matchingUser = await createE2EUser("Matching");
    const intendedWrongAccountUser = await createE2EUser("Intended");
    const wrongUser = await createE2EUser("Wrong");
    users.push(inviter, matchingUser, intendedWrongAccountUser, wrongUser);

    const matchingInvite = await createProjectInvite({ inviter, email: matchingUser.email });
    const wrongAccountInvite = await createProjectInvite({ inviter, email: intendedWrongAccountUser.email });
    const expiredInvite = await createProjectInvite({ inviter, email: `expired-${Date.now()}@archestimator.local`, state: "expired" });
    const revokedInvite = await createProjectInvite({ inviter, email: `revoked-${Date.now()}@archestimator.local`, state: "revoked" });
    const usedInvite = await createProjectInvite({ inviter, email: `used-${Date.now()}@archestimator.local`, state: "used" });
    invites.push(matchingInvite, wrongAccountInvite, expiredInvite, revokedInvite, usedInvite);

    await expect(resolveInviteState(expiredInvite.rawToken)).resolves.toBe("expired");
    await expect(resolveInviteState(revokedInvite.rawToken)).resolves.toBe("revoked");
    await expect(resolveInviteState(usedInvite.rawToken)).resolves.toBe("already_used");

    const matchingContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await createAuthenticatedContext(matchingContext, baseURL, matchingUser.session);
    const matchingPage = await matchingContext.newPage();
    await matchingPage.goto(`/invite/${matchingInvite.rawToken}`);
    await expect(matchingPage.locator("[data-invite-state]")).toHaveAttribute("data-invite-state", "signed-in-preview");
    await expect(matchingPage.getByRole("link", { name: "Accept invite" })).toBeVisible();
    await matchingPage.screenshot({ fullPage: true, path: testInfo.outputPath("signed-in-preview-mobile.png") });
    await matchingPage.getByRole("link", { name: "Accept invite" }).click();
    await expect(matchingPage).toHaveURL(new RegExp(`/workshop/projects/${projectId}`));
    await matchingContext.close();

    const wrongContext = await browser.newContext({ viewport: { width: 900, height: 900 } });
    await createAuthenticatedContext(wrongContext, baseURL, wrongUser.session);
    const wrongPage = await wrongContext.newPage();
    await wrongPage.goto(`/invite/${wrongAccountInvite.rawToken}`);
    await expect(wrongPage.locator("[data-invite-state]")).toHaveAttribute("data-invite-state", "wrong-account");
    await expect(wrongPage.getByText(intendedWrongAccountUser.email)).toBeVisible();
    await expect(wrongPage.getByRole("link", { name: "Sign out and continue" })).toBeVisible();
    await wrongPage.screenshot({ fullPage: true, path: testInfo.outputPath("wrong-account-tablet.png") });
    await wrongContext.close();

    const terminalContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const terminalPage = await terminalContext.newPage();
    await terminalPage.goto(`/invite/${expiredInvite.rawToken}`);
    await expect(terminalPage.locator("[data-invite-state]")).toHaveAttribute("data-invite-state", "expired");
    await terminalPage.goto(`/invite/${revokedInvite.rawToken}`);
    await expect(terminalPage.locator("[data-invite-state]")).toHaveAttribute("data-invite-state", "revoked");
    await terminalPage.goto(`/invite/${usedInvite.rawToken}`);
    await expect(terminalPage.locator("[data-invite-state]")).toHaveAttribute("data-invite-state", "already-used");
    await terminalPage.goto("/invite/not-a-token");
    await expect(terminalPage.locator("[data-invite-state]")).toHaveAttribute("data-invite-state", "invalid");
    await terminalContext.close();
  });
});
