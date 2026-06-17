#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd();
const maxPx = 12;
const labelLikeTextSizeLimitPx = 9;
const secondaryTextSizeLimitPx = 10;
const scannedRoots = ["src/app", "src/components"];
const landingAllowlist = new Set([
  "src/app/page.tsx",
  "src/app/about/page.tsx",
  "src/app/contact/page.tsx",
  "src/app/features/page.tsx",
  "src/app/pricing/page.tsx",
]);
const landingAllowlistPrefixes = ["src/components/landing/"];
// The public /share proposal surface is a documented "Client Portal" exception: it is
// allowed a larger type scale (label floor 12px, prose body ~15-16px) than the compact
// app/workshop system. It is EXEMPT ONLY from the three px-threshold rules
// (maxPx, labelLikeTextSizeLimitPx, secondaryTextSizeLimitPx). Every other rule
// (named-size prohibition, regular/medium weight, rounded-xs, tracking-0, icon weight,
// reference tokens) still applies. The exemption is path-scoped, never app-wide.
const sharePxExemptPrefixes = ["src/app/share/", "src/components/share/"];
// Border-radius values permitted in app/workshop CSS. The xs token is the default
// system rule; the two `--glass-*` radii are the documented, sidebar-scoped
// "glass surface" exception (authorized 2026-06-17, recorded in DESIGN.md). These
// tokens are only consumed by the liquid-glass sidebar surface classes.
const allowedBorderRadiusValues = new Set([
  "3px",
  "var(--radius-xs)",
  "var(--glass-radius)",
  "var(--glass-nav-radius)",
]);
const ignoredDirs = new Set(["node_modules", ".next", ".git"]);
const scannedExtensions = new Set([".tsx", ".ts", ".jsx", ".js", ".css"]);
const namedTextSizes = new Map([
  ["text-xs", 12],
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
const secondaryTextToneClasses = [
  "text-secondary",
  "text-tertiary",
  "text-muted",
  "text-muted-foreground",
  "text-gray-400",
];
const primaryToneClasses = [
  "text-ink",
  "text-foreground",
  "text-danger",
  "text-success",
  "text-accent",
  "text-[#3F7FBF]",
  "text-[#C86161]",
];
const disallowedFontWeightClasses = [
  "font-thin",
  "font-extralight",
  "font-light",
  "font-semibold",
  "font-bold",
  "font-extrabold",
  "font-black",
  "font-mono",
  "font-serif",
  "font-poppins",
];
const requiredGlobals = new Map([
  ["--ink", "#3D3D3D"],
  ["--secondary", "#5d5d5d"],
  ["--tertiary", "#7f7f7f"],
  ["--surface-muted", "#f5f5f5"],
  ["--hairline", "#f2f2f2"],
  ["--divider", "#f2f2f2"],
  ["--font-sf-pro", "\"SF Pro Text\", \"SF Pro Display\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"],
  ["--radius-xs", "3px"],
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

function classLikePattern(klass) {
  return new RegExp(`(?:^|[^A-Za-z0-9_-])(?:[a-z0-9_-]+:)*!?${klass}(?:[^A-Za-z0-9_-]|$)`, "g");
}

function normalizedClassToken(token) {
  const withoutImportant = token.replace(/^!/, "");
  const parts = withoutImportant.split(":");
  return parts[parts.length - 1];
}

function hasClassToken(line, klass) {
  return classLikePattern(klass).test(line);
}

function textSizesOnLine(line) {
  const sizes = [];
  for (const [klass, px] of namedTextSizes) {
    if (hasClassToken(line, klass)) sizes.push({ label: klass, px, named: true });
  }
  for (const match of line.matchAll(/(?:^|[^A-Za-z0-9_-])(?:[a-z0-9_-]+:)*!?text-\[([0-9.]+)(px|rem)\]/g)) {
    const px = pxFromArbitrary(match[1], match[2]);
    if (px !== null) sizes.push({ label: `text-[${match[1]}${match[2]}]`, px, named: false });
  }
  return sizes;
}

function includesAnyClass(line, classes) {
  return classes.some((klass) => hasClassToken(line, klass));
}

/** True when `rel` is inside the public /share proposal surface (px-threshold exempt). */
export function isSharePxExemptPath(rel) {
  const normalized = rel.split("\\").join("/");
  return sharePxExemptPrefixes.some((prefix) => normalized.startsWith(prefix));
}

/** Collect every design-system violation for a single file's source text. */
export function collectFileViolations(rel, text) {
  const fileViolations = [];
  const shareExempt = isSharePxExemptPath(rel);
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    const lineTextSizes = textSizesOnLine(line);

    for (const { label, px, named } of lineTextSizes) {
      if (named) {
        fileViolations.push(`${rel}:${index + 1} uses ${label}. App/workshop typography must use explicit text-[8px], text-[9px], text-[10px], text-[11px], or text-[12px] role sizes.`);
      }

      if (px > maxPx && !shareExempt) {
        fileViolations.push(`${rel}:${index + 1} uses ${label} (${px}px). App/workshop text must stay at or below ${maxPx}px.`);
      }
    }

    if (!shareExempt && lineTextSizes.some(({ px }) => px > labelLikeTextSizeLimitPx) && hasClassToken(line, "uppercase")) {
      fileViolations.push(`${rel}:${index + 1} uses uppercase label/meta text above ${labelLikeTextSizeLimitPx}px. Labels, eyebrows, metadata, and section kickers must be 8-9px and never larger than paired input/control text.`);
    }

    if (
      !shareExempt &&
      lineTextSizes.some(({ px }) => px > secondaryTextSizeLimitPx) &&
      includesAnyClass(line, secondaryTextToneClasses) &&
      !includesAnyClass(line, primaryToneClasses)
    ) {
      fileViolations.push(`${rel}:${index + 1} uses secondary/supporting text above ${secondaryTextSizeLimitPx}px. Subheaders, descriptions, muted values, and helper copy must stay below true headers and controls.`);
    }

    for (const match of line.matchAll(/(?:^|[^A-Za-z0-9_-])(?:[a-z0-9_-]+:)*!?text-\[([0-9.]+)(px|rem)\]/g)) {
      const px = pxFromArbitrary(match[1], match[2]);
      if (px !== null && px > maxPx && !shareExempt) {
        fileViolations.push(`${rel}:${index + 1} uses text-[${match[1]}${match[2]}] (${px}px). App/workshop text must stay at or below ${maxPx}px.`);
      }
    }

    for (const match of line.matchAll(/font-size\s*:\s*([0-9.]+)(px|rem)/g)) {
      const px = pxFromArbitrary(match[1], match[2]);
      if (px !== null && px > maxPx && !shareExempt) {
        fileViolations.push(`${rel}:${index + 1} uses font-size ${match[1]}${match[2]} (${px}px). App/workshop text must stay at or below ${maxPx}px.`);
      }
    }

    for (const klass of disallowedFontWeightClasses) {
      if (classLikePattern(klass).test(line)) {
        fileViolations.push(`${rel}:${index + 1} uses ${klass}. App typography must be SF Pro regular or medium only.`);
      }
    }

    for (const match of line.matchAll(/(?:^|[\s"'`])((?:[a-z0-9_-]+:)*!?rounded(?:-[^\s"'`{}),]+)?)/g)) {
      const base = normalizedClassToken(match[1]);
      if (base !== "rounded-xs") {
        fileViolations.push(`${rel}:${index + 1} uses ${match[1]}. App border radius must be rounded-xs only.`);
      }
    }

    for (const match of line.matchAll(/border-radius\s*:\s*([^;]+);/g)) {
      const value = match[1].trim();
      if (!allowedBorderRadiusValues.has(value)) {
        fileViolations.push(`${rel}:${index + 1} uses border-radius ${value}. App border radius must be xs only.`);
      }
    }

    for (const match of line.matchAll(/(?:^|[^A-Za-z0-9_-])(?:[a-z0-9_-]+:)*!?(tracking-[^\s"'`{}),]+)/g)) {
      if (normalizedClassToken(match[1]) !== "tracking-normal") {
        fileViolations.push(`${rel}:${index + 1} uses ${match[1]}. App letter spacing must stay at 0.`);
      }
    }

    for (const match of line.matchAll(/letter-spacing\s*:\s*([^;]+);/g)) {
      const value = match[1].trim();
      if (value !== "0" && value !== "0px" && value !== "0em" && value !== "normal") {
        fileViolations.push(`${rel}:${index + 1} uses letter-spacing ${value}. App letter spacing must stay at 0.`);
      }
    }

    if (/weight=\{?["'](?:bold|duotone|fill)["']\}?/.test(line) || /weight=\{[^}]*["'](?:bold|duotone|fill)["'][^}]*\}/.test(line)) {
      fileViolations.push(`${rel}:${index + 1} uses a bold/fill/duotone icon weight. App icons must use regular 1px-outline-style iconography.`);
    }
  });
  return fileViolations;
}

/** Validate the required design tokens in globals.css. */
export function collectGlobalsViolations(globalsCss) {
  const out = [];
  for (const [name, expectedValue] of requiredGlobals) {
    const re = new RegExp(`${name}\\s*:\\s*([^;]+);`);
    const match = globalsCss.match(re);
    const actualValue = match?.[1]?.trim();
    if (actualValue?.toLowerCase() !== expectedValue.toLowerCase()) {
      out.push(`src/app/globals.css requires ${name}: ${expectedValue}; found ${actualValue ?? "missing"}`);
    }
  }
  return out;
}

/** Walk the scanned roots from `scanRoot` and collect every violation. */
export function collectAllViolations(scanRoot = root) {
  const violations = [];
  violations.push(...collectGlobalsViolations(readFileSync(join(scanRoot, "src/app/globals.css"), "utf8")));
  for (const scannedRoot of scannedRoots) {
    for (const absolute of walk(join(scanRoot, scannedRoot))) {
      const rel = relative(scanRoot, absolute);
      if (landingAllowlist.has(rel) || landingAllowlistPrefixes.some((prefix) => rel.startsWith(prefix))) continue;
      violations.push(...collectFileViolations(rel, readFileSync(absolute, "utf8")));
    }
  }
  return violations;
}

function runCli() {
  const violations = collectAllViolations(root);
  if (violations.length) {
    console.error("App/workshop design-system enforcement failed outside landing-approved surfaces.");
    console.error(violations.join("\n"));
    process.exit(1);
  }
  console.log("App/workshop design-system enforcement passed: compact hierarchy, 12px font-size cap, SF/system stack, regular/medium weight, xs radius, zero tracking, reference tokens, and regular icons.");
}

// Only run the CLI when invoked directly (`node scripts/enforce-app-design-system.mjs`),
// so the module can be imported by the guard test without side effects.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCli();
}
