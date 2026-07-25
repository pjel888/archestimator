import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  finishCli,
  flagString,
  makeResult,
  parseArgs,
  qualityRoot,
  readJson,
  sha256,
  type QualityFinding,
} from "./common";

type Classification =
  | "must_fix_critical"
  | "must_fix_infrastructure"
  | "ratchet_noncritical";

interface InventoryRecord {
  id: string;
  runner: string;
  file: string;
  test_or_scenario: string;
  failure_kind:
    | "failed_file"
    | "failed_test"
    | "skipped_file"
    | "skipped_test"
    | "collection_failure"
    | "unhandled_error";
  normalized_signature: string;
  critical_capability_ids: string[];
  root_cause_cluster: string;
  classification: Classification;
  owner: string;
  rationale: string;
  acceptance: { command: string; expected_artifact: string };
  status: "open" | "proposed" | "closed" | "admitted";
  evidence_artifact: string | null;
  review: {
    status: "pending" | "approved" | "rejected";
    required_by: string | null;
    expires_at: string | null;
    quality_reviewer: string | null;
    security_reviewer: string | null;
    reviewed_inventory_sha256: string | null;
  };
}

interface Inventory {
  schema_version: number;
  generated_at: string;
  source: {
    runner: string;
    command: string;
    commit: string;
    artifact: string;
    artifact_sha256: string;
    observed_start: string;
    observed_duration_seconds: number;
  };
  counts: {
    failed_files: number;
    failed_tests: number;
    skipped_tests: number;
    skipped_files: number;
    collection_failures: number;
    unhandled_errors: number;
    total_records: number;
    classifications: Record<Classification, number>;
  };
  critical_capabilities: { id: string; name: string; critical: true }[];
  admission: {
    phase: "draft" | "admission";
    status: string;
    open_must_fix_records: number;
    proposed_ratchet_records: number;
    quality_review: { status: string; artifact: string; inventory_sha256: string | null };
    security_review: { status: string; artifact: string; inventory_sha256: string | null };
  };
  identity_derivation: Record<string, string>;
  uncertainties: string[];
  records: InventoryRecord[];
}

function requiredString(
  findings: QualityFinding[],
  value: unknown,
  path: string,
): value is string {
  if (typeof value !== "string" || value.trim() === "") {
    findings.push({ code: "SCHEMA_STRING", message: `${path} must be a non-empty string` });
    return false;
  }
  return true;
}

function validateRecordShape(record: InventoryRecord, index: number, findings: QualityFinding[]) {
  const path = `records[${index}]`;
  for (const key of [
    "id",
    "runner",
    "file",
    "test_or_scenario",
    "normalized_signature",
    "root_cause_cluster",
    "owner",
    "rationale",
  ] as const) {
    requiredString(findings, record?.[key], `${path}.${key}`);
  }
  if (!/^dom-[a-z0-9-]+$/u.test(record?.id ?? "")) {
    findings.push({ code: "INVALID_ID", message: `${path}.id is not a stable inventory identifier` });
  }
  if (
    ![
      "failed_file",
      "failed_test",
      "skipped_file",
      "skipped_test",
      "collection_failure",
      "unhandled_error",
    ].includes(
      record?.failure_kind,
    )
  ) {
    findings.push({ code: "FAILURE_KIND", message: `${path}.failure_kind is invalid` });
  }
  if (
    !["must_fix_critical", "must_fix_infrastructure", "ratchet_noncritical"].includes(
      record?.classification,
    )
  ) {
    findings.push({ code: "CLASSIFICATION", message: `${path}.classification is invalid` });
  }
  if (!Array.isArray(record?.critical_capability_ids)) {
    findings.push({
      code: "CAPABILITY_LIST",
      message: `${path}.critical_capability_ids must be an array`,
    });
  }
  requiredString(findings, record?.acceptance?.command, `${path}.acceptance.command`);
  requiredString(
    findings,
    record?.acceptance?.expected_artifact,
    `${path}.acceptance.expected_artifact`,
  );
  if (!["open", "proposed", "closed", "admitted"].includes(record?.status)) {
    findings.push({ code: "STATUS", message: `${path}.status is invalid` });
  }
  if (!record?.review || typeof record.review !== "object") {
    findings.push({ code: "REVIEW", message: `${path}.review is malformed` });
  } else {
    if (
      record.review.required_by !== null &&
      Number.isNaN(Date.parse(record.review.required_by))
    ) {
      findings.push({ code: "REVIEW_DATE", message: `${path}.review.required_by is invalid` });
    }
    if (
      record.review.expires_at !== null &&
      Number.isNaN(Date.parse(record.review.expires_at))
    ) {
      findings.push({ code: "REVIEW_EXPIRY", message: `${path}.review.expires_at is invalid` });
    }
  }
}

