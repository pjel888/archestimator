import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  attachEstimateSnapshot,
  collectEstimateBrowserSnapshot,
  getEstimatePerformanceRouteConfig,
  openEstimateSheet,
  type EstimateBrowserSnapshot,
} from "./helpers/estimate-sheet-performance";

const routeConfig = getEstimatePerformanceRouteConfig();
const enabled = process.env.ESTIMATE_PERF_E2E === "1" && routeConfig !== null;

type ComponentSource = "library" | "project" | "express";

type InteropEvidence = Readonly<{
  schemaVersion: "estimate-sheet-interop-scenario.v1";
  scenarioId: string;
  slug: string;
  setup: readonly string[];
  actions: readonly string[];
  assertions: readonly string[];
  measurements: Readonly<Record<string, number | string | boolean>>;
  snapshot: EstimateBrowserSnapshot;
}>;

type InteropScenario = Readonly<{
  id: string;
  slug: string;
  run: (page: Page) => Promise<InteropEvidence>;
}>;

const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

function scenarioEvidence(
  scenarioId: string,
  slug: string,
  snapshot: EstimateBrowserSnapshot,
  input: Omit<InteropEvidence, "schemaVersion" | "scenarioId" | "slug" | "snapshot">,
): InteropEvidence {
  return {
    schemaVersion: "estimate-sheet-interop-scenario.v1",
    scenarioId,
    slug,
    snapshot,
    ...input,
  };
}

async function openScenarioSheet(page: Page): Promise<EstimateBrowserSnapshot> {
  const snapshot = await openEstimateSheet(page, routeConfig!);
  expect(snapshot.sheetVisible).toBe(true);
  expect(snapshot.treeReady).toBe(true);
  return snapshot;
}

function estimateRows(page: Page): Locator {
  return page.locator("tr[data-estimate-row-id]");
}

function rowForSource(page: Page, source: ComponentSource): Locator {
  return estimateRows(page).filter({ has: page.locator(`[data-component-source="${source}"]`) }).first();
}

function rowsWithVariant(page: Page, source: Exclude<ComponentSource, "express">): Locator {
  return estimateRows(page)
    .filter({ has: page.locator(`[data-component-source="${source}"]`) })
    .filter({ has: page.getByRole("button", { name: /^Change variant for /u }) });
}

function visibleVariantMenu(page: Page): Locator {
  return page.locator('[role="menu"]:visible').last();
}

async function openVariantMenu(page: Page, trigger: Locator): Promise<Locator> {
  await trigger.scrollIntoViewIfNeeded();
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await trigger.click();
  const menu = visibleVariantMenu(page);
  await expect(menu).toBeVisible();
  return menu;
}

async function rowWithSelectableVariant(page: Page, source: Exclude<ComponentSource, "express">): Promise<Locator> {
  const candidates = rowsWithVariant(page, source);
  for (let index = 0; index < await candidates.count(); index += 1) {
    const row = candidates.nth(index);
    const trigger = row.getByRole("button", { name: /^Change variant for /u });
    const menu = await openVariantMenu(page, trigger);
    if (await menu.getByRole("menuitem").count() > 1) {
      await page.keyboard.press("Escape");
      return row;
    }
    await page.keyboard.press("Escape");
  }
  throw new Error(`No ${source} row has a selectable alternate variant.`);
}

async function requireRowId(row: Locator): Promise<string> {
  await expect(row).toBeVisible();
  const rowId = await row.getAttribute("data-estimate-row-id");
  expect(rowId).toBeTruthy();
  return rowId!;
}

async function requireComponentLabel(row: Locator): Promise<string> {
  const shell = row.locator("[data-component-source]").first();
  await expect(shell).toBeVisible();
  const ariaLabel = await shell.getAttribute("aria-label");
  expect(ariaLabel).toMatch(/ estimate component$/u);
  return ariaLabel!.replace(/ (?:replaceable )?estimate component$/u, "");
}

