#!/usr/bin/env bun

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type LegalProofFlagName =
  | "LEGAL_OWNER_TERMS_CONFIRMED"
  | "LEGAL_OWNER_PRIVACY_CONFIRMED"
  | "LEGAL_OWNER_BETA_COPY_CONFIRMED"
  | "LEGAL_OWNER_DATA_RETENTION_CONFIRMED"
  | "LEGAL_OWNER_SUPPORT_COMMS_CONFIRMED";

export type LegalOwnerReadinessResult = {
  generatedAt: string;
  mode: "legal-owner-readiness";
  proofFlags: Record<LegalProofFlagName, boolean>;
  productOwner: string | null;
  legalReviewer: string | null;
  approvalDate: string | null;
  approvalReference: string | null;
  missing: string[];
  legalOwnerReady: boolean;
  note: string;
};

const LEGAL_PROOF_FLAGS: LegalProofFlagName[] = [
  "LEGAL_OWNER_TERMS_CONFIRMED",
  "LEGAL_OWNER_PRIVACY_CONFIRMED",
  "LEGAL_OWNER_BETA_COPY_CONFIRMED",
  "LEGAL_OWNER_DATA_RETENTION_CONFIRMED",
  "LEGAL_OWNER_SUPPORT_COMMS_CONFIRMED",
];

function readEnv(name: string) {
  const value = process.env[name];
  return value?.trim() || undefined;
}

export function parseLegalProofFlag(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "approved";
}

export function sanitizeLegalLabel(value: string | undefined, maxLength = 100) {
  if (!value) return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed || trimmed.length > maxLength) return null;
  if (/[<>{}[\]\\]/.test(trimmed)) return null;
  return trimmed;
}

export function parseApprovalDate(value: string | undefined) {
  const normalized = value?.trim();
  if (!normalized) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;

  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;

  const [year, month, day] = normalized.split("-").map(Number);
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() + 1 !== month || parsed.getUTCDate() !== day) {
    return null;
  }

  return normalized;
}

export function checkLegalOwnerReadiness(env: Record<string, string | undefined> = process.env) {
  const proofFlags = Object.fromEntries(
    LEGAL_PROOF_FLAGS.map((name) => [name, parseLegalProofFlag(env[name])]),
  ) as Record<LegalProofFlagName, boolean>;

  const productOwner = sanitizeLegalLabel(env.LEGAL_OWNER_PRODUCT_OWNER);
  const legalReviewer = sanitizeLegalLabel(env.LEGAL_OWNER_LEGAL_REVIEWER);
  const approvalDate = parseApprovalDate(env.LEGAL_OWNER_APPROVAL_DATE);
  const approvalReference = sanitizeLegalLabel(env.LEGAL_OWNER_APPROVAL_REFERENCE, 140);

  const missing = [
    !proofFlags.LEGAL_OWNER_TERMS_CONFIRMED ? "terms review confirmed" : null,
    !proofFlags.LEGAL_OWNER_PRIVACY_CONFIRMED ? "privacy review confirmed" : null,
    !proofFlags.LEGAL_OWNER_BETA_COPY_CONFIRMED ? "closed-beta copy approval confirmed" : null,
    !proofFlags.LEGAL_OWNER_DATA_RETENTION_CONFIRMED ? "data retention wording confirmed" : null,
    !proofFlags.LEGAL_OWNER_SUPPORT_COMMS_CONFIRMED ? "support communications wording confirmed" : null,
    !productOwner ? "product owner label" : null,
    !legalReviewer ? "legal reviewer label" : null,
    !approvalDate ? "approval date in YYYY-MM-DD format" : null,
    !approvalReference ? "approval reference label" : null,
  ].filter((value): value is string => Boolean(value));

  return {
    generatedAt: new Date().toISOString(),
    mode: "legal-owner-readiness" as const,
    proofFlags,
    productOwner,
    legalReviewer,
    approvalDate,
    approvalReference,
    missing,
    legalOwnerReady: missing.length === 0,
    note: "Sanitized legal/owner readiness check. It records operator-confirmed proof flags and labels only; it does not provide legal advice, verify counsel review, inspect contracts, or approve public launch by itself.",
  } satisfies LegalOwnerReadinessResult;
}

function writeOutput(outputFile: string, result: LegalOwnerReadinessResult) {
  const resolved = resolve(outputFile);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(result, null, 2)}\n`);
}

async function main() {
  const result = checkLegalOwnerReadiness();
  const outputFile = readEnv("OUTPUT_FILE");
  if (outputFile) writeOutput(outputFile, result);
  console.log(JSON.stringify(result, null, 2));
  if (!result.legalOwnerReady) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
