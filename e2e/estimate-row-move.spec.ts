import { randomUUID } from "node:crypto";

import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { createClient, type Session } from "@supabase/supabase-js";

const rowMoveSmokeEnabled = process.env.ARCHESTIMATOR_E2E_ROW_MOVE === "1";
const ownerAuthEmail = process.env.ARCHESTIMATOR_DEV_AUTH_EMAIL?.trim().toLowerCase();
const authCookieChunkSize = 3_180;

type RowMoveFixture = {
  workspaceId: string;
  projectId: string;
  estimateId: string;
  tabId: string;
  rootNodeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  movedRowId: string;
  sourceSiblingRowId: string;
  targetExistingRowId: string;
  movedMaterial: string;
  targetMaterial: string;
};

type PersistedRowOrder = {
  id: string;
  node_id: string;
  sort_order: number;
  row_revision: number;
};

function hasPrerequisites() {
  return Boolean(
    rowMoveSmokeEnabled &&
      ownerAuthEmail &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase admin test client is not configured.");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase anon test client is not configured.");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function readAuthCookieName() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is required.");
  const projectRef = new URL(url).hostname.split(".")[0];
  if (!projectRef) throw new Error("Could not derive Supabase project ref for auth cookies.");
  return `sb-${projectRef}-auth-token`;
}

function base64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function getCookieUrls(baseURL: string) {
  const urls = [baseURL];
  const parsed = new URL(baseURL);
  if (parsed.hostname === "127.0.0.1") urls.push(`${parsed.protocol}//localhost${parsed.port ? `:${parsed.port}` : ""}`);
  if (parsed.hostname === "localhost") urls.push(`${parsed.protocol}//127.0.0.1${parsed.port ? `:${parsed.port}` : ""}`);
  return Array.from(new Set(urls));
}

