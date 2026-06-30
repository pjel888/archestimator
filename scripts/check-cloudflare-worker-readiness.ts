#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const ENV_EXAMPLE_REQUIRED_NAMES = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SITE_URL",
  "ARCHESTIMATOR_ALLOWED_APP_ORIGINS",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CLOSED_BETA_ACCESS_ENABLED",
  "PUBLICATION_TOKEN_ENCRYPTION_SECRET",
  "PUBLICATION_TOKEN_HASH_SECRET",
  "PUBLICATION_ACCESS_COOKIE_SECRET",
  "ARCHESTIMATOR_AI_ENABLED",
  "NEXT_PUBLIC_ASK_FLIP_UI_ENABLED",
  "NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN",
  "ARCHESTIMATOR_AUTH_PROVIDER",
  "BETTER_AUTH_URL",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_TRUSTED_ORIGINS",
  "BETTER_AUTH_GOOGLE_CLIENT_ID",
  "BETTER_AUTH_GOOGLE_CLIENT_SECRET",
  "ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED",
  "ARCHESTIMATOR_EMAIL_PROVIDER",
  "CLOUDFLARE_EMAIL_FROM",
  "CLOUDFLARE_EMAIL_REPLY_TO",
  "CRON_SECRET",
  "UPLOAD_CLEANUP_JOB_SECRET",
  "UPLOAD_SCAN_JOB_SECRET",
  "UPLOAD_JOBS_ENABLED",
  "CLOUDFLARE_UPLOAD_JOBS_DRY_RUN",
  "CLOUDFLARE_UPLOAD_JOBS_ORIGIN",
  "ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER",
  "ARCHESTIMATOR_IMAGE_PROCESSING_PROVIDER",
] as const;

const DEV_VARS_EXAMPLE_REQUIRED_NAMES = [
  "CRON_SECRET",
  "UPLOAD_CLEANUP_JOB_SECRET",
  "UPLOAD_SCAN_JOB_SECRET",
  "UPLOAD_JOBS_ENABLED",
  "CLOUDFLARE_UPLOAD_JOBS_DRY_RUN",
  "CLOUDFLARE_UPLOAD_JOBS_ORIGIN",
  "ARCHESTIMATOR_AUTH_PROVIDER",
  "BETTER_AUTH_URL",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_TRUSTED_ORIGINS",
  "BETTER_AUTH_GOOGLE_CLIENT_ID",
  "BETTER_AUTH_GOOGLE_CLIENT_SECRET",
  "ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED",
  "ARCHESTIMATOR_EMAIL_PROVIDER",
  "CLOUDFLARE_EMAIL_FROM",
  "CLOUDFLARE_EMAIL_REPLY_TO",
  "PUBLICATION_TOKEN_ENCRYPTION_SECRET",
  "PUBLICATION_TOKEN_HASH_SECRET",
  "PUBLICATION_ACCESS_COOKIE_SECRET",
  "ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER",
  "ARCHESTIMATOR_IMAGE_PROCESSING_PROVIDER",
] as const;

const LOCAL_PREVIEW_SECRET_NAMES = [
  "PUBLICATION_TOKEN_ENCRYPTION_SECRET",
  "PUBLICATION_TOKEN_HASH_SECRET",
  "PUBLICATION_ACCESS_COOKIE_SECRET",
] as const;

const LOCAL_PREVIEW_CONTROL_NAMES = [
  "UPLOAD_JOBS_ENABLED",
  "CLOUDFLARE_UPLOAD_JOBS_DRY_RUN",
  "CLOUDFLARE_UPLOAD_JOBS_ORIGIN",
  "ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER",
  "ARCHESTIMATOR_IMAGE_PROCESSING_PROVIDER",
] as const;

