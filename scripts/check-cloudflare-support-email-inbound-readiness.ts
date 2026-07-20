#!/usr/bin/env bun
/**
 * Static readiness check for support inbound email (source/config only).
 * Does not prove live Email Routing rules, DNS, or delivery.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();

function read(path: string) {
  return readFileSync(resolve(ROOT, path), "utf8");
}

function hasName(text: string, name: string) {
  return new RegExp(`(^|\\n)\\s*${name}\\s*=`, "m").test(text) || text.includes(name);
}

const requiredEnvNames = [
  "ARCHESTIMATOR_INBOUND_EMAIL_ENABLED",
  "ARCHESTIMATOR_SUPPORT_MAILBOX",
  "ARCHESTIMATOR_INBOUND_EMAIL_ALIASES",
  "ARCHESTIMATOR_SUPPORT_EMAIL_FROM",
  "ARCHESTIMATOR_SUPPORT_FORWARD_ENABLED",
  "ARCHESTIMATOR_SUPPORT_FORWARD_TO",
] as const;

const blockers: string[] = [];
const notes: string[] = [];

const wrangler = read("wrangler.jsonc");
const worker = read("worker.ts");
const envExample = read(".env.example");
const devVars = read(".dev.vars.example");
const inboundModule = existsSync(resolve(ROOT, "src/lib/email/inbound-support-email.ts"));
const migration = existsSync(resolve(ROOT, "migrations/0095_support_email_inbox.sql"));

const emailBindingPresent = /"send_email"\s*:\s*\[[\s\S]*?"name"\s*:\s*"EMAIL"/.test(wrangler);
if (!emailBindingPresent) blockers.push("wrangler.jsonc missing send_email EMAIL binding.");

if (!/async email\(/.test(worker)) blockers.push("worker.ts does not export an email() handler.");
if (!inboundModule) blockers.push("Missing src/lib/email/inbound-support-email.ts");
if (!migration) blockers.push("Missing migrations/0095_support_email_inbox.sql");

for (const name of requiredEnvNames) {
  if (!hasName(envExample, name)) blockers.push(`.env.example missing ${name}`);
  if (!hasName(devVars, name)) blockers.push(`.dev.vars.example missing ${name}`);
}

if (/ARCHESTIMATOR_SUPPORT_FORWARD_TO=.+@/.test(envExample) && !/ARCHESTIMATOR_SUPPORT_FORWARD_TO=\s*$/m.test(envExample)) {
  // allow empty assignment only
  const match = envExample.match(/ARCHESTIMATOR_SUPPORT_FORWARD_TO=(.*)/);
  if (match?.[1]?.trim()) blockers.push(".env.example must not contain a real FORWARD_TO value.");
}

const mailboxMatch = envExample.match(/ARCHESTIMATOR_SUPPORT_MAILBOX=([^\n]+)/);
const mailbox = mailboxMatch?.[1]?.trim().toLowerCase() ?? "";
if (mailbox && !mailbox.endsWith("@archestimator.com")) {
  blockers.push("Configured support mailbox example is not under archestimator.com");
}

notes.push("Live Email Routing rule, MX, and sending-domain onboarding are NOT verified by this script.");
notes.push("Run bun run cf:check-email and bun run launch:check-support-dns separately for outbound/DNS evidence.");
notes.push("Deploy and DNS changes require explicit authorization.");

const ready = blockers.length === 0;
const result = {
  generatedAt: new Date().toISOString(),
  mode: "cloudflare-support-email-inbound-readiness",
  ready,
  checks: {
    emailBindingPresent,
    workerEmailHandlerPresent: /async email\(/.test(worker),
    inboundModulePresent: inboundModule,
    migrationPresent: migration,
    envExampleNames: requiredEnvNames.filter((name) => hasName(envExample, name)),
    devVarsExampleNames: requiredEnvNames.filter((name) => hasName(devVars, name)),
  },
  blockers,
  notes,
};

console.log(JSON.stringify(result, null, 2));
if (!ready) process.exit(1);
