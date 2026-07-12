#!/usr/bin/env bun

import { readFileSync } from "node:fs";
import {
  CURRENT_LEGAL_DOCUMENT_VERSIONS,
  evaluateLimitedCohortLegalGate,
  type BroaderLaunchCounselCandidate,
  type LegalDocumentVersions,
  type LimitedCohortLegalCandidate,
} from "@/lib/legal/limited-cohort-legal-gate";

type LegalReadinessInput = {
  candidate?: LimitedCohortLegalCandidate | null;
  counsel?: BroaderLaunchCounselCandidate | null;
  currentDocuments?: LegalDocumentVersions;
  now?: string;
};

function parseInput(value: string | undefined): LegalReadinessInput {
  if (!value) return {};
  const parsed: unknown = JSON.parse(readFileSync(value, "utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("LEGAL_COHORT_READINESS_INPUT must contain a JSON object.");
  return parsed as LegalReadinessInput;
}

export function checkLimitedCohortLegalReadiness(input: LegalReadinessInput = {}) {
  return evaluateLimitedCohortLegalGate({
    candidate: input.candidate ?? null,
    counsel: input.counsel ?? null,
    currentDocuments: input.currentDocuments ?? CURRENT_LEGAL_DOCUMENT_VERSIONS,
    now: input.now ?? new Date().toISOString(),
  });
}

if (import.meta.main) {
  try {
    const result = checkLimitedCohortLegalReadiness(parseInput(process.env.LEGAL_COHORT_READINESS_INPUT));
    console.log(JSON.stringify(result, null, 2));
    if (!result.limitedCohort.schemaReady) process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
