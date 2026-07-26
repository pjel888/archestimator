import { candidateDigest, type CanonicalCandidate } from "./candidate-core";
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
  commit_sha: string;
  reviewed_at: string;
  read_only: boolean;
  source: "local-agent" | "github";
  review_id?: string;
  url?: string;
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

const REVIEW_TYPES = ["quality", "security", "release"] as const;
const REVIEW_DECISIONS = ["APPROVE", "REQUEST_CHANGES", "BLOCKED"] as const;
const REVIEW_SOURCES = ["local-agent", "github"] as const;

function isReviewEvidenceMalformed(review: ReviewEvidence): boolean {
  return (
    !REVIEW_TYPES.includes(review.review_type) ||
    !review.reviewer_id ||
    !REVIEW_DECISIONS.includes(review.decision) ||
    !/^[a-f0-9]{64}$/u.test(review.candidate_sha256) ||
    !/^[a-f0-9]{40}$/u.test(review.commit_sha) ||
    !Number.isFinite(Date.parse(review.reviewed_at)) ||
    review.read_only !== true ||
    !REVIEW_SOURCES.includes(review.source)
  );
}

function selectReview(
  selected: Map<ReviewType, ReviewEvidence>,
  review: ReviewEvidence,
): void {
  const prior = selected.get(review.review_type);
  if (!prior || Date.parse(review.reviewed_at) > Date.parse(prior.reviewed_at)) {
    selected.set(review.review_type, review);
  }
}

function inspectReview(
  review: ReviewEvidence,
  input: {
    candidate: CanonicalCandidate;
    author_ids: string[];
  },
  selected: Map<ReviewType, ReviewEvidence>,
): QualityFinding | undefined {
  if (isReviewEvidenceMalformed(review)) {
    return {
      code: "REVIEW_MALFORMED",
      message: "Independent review evidence is malformed",
    };
  }
  if (
    review.candidate_sha256 !== input.candidate.sha256 ||
    review.commit_sha !== input.candidate.record.commit_sha
  ) {
    return {
      code: "REVIEW_TARGET_MISMATCH",
      message: `${review.review_type} review by ${review.reviewer_id} does not bind the exact candidate`,
    };
  }
  if (input.author_ids.includes(review.reviewer_id)) {
    return {
      code: "REVIEW_NOT_INDEPENDENT",
      message: `${review.review_type} reviewer ${review.reviewer_id} is an author of the candidate`,
    };
  }
  selectReview(selected, review);
  return undefined;
}

function canonicalCandidateFinding(candidate: CanonicalCandidate): QualityFinding | undefined {
  if (
    /^[a-f0-9]{40}$/u.test(candidate.record.commit_sha) &&
    /^[a-f0-9]{64}$/u.test(candidate.sha256) &&
    candidateDigest(candidate.record) === candidate.sha256
  ) {
    return undefined;
  }
  return {
    code: "REVIEW_TARGET_MISMATCH",
    message: "Review target is not the canonical candidate record",
  };
}

function requiredReviewFindings(
  requirements: ReviewRequirement,
  selected: Map<ReviewType, ReviewEvidence>,
): QualityFinding[] {
  const findings: QualityFinding[] = [];
  for (const type of REVIEW_TYPES.filter((candidate) => requirements[candidate])) {
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
  return findings;
}

function distinctSecurityReviewFinding(
  requirements: ReviewRequirement,
  selected: Map<ReviewType, ReviewEvidence>,
): QualityFinding | undefined {
  const quality = selected.get("quality");
  const security = selected.get("security");
  if (
    !requirements.security ||
    !quality ||
    !security ||
    quality.reviewer_id !== security.reviewer_id
  ) {
    return undefined;
  }
  return {
    code: "SECURITY_REVIEW_NOT_DISTINCT",
    message: "Security review must use a reviewer distinct from the quality reviewer",
  };
}

export function validateReviews(input: {
  requirements: ReviewRequirement;
  candidate: CanonicalCandidate;
  author_ids: string[];
  reviews: ReviewEvidence[];
}): QualityFinding[] {
  const findings: QualityFinding[] = [];
  const selected = new Map<ReviewType, ReviewEvidence>();
  const candidateFinding = canonicalCandidateFinding(input.candidate);
  if (candidateFinding) findings.push(candidateFinding);

  for (const review of input.reviews) {
    const finding = inspectReview(review, input, selected);
    if (finding) findings.push(finding);
  }

  findings.push(...requiredReviewFindings(input.requirements, selected));
  const distinctFinding = distinctSecurityReviewFinding(input.requirements, selected);
  if (distinctFinding) findings.push(distinctFinding);
  return findings;
}
