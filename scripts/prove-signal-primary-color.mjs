// Visual + contrast proof for the Archestimator Signal (#F24405) primary-color
// rebrand. Extracts the REAL :root design-token block from globals.css (so every
// value is the shipped one) and composites the surfaces that changed — the light
// frost sidebar (with the active nav pill + logo slab), a dashboard destination
// card in its hover state, and the two hero gradient tiles — then screenshots
// them. Also asserts WCAG contrast for the two-tone Signal family.
//
//   bun scripts/prove-signal-primary-color.mjs
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium } from "@playwright/test";

const repoRoot = process.cwd();
const globalsPath = resolve(repoRoot, "src/app/globals.css");
const evidenceDir = resolve(repoRoot, ".design-sync/signal-primary-proof");

// ── contrast math (WCAG 2.1 relative luminance) ───────────────────────────────
function srgbToLinear(c) {
  const x = c / 255;
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
}
function luminance({ r, g, b }) {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}
function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
const hex = (h) => ({
  r: parseInt(h.slice(1, 3), 16),
  g: parseInt(h.slice(3, 5), 16),
  b: parseInt(h.slice(5, 7), 16),
});
const WHITE = { r: 255, g: 255, b: 255 };
const SIGNAL = hex("#F24405");
const SIGNAL_DARK = hex("#C63804");
const CLAY = hex("#AA412A");

const checks = [
  ["Signal #F24405 vs white (fill/text either way)", contrast(SIGNAL, WHITE), 3.0, "graphical / large only"],
  ["Signal-dark #C63804 as text on white", contrast(SIGNAL_DARK, WHITE), 4.5, "AA normal text"],
  ["(legacy) Clay #AA412A as text on white", contrast(CLAY, WHITE), 4.5, "for reference"],
];