export const DEPLOYED_WORKER_SECRET_NAMES = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SITE_URL",
  "ARCHESTIMATOR_ALLOWED_APP_ORIGINS",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CLOSED_BETA_ACCESS_ENABLED",
  "PUBLICATION_TOKEN_ENCRYPTION_SECRET",
  "PUBLICATION_TOKEN_HASH_SECRET",
  "PUBLICATION_ACCESS_COOKIE_SECRET",
  "ARCHESTIMATOR_AI_ENABLED",
  "NEXT_PUBLIC_ASK_FLIP_UI_ENABLED",
  "ARCHESTIMATOR_AUTH_PROVIDER",
  "BETTER_AUTH_URL",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_TRUSTED_ORIGINS",
  "BETTER_AUTH_GOOGLE_CLIENT_ID",
  "BETTER_AUTH_GOOGLE_CLIENT_SECRET",
  "ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED",
  "ARCHESTIMATOR_EMAIL_PROVIDER",
  "CLOUDFLARE_EMAIL_FROM",
  "CLOUDFLARE_EMAIL_REPLY_TO",
  "CRON_SECRET",
  "UPLOAD_CLEANUP_JOB_SECRET",
  "UPLOAD_SCAN_JOB_SECRET",
  "UPLOAD_JOBS_ENABLED",
  "CLOUDFLARE_UPLOAD_JOBS_DRY_RUN",
  "CLOUDFLARE_UPLOAD_JOBS_ORIGIN",
  "ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER",
  "ARCHESTIMATOR_IMAGE_PROCESSING_PROVIDER",
] as const;

const REQUIRED_WORKER_BINDINGS = ["ASSETS", "ARCH_UPLOADS_R2", "IMAGES", "UPLOAD_JOBS_QUEUE", "EMAIL"] as const;
const REQUIRED_CUSTOM_DOMAIN_ROUTES = ["archestimator.com", "www.archestimator.com"] as const;
const REQUIRED_CRON_TRIGGERS = ["0 3 * * *", "15 3 * * *"] as const;
const REQUIRED_OBSERVABILITY_SETTINGS = [
  "observability.enabled",
  "observability.head_sampling_rate<=0.1",
  "observability.logs.enabled",
  "observability.logs.head_sampling_rate<=0.1",
  "observability.logs.invocation_logs",
  "observability.logs.persist",
  "observability.traces.enabled",
  "observability.traces.head_sampling_rate<=0.05",
  "observability.traces.persist",
] as const;
const REQUIRED_PACKAGE_SCRIPTS = [
  "cf:build",
  "cf:preview",
  "cf:deploy",
  "cf:typegen",
  "cf:verify-preview-routes",
  "cf:check-readiness",
] as const;

type GroupResult = {
  required: string[];
  present: string[];
  missing: string[];
  ready: boolean;
};

type LocalDevVarsResult = {
  checked: boolean;
  source: string | null;
  previewSecrets: GroupResult;
  previewControls: GroupResult;
  ready: boolean;
};

type ProviderSecretListResult = {
  checked: boolean;
  source: string | null;
  deployedWorkerSecrets: GroupResult;
  ready: boolean;
};

export type CloudflareWorkerReadinessResult = {
  generatedAt: string;
  mode: "cloudflare-worker-readiness";
  sources: {
    envExample: string;
    devVarsExample: string;
    wranglerConfig: string;
    packageJson: string;
  };
  envExample: GroupResult;
  devVarsExample: GroupResult;
  wranglerBindings: GroupResult;
  wranglerCustomDomains: GroupResult;
  wranglerCrons: GroupResult;
  wranglerObservability: GroupResult;
  packageScripts: GroupResult;
  localDevVars: LocalDevVarsResult;
  providerSecretList: ProviderSecretListResult;
  manifestReady: boolean;
  localPreviewReady: boolean;
  deploymentSecretsReady: boolean;
  deploymentReady: boolean;
  note: string;
};

type EnvAssignmentState = {
  names: string[];
  nonEmptyNames: string[];
};

type CheckInputs = {
  envExampleText: string;
  devVarsExampleText: string;
  wranglerConfigText: string;
  packageJsonText: string;
  sources?: Partial<CloudflareWorkerReadinessResult["sources"]>;
  localDevVarsText?: string | null;
  localDevVarsSource?: string | null;
  providerSecretListText?: string | null;
  providerSecretListSource?: string | null;
};

function readEnv(name: string) {
  const value = process.env[name];
  return value?.trim() || undefined;
}

