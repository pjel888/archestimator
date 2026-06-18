import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/**
 * Pins the deferred-liquid-glass arming contract (perf: glass surfaces paint with
 * no blur first, then arm after first paint + idle). These are source-level guards
 * — the kind of regression the type-checker and DOM tests can't catch — covering
 * the exact failure modes surfaced in adversarial review:
 *  - a gated base rule losing its `backdrop-filter: none` (blur back on first paint)
 *  - a gated class losing its armed rule (frost never returns)
 *  - re-introducing the `prefers-reduced-transparency: no-preference` gate that
 *    strands engines without that media feature (older Chrome) — they'd lose blur
 *  - the reduced-transparency opt-out / reduced-motion snap regressing
 *  - the armer losing a guard or the backgrounded-tab backstop
 */

const globalsCss = readFileSync("src/app/globals.css", "utf8");
const armer = readFileSync("src/components/system/LiquidGlassReady.tsx", "utf8");

// Every surface whose blur is deferred. Each must ship un-armed `backdrop-filter:
// none` AND have a `:root[data-glass="ready"]` armed rule.
const GATED_GLASS_CLASSES = [
  "sidebar-glass",
  "dashboard-glass",
  "dashboard-glass-warm",
  "workshop-workspace-glass-surface",
  "dashboard-destination-card",
  "workshop-liquid-button",
] as const;

describe("deferred liquid-glass arming", () => {
  it("registers the animatable blur custom property and only sets it once armed", () => {
    expect(globalsCss).toMatch(
      /@property\s+--glass-blur-amount\s*{[\s\S]*?syntax:\s*"<length>";[\s\S]*?inherits:\s*true;[\s\S]*?initial-value:\s*0px;[\s\S]*?}/,
    );
    // Un-armed root keeps the blur at 0; arming flips it to the real radius.
    expect(globalsCss).toMatch(/:root\s*{[\s\S]*?--glass-blur-amount:\s*0px;/);
    expect(globalsCss).toMatch(/:root\[data-glass="ready"\]\s*{[\s\S]*?--glass-blur-amount:\s*var\(--glass-blur\);/);
  });

  it("ramps only on desktop pointer devices and snaps under reduced motion", () => {
    expect(globalsCss).toMatch(
      /@media\s*\(min-width:\s*1024px\)\s*and\s*\(pointer:\s*fine\)\s*{\s*:root\s*{\s*transition:\s*--glass-blur-amount/,
    );
    expect(globalsCss).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*{\s*:root\s*{\s*transition:\s*none;/);
  });

  it("arms the blur for every gated surface behind @supports, gated only by data-glass", () => {
    expect(globalsCss).toContain("@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))");
    for (const cls of GATED_GLASS_CLASSES) {
      expect(globalsCss).toContain(`:root[data-glass="ready"] .${cls}`);
    }
    // Sidebar desktop refraction still swaps to the SVG filter, but only once armed.
    expect(globalsCss).toContain(`:root[data-glass="ready"] .sidebar-glass[data-refraction="true"]`);
  });

  it("never gates arming on prefers-reduced-transparency: no-preference (strands older engines)", () => {
    // Comments may explain WHY we avoid it; the @media rule form must not exist.
    expect(globalsCss).not.toMatch(/@media\s*\(\s*prefers-reduced-transparency:\s*no-preference\s*\)/);
  });

  it("disarms blur live for reduced-transparency users even after arming", () => {
    // An inner @media reduce block inside the armed @supports removes blur again.
    expect(globalsCss).toMatch(
      /@media\s*\(prefers-reduced-transparency:\s*reduce\)\s*{[\s\S]*?:root\[data-glass="ready"\]\s*\.sidebar-glass[\s\S]*?backdrop-filter:\s*none;/,
    );
  });

  it("keeps every gated base rule un-armed (backdrop-filter: none) so first paint is cheap", () => {
    // One `/* deferred */` marker per gated base rule (sidebar, dashboard-glass,
    // workspace surface, liquid-button, glass-warm, destination-card).
    const deferredMarkers = globalsCss.match(/backdrop-filter:\s*none;\s*\/\* deferred/g) ?? [];
    expect(deferredMarkers.length).toBeGreaterThanOrEqual(GATED_GLASS_CLASSES.length - 1);
  });

  it("arms via <html> attribute only after first paint + idle, with opt-out + backstop guards", () => {
    expect(armer).toContain('"use client"');
    // Sets the flag on the documentElement (matches the :root[data-glass] selector).
    expect(armer).toMatch(/document\.documentElement/);
    expect(armer).toMatch(/dataset\.glass\s*=\s*"ready"/);
    // Opt-out short-circuits mirror the CSS guards.
    expect(armer).toContain("CSS.supports");
    expect(armer).toContain("prefers-reduced-transparency: reduce");
    // Post-paint + idle scheduling.
    expect(armer).toContain("requestAnimationFrame");
    expect(armer).toContain("requestIdleCallback");
    // Backgrounded-tab backstop: rAF is parked while hidden, so an independent
    // timeout must still arm the frost.
    expect(armer).toMatch(/setTimeout\(\s*arm\s*,/);
    // Avoids arming mid-font-swap.
    expect(armer).toContain("document.fonts");
  });
});
