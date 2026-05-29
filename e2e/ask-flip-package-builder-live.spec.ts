import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page, type Response } from "@playwright/test";
import { createClient, type Session } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

const runLivePackageBuilderE2E = process.env.ARCHESTIMATOR_E2E_AI_PACKAGE_BUILDER === "1";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const allowProvider = process.env.ARCHESTIMATOR_E2E_AI_PACKAGE_BUILDER_ALLOW_PROVIDER === "1";
const cookieChunkSize = 3180;
const exactPrompt = "Make a project for me with an estimate sheet which is for a 3 bedroom condo unit.";
const currentEstimatePrompt = "Fill this estimate with beds and water closets for a 3 bedroom condo unit.";
const libraryComponentName = "Ask Flip Smoke Bed Frame";
const libraryComponentSupplier = "Ask Flip Smoke Supplier";
const libraryComponentCost = 18123;
const libraryComponentPrompt = `Add a component to my library called ${libraryComponentName}, category Furniture, unit set, cost ${libraryComponentCost} pesos from ${libraryComponentSupplier}.`;

test.skip(
  !runLivePackageBuilderE2E,
  "Set ARCHESTIMATOR_E2E_AI_PACKAGE_BUILDER=1 to run the live Ask Flip package-builder smoke.",
);
test.skip(!supabaseUrl || !anonKey || !serviceRoleKey, "Supabase URL, anon key, and service-role key are required.");
test.skip(
  Boolean(process.env.DEEPSEEK_API_KEY) && !allowProvider,
  "Run with DEEPSEEK_API_KEY= for deterministic fallback, or set ARCHESTIMATOR_E2E_AI_PACKAGE_BUILDER_ALLOW_PROVIDER=1 to allow a live provider call.",
);

type E2EPackageFixture = {
  userId: string;
  email: string;
  password: string;
  session: Session;
  workspaceId: string;
  bedComponentId: string;
  waterClosetComponentId: string;
  priorProjectId: string;
  priorEstimateId: string;
};

type E2EPackageCleanupTarget = Pick<E2EPackageFixture, "userId" | "workspaceId">;

type E2ECurrentEstimateShell = {
  projectId: string;
  estimateId: string;
  rootNodeId: string;
};

