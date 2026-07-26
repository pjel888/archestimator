import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page, type TestInfo } from "@playwright/test";
import sharp from "sharp";

import initialCopyParity from "../../tests/fixtures/new-landing-initial-copy-parity.json";

test.use({
  storageState: { cookies: [], origins: [] },
  ...(process.env.ARCHESTIMATOR_SYSTEM_CHROME === "1"
    ? { channel: "chrome" }
    : {}),
});

const approvedOneLiner =
  "Archestimator helps businesses in the AEC industry to build structured cost estimates and turn them into client-ready proposals that can be reviewed, discussed, and decided in one connected workflow.";

const profiles = [
  { name: "desktop", viewport: { width: 1280, height: 800 }, isMobile: false },
  { name: "mobile", viewport: { width: 390, height: 844 }, isMobile: true },
  { name: "narrow", viewport: { width: 320, height: 812 }, isMobile: true },
] as const;

const evidenceMarkers = [
  "comparison",
  "ripple",
  "reduced-motion",
  "mobile-menu",
  "contracts",
  "no-javascript",
] as const;

function artifactRoot(testInfo: TestInfo) {
  const projectName = testInfo.project.name.replace(/[^a-z0-9-]+/giu, "-").toLowerCase();
  return path.resolve(
    process.cwd(),
    "artifacts/landing-new-experiment/final",
    projectName,
  );
}

function stagingArtifactRoot(testInfo: TestInfo) {
  return `${artifactRoot(testInfo)}.staging`;
}

async function markEvidence(
  testInfo: TestInfo,
  marker: (typeof evidenceMarkers)[number],
) {
  await writeFile(path.join(stagingArtifactRoot(testInfo), `.pass-${marker}`), "PASS\n");
}

