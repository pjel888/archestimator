#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export type D1RecoveryReceipt = {
  schema: "D1-RECOVERY-RECEIPT-v1";
  producerVersion: string;
  runId: string;
  identity: { accountHash: string; sourceHash: string; targetHash: string };
  exportDigest: string;
  revisions: { migration: string; application: string; authorization: string; session: string; source: string };
  milestones: { startedAt: string; completedAt: string };
  rtoSeconds: number;
  rpoSeconds: number;
  checks: {
    schema: boolean;
    application: boolean;
    authorization: boolean;
    session: boolean;
    corporateIntegrity: boolean;
    corporateOnlyDenied: boolean;
  };
  sessionInvalidated: boolean;
  cleanup: { inventory: string[]; absenceReadback: boolean; complete: boolean };
  operatorLabel: string;
  failures: string[];
  result: "pass" | "fail";
  localOnly: boolean;
  providerBacked: boolean;
  issuedAt: string;
  expiresAt: string;
};

export type D1RecoveryReceiptValidation = {
  valid: boolean;
  failures: string[];
};

const HASH = /^[a-f0-9]{64}$/i;

function validTimestamp(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function nonblank(value: string | undefined) {
  return Boolean(value?.trim());
}

export function validateD1RecoveryReceipt(value: unknown, now = Date.now()): D1RecoveryReceiptValidation {
  const receipt = value as Partial<D1RecoveryReceipt> | null;
  const failures: string[] = [];
  if (!receipt || receipt.schema !== "D1-RECOVERY-RECEIPT-v1") failures.push("schema");
  if (!nonblank(receipt?.producerVersion) || !nonblank(receipt?.runId)) failures.push("producer-or-run");
  if (!receipt?.identity || ![receipt.identity.accountHash, receipt.identity.sourceHash, receipt.identity.targetHash].every((item) => HASH.test(item))) failures.push("identity");
  if (!nonblank(receipt?.exportDigest) || !receipt?.revisions || !Object.values(receipt.revisions).every(nonblank)) failures.push("revision-or-export");
  const startedAt = receipt?.milestones?.startedAt ? validTimestamp(receipt.milestones.startedAt) : null;
  const completedAt = receipt?.milestones?.completedAt ? validTimestamp(receipt.milestones.completedAt) : null;
  if (startedAt === null || completedAt === null || completedAt < startedAt) failures.push("milestones");
  if (!Number.isFinite(receipt?.rtoSeconds) || !Number.isFinite(receipt?.rpoSeconds) || (receipt?.rtoSeconds ?? -1) < 0 || (receipt?.rpoSeconds ?? -1) < 0) failures.push("rto-rpo");
  if (
    !receipt?.checks
    || receipt.checks.schema !== true
    || receipt.checks.application !== true
    || receipt.checks.authorization !== true
    || receipt.checks.session !== true
    || receipt.checks.corporateIntegrity !== true
    || receipt.checks.corporateOnlyDenied !== true
  ) failures.push("integrity-checks");
  if (receipt?.sessionInvalidated !== true) failures.push("session-invalidation");
  if (!receipt?.cleanup || receipt.cleanup.complete !== true || receipt.cleanup.absenceReadback !== true || !Array.isArray(receipt.cleanup.inventory) || receipt.cleanup.inventory.length === 0) failures.push("cleanup");
  if (!nonblank(receipt?.operatorLabel) || !Array.isArray(receipt?.failures) || receipt?.failures.length !== 0 || receipt?.result !== "pass") failures.push("result");
  if (receipt?.localOnly !== false || receipt?.providerBacked !== true) failures.push("provider-evidence");
  const issuedAt = receipt?.issuedAt ? validTimestamp(receipt.issuedAt) : null;
  const expiresAt = receipt?.expiresAt ? validTimestamp(receipt.expiresAt) : null;
  if (issuedAt === null || expiresAt === null || expiresAt <= issuedAt || now < issuedAt || now > expiresAt) failures.push("freshness");
  return { valid: failures.length === 0, failures };
}

export function buildD1RecoveryReadinessReport(receipt: unknown, now = Date.now()) {
  const validation = validateD1RecoveryReceipt(receipt, now);
  return {
    schema: "D1-RECOVERY-READINESS-v1",
    providerBacked: false,
    recoveryReceiptValid: validation.valid,
    failures: validation.failures,
    note: "Local receipt validation only. This report neither performs nor proves a hosted D1 recovery rehearsal.",
  };
}

export function writeD1RecoveryReadinessReport(report: ReturnType<typeof buildD1RecoveryReadinessReport>, outputFile: string) {
  mkdirSync(dirname(outputFile), { recursive: true });
  writeFileSync(outputFile, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

if (import.meta.main) {
  const receiptFile = process.env.CLOUDFLARE_D1_RECOVERY_RECEIPT_FILE;
  const receipt = receiptFile && existsSync(receiptFile) ? JSON.parse(readFileSync(receiptFile, "utf8")) : null;
  const report = buildD1RecoveryReadinessReport(receipt);
  const outputFile = process.env.CLOUDFLARE_D1_RECOVERY_READINESS_FILE
    ?? ".ai/99_scratch/cloudflare-d1-recovery-readiness-current.json";
  writeD1RecoveryReadinessReport(report, outputFile);
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.recoveryReceiptValid ? 0 : 1;
}
