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
  invitePath: string;
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

function getLocalhostBaseURL(baseURL: string) {
  const parsed = new URL(baseURL);
  if (parsed.hostname === "127.0.0.1") parsed.hostname = "localhost";
  return parsed.origin;
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

async function createAuthenticatedSupabaseClient(session: Session) {
  const supabase = createAnonClient();
  const { error } = await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  if (error) throw error;
  return supabase;
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
  const activeExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const terminalExpiresAt = new Date(now.getTime() - 60_000).toISOString();
  const expiresAt = state === "expired" ? terminalExpiresAt : activeExpiresAt;
  const rawToken = randomBytes(32).toString("base64url");
  const invitePath = `/invite/${encodeURIComponent(rawToken)}`;

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
      expires_at: activeExpiresAt,
      lifecycle_state: "pending",
    })
    .select("id")
    .single();
  if (invitationError) throw invitationError;

  const inviterClient = await createAuthenticatedSupabaseClient(inviter.session);
  const { data: tokenId, error: tokenError } = await inviterClient
    .rpc("issue_collaboration_invitation_token", {
      invitation_id: invitation.id,
      invitation_token_hash: hashInviteToken(rawToken),
      token_hint: rawToken.slice(-6),
      delivery_method: "copy_url",
      token_expires_at: activeExpiresAt,
      revoke_existing: true,
    });
  if (tokenError) throw tokenError;
  if (!tokenId) throw new Error("Supabase did not return an invitation token id.");

  if (state === "expired") {
    const { error: expireInvitationError } = await admin
      .from("collaboration_invitations")
      .update({ expires_at: expiresAt, lifecycle_state: "expired" })
      .eq("id", invitation.id);
    if (expireInvitationError) throw expireInvitationError;
    const { error: expireTokenError } = await admin
      .from("collaboration_invitation_tokens")
      .update({ expires_at: expiresAt })
      .eq("id", tokenId);
    if (expireTokenError) throw expireTokenError;
  } else if (state === "revoked") {
    const { error: revokeTokenError } = await admin
      .from("collaboration_invitation_tokens")
      .update({ revoked_at: now.toISOString(), revoked_by: inviter.id })
      .eq("id", tokenId);
    if (revokeTokenError) throw revokeTokenError;
  } else if (state === "used") {
    const { error: useTokenError } = await admin
      .from("collaboration_invitation_tokens")
      .update({ used_at: now.toISOString() })
      .eq("id", tokenId);
    if (useTokenError) throw useTokenError;
  }

  return { invitationId: invitation.id, invitePath, rawToken, email };
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

    expect(invite.invitePath).toMatch(/^\/invite\/[A-Za-z0-9_-]{43}$/);
    await page.goto(invite.invitePath);
    await expect(page.locator("[data-invite-state]")).toHaveAttribute("data-invite-state", "signed-out-preview");
    await expect(page.getByText("Project invite")).toBeVisible();
    await expect(page.getByRole("link", { name: "Continue to Archestimator" })).toBeVisible();
    await page.screenshot({ fullPage: true, path: testInfo.outputPath("signed-out-preview-desktop.png") });

    await page.getByRole("link", { name: "Continue to Archestimator" }).click();
    await expect(page).toHaveURL(/\/login\?next=%2Fworkshop%2Fpending-invite/);
    await createAuthenticatedContext(context, baseURL, recipient.session);
    const pendingInviteResponse = await page.goto("/workshop/pending-invite");
    expect(pendingInviteResponse?.headers()["cache-control"]).toContain("no-store");
    await page.waitForURL(/\/workshop\?invite=accepted/, { timeout: 20_000 });
    expect(page.url()).not.toContain(invite.rawToken);
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
    const localhostBaseURL = getLocalhostBaseURL(baseURL);
    expect(matchingInvite.invitePath).toMatch(/^\/invite\/[A-Za-z0-9_-]{43}$/);
    await matchingPage.goto(`${localhostBaseURL}${matchingInvite.invitePath}`);
    await expect(matchingPage.locator("[data-invite-state]")).toHaveAttribute("data-invite-state", "signed-in-preview");
    const confirmAcceptanceButton = matchingPage.getByRole("button", { name: "Confirm acceptance" });
    await expect(confirmAcceptanceButton).toBeVisible();
    await matchingPage.screenshot({ fullPage: true, path: testInfo.outputPath("signed-in-preview-mobile.png") });
    await confirmAcceptanceButton.click();
    await matchingPage.waitForURL(/\/workshop\?invite=accepted/, { timeout: 20_000 });
    expect(matchingPage.url()).not.toContain(matchingInvite.rawToken);
    const matchingProjectAddedBanner = matchingPage.getByRole("region", { name: "Project added" });
    await expect(matchingProjectAddedBanner).toBeVisible({ timeout: 20_000 });
    await matchingProjectAddedBanner.getByRole("link", { name: "Open project" }).click();
    await expect(matchingPage).toHaveURL(new RegExp(`/workshop/projects/${projectId}`));
    await matchingContext.close();

    const wrongContext = await browser.newContext({ viewport: { width: 900, height: 900 } });
    await createAuthenticatedContext(wrongContext, baseURL, wrongUser.session);
    const wrongPage = await wrongContext.newPage();
    await wrongPage.goto(`${localhostBaseURL}${wrongAccountInvite.invitePath}`);
    await expect(wrongPage.locator("[data-invite-state]")).toHaveAttribute("data-invite-state", "wrong-account");
    await expect(wrongPage.getByText(intendedWrongAccountUser.email, { exact: true })).toBeVisible();
    await expect(wrongPage.getByRole("link", { name: "Sign out and continue" })).toBeVisible();
    await wrongPage.screenshot({ fullPage: true, path: testInfo.outputPath("wrong-account-tablet.png") });
    await wrongContext.close();

    const terminalContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const terminalPage = await terminalContext.newPage();
    await terminalPage.goto(expiredInvite.invitePath);
    await expect(terminalPage.locator("[data-invite-state]")).toHaveAttribute("data-invite-state", "expired");
    await terminalPage.goto(revokedInvite.invitePath);
    await expect(terminalPage.locator("[data-invite-state]")).toHaveAttribute("data-invite-state", "revoked");
    await terminalPage.goto(usedInvite.invitePath);
    await expect(terminalPage.locator("[data-invite-state]")).toHaveAttribute("data-invite-state", "already-used");
    await terminalPage.goto("/invite/not-a-token");
    await expect(terminalPage.locator("[data-invite-state]")).toHaveAttribute("data-invite-state", "invalid");
    await terminalContext.close();
  });
});
