import { randomUUID } from "node:crypto";

import { type Locator, type Page, type TestInfo } from "@playwright/test";
import { createClient, type Session } from "@supabase/supabase-js";

const ownerAuthEmail = process.env.ARCHESTIMATOR_DEV_AUTH_EMAIL?.trim().toLowerCase();
const authCookieChunkSize = 3_180;

export type EstimateRowE2EFixture = {
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

export type PersistedEstimateRow = {
  id: string;
  node_id: string;
  sort_order: number;
  row_revision: number;
  quantity: number;
};

export type PersistedEstimateRowDetails = PersistedEstimateRow & {
  material: string;
  description: string;
  misc_cost: number;
  adjustment_percentage: number | null;
};

export function hasEstimateRowE2EPrerequisites() {
  return Boolean(
    process.env.ARCHESTIMATOR_E2E_ROW_MOVE === "1" &&
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

export function readBaseURL(testInfo: TestInfo) {
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

export async function installOwnerSession(page: Page, testInfo: TestInfo) {
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
  if (!membership?.workspace_id) throw new Error("Dev auth user has no workspace membership for estimate row e2e.");
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
    description: `${material} browser fixture`,
    supplier: "E2E Supplier",
    unit: "pc",
    quantity: 1,
    quantity_base: null,
    quantity_contingency_amount: null,
    unit_cost: 100,
    contingency_percentage: 0,
    misc_cost: 0,
    discipline: "Architectural Works",
    designation: "E2E row proof",
    link_state: "unlinked",
    metadata: { e2e: true, source: "estimate-row-fixture" },
    row_revision: 1,
  };
}

export async function createEstimateRowFixture(): Promise<EstimateRowE2EFixture> {
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
      name: `Estimate Row E2E ${stamp}`,
      client_name: "Estimate Row E2E Client",
      project_code: `ROW-${stamp.slice(-6).toUpperCase()}`,
      location: "E2E Fixture",
      currency_code: "PHP",
      metadata: { e2e: true, source: "estimate-row-fixture" },
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
      name: `Estimate Row Proof ${stamp}`,
      sheet_code: `ROWPROOF-${stamp.slice(-8).toUpperCase()}`,
      currency_code: "PHP",
      created_by: userId,
      metadata: { e2e: true, source: "estimate-row-fixture" },
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
      metadata: { e2e: true, source: "estimate-row-fixture" },
    });
    if (tabError) throw tabError;

    const { error: nodeError } = await admin.from("estimate_nodes").insert([
      {
        id: rootNodeId,
        estimate_id: estimateId,
        estimate_tab_id: tabId,
        parent_id: null,
        kind: "group",
        name: "E2E Row Proof Root",
        sort_order: 10,
        metadata: { e2e: true, source: "estimate-row-fixture" },
      },
      {
        id: sourceNodeId,
        estimate_id: estimateId,
        estimate_tab_id: tabId,
        parent_id: rootNodeId,
        kind: "area",
        name: "E2E Source Area",
        sort_order: 20,
        metadata: { e2e: true, source: "estimate-row-fixture" },
      },
      {
        id: targetNodeId,
        estimate_id: estimateId,
        estimate_tab_id: tabId,
        parent_id: rootNodeId,
        kind: "area",
        name: "E2E Target Area",
        sort_order: 30,
        metadata: { e2e: true, source: "estimate-row-fixture" },
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
    await deleteEstimateRowFixture({ projectId, estimateId } as EstimateRowE2EFixture);
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

export async function deleteEstimateRowFixture(fixture: EstimateRowE2EFixture | null) {
  if (!fixture) return;
  const admin = createAdminClient();
  await admin.from("estimates").delete().eq("id", fixture.estimateId);
  await admin.from("projects").delete().eq("id", fixture.projectId);
}

export async function getPersistedRows(fixture: EstimateRowE2EFixture): Promise<PersistedEstimateRow[]> {
  const { data, error } = await createAdminClient()
    .from("estimate_row_items")
    .select("id, node_id, sort_order, row_revision, quantity")
    .eq("estimate_id", fixture.estimateId)
    .order("node_id", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data as PersistedEstimateRow[];
}

export async function getPersistedRow(fixture: EstimateRowE2EFixture, rowId: string) {
  const { data, error } = await createAdminClient()
    .from("estimate_row_items")
    .select("id, node_id, sort_order, row_revision, quantity")
    .eq("estimate_id", fixture.estimateId)
    .eq("id", rowId)
    .single();
  if (error) throw error;
  return data as PersistedEstimateRow;
}

export async function getPersistedRowDetails(fixture: EstimateRowE2EFixture, rowId: string) {
  const { data, error } = await createAdminClient()
    .from("estimate_row_items")
    .select("id, node_id, sort_order, row_revision, quantity, material, description, misc_cost, adjustment_percentage")
    .eq("estimate_id", fixture.estimateId)
    .eq("id", rowId)
    .single();
  if (error) throw error;
  return data as PersistedEstimateRowDetails;
}

export async function getRowMoveEventCount(fixture: EstimateRowE2EFixture) {
  const { count, error } = await createAdminClient()
    .from("estimate_sheet_events")
    .select("id", { count: "exact", head: true })
    .eq("estimate_id", fixture.estimateId)
    .eq("event_type", "row_reorganized")
    .eq("target_row_id", fixture.movedRowId);
  if (error) throw error;
  return count ?? 0;
}

export function rowLocator(page: Page, rowId: string) {
  return page.locator(`tr[data-estimate-row-id="${rowId}"]`).first();
}

export function tableLocator(page: Page, nodeId: string) {
  return page.locator(`[data-estimate-row-table-root="${nodeId}"]`).first();
}

export function rowMoveHandle(page: Page, rowId: string, material: string) {
  return rowLocator(page, rowId).getByRole("button", { name: `Move row ${material}` });
}

export async function measureRowDragGeometry({
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

  return { startX, startY, targetX, targetY };
}

export async function dragRowHandleToTargetRow({
  sourceHandle,
  targetRow,
  page,
}: {
  sourceHandle: Locator;
  targetRow: Locator;
  page: Page;
}) {
  const { startX, startY, targetX, targetY } = await measureRowDragGeometry({ sourceHandle, targetRow, page });
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 12, startY + 8, { steps: 4 });
  await page.waitForTimeout(150);
  await page.mouse.move(targetX, targetY, { steps: 24 });
  await page.waitForTimeout(150);
  await page.mouse.up();
}
