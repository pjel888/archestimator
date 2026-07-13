import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { chromium } from "@playwright/test";

const baseUrl = (process.env.ADD_COMPONENT_CAPTURE_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const bypassSecret = process.env.ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET?.trim();
const outputDir = resolve(process.env.ADD_COMPONENT_CAPTURE_DIR || ".design-shots/add-component-modal");

if (!bypassSecret) throw new Error("ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET is required for local modal capture.");

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const viewport = { width: 2048, height: 1152 };
const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
await context.addCookies([{
  name: "archestimator-dev-auth-bypass",
  value: bypassSecret,
  url: baseUrl,
  httpOnly: false,
  secure: false,
  sameSite: "Lax",
}]);

const page = await context.newPage();
const consoleErrors: string[] = [];
const pageErrors: string[] = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => pageErrors.push(error.message));

await page.goto(`${baseUrl}/workshop/library`, { waitUntil: "domcontentloaded", timeout: 90_000 });
console.log(JSON.stringify({ stage: "route", url: page.url() }));
await page.screenshot({ path: resolve(outputDir, "00-route.png") });
await page.getByRole("tab", { name: "Components" }).click();
await page.locator('[data-component-library-workspace="true"]').waitFor({ state: "visible", timeout: 30_000 });
await page.getByRole("button", { name: /^Add component$/i }).first().click();
await page.getByRole("heading", { name: "Add Component" }).waitFor({ state: "visible", timeout: 30_000 });
await page.getByRole("textbox", { name: "Unit cost", exact: true }).fill("68.50");
const baseCostVisibleAfterEntry = await page.locator('section[aria-label="Cost fields"]').isVisible();

const baseScreenshot = resolve(outputDir, "01-base.png");
await page.screenshot({ path: baseScreenshot });

const baseOrder = await page.locator('main[aria-label="Quick add component"] > div > section').evaluateAll((sections) => (
  sections.map((section) => section.getAttribute("aria-label"))
));

await page.getByRole("button", { name: "Open variants panel" }).click();
const manager = page.locator('[aria-label="Variant manager"]');
await manager.waitFor({ state: "visible", timeout: 30_000 });
await manager.getByRole("button", { name: "Add variant" }).click();
await page.locator('[aria-label="Variant editor"]').waitFor({ state: "visible", timeout: 30_000 });
await page.getByRole("textbox", { name: "Name", exact: true }).fill("Deformed Steel Bar Grade 60");
await page.getByRole("textbox", { name: "Description", exact: true }).fill("Grade 60 deformed steel reinforcing bar, 12mm nominal diameter, 6m commercial length.");
await page.getByRole("combobox", { name: "Category" }).fill("Reinforcement");
await page.getByRole("combobox", { name: "Supplier" }).fill("SteelAsia Trading Corp.");
await page.getByRole("combobox", { name: "Brand" }).fill("SteelAsia");
await page.keyboard.press("Escape");
await page.getByRole("textbox", { name: "Variant Name" }).fill("12mm Bar");
await page.getByRole("textbox", { name: "Variant Description" }).fill("Grade 60 deformed steel reinforcing bar, 12mm nominal diameter, 6m commercial length.");
await page.getByRole("textbox", { name: "SKU / Reference" }).fill("DB-12-G60");
const variantUnit = page.getByRole("combobox", { name: "Variant unit" });
await variantUnit.fill("box");
await variantUnit.press("Enter");
await page.getByRole("textbox", { name: "Equivalent quantity" }).fill("12");
await page.getByRole("combobox", { name: "Equivalent unit" }).fill("tiles");
await page.getByRole("heading", { name: "Add Component" }).click();

const variantScreenshot = resolve(outputDir, "02-v1-open.png");
await page.screenshot({ path: variantScreenshot });

const mainCostVisible = await page.locator('section[aria-label="Cost fields"]').isVisible().catch(() => false);
const variantCostVisible = await page.locator('section[aria-label="Variant cost"]').isVisible().catch(() => false);
const migratedVariantCost = await page.getByRole("textbox", { name: "Variant unit cost" }).inputValue();
const modalBox = await page.getByRole("dialog", { name: "Add Component" }).boundingBox();
const drawerBox = await page.getByRole("dialog", { name: "Manage variants" }).boundingBox();

const comparisonScreenshot = resolve(outputDir, "03-reference-comparison.png");
const comparisonPage = await context.newPage();
const referenceData = (await readFile("/Users/philiplewis/.codex/attachments/31851009-516e-41e1-aa02-df9efbd6cd73/image-1.png")).toString("base64");
const implementationData = (await readFile(variantScreenshot)).toString("base64");
await comparisonPage.setContent(`
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 16px; background: #e8eaed; font: 14px -apple-system, BlinkMacSystemFont, sans-serif; color: #3d3d3d; }
    main { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    figure { margin: 0; padding: 8px; background: white; border-radius: 8px; }
    figcaption { padding: 0 0 8px; font-weight: 600; }
    img { display: block; width: 100%; height: auto; }
  </style>
  <main>
    <figure><figcaption>Open Design reference</figcaption><img src="data:image/png;base64,${referenceData}"></figure>
    <figure><figcaption>Archestimator implementation</figcaption><img src="data:image/png;base64,${implementationData}"></figure>
  </main>
`);
await comparisonPage.screenshot({ path: comparisonScreenshot, fullPage: true });

await browser.close();

console.log(JSON.stringify({
  baseUrl,
  viewport,
  screenshots: { base: baseScreenshot, variant: variantScreenshot, comparison: comparisonScreenshot },
  checks: { baseOrder, baseCostVisibleAfterEntry, mainCostVisible, variantCostVisible, migratedVariantCost, modalBox, drawerBox, consoleErrors, pageErrors },
}, null, 2));
