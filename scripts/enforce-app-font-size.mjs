#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const maxPx = 12;
const scannedRoots = ["src/app", "src/components"];
const landingAllowlist = new Set([
  "src/app/page.tsx",
  "src/app/about/page.tsx",
  "src/app/contact/page.tsx",
  "src/app/features/page.tsx",
  "src/app/pricing/page.tsx",
]);
const landingAllowlistPrefixes = [
  "src/components/landing/",
];
const ignoredDirs = new Set(["node_modules", ".next", ".git"]);
const scannedExtensions = new Set([".tsx", ".ts", ".jsx", ".js", ".css"]);
const namedTextSizes = new Map([
  ["text-sm", 14],
  ["text-base", 16],
  ["text-lg", 18],
  ["text-xl", 20],
  ["text-2xl", 24],
  ["text-3xl", 30],
  ["text-4xl", 36],
  ["text-5xl", 48],
  ["text-6xl", 60],
  ["text-7xl", 72],
  ["text-8xl", 96],
  ["text-9xl", 128],
]);

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const absolute = join(dir, entry);
    const stat = statSync(absolute);
    if (stat.isDirectory()) {
      if (!ignoredDirs.has(entry)) walk(absolute, files);
      continue;
    }
    const ext = entry.slice(entry.lastIndexOf("."));
    if (scannedExtensions.has(ext)) files.push(absolute);
  }
  return files;
}

function pxFromArbitrary(value, unit) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (unit === "px") return n;
  if (unit === "rem") return n * 16;
  return null;
}

const violations = [];
for (const scannedRoot of scannedRoots) {
  for (const absolute of walk(join(root, scannedRoot))) {
    const rel = relative(root, absolute);
    if (landingAllowlist.has(rel) || landingAllowlistPrefixes.some((prefix) => rel.startsWith(prefix))) continue;
    const text = readFileSync(absolute, "utf8");
    const lines = text.split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const [klass, px] of namedTextSizes) {
        const re = new RegExp(`(?:^|[^A-Za-z0-9_-])(?:[a-z0-9_-]+:)*!?${klass}(?:[^A-Za-z0-9_-]|$)`, "g");
        if (px > maxPx && re.test(line)) {
          violations.push(`${rel}:${index + 1} uses ${klass} (${px}px): ${line.trim()}`);
        }
      }
      for (const match of line.matchAll(/(?:^|[^A-Za-z0-9_-])(?:[a-z0-9_-]+:)*!?text-\[([0-9.]+)(px|rem)\]/g)) {
        const px = pxFromArbitrary(match[1], match[2]);
        if (px && px > maxPx) {
          violations.push(`${rel}:${index + 1} uses text-[${match[1]}${match[2]}] (${px}px): ${line.trim()}`);
        }
      }
      for (const match of line.matchAll(/font-size\s*:\s*([0-9.]+)(px|rem)/g)) {
        const px = pxFromArbitrary(match[1], match[2]);
        if (px && px > maxPx) {
          violations.push(`${rel}:${index + 1} uses font-size ${match[1]}${match[2]} (${px}px): ${line.trim()}`);
        }
      }
    });
  }
}

if (violations.length) {
  console.error(`App/workshop typography cap failed. Max allowed outside landing-approved surfaces is ${maxPx}px.`);
  console.error(violations.join("\n"));
  process.exit(1);
}

console.log(`App/workshop typography cap passed: no font-size utilities above ${maxPx}px outside the landing page.`);
