#!/usr/bin/env bun

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, resolve, sep } from "node:path";

type AppRouteKind = "page" | "route-handler" | "metadata-route";
type ProviderDependency =
  | "supabase-client"
  | "supabase-rpc"
  | "supabase-storage"
  | "supabase-realtime"
  | "resend-email"
  | "vercel-runtime"
  | "cloudflare-local-proof";
type ScriptFamily = "cloudflare" | "launch" | "proof" | "performance" | "provider-readiness" | "other";

export type AppRouteInventoryRow = {
  route: string;
  file: string;
  kind: AppRouteKind;
  dynamic: boolean;
  providerDependencies: ProviderDependency[];
};

export type ProviderCouplingRow = {
  file: string;
  dependencies: ProviderDependency[];
  rpcNames: string[];
  route: string | null;
};

export type RpcCallRow = {
  name: string;
  callerFiles: string[];
};

export type PackageScriptRow = {
  name: string;
  command: string;
  family: ScriptFamily;
};

export type SqlInventory = {
  appliedMigrationFiles: number;
  pendingReviewFiles: number;
  functionDeclarationMatches: number;
  rlsPolicyStorageAuthMatches: number;
};

export type CloudflareMigrationInventory = {
  generatedAt: string;
  mode: "cloudflare-migration-inventory";
  sources: {
    appRoot: string;
    sourceRoots: string[];
    packageJson: string;
    scriptRoot: string;
    sqlRoots: string[];
  };
  counts: {
    appRoutes: number;
    pageRoutes: number;
    routeHandlers: number;
    metadataRoutes: number;
    providerCoupledFiles: number;
    distinctRpcNames: number;
    packageScripts: number;
    scriptFiles: number;
    cloudflareScripts: number;
    providerReadinessScripts: number;
  };
  appRoutes: AppRouteInventoryRow[];
  providerCoupling: ProviderCouplingRow[];
  rpcCalls: RpcCallRow[];
  packageScripts: PackageScriptRow[];
  sqlInventory: SqlInventory;
  note: string;
};

type InventoryInputs = {
  appFiles: string[];
  sourceFileTextByPath: Record<string, string>;
  packageJsonText: string;
  scriptFiles: string[];
  sqlFileTextByPath?: Record<string, string>;
  generatedAt?: string;
  sources?: Partial<CloudflareMigrationInventory["sources"]>;
};

const PLAN_ROOT = ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence";

const SOURCE_EXTENSIONS = new Set([".cjs", ".cts", ".js", ".jsx", ".mjs", ".mts", ".ts", ".tsx"]);
const SQL_EXTENSIONS = new Set([".sql"]);

