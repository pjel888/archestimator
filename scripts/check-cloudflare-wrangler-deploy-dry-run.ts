#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const DEFAULT_OUTDIR = ".wrangler/tmp/cloudflare-deploy-dry-run";
const DEFAULT_METAFILE = `${DEFAULT_OUTDIR}/metafile.json`;
const DEFAULT_LOG_FILE = `${DEFAULT_OUTDIR}/wrangler-deploy-dry-run.log`;
const REQUIRED_BINDINGS = [
  "ARCH_DB",
  "ARCH_UPLOADS_R2",
  "ASSETS",
  "COLLAB_ROOMS",
  "IMAGES",
  "UPLOAD_JOBS_QUEUE",
] as const;

type DryRunBinding = {
  binding: string;
  resource: string | null;
  type: string;
};

type BundleFile = {
  file: string;
  bytes: number;
};

type DryRunInputs = {
  generatedAt?: string;
  exitCode: number;
  logText: string;
  metafileText?: string | null;
  bundleFiles?: BundleFile[];
  repoRoot?: string;
  command?: string[];
};

export type CloudflareWranglerDeployDryRunReport = {
  generatedAt: string;
  mode: "cloudflare-wrangler-deploy-dry-run";
  command: string[];
  dryRun: {
    exitCode: number;
    passed: boolean;
    noUploadMarkerSeen: boolean;
    assetFileCount: number | null;
    totalUploadKiB: number | null;
    gzipUploadKiB: number | null;
    warnings: string[];
    bindings: DryRunBinding[];
    requiredBindingsReady: boolean;
    missingBindings: string[];
  };
  bundle: {
    metafileRead: boolean;
    inputCount: number | null;
    outputCount: number | null;
    metafileOutputBytes: number | null;
    generatedFiles: BundleFile[];
  };
  readiness: {
    localWranglerDryRunReady: boolean;
    productionDeployReady: boolean;
  };
  sanitizedLog: string[];
  note: string;
};

function readEnv(name: string) {
  const value = process.env[name];
  return value?.trim() || undefined;
}

function stripAnsi(input: string) {
  return input.replace(/\u001b\[[0-9;]*m/g, "");
}

function redactPotentialSecrets(input: string) {
  return input.replace(
    /\b([A-Z][A-Z0-9_]*(?:SECRET|TOKEN|KEY|PASSWORD)[A-Z0-9_]*)=([^\s]+)/g,
    "$1=<redacted>",
  );
}

function sanitizeLog(input: string, repoRoot = process.cwd()) {
  return redactPotentialSecrets(stripAnsi(input))
    .replaceAll(repoRoot, "<repo>")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);
}

function parseNumber(value: string | undefined) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseWarnings(lines: string[]) {
  return lines
    .filter((line) => line.includes("[WARNING]"))
    .map((line) => line.replace(/^.*\[WARNING\]\s*/, "").trim())
    .filter(Boolean);
}

function parseBindings(lines: string[]) {
  const bindings: DryRunBinding[] = [];
  for (const line of lines) {
    const match = line.match(/^env\.([A-Z0-9_]+)(?:\s+\(([^)]+)\))?\s+(.+?)\s*$/);
    if (!match) continue;
    bindings.push({
      binding: match[1],
      resource: match[2] ?? null,
      type: match[3].trim(),
    });
  }
  return bindings.sort((left, right) => left.binding.localeCompare(right.binding));
}

function parseMetafile(metafileText: string | null | undefined) {
  if (!metafileText) {
    return {
      metafileRead: false,
      inputCount: null,
      outputCount: null,
      metafileOutputBytes: null,
    };
  }
  const metafile = JSON.parse(metafileText) as {
    inputs?: Record<string, unknown>;
    outputs?: Record<string, { bytes?: number }>;
  };
  return {
    metafileRead: true,
    inputCount: Object.keys(metafile.inputs ?? {}).length,
    outputCount: Object.keys(metafile.outputs ?? {}).length,
    metafileOutputBytes: Object.values(metafile.outputs ?? {}).reduce((total, output) => total + (output.bytes ?? 0), 0),
  };
}

