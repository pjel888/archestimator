import { randomUUID } from "node:crypto";

import { expect, type Locator, type Page, type TestInfo } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { createSharedLinkTargetLabelsJson } from "@/lib/publication/activity-helpers";
import {
  createPublicationToken,
  decryptPublicationToken,
  encryptPublicationToken,
  hashPublicationToken,
  readPublicationTokenEncryptionSecret,
  readPublicationTokenHashSecret,
} from "@/lib/publication/security";
import type { ProjectPublicationSnapshot } from "@/lib/publication/types";
import type { Database, Json } from "@/lib/supabase/types";

export const publisherE2EEnabled = process.env.ARCHESTIMATOR_E2E_PUBLISHER === "1";

const devAuthSecret = process.env.ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET?.trim();
const devAuthReady = process.env.ARCHESTIMATOR_DEV_AUTH_BYPASS === "1" && Boolean(devAuthSecret);
const storageStateReady = Boolean(process.env.PLAYWRIGHT_STORAGE_STATE);

type PublisherFixtureSource =
  | "publisher-accessibility-e2e"
  | "publisher-access-mode-e2e"
  | "publisher-drawer-e2e";

export type PublisherE2EFixture = {
  estimateId: string;
  estimateName: string;
  oldClientLinkPath: string;
  projectId: string;
  projectName: string;
  publicationId: string;
  userId: string;
  workspaceId: string;
};

type AccountSecurityEventRow = {
  id: string;
  metadata_json: Json;
};

export function hasPublisherAuthPrerequisites() {
  return devAuthReady || storageStateReady;
}