const PROVIDER_RULES: Array<{ dependency: ProviderDependency; pattern: RegExp }> = [
  {
    dependency: "supabase-client",
    pattern: /@supabase\/(?:supabase-js|ssr)|createServerClient|createBrowserClient|createClient<|createClient\(/,
  },
  { dependency: "supabase-rpc", pattern: /\.rpc(?:<[^>]+>)?\s*\(/ },
  { dependency: "supabase-storage", pattern: /\.storage\.|storage\.from\(/ },
  { dependency: "supabase-realtime", pattern: /\.channel\s*\(|RealtimeChannel|\brealtime\b/i },
  { dependency: "resend-email", pattern: /@resend|new Resend\(|\bresend\b/i },
  { dependency: "vercel-runtime", pattern: /@vercel\/|VERCEL_|vercel\.json|Vercel/i },
  { dependency: "cloudflare-local-proof", pattern: /Cloudflare|R2Bucket|ImagesBinding|ExecutionContext|ARCH_UPLOADS_R2/ },
];

function readEnv(name: string) {
  const value = process.env[name];
  return value?.trim() || undefined;
}

function normalizeRepoPath(path: string) {
  return path.split(sep).join("/");
}

function toRepoRelativePath(path: string) {
  const normalized = normalizeRepoPath(path);
  const cwd = normalizeRepoPath(process.cwd());
  return normalized.startsWith(`${cwd}/`) ? normalized.slice(cwd.length + 1) : normalized;
}

function isSourceFile(path: string) {
  return SOURCE_EXTENSIONS.has(extname(path));
}

function isSqlFile(path: string) {
  return SQL_EXTENSIONS.has(extname(path));
}

function listFilesRecursively(path: string, includeFile: (path: string) => boolean) {
  if (!existsSync(path)) return [];
  const stats = statSync(path);
  if (stats.isFile()) return includeFile(path) ? [normalizeRepoPath(path)] : [];
  const files: string[] = [];

  for (const entry of readdirSync(path, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const childPath = resolve(path, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursively(childPath, includeFile));
    } else if (entry.isFile() && includeFile(childPath)) {
      files.push(normalizeRepoPath(childPath));
    }
  }

  return files.sort();
}

function readFiles(paths: string[]) {
  const textByPath: Record<string, string> = {};
  for (const path of paths) {
    textByPath[toRepoRelativePath(path)] = readFileSync(path, "utf8");
  }
  return textByPath;
}

function routePathFromSegments(segments: string[]) {
  const publicSegments = segments.filter((segment) => {
    if (!segment) return false;
    if (segment.startsWith("(") && segment.endsWith(")")) return false;
    if (segment.startsWith("@")) return false;
    return true;
  });
  return publicSegments.length === 0 ? "/" : `/${publicSegments.join("/")}`;
}

export function appRouteFromFile(file: string): Omit<AppRouteInventoryRow, "providerDependencies"> | null {
  const normalized = normalizeRepoPath(file);
  const marker = "src/app/";
  const appIndex = normalized.indexOf(marker);
  if (appIndex === -1) return null;
  const relativeAppPath = normalized.slice(appIndex + marker.length);
  const parts = relativeAppPath.split("/");
  const fileName = parts.at(-1);
  const segments = parts.slice(0, -1);

  if (fileName === "page.tsx") {
    const route = routePathFromSegments(segments);
    return {
      route,
      file: toRepoRelativePath(normalized),
      kind: "page",
      dynamic: route.includes("["),
    };
  }

  if (fileName === "route.ts") {
    const route = routePathFromSegments(segments);
    return {
      route,
      file: toRepoRelativePath(normalized),
      kind: "route-handler",
      dynamic: route.includes("["),
    };
  }

  if (fileName === "robots.ts") {
    return {
      route: "/robots.txt",
      file: toRepoRelativePath(normalized),
      kind: "metadata-route",
      dynamic: false,
    };
  }

  if (fileName === "sitemap.ts") {
    return {
      route: "/sitemap.xml",
      file: toRepoRelativePath(normalized),
      kind: "metadata-route",
      dynamic: false,
    };
  }

  return null;
}

export function extractRpcNames(input: string) {
  const names = new Set<string>();
  const regex = /\.rpc(?:<[^>]+>)?\s*\(\s*["']([A-Za-z0-9_]+)["']/g;
  for (const match of input.matchAll(regex)) {
    names.add(match[1]);
  }
  return [...names].sort();
}

function classifyProviderDependencies(input: string) {
  return PROVIDER_RULES
    .filter((rule) => rule.pattern.test(input))
    .map((rule) => rule.dependency)
    .sort();
}

function routeByFile(appRoutes: AppRouteInventoryRow[]) {
  return new Map(appRoutes.map((route) => [route.file, route.route]));
}

export function classifyPackageScript(name: string, command: string): ScriptFamily {
  if (name.startsWith("cf:")) return "cloudflare";
  if (name.startsWith("perf:")) return "performance";
  if (name.startsWith("prove:")) return "proof";
  if (name.startsWith("launch:check-supabase") || name.startsWith("launch:check-vercel") || name.startsWith("launch:check-resend")) {
    return "provider-readiness";
  }
  if (name.startsWith("launch:")) return "launch";
  if (/\b(supabase|vercel|resend)\b/i.test(command)) return "provider-readiness";
  return "other";
}

function extractPackageScripts(packageJsonText: string): PackageScriptRow[] {
  const parsed = JSON.parse(packageJsonText) as { scripts?: Record<string, string> };
  return Object.entries(parsed.scripts ?? {})
    .map(([name, command]) => ({
      name,
      command,
      family: classifyPackageScript(name, command),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function countSqlMatches(sqlFileTextByPath: Record<string, string> | undefined, pattern: RegExp) {
  if (!sqlFileTextByPath) return 0;
  let count = 0;
  for (const text of Object.values(sqlFileTextByPath)) {
    count += text.match(pattern)?.length ?? 0;
  }
  return count;
}

function countFilesUnder(sqlFileTextByPath: Record<string, string> | undefined, root: string) {
  if (!sqlFileTextByPath) return 0;
  return Object.keys(sqlFileTextByPath).filter((file) => file.startsWith(root)).length;
}

export function buildCloudflareMigrationInventory(inputs: InventoryInputs): CloudflareMigrationInventory {
  const appRoutes = inputs.appFiles
    .map(appRouteFromFile)
    .filter((route): route is Omit<AppRouteInventoryRow, "providerDependencies"> => Boolean(route))
    .map((route) => ({
      ...route,
      providerDependencies: classifyProviderDependencies(inputs.sourceFileTextByPath[route.file] ?? ""),
    }))
    .sort((a, b) => a.route.localeCompare(b.route) || a.file.localeCompare(b.file));

  const routeLookup = routeByFile(appRoutes);
  const providerCoupling = Object.entries(inputs.sourceFileTextByPath)
    .map(([file, text]) => ({
      file,
      dependencies: classifyProviderDependencies(text),
      rpcNames: extractRpcNames(text),
      route: routeLookup.get(file) ?? null,
    }))
    .filter((row) => row.dependencies.length > 0 || row.rpcNames.length > 0)
    .sort((a, b) => a.file.localeCompare(b.file));

  const rpcCallerFiles = new Map<string, Set<string>>();
  for (const [file, text] of Object.entries(inputs.sourceFileTextByPath)) {
    for (const name of extractRpcNames(text)) {
      const callers = rpcCallerFiles.get(name) ?? new Set<string>();
      callers.add(file);
      rpcCallerFiles.set(name, callers);
    }
  }
  const rpcCalls = [...rpcCallerFiles.entries()]
    .map(([name, callerFiles]) => ({ name, callerFiles: [...callerFiles].sort() }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const packageScripts = extractPackageScripts(inputs.packageJsonText);
  const sqlInventory: SqlInventory = {
    appliedMigrationFiles: countFilesUnder(inputs.sqlFileTextByPath, "supabase/migrations/"),
    pendingReviewFiles: countFilesUnder(inputs.sqlFileTextByPath, "supabase/migrations-pending-review/"),
    functionDeclarationMatches: countSqlMatches(
      inputs.sqlFileTextByPath,
      /create\s+(?:or\s+replace\s+)?function\s+public\.|create\s+function\s+public\./gi,
    ),
    rlsPolicyStorageAuthMatches: countSqlMatches(
      inputs.sqlFileTextByPath,
      /create\s+policy|alter\s+table\s+.*enable\s+row\s+level\s+security|storage\.objects|storage\.buckets|auth\.uid\(/gi,
    ),
  };

  return {
    generatedAt: inputs.generatedAt ?? new Date().toISOString(),
    mode: "cloudflare-migration-inventory",
    sources: {
      appRoot: inputs.sources?.appRoot ?? "src/app",
      sourceRoots: inputs.sources?.sourceRoots ?? ["src/app", "src/lib", "src/components", "src/hooks", "src/proxy"],
      packageJson: inputs.sources?.packageJson ?? "package.json",
      scriptRoot: inputs.sources?.scriptRoot ?? "scripts",
      sqlRoots: inputs.sources?.sqlRoots ?? ["supabase/migrations", "supabase/migrations-pending-review"],
    },
    counts: {
      appRoutes: appRoutes.length,
      pageRoutes: appRoutes.filter((route) => route.kind === "page").length,
      routeHandlers: appRoutes.filter((route) => route.kind === "route-handler").length,
      metadataRoutes: appRoutes.filter((route) => route.kind === "metadata-route").length,
      providerCoupledFiles: providerCoupling.length,
      distinctRpcNames: rpcCalls.length,
      packageScripts: packageScripts.length,
      scriptFiles: inputs.scriptFiles.length,
      cloudflareScripts: packageScripts.filter((script) => script.family === "cloudflare").length,
      providerReadinessScripts: packageScripts.filter((script) => script.family === "provider-readiness").length,
    },
    appRoutes,
    providerCoupling,
    rpcCalls,
    packageScripts,
    sqlInventory,
    note: "Local repository inventory only. It lists file paths, route paths, RPC names, script names, and counts; it does not read env files, print secret values, mutate providers, prove Cloudflare hosted deployment, prove D1/R2/Images/Email/Workers Paid readiness, change DNS, or make current providers removable.",
  };
}

function writeOutput(outputFile: string, inventory: CloudflareMigrationInventory) {
  const outputPath = resolve(outputFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(inventory, null, 2)}\n`);
}

function markdownRows(rows: string[][]) {
  return rows.map((row) => `| ${row.join(" | ")} |`);
}

export function writeMarkdown(inventory: CloudflareMigrationInventory, markdownFile: string) {
  const outputPath = resolve(markdownFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  const topProviderRows = inventory.providerCoupling.slice(0, 40).map((row) => [
    `\`${row.file}\``,
    row.route ?? "",
    row.dependencies.join(", "),
    row.rpcNames.length === 0 ? "" : row.rpcNames.join(", "),
  ]);
  const rpcRows = inventory.rpcCalls.slice(0, 80).map((row) => [
    `\`${row.name}\``,
    String(row.callerFiles.length),
    row.callerFiles.slice(0, 4).map((file) => `\`${file}\``).join("<br>"),
  ]);
  const scriptRows = inventory.packageScripts
    .filter((script) => script.family !== "other")
    .map((script) => [`\`${script.name}\``, script.family, `\`${script.command.replaceAll("|", "\\|")}\``]);
  const lines = [
    "# Cloudflare Migration Inventory",
    "",
    `Generated: ${inventory.generatedAt}`,
    "",
    inventory.note,
    "",
    "## Counts",
    "",
    "| Item | Count |",
    "| --- | ---: |",
    `| App routes | ${inventory.counts.appRoutes} |`,
    `| Page routes | ${inventory.counts.pageRoutes} |`,
    `| Route handlers | ${inventory.counts.routeHandlers} |`,
    `| Metadata routes | ${inventory.counts.metadataRoutes} |`,
    `| Provider-coupled source files | ${inventory.counts.providerCoupledFiles} |`,
    `| Distinct app-code RPC names | ${inventory.counts.distinctRpcNames} |`,
    `| Package scripts | ${inventory.counts.packageScripts} |`,
    `| Script files | ${inventory.counts.scriptFiles} |`,
    `| Cloudflare package scripts | ${inventory.counts.cloudflareScripts} |`,
    `| Provider readiness package scripts | ${inventory.counts.providerReadinessScripts} |`,
    `| Applied SQL migration files | ${inventory.sqlInventory.appliedMigrationFiles} |`,
    `| Pending-review SQL files | ${inventory.sqlInventory.pendingReviewFiles} |`,
    `| SQL function declaration/update matches | ${inventory.sqlInventory.functionDeclarationMatches} |`,
    `| RLS/policy/storage/auth SQL matches | ${inventory.sqlInventory.rlsPolicyStorageAuthMatches} |`,
    "",
    "## Top Provider-Coupled Files",
    "",
    "The JSON artifact contains the full file list. This table shows the first 40 sorted matches.",
    "",
    "| File | Route | Dependencies | RPC names |",
    "| --- | --- | --- | --- |",
    ...markdownRows(topProviderRows),
    "",
    "## RPC Caller Catalog",
    "",
    "The JSON artifact contains every caller file. This table shows up to 80 RPCs with the first four callers per RPC.",
    "",
    "| RPC | Caller file count | Sample callers |",
    "| --- | ---: | --- |",
    ...markdownRows(rpcRows),
    "",
    "## Readiness And Proof Scripts",
    "",
    "| Script | Family | Command |",
    "| --- | --- | --- |",
    ...markdownRows(scriptRows),
    "",
  ];
  writeFileSync(outputPath, lines.join("\n"));
}

function collectRepoInputs(): InventoryInputs {
  const appFiles = listFilesRecursively(resolve("src/app"), isSourceFile).map(toRepoRelativePath);
  const sourceRoots = ["src/app", "src/lib", "src/components", "src/hooks", "src/proxy", "src/proxy.ts"]
    .map((path) => resolve(path))
    .filter(existsSync);
  const sourceFiles = sourceRoots.flatMap((root) => listFilesRecursively(root, isSourceFile)).map(toRepoRelativePath);
  const scriptFiles = listFilesRecursively(resolve("scripts"), isSourceFile).map(toRepoRelativePath);
  const sqlRoots = ["supabase/migrations", "supabase/migrations-pending-review"].map((path) => resolve(path)).filter(existsSync);
  const sqlFiles = sqlRoots.flatMap((root) => listFilesRecursively(root, isSqlFile)).map(toRepoRelativePath);

  return {
    appFiles,
    sourceFileTextByPath: readFiles(sourceFiles),
    packageJsonText: readFileSync("package.json", "utf8"),
    scriptFiles,
    sqlFileTextByPath: readFiles(sqlFiles),
    sources: {
      appRoot: "src/app",
      sourceRoots: sourceRoots.map(toRepoRelativePath),
      packageJson: "package.json",
      scriptRoot: "scripts",
      sqlRoots: sqlRoots.map(toRepoRelativePath),
    },
  };
}

async function main() {
  const inventory = buildCloudflareMigrationInventory(collectRepoInputs());
  const outputFile = readEnv("OUTPUT_FILE") ?? `${PLAN_ROOT}/2026-06-30-cloudflare-migration-inventory.json`;
  const markdownFile = readEnv("MARKDOWN_FILE") ?? `${PLAN_ROOT}/2026-06-30-cloudflare-migration-inventory.md`;
  writeOutput(outputFile, inventory);
  writeMarkdown(inventory, markdownFile);
  console.log(JSON.stringify(inventory, null, 2));
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