function requireSupabaseEnv() {
  if (!supabaseUrl || !anonKey || !serviceRoleKey) throw new Error("Supabase E2E environment is missing.");
  return { supabaseUrl, anonKey, serviceRoleKey };
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

async function createAuthenticatedContext(browserContext: BrowserContext, baseURL: string, session: Session) {
  await browserContext.addCookies(createAuthCookies(session, baseURL));
}

async function createComponent({
  workspaceId,
  userId,
  name,
  description,
  category,
  unit,
  unitCost,
}: {
  workspaceId: string;
  userId: string;
  name: string;
  description: string;
  category: string;
  unit: string;
  unitCost: number;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("create_cost_library_component", {
    target_workspace_id: workspaceId,
    component: {
      name,
      description,
      category,
      supplier: "Ask Flip E2E Supplier",
      unit,
      lifecycleState: "available",
      createdBy: userId,
      metadata: { e2e: true, source: "ask-flip-package-builder-live" },
    },
    price_options: [
      {
        label: "Standard",
        unit,
        unitCost,
        miscCost: 0,
        currency: "PHP",
        pricingSource: "Ask Flip E2E fixture",
        confidence: "verified-e2e",
        isDefault: true,
        isActive: true,
        createdBy: userId,
      },
    ],
  });
  if (error) throw error;
  const result = data && typeof data === "object" && !Array.isArray(data) ? data as Record<string, unknown> : {};
  const itemId = typeof result.itemId === "string" ? result.itemId : null;
  if (!itemId) throw new Error(`Component RPC did not return an item id for ${name}.`);
  return itemId;
}

async function seedComparableEstimate({
  workspaceId,
  userId,
  stamp,
}: {
  workspaceId: string;
  userId: string;
  stamp: string;
}) {
  const admin = createAdminClient();
  const priorProjectId = randomUUID();
  const priorEstimateId = randomUUID();
  const houseNodeId = randomUUID();
  const powderRoomNodeId = randomUUID();

  const { error: projectError } = await admin.from("projects").insert({
    id: priorProjectId,
    workspace_id: workspaceId,
    name: `E2E Comparable 3 Bedroom Condo ${stamp}`,
    client_name: "Ask Flip E2E",
    project_code: `E2E-CMP-${stamp.slice(-6)}`,
    location: "E2E Fixture",
    currency_code: "PHP",
    metadata: { e2e: true, source: "ask-flip-package-builder-live" },
    created_by: userId,
  });
  if (projectError) throw projectError;

  const { error: estimateError } = await admin.from("estimates").insert({
    id: priorEstimateId,
    project_id: priorProjectId,
    name: "Comparable Condo Estimate",
    sheet_code: `CMP-${stamp.slice(-6)}`,
    currency_code: "PHP",
    metadata: { e2e: true, source: "ask-flip-package-builder-live" },
    created_by: userId,
  });
  if (estimateError) throw estimateError;

  const { error: nodeError } = await admin.from("estimate_nodes").insert([
    {
      id: houseNodeId,
      estimate_id: priorEstimateId,
      parent_id: null,
      kind: "group",
      name: "Comparable Condo",
      sort_order: 0,
      metadata: { e2e: true },
    },
    {
      id: powderRoomNodeId,
      estimate_id: priorEstimateId,
      parent_id: houseNodeId,
      kind: "area",
      name: "Powder Room",
      sort_order: 10,
      metadata: { e2e: true },
    },
  ]);
  if (nodeError) throw nodeError;

  const { error: rowError } = await admin.from("estimate_row_items").insert({
    id: randomUUID(),
    estimate_id: priorEstimateId,
    node_id: powderRoomNodeId,
    sort_order: 0,
    source_library_item_id: null,
    source_snapshot: { sourceType: "e2e_prior_estimate_row", notSupplierPriced: true },
    material: "Prior condo vanity mirror",
    description: "Powder room vanity mirror from a prior 3 bedroom condo estimate.",
    supplier: "Ask Flip E2E Prior Supplier",
    unit: "set",
    quantity: 1,
    unit_cost: 22000,
    misc_cost: 0,
    contingency_percentage: 0,
    metadata: { e2e: true, source: "ask-flip-package-builder-live" },
  });
  if (rowError) throw rowError;

  return { priorProjectId, priorEstimateId };
}

async function seedCurrentEstimateShell({
  workspaceId,
  userId,
}: {
  workspaceId: string;
  userId: string;
}): Promise<E2ECurrentEstimateShell> {
  const admin = createAdminClient();
  const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const projectId = randomUUID();
  const estimateId = randomUUID();
  const rootNodeId = randomUUID();

  const { error: projectError } = await admin.from("projects").insert({
    id: projectId,
    workspace_id: workspaceId,
    name: `E2E Current 3 Bedroom Condo ${stamp}`,
    client_name: "Ask Flip E2E Current",
    project_code: `E2E-CUR-${stamp.slice(-6)}`,
    location: "E2E Current Fixture",
    currency_code: "PHP",
    metadata: { e2e: true, source: "ask-flip-current-estimate-live" },
    created_by: userId,
  });
  if (projectError) throw projectError;

  const { error: estimateError } = await admin.from("estimates").insert({
    id: estimateId,
    project_id: projectId,
    name: "Current Condo Estimate",
    sheet_code: `CUR-${stamp.slice(-6)}`,
    currency_code: "PHP",
    metadata: { e2e: true, source: "ask-flip-current-estimate-live" },
    created_by: userId,
  });
  if (estimateError) throw estimateError;

  const { error: nodeError } = await admin.from("estimate_nodes").insert({
    id: rootNodeId,
    estimate_id: estimateId,
    parent_id: null,
    kind: "group",
    name: "Current Condo Shell",
    sort_order: 0,
    metadata: { e2e: true, source: "ask-flip-current-estimate-live" },
  });
  if (nodeError) throw nodeError;

  return { projectId, estimateId, rootNodeId };
}

function formatUnknownError(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

async function deletePackageFixtureTarget(target: E2EPackageCleanupTarget) {
  const admin = createAdminClient();
  const cleanupErrors: string[] = [];

  const { error: workspaceDeleteError } = await admin.from("workspaces").delete().eq("id", target.workspaceId);
  if (workspaceDeleteError) cleanupErrors.push(`workspace delete failed: ${workspaceDeleteError.message}`);

  const { error: userDeleteError } = await admin.auth.admin.deleteUser(target.userId);
  if (userDeleteError) cleanupErrors.push(`auth user delete failed: ${userDeleteError.message}`);

  const { data: workspaceRows, error: workspaceVerifyError } = await admin
    .from("workspaces")
    .select("id")
    .eq("id", target.workspaceId)
    .limit(1);
  if (workspaceVerifyError) {
    cleanupErrors.push(`workspace cleanup verification failed: ${workspaceVerifyError.message}`);
  } else if ((workspaceRows ?? []).length > 0) {
    cleanupErrors.push(`workspace cleanup verification found remaining workspace ${target.workspaceId}`);
  }

  const { data: profileRows, error: profileVerifyError } = await admin
    .from("profiles")
    .select("id")
    .eq("id", target.userId)
    .limit(1);
  if (profileVerifyError) {
    cleanupErrors.push(`profile cleanup verification failed: ${profileVerifyError.message}`);
  } else if ((profileRows ?? []).length > 0) {
    cleanupErrors.push(`profile cleanup verification found remaining profile ${target.userId}`);
  }

  const { data: authUser, error: authUserVerifyError } = await admin.auth.admin.getUserById(target.userId);
  const authUserNotFound = authUserVerifyError && /not found/i.test(authUserVerifyError.message);
  if (authUserVerifyError && !authUserNotFound) {
    cleanupErrors.push(`auth user cleanup verification failed: ${authUserVerifyError.message}`);
  } else if (authUser?.user) {
    cleanupErrors.push(`auth user cleanup verification found remaining user ${target.userId}`);
  }

  if (cleanupErrors.length > 0) {
    throw new Error(`Ask Flip package-builder E2E fixture cleanup failed: ${cleanupErrors.join("; ")}`);
  }
}

async function createPackageFixture(): Promise<E2EPackageFixture> {
  const admin = createAdminClient();
  const anon = createAnonClient();
  const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `ask-flip-package-${stamp}@archestimator.local`;
  const password = `Package-${stamp}!`;
  const workspaceId = randomUUID();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      display_name: "Ask Flip Package E2E",
    },
  });
  if (createError) throw createError;
  if (!created.user) throw new Error("Supabase did not return the created E2E user.");
  const userId = created.user.id;

  try {
    const { error: workspaceError } = await admin.from("workspaces").insert({
      id: workspaceId,
      name: `Ask Flip E2E ${stamp}`,
      slug: `ask-flip-e2e-${stamp}`.replace(/[^a-z0-9-]/gi, "-").toLowerCase().slice(0, 80),
      created_by: userId,
    });
    if (workspaceError) throw workspaceError;

    const { error: profileError } = await admin.from("profiles").upsert({
      id: userId,
      email,
      display_name: "Ask Flip Package E2E",
      avatar_url: null,
      role: "member",
      default_workspace_id: workspaceId,
    });
    if (profileError) throw profileError;

    const { error: membershipError } = await admin.from("workspace_members").upsert({
      workspace_id: workspaceId,
      user_id: userId,
      role: "owner",
    });
    if (membershipError) throw membershipError;

    const bedComponentId = await createComponent({
      workspaceId,
      userId,
      name: "Queen bed frame",
      description: "Queen bed frame for 3 bedroom condo bedroom packages.",
      category: "Furniture",
      unit: "set",
      unitCost: 18000,
    });
    const waterClosetComponentId = await createComponent({
      workspaceId,
      userId,
      name: "Water closet",
      description: "Water closet fixture for condo toilet and bath areas.",
      category: "Sanitary Systems",
      unit: "pc",
      unitCost: 12500,
    });
    const { priorProjectId, priorEstimateId } = await seedComparableEstimate({ workspaceId, userId, stamp });

    const { data: signIn, error: signInError } = await anon.auth.signInWithPassword({ email, password });
    if (signInError) throw signInError;
    if (!signIn.session) throw new Error("Supabase did not return an E2E user session.");

    return {
      userId,
      email,
      password,
      session: signIn.session,
      workspaceId,
      bedComponentId,
      waterClosetComponentId,
      priorProjectId,
      priorEstimateId,
    };
  } catch (error) {
    try {
      await deletePackageFixtureTarget({ workspaceId, userId });
    } catch (cleanupError) {
      throw new Error(
        `Ask Flip package-builder E2E fixture setup failed and cleanup could not be verified: ${formatUnknownError(error)}; cleanup: ${formatUnknownError(cleanupError)}`,
      );
    }
    throw error;
  }
}

