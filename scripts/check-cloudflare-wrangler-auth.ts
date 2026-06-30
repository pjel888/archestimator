#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type CommandResult = {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
  stdout: string;
  stderr: string;
};

type WranglerWhoamiJson = {
  loggedIn?: boolean;
  authType?: string;
  email?: string | null;
  accounts?: Array<{
    id?: string | null;
    name?: string | null;
  }>;
};

export type CloudflareWranglerAuthReport = {
  generatedAt: string;
  mode: "cloudflare-wrangler-auth";
  source: "wrangler-whoami";
  command: {
    executable: string;
    args: string[];
    exitCode: number | null;
    signal: string | null;
    timedOut: boolean;
  };
  wranglerVersion: string | null;
  auth: {
    checked: boolean;
    authenticated: boolean;
    method: "api-token" | "oauth" | "unknown" | null;
    accountEmailPresent: boolean;
    accountNames: string[];
    accountIds: string[];
    notAuthenticatedReason: string | null;
  };
  sanitizedMessages: string[];
  readiness: {
    wranglerCliAvailable: boolean;
    wranglerAuthCheckCompleted: boolean;
    wranglerApiAuthenticated: boolean;
    providerReadbackReady: boolean;
    productionDeployReady: boolean;
  };
  blockers: string[];
  note: string;
};

const PLAN_ROOT = ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence";
const DEFAULT_OUTPUT_FILE = `${PLAN_ROOT}/2026-06-30-cloudflare-wrangler-auth.json`;
const DEFAULT_MARKDOWN_FILE = `${PLAN_ROOT}/2026-06-30-cloudflare-wrangler-auth.md`;

function readEnv(name: string) {
  const value = process.env[name];
  return value?.trim() || undefined;
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value?.trim())).map((value) => value.trim()))].sort();
}

