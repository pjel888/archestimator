import { createHash } from "node:crypto";
import type { QualityFinding } from "./common";
import type { QualityProfile } from "./classifier-core";

export type ReviewType = "quality" | "security" | "release";
export type ReviewDecision = "APPROVE" | "REQUEST_CHANGES" | "BLOCKED";

export interface ReviewRequirement {
  quality: boolean;
  security: boolean;
  release: boolean;
}

export interface ReviewEvidence {
  review_type: ReviewType;
  reviewer_id: string;
  decision: ReviewDecision;
  candidate_sha256: string;
  commit_sha?: string;
  reviewed_at: string;
  read_only: boolean;
  source: "local-agent" | "github";
  review_id?: string;
  url?: string;
}

export interface ReviewTargetFile {
  path: string;
  sha256: string;
}

const SECURITY_CAPABILITIES = new Set([
  "CAP-AUTH",
  "CAP-TENANT",
  "CAP-DATA-INTEGRITY",
  "CAP-CACHE-PRIVACY",
  "CAP-MIGRATION",
  "CAP-COLLABORATION",
  "CAP-UPLOAD",
  "CAP-EXPORT",
  "CAP-PROVIDER",
  "CAP-UNKNOWN",
]);

const QUALITY_SYSTEM_PATH =
  /^(?:quality\/|scripts\/quality\/|tests\/vitest\/quality\/|\.github\/|AGENTS\.md$|CODEX\.md$|CLAUDE\.md$|GEMINI\.md$|package\.json$|bun\.lock$|(?:vitest|playwright|stryker|tsconfig)[^/]*\.(?:json|[cm]?[jt]s)$)/u;

const SECURITY_PATH =
  /(?:^|\/)(?:auth|security|privacy|tenant|migration|upload|export|provider|cache)(?:[./_-]|$)/iu;

export function reviewRequirements(
  profile: QualityProfile,
  changedFiles: string[],
  affectedCapabilities: string[],
): ReviewRequirement {
  const quality = profile === "Q2_CRITICAL_CHANGE_GATE" || profile === "Q3_RELEASE_GATE";
  const qualitySystemChange = changedFiles.some((path) => QUALITY_SYSTEM_PATH.test(path));
  const securityRelevant =
    affectedCapabilities.some((capability) => SECURITY_CAPABILITIES.has(capability)) ||
    changedFiles.some((path) => SECURITY_PATH.test(path));
  return {
    quality,
    security:
      profile === "Q3_RELEASE_GATE" ||
      (profile === "Q2_CRITICAL_CHANGE_GATE" && (qualitySystemChange || securityRelevant)),
    release: profile === "Q3_RELEASE_GATE",
  };
}

export function candidateSha256(input: {
  commit_sha: string;
  profile: QualityProfile;
  changed_files: ReviewTargetFile[];
  affected_capabilities: string[];
}): string {
  const canonical = JSON.stringify({
    commit_sha: input.commit_sha,
    profile: input.profile,
    changed_files: [...input.changed_files].sort((left, right) =>
      left.path.localeCompare(right.path),
    ),
    affected_capabilities: [...input.affected_capabilities].sort(),
  });
  return createHash("sha256").update(canonical).digest("hex");
}

export function githubReviewTypes(body: string): ReviewType[] {
  const types: ReviewType[] = [];
  for (const type of ["quality", "security", "release"] as const) {
    if (
      new RegExp(
        String.raw`(?:\[${type}-review\]|review-type\s*:\s*${type}\b)`,
        "iu",
      ).test(body)
    ) {
      types.push(type);
    }
  }
  return types;
}

export function validateReviews(input: {
  requirements: ReviewRequirement;
  candidate_sha256: string;
  commit_sha: string;
  author_ids: string[];
  reviews: ReviewEvidence[];
}): QualityFinding[] {
  const findings: QualityFinding[] = [];
  const requiredTypes = (
    ["quality", "security", "release"] as const
  ).filter((type) => input.requirements[type]);
  const selected = new Map<ReviewType, ReviewEvidence>();

  for (const review of input.reviews) {
    if (
      !["quality", "security", "release"].includes(review.review_type) ||
      !review.reviewer_id ||
      !["APPROVE", "REQUEST_CHANGES", "BLOCKED"].includes(review.decision) ||
      !/^[a-f0-9]{64}$/u.test(review.candidate_sha256) ||
      !Number.isFinite(Date.parse(review.reviewed_at)) ||
      review.read_only !== true ||
      !["local-agent", "github"].includes(review.source)
    ) {
      findings.push({
        code: "REVIEW_MALFORMED",
        message: "Independent review evidence is malformed",
      });
      continue;
    }
    if (
      review.candidate_sha256 !== input.candidate_sha256 ||
      (review.commit_sha !== undefined && review.commit_sha !== input.commit_sha)
    ) {
      findings.push({
        code: "REVIEW_TARGET_MISMATCH",
        message: `${review.review_type} review by ${review.reviewer_id} does not bind the exact candidate`,
      });
      continue;
    }
    if (input.author_ids.includes(review.reviewer_id)) {
      findings.push({
        code: "REVIEW_NOT_INDEPENDENT",
        message: `${review.review_type} reviewer ${review.reviewer_id} is an author of the candidate`,
      });
      continue;
    }
    const prior = selected.get(review.review_type);
    if (
      !prior ||
      Date.parse(review.reviewed_at) > Date.parse(prior.reviewed_at)
    ) {
      selected.set(review.review_type, review);
    }
  }

  for (const type of requiredTypes) {
    const review = selected.get(type);
    if (!review) {
      findings.push({
        code: "REVIEW_REQUIRED",
        message: `Exact-candidate independent ${type} review is required`,
      });
    } else if (review.decision !== "APPROVE") {
      findings.push({
        code: "REVIEW_NOT_APPROVED",
        message: `${type} review by ${review.reviewer_id} decided ${review.decision}`,
      });
    }
  }

  const quality = selected.get("quality");
  const security = selected.get("security");
  if (
    input.requirements.security &&
    quality &&
    security &&
    quality.reviewer_id === security.reviewer_id
  ) {
    findings.push({
      code: "SECURITY_REVIEW_NOT_DISTINCT",
      message: "Security review must use a reviewer distinct from the quality reviewer",
    });
  }
  return findings;
}
