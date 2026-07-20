#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd();
const maxPx = 12;
const labelLikeTextSizeLimitPx = 9;
const secondaryTextSizeLimitPx = 10;
// Design enforcement is opt-in by authenticated ownership. Public routes and
// public-owned components are never scanned, including /, /new, auth entry,
// marketing, legal, invite, share, and client-portal surfaces.
const scannedRoots = [
  "src/app/admin",
  "src/app/workshop",
  "src/components/admin",
  "src/components/sidebar",
  "src/components/workshop",
];
// Legacy classification exports remain for old diagnostics. The CLI no longer
// uses a public allowlist because it scans authenticated-owned roots only.
const landingAllowlist = new Set([
  "src/app/page.tsx",
  "src/app/login/page.tsx",
  "src/app/signup/page.tsx",
  "src/app/trust/page.tsx",
  "src/app/about/page.tsx",
  "src/app/contact/page.tsx",
  "src/app/features/page.tsx",
  "src/app/pricing/page.tsx",
]);
const landingAllowlistPrefixes = [
  "src/components/landing/",
  "src/components/landing-v3/",
  "src/components/auth/",
  "src/components/frontdoor/",
];
// Legacy helper retained for compatibility with old focused diagnostics. The
// CLI never sends public /share files through the rule evaluator.
const sharePxExemptPrefixes = ["src/app/share/", "src/components/share/"];
// The Workshop Dashboard ("command center" homebase) is its OWN exploratory
// design language (owner directive 2026-06-18: "don't be constrained by DESIGN.md"
// for the dashboard bento redesign). The whole dashboard directory is fully exempt
// from the compact app/workshop enforcement so it can use display type, the Roboto
// Mono voice, color-blocking, rich gradients, larger card radii, and reversed-out
// type. Path-scoped to this directory only — never an app-wide disable. (Naming
// kept as `*PxExempt*` for back-compat with the guard test's import.)
const dashboardPxExemptPrefixes = ["src/components/workshop/dashboard/"];
// Border-radius values permitted in app/workshop CSS. The xs token is the default
// system rule; the two `--glass-*` radii are the documented, sidebar-scoped
// "glass surface" exception (authorized 2026-06-17, recorded in DESIGN.md). These
// tokens are only consumed by the liquid-glass sidebar surface classes.
const allowedBorderRadiusValues = new Set([
  "3px",
  "var(--radius-xs)",
  "var(--glass-radius)",
  "var(--glass-nav-radius)",
  // Dashboard bento image/hub cards alias the 12px glass radius via this token.
  "var(--image-card-radius)",
  // Project cards use a documented two-layer glass radius system that is
  // asserted by project-card layout tests.
  "var(--project-card-base-radius)",
  "var(--project-card-inner-radius)",
  // `inherit` is not a magic radius — it adopts the parent surface's corner so
  // pseudo-element overlays (grain, scrims) match the card they sit on.
  "inherit",
]);
const allowedRoundedClassTokens = new Set([
  "rounded-xs",
  "rounded-[var(--project-card-base-radius)]",
  "rounded-[var(--project-card-inner-radius)]",
  "rounded-b-[var(--project-card-inner-radius)]",
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

/** True when `rel` is inside the Workshop Dashboard surface (its own design language). */
export function isDashboardPxExemptPath(rel) {
  const normalized = rel.split("\\").join("/");
  return dashboardPxExemptPrefixes.some((prefix) => normalized.startsWith(prefix));
}

/** True when `rel` is a public landing/auth brand surface excluded from app/workshop enforcement. */
export function isLandingApprovedPath(rel) {
  const normalized = rel.split("\\").join("/");
  return landingAllowlist.has(normalized) || landingAllowlistPrefixes.some((prefix) => normalized.startsWith(prefix));
}

/** Collect design-system violations for an authenticated-owned source file. */
export function collectFileViolations(rel, text) {
  const fileViolations = [];
  // The Workshop Dashboard ("command center" homebase) is its own exploratory
  // design language (owner directive 2026-06-18): the entire dashboard directory
  // is FULLY exempt from the compact app/workshop enforcement so the bento
  // redesign can use display type, the Roboto Mono voice, color-blocking, rich
  // multi-layer gradients, larger card radii, and reversed-out type. Path-scoped
  // to the dashboard directory only — never an app-wide disable.
  if (isDashboardPxExemptPath(rel)) return fileViolations;
  const shareExempt = isSharePxExemptPath(rel);
  // The /share Client Portal lifts ONLY the three px-threshold rules; every other
  // rule below stays enforced everywhere outside the dashboard.
  const pxExempt = shareExempt;
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    const lineTextSizes = textSizesOnLine(line);

    if (rel !== "src/app/globals.css" && /#fffdf8/i.test(line)) {
      fileViolations.push(`${rel}:${index + 1} hard-codes #FFFDF8. Use the proposalPaper token instead.`);
    }

    for (const { label, px, named } of lineTextSizes) {
      if (named) {
        fileViolations.push(`${rel}:${index + 1} uses ${label}. App/workshop typography must use explicit text-[8px], text-[9px], text-[10px], text-[11px], or text-[12px] role sizes.`);
      }

      if (px > maxPx && !pxExempt) {
        fileViolations.push(`${rel}:${index + 1} uses ${label} (${px}px). App/workshop text must stay at or below ${maxPx}px.`);
      }
    }

    if (!pxExempt && lineTextSizes.some(({ px }) => px > labelLikeTextSizeLimitPx) && hasClassToken(line, "uppercase")) {
      fileViolations.push(`${rel}:${index + 1} uses uppercase label/meta text above ${labelLikeTextSizeLimitPx}px. Labels, eyebrows, metadata, and section kickers must be 8-9px and never larger than paired input/control text.`);
    }

    if (
      !pxExempt &&
      lineTextSizes.some(({ px }) => px > secondaryTextSizeLimitPx) &&
      includesAnyClass(line, secondaryTextToneClasses) &&
      !includesAnyClass(line, primaryToneClasses)
    ) {
      fileViolations.push(`${rel}:${index + 1} uses secondary/supporting text above ${secondaryTextSizeLimitPx}px. Subheaders, descriptions, muted values, and helper copy must stay below true headers and controls.`);
    }

    for (const match of line.matchAll(/(?:^|[^A-Za-z0-9_-])(?:[a-z0-9_-]+:)*!?text-\[([0-9.]+)(px|rem)\]/g)) {
      const px = pxFromArbitrary(match[1], match[2]);
      if (px !== null && px > maxPx && !pxExempt) {
        fileViolations.push(`${rel}:${index + 1} uses text-[${match[1]}${match[2]}] (${px}px). App/workshop text must stay at or below ${maxPx}px.`);
      }
    }

    for (const match of line.matchAll(/font-size\s*:\s*([0-9.]+)(px|rem)/g)) {
      const px = pxFromArbitrary(match[1], match[2]);
      if (px !== null && px > maxPx && !pxExempt) {
        fileViolations.push(`${rel}:${index + 1} uses font-size ${match[1]}${match[2]} (${px}px). App/workshop text must stay at or below ${maxPx}px.`);
      }
    }

    for (const klass of disallowedFontWeightClasses) {
      if (classLikePattern(klass).test(line)) {
        fileViolations.push(`${rel}:${index + 1} uses ${klass}. App typography must be SF Pro regular or medium only.`);
      }
    }

    for (const match of line.matchAll(/(?:^|[\s"'`])((?:[a-z0-9_-]+:)*!?rounded(?:-[^\s"'`{},]+)?)/g)) {
      const base = normalizedClassToken(match[1]);
      if (!allowedRoundedClassTokens.has(base)) {
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

/** Walk the scanned roots from `scanRoot` and collect every violation. */
export function collectAllViolations(scanRoot = root) {
  const violations = [];
  for (const scannedRoot of scannedRoots) {
    for (const absolute of walk(join(scanRoot, scannedRoot))) {
      const rel = relative(scanRoot, absolute);
      violations.push(...collectFileViolations(rel, readFileSync(absolute, "utf8")));
    }
  }
  return violations;
}

function runCli() {
  const violations = collectAllViolations(root);
  if (violations.length) {
    console.error("Authenticated app/workshop design-system enforcement failed.");
    console.error(violations.join("\n"));
    process.exit(1);
  }
  console.log("Authenticated app/workshop design-system enforcement passed. Public routes and public-owned components were not scanned.");
}

// Only run the CLI when invoked directly (`node scripts/enforce-app-design-system.mjs`),
// so the module can be imported by the guard test without side effects.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCli();
}
