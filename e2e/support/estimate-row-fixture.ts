import { randomUUID } from "node:crypto";

import { type Locator, type Page, type TestInfo } from "@playwright/test";
import { createClient, type Session } from "@supabase/supabase-js";

import { CURRENT_TERMS } from "@/lib/legal/terms-content";

const ownerAuthEmail = process.env.ARCHESTIMATOR_DEV_AUTH_EMAIL?.trim().toLowerCase();
const authCookieChunkSize = 3_180;

export type EstimateRowE2EFixture = {
  workspaceId: string;
  ownerUserId: string;
  viewerUserId: string;
  viewerEmail: string;
  viewerPassword: string;
  projectId: string;
  estimateId: string;
  tabId: string;
  rootNodeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  movedRowId: string;
  sourceSiblingRowId: string;
  linkedComponentRowId: string;
  componentMoveTargetRowId: string;
  textEditRowId: string;
  targetExistingRowId: string;
  linkedLibraryItemId: string;
  replacementLibraryItemId: string;
  movedMaterial: string;
  linkedMaterial: string;
  componentMoveTargetMaterial: string;
  textEditMaterial: string;
  targetMaterial: string;
  replacementMaterial: string;
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
  source_library_item_id: string | null;
  link_state: string | null;
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

async function createPasswordSession(email: string, password: string): Promise<Session> {
  const { data, error } = await createAnonClient().auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.session) throw new Error(`Supabase did not return an E2E session for ${email}.`);
  return data.session;
}

export async function installViewerSession(page: Page, testInfo: TestInfo, fixture: EstimateRowE2EFixture) {
  const session = await createPasswordSession(fixture.viewerEmail, fixture.viewerPassword);
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
  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("default_workspace_id")
    .eq("id", userId)
    .maybeSingle();
  if (profileError) throw profileError;

  const { data, error } = await admin
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) throw error;
  if (profile?.default_workspace_id) {
    const { data: defaultMembership, error: defaultMembershipError } = await admin
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userId)
      .eq("workspace_id", profile.default_workspace_id)
      .maybeSingle();
    if (defaultMembershipError) throw defaultMembershipError;
    if (defaultMembership?.workspace_id) return defaultMembership.workspace_id;
  }

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
  sourceLibraryItemId = null,
  linkState = "unlinked",
  express = false,
}: {
  estimateId: string;
  nodeId: string;
  rowId: string;
  material: string;
  sortOrder: number;
  sourceLibraryItemId?: string | null;
  linkState?: "linked-clean" | "unlinked";
  express?: boolean;
}) {
  return {
    id: rowId,
    estimate_id: estimateId,
    node_id: nodeId,
    sort_order: sortOrder,
    source_library_item_id: sourceLibraryItemId,
    source_snapshot: sourceLibraryItemId
      ? {
          sourceLibraryItemId,
          material,
          supplier: "E2E Supplier",
          unit: "pc",
          unitCost: 100,
          miscCost: 0,
          category: "E2E",
          componentVersionNumber: 1,
        }
      : null,
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
    link_state: linkState,
    metadata: {
      e2e: true,
      source: "estimate-row-fixture",
      ...(express
        ? {
            expressComponent: {
              kind: "express",
              schemaVersion: 1,
              id: rowId,
              createdFrom: "estimate-row-fixture",
              componentName: material,
            },
          }
        : {}),
    },
    row_revision: 1,
  };
}

function libraryItemInsert({
  workspaceId,
  userId,
  itemId,
  material,
  unitCost,
}: {
  workspaceId: string;
  userId: string;
  itemId: string;
  material: string;
  unitCost: number;
}) {
  const now = new Date().toISOString();
  return {
    id: itemId,
    workspace_id: workspaceId,
    name: material,
    description: `${material} browser fixture library component`,
    supplier: "E2E Supplier",
    unit: "pc",
    unit_cost: unitCost,
    misc_cost: 0,
    category: "E2E",
    confidence: "e2e",
    pricing_source: "E2E fixture",
    pricing_date: new Date().toISOString().slice(0, 10),
    lifecycle_state: "available" as const,
    lifecycle_state_changed_at: now,
    current_version_number: 1,
    metadata: { e2e: true, source: "estimate-row-fixture" },
    created_by: userId,
    created_at: now,
    updated_at: now,
  };
}