function collectBundleFiles(outdir: string) {
  const candidates = ["worker.js", "worker.js.map", "metafile.json", "README.md"];
  return candidates
    .map((file): BundleFile | null => {
      const path = `${outdir}/${file}`;
      if (!existsSync(path)) return null;
      return { file: `${outdir}/${file}`, bytes: statSync(path).size };
    })
    .filter((file): file is BundleFile => file !== null);
}

export function buildCloudflareWranglerDeployDryRunReport(
  inputs: DryRunInputs,
): CloudflareWranglerDeployDryRunReport {
  const sanitizedLog = sanitizeLog(inputs.logText, inputs.repoRoot);
  const assetMatch = sanitizedLog.join("\n").match(/Read\s+(\d+)\s+files from the assets directory/);
  const uploadMatch = sanitizedLog.join("\n").match(/Total Upload:\s+([0-9.]+)\s+KiB\s+\/\s+gzip:\s+([0-9.]+)\s+KiB/);
  const bindings = parseBindings(sanitizedLog);
  const bindingNames = new Set(bindings.map((binding) => binding.binding));
  const missingBindings = REQUIRED_BINDINGS.filter((binding) => !bindingNames.has(binding));
  const noUploadMarkerSeen = sanitizedLog.some((line) => line.includes("--dry-run: exiting now."));
  const metafile = parseMetafile(inputs.metafileText);
  const passed = inputs.exitCode === 0 && noUploadMarkerSeen;

  return {
    generatedAt: inputs.generatedAt ?? new Date().toISOString(),
    mode: "cloudflare-wrangler-deploy-dry-run",
    command: inputs.command ?? [
      "OPEN_NEXT_DEPLOY=true",
      "CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false",
      "bunx",
      "wrangler",
      "deploy",
      "--dry-run",
      "--keep-vars",
      "--outdir",
      DEFAULT_OUTDIR,
      "--metafile",
      DEFAULT_METAFILE,
    ],
    dryRun: {
      exitCode: inputs.exitCode,
      passed,
      noUploadMarkerSeen,
      assetFileCount: parseNumber(assetMatch?.[1]),
      totalUploadKiB: parseNumber(uploadMatch?.[1]),
      gzipUploadKiB: parseNumber(uploadMatch?.[2]),
      warnings: parseWarnings(sanitizedLog),
      bindings,
      requiredBindingsReady: missingBindings.length === 0,
      missingBindings,
    },
    bundle: {
      ...metafile,
      generatedFiles: inputs.bundleFiles ?? [],
    },
    readiness: {
      localWranglerDryRunReady: passed && missingBindings.length === 0 && metafile.metafileRead,
      productionDeployReady: false,
    },
    sanitizedLog,
    note:
      "Local Wrangler deploy dry-run only. It compiles/checks the Worker bundle and exits before upload. It does not prove Cloudflare authentication, hosted deployment, custom domains, remote bindings, Workers Paid, request handling, production traffic, logs/observability receipt, DNS cutover, or provider rollback.",
  };
}

