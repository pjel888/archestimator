import { test, expect } from "@playwright/test";

test.describe("Landing Page Comprehensive Audit", () => {
  const consoleErrors: string[] = [];
  const consoleWarnings: string[] = [];
  const failedResponses: Array<{ status: number; url: string }> = [];

  test.beforeEach(({ page }) => {
    consoleErrors.length = 0;
    consoleWarnings.length = 0;
    failedResponses.length = 0;
    
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (text !== "Failed to load resource: the server responded with a status of 404 (Not Found)") {
          consoleErrors.push(text);
        }
      } else if (msg.type() === "warning") {
        consoleWarnings.push(msg.text());
      }
    });
    page.on("response", (response) => {
      if (response.status() >= 400) {
        failedResponses.push({ status: response.status(), url: response.url() });
      }
    });
  });

  test("Measures performance, SEO, accessibility, and UI/UX", async ({ page }) => {
    // 1. Visit the home page
    const startTime = Date.now();
    await page.goto("/");
    const loadTime = Date.now() - startTime;

    // Wait for the page to be fully loaded and network to idle
    await page.waitForLoadState("networkidle");

    // 2. Measure Performance Metrics
    const performanceTiming = await page.evaluate(() => {
      const [timing] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
      if (!timing) return null;
      return {
        domInteractive: timing.domInteractive,
        domContentLoaded: timing.domContentLoadedEventEnd,
        loadTime: timing.loadEventEnd,
        duration: timing.duration,
        transferSize: timing.transferSize,
        encodedBodySize: timing.encodedBodySize,
        decodedBodySize: timing.decodedBodySize,
      };
    });

    console.log("\n=== PERFORMANCE AUDIT ===");
    console.log(`Initial page load time: ${loadTime}ms`);
    if (performanceTiming) {
      console.log(`DOM Interactive: ${performanceTiming.domInteractive.toFixed(1)}ms`);
      console.log(`DOM Content Loaded: ${performanceTiming.domContentLoaded.toFixed(1)}ms`);
      console.log(`Full Page Load Event: ${performanceTiming.loadTime.toFixed(1)}ms`);
      console.log(`HTML Transfer Size: ${(performanceTiming.transferSize / 1024).toFixed(2)} KB`);
      console.log(`HTML Decoded Size: ${(performanceTiming.decodedBodySize / 1024).toFixed(2)} KB`);
    } else {
      console.log("Performance timing API not available or did not return data.");
    }

    // 3. Count Resource Requests
    const resources = await page.evaluate(() => {
      const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
      const categories = {
        script: 0,
        css: 0,
        img: 0,
        font: 0,
        other: 0,
      };
      let totalSize = 0;
      entries.forEach(e => {
        totalSize += e.transferSize || 0;
        if (e.initiatorType in categories) {
          categories[e.initiatorType as keyof typeof categories]++;
        } else if (/\.(js|mjs)$/i.test(e.name)) {
          categories.script++;
        } else if (/\.(css)$/i.test(e.name)) {
          categories.css++;
        } else if (/\.(png|jpe?g|svg|webp|gif)$/i.test(e.name)) {
          categories.img++;
        } else if (/\.(woff2?|ttf|otf)$/i.test(e.name)) {
          categories.font++;
        } else {
          categories.other++;
        }
      });
      return { categories, totalSize, count: entries.length };
    });

    console.log(`\nResource Counts (Total ${resources.count} requests, ~ ${(resources.totalSize / 1024 / 1024).toFixed(2)} MB transferred):`);
    console.log(`- Scripts: ${resources.categories.script}`);
    console.log(`- Stylesheets: ${resources.categories.css}`);
    console.log(`- Images: ${resources.categories.img}`);
    console.log(`- Fonts: ${resources.categories.font}`);
    console.log(`- Others: ${resources.categories.other}`);

    // 4. SEO Audit
    const title = await page.title();
    const metaDescription = await page.locator("meta[name='description']").getAttribute("content").catch(() => null);
    const metaViewport = await page.locator("meta[name='viewport']").getAttribute("content").catch(() => null);
    const headings = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6")).map(el => ({
        tag: el.tagName.toLowerCase(),
        text: el.textContent?.trim() || "",
      }));
    });

    console.log("\n=== SEO AUDIT ===");
    console.log(`Title: "${title}" (Length: ${title.length} chars)`);
    console.log(`Meta Description: "${metaDescription}"`);
    console.log(`Meta Viewport: "${metaViewport}"`);
    console.log("Heading Structure:");
    const h1Count = headings.filter(h => h.tag === "h1").length;
    console.log(`- H1 count: ${h1Count}`);
    headings.forEach(h => {
      console.log(`  - ${h.tag.toUpperCase()}: ${h.text}`);
    });

    // 5. UX & UI Audit (Placeholders, Responsiveness, Structure)
    // Check for "placeholder" text anywhere in visible body
    const placeholderTexts = await page.evaluate(() => {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            const text = node.textContent?.trim() || "";
            // Ignore script, style, and tag contents
            const parent = node.parentElement;
            if (parent && ["SCRIPT", "STYLE", "NOSCRIPT"].includes(parent.tagName)) {
              return NodeFilter.FILTER_REJECT;
            }
            if (text.toLowerCase().includes("placeholder") && text.length < 150) {
              return NodeFilter.FILTER_ACCEPT;
            }
            return NodeFilter.FILTER_REJECT;
          }
        }
      );
      const results: string[] = [];
      let current = walker.nextNode();
      while (current) {
        results.push(current.textContent?.trim() || "");
        current = walker.nextNode();
      }
      return results;
    });

    console.log("\n=== UX/UI PLACEHOLDER AUDIT ===");
    console.log(`Found ${placeholderTexts.length} visible elements with 'placeholder' in text:`);
    placeholderTexts.forEach((text, i) => {
      console.log(`  ${i + 1}. "${text}"`);
    });

    // Check if there are any visual element containers that leaked class names or placeholders
    const placeholderClassesOrIds = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll("[id*='placeholder'], [class*='placeholder']"));
      return elements.map(el => ({
        tag: el.tagName.toLowerCase(),
        id: el.id,
        classes: el.className,
      }));
    });
    console.log(`Found ${placeholderClassesOrIds.length} DOM elements with 'placeholder' in ID/class.`);

    // 6. Responsive Width & Overflow Test (Desktop & Mobile)
    console.log("\n=== RESPONSIVENESS AUDIT ===");
    // Test desktop (1280px)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(500); // let things settle
    const desktopOverflow = await page.evaluate(() => {
      const bodyWidth = document.body.scrollWidth;
      const windowWidth = window.innerWidth;
      return { bodyWidth, windowWidth, hasOverflow: bodyWidth > windowWidth };
    });
    console.log(`Desktop (1280px) - Body scroll width: ${desktopOverflow.bodyWidth}px, Viewport: ${desktopOverflow.windowWidth}px. Overflow: ${desktopOverflow.hasOverflow}`);

    // Test mobile (375px)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    const mobileOverflow = await page.evaluate(() => {
      const bodyWidth = document.body.scrollWidth;
      const windowWidth = window.innerWidth;
      return { bodyWidth, windowWidth, hasOverflow: bodyWidth > windowWidth };
    });
    console.log(`Mobile (375px) - Body scroll width: ${mobileOverflow.bodyWidth}px, Viewport: ${mobileOverflow.windowWidth}px. Overflow: ${mobileOverflow.hasOverflow}`);

    // 7. Console Errors/Warnings Audit
    console.log("\n=== CONSOLE AUDIT ===");
    console.log(`Console Errors (${consoleErrors.length}):`);
    consoleErrors.forEach(err => console.log(`  - ${err}`));
    console.log(`Console Warnings (${consoleWarnings.length}):`);
    consoleWarnings.forEach(warn => console.log(`  - ${warn}`));
    const unexpectedFailedResponses = failedResponses.filter(
      (response) => !/\/_next\/static\/chunks\//.test(response.url),
    );
    console.log(`Failed Responses (${failedResponses.length}, unexpected ${unexpectedFailedResponses.length}):`);
    failedResponses.forEach((response) => console.log(`  - ${response.status} ${response.url}`));

    // Assert some basic constraints
    expect(h1Count).toBe(1); // Single H1 for SEO
    expect(mobileOverflow.hasOverflow).toBe(false); // No mobile horizontal overflow
    expect(consoleErrors.length).toBe(0); // No console errors
    expect(unexpectedFailedResponses).toHaveLength(0);
  });
});