export async function createEstimateRowFixture(): Promise<EstimateRowE2EFixture> {
  const admin = createAdminClient();
  const userId = await getDevAuthUserId();
  const workspaceId = await getFixtureWorkspaceId(userId);
  const viewerUserId = randomUUID();
  const viewerEmail = `estimate-row-viewer-${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}@archestimator.local`;
  const viewerPassword = `Estimate-row-${randomUUID()}!`;
  const projectId = randomUUID();
  const estimateId = randomUUID();
  const tabId = randomUUID();
  const rootNodeId = randomUUID();
  const sourceNodeId = randomUUID();
  const targetNodeId = randomUUID();
  const movedRowId = randomUUID();
  const sourceSiblingRowId = randomUUID();
  const linkedComponentRowId = randomUUID();
  const componentMoveTargetRowId = randomUUID();
  const textEditRowId = randomUUID();
  const targetExistingRowId = randomUUID();
  const linkedLibraryItemId = randomUUID();
  const replacementLibraryItemId = randomUUID();
  const stamp = Date.now().toString(36);
  const movedMaterial = `E2E movable row ${stamp}`;
  const linkedMaterial = `E2E linked component ${stamp}`;
  const componentMoveTargetMaterial = `E2E component target ${stamp}`;
  const textEditMaterial = `E2E text edit row ${stamp}`;
  const targetMaterial = `E2E target anchor ${stamp}`;
  const replacementMaterial = `E2E replacement component ${stamp}`;

  try {
    const { data: createdViewer, error: viewerCreateError } = await admin.auth.admin.createUser({
      id: viewerUserId,
      email: viewerEmail,
      password: viewerPassword,
      email_confirm: true,
      user_metadata: { display_name: "Estimate Row Viewer E2E" },
    });
    if (viewerCreateError) throw viewerCreateError;
    if (!createdViewer.user) throw new Error("Supabase did not return the estimate row viewer E2E user.");

    const { error: viewerProfileError } = await admin.from("profiles").upsert({
      id: viewerUserId,
      email: viewerEmail,
      display_name: "Estimate Row Viewer E2E",
      avatar_url: null,
      role: "member",
      default_workspace_id: workspaceId,
    });
    if (viewerProfileError) throw viewerProfileError;

    const { error: viewerAllowlistError } = await admin.from("closed_beta_allowed_emails").upsert(
      {
        normalized_email: viewerEmail,
        status: "active",
        metadata: { e2e: true, source: "estimate-row-fixture" },
        notes: "Estimate row viewer E2E fixture",
      },
      { onConflict: "normalized_email" },
    );
    if (viewerAllowlistError) throw viewerAllowlistError;

    const { error: viewerTermsAcceptanceError } = await admin.from("legal_terms_acceptances").upsert(
      {
        user_id: viewerUserId,
        terms_key: CURRENT_TERMS.key,
        terms_version: CURRENT_TERMS.version,
        terms_effective_date: CURRENT_TERMS.effectiveDate,
        terms_content_hash: CURRENT_TERMS.contentHash,
        privacy_policy_version: CURRENT_TERMS.privacyPolicyVersion,
        acceptance_method: "authenticated_clickwrap",
        acceptance_context: "workshop_terms_gate",
        metadata_json: {
          e2e: true,
          source: "estimate-row-fixture",
        },
      },
      { onConflict: "user_id,terms_key,terms_version" },
    );
    if (viewerTermsAcceptanceError) throw viewerTermsAcceptanceError;

    const { error: viewerWorkspaceError } = await admin.from("workspace_members").upsert(
      {
        workspace_id: workspaceId,
        user_id: viewerUserId,
        role: "viewer",
      },
      { onConflict: "workspace_id,user_id" },
    );
    if (viewerWorkspaceError) throw viewerWorkspaceError;

    const { error: libraryError } = await admin.from("cost_library_items").insert([
      libraryItemInsert({ workspaceId, userId, itemId: linkedLibraryItemId, material: linkedMaterial, unitCost: 140 }),
      libraryItemInsert({ workspaceId, userId, itemId: replacementLibraryItemId, material: replacementMaterial, unitCost: 220 }),
    ]);
    if (libraryError) throw libraryError;

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

    const { error: viewerProjectMemberError } = await admin.from("project_members").upsert(
      {
        project_id: projectId,
        workspace_id: workspaceId,
        user_id: viewerUserId,
        role: "viewer",
        added_by: userId,
      },
      { onConflict: "project_id,user_id" },
    );
    if (viewerProjectMemberError) throw viewerProjectMemberError;

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

    const { error: viewerEstimateMemberError } = await admin.from("estimate_sheet_members").insert({
      estimate_id: estimateId,
      project_id: projectId,
      user_id: viewerUserId,
      role: "viewer",
      added_by: userId,
    });
    if (viewerEstimateMemberError) throw viewerEstimateMemberError;

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
      rowInsert({
        estimateId,
        nodeId: sourceNodeId,
        rowId: linkedComponentRowId,
        material: linkedMaterial,
        sortOrder: 2,
        sourceLibraryItemId: linkedLibraryItemId,
        linkState: "linked-clean",
      }),
      rowInsert({ estimateId, nodeId: sourceNodeId, rowId: componentMoveTargetRowId, material: componentMoveTargetMaterial, sortOrder: 3 }),
      rowInsert({ estimateId, nodeId: sourceNodeId, rowId: textEditRowId, material: textEditMaterial, sortOrder: 4, express: true }),
      rowInsert({ estimateId, nodeId: targetNodeId, rowId: targetExistingRowId, material: targetMaterial, sortOrder: 0 }),
    ]);
    if (rowError) throw rowError;
  } catch (error) {
    await deleteEstimateRowFixture({
      workspaceId,
      ownerUserId: userId,
      viewerUserId,
      viewerEmail,
      viewerPassword,
      projectId,
      estimateId,
      linkedLibraryItemId,
      replacementLibraryItemId,
    } as EstimateRowE2EFixture);
    throw error;
  }

  return {
    workspaceId,
    ownerUserId: userId,
    viewerUserId,
    viewerEmail,
    viewerPassword,
    projectId,
    estimateId,
    tabId,
    rootNodeId,
    sourceNodeId,
    targetNodeId,
    movedRowId,
    sourceSiblingRowId,
    linkedComponentRowId,
    componentMoveTargetRowId,
    textEditRowId,
    targetExistingRowId,
    linkedLibraryItemId,
    replacementLibraryItemId,
    movedMaterial,
    linkedMaterial,
    componentMoveTargetMaterial,
    textEditMaterial,
    targetMaterial,
    replacementMaterial,
  };
}