async function validateReview(
  path: string,
  expectedSha: string,
  disallowedReviewers: string[],
  priorReviewer: string | undefined,
  findings: QualityFinding[],
): Promise<string | undefined> {
  let text = "";
  try {
    text = await readFile(path, "utf8");
  } catch {
    findings.push({ code: "MISSING_REVIEW", message: `Missing independent review ${path}` });
    return undefined;
  }
  const decision = text.match(/(?:Decision|Status)\s*:\s*`?(APPROVE|REJECT)`?/iu)?.[1];
  const reviewSha = text.match(/Inventory SHA-?256\s*:\s*`?([a-f0-9]{64})`?/iu)?.[1];
  const reviewer = text.match(/Reviewer\s*:\s*`?([^`\r\n]+)`?/iu)?.[1]?.trim();
  if (decision !== "APPROVE") {
    findings.push({ code: "REVIEW_DECISION", message: `${path} must record APPROVE` });
  }
  if (reviewSha !== expectedSha) {
    findings.push({ code: "REVIEW_SHA", message: `${path} does not approve inventory ${expectedSha}` });
  }
  if (!reviewer) {
    findings.push({ code: "REVIEWER_MISSING", message: `${path} does not identify a reviewer` });
  } else if (disallowedReviewers.includes(reviewer) || reviewer === priorReviewer) {
    findings.push({
      code: "REVIEWER_NOT_INDEPENDENT",
      message: `${path} reviewer is not independent`,
    });
  }
  return reviewer;
}

const { positionals, flags } = parseArgs();
const root = qualityRoot();
const inventoryPath = resolve(root, positionals[0] ?? flagString(flags, "inventory", "")!);
const output = resolve(
  root,
  flagString(flags, "output", "artifacts/quality/baseline-admission.json")!,
);
const phase = flagString(flags, "phase", "draft");
const findings: QualityFinding[] = [];
let inventory: Inventory | undefined;
let raw = "";

if (!positionals[0] && !flagString(flags, "inventory")) {
  findings.push({ code: "INVENTORY_REQUIRED", message: "Inventory path is required" });
} else {
  try {
    raw = await readFile(inventoryPath, "utf8");
    inventory = JSON.parse(raw) as Inventory;
  } catch (error) {
    findings.push({
      code: "INVENTORY_MALFORMED",
      message: `Inventory is missing or malformed: ${String(error)}`,
    });
  }
}

if (phase !== "draft" && phase !== "admission") {
  findings.push({ code: "PHASE_INVALID", message: `Unsupported phase ${phase}` });
}

if (inventory) {
  if (inventory.schema_version !== 1) {
    findings.push({ code: "SCHEMA_VERSION", message: "schema_version must be 1" });
  }
  if (Number.isNaN(Date.parse(inventory.generated_at))) {
    findings.push({ code: "GENERATED_AT", message: "generated_at must be an ISO date-time" });
  }
  if (
    !inventory.source ||
    !requiredString(findings, inventory.source.command, "source.command") ||
    !/^[a-f0-9]{64}$/u.test(inventory.source.artifact_sha256 ?? "")
  ) {
    findings.push({ code: "SOURCE", message: "source metadata is malformed" });
  }
  if (!Array.isArray(inventory.records)) {
    findings.push({ code: "RECORDS", message: "records must be an array" });
  } else {
    inventory.records.forEach((record, index) => validateRecordShape(record, index, findings));
    const ids = inventory.records.map((record) => record.id);
    if (new Set(ids).size !== ids.length) {
      findings.push({ code: "DUPLICATE_ID", message: "Record IDs must be unique" });
    }
    const identities = inventory.records.map((record) =>
      [record.runner, record.file, record.test_or_scenario, record.failure_kind].join("\u0000")
    );
    if (new Set(identities).size !== identities.length) {
      findings.push({
        code: "DUPLICATE_IDENTITY",
        message: "Each runner/file/test/failure-kind identity must occur exactly once",
      });
    }

    const expectedCounts: Record<string, number> = {
      total_records: inventory.records.length,
      failed_files: inventory.records.filter((record) => record.failure_kind === "failed_file").length,
      failed_tests: inventory.records.filter((record) => record.failure_kind === "failed_test").length,
      skipped_files: inventory.records.filter((record) => record.failure_kind === "skipped_file").length,
      skipped_tests: inventory.records.filter((record) => record.failure_kind === "skipped_test").length,
      collection_failures: inventory.records.filter(
        (record) => record.failure_kind === "collection_failure"
      ).length,
      unhandled_errors: inventory.records.filter(
        (record) => record.failure_kind === "unhandled_error"
      ).length,
    };
    for (const [key, expected] of Object.entries(expectedCounts)) {
      if (inventory.counts?.[key] !== expected) {
        findings.push({
          code: "COUNT_MISMATCH",
          message: `counts.${key} is ${inventory.counts?.[key]}, expected ${expected}`,
        });
      }
    }
    for (const classification of [
      "must_fix_critical",
      "must_fix_infrastructure",
      "ratchet_noncritical",
    ] as const) {
      const expected = inventory.records.filter(
        (record) => record.classification === classification
      ).length;
      if (inventory.counts?.classifications?.[classification] !== expected) {
        findings.push({
          code: "CLASSIFICATION_COUNT_MISMATCH",
          message: `counts.classifications.${classification} is ${inventory.counts?.classifications?.[classification]}, expected ${expected}`,
        });
      }
    }

    const inventoryCapabilities = new Set(
      (inventory.critical_capabilities ?? []).map((capability) => capability.id),
    );
    const registry = await readJson<{ capabilities: { id: string }[] }>(
      resolve(root, "quality/critical-capabilities.json"),
    );
    const registryCapabilities = new Set(registry.capabilities.map((capability) => capability.id));
    for (const record of inventory.records) {
      for (const capability of record.critical_capability_ids ?? []) {
        if (!inventoryCapabilities.has(capability) || !registryCapabilities.has(capability)) {
          findings.push({
            code: "UNKNOWN_CAPABILITY",
            message: `${record.id} references unknown capability ${capability}`,
          });
        }
      }
      const cannotRatchet =
        record.critical_capability_ids?.length > 0 ||
        ["collection_failure", "unhandled_error"].includes(record.failure_kind);
      if (record.classification === "ratchet_noncritical" && cannotRatchet) {
        findings.push({
          code: "ILLEGAL_RATCHET",
          message: `${record.id} cannot be admitted as noncritical debt`,
        });
      }
      if (
        record.failure_kind === "collection_failure" &&
        record.classification !== "must_fix_infrastructure"
      ) {
        findings.push({
          code: "INFRASTRUCTURE_CLASSIFICATION",
          message: `${record.id} infrastructure failure must be must_fix_infrastructure`,
        });
      }
      if (record.classification === "ratchet_noncritical") {
        if (
          record.status !== "proposed" && record.status !== "admitted" ||
          !record.review.required_by ||
          !record.review.expires_at ||
          Date.parse(record.review.expires_at) <= Date.now()
        ) {
          findings.push({
            code: "RATCHET_REVIEW",
            message: `${record.id} requires a current time-bounded debt review`,
          });
        }
      }
      if (phase === "admission" && record.classification !== "ratchet_noncritical") {
        if (record.status !== "closed") {
          findings.push({
            code: "OPEN_MUST_FIX",
            message: `${record.id} remains open at admission`,
          });
        } else {
          try {
            if (record.evidence_artifact !== record.acceptance.expected_artifact) {
              throw new Error("evidence artifact does not match acceptance artifact");
            }
            await access(resolve(root, record.evidence_artifact));
          } catch {
            findings.push({
              code: "MISSING_ACCEPTANCE_ARTIFACT",
              message: `${record.id} acceptance artifact is missing`,
              path: record.acceptance.expected_artifact,
            });
          }
        }
      }
    }
    const openMustFix = inventory.records.filter(
      (record) =>
        record.classification !== "ratchet_noncritical" &&
        record.status !== "closed",
    ).length;
    const proposedRatchets = inventory.records.filter(
      (record) =>
        record.classification === "ratchet_noncritical" &&
        record.status === "proposed",
    ).length;
    if (inventory.admission?.open_must_fix_records !== openMustFix) {
      findings.push({
        code: "ADMISSION_OPEN_COUNT",
        message: `admission.open_must_fix_records is ${inventory.admission?.open_must_fix_records}, expected ${openMustFix}`,
      });
    }
    if (inventory.admission?.proposed_ratchet_records !== proposedRatchets) {
      findings.push({
        code: "ADMISSION_RATCHET_COUNT",
        message: `admission.proposed_ratchet_records is ${inventory.admission?.proposed_ratchet_records}, expected ${proposedRatchets}`,
      });
    }
  }

  if (phase === "admission") {
    const inventorySha = sha256(raw);
    const disallowedReviewers = String(flagString(flags, "disallowed-reviewers", ""))
      .split(",")
      .filter(Boolean);
    const qualityReview = resolve(
      root,
      flagString(
        flags,
        "quality-review",
        ".omx/reviews/beta-quality-baseline-quality.md",
      )!,
    );
    const securityReview = resolve(
      root,
      flagString(
        flags,
        "security-review",
        ".omx/reviews/beta-quality-baseline-security.md",
      )!,
    );
    const qualityReviewer = await validateReview(
      qualityReview,
      inventorySha,
      disallowedReviewers,
      undefined,
      findings,
    );
    await validateReview(
      securityReview,
      inventorySha,
      disallowedReviewers,
      qualityReviewer,
      findings,
    );
  }
}

const result = makeResult(
  "baseline-admission",
  findings,
  {
    phase,
    inventory: inventoryPath,
    inventory_sha256: raw ? sha256(raw) : null,
    record_count: inventory?.records?.length ?? 0,
  },
  findings.length === 0
    ? `Baseline ${phase} validation passed for ${inventory?.records.length ?? 0} record(s)`
    : `Baseline ${phase} validation failed with ${findings.length} finding(s)`,
);
await finishCli(result, output);