export function hasPublisherFixturePrerequisites() {
  return Boolean(
    hasPublisherAuthPrerequisites() &&
      process.env.ARCHESTIMATOR_DEV_AUTH_EMAIL &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

function readBaseURL(testInfo: TestInfo) {
  const configuredBaseURL = testInfo.project.use.baseURL;
  if (typeof configuredBaseURL === "string") return configuredBaseURL;
  const port = process.env.PLAYWRIGHT_PORT ?? "3020";
  return `http://127.0.0.1:${port}`;
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

export async function installDevAuthCookie(page: Page, testInfo: TestInfo) {
  if (!devAuthReady || !devAuthSecret) return;
  await page.context().addCookies(
    getCookieUrls(readBaseURL(testInfo)).map((url) => ({
      name: "archestimator-dev-auth-bypass",
      value: devAuthSecret,
      url,
      httpOnly: true,
      sameSite: "Lax" as const,
      expires: Math.floor(Date.now() / 1000) + 60 * 60,
    })),
  );
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase admin test client is not configured.");
  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function getDevAuthUserId() {
  const email = process.env.ARCHESTIMATOR_DEV_AUTH_EMAIL?.trim().toLowerCase();
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
  if (!membership?.workspace_id) throw new Error("Dev auth user has no workspace membership for Publisher e2e.");
  return membership.workspace_id;
}

function createFixtureSnapshot({
  estimateId,
  estimateName,
  now,
  projectId,
  projectName,
  sheetCode,
}: {
  estimateId: string;
  estimateName: string;
  now: string;
  projectId: string;
  projectName: string;
  sheetCode: string;
}): ProjectPublicationSnapshot {
  return {
    schemaVersion: 1.3,
    generatedAt: now,
    project: {
      id: projectId,
      name: projectName,
      projectCode: "PUB-E2E",
      clientName: "Publisher E2E Client",
      location: "E2E Fixture",
      locationVisibility: "locality",
      currencyCode: "PHP",
      coverImageUrl: null,
    },
    estimateCount: 1,
    rowCount: 0,
    totalCost: 0,
    estimates: [
      {
        id: estimateId,
        name: estimateName,
        sheetCode,
        updatedAt: now,
        rowCount: 0,
        totalCost: 0,
        rows: [],
        treeNodes: [],
        tabs: [],
      },
    ],
  };
}

export async function createPublisherFixture(source: PublisherFixtureSource): Promise<PublisherE2EFixture> {
  const admin = createAdminClient();
  const userId = await getDevAuthUserId();
  const workspaceId = await getFixtureWorkspaceId(userId);
  const projectId = randomUUID();
  const estimateId = randomUUID();
  const publicationId = randomUUID();
  const stamp = Date.now().toString(36);
  const projectName = `Publisher E2E ${stamp}`;
  const estimateName = `Publisher Access Sheet ${stamp}`;
  const sheetCode = `PUB-${stamp.slice(-6).toUpperCase()}`;
  const now = new Date().toISOString();
  const token = createPublicationToken();
  const snapshot = createFixtureSnapshot({ estimateId, estimateName, now, projectId, projectName, sheetCode });

  try {
    const { error: projectError } = await admin.from("projects").insert({
      id: projectId,
      workspace_id: workspaceId,
      name: projectName,
      client_name: "Publisher E2E Client",
      project_code: "PUB-E2E",
      location: "E2E Fixture",
      currency_code: "PHP",
      metadata: { e2e: true, source },
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
      name: estimateName,
      sheet_code: sheetCode,
      currency_code: "PHP",
      created_by: userId,
      metadata: { e2e: true, source },
      updated_at: now,
    });
    if (estimateError) throw estimateError;

    const { error: accessError } = await admin.from("estimate_sheet_access_settings").upsert(
      {
        estimate_id: estimateId,
        project_id: projectId,
        inherit_project_access: true,
        updated_by: userId,
      },
      { onConflict: "estimate_id" },
    );
    if (accessError) throw accessError;

    const { error: publicationError } = await admin.from("project_publications").insert({
      id: publicationId,
      workspace_id: workspaceId,
      project_id: projectId,
      token_hash: hashPublicationToken(token, readPublicationTokenHashSecret()),
      encrypted_token: encryptPublicationToken(token, readPublicationTokenEncryptionSecret()),
      password_hash: null,
      status: "published",
      snapshot_json: snapshot as unknown as Json,
      snapshot_version: 1,
      selected_estimate_ids: [estimateId],
      activity_target_labels_json: createSharedLinkTargetLabelsJson(snapshot as unknown as Json),
      location_visibility: "locality",
      published_by: userId,
      published_at: now,
    });
    if (publicationError) throw publicationError;
  } catch (error) {
    await deletePublisherFixture({ estimateId, projectId, publicationId, workspaceId } as PublisherE2EFixture);
    throw error;
  }

  return {
    estimateId,
    estimateName,
    oldClientLinkPath: `/share/${token}`,
    projectId,
    projectName,
    publicationId,
    userId,
    workspaceId,
  };
}

export async function deletePublisherFixture(fixture: PublisherE2EFixture | null) {
  if (!fixture) return;
  const admin = createAdminClient();
  const auditRows = await readFixtureAccountSecurityEvents(fixture);
  const auditIds = auditRows.map((row) => row.id);

  if (auditIds.length) {
    const { error } = await admin.from("account_security_events").delete().in("id", auditIds);
    if (error) throw error;
  }

  const deletes = [
    admin.from("collaboration_audit_events").delete().eq("project_id", fixture.projectId),
    admin.from("project_publications").delete().eq("project_id", fixture.projectId),
    admin.from("estimate_sheet_members").delete().eq("estimate_id", fixture.estimateId),
    admin.from("estimate_sheet_access_settings").delete().eq("estimate_id", fixture.estimateId),
    admin.from("estimates").delete().eq("id", fixture.estimateId),
    admin.from("projects").delete().eq("id", fixture.projectId),
  ];

  for (const operation of deletes) {
    const { error } = await operation;
    if (error) throw error;
  }
}

export async function readFixtureClientLinkPath(fixture: PublisherE2EFixture) {
  const { data, error } = await createAdminClient()
    .from("project_publications")
    .select("encrypted_token")
    .eq("id", fixture.publicationId)
    .single();

  if (error) throw error;
  return `/share/${decryptPublicationToken(data.encrypted_token, readPublicationTokenEncryptionSecret())}`;
}

export async function readFixtureAccountSecurityEvents(fixture: Pick<PublisherE2EFixture, "projectId" | "workspaceId">) {
  const { data, error } = await createAdminClient()
    .from("account_security_events")
    .select("id, metadata_json")
    .eq("workspace_id", fixture.workspaceId);

  if (error) throw error;
  return ((data ?? []) as AccountSecurityEventRow[]).filter((row) => {
    const metadata = row.metadata_json;
    return Boolean(metadata && typeof metadata === "object" && !Array.isArray(metadata) && metadata.project_id === fixture.projectId);
  });
}

export async function openPublisherFixtureDrawer(page: Page, fixture: PublisherE2EFixture) {
  await page.goto(`/workshop/publisher?project=${fixture.projectId}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Publisher" })).toBeVisible();

  const row = page.locator(`[data-publisher-roster-row="${fixture.projectId}"]`);
  await expect(row, "Publisher fixture row should appear in the filtered roster.").toBeVisible({ timeout: 20_000 });

  const manageButton = row.getByRole("button", { name: `Manage publication for ${fixture.projectName}` });
  const dialog = page.getByRole("dialog", { name: fixture.projectName });
  await expect(manageButton).toBeVisible();
  await expect(async () => {
    await manageButton.click();
    await expect(dialog).toBeVisible({ timeout: 2_500 });
  }).toPass({ timeout: 20_000 });

  return { dialog, row };
}

export async function expectDrawerTab(dialog: Locator, name: string) {
  await expect(dialog.getByRole("tab", { name })).toBeVisible();
}
