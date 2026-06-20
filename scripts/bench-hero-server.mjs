#!/usr/bin/env node
// Low-noise hero-path SERVER timing: authenticated full-document response time per route
// against a local `next start` production build. This isolates server render time (which the
// A4 client-memoization + A6 loader-parallelization target) from client/browser noise.
//
// Auth: reuses the Playwright storage-state captured at /tmp/hero-storage-state.json
// (cookies only; never printed). Usage: node scripts/bench-hero-server.mjs [n] [label]

import fs from "node:fs";

const BASE = process.env.BENCH_BASE_URL || "http://localhost:3000";
const N = parseInt(process.argv[2] || "15", 10);
const LABEL = process.argv[3] || "prod";

const ss = JSON.parse(fs.readFileSync("/tmp/hero-storage-state.json", "utf8"));
const cookieHeader = ss.cookies.map((c) => `${c.name}=${c.value}`).join("; ");

const P = "/workshop/projects/22222222-2222-4222-8222-222222222222";
const ROUTES = [
  ["workshop", "/workshop"],
  ["projects", "/workshop/projects"],
  ["project", P],
  ["estimates", `${P}/estimates`],
  ["sheet", `${P}/estimates/bf254cbd-13d4-4dbf-b21a-84b171cdd6db`],
];

async function timeReq(url) {
  const t = performance.now();
  const res = await fetch(url, { headers: { Cookie: cookieHeader, Accept: "text/html" }, redirect: "manual" });
  const body = await res.text();
  const ms = performance.now() - t;
  const loc = res.headers.get("location") || "";
  return { ms, status: res.status, len: body.length, authed: res.status < 400 && !loc.includes("/login") };
}
const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};
const pct = (a, p) => {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};

console.log(`Hero SERVER timing — n=${N} label=${LABEL} base=${BASE}`);
const out = {};
for (const [name, path] of ROUTES) {
  const url = BASE + path;
  await timeReq(url);
  await timeReq(url); // warm (twice)
  const samples = [];
  let status, authed, len;
  for (let i = 0; i < N; i++) {
    const r = await timeReq(url);
    samples.push(r.ms);
    status = r.status;
    authed = r.authed;
    len = r.len;
  }
  const med = median(samples);
  out[name] = {
    path,
    medianMs: Math.round(med),
    minMs: Math.round(Math.min(...samples)),
    p75Ms: Math.round(pct(samples, 75)),
    maxMs: Math.round(Math.max(...samples)),
    status,
    authed,
    bytes: len,
    samples: samples.map((x) => Math.round(x)),
  };
  console.log(
    `${name.padEnd(10)} median=${Math.round(med)}ms  min=${Math.round(Math.min(...samples))}  p75=${Math.round(pct(samples, 75))}  max=${Math.round(Math.max(...samples))}  status=${status} authed=${authed} bytes=${len}`,
  );
}

const dir = ".ai/03_plans/202-06-20-Hero-Path-Performance-Audit-And-Improvement/benchmarks";
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(`${dir}/hero-server-${LABEL}.json`, JSON.stringify({ generatedAt: new Date().toISOString(), base: BASE, n: N, routes: out }, null, 2));
console.log(`\nwrote ${dir}/hero-server-${LABEL}.json`);