async function waitForRowIdle(page: Page, rowId: string): Promise<Locator> {
  const row = page.locator(`tr[data-estimate-row-id="${rowId}"]`);
  await expect(row).toBeVisible();
  await expect(row).not.toHaveAttribute("aria-busy", "true");
  return row;
}

async function visibleRowIds(page: Page): Promise<string[]> {
  return estimateRows(page).evaluateAll((rows) => rows.flatMap((row) => row.getAttribute("data-estimate-row-id") ?? []));
}

async function waitForNewVisibleRow(page: Page, previousIds: ReadonlySet<string>): Promise<Locator> {
  await expect.poll(async () => (await visibleRowIds(page)).find((rowId) => !previousIds.has(rowId)) ?? null).not.toBeNull();
  const rowId = (await visibleRowIds(page)).find((candidate) => !previousIds.has(candidate));
  expect(rowId).toBeTruthy();
  return page.locator(`tr[data-estimate-row-id="${rowId}"]`);
}

async function insertLibraryRowFromCommandPalette(page: Page, componentName: string): Promise<Locator> {
  const beforeIds = new Set(await visibleRowIds(page));
  await page.keyboard.press("/");
  const palette = page.getByRole("dialog", { name: "Command palette" });
  await expect(palette).toBeVisible();
  await palette.getByRole("textbox", { name: "Command palette search" }).fill(componentName);
  await palette.getByRole("button", { name: new RegExp(componentName, "u") }).first().click();
  await expect(palette).toBeHidden();
  const trustReview = page.getByRole("dialog", { name: "Review source before inserting row" });
  await expect(trustReview).toBeVisible();
  await trustReview.getByRole("button", { name: "Continue with insert" }).click();
  await expect(trustReview).toBeHidden();
  return waitForNewVisibleRow(page, beforeIds);
}