async function cleanupPackageFixture(fixture: E2EPackageFixture | null) {
  if (!fixture) return;
  await deletePackageFixtureTarget(fixture);
}

function readCreatedProjectIdFromHref(href: string | null) {
  const match = href?.match(/\/workshop\/projects\/([^/]+)\/estimates\/([^/?#]+)/);
  if (!match) throw new Error(`Open estimate link did not contain project and selected node ids: ${href ?? "null"}`);
  return { projectId: match[1], selectedNodeId: match[2] };
}

function readJsonObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function readJsonArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function isPackageBuilderModeResponse(response: Response, mode: "draft" | "apply") {
  if (!response.url().includes("/api/ai/package-builder")) return false;
  const request = response.request();
  if (request.method() !== "POST") return false;
  const postData = request.postData();
  if (!postData) return false;
  try {
    return readJsonObject(JSON.parse(postData)).mode === mode;
  } catch {
    return false;
  }
}

function waitForPackageBuilderResponse(page: Page, mode: "draft" | "apply") {
  return page.waitForResponse((response) => isPackageBuilderModeResponse(response, mode));
}

function readPackageBuilderRequestBody(response: Response) {
  const postData = response.request().postData();
  if (!postData) throw new Error("Package-builder response did not have a request body.");
  return readJsonObject(JSON.parse(postData));
}

test.describe.serial("Ask Flip live package-builder smoke", () => {
  let fixture: E2EPackageFixture | null = null;

  test.afterEach(async () => {
    await cleanupPackageFixture(fixture);
    fixture = null;
  });

  test("creates a 3-bedroom condo project from real scoped user data and persists audit evidence", async ({ browser, baseURL }, testInfo) => {
    test.setTimeout(120_000);
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    fixture = await createPackageFixture();
    const admin = createAdminClient();
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await createAuthenticatedContext(context, baseURL, fixture.session);
    const page = await context.newPage();

    try {
      await page.goto("/workshop");
      await expect(page.getByRole("button", { name: "Open Ask Flip" })).toBeVisible({ timeout: 30_000 });
      await page.getByRole("button", { name: "Open Ask Flip" }).click();
      await page.getByPlaceholder("Ask Flip").fill(exactPrompt);
      await page.getByRole("button", { name: "Send message" }).click();

      await expect(page.getByText("I drafted a package for review.")).toBeVisible({ timeout: 45_000 });
      await expect(page.getByText("3 Bedroom Condo Unit", { exact: true })).toBeVisible();
      await expect(page.getByText("Queen bed frame").first()).toBeVisible();
      await expect(page.getByText("Water closet").first()).toBeVisible();
      await page.screenshot({ fullPage: true, path: testInfo.outputPath("ask-flip-draft-preview.png") });

      const applyButton = page.getByRole("button", { name: "Apply package" });
      await expect(applyButton).toBeDisabled();
      await page.getByLabel("I reviewed this draft and approve Apply").check();
      await expect(applyButton).toBeEnabled();
      await applyButton.click();

      await expect(page.getByText(/Applied project .*rows/)).toBeVisible({ timeout: 45_000 });
      const openEstimate = page.getByRole("link", { name: "Open estimate", exact: true });
      await expect(openEstimate).toBeVisible();
      const ids = readCreatedProjectIdFromHref(await openEstimate.getAttribute("href"));
      await openEstimate.click();
      await expect(page).toHaveURL(new RegExp(`/workshop/projects/${ids.projectId}/estimates/${ids.selectedNodeId}`), { timeout: 30_000 });
      await page.screenshot({ fullPage: true, path: testInfo.outputPath("ask-flip-created-estimate.png") });

      const { data: selectedNode, error: selectedNodeError } = await admin
        .from("estimate_nodes")
        .select("id, estimate_id")
        .eq("id", ids.selectedNodeId)
        .single();
      if (selectedNodeError) throw selectedNodeError;

      const { data: project, error: projectError } = await admin
        .from("projects")
        .select("id, workspace_id, name")
        .eq("id", ids.projectId)
        .single();
      if (projectError) throw projectError;
      expect(project.workspace_id).toBe(fixture.workspaceId);
      expect(project.name).toBe("3 Bedroom Condo Unit");

      const { data: nodes, error: nodesError } = await admin
        .from("estimate_nodes")
        .select("id, estimate_id, kind, name")
        .eq("estimate_id", selectedNode.estimate_id);
      if (nodesError) throw nodesError;
      const areaNames = (nodes ?? []).filter((node) => node.kind === "area").map((node) => node.name);
      expect(areaNames).toEqual(expect.arrayContaining([
        "Master Bedroom",
        "Bedroom 2",
        "Bedroom 3",
        "Master Toilet & Bath",
        "Common Toilet & Bath",
        "Powder Room",
      ]));

      const { data: rows, error: rowsError } = await admin
        .from("estimate_row_items")
        .select("material, source_library_item_id, source_snapshot")
        .eq("estimate_id", selectedNode.estimate_id);
      if (rowsError) throw rowsError;
      type PersistedRow = NonNullable<typeof rows>[number];
      const rowsByMaterial = new Map<string, PersistedRow[]>();
      for (const row of rows ?? []) rowsByMaterial.set(row.material, [...(rowsByMaterial.get(row.material) ?? []), row]);
      expect(rowsByMaterial.get("Queen bed frame") ?? []).toHaveLength(3);
      expect(rowsByMaterial.get("Water closet") ?? []).toHaveLength(2);
      expect((rowsByMaterial.get("Queen bed frame") ?? []).every((row) => row.source_library_item_id === fixture?.bedComponentId)).toBe(true);
      expect((rowsByMaterial.get("Water closet") ?? []).every((row) => row.source_library_item_id === fixture?.waterClosetComponentId)).toBe(true);
      expect(rowsByMaterial.get("Prior condo vanity mirror") ?? []).toHaveLength(1);

      const { data: actionRuns, error: actionRunError } = await admin
        .from("ai_action_runs")
        .select("run_id, mode, status, provider_send_categories, metadata")
        .eq("workspace_id", fixture.workspaceId)
        .eq("actor_user_id", fixture.userId);
      if (actionRunError) throw actionRunError;
      expect(actionRuns?.some((run) => run.mode === "draft" && run.status === "completed")).toBe(true);
      expect(actionRuns?.some((run) => run.mode === "apply" && run.status === "completed")).toBe(true);

      const { data: dataAccessEvents, error: dataAccessError } = await admin
        .from("ai_data_access_events")
        .select("event_name, source_tables, row_count")
        .eq("workspace_id", fixture.workspaceId)
        .eq("actor_user_id", fixture.userId);
      if (dataAccessError) throw dataAccessError;
      const eventNames = new Set((dataAccessEvents ?? []).map((event) => event.event_name));
      expect(eventNames.has("search_component_library")).toBe(true);
      expect(eventNames.has("search_comparable_estimate_packages")).toBe(true);
      expect((dataAccessEvents ?? []).some((event) => event.event_name === "search_component_library" && event.row_count > 0)).toBe(true);

      const { data: applyCommands, error: applyCommandError } = await admin
        .from("ai_package_apply_commands")
        .select("project_id, estimate_id, status, result")
        .eq("workspace_id", fixture.workspaceId)
        .eq("actor_user_id", fixture.userId)
        .eq("project_id", ids.projectId);
      if (applyCommandError) throw applyCommandError;
      expect(applyCommands).toHaveLength(1);
      expect(applyCommands?.[0]?.status).toBe("completed");
      expect(applyCommands?.[0]?.estimate_id).toBe(selectedNode.estimate_id);
    } finally {
      await context.close();
    }
  });

  test("creates a component-library item from real scoped user data without project or estimate side effects", async ({ browser, baseURL }, testInfo) => {
    test.setTimeout(120_000);
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    fixture = await createPackageFixture();
    const admin = createAdminClient();
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await createAuthenticatedContext(context, baseURL, fixture.session);
    const page = await context.newPage();

    try {
      await page.goto("/workshop/library");
      await expect(page.getByRole("button", { name: "Open Ask Flip" })).toBeVisible({ timeout: 30_000 });
      await page.getByRole("button", { name: "Open Ask Flip" }).click();
      await page.getByPlaceholder("Ask Flip").fill(libraryComponentPrompt);
      const draftResponsePromise = waitForPackageBuilderResponse(page, "draft");
      await page.getByRole("button", { name: "Send message" }).click();
      const draftResponse = await draftResponsePromise;
      expect(draftResponse.ok()).toBe(true);
      const draftPayload = readJsonObject(await draftResponse.json());
      expect(draftPayload.mode).toBe("draft");
      expect(draftPayload.draftHash).toEqual(expect.stringMatching(/^sha256:/));
      expect(draftPayload.draftToken).toEqual(expect.any(String));

      await expect(page.getByText("I drafted a library component for review.")).toBeVisible({ timeout: 45_000 });
      await expect(page.getByText("Library components")).toBeVisible();
      await expect(page.getByText(libraryComponentName).first()).toBeVisible();
      await expect(page.getByText(`set · ₱${libraryComponentCost.toLocaleString("en-US")}`)).toBeVisible();
      await page.screenshot({ fullPage: true, path: testInfo.outputPath("ask-flip-library-component-draft.png") });

      const applyButton = page.getByRole("button", { name: "Apply component" });
      await expect(applyButton).toBeDisabled();
      await page.getByLabel("I reviewed this draft and approve Apply").check();
      await expect(applyButton).toBeEnabled();
      const applyResponsePromise = waitForPackageBuilderResponse(page, "apply");
      await applyButton.click();
      const firstApplyResponse = await applyResponsePromise;
      expect(firstApplyResponse.ok()).toBe(true);
      const firstApplyRequestBody = readPackageBuilderRequestBody(firstApplyResponse);
      const firstApplyPayload = readJsonObject(await firstApplyResponse.json());
      const firstApplyResult = readJsonObject(firstApplyPayload.result);
      expect(firstApplyPayload.mode).toBe("apply");
      expect(firstApplyResult.idempotentReplay).toBe(false);
      expect(firstApplyResult.recoveryStatus).toBe("completed");
      expect(readJsonArray(firstApplyResult.createdComponentIds)).toHaveLength(1);

      await expect(page.getByText("Created 1 library component")).toBeVisible({ timeout: 45_000 });
      const openLibrary = page.getByRole("link", { name: "Open library", exact: true });
      await expect(openLibrary).toBeVisible();
      await expect(openLibrary).toHaveAttribute("href", "/workshop/library");
      await page.screenshot({ fullPage: true, path: testInfo.outputPath("ask-flip-library-component-created.png") });

      const replayResponse = await page.request.post(new URL("/api/ai/package-builder", baseURL).toString(), {
        data: firstApplyRequestBody,
      });
      expect(replayResponse.ok()).toBe(true);
      const replayPayload = readJsonObject(await replayResponse.json());
      const replayResult = readJsonObject(replayPayload.result);
      expect(replayPayload.mode).toBe("apply");
      expect(replayResult.idempotentReplay).toBe(true);
      expect(replayResult.recoveryStatus).toBe("idempotent_replay");
      expect(replayResult.idempotencyKey).toBe(firstApplyResult.idempotencyKey);
      expect(readJsonArray(replayResult.createdComponentIds)).toEqual(readJsonArray(firstApplyResult.createdComponentIds));

      const { data: createdComponents, error: componentError } = await admin
        .from("cost_library_items")
        .select("id, workspace_id, name, category, supplier, unit, unit_cost, misc_cost, pricing_source, confidence, created_by, active_price_option_id, current_version_number, metadata")
        .eq("workspace_id", fixture.workspaceId)
        .eq("name", libraryComponentName)
        .eq("supplier", libraryComponentSupplier);
      if (componentError) throw componentError;
      expect(createdComponents).toHaveLength(1);
      const createdComponent = createdComponents?.[0];
      if (!createdComponent) throw new Error("Ask Flip component-create smoke did not find the persisted component.");
      expect(createdComponent.workspace_id).toBe(fixture.workspaceId);
      expect(createdComponent.category).toBe("Furniture");
      expect(createdComponent.unit).toBe("set");
      expect(createdComponent.unit_cost).toBe(libraryComponentCost);
      expect(createdComponent.misc_cost).toBe(0);
      expect(createdComponent.pricing_source).toBe("Ask Flip draft");
      expect(createdComponent.confidence).toBe("requires-user-review");
      expect(createdComponent.created_by).toBe(fixture.userId);
      expect(createdComponent.current_version_number).toBe(1);
      const componentMetadata = readJsonObject(createdComponent.metadata);
      expect(componentMetadata.source).toBe("ask-flip");
      expect(componentMetadata.createdFrom).toBe("ask-flip-package-builder");
      expect(readJsonObject(componentMetadata.aiPackageBuilder).idempotencyKey).toEqual(expect.any(String));

      const { data: priceOptions, error: priceOptionError } = await admin
        .from("cost_library_item_price_options")
        .select("id, item_id, active_cost_entry_id, label, unit, unit_cost, misc_cost, currency, pricing_source, confidence, is_default, is_active, created_by, variant_metadata")
        .eq("item_id", createdComponent.id);
      if (priceOptionError) throw priceOptionError;
      expect(priceOptions).toHaveLength(1);
      const priceOption = priceOptions?.[0];
      if (!priceOption) throw new Error("Ask Flip component-create smoke did not find a persisted default price option.");
      expect(priceOption.id).toBe(createdComponent.active_price_option_id);
      expect(priceOption.label).toBe("Default");
      expect(priceOption.unit).toBe("set");
      expect(priceOption.unit_cost).toBe(libraryComponentCost);
      expect(priceOption.misc_cost).toBe(0);
      expect(priceOption.currency).toBe("PHP");
      expect(priceOption.pricing_source).toBe("Ask Flip draft");
      expect(priceOption.confidence).toBe("requires-user-review");
      expect(priceOption.is_default).toBe(true);
      expect(priceOption.is_active).toBe(true);
      expect(priceOption.created_by).toBe(fixture.userId);
      expect(readJsonObject(readJsonObject(priceOption.variant_metadata).aiPackageBuilder).draftHash).toEqual(expect.stringMatching(/^sha256:/));

      const { data: costEntries, error: costEntryError } = await admin
        .from("cost_library_item_variant_cost_entries")
        .select("id, item_id, price_option_id, unit_cost, misc_cost, currency, pricing_source, confidence, is_current, deleted_at, created_by")
        .eq("item_id", createdComponent.id)
        .eq("price_option_id", priceOption.id);
      if (costEntryError) throw costEntryError;
      expect(costEntries).toHaveLength(1);
      const currentCostEntry = costEntries?.[0];
      if (!currentCostEntry) throw new Error("Ask Flip component-create smoke did not find a persisted current cost entry.");
      expect(currentCostEntry.id).toBe(priceOption.active_cost_entry_id);
      expect(currentCostEntry.unit_cost).toBe(libraryComponentCost);
      expect(currentCostEntry.misc_cost).toBe(0);
      expect(currentCostEntry.currency).toBe("PHP");
      expect(currentCostEntry.pricing_source).toBe("Ask Flip draft");
      expect(currentCostEntry.confidence).toBe("requires-user-review");
      expect(currentCostEntry.is_current).toBe(true);
      expect(currentCostEntry.deleted_at).toBeNull();
      expect(currentCostEntry.created_by).toBe(fixture.userId);

      const { data: versions, error: versionError } = await admin
        .from("cost_library_item_versions")
        .select("item_id, version_number, change_summary, created_by")
        .eq("item_id", createdComponent.id);
      if (versionError) throw versionError;
      expect(versions).toEqual([
        expect.objectContaining({
          item_id: createdComponent.id,
          version_number: 1,
          change_summary: "Component created",
          created_by: fixture.userId,
        }),
      ]);

      const { data: priceHistory, error: priceHistoryError } = await admin
        .from("cost_library_item_price_history")
        .select("item_id, price_option_id, old_snapshot, created_by")
        .eq("item_id", createdComponent.id);
      if (priceHistoryError) throw priceHistoryError;
      expect(priceHistory).toEqual([
        expect.objectContaining({
          item_id: createdComponent.id,
          price_option_id: priceOption.id,
          old_snapshot: null,
          created_by: fixture.userId,
        }),
      ]);

      const { data: stateHistory, error: stateHistoryError } = await admin
        .from("cost_library_item_state_history")
        .select("item_id, from_state, to_state, created_by")
        .eq("item_id", createdComponent.id);
      if (stateHistoryError) throw stateHistoryError;
      expect(stateHistory).toEqual([
        expect.objectContaining({
          item_id: createdComponent.id,
          from_state: null,
          to_state: "available",
          created_by: fixture.userId,
        }),
      ]);

      const { data: projects, error: projectsError } = await admin
        .from("projects")
        .select("id")
        .eq("workspace_id", fixture.workspaceId);
      if (projectsError) throw projectsError;
      expect(new Set((projects ?? []).map((project) => project.id))).toEqual(new Set([fixture.priorProjectId]));

      const { data: estimates, error: estimatesError } = await admin
        .from("estimates")
        .select("id")
        .eq("project_id", fixture.priorProjectId);
      if (estimatesError) throw estimatesError;
      expect(new Set((estimates ?? []).map((estimate) => estimate.id))).toEqual(new Set([fixture.priorEstimateId]));

      const { data: rows, error: rowsError } = await admin
        .from("estimate_row_items")
        .select("id, estimate_id")
        .eq("estimate_id", fixture.priorEstimateId);
      if (rowsError) throw rowsError;
      expect(rows ?? []).toHaveLength(1);

      const { data: actionRuns, error: actionRunError } = await admin
        .from("ai_action_runs")
        .select("run_id, mode, status, metadata")
        .eq("workspace_id", fixture.workspaceId)
        .eq("actor_user_id", fixture.userId);
      if (actionRunError) throw actionRunError;
      const draftAction = (actionRuns ?? []).find((run) => run.mode === "draft" && run.status === "completed");
      expect(readJsonObject(draftAction?.metadata).componentCreateCount).toBe(1);
      const applyActions = (actionRuns ?? []).filter((run) => run.mode === "apply" && run.status === "completed");
      expect(applyActions).toHaveLength(2);
      const applyMetadataRows = applyActions.map((run) => readJsonObject(run.metadata));
      expect(applyMetadataRows.every((metadata) => metadata.componentCreateCount === 1)).toBe(true);
      expect(applyMetadataRows.every((metadata) => metadata.draftTokenVerified === true)).toBe(true);
      expect(applyMetadataRows.every((metadata) => metadata.serverConfirmation === true)).toBe(true);
      expect(applyMetadataRows.filter((metadata) => metadata.idempotentReplay === false)).toHaveLength(1);
      expect(applyMetadataRows.filter((metadata) => metadata.idempotentReplay === true)).toHaveLength(1);

      const { data: applyCommands, error: applyCommandError } = await admin
        .from("ai_package_apply_commands")
        .select("project_id, estimate_id, status, result")
        .eq("workspace_id", fixture.workspaceId)
        .eq("actor_user_id", fixture.userId);
      if (applyCommandError) throw applyCommandError;
      expect(applyCommands).toHaveLength(1);
      expect(applyCommands?.[0]?.project_id).toBeNull();
      expect(applyCommands?.[0]?.estimate_id).toBeNull();
      expect(applyCommands?.[0]?.status).toBe("completed");
      expect(readJsonObject(applyCommands?.[0]?.result).createdComponentCount).toBe(1);
      expect(readJsonArray(readJsonObject(applyCommands?.[0]?.result).createdComponentIds)).toEqual([createdComponent.id]);
    } finally {
      await context.close();
    }
  });

  test("fills an existing estimate shell from real scoped user data and persists row history", async ({ browser, baseURL }, testInfo) => {
    test.setTimeout(120_000);
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    fixture = await createPackageFixture();
    const target = await seedCurrentEstimateShell({ workspaceId: fixture.workspaceId, userId: fixture.userId });
    const admin = createAdminClient();
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await createAuthenticatedContext(context, baseURL, fixture.session);
    const page = await context.newPage();

    try {
      await page.goto(`/workshop/projects/${target.projectId}/estimates/${target.rootNodeId}`);
      await expect(page.getByRole("button", { name: "Open Ask Flip" })).toBeVisible({ timeout: 30_000 });
      await page.getByRole("button", { name: "Open Ask Flip" }).click();
      await page.getByPlaceholder("Ask Flip").fill(currentEstimatePrompt);
      await page.getByRole("button", { name: "Send message" }).click();

      await expect(page.getByText("I drafted a package for review.")).toBeVisible({ timeout: 45_000 });
      await expect(page.getByText("Current Condo Estimate", { exact: true })).toBeVisible();
      await expect(page.getByText("Queen bed frame").first()).toBeVisible();
      await expect(page.getByText("Water closet").first()).toBeVisible();
      await page.screenshot({ fullPage: true, path: testInfo.outputPath("ask-flip-current-estimate-draft.png") });

      const applyButton = page.getByRole("button", { name: "Apply package" });
      await expect(applyButton).toBeDisabled();
      await page.getByLabel("I reviewed this draft and approve Apply").check();
      await expect(applyButton).toBeEnabled();
      await applyButton.click();

      await expect(page.getByText(/Applied project .*rows/)).toBeVisible({ timeout: 45_000 });
      const openEstimate = page.getByRole("link", { name: "Open estimate", exact: true });
      await expect(openEstimate).toBeVisible();
      const ids = readCreatedProjectIdFromHref(await openEstimate.getAttribute("href"));
      expect(ids.projectId).toBe(target.projectId);
      expect(ids.selectedNodeId).toBe(target.rootNodeId);
      await openEstimate.click();
      await expect(page).toHaveURL(new RegExp(`/workshop/projects/${target.projectId}/estimates/${target.rootNodeId}`), { timeout: 30_000 });
      await page.screenshot({ fullPage: true, path: testInfo.outputPath("ask-flip-current-estimate-filled.png") });

      const { data: projects, error: projectsError } = await admin
        .from("projects")
        .select("id")
        .eq("workspace_id", fixture.workspaceId);
      if (projectsError) throw projectsError;
      expect(new Set((projects ?? []).map((project) => project.id))).toEqual(new Set([fixture.priorProjectId, target.projectId]));

      const { data: estimate, error: estimateError } = await admin
        .from("estimates")
        .select("id, project_id, name")
        .eq("id", target.estimateId)
        .single();
      if (estimateError) throw estimateError;
      expect(estimate.project_id).toBe(target.projectId);
      expect(estimate.name).toBe("Current Condo Estimate");

      const { data: nodes, error: nodesError } = await admin
        .from("estimate_nodes")
        .select("id, estimate_id, kind, name")
        .eq("estimate_id", target.estimateId);
      if (nodesError) throw nodesError;
      const areaNames = (nodes ?? []).filter((node) => node.kind === "area").map((node) => node.name);
      expect(areaNames).toEqual(expect.arrayContaining([
        "Master Bedroom",
        "Bedroom 2",
        "Bedroom 3",
        "Master Toilet & Bath",
        "Common Toilet & Bath",
        "Powder Room",
      ]));

      const { data: rows, error: rowsError } = await admin
        .from("estimate_row_items")
        .select("material, source_library_item_id, source_snapshot")
        .eq("estimate_id", target.estimateId);
      if (rowsError) throw rowsError;
      type PersistedRow = NonNullable<typeof rows>[number];
      const rowsByMaterial = new Map<string, PersistedRow[]>();
      for (const row of rows ?? []) rowsByMaterial.set(row.material, [...(rowsByMaterial.get(row.material) ?? []), row]);
      expect(rowsByMaterial.get("Queen bed frame") ?? []).toHaveLength(3);
      expect(rowsByMaterial.get("Water closet") ?? []).toHaveLength(2);
      expect((rowsByMaterial.get("Queen bed frame") ?? []).every((row) => row.source_library_item_id === fixture?.bedComponentId)).toBe(true);
      expect((rowsByMaterial.get("Water closet") ?? []).every((row) => row.source_library_item_id === fixture?.waterClosetComponentId)).toBe(true);
      expect(rowsByMaterial.get("Prior condo vanity mirror") ?? []).toHaveLength(1);

      const { data: historyEvents, error: historyError } = await admin
        .from("estimate_sheet_events")
        .select("event_type, estimate_id")
        .eq("estimate_id", target.estimateId);
      if (historyError) throw historyError;
      const rowAddedEvents = (historyEvents ?? []).filter((event) => event.event_type === "row_added");
      const blankRowAddedEvents = (historyEvents ?? []).filter((event) => event.event_type === "row_blank_added");
      expect(rowAddedEvents).toHaveLength(5);
      expect(rowAddedEvents.length + blankRowAddedEvents.length).toBe(rows?.length ?? 0);
      expect(blankRowAddedEvents.length).toBeGreaterThanOrEqual(1);

      const { data: actionRuns, error: actionRunError } = await admin
        .from("ai_action_runs")
        .select("run_id, mode, status, metadata")
        .eq("workspace_id", fixture.workspaceId)
        .eq("actor_user_id", fixture.userId);
      if (actionRunError) throw actionRunError;
      expect(actionRuns?.some((run) => run.mode === "draft" && run.status === "completed")).toBe(true);
      expect(actionRuns?.some((run) => run.mode === "apply" && run.status === "started")).toBe(true);

      const { data: dataAccessEvents, error: dataAccessError } = await admin
        .from("ai_data_access_events")
        .select("event_name, row_count")
        .eq("workspace_id", fixture.workspaceId)
        .eq("actor_user_id", fixture.userId);
      if (dataAccessError) throw dataAccessError;
      const eventNames = new Set((dataAccessEvents ?? []).map((event) => event.event_name));
      expect(eventNames.has("read_estimate_tree")).toBe(true);
      expect(eventNames.has("search_component_library")).toBe(true);
      expect(eventNames.has("search_comparable_estimate_packages")).toBe(true);
    } finally {
      await context.close();
    }
  });
});