function createAuthCookies(session: Session, baseURL: string) {
  const encoded = `base64-${base64Url(JSON.stringify(session))}`;
  const cookieName = readAuthCookieName();
  const chunks =
    encoded.length <= authCookieChunkSize
      ? [{ name: cookieName, value: encoded }]
      : Array.from({ length: Math.ceil(encoded.length / authCookieChunkSize) }, (_, index) => ({
          name: `${cookieName}.${index}`,
          value: encoded.slice(index * authCookieChunkSize, (index + 1) * authCookieChunkSize),
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

function readBaseURL(testInfo: TestInfo) {
  const configuredBaseURL = testInfo.project.use.baseURL;
  if (typeof configuredBaseURL === "string") return configuredBaseURL;
  const port = process.env.PLAYWRIGHT_PORT ?? "3020";
  return `http://127.0.0.1:${port}`;
}

async function createOwnerSession(): Promise<Session> {
  if (!ownerAuthEmail) throw new Error("ARCHESTIMATOR_DEV_AUTH_EMAIL is required.");
  const { data, error } = await createAdminClient().auth.admin.generateLink({
    type: "magiclink",
    email: ownerAuthEmail,
  });
  if (error) throw error;

  const properties = data.properties ?? {};
  const emailToken = properties.email_otp;
  const hashedToken = properties.hashed_token;
  const anonClient = createAnonClient();
  const { data: verified, error: verifyError } = emailToken
    ? await anonClient.auth.verifyOtp({ email: ownerAuthEmail, token: emailToken, type: "email" })
    : hashedToken
      ? await anonClient.auth.verifyOtp({ token_hash: hashedToken, type: "magiclink" })
      : (() => {
          throw new Error("Supabase did not return a magic-link token for the owner session.");
        })();
  if (verifyError) throw verifyError;
  if (!verified.session) throw new Error("Supabase did not return an owner E2E session.");
  return verified.session;
}

async function installOwnerSession(page: Page, testInfo: TestInfo) {
  const session = await createOwnerSession();
  await page.context().addCookies(createAuthCookies(session, readBaseURL(testInfo)));
}

async function getDevAuthUserId() {
  const email = ownerAuthEmail;
  if (!email) throw new Error("ARCHESTIMATOR_DEV_AUTH_EMAIL is required.");
  const { data, error } = await createAdminClient().auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email);
  if (!user) throw new Error(`Could not find dev auth user ${email}.`);
  return user.id;
}

async function getFixtureWorkspaceId(userId: string) {
  const { data, error } = await createAdminClient()
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) throw error;
  const membership = data?.[0];
  if (!membership?.workspace_id) throw new Error("Dev auth user has no workspace membership for row move e2e.");
  return membership.workspace_id;
}

function rowInsert({
  estimateId,
  nodeId,
  rowId,
  material,
  sortOrder,
}: {
  estimateId: string;
  nodeId: string;
  rowId: string;
  material: string;
  sortOrder: number;
}) {
  return {
    id: rowId,
    estimate_id: estimateId,
    node_id: nodeId,
    sort_order: sortOrder,
    source_library_item_id: null,
    source_snapshot: null,
    material,
    description: `${material} browser row-move fixture`,
    supplier: "E2E Supplier",
    unit: "pc",
    quantity: 1,
    quantity_base: null,
    quantity_contingency_amount: null,
    unit_cost: 100,
    contingency_percentage: 0,
    misc_cost: 0,
    discipline: "Architectural Works",
    designation: "E2E row move proof",
    link_state: "unlinked",
    metadata: { e2e: true, source: "estimate-row-move-smoke" },
    row_revision: 1,
  };
}

async function createRowMoveFixture(): Promise<RowMoveFixture> {
  const admin = createAdminClient();
  const userId = await getDevAuthUserId();
  const workspaceId = await getFixtureWorkspaceId(userId);
  const projectId = randomUUID();
  const estimateId = randomUUID();
  const tabId = randomUUID();
  const rootNodeId = randomUUID();
  const sourceNodeId = randomUUID();
  const targetNodeId = randomUUID();
  const movedRowId = randomUUID();
  const sourceSiblingRowId = randomUUID();
  const targetExistingRowId = randomUUID();
  const stamp = Date.now().toString(36);
  const movedMaterial = `E2E movable row ${stamp}`;
  const targetMaterial = `E2E target anchor ${stamp}`;

  try {
    const { error: projectError } = await admin.from("projects").insert({
      id: projectId,
      workspace_id: workspaceId,
      name: `Row Move E2E ${stamp}`,
      client_name: "Row Move E2E Client",
      project_code: `ROW-${stamp.slice(-6).toUpperCase()}`,
      location: "E2E Fixture",
      currency_code: "PHP",
      metadata: { e2e: true, source: "estimate-row-move-smoke" },
      created_by: userId,
    });
    if (projectError) throw projectError;

    const { error: projectMemberError } = await admin.from("project_members").upsert(
      {
        project_id: projectId,
        workspace_id: workspaceId,
        user_id: userId,
        role: "owner",
        added_by: userId,
      },
      { onConflict: "project_id,user_id" },
    );
    if (projectMemberError) throw projectMemberError;

    const { error: estimateError } = await admin.from("estimates").insert({
      id: estimateId,
      project_id: projectId,
      name: `Row Move Estimate ${stamp}`,
      sheet_code: `ROWMOVE-${stamp.slice(-8).toUpperCase()}`,
      currency_code: "PHP",
      created_by: userId,
      metadata: { e2e: true, source: "estimate-row-move-smoke" },
    });
    if (estimateError) throw estimateError;

    const { error: estimateMemberError } = await admin.from("estimate_sheet_members").insert({
      estimate_id: estimateId,
      project_id: projectId,
      user_id: userId,
      role: "owner",
      added_by: userId,
    });
    if (estimateMemberError) throw estimateMemberError;

    const { error: tabError } = await admin.from("estimate_tabs").insert({
      id: tabId,
      estimate_id: estimateId,
      name: "Main",
      sort_order: 0,
      is_default: true,
      created_by: userId,
      metadata: { e2e: true, source: "estimate-row-move-smoke" },
    });
    if (tabError) throw tabError;

    const { error: nodeError } = await admin.from("estimate_nodes").insert([
      {
        id: rootNodeId,
        estimate_id: estimateId,
        estimate_tab_id: tabId,
        parent_id: null,
        kind: "group",
        name: "E2E Row Move Root",
        sort_order: 10,
        metadata: { e2e: true, source: "estimate-row-move-smoke" },
      },
      {
        id: sourceNodeId,
        estimate_id: estimateId,
        estimate_tab_id: tabId,
        parent_id: rootNodeId,
        kind: "area",
        name: "E2E Source Area",
        sort_order: 20,
        metadata: { e2e: true, source: "estimate-row-move-smoke" },
      },
      {
        id: targetNodeId,
        estimate_id: estimateId,
        estimate_tab_id: tabId,
        parent_id: rootNodeId,
        kind: "area",
        name: "E2E Target Area",
        sort_order: 30,
        metadata: { e2e: true, source: "estimate-row-move-smoke" },
      },
    ]);
    if (nodeError) throw nodeError;

    const { error: rowError } = await admin.from("estimate_row_items").insert([
      rowInsert({ estimateId, nodeId: sourceNodeId, rowId: movedRowId, material: movedMaterial, sortOrder: 0 }),
      rowInsert({ estimateId, nodeId: sourceNodeId, rowId: sourceSiblingRowId, material: `E2E source sibling ${stamp}`, sortOrder: 1 }),
      rowInsert({ estimateId, nodeId: targetNodeId, rowId: targetExistingRowId, material: targetMaterial, sortOrder: 0 }),
    ]);
    if (rowError) throw rowError;
  } catch (error) {
    await deleteRowMoveFixture({ projectId, estimateId } as RowMoveFixture);
    throw error;
  }

  return {
    workspaceId,
    projectId,
    estimateId,
    tabId,
    rootNodeId,
    sourceNodeId,
    targetNodeId,
    movedRowId,
    sourceSiblingRowId,
    targetExistingRowId,
    movedMaterial,
    targetMaterial,
  };
}

async function deleteRowMoveFixture(fixture: RowMoveFixture | null) {
  if (!fixture) return;
  const admin = createAdminClient();
  await admin.from("estimates").delete().eq("id", fixture.estimateId);
  await admin.from("projects").delete().eq("id", fixture.projectId);
}

async function getPersistedRows(fixture: RowMoveFixture): Promise<PersistedRowOrder[]> {
  const { data, error } = await createAdminClient()
    .from("estimate_row_items")
    .select("id, node_id, sort_order, row_revision")
    .eq("estimate_id", fixture.estimateId)
    .order("node_id", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data as PersistedRowOrder[];
}

async function getRowMoveEventCount(fixture: RowMoveFixture) {
  const { count, error } = await createAdminClient()
    .from("estimate_sheet_events")
    .select("id", { count: "exact", head: true })
    .eq("estimate_id", fixture.estimateId)
    .eq("event_type", "row_reorganized")
    .eq("target_row_id", fixture.movedRowId);
  if (error) throw error;
  return count ?? 0;
}

function rowLocator(page: Page, rowId: string) {
  return page.locator(`tr[data-estimate-row-id="${rowId}"]`).first();
}

function tableLocator(page: Page, nodeId: string) {
  return page.locator(`[data-estimate-row-table-root="${nodeId}"]`).first();
}

function rowMoveHandle(page: Page, rowId: string, material: string) {
  return rowLocator(page, rowId).getByRole("button", { name: `Move row ${material}` });
}

async function dragRowHandleToTargetRow({
  sourceHandle,
  targetRow,
  page,
}: {
  sourceHandle: Locator;
  targetRow: Locator;
  page: Page;
}) {
  await targetRow.scrollIntoViewIfNeeded();
  await sourceHandle.hover();
  const sourceBox = await sourceHandle.boundingBox();
  const targetBox = await targetRow.boundingBox();
  if (!sourceBox || !targetBox) throw new Error("Could not measure row drag geometry.");

  const startX = sourceBox.x + sourceBox.width / 2;
  const startY = sourceBox.y + sourceBox.height / 2;
  const viewportWidth = page.viewportSize()?.width ?? targetBox.x + targetBox.width;
  const targetX = Math.max(24, Math.min(targetBox.x + 48, viewportWidth - 24));
  const targetY = targetBox.y + targetBox.height * 0.78;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 12, startY + 8, { steps: 4 });
  await page.waitForTimeout(150);
  await page.mouse.move(targetX, targetY, { steps: 24 });
  await page.waitForTimeout(150);
  await page.mouse.up();
}

test.describe("estimate row move browser proof", () => {
  test.use({ viewport: { width: 1440, height: 1100 } });
  test.setTimeout(120_000);
  test.skip(!hasPrerequisites(), "Requires ARCHESTIMATOR_E2E_ROW_MOVE=1, owner email, and Supabase anon/service-role env.");

  test("moves a middle-sheet row between nodes with pointer drag and persists dense order", async ({ page }, testInfo) => {
    let fixture: RowMoveFixture | null = null;
    try {
      fixture = await createRowMoveFixture();
      await installOwnerSession(page, testInfo);
      await page.goto(`/workshop/projects/${fixture.projectId}/estimates/${fixture.rootNodeId}`, { waitUntil: "domcontentloaded" });

      await expect(page.getByRole("heading", { name: "E2E Row Move Root" })).toBeVisible({ timeout: 30_000 });
      await expect(tableLocator(page, fixture.sourceNodeId)).toBeVisible({ timeout: 30_000 });
      await expect(tableLocator(page, fixture.targetNodeId)).toBeVisible({ timeout: 30_000 });
      await expect(rowLocator(page, fixture.movedRowId)).toBeVisible();
      await expect(rowLocator(page, fixture.targetExistingRowId)).toBeVisible();

      const movedHandle = rowMoveHandle(page, fixture.movedRowId, fixture.movedMaterial);
      const targetRow = rowLocator(page, fixture.targetExistingRowId);
      await expect(movedHandle).toBeVisible();
      await expect(movedHandle).toHaveAttribute("draggable", "true");
      await dragRowHandleToTargetRow({
        sourceHandle: movedHandle,
        targetRow,
        page,
      });

      await expect.poll(async () => getPersistedRows(fixture!), { timeout: 60_000 }).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: fixture.sourceSiblingRowId, node_id: fixture.sourceNodeId, sort_order: 0, row_revision: 2 }),
          expect.objectContaining({ id: fixture.targetExistingRowId, node_id: fixture.targetNodeId, sort_order: 0, row_revision: 1 }),
          expect.objectContaining({ id: fixture.movedRowId, node_id: fixture.targetNodeId, sort_order: 1, row_revision: 2 }),
        ]),
      );
      await expect.poll(async () => getRowMoveEventCount(fixture!), { timeout: 15_000 }).toBe(1);

      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(tableLocator(page, fixture.targetNodeId).locator(`tr[data-estimate-row-id="${fixture.movedRowId}"]`)).toBeVisible({ timeout: 30_000 });
      await expect(tableLocator(page, fixture.sourceNodeId).locator(`tr[data-estimate-row-id="${fixture.movedRowId}"]`)).toHaveCount(0);
    } finally {
      await deleteRowMoveFixture(fixture);
    }
  });
});