export async function setEstimateRowFixtureRole(
  fixture: EstimateRowE2EFixture,
  role: "owner" | "admin" | "editor" | "viewer",
) {
  const admin = createAdminClient();
  const [{ error: projectMemberError }, { error: estimateMemberError }] = await Promise.all([
    admin
      .from("project_members")
      .update({ role })
      .eq("project_id", fixture.projectId)
      .eq("user_id", fixture.ownerUserId),
    admin
      .from("estimate_sheet_members")
      .update({ role })
      .eq("estimate_id", fixture.estimateId)
      .eq("user_id", fixture.ownerUserId),
  ]);
  if (projectMemberError) throw projectMemberError;
  if (estimateMemberError) throw estimateMemberError;
}

export async function deleteEstimateRowFixture(fixture: EstimateRowE2EFixture | null) {
  if (!fixture) return;
  const admin = createAdminClient();
  const { data: linkedRows } = await admin
    .from("estimate_row_items")
    .select("source_library_item_id")
    .eq("estimate_id", fixture.estimateId)
    .not("source_library_item_id", "is", null);
  const libraryItemIds = Array.from(new Set([
    fixture.linkedLibraryItemId,
    fixture.replacementLibraryItemId,
    ...(linkedRows ?? []).map((row) => row.source_library_item_id).filter((id): id is string => Boolean(id)),
  ]));
  await admin.from("estimates").delete().eq("id", fixture.estimateId);
  await admin.from("projects").delete().eq("id", fixture.projectId);
  if (libraryItemIds.length > 0) await admin.from("cost_library_items").delete().in("id", libraryItemIds);
  await admin.from("workspace_members").delete().eq("workspace_id", fixture.workspaceId).eq("user_id", fixture.viewerUserId);
  await admin.from("closed_beta_allowed_emails").delete().eq("normalized_email", fixture.viewerEmail);
  await admin.from("legal_terms_acceptances").delete().eq("user_id", fixture.viewerUserId);
  await admin.from("profiles").delete().eq("id", fixture.viewerUserId);
  await admin.auth.admin.deleteUser(fixture.viewerUserId);
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
    .select("id, node_id, sort_order, row_revision, quantity, material, description, misc_cost, adjustment_percentage, source_library_item_id, link_state")
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
