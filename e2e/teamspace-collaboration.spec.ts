import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { createClient, type Session } from "@supabase/supabase-js";

import { getCollaborationColorForUser } from "@/lib/collaboration/colors";
import type { Database } from "@/lib/supabase/types";

const runCollaborationE2E = process.env.ARCHESTIMATOR_E2E_COLLABORATION === "1";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const projectId = "22222222-2222-4222-8222-222222222222";
const estimateId = "33333333-3333-4333-8333-333333333333";
const nodeId = "77777777-7777-4777-8777-777777777728";
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

test.skip(!runCollaborationE2E, "Set ARCHESTIMATOR_E2E_COLLABORATION=1 to run the live two-user collaboration smoke.");
test.skip(!supabaseUrl || !anonKey || !serviceRoleKey, "Supabase URL, anon key, and service-role key are required.");

function requireSupabaseEnv() {
  if (!supabaseUrl || !anonKey || !serviceRoleKey) throw new Error("Supabase environment is missing.");
  return { supabaseUrl, anonKey, serviceRoleKey };
}

function base64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function createAuthCookies(session: Session, baseURL: string) {
  const encoded = `base64-${base64Url(JSON.stringify(session))}`;
  const chunks = encoded.length <= cookieChunkSize
    ? [{ name: authCookieName, value: encoded }]
    : Array.from({ length: Math.ceil(encoded.length / cookieChunkSize) }, (_, index) => ({
        name: `${authCookieName}.${index}`,
        value: encoded.slice(index * cookieChunkSize, (index + 1) * cookieChunkSize),
      }));

  return chunks.map((cookie) => ({
    ...cookie,
    url: baseURL,
    httpOnly: false,
    sameSite: "Lax" as const,
    expires: Math.floor(Date.now() / 1000) + 60 * 60,
  }));
}

