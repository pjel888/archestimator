import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import ExcelJS from "exceljs";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const projectId = "22222222-2222-4222-8222-222222222222";
const linkedLibraryItemId = "44444444-4444-4444-8444-444444444441";

const unlinkSmokeEnabled = process.env.ARCHESTIMATOR_E2E_UNLINK_SMOKE === "1";
const devAuthEnabled = process.env.ARCHESTIMATOR_DEV_AUTH_BYPASS === "1";
const artifactDir = process.env.ARCHESTIMATOR_UNLINK_SMOKE_DIR;

type LibraryItemSnapshot = {
  id: string;
  name: string;
  description: string;
  supplier: string | null;
  unit: string;
  unit_cost: number;
  misc_cost: number;
  category: string;
  current_version_number: number | null;
  active_price_option_id: string | null;
};

type UnlinkFixture = {
  estimateId: string;
  groupNodeId: string;
  areaNodeId: string;
  rowItemId: string;
  material: string;
  originalQuantity: number;
};

function hasPrerequisites() {
  return Boolean(
    unlinkSmokeEnabled &&
      devAuthEnabled &&
      process.env.ARCHESTIMATOR_DEV_AUTH_EMAIL &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
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

async function getDevAuthUserId() {
  const email = process.env.ARCHESTIMATOR_DEV_AUTH_EMAIL;
  if (!email) throw new Error("ARCHESTIMATOR_DEV_AUTH_EMAIL is required.");
  const { data, error } = await createAdminClient().auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  const user = data.users.find((candidate) => candidate.email === email);
  if (!user) throw new Error(`Could not find dev auth user ${email}.`);
  return user.id;
}

async function getLibraryItemSnapshot(): Promise<LibraryItemSnapshot> {
  const { data, error } = await createAdminClient()
    .from("cost_library_items")
    .select("id, name, description, supplier, unit, unit_cost, misc_cost, category, current_version_number, active_price_option_id")
    .eq("id", linkedLibraryItemId)
    .single();
  if (error) throw error;
  return data as LibraryItemSnapshot;
}

async function createLinkedRowFixture(): Promise<UnlinkFixture> {
  const admin = createAdminClient();
  const [userId, libraryItem] = await Promise.all([getDevAuthUserId(), getLibraryItemSnapshot()]);
  const estimateId = randomUUID();
  const groupNodeId = randomUUID();
  const areaNodeId = randomUUID();
  const rowItemId = randomUUID();
  const originalQuantity = 4;

  try {
    const { error: estimateInsertError } = await admin.from("estimates").insert({
      id: estimateId,
      project_id: projectId,
      name: `E2E Project Specific ${estimateId.slice(0, 8)}`,
      sheet_code: `UNLINK-${Date.now().toString(36)}-${estimateId.slice(0, 8)}`,
      currency_code: "PHP",
      created_by: userId,
      metadata: { e2e: true, source: "workshop-project-specific-unlink-smoke" },
    });
    if (estimateInsertError) throw estimateInsertError;

    const { error: nodesInsertError } = await admin.from("estimate_nodes").insert([
      {
        id: groupNodeId,
        estimate_id: estimateId,
        parent_id: null,
        kind: "group",
        name: "E2E Proof Group",
        sort_order: 10,
        metadata: { e2e: true },
      },
      {
        id: areaNodeId,
        estimate_id: estimateId,
        parent_id: groupNodeId,
        kind: "area",
        name: "E2E Proof Area",
        sort_order: 10,
        metadata: { e2e: true },
      },
    ]);
    if (nodesInsertError) throw nodesInsertError;

    const { error: rowInsertError } = await admin.from("estimate_row_items").insert({
      id: rowItemId,
      estimate_id: estimateId,
      node_id: areaNodeId,
      sort_order: 10,
      source_library_item_id: libraryItem.id,
      source_snapshot: {
        sourceLibraryItemId: libraryItem.id,
        material: libraryItem.name,
        supplier: libraryItem.supplier,
        unit: libraryItem.unit,
        unitCost: libraryItem.unit_cost,
        miscCost: libraryItem.misc_cost,
        category: libraryItem.category,
        componentVersionNumber: libraryItem.current_version_number,
      },
      material: libraryItem.name,
      description: libraryItem.description,
      supplier: libraryItem.supplier,
      unit: libraryItem.unit,
      quantity: originalQuantity,
      unit_cost: libraryItem.unit_cost,
      contingency_percentage: 0,
      misc_cost: libraryItem.misc_cost,
      discipline: "Architectural Works",
      designation: "E2E unlink proof",
      link_state: "linked-clean",
      metadata: { e2e: true, source: "workshop-project-specific-unlink-smoke" },
      row_revision: 1,
    });
    if (rowInsertError) throw rowInsertError;
  } catch (error) {
    await admin.from("estimates").delete().eq("id", estimateId);
    throw error;
  }

  return {
    estimateId,
    groupNodeId,
    areaNodeId,
    rowItemId,
    material: libraryItem.name,
    originalQuantity,
  };
}

async function deleteLinkedRowFixture(fixture: UnlinkFixture | null) {
  if (!fixture) return;
  const admin = createAdminClient();
  const { error } = await admin.from("estimates").delete().eq("id", fixture.estimateId);
  if (error) throw error;

  const [
    { count: estimateCount, error: estimateError },
    { count: nodeCount, error: nodeError },
    { count: rowCount, error: rowError },
    { count: eventCount, error: eventError },
  ] = await Promise.all([
    admin.from("estimates").select("id", { count: "exact", head: true }).eq("id", fixture.estimateId),
    admin.from("estimate_nodes").select("id", { count: "exact", head: true }).eq("estimate_id", fixture.estimateId),
    admin.from("estimate_row_items").select("id", { count: "exact", head: true }).eq("estimate_id", fixture.estimateId),
    admin.from("estimate_sheet_events").select("id", { count: "exact", head: true }).eq("estimate_id", fixture.estimateId),
  ]);
  if (estimateError) throw estimateError;
  if (nodeError) throw nodeError;
  if (rowError) throw rowError;
  if (eventError) throw eventError;
  if ((estimateCount ?? 0) + (nodeCount ?? 0) + (rowCount ?? 0) + (eventCount ?? 0) > 0) {
    throw new Error(`Project-specific unlink fixture cleanup left residue for estimate ${fixture.estimateId}.`);
  }
}

async function getFixtureRow(fixture: UnlinkFixture) {
  const { data, error } = await createAdminClient()
    .from("estimate_row_items")
    .select("id, source_library_item_id, source_snapshot, quantity, row_revision, link_state")
    .eq("id", fixture.rowItemId)
    .single();
  if (error) throw error;
  return data;
}

async function getRowUnlinkedEventCount(fixture: UnlinkFixture) {
  const { count, error } = await createAdminClient()
    .from("estimate_sheet_events")
    .select("id", { count: "exact", head: true })
    .eq("estimate_id", fixture.estimateId)
    .eq("target_row_id", fixture.rowItemId)
    .eq("event_type", "row_unlinked");
  if (error) throw error;
  return count ?? 0;
}

async function openFixtureEstimate(page: Page, fixture: UnlinkFixture) {
  await page.goto(`/workshop/projects/${projectId}/estimates/${fixture.areaNodeId}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator(`[data-estimate-tree-node-id="${fixture.areaNodeId}"]`).first()).toBeVisible();
  await expect(page.getByLabel(`${fixture.material} replaceable estimate component`)).toBeVisible();
}

async function readExportRows(page: Page, fixture: UnlinkFixture) {
  const response = await page.request.get(`/api/projects/${projectId}/estimates/${fixture.estimateId}/export/proposal.xlsx`);
  expect(response.ok()).toBe(true);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await response.body());
  const values: string[] = [];
  workbook.eachSheet((worksheet) => {
    worksheet.eachRow((row) => {
      values.push(
        row.values
          .toString()
          .replace(/\s+/g, " ")
          .trim(),
      );
    });
  });
  return values;
}

async function captureProof(page: Page, testInfo: TestInfo, name: string, proof: unknown) {
  const screenshot = `${name}.png`;
  const body = await page.screenshot({ fullPage: true });

  if (artifactDir) {
    mkdirSync(artifactDir, { recursive: true });
    await page.screenshot({ fullPage: true, path: join(artifactDir, screenshot) });
    writeFileSync(join(artifactDir, `${name}.json`), JSON.stringify(proof, null, 2));
  }

  await testInfo.attach(screenshot, {
    contentType: "image/png",
    body,
  });
}

test.describe("workshop project-specific unlink smoke", () => {
  test.setTimeout(90_000);
  test.skip(!hasPrerequisites(), "Requires ARCHESTIMATOR_E2E_UNLINK_SMOKE=1, dev auth, and service-role Supabase env.");

  test("detaches a linked row, edits it, preserves the library item, exports, and cleans up", async ({ page }, testInfo) => {
    let fixture: UnlinkFixture | null = null;
    try {
      const beforeLibraryItem = await getLibraryItemSnapshot();
      fixture = await createLinkedRowFixture();
      const editedQuantity = fixture.originalQuantity + 3;

      await openFixtureEstimate(page, fixture);
      await page.getByRole("button", { name: `Make ${fixture.material} project-specific` }).click();
      const dialog = page.getByRole("dialog", { name: "Make component project-specific" });
      await expect(dialog).toBeVisible();
      await dialog.getByRole("button", { name: "Make project-specific" }).click();

      await expect(page.getByText("Project-specific").first()).toBeVisible();
      await expect
        .poll(async () => getFixtureRow(fixture!), { timeout: 20_000 })
        .toMatchObject({
          source_library_item_id: null,
          link_state: "detached",
          row_revision: 2,
        });
      await expect.poll(async () => getRowUnlinkedEventCount(fixture!), { timeout: 10_000 }).toBe(1);

      const quantityInput = page.getByLabel(`${fixture.material} quantity`);
      await quantityInput.fill(String(editedQuantity));
      await quantityInput.blur();
      await expect
        .poll(async () => getFixtureRow(fixture!), { timeout: 20_000 })
        .toMatchObject({
          source_library_item_id: null,
          link_state: "detached",
          quantity: editedQuantity,
          row_revision: 3,
        });

      const afterLibraryItem = await getLibraryItemSnapshot();
      expect(afterLibraryItem).toEqual(beforeLibraryItem);

      const exportRows = await readExportRows(page, fixture);
      expect(exportRows.some((row) => row.includes(fixture!.material))).toBe(true);
      expect(exportRows.some((row) => row.includes(String(editedQuantity)))).toBe(true);

      const detachedRow = await getFixtureRow(fixture);
      await captureProof(page, testInfo, "project-specific-unlink-local-smoke-2026-06-02", {
        route: `/workshop/projects/${projectId}/estimates/${fixture.areaNodeId}`,
        material: fixture.material,
        sourceLibraryItemId: linkedLibraryItemId,
        beforeLibraryItem,
        afterLibraryItem,
        detachedRow,
        rowUnlinkedEventCount: await getRowUnlinkedEventCount(fixture),
        exportContainsMaterial: exportRows.some((row) => row.includes(fixture!.material)),
        exportContainsEditedQuantity: exportRows.some((row) => row.includes(String(editedQuantity))),
        cleanup: "Estimate fixture deletion and residue verification run in finally block.",
        capturedAt: new Date().toISOString(),
      });
    } finally {
      await deleteLinkedRowFixture(fixture);
    }
  });
});
