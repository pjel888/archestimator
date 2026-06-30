#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import * as ts from "typescript";

type WranglerConfig = {
  $schema?: string;
  name?: string;
  main?: string;
  compatibility_date?: string;
  compatibility_flags?: string[];
  assets?: { binding?: string };
  images?: { binding?: string };
  r2_buckets?: Array<{ binding?: string }>;
  d1_databases?: Array<{ binding?: string }>;
  kv_namespaces?: Array<{ binding?: string }>;
  queues?: {
    producers?: Array<{ binding?: string }>;
  };
  durable_objects?: {
    bindings?: Array<{ name?: string }>;
  };
  services?: Array<{ binding?: string }>;
  analytics_engine_datasets?: Array<{ binding?: string }>;
  hyperdrive?: Array<{ binding?: string }>;
  triggers?: { crons?: string[] };
  observability?: ObservabilityConfig;
  vars?: Record<string, unknown>;
  secrets?: unknown;
};

type WranglerSchema = {
  $ref?: string;
  definitions?: Record<string, { properties?: Record<string, unknown> }>;
};

type PackageVersions = Record<string, string | null>;

type ObservabilityConfig = {
  enabled?: boolean;
  head_sampling_rate?: number;
  logs?: {
    enabled?: boolean;
    head_sampling_rate?: number;
    invocation_logs?: boolean;
    persist?: boolean;
  };
  traces?: {
    enabled?: boolean;
    head_sampling_rate?: number;
    persist?: boolean;
  };
};

export type BindingTypegenRow = {
  binding: string;
  presentInGeneratedTypes: boolean;
};

export type CloudflarePlatformToolchainReport = {
  generatedAt: string;
  mode: "cloudflare-platform-toolchain";
  sources: {
    packageJson: string;
    wranglerConfig: string;
    wranglerSchema: string;
    generatedEnvTypes: string;
  };
  versions: PackageVersions;
  wranglerConfig: {
    parsed: boolean;
    name: string | null;
    main: string | null;
    compatibilityDate: string | null;
    compatibilityDateAgeDays: number | null;
    compatibilityDateWithin30Days: boolean;
    nodejsCompatEnabled: boolean;
    observabilityConfigured: boolean;
    observability: {
      configured: boolean;
      enabled: boolean | null;
      headSamplingRate: number | null;
      logsEnabled: boolean | null;
      logsHeadSamplingRate: number | null;
      logsInvocationLogs: boolean | null;
      logsPersist: boolean | null;
      tracesEnabled: boolean | null;
      tracesHeadSamplingRate: number | null;
      tracesPersist: boolean | null;
    };
    cronCount: number;
    configuredKeys: string[];
    unsupportedKeys: string[];
    schemaSupportedConfiguredKeys: boolean;
    configuredBindings: string[];
  };
  generatedTypes: {
    exists: boolean;
    hasCloudflareEnvInterface: boolean;
    runtimeTypesLine: string | null;
    bindingRows: BindingTypegenRow[];
    allConfiguredBindingsTyped: boolean;
  };
  readiness: {
    localToolchainSnapshotReady: boolean;
    directWorkersTypesInstalled: boolean;
    productionDeployReady: boolean;
  };
  note: string;
};

type ToolchainInputs = {
  generatedAt?: string;
  packageVersions: PackageVersions;
  wranglerConfigText: string | null;
  wranglerSchema: WranglerSchema | null;
  envTypesText: string | null;
  sources?: Partial<CloudflarePlatformToolchainReport["sources"]>;
};

const DEFAULT_SOURCES = {
  packageJson: "package.json",
  wranglerConfig: "wrangler.jsonc",
  wranglerSchema: "node_modules/wrangler/config-schema.json",
  generatedEnvTypes: "cloudflare-env.d.ts",
};

const PACKAGE_PATHS = {
  wrangler: "node_modules/wrangler/package.json",
  "@opennextjs/cloudflare": "node_modules/@opennextjs/cloudflare/package.json",
  "@cloudflare/workers-types": "node_modules/@cloudflare/workers-types/package.json",
  next: "node_modules/next/package.json",
  typescript: "node_modules/typescript/package.json",
} as const;