async function openComponentEditor(page: Page, row: Locator): Promise<Locator> {
  await row.getByRole("button", { name: /^Edit component /u }).click();
  const dialog = page.getByRole("dialog", { name: "Edit Component" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("tablist", { name: "Edit component sections" })).toBeVisible();
  return dialog;
}

async function saveComponentEditor(page: Page, dialog: Locator, rowId: string): Promise<Locator> {
  await dialog.getByRole("button", { name: "Save Component" }).click();
  await expect(dialog).toBeHidden();
  return waitForRowIdle(page, rowId);
}

async function chooseDifferentVariant(page: Page, row: Locator): Promise<{ before: string; after: string }> {
  const trigger = row.getByRole("button", { name: /^Change variant for /u });
  await expect(trigger).toBeVisible();
  const before = (await trigger.getAttribute("title")) ?? (await trigger.textContent()) ?? "";
  const menu = await openVariantMenu(page, trigger);
  const options = menu.getByRole("menuitem");
  await expect(options).toHaveCount(2);
  const alternate = options.filter({ hasNot: page.locator('[data-action-menu-item-check="true"]') });
  await expect(alternate).toHaveCount(1);
  await expect(alternate).toBeEnabled();
  await alternate.click();
  const trustReview = page.getByRole("dialog", { name: "Review source before replacing row" });
  if (await trustReview.isVisible()) {
    await trustReview.getByRole("button", { name: "Continue with replace" }).click();
    await expect(trustReview).toBeHidden();
  }
  await expect.poll(async () => (await trigger.getAttribute("title")) ?? (await trigger.textContent()) ?? "").not.toBe(before);
  return { before, after: (await trigger.getAttribute("title")) ?? (await trigger.textContent()) ?? "" };
}

async function runCiQa01DuplicateNameCreate(page: Page): Promise<InteropEvidence> {
  const snapshot = await openScenarioSheet(page);
  await page.goto("/workshop/library/components?add=component", { waitUntil: "domcontentloaded" });
  const dialog = page.getByRole("dialog", { name: "Add Component" });
  await expect(dialog).toBeVisible();
  const componentName = "Performance duplicate component";
  const category = "Performance fixtures";
  const supplier = "Performance fixture supplier";
  await dialog.getByLabel("Name", { exact: true }).fill(componentName);
  await dialog.getByLabel("Unit cost", { exact: true }).fill("1");
  await dialog.getByLabel("Category", { exact: true }).fill(category);
  await page.getByRole("option", { name: `Add category \"${category}\"` }).click();
  await dialog.getByLabel("Supplier", { exact: true }).fill(supplier);
  await page.getByRole("option", { name: `Add supplier \"${supplier}\"` }).click();
  await dialog.getByRole("button", { name: "Open variants panel" }).click();
  const addVariant = dialog.getByRole("button", { name: "Add variant", exact: true }).last();
  await addVariant.scrollIntoViewIfNeeded();
  await addVariant.click();
  await dialog.getByLabel("Variant Name").last().fill("Performance alternate variant");
  await dialog.getByLabel("Variant unit cost").last().fill("2");
  await dialog.getByRole("button", { name: "Add Component", exact: true }).click();
  // Reload to obtain the persisted library item before exercising duplicate detection.
  await page.goto("/workshop/library/components?add=component", { waitUntil: "domcontentloaded" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Name", { exact: true }).fill(componentName);
  await dialog.getByLabel("Category", { exact: true }).fill(category);
  await dialog.getByLabel("Supplier", { exact: true }).fill(supplier);
  await dialog.getByLabel("Name", { exact: true }).blur();
  const duplicateWarning = dialog.getByText(/A component named .* already exists\./u);
  await expect(duplicateWarning).toBeVisible();
  await dialog.getByRole("button", { name: "Create anyway" }).click();
  await expect(duplicateWarning).toBeHidden();
  return scenarioEvidence("CI-QA-01", "01-duplicate-name-create", snapshot, {
    setup: ["authenticated estimate sheet", "empty performance fixture library", "library create surface"],
    actions: ["created a library component", "re-entered its exact identity in create mode", "acknowledged duplicate warning"],
    assertions: ["create mode displayed a duplicate warning for a persisted component", "Create anyway removed the duplicate gate"],
    measurements: { duplicateAcknowledged: true },
  });
}

async function runCiQa02InsertLibraryRow(page: Page): Promise<InteropEvidence> {
  await openScenarioSheet(page);
  const visibleRowsBefore = (await visibleRowIds(page)).length;
  const inserted = await insertLibraryRowFromCommandPalette(page, "Performance duplicate component");
  await expect(inserted.locator('[data-component-source="library"]')).toBeVisible();
  return scenarioEvidence("CI-QA-02", "02-insert-library-row", await collectEstimateBrowserSnapshot(page), {
    setup: ["authenticated estimate sheet", "selected estimate Area", "command palette library results"],
    actions: ["opened command palette", "inserted selected library result"],
    assertions: ["a new row identity appeared", "inserted row exposes library source identity"],
    measurements: { visibleRowsBefore, visibleRowsAfter: (await visibleRowIds(page)).length },
  });
}

async function runCiQa03EditLibraryRowLinkstate(page: Page): Promise<InteropEvidence> {
  const snapshot = await openScenarioSheet(page);
  const row = rowForSource(page, "library");
  const rowId = await requireRowId(row);
  const dialog = await openComponentEditor(page, row);
  await expect(dialog.getByText(/already exists\./u)).toHaveCount(0);
  const description = `Row override ${Date.now()}`;
  await dialog.getByLabel("Description", { exact: true }).fill(description);
  const savedRow = await saveComponentEditor(page, dialog, rowId);
  await expect(savedRow.locator('[data-component-source="library"]')).toBeVisible();
  return scenarioEvidence("CI-QA-03", "03-edit-library-row-linkstate", snapshot, {
    setup: ["library-linked estimate row", "row projection edit modal"],
    actions: ["changed row description", "saved row projection"],
    assertions: ["edit mode suppressed duplicate warning", "row identity and library source remained present"],
    measurements: { rowPreserved: true },
  });
}

async function runCiQa04InlineVariantPillLibrary(page: Page): Promise<InteropEvidence> {
  const snapshot = await openScenarioSheet(page);
  const row = await insertLibraryRowFromCommandPalette(page, "Performance duplicate component");
  const rowId = await requireRowId(row);
  const variant = await chooseDifferentVariant(page, row);
  const settled = await waitForRowIdle(page, rowId);
  await expect(settled.locator('[data-component-source="library"]')).toBeVisible();
  return scenarioEvidence("CI-QA-04", "04-inline-variant-pill-library", snapshot, {
    setup: ["library-linked row with multiple active variants"],
    actions: ["selected a non-current inline variant"],
    assertions: ["variant label changed", "row remained library-linked after replacement"],
    measurements: { variantChanged: variant.before !== variant.after },
  });
}

async function runCiQa05EditThumbnailLibraryRow(page: Page): Promise<InteropEvidence> {
  const snapshot = await openScenarioSheet(page);
  const row = rowForSource(page, "library");
  const rowId = await requireRowId(row);
  const dialog = await openComponentEditor(page, row);
  const uploadRequest = page.waitForRequest((request) => request.method() === "POST" && request.url().includes("/api/projects/images"));
  await dialog.getByLabel("Upload thumbnail").setInputFiles({ name: "interop-library.png", mimeType: "image/png", buffer: ONE_PIXEL_PNG });
  const request = await uploadRequest;
  expect(new URL(request.url()).pathname).toBe("/api/projects/images");
  await expect(dialog.getByRole("button", { name: "Save Component" })).toBeEnabled();
  await saveComponentEditor(page, dialog, rowId);
  return scenarioEvidence("CI-QA-05", "05-edit-thumbnail-library-row", snapshot, {
    setup: ["library-linked row in estimate-mounted edit mode"],
    actions: ["uploaded a one-pixel PNG", "saved row projection"],
    assertions: ["upload used project image broker", "edited row remained available"],
    measurements: { projectImageBroker: true },
  });
}

async function runCiQa05bEditComponentDrawerLibraryMaster(page: Page): Promise<InteropEvidence> {
  const snapshot = await openScenarioSheet(page);
  await page.goto("/workshop/library/components", { waitUntil: "domcontentloaded" });
  const card = page.locator("[data-component-catalogue-card-id]").first();
  await expect(card).toBeVisible();
  await card.locator("[data-component-card-inspect]").click();
  await page.getByRole("button", { name: "Edit component", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "Edit component" });
  await expect(drawer).toBeVisible();
  const description = drawer.getByLabel("Description", { exact: true });
  await description.fill(`Library master ${Date.now()}`);
  await drawer.getByRole("button", { name: "Save changes" }).click();
  await expect(drawer).toBeHidden();
  await expect(card).toBeVisible();
  return scenarioEvidence("CI-QA-05b", "05b-edit-component-drawer-library-master", snapshot, {
    setup: ["component library workspace", "selected library master inspector"],
    actions: ["opened EditComponentDrawer", "changed and saved master description"],
    assertions: ["master drawer closed after save", "library card remained in catalogue"],
    measurements: { masterSaveCompleted: true },
  });
}

async function runCiQa05cDetachLibraryRow(page: Page): Promise<InteropEvidence> {
  const snapshot = await openScenarioSheet(page);
  const row = rowForSource(page, "library");
  const rowId = await requireRowId(row);
  await row.getByRole("button", { name: / a Project Component$/u }).click();
  const confirmation = page.getByRole("dialog", { name: "Make Project Component" });
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole("button", { name: "Make Project Component" }).click();
  const detached = await waitForRowIdle(page, rowId);
  await expect(detached.locator('[data-component-source="project"]')).toBeVisible();
  return scenarioEvidence("CI-QA-05c", "05c-detach-library-row", snapshot, {
    setup: ["library-linked estimate row"],
    actions: ["confirmed Make Project Component detach action"],
    assertions: ["row id was preserved", "source changed from library to project"],
    measurements: { rowPreserved: true, detached: true },
  });
}

async function runCiQa06EditProjectComponentFanout(page: Page): Promise<InteropEvidence> {
  const snapshot = await openScenarioSheet(page);
  const row = rowForSource(page, "project");
  const rowId = await requireRowId(row);
  const nextName = `Project fanout ${Date.now()}`;
  const dialog = await openComponentEditor(page, row);
  await expect(dialog.getByText(/already exists\./u)).toHaveCount(0);
  await dialog.getByLabel("Name", { exact: true }).fill(nextName);
  await saveComponentEditor(page, dialog, rowId);
  await expect.poll(() => page.locator('[data-component-source="project"]').filter({ hasText: nextName }).count()).toBeGreaterThan(1);
  return scenarioEvidence("CI-QA-06", "06-edit-project-component-fanout", snapshot, {
    setup: ["project component with multiple visible instances"],
    actions: ["renamed project component in edit modal", "saved shared projection"],
    assertions: ["duplicate warning stayed absent", "new name appeared on more than one project instance"],
    measurements: { matchingInstances: await page.locator('[data-component-source="project"]').filter({ hasText: nextName }).count() },
  });
}

async function runCiQa07IdenticalNameProject(page: Page): Promise<InteropEvidence> {
  const snapshot = await openScenarioSheet(page);
  const projectRows = estimateRows(page).filter({ has: page.locator('[data-component-source="project"]') });
  await expect(projectRows.nth(1)).toBeVisible();
  const firstId = await requireRowId(projectRows.first());
  const secondId = await requireRowId(projectRows.nth(1));
  const duplicateName = await requireComponentLabel(projectRows.nth(1));
  const dialog = await openComponentEditor(page, projectRows.first());
  await dialog.getByLabel("Name", { exact: true }).fill(duplicateName);
  await dialog.getByLabel("Name", { exact: true }).blur();
  await expect(dialog.getByText(/already exists\./u)).toHaveCount(0);
  await dialog.getByRole("button", { name: "Discard" }).click();
  expect(firstId).not.toBe(secondId);
  return scenarioEvidence("CI-QA-07", "07-identical-name-project", snapshot, {
    setup: ["two UUID-distinct project component rows"],
    actions: ["entered the second component name into the first edit modal"],
    assertions: ["row ids differ", "edit mode did not show duplicate-name warning"],
    measurements: { distinctRowIds: firstId !== secondId },
  });
}

async function runCiQa08ThumbnailFanoutProject(page: Page): Promise<InteropEvidence> {
  const snapshot = await openScenarioSheet(page);
  const row = rowForSource(page, "project");
  const rowId = await requireRowId(row);
  const dialog = await openComponentEditor(page, row);
  const uploadRequest = page.waitForRequest((request) => request.method() === "POST" && request.url().includes("/api/projects/images"));
  await dialog.getByLabel("Upload thumbnail").setInputFiles({ name: "interop-project.png", mimeType: "image/png", buffer: ONE_PIXEL_PNG });
  const request = await uploadRequest;
  expect(new URL(request.url()).pathname).toBe("/api/projects/images");
  await saveComponentEditor(page, dialog, rowId);
  const projectImages = page.locator('[data-component-source="project"] img');
  await expect(projectImages.first()).toBeVisible();
  expect(await projectImages.count()).toBeGreaterThan(1);
  return scenarioEvidence("CI-QA-08", "08-thumbnail-fanout-project", snapshot, {
    setup: ["shared project component instances"],
    actions: ["uploaded project thumbnail", "saved project component"],
    assertions: ["project image broker received upload", "multiple project instances render thumbnails"],
    measurements: { matchingImages: await projectImages.count() },
  });
}

async function runCiQa09VariantPersistenceProject(page: Page): Promise<InteropEvidence> {
  const snapshot = await openScenarioSheet(page);
  const row = rowForSource(page, "project");
  const rowId = await requireRowId(row);
  const dialog = await openComponentEditor(page, row);
  await dialog.getByRole("button", { name: "Open variants panel" }).click();
  const addVariant = dialog.getByRole("button", { name: "Add variant", exact: true }).last();
  await addVariant.scrollIntoViewIfNeeded();
  await addVariant.click();
  const variantName = `Interop V${Date.now()}`;
  await dialog.getByLabel("Variant Name").last().fill(variantName);
  await dialog.getByLabel("Variant unit cost").last().fill("123.45");
  await saveComponentEditor(page, dialog, rowId);
  const savedRow = await waitForRowIdle(page, rowId);
  await expect(savedRow.getByRole("button", { name: /^Change variant for /u })).toBeVisible();
  return scenarioEvidence("CI-QA-09", "09-variant-persistence-project", snapshot, {
    setup: ["project component edit modal", "variant management drawer"],
    actions: ["added named non-default variant with cost", "saved project component"],
    assertions: ["save completed", "project row retained inline variant selector"],
    measurements: { variantCreated: true },
  });
}

async function runCiQa10InlineVariantPillProject(page: Page): Promise<InteropEvidence> {
  const snapshot = await openScenarioSheet(page);
  const row = await rowWithSelectableVariant(page, "project");
  const rowId = await requireRowId(row);
  const variant = await chooseDifferentVariant(page, row);
  const settled = await waitForRowIdle(page, rowId);
  await expect(settled.locator('[data-component-source="project"]')).toBeVisible();
  return scenarioEvidence("CI-QA-10", "10-inline-variant-pill-project", snapshot, {
    setup: ["project row with multiple variants"],
    actions: ["selected a different inline project variant"],
    assertions: ["variant label changed", "row remained project-scoped after update"],
    measurements: { variantChanged: variant.before !== variant.after },
  });
}

async function runCiQa11ImageUrlNormalization(page: Page): Promise<InteropEvidence> {
  const snapshot = await openScenarioSheet(page);
  const row = estimateRows(page).filter({ has: page.locator("[data-component-source] img") }).first();
  await requireRowId(row);
  const dialog = await openComponentEditor(page, row);
  const preview = dialog.getByAltText("Component thumbnail preview").first();
  await expect(preview).toBeVisible();
  const src = await preview.getAttribute("src");
  expect(src).toMatch(/\/api\/(?:projects|component-library)\/images\?path=/u);
  await dialog.getByRole("button", { name: "Discard" }).click();
  return scenarioEvidence("CI-QA-11", "11-image-url-normalization", snapshot, {
    setup: ["component row with stored thumbnail path"],
    actions: ["opened component edit preview"],
    assertions: ["thumbnail URL resolves through an approved image broker route"],
    measurements: { brokeredImage: true },
  });
}

async function runCiQa12BlankRowExpressInit(page: Page): Promise<InteropEvidence> {
  const snapshot = await openScenarioSheet(page);
  const beforeIds = new Set(await visibleRowIds(page));
  await page.getByRole("button", { name: /^Add blank estimate row to /u }).first().click();
  const row = await waitForNewVisibleRow(page, beforeIds);
  const rowId = await requireRowId(row);
  await expect(row.locator('[data-component-source="express"]')).toBeVisible();
  const name = `Express ${Date.now()}`;
  await row.locator('[data-express-field="name"]').fill(name);
  await row.locator('[data-express-field="name"]').blur();
  await waitForRowIdle(page, rowId);
  return scenarioEvidence("CI-QA-12", "12-blank-row-express-init", snapshot, {
    setup: ["editable estimate Area"],
    actions: ["inserted blank row", "entered and committed inline component name"],
    assertions: ["new row initialized as express source", "row remained present after commit"],
    measurements: { visibleRowsBefore: beforeIds.size, visibleRowsAfter: (await visibleRowIds(page)).length },
  });
}

async function runCiQa13PromoteToLibrary(page: Page): Promise<InteropEvidence> {
  const snapshot = await openScenarioSheet(page);
  let row = rowForSource(page, "express");
  if (await row.count() === 0) {
    await page.getByRole("button", { name: /^Add blank estimate row to /u }).first().click();
    row = estimateRows(page).last();
    await row.locator('[data-express-field="name"]').fill(`Promote ${Date.now()}`);
    await row.locator('[data-express-field="name"]').blur();
  }
  const rowId = await requireRowId(row);
  await row.getByRole("button", { name: /^Promote .* to library$/u }).click();
  const promoted = await waitForRowIdle(page, rowId);
  await expect(promoted.locator('[data-component-source="library"]')).toBeVisible();
  return scenarioEvidence("CI-QA-13", "13-promote-to-library", snapshot, {
    setup: ["express project row eligible for promotion"],
    actions: ["invoked Promote to library"],
    assertions: ["row id remained stable", "source linkage changed to library"],
    measurements: { promoted: true },
  });
}

async function runCiQa14StressFanout5000Rows(page: Page): Promise<InteropEvidence> {
  const snapshot = await openScenarioSheet(page);
  expect(snapshot.mountedRows).toBeLessThanOrEqual(120);
  const row = rowForSource(page, "project");
  const rowId = await requireRowId(row);
  const dialog = await openComponentEditor(page, row);
  await dialog.getByLabel("Description", { exact: true }).fill(`Stress fanout ${Date.now()}`);
  const startedAt = performance.now();
  await saveComponentEditor(page, dialog, rowId);
  const durationMs = performance.now() - startedAt;
  expect(durationMs).toBeLessThan(1_000);
  return scenarioEvidence("CI-QA-14", "14-stress-fanout-5000-rows", snapshot, {
    setup: ["limit fixture", "bounded virtualized row window", "shared project component"],
    actions: ["saved project component edit under limit fixture"],
    assertions: ["mounted rows stayed within 120", "fan-out save settled within one second"],
    measurements: { mountedRows: snapshot.mountedRows, durationMs },
  });
}

async function runCiQa15StressModalOpen(page: Page): Promise<InteropEvidence> {
  const snapshot = await openScenarioSheet(page);
  const row = rowForSource(page, "project");
  const startedAt = performance.now();
  const dialog = await openComponentEditor(page, row);
  const durationMs = performance.now() - startedAt;
  expect(durationMs).toBeLessThan(1_000);
  await expect(dialog.getByLabel("Name", { exact: true })).toBeFocused();
  await dialog.getByRole("button", { name: "Discard" }).click();
  return scenarioEvidence("CI-QA-15", "15-stress-modal-open", snapshot, {
    setup: ["limit fixture", "project component row"],
    actions: ["opened edit modal and measured visible readiness"],
    assertions: ["modal opened within one second", "Name field received initial focus"],
    measurements: { durationMs },
  });
}

async function runCiQa16StressInlineEdit(page: Page): Promise<InteropEvidence> {
  const snapshot = await openScenarioSheet(page);
  const row = rowForSource(page, "express");
  const rowId = await requireRowId(row);
  const input = row.locator('[data-express-field="unitCost"]');
  await expect(input).toBeVisible();
  const startedAt = performance.now();
  await input.fill("321.45");
  await input.blur();
  await waitForRowIdle(page, rowId);
  const durationMs = performance.now() - startedAt;
  expect(durationMs).toBeLessThan(1_000);
  return scenarioEvidence("CI-QA-16", "16-stress-inline-edit", snapshot, {
    setup: ["limit fixture", "inline express component cost field"],
    actions: ["changed unit cost and committed blur mutation"],
    assertions: ["row settled without replacement", "inline mutation completed within one second"],
    measurements: { durationMs },
  });
}

async function runCiQa17DeleteRowRestore(page: Page): Promise<InteropEvidence> {
  const snapshot = await openScenarioSheet(page);
  const row = estimateRows(page).first();
  const rowId = await requireRowId(row);
  const label = await requireComponentLabel(row);
  await row.getByRole("button", { name: `Delete row ${label}` }).click();
  await expect(page.locator(`tr[data-estimate-row-id="${rowId}"]`)).toHaveCount(0);
  await page.getByRole("button", { name: "Activity", exact: true }).click();
  const history = page.getByRole("dialog", { name: "Activity History" });
  await expect(history).toBeVisible();
  await history.getByRole("button", { name: "Restore deleted row" }).first().click();
  await expect(page.locator(`tr[data-estimate-row-id="${rowId}"]`)).toBeVisible();
  await expect(history.getByText(/1 row restored\./u)).toBeVisible();
  return scenarioEvidence("CI-QA-17", "17-delete-row-restore", snapshot, {
    setup: ["persisted estimate row", "activity history restore capability"],
    actions: ["deleted row", "restored the delete event from Activity History"],
    assertions: ["row disappeared after delete", "same row id returned after restore"],
    measurements: { restoredSameRowId: true },
  });
}

const INTEROP_SCENARIOS = [
  { id: "CI-QA-01", slug: "01-duplicate-name-create", run: runCiQa01DuplicateNameCreate },
  { id: "CI-QA-02", slug: "02-insert-library-row", run: runCiQa02InsertLibraryRow },
  { id: "CI-QA-03", slug: "03-edit-library-row-linkstate", run: runCiQa03EditLibraryRowLinkstate },
  { id: "CI-QA-04", slug: "04-inline-variant-pill-library", run: runCiQa04InlineVariantPillLibrary },
  { id: "CI-QA-05", slug: "05-edit-thumbnail-library-row", run: runCiQa05EditThumbnailLibraryRow },
  { id: "CI-QA-05b", slug: "05b-edit-component-drawer-library-master", run: runCiQa05bEditComponentDrawerLibraryMaster },
  { id: "CI-QA-05c", slug: "05c-detach-library-row", run: runCiQa05cDetachLibraryRow },
  { id: "CI-QA-06", slug: "06-edit-project-component-fanout", run: runCiQa06EditProjectComponentFanout },
  { id: "CI-QA-07", slug: "07-identical-name-project", run: runCiQa07IdenticalNameProject },
  { id: "CI-QA-08", slug: "08-thumbnail-fanout-project", run: runCiQa08ThumbnailFanoutProject },
  { id: "CI-QA-09", slug: "09-variant-persistence-project", run: runCiQa09VariantPersistenceProject },
  { id: "CI-QA-10", slug: "10-inline-variant-pill-project", run: runCiQa10InlineVariantPillProject },
  { id: "CI-QA-11", slug: "11-image-url-normalization", run: runCiQa11ImageUrlNormalization },
  { id: "CI-QA-12", slug: "12-blank-row-express-init", run: runCiQa12BlankRowExpressInit },
  { id: "CI-QA-13", slug: "13-promote-to-library", run: runCiQa13PromoteToLibrary },
  { id: "CI-QA-14", slug: "14-stress-fanout-5000-rows", run: runCiQa14StressFanout5000Rows },
  { id: "CI-QA-15", slug: "15-stress-modal-open", run: runCiQa15StressModalOpen },
  { id: "CI-QA-16", slug: "16-stress-inline-edit", run: runCiQa16StressInlineEdit },
  { id: "CI-QA-17", slug: "17-delete-row-restore", run: runCiQa17DeleteRowRestore },
] as const satisfies readonly InteropScenario[];

test.describe("estimate-sheet component interoperability", () => {
  test.skip(!enabled, "Set ESTIMATE_PERF_E2E=1 with authenticated estimate route IDs for interop proof");
  test.describe.configure({ mode: "serial", retries: 0 });

  for (const scenario of INTEROP_SCENARIOS) {
    test(`${scenario.id} ${scenario.slug}`, async ({ page }, testInfo) => {
      expect(testInfo.retry).toBe(0);
      const evidence = await scenario.run(page);
      expect(evidence.scenarioId).toBe(scenario.id);
      expect(evidence.slug).toBe(scenario.slug);
      expect(evidence.actions.length).toBeGreaterThan(0);
      expect(evidence.assertions.length).toBeGreaterThan(0);
      await attachEstimateSnapshot(testInfo, `estimate-sheet-interop-${scenario.slug}.json`, evidence);
    });
  }
});
