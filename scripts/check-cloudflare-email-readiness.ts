#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const DEFAULT_WORKER_NAME = "archestimator-proof";
const DEFAULT_TARGET_DOMAIN = "archestimator.com";
const OUTPUT_JSON = ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-30-cloudflare-email-readiness.json";
const OUTPUT_MD = ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-30-cloudflare-email-readiness.md";

const REQUIRED_WORKER_SECRETS = [
  "ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED",
  "ARCHESTIMATOR_EMAIL_PROVIDER",
  "CLOUDFLARE_EMAIL_FROM",
  "CLOUDFLARE_EMAIL_REPLY_TO",
] as const;

const REQUIRED_ENV_EXAMPLE_NAMES = [
  ...REQUIRED_WORKER_SECRETS,
] as const;

type GroupResult = {
  required: string[];
  present: string[];
  missing: string[];
  ready: boolean;
};

type CommandResult = {
  command: string[];
  exitCode: number | null;
  ok: boolean;
  output: string;
  error: string;
};

type EmailSendingListResult = {
  checked: boolean;
  command: string[];
  ok: boolean;
  noSendingDomainsMessagePresent: boolean;
  targetDomainPresent: boolean;
  discoveredTargetDomains: string[];
  sanitizedOutput: string;
};

type WorkerSecretReadbackResult = {
  checked: boolean;
  command: string[];
  ok: boolean;
  workerName: string;
  names: string[];
  requiredEmailSecrets: GroupResult;
};

export type CloudflareEmailReadinessResult = {
  generatedAt: string;
  mode: "cloudflare-email-readiness";
  targetDomain: string;
  workerName: string;
  sources: {
    wranglerConfig: string;
    envExample: string;
    devVarsExample: string;
    cloudflareDocs: string[];
  };
  wranglerSendEmailBinding: {
    requiredBinding: "EMAIL";
    present: boolean;
    ready: boolean;
  };
  envExample: GroupResult;
  devVarsExample: GroupResult;
  workerSecretReadback: WorkerSecretReadbackResult;
  emailSendingList: EmailSendingListResult;
  productionEmailReady: boolean;
  blockers: string[];
  note: string;
};

type CheckInputs = {
  wranglerConfigText: string;
  envExampleText: string;
  devVarsExampleText: string;
  targetDomain?: string;
  workerName?: string;
  emailSendingListOutput?: string | null;
  emailSendingListCommand?: string[];
  workerSecretListOutput?: string | null;
  workerSecretListCommand?: string[];
};

function normalizeDomain(value: string) {
  return value.trim().toLowerCase().replace(/\.$/, "");
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

function extractEnvAssignmentNames(input: string) {
  const names = new Set<string>();
  for (const line of input.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^(?:export\s+)?([A-Z][A-Z0-9_]+)\s*=/);
    if (match) names.add(match[1]);
  }
  return [...names].sort();
}

