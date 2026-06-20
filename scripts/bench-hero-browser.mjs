#!/usr/bin/env node
// Production hero-path soft-navigation benchmark, driven through the user's REAL
// authenticated browser via the Kimi WebBridge daemon (http://127.0.0.1:10086).
//
// Why: `next dev` numbers are compilation-dominated and meaningless for production
// claims. This measures real client-side route transitions against a local `next start`
// production build, in the real signed-in browser — what a real user actually feels.
//
// Signal: the app's own `[data-route-overlay]` (the same signal the Playwright harness
// scripts/measure-route-transitions.ts uses), so numbers are comparable to that tool.
// Per transition: pre-wait (untimed) for the destination link to exist, then capture
// t0 + native-click it in ONE evaluate that returns immediately (no spanning evaluate
// -> no mid-nav detach), then poll wall-clock in-page until pathname===target AND the
// route overlay is hidden. Duration = overlayHiddenTime - t0 (both captured in-page).
//
// Usage:  node scripts/bench-hero-browser.mjs [runs] [label]
// Env: BENCH_BASE_URL (default http://localhost:3000)

const BRIDGE = "http://127.0.0.1:10086/command";
const SESSION = "hero-perf-benchmark";
const BASE = process.env.BENCH_BASE_URL || "http://localhost:3000";
const RUNS = parseInt(process.argv[2] || process.env.RUNS || "5", 10);
const LABEL = process.argv[3] || process.env.LABEL || "prod";

const PROJECT = "22222222-2222-4222-8222-222222222222";
const NODE_ID = "bf254cbd-13d4-4dbf-b21a-84b171cdd6db";
const P = `/workshop/projects/${PROJECT}`;
const STEPS = [
  { name: "Workshop to Projects", to: "/workshop/projects" },
  { name: "Projects to Target Project", to: P },
  { name: "Target Project to Estimates", to: `${P}/estimates` },
  { name: "Estimates to Target Estimate", to: `${P}/estimates/${NODE_ID}` },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isTransient = (m) => /navigated or closed|extension_error|target|detached|-32000|Cannot find context/i.test(m || "");

async function cmdOnce(action, args) {
  const res = await fetch(BRIDGE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, args, session: SESSION }),
  });
  const j = await res.json();
  if (!j.ok) throw new Error(`bridge ${action} failed: ${JSON.stringify(j)}`);
  return j.data;
}
async function cmd(action, args, tries = 6) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      return await cmdOnce(action, args);
    } catch (e) {
      lastErr = e;
      if (!isTransient(e.message)) throw e;
      await sleep(500 + i * 250);
    }
  }
  throw lastErr;
}
const evaluate = async (code) => (await cmd("evaluate", { code })).value;
const navigate = (url) => cmd("navigate", { url, active: true });

async function waitReady(expectPrefix = "/workshop", timeoutMs = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      const s = JSON.parse(
        await evaluate(`JSON.stringify({rs:document.readyState,p:location.pathname,n:document.querySelectorAll('a[href]').length})`),
      );
      if (s.rs === "complete" && s.p.startsWith(expectPrefix) && s.n > 3) return s;
    } catch {
      /* transient */
    }
    await sleep(300);
  }
  return null;
}

async function waitForSelector(sel, timeout = 12000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    try {
      const ok = JSON.parse(await evaluate(`JSON.stringify({ok:!!document.querySelector(${JSON.stringify(sel)})})`)).ok;
      if (ok) return true;
    } catch {
      /* transient */
    }
    await sleep(120);
  }
  return false;
}