async function createE2EUser(label: "A" | "B") {
  const env = requireSupabaseEnv();
  const admin = createClient<Database>(env.supabaseUrl, env.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const anon = createClient<Database>(env.supabaseUrl, env.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `collab-${label.toLowerCase()}-${stamp}@archestimator.local`;
  const password = `Collaborate-${stamp}!`;
  const displayName = label === "A" ? "Collab Alice" : "Collab Bruno";

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
    default_workspace_id: workspaceId,
  });
  await admin.from("workspace_members").upsert({
    workspace_id: workspaceId,
    user_id: created.user.id,
    role: "viewer",
  });
  await admin.from("project_members").upsert(
    {
      project_id: projectId,
      workspace_id: workspaceId,
      user_id: created.user.id,
      role: label === "A" ? "owner" : "editor",
      added_by: created.user.id,
    },
    { onConflict: "project_id,user_id" },
  );

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

async function cleanupE2EUsers(users: E2EUser[]) {
  if (!users.length) return;
  const env = requireSupabaseEnv();
  const admin = createClient<Database>(env.supabaseUrl, env.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const userIds = users.map((user) => user.id);

  await admin.from("project_members").delete().eq("project_id", projectId).in("user_id", userIds);
  await admin.from("estimate_sheet_members").delete().eq("estimate_id", estimateId).in("user_id", userIds);
  await admin.from("workspace_members").delete().eq("workspace_id", workspaceId).in("user_id", userIds);
  await Promise.all(users.map((user) => admin.auth.admin.deleteUser(user.id)));
}

async function createAuthenticatedPage(context: BrowserContext, baseURL: string, session: Session) {
  await context.addCookies(createAuthCookies(session, baseURL));
  return context.newPage();
}

async function expectTeamspaceHeader(page: Page) {
  await expect(page.getByLabel("Project teamspaces")).toBeVisible();
  const headerBox = await page.locator('[data-workshop-layout="project-teamspace-header"]').boundingBox();
  expect(headerBox?.width ?? 0).toBeGreaterThan(24);
  expect(headerBox?.height ?? 0).toBeGreaterThan(24);
}

test.describe.serial("Teamspaces collaboration", () => {
  const users: E2EUser[] = [];

  test.afterAll(async () => {
    await cleanupE2EUsers(users);
  });

  test("shows two real authenticated users, remote cursors, and stable headers", async ({ browser, baseURL }, testInfo) => {
    test.setTimeout(90_000);
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    const [userA, userB] = await Promise.all([createE2EUser("A"), createE2EUser("B")]);
    users.push(userA, userB);

    const contextA = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const contextB = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageA = await createAuthenticatedPage(contextA, baseURL, userA.session);
    const pageB = await createAuthenticatedPage(contextB, baseURL, userB.session);

    await Promise.all([
      pageA.goto(`/workshop/projects/${projectId}`),
      pageB.goto(`/workshop/projects/${projectId}`),
    ]);

    await expectTeamspaceHeader(pageA);
    await expectTeamspaceHeader(pageB);
    await pageA.waitForTimeout(2_000);
    await pageB.waitForTimeout(2_000);
    await pageA.getByRole("button", { name: "Open teamspace settings" }).click();
    const teamspaceDialog = pageA.getByRole("dialog", { name: "Teamspace settings" });
    await expect(teamspaceDialog.getByText(userB.displayName).first()).toBeVisible();
    await expect(teamspaceDialog.getByRole("textbox", { name: "Project share link" })).toHaveValue(new RegExp(`/workshop/projects/${projectId}`));
    await expect(teamspaceDialog.getByText("2 active now")).toBeVisible({ timeout: 15_000 });
    await pageA.screenshot({
      fullPage: true,
      path: testInfo.outputPath("teamspace-settings-desktop.png"),
    });
    await pageA.keyboard.press("Escape");

    await Promise.all([
      pageA.goto(`/workshop/projects/${projectId}/estimates/${nodeId}`),
      pageB.goto(`/workshop/projects/${projectId}/estimates/${nodeId}`),
    ]);

    await expect(pageA.locator("[data-estimate-pointer-surface]")).toBeVisible();
    await expect(pageB.locator("[data-estimate-pointer-surface]")).toBeVisible();
    await expect(pageA.locator("[data-estimate-pointer-surface]")).toHaveAttribute("data-estimate-cursor-channel", "subscribed", {
      timeout: 15_000,
    });
    await expect(pageB.locator("[data-estimate-pointer-surface]")).toHaveAttribute("data-estimate-cursor-channel", "subscribed", {
      timeout: 15_000,
    });

    const pointerBox = await pageB.locator("[data-estimate-pointer-surface]").boundingBox();
    if (!pointerBox) throw new Error("Estimate pointer surface was not measurable.");

    await pageA.waitForTimeout(2_000);
    await pageB.waitForTimeout(2_000);
    for (let index = 0; index < 6; index += 1) {
      await pageB.mouse.move(pointerBox.x + 160 + index * 12, pointerBox.y + 96 + index * 6);
      await pageB.locator("[data-estimate-pointer-surface]").evaluate((element, point) => {
        element.dispatchEvent(
          new PointerEvent("pointermove", {
            clientX: point.x,
            clientY: point.y,
            pointerType: "mouse",
            bubbles: true,
          }),
        );
      }, { x: pointerBox.x + 160 + index * 12, y: pointerBox.y + 96 + index * 6 });
      await pageB.waitForTimeout(120);
    }
    await expect(pageB.locator("[data-estimate-pointer-surface]")).toHaveAttribute("data-estimate-cursor-send", "ok", {
      timeout: 5_000,
    });
    const remoteCursor = pageA.locator("[data-estimate-remote-cursor]").first();
    await expect(remoteCursor).toBeVisible({ timeout: 12_000 });
    await expect(remoteCursor).toHaveAttribute("data-estimate-remote-cursor-color", getCollaborationColorForUser(userB.id).name);
    await expect(remoteCursor).toContainText(userB.displayName);
    await pageA.screenshot({
      fullPage: true,
      path: testInfo.outputPath("teamspace-remote-cursor-desktop.png"),
    });
    await expect(remoteCursor).toBeHidden({ timeout: 7_500 });

    const visualRoutes = [
      { name: "project-dashboard", path: `/workshop/projects/${projectId}` },
      { name: "estimate-list", path: `/workshop/projects/${projectId}/estimates` },
      { name: "estimate-sheet", path: `/workshop/projects/${projectId}/estimates/${nodeId}` },
    ];
    const viewports = [
      { name: "desktop", width: 1440, height: 900 },
      { name: "mobile", width: 390, height: 844 },
    ];

    for (const viewport of viewports) {
      await pageA.setViewportSize({ width: viewport.width, height: viewport.height });
      for (const route of visualRoutes) {
        await pageA.goto(route.path);
        await expectTeamspaceHeader(pageA);
        await pageA.screenshot({
          fullPage: true,
          path: testInfo.outputPath(`teamspace-${route.name}-${viewport.name}.png`),
        });
      }
    }

    await contextA.close();
    await contextB.close();
  });
});