function writeOutput(outputFile: string, report: CloudflareWranglerDeployDryRunReport) {
  const outputPath = resolve(outputFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

function markdownRows(rows: string[][]) {
  return rows.map((row) => `| ${row.map((cell) => cell.replaceAll("|", "\\|")).join(" | ")} |`);
}

export function writeMarkdown(report: CloudflareWranglerDeployDryRunReport, markdownFile: string) {
  const outputPath = resolve(markdownFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  const bindingRows = report.dryRun.bindings.map((binding) => [
    binding.binding,
    binding.resource ?? "",
    binding.type,
  ]);
  const fileRows = report.bundle.generatedFiles.map((file) => [file.file, String(file.bytes)]);
  const lines = [
    "# Cloudflare Wrangler Deploy Dry-Run",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    report.note,
    "",
    "## Readiness",
    "",
    "| Gate | Ready |",
    "| --- | --- |",
    `| Local Wrangler dry-run ready | ${report.readiness.localWranglerDryRunReady ? "yes" : "no"} |`,
    `| Production deploy ready | ${report.readiness.productionDeployReady ? "yes" : "no"} |`,
    "",
    "## Dry-Run",
    "",
    "| Check | Value |",
    "| --- | --- |",
    `| Exit code | ${report.dryRun.exitCode} |`,
    `| Dry-run marker seen | ${report.dryRun.noUploadMarkerSeen ? "yes" : "no"} |`,
    `| Asset files read | ${report.dryRun.assetFileCount ?? ""} |`,
    `| Total upload KiB | ${report.dryRun.totalUploadKiB ?? ""} |`,
    `| Gzip upload KiB | ${report.dryRun.gzipUploadKiB ?? ""} |`,
    `| Warnings | ${report.dryRun.warnings.length === 0 ? "(none)" : report.dryRun.warnings.join("; ")} |`,
    `| Missing required bindings | ${report.dryRun.missingBindings.length === 0 ? "(none)" : report.dryRun.missingBindings.join(", ")} |`,
    "",
    "## Bindings",
    "",
    "| Binding | Resource | Type |",
    "| --- | --- | --- |",
    ...markdownRows(bindingRows),
    "",
    "## Bundle",
    "",
    "| Check | Value |",
    "| --- | --- |",
    `| Metafile read | ${report.bundle.metafileRead ? "yes" : "no"} |`,
    `| Metafile inputs | ${report.bundle.inputCount ?? ""} |`,
    `| Metafile outputs | ${report.bundle.outputCount ?? ""} |`,
    `| Metafile output bytes | ${report.bundle.metafileOutputBytes ?? ""} |`,
    "",
    "| Generated file | Bytes |",
    "| --- | ---: |",
    ...markdownRows(fileRows),
    "",
    "## Sanitized Log",
    "",
    "```text",
    ...report.sanitizedLog,
    "```",
    "",
  ];
  writeFileSync(outputPath, lines.join("\n"));
}

function runWranglerDryRun(outdir: string, metafile: string) {
  rmSync(outdir, { recursive: true, force: true });
  mkdirSync(outdir, { recursive: true });
  const wranglerCommand = [
    "bunx",
    "wrangler",
    "deploy",
    "--dry-run",
    "--keep-vars",
    "--outdir",
    outdir,
    "--metafile",
    metafile,
  ];
  const command = ["OPEN_NEXT_DEPLOY=true", "CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false", ...wranglerCommand];
  const result = Bun.spawnSync(wranglerCommand, {
    env: {
      ...process.env,
      OPEN_NEXT_DEPLOY: "true",
      CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: "false",
    },
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = new TextDecoder().decode(result.stdout);
  const stderr = new TextDecoder().decode(result.stderr);
  const logText = `${stdout}${stderr ? `\n${stderr}` : ""}`;
  writeFileSync(DEFAULT_LOG_FILE, logText);
  return {
    command,
    exitCode: result.exitCode,
    logText,
  };
}

async function main() {
  const outdir = readEnv("CLOUDFLARE_DRY_RUN_OUTDIR") ?? DEFAULT_OUTDIR;
  const metafile = readEnv("CLOUDFLARE_DRY_RUN_METAFILE") ?? `${outdir}/metafile.json`;
  const logFile = readEnv("CLOUDFLARE_DRY_RUN_LOG_FILE");
  const dryRun = logFile
    ? {
        command: ["parse-log", logFile],
        exitCode: Number(readEnv("CLOUDFLARE_DRY_RUN_EXIT_CODE") ?? "0"),
        logText: readFileSync(logFile, "utf8"),
      }
    : runWranglerDryRun(outdir, metafile);
  const report = buildCloudflareWranglerDeployDryRunReport({
    ...dryRun,
    metafileText: existsSync(metafile) ? readFileSync(metafile, "utf8") : null,
    bundleFiles: collectBundleFiles(outdir),
  });

  const outputFile = readEnv("OUTPUT_FILE");
  const markdownFile = readEnv("MARKDOWN_FILE");
  if (outputFile) writeOutput(outputFile, report);
  if (markdownFile) writeMarkdown(report, markdownFile);
  console.log(JSON.stringify(report, null, 2));
  if (!report.readiness.localWranglerDryRunReady) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