// One transition. Assumes the browser is on the correct "from" page.
async function measureStep(step) {
  const to = step.to.replace(/\/+$/, "");
  const linkSel = `a[href="${step.to}"]`;
  if (!(await waitForSelector(linkSel))) {
    let here = "?";
    try { here = JSON.parse(await evaluate(`JSON.stringify({p:location.pathname})`)).p; } catch {}
    return { step: step.name, error: "no-link", here };
  }
  const clickCode = `(()=>{const el=document.querySelector(${JSON.stringify(linkSel)});if(!el)return JSON.stringify({error:'gone'});const t=Date.now();el.click();return JSON.stringify({t})})()`;
  let t0;
  try {
    const r = JSON.parse(await evaluate(clickCode));
    if (r.error) return { step: step.name, error: r.error };
    t0 = r.t;
  } catch (e) {
    if (!isTransient(e.message)) throw e;
    return { step: step.name, error: "detach-on-click" };
  }
  const deadline = Date.now() + 25000;
  let sawOverlay = false;
  while (Date.now() < deadline) {
    try {
      const pollCode = `(()=>{const tgt=${JSON.stringify(to)};const ov=document.querySelector('[data-route-overlay]');const cs=ov?getComputedStyle(ov):null;const ovVis=!!ov&&ov.getClientRects().length>0&&cs.visibility!=='hidden'&&cs.display!=='none'&&cs.opacity!=='0';return JSON.stringify({now:Date.now(),matched:location.pathname.replace(/\\/+$/,'')===tgt,ovVis})})()`;
      const s = JSON.parse(await evaluate(pollCode));
      sawOverlay = sawOverlay || s.ovVis;
      if (s.matched && !s.ovVis && (sawOverlay || s.now - t0 > 600)) {
        return { step: step.name, durationMs: s.now - t0, sawOverlay };
      }
    } catch {
      /* transient during nav */
    }
    await sleep(50);
  }
  return { step: step.name, error: "timeout" };
}

async function runOnce() {
  await navigate(`${BASE}/workshop`);
  if (!(await waitReady("/workshop"))) throw new Error("workshop did not become ready");
  await sleep(400);
  const results = [];
  for (const step of STEPS) {
    const r = await measureStep(step);
    results.push(r);
    if (r.error) break;
    await sleep(400);
  }
  return results;
}

function median(a) {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

(async () => {
  console.log(`Hero browser benchmark — runs=${RUNS} label=${LABEL} base=${BASE}`);
  console.log("warm-up run (discarded)...");
  const warm = await runOnce();
  console.log("warm-up: " + warm.map((x) => `${x.step.split(" to ")[1] || x.step}=${x.error ? "ERR:" + x.error + (x.here ? "@" + x.here : "") : x.durationMs}`).join("  "));

  const perStep = Object.fromEntries(STEPS.map((s) => [s.name, []]));
  const allRuns = [];
  for (let i = 0; i < RUNS; i++) {
    const r = await runOnce();
    allRuns.push(r);
    for (const x of r) if (typeof x.durationMs === "number" && !x.error) perStep[x.step].push(x.durationMs);
    console.log(`run ${i + 1}: ` + r.map((x) => `${x.step.split(" to ")[1] || x.step}=${x.error ? "ERR:" + x.error : x.durationMs}`).join("  "));
  }

  const summary = STEPS.map((s) => ({
    scenario: s.name,
    samples: perStep[s.name],
    median: median(perStep[s.name]),
    max: perStep[s.name].length ? Math.max(...perStep[s.name]) : null,
    n: perStep[s.name].length,
  }));
  console.log("\n=== SUMMARY (median / max ms) ===");
  for (const s of summary) console.log(`${s.scenario}: median=${s.median} max=${s.max} (n=${s.n})`);

  const out = { generatedAt: new Date().toISOString(), label: LABEL, base: BASE, runs: RUNS, mode: "next-start-production-real-browser-softnav-overlay", summary, allRuns };
  const fs = await import("node:fs");
  const dir = ".ai/03_plans/202-06-20-Hero-Path-Performance-Audit-And-Improvement/benchmarks";
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(`${dir}/hero-browser-${LABEL}.json`, JSON.stringify(out, null, 2));
  console.log(`\nwrote ${dir}/hero-browser-${LABEL}.json`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