function readEnv(name: string) {
  const value = process.env[name];
  return value?.trim() || undefined;
}

function readFileIfExists(path: string) {
  return existsSync(path) ? readFileSync(path, "utf8") : null;
}

function readJsonIfExists<T>(path: string) {
  return existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as T) : null;
}

function readPackageVersions(): PackageVersions {
  const versions: PackageVersions = {};
  for (const [name, path] of Object.entries(PACKAGE_PATHS)) {
    const packageJson = readJsonIfExists<{ version?: string }>(path);
    versions[name] = packageJson?.version ?? null;
  }
  return versions;
}

function parseJsonc<T>(text: string, fileName: string): T {
  const result = ts.parseConfigFileTextToJson(fileName, text);
  if (result.error) {
    const message = ts.flattenDiagnosticMessageText(result.error.messageText, "\n");
    throw new Error(`Could not parse ${fileName}: ${message}`);
  }
  return result.config as T;
}

function resolveWranglerConfigProperties(schema: WranglerSchema | null) {
  const refName = schema?.$ref?.startsWith("#/definitions/") ? schema.$ref.slice("#/definitions/".length) : "RawConfig";
  return schema?.definitions?.[refName]?.properties ?? schema?.definitions?.RawConfig?.properties ?? {};
}

function daysBetween(generatedAt: string, dateValue: string | null) {
  if (!dateValue) return null;
  const generatedTime = Date.parse(generatedAt);
  const compatibilityTime = Date.parse(`${dateValue}T00:00:00.000Z`);
  if (!Number.isFinite(generatedTime) || !Number.isFinite(compatibilityTime)) return null;
  return Math.floor((generatedTime - compatibilityTime) / 86_400_000);
}

function unique(values: Array<string | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort();
}

function collectBindingNames(config: WranglerConfig) {
  return unique([
    config.assets?.binding,
    config.images?.binding,
    ...(config.r2_buckets ?? []).map((binding) => binding.binding),
    ...(config.d1_databases ?? []).map((binding) => binding.binding),
    ...(config.kv_namespaces ?? []).map((binding) => binding.binding),
    ...(config.queues?.producers ?? []).map((binding) => binding.binding),
    ...(config.durable_objects?.bindings ?? []).map((binding) => binding.name),
    ...(config.services ?? []).map((binding) => binding.binding),
    ...(config.analytics_engine_datasets ?? []).map((binding) => binding.binding),
    ...(config.hyperdrive ?? []).map((binding) => binding.binding),
  ]);
}