export function extractEnvAssignmentStates(input: string): EnvAssignmentState {
  const names: string[] = [];
  const nonEmptyNames: string[] = [];

  for (const line of input.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^(?:export\s+)?([A-Z][A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match) continue;
    const name = match[1];
    const rawValue = match[2].trim();
    const unquoted = rawValue.replace(/^(['"])(.*)\1$/, "$2").trim();
    names.push(name);
    if (unquoted.length > 0) nonEmptyNames.push(name);
  }

  return {
    names: Array.from(new Set(names)).sort(),
    nonEmptyNames: Array.from(new Set(nonEmptyNames)).sort(),
  };
}

export function extractCloudflareSecretNames(input: string) {
  return Array.from(new Set(input.match(/\b[A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+\b/g) ?? [])).sort();
}

function evaluateGroup(required: readonly string[], discoveredNames: readonly string[]): GroupResult {
  const discovered = new Set(discoveredNames);
  const present = required.filter((name) => discovered.has(name));
  const missing = required.filter((name) => !discovered.has(name));
  return {
    required: [...required],
    present,
    missing,
    ready: missing.length === 0,
  };
}

function stripJsonComments(input: string) {
  let output = "";
  let inString = false;
  let escaped = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      output += char;
      continue;
    }

    if (char === "/" && next === "/") {
      while (index < input.length && input[index] !== "\n") index += 1;
      output += "\n";
      continue;
    }

    if (char === "/" && next === "*") {
      index += 2;
      while (index < input.length && !(input[index] === "*" && input[index + 1] === "/")) index += 1;
      index += 1;
      continue;
    }

    output += char;
  }

  return output;
}

function parseJsonc<T>(input: string): T {
  return JSON.parse(stripJsonComments(input)) as T;
}

function extractWranglerBindingNames(input: string) {
  const parsed = parseJsonc<{
    assets?: { binding?: string };
    images?: { binding?: string };
    r2_buckets?: Array<{ binding?: string }>;
    send_email?: Array<{ name?: string }>;
    queues?: {
      producers?: Array<{ binding?: string }>;
    };
  }>(input);
  return [
    parsed.assets?.binding,
    parsed.images?.binding,
    ...(parsed.r2_buckets ?? []).map((bucket) => bucket.binding),
    ...(parsed.send_email ?? []).map((binding) => binding.name),
    ...(parsed.queues?.producers ?? []).map((producer) => producer.binding),
  ].filter((binding): binding is string => Boolean(binding)).sort();
}

function extractWranglerCustomDomains(input: string) {
  const parsed = parseJsonc<{
    routes?: Array<string | { pattern?: string; custom_domain?: boolean }>;
  }>(input);
  return (parsed.routes ?? [])
    .map((route) => {
      if (typeof route === "string") return null;
      return route.custom_domain === true ? route.pattern : null;
    })
    .filter((pattern): pattern is string => Boolean(pattern))
    .sort();
}

function extractWranglerCrons(input: string) {
  const parsed = parseJsonc<{ triggers?: { crons?: string[] } }>(input);
  return [...(parsed.triggers?.crons ?? [])].sort();
}

function samplingRateAtMost(value: unknown, max: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value <= max;
}

function extractWranglerObservabilitySettings(input: string) {
  const parsed = parseJsonc<{
    observability?: {
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
  }>(input);
  const settings: string[] = [];
  if (parsed.observability?.enabled === true) settings.push("observability.enabled");
  if (samplingRateAtMost(parsed.observability?.head_sampling_rate, 0.1)) {
    settings.push("observability.head_sampling_rate<=0.1");
  }
  if (parsed.observability?.logs?.enabled === true) settings.push("observability.logs.enabled");
  if (samplingRateAtMost(parsed.observability?.logs?.head_sampling_rate, 0.1)) {
    settings.push("observability.logs.head_sampling_rate<=0.1");
  }
  if (parsed.observability?.logs?.invocation_logs === true) settings.push("observability.logs.invocation_logs");
  if (parsed.observability?.logs?.persist === true) settings.push("observability.logs.persist");
  if (parsed.observability?.traces?.enabled === true) settings.push("observability.traces.enabled");
  if (samplingRateAtMost(parsed.observability?.traces?.head_sampling_rate, 0.05)) {
    settings.push("observability.traces.head_sampling_rate<=0.05");
  }
  if (parsed.observability?.traces?.persist === true) settings.push("observability.traces.persist");
  return settings.sort();
}

function extractPackageScriptNames(input: string) {
  const parsed = JSON.parse(input) as { scripts?: Record<string, string> };
  return Object.keys(parsed.scripts ?? {}).sort();
}

function evaluateLocalDevVars(input: string | null | undefined, source: string | null | undefined): LocalDevVarsResult {
  if (!input) {
    const emptySecrets = evaluateGroup(LOCAL_PREVIEW_SECRET_NAMES, []);
    const emptyControls = evaluateGroup(LOCAL_PREVIEW_CONTROL_NAMES, []);
    return {
      checked: false,
      source: source ?? null,
      previewSecrets: emptySecrets,
      previewControls: emptyControls,
      ready: false,
    };
  }

  const assignmentStates = extractEnvAssignmentStates(input);
  const previewSecrets = evaluateGroup(LOCAL_PREVIEW_SECRET_NAMES, assignmentStates.nonEmptyNames);
  const previewControls = evaluateGroup(LOCAL_PREVIEW_CONTROL_NAMES, assignmentStates.nonEmptyNames);

  return {
    checked: true,
    source: source ?? ".dev.vars",
    previewSecrets,
    previewControls,
    ready: previewSecrets.ready && previewControls.ready,
  };
}

function evaluateProviderSecretList(input: string | null | undefined, source: string | null | undefined): ProviderSecretListResult {
  if (!input) {
    const deployedWorkerSecrets = evaluateGroup(DEPLOYED_WORKER_SECRET_NAMES, []);
    return {
      checked: false,
      source: source ?? null,
      deployedWorkerSecrets,
      ready: false,
    };
  }

  const deployedWorkerSecrets = evaluateGroup(DEPLOYED_WORKER_SECRET_NAMES, extractCloudflareSecretNames(input));
  return {
    checked: true,
    source: source ?? "provided-text",
    deployedWorkerSecrets,
    ready: deployedWorkerSecrets.ready,
  };
}

export function checkCloudflareWorkerReadiness(inputs: CheckInputs): CloudflareWorkerReadinessResult {
  const envExample = evaluateGroup(ENV_EXAMPLE_REQUIRED_NAMES, extractEnvAssignmentStates(inputs.envExampleText).names);
  const devVarsExample = evaluateGroup(DEV_VARS_EXAMPLE_REQUIRED_NAMES, extractEnvAssignmentStates(inputs.devVarsExampleText).names);
  const wranglerBindings = evaluateGroup(REQUIRED_WORKER_BINDINGS, extractWranglerBindingNames(inputs.wranglerConfigText));
  const wranglerCustomDomains = evaluateGroup(
    REQUIRED_CUSTOM_DOMAIN_ROUTES,
    extractWranglerCustomDomains(inputs.wranglerConfigText),
  );
  const wranglerCrons = evaluateGroup(REQUIRED_CRON_TRIGGERS, extractWranglerCrons(inputs.wranglerConfigText));
  const wranglerObservability = evaluateGroup(
    REQUIRED_OBSERVABILITY_SETTINGS,
    extractWranglerObservabilitySettings(inputs.wranglerConfigText),
  );
  const packageScripts = evaluateGroup(REQUIRED_PACKAGE_SCRIPTS, extractPackageScriptNames(inputs.packageJsonText));
  const localDevVars = evaluateLocalDevVars(inputs.localDevVarsText, inputs.localDevVarsSource);
  const providerSecretList = evaluateProviderSecretList(inputs.providerSecretListText, inputs.providerSecretListSource);
  const manifestReady = envExample.ready
    && devVarsExample.ready
    && wranglerBindings.ready
    && wranglerCustomDomains.ready
    && wranglerCrons.ready
    && wranglerObservability.ready
    && packageScripts.ready;

  return {
    generatedAt: new Date().toISOString(),
    mode: "cloudflare-worker-readiness",
    sources: {
      envExample: inputs.sources?.envExample ?? ".env.example",
      devVarsExample: inputs.sources?.devVarsExample ?? ".dev.vars.example",
      wranglerConfig: inputs.sources?.wranglerConfig ?? "wrangler.jsonc",
      packageJson: inputs.sources?.packageJson ?? "package.json",
    },
    envExample,
    devVarsExample,
    wranglerBindings,
    wranglerCustomDomains,
    wranglerCrons,
    wranglerObservability,
    packageScripts,
    localDevVars,
    providerSecretList,
    manifestReady,
    localPreviewReady: localDevVars.ready,
    deploymentSecretsReady: providerSecretList.ready,
    deploymentReady: manifestReady && providerSecretList.ready,
    note: "Cloudflare Worker readiness checks manifest/env-name alignment and optional sanitized secret-list transcripts only. It never prints secret values, does not create Cloudflare resources, does not prove paid-plan status, hosted deployment, custom-domain routing, R2 bucket existence, Images processing, cron execution, analytics receipt, database migration, nameserver changes, rollback, or provider cancellation.",
  };
}

function readOptionalFile(path: string | undefined) {
  if (!path || !existsSync(path)) return null;
  return readFileSync(path, "utf8");
}

function readProviderSecretList() {
  const file = readEnv("CLOUDFLARE_WORKER_SECRET_LIST_FILE");
  const text = readEnv("CLOUDFLARE_WORKER_SECRET_LIST_TEXT");
  if (file) return { source: file, text: readFileSync(file, "utf8") };
  if (text) return { source: "CLOUDFLARE_WORKER_SECRET_LIST_TEXT", text };
  return { source: null, text: null };
}

function writeOutput(outputFile: string, result: CloudflareWorkerReadinessResult) {
  const resolved = resolve(outputFile);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(result, null, 2)}\n`);
}

export function writeMarkdown(result: CloudflareWorkerReadinessResult, markdownFile: string) {
  const resolved = resolve(markdownFile);
  mkdirSync(dirname(resolved), { recursive: true });
  const groups: Array<[string, GroupResult]> = [
    ["Env example", result.envExample],
    ["Local dev vars example", result.devVarsExample],
    ["Wrangler bindings", result.wranglerBindings],
    ["Wrangler custom domains", result.wranglerCustomDomains],
    ["Wrangler crons", result.wranglerCrons],
    ["Wrangler observability", result.wranglerObservability],
    ["Package scripts", result.packageScripts],
    ["Local preview secrets", result.localDevVars.previewSecrets],
    ["Local preview controls", result.localDevVars.previewControls],
    ["Provider secret names", result.providerSecretList.deployedWorkerSecrets],
  ];
  const rows = groups.map(([label, group]) => [
    label,
    group.ready ? "PASS" : "FAIL",
    group.missing.length === 0 ? "(none)" : group.missing.join(", "),
  ]);
  const lines = [
    "# Cloudflare Worker Readiness",
    "",
    `Generated: ${result.generatedAt}`,
    `Manifest ready: ${result.manifestReady ? "PASS" : "FAIL"}`,
    `Local preview ready: ${result.localPreviewReady ? "PASS" : result.localDevVars.checked ? "FAIL" : "NOT CHECKED"}`,
    `Deployment secrets ready: ${result.deploymentSecretsReady ? "PASS" : result.providerSecretList.checked ? "FAIL" : "NOT CHECKED"}`,
    `Deployment ready: ${result.deploymentReady ? "PASS" : "FAIL"}`,
    "",
    result.note,
    "",
    "| Group | Result | Missing names |",
    "| --- | --- | --- |",
    ...rows.map((row) => `| ${row.join(" | ")} |`),
    "",
  ];
  writeFileSync(resolved, lines.join("\n"));
}

async function main() {
  const envExamplePath = readEnv("CLOUDFLARE_ENV_EXAMPLE_FILE") ?? ".env.example";
  const devVarsExamplePath = readEnv("CLOUDFLARE_DEV_VARS_EXAMPLE_FILE") ?? ".dev.vars.example";
  const wranglerConfigPath = readEnv("CLOUDFLARE_WRANGLER_CONFIG_FILE") ?? "wrangler.jsonc";
  const packageJsonPath = readEnv("CLOUDFLARE_PACKAGE_JSON_FILE") ?? "package.json";
  const localDevVarsPath = readEnv("CLOUDFLARE_LOCAL_DEV_VARS_FILE") ?? ".dev.vars";
  const providerSecretList = readProviderSecretList();

  const result = checkCloudflareWorkerReadiness({
    envExampleText: readFileSync(envExamplePath, "utf8"),
    devVarsExampleText: readFileSync(devVarsExamplePath, "utf8"),
    wranglerConfigText: readFileSync(wranglerConfigPath, "utf8"),
    packageJsonText: readFileSync(packageJsonPath, "utf8"),
    localDevVarsText: readOptionalFile(localDevVarsPath),
    localDevVarsSource: existsSync(localDevVarsPath) ? localDevVarsPath : null,
    providerSecretListText: providerSecretList.text,
    providerSecretListSource: providerSecretList.source,
    sources: {
      envExample: envExamplePath,
      devVarsExample: devVarsExamplePath,
      wranglerConfig: wranglerConfigPath,
      packageJson: packageJsonPath,
    },
  });

  const outputFile = readEnv("OUTPUT_FILE");
  const markdownFile = readEnv("MARKDOWN_FILE");
  if (outputFile) writeOutput(outputFile, result);
  if (markdownFile) writeMarkdown(result, markdownFile);
  console.log(JSON.stringify(result, null, 2));
  if (!result.manifestReady) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