export function extractCloudflareSecretNames(input: string) {
  try {
    const parsed = JSON.parse(input) as Array<{ name?: unknown }>;
    if (Array.isArray(parsed)) {
      return Array.from(new Set(parsed
        .map((item) => item.name)
        .filter((name): name is string => typeof name === "string" && name.trim().length > 0)))
        .sort();
    }
  } catch {
    // Fall back to a sanitized-name scan for copied Wrangler output.
  }

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

function hasSendEmailBinding(wranglerConfigText: string, bindingName: string) {
  try {
    const parsed = JSON.parse(stripJsonComments(wranglerConfigText)) as { send_email?: Array<{ name?: unknown }> };
    return Array.isArray(parsed.send_email)
      && parsed.send_email.some((binding) => binding.name === bindingName);
  } catch {
    return new RegExp(`"send_email"\\s*:\\s*\\[[\\s\\S]*"name"\\s*:\\s*"${bindingName}"`).test(wranglerConfigText);
  }
}

function sanitizeCommandOutput(stdout: string, stderr = "") {
  return [stdout, stderr]
    .filter(Boolean)
    .join("\n")
    .split(/\r?\n/)
    .map((line) => line.replace(/\u001b\[[0-9;]*m/g, "").trimEnd())
    .filter((line) => line.trim().length > 0)
    .join("\n");
}

export function parseWranglerEmailSendingList(output: string, targetDomain = DEFAULT_TARGET_DOMAIN) {
  const normalizedTarget = normalizeDomain(targetDomain);
  const targetPattern = new RegExp(`\\b(?:[a-z0-9-]+\\.)*${normalizedTarget.replace(/\./g, "\\.")}\\b`, "gi");
  const discoveredTargetDomains = Array.from(new Set((output.match(targetPattern) ?? []).map(normalizeDomain))).sort();
  const noSendingDomainsMessagePresent = /No sending subdomains found/i.test(output);
  return {
    noSendingDomainsMessagePresent,
    targetDomainPresent: discoveredTargetDomains.includes(normalizedTarget),
    discoveredTargetDomains,
  };
}

function runCommand(command: string[]): CommandResult {
  const [bin, ...args] = command;
  const result = spawnSync(bin, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    timeout: 120_000,
    maxBuffer: 1024 * 1024,
  });
  return {
    command,
    exitCode: result.status,
    ok: result.status === 0,
    output: result.stdout ?? "",
    error: result.stderr ?? "",
  };
}

function createEmailSendingListResult(command: string[], commandResult: CommandResult | null, transcript: string | null | undefined, targetDomain: string): EmailSendingListResult {
  const output = transcript ?? (commandResult ? sanitizeCommandOutput(commandResult.output, commandResult.error) : "");
  const parsed = parseWranglerEmailSendingList(output, targetDomain);
  return {
    checked: Boolean(transcript || commandResult),
    command,
    ok: transcript ? true : Boolean(commandResult?.ok),
    noSendingDomainsMessagePresent: parsed.noSendingDomainsMessagePresent,
    targetDomainPresent: parsed.targetDomainPresent,
    discoveredTargetDomains: parsed.discoveredTargetDomains,
    sanitizedOutput: output,
  };
}

function createWorkerSecretReadback(command: string[], commandResult: CommandResult | null, transcript: string | null | undefined, workerName: string): WorkerSecretReadbackResult {
  const output = transcript ?? (commandResult ? sanitizeCommandOutput(commandResult.output, commandResult.error) : "");
  const names = extractCloudflareSecretNames(output);
  return {
    checked: Boolean(transcript || commandResult),
    command,
    ok: transcript ? true : Boolean(commandResult?.ok),
    workerName,
    names,
    requiredEmailSecrets: evaluateGroup(REQUIRED_WORKER_SECRETS, names),
  };
}

export function checkCloudflareEmailReadiness(inputs: CheckInputs): CloudflareEmailReadinessResult {
  const targetDomain = normalizeDomain(inputs.targetDomain ?? DEFAULT_TARGET_DOMAIN);
  const workerName = inputs.workerName ?? DEFAULT_WORKER_NAME;
  const emailSendingCommand = inputs.emailSendingListCommand ?? ["bunx", "wrangler", "email", "sending", "list"];
  const secretListCommand = inputs.workerSecretListCommand ?? ["bunx", "wrangler", "secret", "list", "--name", workerName, "--format", "json"];
  const emailSendingResult = inputs.emailSendingListOutput === undefined ? runCommand(emailSendingCommand) : null;
  const workerSecretResult = inputs.workerSecretListOutput === undefined ? runCommand(secretListCommand) : null;
  const emailSendingList = createEmailSendingListResult(emailSendingCommand, emailSendingResult, inputs.emailSendingListOutput, targetDomain);
  const workerSecretReadback = createWorkerSecretReadback(secretListCommand, workerSecretResult, inputs.workerSecretListOutput, workerName);
  const wranglerBindingReady = hasSendEmailBinding(inputs.wranglerConfigText, "EMAIL");
  const envExample = evaluateGroup(REQUIRED_ENV_EXAMPLE_NAMES, extractEnvAssignmentNames(inputs.envExampleText));
  const devVarsExample = evaluateGroup(REQUIRED_WORKER_SECRETS, extractEnvAssignmentNames(inputs.devVarsExampleText));
  const productionEmailReady = wranglerBindingReady
    && envExample.ready
    && devVarsExample.ready
    && workerSecretReadback.requiredEmailSecrets.ready
    && emailSendingList.targetDomainPresent
    && !emailSendingList.noSendingDomainsMessagePresent;
  const blockers = [
    !wranglerBindingReady ? "wrangler.jsonc does not expose send_email binding EMAIL." : null,
    !envExample.ready ? `.env.example missing ${envExample.missing.join(", ")}.` : null,
    !devVarsExample.ready ? `.dev.vars.example missing ${devVarsExample.missing.join(", ")}.` : null,
    !workerSecretReadback.requiredEmailSecrets.ready
      ? `Worker ${workerName} missing email secrets ${workerSecretReadback.requiredEmailSecrets.missing.join(", ")}.`
      : null,
    !emailSendingList.checked ? "Wrangler Email Sending list was not checked." : null,
    emailSendingList.noSendingDomainsMessagePresent ? "Cloudflare account reports no Email Sending domains/subdomains." : null,
    !emailSendingList.targetDomainPresent ? `Email Sending domain ${targetDomain} is not onboarded/readable.` : null,
  ].filter((item): item is string => Boolean(item));

  return {
    generatedAt: new Date().toISOString(),
    mode: "cloudflare-email-readiness",
    targetDomain,
    workerName,
    sources: {
      wranglerConfig: "wrangler.jsonc",
      envExample: ".env.example",
      devVarsExample: ".dev.vars.example",
      cloudflareDocs: [
        "https://developers.cloudflare.com/email-service/get-started/send-emails/",
        "https://developers.cloudflare.com/email-service/api/send-emails/workers-api/",
        "https://developers.cloudflare.com/email-service/observability/metrics-analytics/",
      ],
    },
    wranglerSendEmailBinding: {
      requiredBinding: "EMAIL",
      present: wranglerBindingReady,
      ready: wranglerBindingReady,
    },
    envExample,
    devVarsExample,
    workerSecretReadback,
    emailSendingList,
    productionEmailReady,
    blockers,
    note: "Readiness check records secret names only, never secret values. Cloudflare docs require a send_email Worker binding plus an onboarded sending domain on Cloudflare DNS before production email can be claimed.",
  };
}

function markdownRows(rows: string[][]) {
  return rows.map((row) => `| ${row.map((cell) => cell.replace(/\|/g, "\\|")).join(" | ")} |`);
}

export function writeMarkdown(report: CloudflareEmailReadinessResult, outputPath: string) {
  const rows = [
    ["Wrangler send_email EMAIL binding", report.wranglerSendEmailBinding.ready ? "PASS" : "FAIL", report.wranglerSendEmailBinding.present ? "present" : "missing"],
    [".env.example email variables", report.envExample.ready ? "PASS" : "FAIL", report.envExample.missing.join(", ") || "complete"],
    [".dev.vars.example email variables", report.devVarsExample.ready ? "PASS" : "FAIL", report.devVarsExample.missing.join(", ") || "complete"],
    ["Worker email secrets", report.workerSecretReadback.requiredEmailSecrets.ready ? "PASS" : "FAIL", report.workerSecretReadback.requiredEmailSecrets.missing.join(", ") || "complete"],
    ["Cloudflare Email Sending domain", report.emailSendingList.targetDomainPresent ? "PASS" : "FAIL", report.emailSendingList.discoveredTargetDomains.join(", ") || "(none)"],
  ];
  const blockerLines = report.blockers.length > 0 ? report.blockers.map((blocker) => `- ${blocker}`) : ["- (none)"];
  const lines = [
    "# Cloudflare Email Readiness",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    report.note,
    "",
    "## Summary",
    "",
    "| Item | Value |",
    "| --- | --- |",
    `| Target domain | ${report.targetDomain} |`,
    `| Worker | ${report.workerName} |`,
    `| Production email ready | ${report.productionEmailReady ? "yes" : "no"} |`,
    `| Email Sending list checked | ${report.emailSendingList.checked ? "yes" : "no"} |`,
    `| No-sending-domains message present | ${report.emailSendingList.noSendingDomainsMessagePresent ? "yes" : "no"} |`,
    "",
    "## Checks",
    "",
    "| Check | Result | Evidence |",
    "| --- | --- | --- |",
    ...markdownRows(rows),
    "",
    "## Cloudflare Evidence",
    "",
    "```text",
    report.emailSendingList.sanitizedOutput || "(no output)",
    "```",
    "",
    "## Docs",
    "",
    ...report.sources.cloudflareDocs.map((url) => `- ${url}`),
    "",
    "## Blockers",
    "",
    ...blockerLines,
    "",
  ];
  writeFileSync(outputPath, lines.join("\n"));
}

function main() {
  const report = checkCloudflareEmailReadiness({
    wranglerConfigText: readFileSync(resolve("wrangler.jsonc"), "utf8"),
    envExampleText: readFileSync(resolve(".env.example"), "utf8"),
    devVarsExampleText: existsSync(resolve(".dev.vars.example")) ? readFileSync(resolve(".dev.vars.example"), "utf8") : "",
    targetDomain: process.env.CLOUDFLARE_EMAIL_TARGET_DOMAIN ?? DEFAULT_TARGET_DOMAIN,
    workerName: process.env.CLOUDFLARE_WORKER_NAME ?? DEFAULT_WORKER_NAME,
  });

  const outputJson = resolve(OUTPUT_JSON);
  const outputMd = resolve(OUTPUT_MD);
  mkdirSync(dirname(outputJson), { recursive: true });
  writeFileSync(outputJson, JSON.stringify(report, null, 2));
  writeMarkdown(report, outputMd);
  console.log(`Cloudflare Email readiness: ${report.productionEmailReady ? "READY" : "NOT READY"}`);
  for (const blocker of report.blockers) console.log(`- ${blocker}`);
  console.log(`Wrote ${OUTPUT_JSON}`);
  console.log(`Wrote ${OUTPUT_MD}`);
  if (!report.productionEmailReady) process.exitCode = 1;
}

if (import.meta.main) {
  main();
}