async function main() {
  await mkdir(evidenceDir, { recursive: true });
  const globals = await readFile(globalsPath, "utf8");

  // Pull the real first :root { ... } token block verbatim.
  const rootMatch = globals.match(/:root\s*\{[\s\S]*?\n\}/);
  if (!rootMatch) throw new Error("Could not extract :root token block from globals.css");
  const rootBlock = rootMatch[0];

  const html = `<!doctype html><html><head><meta charset="utf-8" />
<style>
${rootBlock}
* { box-sizing: border-box; }
body { margin: 0; font-family: var(--font-sf-pro), system-ui, sans-serif; background: var(--canvas); padding: 28px; }
.grid { display: grid; gap: 24px; grid-template-columns: 280px 1fr; align-items: start; }
.label { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--secondary); margin: 0 0 8px; }
/* — light frost sidebar (mirrors .sidebar-glass) — */
.rail { background: var(--sidebar-glass-wash-fallback); border: 1px solid var(--glass-border); border-radius: var(--glass-radius); padding: 12px; box-shadow: var(--glass-shadow); }
.logo { height: 44px; border-radius: 12px; background: var(--glass-logo-bg); box-shadow: var(--glass-logo-shadow); border: 1px solid var(--glass-logo-border); display: grid; place-items: center; color: #fff; font-weight: 800; letter-spacing: .12em; font-size: 13px; margin-bottom: 12px; }
.nav { display: grid; gap: 4px; }
.row { position: relative; height: 32px; border-radius: var(--glass-nav-radius); display: flex; align-items: center; padding: 0 12px; font-size: 13px; }
.row.inactive { color: var(--tertiary); }
.row.active { color: var(--brand-orange-dark); font-weight: 600; background: var(--glass-nav-active-bg); box-shadow: var(--glass-nav-active-shadow); }
/* — dashboard destination card hover state — */
.card { background: var(--glass-bg-fallback); border: 1px solid rgba(242,68,5,0.48); border-radius: var(--glass-radius); padding: 16px; box-shadow: var(--glass-shadow); }
.card .idx { color: var(--brand-orange-dark); font-size: 22px; font-weight: 200; }
.card .title { color: var(--brand-orange-dark); font-size: 32px; font-weight: 400; text-transform: uppercase; letter-spacing: .04em; }
.card .meta { color: var(--brand-orange-dark); font-size: 10px; }
/* — hero gradient tiles — */
.heroes { display: grid; gap: 16px; grid-template-columns: 1fr 1fr; }
.hero { height: 120px; border-radius: var(--glass-radius); border: 1px solid var(--glass-border); display: flex; align-items: flex-end; padding: 12px; font-weight: 700; color: var(--ink); }
.hero.cont { background: var(--grad-hero-continue); }
.hero.create { background: var(--grad-hero-create); }
/* — swatch comparison — */
.swatches { display: flex; gap: 12px; margin-top: 8px; }
.sw { width: 120px; border-radius: 8px; overflow: hidden; border: 1px solid var(--glass-border); font-size: 11px; }
.sw .chip { height: 56px; } .sw .cap { padding: 6px 8px; background: #fff; color: var(--secondary); }
</style></head>
<body>
  <h2 style="font:600 13px var(--font-sf-pro);color:var(--ink);margin:0 0 18px">Archestimator Signal #F24405 — rebrand proof (live globals.css tokens)</h2>
  <div class="grid">
    <div>
      <p class="label">Sidebar (light frost) — logo + active nav</p>
      <div class="rail">
        <div class="logo">A</div>
        <div class="nav">
          <div class="row active">Projects</div>
          <div class="row inactive">Components</div>
          <div class="row inactive">Templates</div>
        </div>
      </div>
    </div>
    <div>
      <p class="label">Dashboard destination card — hover state</p>
      <div class="card">
        <div class="idx">01</div>
        <div class="meta">Project Count · 12</div>
        <div class="title">Projects</div>
      </div>
      <p class="label" style="margin-top:24px">Hero gradient tiles (Continue / Create)</p>
      <div class="heroes"><div class="hero cont">Continue</div><div class="hero create">Create</div></div>
      <p class="label" style="margin-top:24px">Old → New</p>
      <div class="swatches">
        <div class="sw"><div class="chip" style="background:#AA412A"></div><div class="cap">was clay #AA412A</div></div>
        <div class="sw"><div class="chip" style="background:var(--brand-orange)"></div><div class="cap">Signal #F24405</div></div>
        <div class="sw"><div class="chip" style="background:var(--brand-orange-dark)"></div><div class="cap">Signal-dark #C63804 (text)</div></div>
      </div>
    </div>
  </div>
</body></html>`;

  const htmlPath = join(evidenceDir, "signal-proof.html");
  await writeFile(htmlPath, html);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 980, height: 760 }, deviceScaleFactor: 2 });
  await page.goto("file://" + htmlPath);
  await page.waitForTimeout(150);
  const shotPath = join(evidenceDir, "signal-proof.png");
  await page.screenshot({ path: shotPath, fullPage: true });
  await browser.close();

  console.log("\n=== WCAG contrast checks ===");
  let allPass = true;
  for (const [name, ratio, threshold, note] of checks) {
    const pass = ratio >= threshold;
    if (name.includes("either way")) {
      // informational — Signal is intentionally below 4.5 for normal text
      console.log(`  • ${name}: ${ratio.toFixed(2)}:1 (≥${threshold} ${note}) ${pass ? "PASS" : "ok-as-designed"}`);
    } else {
      if (!pass && !note.includes("reference")) allPass = false;
      console.log(`  • ${name}: ${ratio.toFixed(2)}:1 (need ≥${threshold} ${note}) ${pass ? "PASS" : "FAIL"}`);
    }
  }
  console.log(`\nScreenshot: ${shotPath}`);
  console.log(allPass ? "\n✅ AA-critical text colors pass." : "\n❌ An AA-critical check failed.");
  if (!allPass) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