function samplingRate(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function booleanSetting(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function summarizeObservability(config: ObservabilityConfig | undefined) {
  return {
    configured: config !== undefined,
    enabled: booleanSetting(config?.enabled),
    headSamplingRate: samplingRate(config?.head_sampling_rate),
    logsEnabled: booleanSetting(config?.logs?.enabled),
    logsHeadSamplingRate: samplingRate(config?.logs?.head_sampling_rate),
    logsInvocationLogs: booleanSetting(config?.logs?.invocation_logs),
    logsPersist: booleanSetting(config?.logs?.persist),
    tracesEnabled: booleanSetting(config?.traces?.enabled),
    tracesHeadSamplingRate: samplingRate(config?.traces?.head_sampling_rate),
    tracesPersist: booleanSetting(config?.traces?.persist),
  };
}

export function buildCloudflarePlatformToolchainReport(
  inputs: ToolchainInputs,
): CloudflarePlatformToolchainReport {
  const generatedAt = inputs.generatedAt ?? new Date().toISOString();
  const config = inputs.wranglerConfigText
    ? parseJsonc<WranglerConfig>(inputs.wranglerConfigText, inputs.sources?.wranglerConfig ?? DEFAULT_SOURCES.wranglerConfig)
    : null;
  const schemaProperties = resolveWranglerConfigProperties(inputs.wranglerSchema);
  const configuredKeys = unique(Object.keys(config ?? {}));
  const unsupportedKeys = configuredKeys.filter((key) => !schemaProperties[key]);
  const configuredBindings = config ? collectBindingNames(config) : [];
  const ageDays = daysBetween(generatedAt, config?.compatibility_date ?? null);
  const observability = summarizeObservability(config?.observability);
  const bindingRows = configuredBindings.map((binding) => ({
    binding,
    presentInGeneratedTypes: inputs.envTypesText?.includes(`${binding}:`) === true,
  }));
  const allConfiguredBindingsTyped =
    configuredBindings.length > 0 && bindingRows.every((row) => row.presentInGeneratedTypes);
  const runtimeTypesLine =
    inputs.envTypesText
      ?.split(/\r?\n/)
      .find((line) => line.includes("Runtime types generated with")) ?? null;

  const schemaSupportedConfiguredKeys = config !== null && unsupportedKeys.length === 0;
  const compatibilityDateWithin30Days = ageDays !== null && ageDays >= 0 && ageDays <= 30;
  const localToolchainSnapshotReady =
    Boolean(inputs.packageVersions.wrangler) &&
    Boolean(inputs.packageVersions["@opennextjs/cloudflare"]) &&
    config !== null &&
    schemaSupportedConfiguredKeys &&
    compatibilityDateWithin30Days &&
    config?.compatibility_flags?.includes("nodejs_compat") === true &&
    inputs.envTypesText !== null &&
    inputs.envTypesText.includes("interface CloudflareEnv") &&
    allConfiguredBindingsTyped;

  return {
    generatedAt,
    mode: "cloudflare-platform-toolchain",
    sources: {
      ...DEFAULT_SOURCES,
      ...inputs.sources,
    },
    versions: inputs.packageVersions,
    wranglerConfig: {
      parsed: config !== null,
      name: config?.name ?? null,
      main: config?.main ?? null,
      compatibilityDate: config?.compatibility_date ?? null,
      compatibilityDateAgeDays: ageDays,
      compatibilityDateWithin30Days,
      nodejsCompatEnabled: config?.compatibility_flags?.includes("nodejs_compat") === true,
      observabilityConfigured: observability.configured,
      observability,
      cronCount: config?.triggers?.crons?.length ?? 0,
      configuredKeys,
      unsupportedKeys,
      schemaSupportedConfiguredKeys,
      configuredBindings,
    },
    generatedTypes: {
      exists: inputs.envTypesText !== null,
      hasCloudflareEnvInterface: inputs.envTypesText?.includes("interface CloudflareEnv") === true,
      runtimeTypesLine,
      bindingRows,
      allConfiguredBindingsTyped,
    },
    readiness: {
      localToolchainSnapshotReady,
      directWorkersTypesInstalled: Boolean(inputs.packageVersions["@cloudflare/workers-types"]),
      productionDeployReady: false,
    },
    note:
      "Local Cloudflare toolchain snapshot only. It validates installed package versions, Wrangler schema/config support, compatibility-date freshness, nodejs_compat, generated type coverage, and binding names without reading env files or provider secrets. It does not prove Wrangler/API authentication, hosted deployment, custom domains, remote bindings, provider usage, observability receipt, Workers Paid, or production cutover readiness.",
  };
}

function writeOutput(outputFile: string, report: CloudflarePlatformToolchainReport) {
  const outputPath = resolve(outputFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

function markdownRows(rows: string[][]) {
  return rows.map((row) => `| ${row.map((cell) => cell.replaceAll("|", "\\|")).join(" | ")} |`);
}

export function writeMarkdown(report: CloudflarePlatformToolchainReport, markdownFile: string) {
  const outputPath = resolve(markdownFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  const versionRows = Object.entries(report.versions).map(([name, version]) => [name, version ?? "missing"]);
  const bindingRows = report.generatedTypes.bindingRows.map((row) => [
    row.binding,
    row.presentInGeneratedTypes ? "yes" : "no",
  ]);
  const lines = [
    "# Cloudflare Platform Toolchain Snapshot",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    report.note,
    "",
    "## Readiness",
    "",
    "| Gate | Ready |",
    "| --- | --- |",
    `| Local toolchain snapshot ready | ${report.readiness.localToolchainSnapshotReady ? "yes" : "no"} |`,
    `| Direct workers-types package installed | ${report.readiness.directWorkersTypesInstalled ? "yes" : "no"} |`,
    `| Production deploy ready | ${report.readiness.productionDeployReady ? "yes" : "no"} |`,
    "",
    "## Versions",
    "",
    "| Package | Version |",
    "| --- | --- |",
    ...markdownRows(versionRows),
    "",
    "## Wrangler Config",
    "",
    "| Check | Value |",
    "| --- | --- |",
    `| Parsed | ${report.wranglerConfig.parsed ? "yes" : "no"} |`,
    `| Name | ${report.wranglerConfig.name ?? ""} |`,
    `| Main | ${report.wranglerConfig.main ?? ""} |`,
    `| Compatibility date | ${report.wranglerConfig.compatibilityDate ?? ""} |`,
    `| Compatibility date age days | ${report.wranglerConfig.compatibilityDateAgeDays ?? ""} |`,
    `| Compatibility date within 30 days | ${report.wranglerConfig.compatibilityDateWithin30Days ? "yes" : "no"} |`,
    `| nodejs_compat enabled | ${report.wranglerConfig.nodejsCompatEnabled ? "yes" : "no"} |`,
    `| Observability configured | ${report.wranglerConfig.observabilityConfigured ? "yes" : "no"} |`,
    `| Observability enabled | ${report.wranglerConfig.observability.enabled ?? ""} |`,
    `| Observability sample rate | ${report.wranglerConfig.observability.headSamplingRate ?? ""} |`,
    `| Logs enabled | ${report.wranglerConfig.observability.logsEnabled ?? ""} |`,
    `| Logs sample rate | ${report.wranglerConfig.observability.logsHeadSamplingRate ?? ""} |`,
    `| Invocation logs | ${report.wranglerConfig.observability.logsInvocationLogs ?? ""} |`,
    `| Logs persisted | ${report.wranglerConfig.observability.logsPersist ?? ""} |`,
    `| Traces enabled | ${report.wranglerConfig.observability.tracesEnabled ?? ""} |`,
    `| Traces sample rate | ${report.wranglerConfig.observability.tracesHeadSamplingRate ?? ""} |`,
    `| Traces persisted | ${report.wranglerConfig.observability.tracesPersist ?? ""} |`,
    `| Cron count | ${report.wranglerConfig.cronCount} |`,
    `| Configured keys supported by schema | ${report.wranglerConfig.schemaSupportedConfiguredKeys ? "yes" : "no"} |`,
    `| Unsupported keys | ${report.wranglerConfig.unsupportedKeys.join(", ")} |`,
    "",
    "## Generated Binding Types",
    "",
    "| Binding | Present in generated types |",
    "| --- | --- |",
    ...markdownRows(bindingRows),
    "",
    `Runtime types line: ${report.generatedTypes.runtimeTypesLine ?? ""}`,
    "",
  ];
  writeFileSync(outputPath, lines.join("\n"));
}

function collectRepoInputs(): ToolchainInputs {
  const wranglerConfigFile = readEnv("CLOUDFLARE_WRANGLER_CONFIG_FILE") ?? DEFAULT_SOURCES.wranglerConfig;
  const wranglerSchemaFile = readEnv("CLOUDFLARE_WRANGLER_SCHEMA_FILE") ?? DEFAULT_SOURCES.wranglerSchema;
  const envTypesFile = readEnv("CLOUDFLARE_ENV_TYPES_FILE") ?? DEFAULT_SOURCES.generatedEnvTypes;
  return {
    packageVersions: readPackageVersions(),
    wranglerConfigText: readFileIfExists(wranglerConfigFile),
    wranglerSchema: readJsonIfExists<WranglerSchema>(wranglerSchemaFile),
    envTypesText: readFileIfExists(envTypesFile),
    sources: {
      wranglerConfig: wranglerConfigFile,
      wranglerSchema: wranglerSchemaFile,
      generatedEnvTypes: envTypesFile,
    },
  };
}

async function main() {
  const report = buildCloudflarePlatformToolchainReport(collectRepoInputs());
  const outputFile = readEnv("OUTPUT_FILE");
  const markdownFile = readEnv("MARKDOWN_FILE");
  if (outputFile) writeOutput(outputFile, report);
  if (markdownFile) writeMarkdown(report, markdownFile);
  console.log(JSON.stringify(report, null, 2));
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