function stripAnsi(value: string) {
  return value.replace(/\u001b\[[0-9;]*m/g, "");
}

function lineValue(line: string) {
  const [, value] = line.split(/:\s+/, 2);
  return value?.trim() ?? null;
}

function sanitizeLine(line: string) {
  const trimmed = stripAnsi(line).replace(/\s+/g, " ").trim();
  if (!trimmed) return null;
  if (/token|secret|password|authorization|bearer/i.test(trimmed)) {
    if (/oauth token/i.test(trimmed) || /api token/i.test(trimmed)) {
      return trimmed
        .replace(/with an OAuth Token.*$/i, "with an OAuth Token")
        .replace(/with an API Token.*$/i, "with an API Token");
    }
    return null;
  }
  if (
    /^wrangler\b/i.test(trimmed)
    || /^getting user settings/i.test(trimmed)
    || /^you are not authenticated/i.test(trimmed)
    || /^please run `?wrangler login`?/i.test(trimmed)
    || /^to deploy without logging in/i.test(trimmed)
    || /^you are logged in/i.test(trimmed)
    || /^account name:/i.test(trimmed)
    || /^account id:/i.test(trimmed)
    || /^email:/i.test(trimmed)
  ) {
    return trimmed;
  }
  return null;
}

function parseWranglerWhoamiJson(value: string): WranglerWhoamiJson | null {
  try {
    const parsed = JSON.parse(stripAnsi(value)) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as WranglerWhoamiJson;
  } catch {
    return null;
  }
}

function authMethod(value: string | null | undefined): CloudflareWranglerAuthReport["auth"]["method"] {
  if (/api token/i.test(value ?? "")) return "api-token";
  if (/oauth token/i.test(value ?? "")) return "oauth";
  return "unknown";
}

export function buildCloudflareWranglerAuthReport(
  commandResult: CommandResult,
  generatedAt = new Date().toISOString(),
): CloudflareWranglerAuthReport {
  const combined = stripAnsi(`${commandResult.stdout}\n${commandResult.stderr}`);
  const parsedWhoami = parseWranglerWhoamiJson(commandResult.stdout);
  const lines = combined.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const wranglerVersion = combined.match(/\bwrangler\s+(\d+\.\d+\.\d+)\b/i)?.[1] ?? null;
  const notAuthenticated = parsedWhoami
    ? parsedWhoami.loggedIn === false
    : /you are not authenticated|please run [`"]?wrangler login/i.test(combined);
  const loggedIn = parsedWhoami
    ? parsedWhoami.loggedIn === true && !notAuthenticated
    : /you are logged in|account id\s*:|account name\s*:/i.test(combined) && !notAuthenticated;
  const accountNames = unique(parsedWhoami
    ? (parsedWhoami.accounts ?? []).map((account) => account.name)
    : lines.filter((line) => /^account name\s*:/i.test(line)).map(lineValue));
  const accountIds = unique(parsedWhoami
    ? (parsedWhoami.accounts ?? []).map((account) => account.id)
    : lines.filter((line) => /^account id\s*:/i.test(line)).map(lineValue));
  const accountEmailPresent = parsedWhoami
    ? Boolean(parsedWhoami.email?.trim())
    : /email\s*:|associated with the email/i.test(combined);
  const wranglerCliAvailable = parsedWhoami !== null || wranglerVersion !== null || !/not found|enoent/i.test(combined);
  const wranglerAuthCheckCompleted = !commandResult.timedOut && wranglerCliAvailable;
  const authenticated = loggedIn;
  const method = authenticated
    ? parsedWhoami
      ? authMethod(parsedWhoami.authType)
      : authMethod(combined)
    : null;
  const blockers: string[] = [];
  const sanitizedMessages = parsedWhoami
    ? unique([
        authenticated ? `You are logged in with an ${parsedWhoami.authType ?? "unknown auth method"}` : null,
        accountEmailPresent ? "Email: (present)" : null,
        ...accountNames.map((name) => `Account Name: ${name}`),
        ...accountIds.map((id) => `Account ID: ${id}`),
      ])
    : unique(lines.map(sanitizeLine));

  if (!wranglerCliAvailable) {
    blockers.push("Wrangler CLI was not available for the authentication check.");
  }
  if (commandResult.timedOut) {
    blockers.push("Wrangler authentication check timed out.");
  }
  if (wranglerAuthCheckCompleted && !authenticated) {
    blockers.push("Wrangler is not authenticated; run `wrangler login` or provide a scoped token outside the repo.");
  }

  return {
    generatedAt,
    mode: "cloudflare-wrangler-auth",
    source: "wrangler-whoami",
    command: {
      executable: "bunx",
      args: ["wrangler", "whoami", "--json"],
      exitCode: commandResult.exitCode,
      signal: commandResult.signal,
      timedOut: commandResult.timedOut,
    },
    wranglerVersion,
    auth: {
      checked: wranglerAuthCheckCompleted,
      authenticated,
      method,
      accountEmailPresent,
      accountNames,
      accountIds,
      notAuthenticatedReason: notAuthenticated ? "wrangler-login-required" : null,
    },
    sanitizedMessages,
    readiness: {
      wranglerCliAvailable,
      wranglerAuthCheckCompleted,
      wranglerApiAuthenticated: authenticated,
      providerReadbackReady: authenticated && accountIds.length > 0,
      productionDeployReady: false,
    },
    blockers,
    note: "Runs `wrangler whoami --json` as a read-only CLI authentication check. It records only sanitized auth/account metadata, does not read env files, does not print tokens or secrets, does not create Cloudflare resources, does not deploy Workers, does not change DNS, does not purchase plans, and does not make production cutover ready.",
  };
}

function runWranglerWhoami(): CommandResult {
  const result = spawnSync("bunx", ["wrangler", "whoami", "--json"], {
    encoding: "utf8",
    timeout: 30_000,
    maxBuffer: 1024 * 1024,
  });
  return {
    exitCode: result.status,
    signal: result.signal,
    timedOut: result.error?.message.includes("ETIMEDOUT") ?? false,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function writeOutput(outputFile: string, report: CloudflareWranglerAuthReport) {
  const outputPath = resolve(outputFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

export function writeMarkdown(report: CloudflareWranglerAuthReport, markdownFile: string) {
  const outputPath = resolve(markdownFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  const blockers = report.blockers.length > 0 ? report.blockers.map((blocker) => `- ${blocker}`) : ["- (none)"];
  const messages = report.sanitizedMessages.length > 0
    ? report.sanitizedMessages.map((message) => `- ${message.replaceAll("|", "\\|")}`)
    : ["- (none)"];
  const lines = [
    "# Cloudflare Wrangler Auth Readiness",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    report.note,
    "",
    "## Summary",
    "",
    "| Gate | Ready |",
    "| --- | --- |",
    `| Wrangler CLI available | ${report.readiness.wranglerCliAvailable ? "yes" : "no"} |`,
    `| Auth check completed | ${report.readiness.wranglerAuthCheckCompleted ? "yes" : "no"} |`,
    `| Wrangler/API authenticated | ${report.readiness.wranglerApiAuthenticated ? "yes" : "no"} |`,
    `| Provider readback ready | ${report.readiness.providerReadbackReady ? "yes" : "no"} |`,
    `| Production deploy ready | ${report.readiness.productionDeployReady ? "yes" : "no"} |`,
    "",
    "## Auth",
    "",
    `- Method: ${report.auth.method ?? "(none)"}`,
    `- Account email present: ${report.auth.accountEmailPresent ? "yes" : "no"}`,
    `- Account names: ${report.auth.accountNames.length > 0 ? report.auth.accountNames.join(", ") : "(none)"}`,
    `- Account IDs: ${report.auth.accountIds.length > 0 ? report.auth.accountIds.join(", ") : "(none)"}`,
    `- Not authenticated reason: ${report.auth.notAuthenticatedReason ?? "(none)"}`,
    "",
    "## Sanitized Messages",
    "",
    ...messages,
    "",
    "## Blockers",
    "",
    ...blockers,
    "",
  ];
  writeFileSync(outputPath, lines.join("\n"));
}

async function main() {
  const result = buildCloudflareWranglerAuthReport(runWranglerWhoami());
  const outputFile = readEnv("OUTPUT_FILE") ?? DEFAULT_OUTPUT_FILE;
  const markdownFile = readEnv("MARKDOWN_FILE") ?? DEFAULT_MARKDOWN_FILE;
  writeOutput(outputFile, result);
  writeMarkdown(result, markdownFile);
  console.log(JSON.stringify(result, null, 2));
  if (!result.readiness.wranglerAuthCheckCompleted) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