function sha256(value: Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function countWords(value: string) {
  return value.trim().split(/\s+/u).filter(Boolean).length;
}

async function comparePixels(actual: Buffer, expected: Buffer) {
  const [actualMetadata, expectedMetadata, actualRaw, expectedRaw] = await Promise.all([
    sharp(actual).metadata(),
    sharp(expected).metadata(),
    sharp(actual).ensureAlpha().raw().toBuffer(),
    sharp(expected).ensureAlpha().raw().toBuffer(),
  ]);

  expect(actualMetadata.width).toBe(expectedMetadata.width);
  expect(actualMetadata.height).toBe(expectedMetadata.height);
  expect(actualRaw.byteLength).toBe(expectedRaw.byteLength);

  let pixelDiffCount = 0;
  let maxChannelDelta = 0;
  for (let offset = 0; offset < actualRaw.byteLength; offset += 4) {
    let pixelChanged = false;
    for (let channel = 0; channel < 4; channel += 1) {
      const delta = Math.abs(actualRaw[offset + channel] - expectedRaw[offset + channel]);
      maxChannelDelta = Math.max(maxChannelDelta, delta);
      pixelChanged ||= delta !== 0;
    }
    if (pixelChanged) pixelDiffCount += 1;
  }

  return { pixelDiffCount, maxChannelDelta };
}

async function settleStaticPage(page: Page, route: "/" | "/new") {
  await page.goto(route, { waitUntil: "networkidle" });
  if ((await page.locator("[data-proof-phase]").count()) > 0) {
    await page.locator("[data-workspace-ready]").waitFor({
      state: "attached",
      timeout: 20_000,
    });
  }
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-delay: 0s !important;
        animation-duration: 0s !important;
        caret-color: transparent !important;
        transition: none !important;
      }
      nextjs-portal {
        display: none !important;
      }
    `,
  });
  await page.evaluate(async () => {
    await Promise.race([
      document.fonts.ready,
      new Promise((_, reject) => {
        window.setTimeout(() => reject(new Error("Font readiness timed out")), 10_000);
      }),
    ]);
    const viewportHeight = window.innerHeight;
    for (let offset = 0; offset < document.documentElement.scrollHeight; offset += viewportHeight) {
      window.scrollTo(0, offset);
      await new Promise((resolve) => window.setTimeout(resolve, 30));
    }
    window.scrollTo(0, 0);
    await Promise.all(
      Array.from(document.images)
        .filter((image) => image.currentSrc)
        .map(async (image) => {
          if (!image.complete) {
            await Promise.race([
              new Promise((resolve, reject) => {
                image.addEventListener("load", () => resolve(undefined), { once: true });
                image.addEventListener(
                  "error",
                  () => reject(new Error(`Image failed: ${image.currentSrc}`)),
                  { once: true },
                );
              }),
              new Promise((_, reject) => {
                window.setTimeout(
                  () => reject(new Error(`Image readiness timed out: ${image.currentSrc}`)),
                  10_000,
                );
              }),
            ]);
          }
          if (image.naturalWidth === 0) {
            throw new Error(`Image has no decoded pixels: ${image.currentSrc}`);
          }
        }),
    );
    await document.fonts.load('400 64px "Doto"');
    await document.fonts.ready;
    if (!document.fonts.check('400 64px "Doto"')) {
      throw new Error("Doto did not load for deterministic capture");
    }
  });
  await page.waitForTimeout(4_300);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(150);
}

async function captureStatic(
  browser: Browser,
  profile: (typeof profiles)[number],
  route: "/" | "/new",
) {
  const context = await browser.newContext({
    viewport: profile.viewport,
    reducedMotion: "reduce",
    hasTouch: profile.isMobile,
    ...(browser.browserType().name() === "firefox"
      ? {}
      : { isMobile: profile.isMobile }),
    storageState: { cookies: [], origins: [] },
  });
  await context.addInitScript({
    content: `
      window.requestIdleCallback = (callback) => window.setTimeout(
        () => callback({ didTimeout: false, timeRemaining: () => 50 }),
        60_000,
      );
      window.cancelIdleCallback = (id) => window.clearTimeout(id);
    `,
  });
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const badResponses: Array<{ status: number; url: string }> = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400) {
      badResponses.push({ status: response.status(), url: response.url() });
    }
  });

  await settleStaticPage(page, route);

  const metrics = await page.evaluate(() => {
    const box = (element: Element | null) => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        top: rect.top,
        bottom: rect.bottom,
      };
    };
    const image = document.querySelector<HTMLImageElement>("#product picture img");
    const imageStyle = image ? getComputedStyle(image) : null;
    const hero = document.querySelector("#product");
    const body = document.querySelector("[data-new-experiment-body]");
    const coreCopy = Array.from(document.querySelectorAll("[data-core-copy]"))
      .map((section) => section.textContent ?? "")
      .join(" ");
    return {
      hero: {
        header: box(document.querySelector("header")),
        hero: box(hero),
        heroImage: box(image),
        heroImageCurrentSrc: image?.currentSrc ?? null,
        heroImageNatural: image
          ? { width: image.naturalWidth, height: image.naturalHeight }
          : null,
        heroImageObjectFit: imageStyle?.objectFit ?? null,
        heroImageObjectPosition: imageStyle?.objectPosition ?? null,
        heroHeading: document.querySelector("#hero-title")?.textContent ?? null,
        heroText: hero?.textContent ?? null,
        headerText: document.querySelector("header")?.textContent ?? null,
        headerLinks: Array.from(document.querySelectorAll("header a")).map((anchor) => ({
          text: anchor.textContent?.trim() ?? "",
          href: anchor.getAttribute("href"),
        })),
        heroCta: (() => {
          const anchor = hero?.querySelector("a");
          return anchor
            ? { text: anchor.textContent?.trim() ?? "", href: anchor.getAttribute("href") }
            : null;
        })(),
      },
      chapterCount: body?.querySelectorAll("[data-new-major-chapter]").length ?? 0,
      objectionCount: body?.querySelectorAll("[data-new-objection]").length ?? 0,
      coreCopy,
      rippleCanvasCount: document.querySelectorAll("[data-hero-ripple-canvas]").length,
      scrollHeight: document.documentElement.scrollHeight,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
    };
  });

  const heroBottom = metrics.hero.hero?.bottom;
  if (heroBottom === undefined || heroBottom === null) {
    throw new Error("Hero is missing");
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  const heroRasterNormalizer = await page.addStyleTag({
    content:
      "#product { transform: translateZ(0); } nextjs-portal { display: none !important; }",
  });
  await page.waitForTimeout(50);
  const heroScreenshot = await page.screenshot({
    clip: {
      x: 0,
      y: 0,
      width: profile.viewport.width,
      height: Math.ceil(heroBottom),
    },
    animations: "disabled",
  });
  await heroRasterNormalizer.evaluate((element) => element.remove());
  await page.waitForTimeout(50);
  await page.evaluate((scrollPosition) => window.scrollTo(0, scrollPosition), heroBottom);
  await page.waitForTimeout(100);
  const firstPostHeroScreenshot = await page.screenshot({ animations: "disabled" });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(100);
  const fullScreenshot = await page.screenshot({ fullPage: true, animations: "disabled" });

  await context.close();
  return {
    metrics,
    heroScreenshot,
    fullScreenshot,
    firstPostHeroScreenshot,
    consoleErrors,
    pageErrors,
    badResponses,
  };
}

async function rippleEvidence(browser: Browser, route: "/" | "/new") {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: "no-preference",
    hasTouch: false,
    isMobile: false,
    storageState: { cookies: [], origins: [] },
  });
  const page = await context.newPage();
  const unexpectedErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") unexpectedErrors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => unexpectedErrors.push(`pageerror: ${error.message}`));

  await page.goto(route, { waitUntil: "networkidle" });
  const canvas = page.locator("[data-hero-ripple-canvas][data-ripple-ready]");
  await canvas.waitFor({ state: "attached", timeout: 15_000 });
  await page.waitForFunction(
    () => document.querySelector("[data-hero-ripple-canvas]")?.getAttribute("data-ripple-state") === "rest",
    undefined,
    { timeout: 10_000 },
  );
  const beforePointer = await canvas.screenshot({ animations: "disabled" });
  const imageBox = await page.locator("#product picture img").boundingBox();
  if (!imageBox) throw new Error("Hero image is missing");

  const movementRatios = [0.2, 0.35, 0.5, 0.65, 0.8];
  for (const [index, ratio] of movementRatios.entries()) {
    await page.mouse.move(
      imageBox.x + imageBox.width * ratio,
      imageBox.y + imageBox.height * (0.35 + ratio * 0.25),
      { steps: 3 },
    );
    if (index < movementRatios.length - 1) await page.waitForTimeout(25);
  }
  await page.waitForFunction(
    () => document.querySelector("[data-hero-ripple-canvas]")?.getAttribute("data-ripple-state") === "moving",
    undefined,
    { timeout: 2_000 },
  );
  const afterPointer = await canvas.screenshot({ animations: "disabled" });

  const evidence = await canvas.evaluate((element) => ({
    ready: element.hasAttribute("data-ripple-ready"),
    state: element.getAttribute("data-ripple-state"),
    segments: Number(element.getAttribute("data-ripple-segments") ?? "0"),
  }));
  const visualDiff = await comparePixels(afterPointer, beforePointer);
  await context.close();
  return { ...evidence, visualDiff, unexpectedErrors };
}

test("final experiment preserves the shared hero image and captures the comparison", async ({
  browser,
}, testInfo) => {
  test.setTimeout(180_000);
  expect(initialCopyParity.results.map((result) => result.profile.name)).toEqual([
    "desktop",
    "mobile",
  ]);
  for (const result of initialCopyParity.results) {
    expect(result.pixelDiff).toEqual({ pixelDiffCount: 0, maxChannelDelta: 0 });
    expect(result.experimentScreenshotSha256).toBe(result.controlScreenshotSha256);
  }

  const outputRoot = artifactRoot(testInfo);
  const stagingRoot = stagingArtifactRoot(testInfo);
  await rm(stagingRoot, { force: true, recursive: true });
  await mkdir(stagingRoot, { recursive: true });
  const results = [];

  for (const profile of profiles) {
    const control = await captureStatic(browser, profile, "/");
    const experiment = await captureStatic(browser, profile, "/new");
    const files = {
      controlFull: path.join(stagingRoot, `root-${profile.name}-full.png`),
      experimentFull: path.join(stagingRoot, `new-${profile.name}-full.png`),
      controlFirstPostHero: path.join(
        stagingRoot,
        `root-${profile.name}-first-post-hero.png`,
      ),
      experimentFirstPostHero: path.join(
        stagingRoot,
        `new-${profile.name}-first-post-hero.png`,
      ),
      controlHero: path.join(stagingRoot, `root-${profile.name}-hero.png`),
      experimentHero: path.join(stagingRoot, `new-${profile.name}-hero.png`),
    };
    await Promise.all([
      writeFile(files.controlFull, control.fullScreenshot),
      writeFile(files.experimentFull, experiment.fullScreenshot),
      writeFile(files.controlFirstPostHero, control.firstPostHeroScreenshot),
      writeFile(files.experimentFirstPostHero, experiment.firstPostHeroScreenshot),
      writeFile(files.controlHero, control.heroScreenshot),
      writeFile(files.experimentHero, experiment.heroScreenshot),
    ]);

    expect(control.consoleErrors).toEqual([]);
    expect(experiment.consoleErrors).toEqual([]);
    expect(control.pageErrors).toEqual([]);
    expect(experiment.pageErrors).toEqual([]);
    expect(control.badResponses).toEqual([]);
    expect(experiment.badResponses).toEqual([]);
    expect(control.metrics.rippleCanvasCount).toBe(0);
    expect(experiment.metrics.rippleCanvasCount).toBe(0);
    expect(experiment.metrics.hero.heroImageCurrentSrc).toBe(
      control.metrics.hero.heroImageCurrentSrc,
    );
    expect(experiment.metrics.hero.heroImageNatural).toEqual(
      control.metrics.hero.heroImageNatural,
    );
    expect(experiment.metrics.hero.heroImageObjectFit).toBe(
      control.metrics.hero.heroImageObjectFit,
    );
    expect(experiment.metrics.hero.heroImageObjectPosition).toBe(
      control.metrics.hero.heroImageObjectPosition,
    );
    expect(experiment.metrics.hero.heroHeading).not.toBe(
      control.metrics.hero.heroHeading,
    );
    expect(experiment.metrics.hero.heroText).toContain(approvedOneLiner);
    expect(control.metrics.horizontalOverflow).toBe(false);
    expect(experiment.metrics.horizontalOverflow).toBe(false);
    expect(experiment.metrics.scrollHeight).toBeLessThanOrEqual(
      Math.ceil(control.metrics.scrollHeight * 1.25),
    );
    expect(experiment.metrics.chapterCount).toBe(4);
    expect(experiment.metrics.objectionCount).toBe(4);
    expect(countWords(experiment.metrics.coreCopy)).toBeGreaterThanOrEqual(450);
    expect(countWords(experiment.metrics.coreCopy)).toBeLessThanOrEqual(750);

    results.push({
      profile,
      controlHeroMetrics: control.metrics.hero,
      experimentHeroMetrics: experiment.metrics.hero,
      preservedImage: {
        currentSrc: experiment.metrics.hero.heroImageCurrentSrc,
        natural: experiment.metrics.hero.heroImageNatural,
        objectFit: experiment.metrics.hero.heroImageObjectFit,
        objectPosition: experiment.metrics.hero.heroImageObjectPosition,
      },
      controlScrollHeight: control.metrics.scrollHeight,
      experimentScrollHeight: experiment.metrics.scrollHeight,
      experimentCoreWordCount: countWords(experiment.metrics.coreCopy),
      experimentChapterCount: experiment.metrics.chapterCount,
      experimentObjectionCount: experiment.metrics.objectionCount,
      initialCopyParity:
        initialCopyParity.results.find(
          (result) => result.profile.name === profile.name,
        ) ?? null,
      files: Object.fromEntries(
        Object.entries(files).map(([key, value]) => [
          key,
          path.relative(process.cwd(), path.join(outputRoot, path.basename(value))),
        ]),
      ),
      hashes: {
        controlFull: sha256(control.fullScreenshot),
        experimentFull: sha256(experiment.fullScreenshot),
        controlFirstPostHero: sha256(control.firstPostHeroScreenshot),
        experimentFirstPostHero: sha256(experiment.firstPostHeroScreenshot),
        controlHero: sha256(control.heroScreenshot),
        experimentHero: sha256(experiment.heroScreenshot),
      },
    });
  }

  await writeFile(
    path.join(stagingRoot, "manifest.json"),
    `${JSON.stringify(
      {
        schemaVersion: 2,
        phase: "final-comparison",
        createdAt: new Date().toISOString(),
        authState: "signed-out-empty-storage",
        reducedMotion: "reduce",
        preservedInvariant: "shared-image-source-and-ripple-engine",
        initialCopyParityFixture:
          "tests/fixtures/new-landing-initial-copy-parity.json",
        publicationGate: evidenceMarkers,
        results,
      },
      null,
      2,
    )}\n`,
  );

  await markEvidence(testInfo, "comparison");
});

test("fine-pointer ripple structure and response match the control", async ({ browser }, testInfo) => {
  test.setTimeout(60_000);
  const control = await rippleEvidence(browser, "/");
  const experiment = await rippleEvidence(browser, "/new");

  expect(control.unexpectedErrors).toEqual([]);
  expect(experiment.unexpectedErrors).toEqual([]);
  expect(control.ready).toBe(true);
  expect(experiment.ready).toBe(true);
  expect(experiment.ready).toBe(control.ready);
  expect(experiment.segments).toBe(control.segments);
  expect(["moving", "settling"]).toContain(control.state);
  expect(["moving", "settling"]).toContain(experiment.state);
  expect(control.visualDiff.pixelDiffCount).toBeGreaterThan(0);
  expect(experiment.visualDiff.pixelDiffCount).toBeGreaterThan(0);
  expect(control.visualDiff.maxChannelDelta).toBeGreaterThan(0);
  expect(experiment.visualDiff.maxChannelDelta).toBeGreaterThan(0);
  await markEvidence(testInfo, "ripple");
});

test("reduced-motion fallback remains static after deferred motion loads", async ({ browser }, testInfo) => {
  test.setTimeout(60_000);

  for (const route of ["/", "/new"] as const) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      reducedMotion: "reduce",
      storageState: { cookies: [], origins: [] },
    });
    const page = await context.newPage();
    await page.goto(route, { waitUntil: "networkidle" });
    await page.waitForTimeout(4_500);

    await expect(page.locator("#product picture img")).toBeVisible();
    await expect(page.locator("[data-hero-ripple-canvas]")).toHaveCount(0);
    await context.close();
  }
  await markEvidence(testInfo, "reduced-motion");
});

test("mobile menu behavior and section navigation match the control", async ({ browser }, testInfo) => {
  for (const route of ["/", "/new"] as const) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      ...(browser.browserType().name() === "firefox" ? {} : { isMobile: true }),
      storageState: { cookies: [], origins: [] },
    });
    const page = await context.newPage();
    await page.goto(route, { waitUntil: "networkidle" });

    await page.getByRole("button", { name: "Menu", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("link", { name: "Workflow", exact: true }).click();
    await expect(page).toHaveURL(/#workflow$/u);
    await expect(dialog).toBeHidden();
    await expect(page.locator("#workflow")).toBeInViewport();
    await context.close();
  }
  await markEvidence(testInfo, "mobile-menu");
});

test("body, metadata, navigation, CTA, and accessibility contracts pass", async ({ page }, testInfo) => {
  const unexpectedErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") unexpectedErrors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => unexpectedErrors.push(`pageerror: ${error.message}`));

  await page.goto("/new", { waitUntil: "networkidle" });
  await expect(page).toHaveTitle("Build, Publish, Decide | Archestimator");
  const robots = await page.locator('meta[name="robots"]').getAttribute("content");
  expect(robots).toContain("noindex");
  expect(robots).toContain("nofollow");
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);

  const hero = page.locator("#product");
  const body = page.locator("[data-new-experiment-body]");
  await expect(
    hero.getByRole("heading", { level: 1, name: "Build. Publish. Decide." }),
  ).toBeVisible();
  await expect(hero.getByText(approvedOneLiner, { exact: true })).toBeVisible();
  await expect(
    hero.getByRole("link", { name: "See the workflow", exact: true }),
  ).toHaveAttribute("href", "#workflow");
  await expect(body.locator("[data-new-major-chapter]")).toHaveCount(4);
  await expect(body.locator("[data-new-objection]")).toHaveCount(4);
  const mainText = (await page.locator("main").textContent()) ?? "";
  const bodyText = (await body.textContent()) ?? "";
  expect(mainText.split(approvedOneLiner)).toHaveLength(2);
  expect(bodyText).not.toContain(approvedOneLiner);
  expect(bodyText).not.toContain("—");
  expect(bodyText).not.toMatch(/\bsmall\b/iu);
  expect(bodyText).not.toMatch(
    /AI-powered|RFQ intake|payment processing|purchase orders?|invoicing|legally binding|immutable issuance/iu,
  );
  expect(bodyText).toContain("material supply quote");
  expect(bodyText).toContain("subcontract package");
  expect(bodyText).toContain("professional service scope");
  expect(bodyText).toContain("available by request");
  expect(bodyText).not.toContain("pre-release");
  expect(bodyText).not.toContain("closed beta");
  expect(bodyText).toContain("Approve proposal");
  expect(bodyText).toContain("Request changes");
  expect(bodyText).toContain("Decline");

  const heroCta = page.locator("#product a").filter({ hasText: "Request early access" });
  const closingCta = body.getByRole("link", { name: "Request early access" });
  await expect(heroCta).toHaveCount(1);
  await expect(closingCta).toHaveCount(1);
  expect(await closingCta.getAttribute("href")).toBe(await heroCta.getAttribute("href"));

  await page.getByRole("link", { name: "Workflow", exact: true }).click();
  await expect(page).toHaveURL(/#workflow$/u);
  await expect(page.locator("#workflow")).toBeInViewport();
  await page.getByRole("link", { name: "Client review", exact: true }).click();
  await expect(page).toHaveURL(/#proof$/u);
  await expect(page.locator("#proof")).toBeInViewport();

  const sitemap = await page.request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  expect(await sitemap.text()).not.toContain("/new");
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.locator('a[href="/new"]')).toHaveCount(0);

  await page.goto("/new", { waitUntil: "networkidle" });
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await expect(page.locator('a[href="#main"]')).toBeAttached();
  expect(unexpectedErrors).toEqual([]);
  await markEvidence(testInfo, "contracts");
});

test("the experimental narrative remains readable without JavaScript", async ({ browser }, testInfo) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    ...(browser.browserType().name() === "firefox" ? {} : { isMobile: true }),
    storageState: { cookies: [], origins: [] },
  });
  const page = await context.newPage();
  await page.goto("/new", { waitUntil: "domcontentloaded" });

  await expect(page.locator("#hero-title")).toBeVisible();
  await expect(page.getByText(approvedOneLiner, { exact: true })).toBeVisible();
  await expect(page.locator("[data-new-major-chapter]")).toHaveCount(4);
  await expect(page.locator("[data-hero-ripple-canvas]")).toHaveCount(0);
  expect(await page.locator("[data-new-experiment-body]").textContent()).toContain(
    "One working estimate. One proposal version. One response in context.",
  );
  await context.close();
  await markEvidence(testInfo, "no-javascript");
});

test("publishes final artifacts only after the complete evidence set passes", async ({}, testInfo) => {
  const outputRoot = artifactRoot(testInfo);
  const stagingRoot = stagingArtifactRoot(testInfo);
  const backupRoot = `${outputRoot}.previous`;
  const missingMarkers = evidenceMarkers.filter(
    (marker) => !existsSync(path.join(stagingRoot, `.pass-${marker}`)),
  );

  expect(missingMarkers).toEqual([]);
  expect(existsSync(path.join(stagingRoot, "manifest.json"))).toBe(true);

  await Promise.all(
    evidenceMarkers.map((marker) =>
      rm(path.join(stagingRoot, `.pass-${marker}`), { force: true }),
    ),
  );
  await rm(backupRoot, { force: true, recursive: true });
  if (existsSync(outputRoot)) await rename(outputRoot, backupRoot);
  try {
    await rename(stagingRoot, outputRoot);
    await rm(backupRoot, { force: true, recursive: true });
  } catch (error) {
    if (existsSync(backupRoot) && !existsSync(outputRoot)) {
      await rename(backupRoot, outputRoot);
    }
    throw error;
  }
});
