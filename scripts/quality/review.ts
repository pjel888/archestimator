import { resolve } from "node:path";
import {
  finishCli,
  flagString,
  makeResult,
  parseArgs,
  qualityRoot,
  readJson,
  type QualityFinding,
} from "./common";
import {
  buildCandidate,
  type CandidateClassification,
  type CanonicalCandidate,
} from "./candidate-core";
import { comparisonBaseFromFlags } from "./comparison-base-core";
import {
  githubReviewTypes,
  reviewRequirements,
  validateReviews,
  type ReviewEvidence,
} from "./review-core";

interface GithubReview {
  id: number | string;
  state: string;
  body?: string | null;
  commit_id?: string | null;
  submitted_at?: string | null;
  html_url?: string | null;
  user?: { id?: number | string; login?: string } | null;
}

const { flags } = parseArgs();
const root = qualityRoot();
const findings: QualityFinding[] = [];
const classificationPath = resolve(
  root,
  flagString(flags, "classification", "artifacts/quality/classification.json")!,
);
let classification: CandidateClassification | undefined;
let candidate: CanonicalCandidate | undefined;
try {
  classification = (
    await readJson<{ data: typeof classification }>(classificationPath)
  ).data;
  if (
    !classification ||
    !Array.isArray(classification.files) ||
    !Array.isArray(classification.affected_capabilities)
  ) {
    throw new Error("classification data is incomplete");
  }
  const comparisonBase = await comparisonBaseFromFlags({ root, flags });
  candidate = await buildCandidate({
    root,
    comparison_base: comparisonBase,
    classification,
    expected: flagString(flags, "expected"),
  });
  const requestedCommit = flagString(flags, "commit-sha") ?? process.env.QUALITY_CANDIDATE_SHA;
  if (requestedCommit && requestedCommit !== candidate.record.commit_sha) {
    throw new Error("Requested candidate commit SHA does not match canonical candidate HEAD");
  }
} catch (error) {
  findings.push({
    code: "CLASSIFICATION_MALFORMED",
    message: `Review classification is missing or malformed: ${String(error)}`,
  });
}
const candidateHash = candidate?.sha256 ?? "0".repeat(64);
const requirements = classification
  ? reviewRequirements(
      classification.profile,
      classification.files,
      classification.affected_capabilities,
    )
  : { quality: true, security: true, release: false };

const authorIds = new Set(
  String(flagString(flags, "author-ids", process.env.QUALITY_AUTHOR_IDS ?? ""))
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);
const reviews: ReviewEvidence[] = [];
let source: "local-agent" | "github" | "unavailable" = "unavailable";
const localReviewPaths = String(
  flagString(flags, "reviews", process.env.QUALITY_REVIEW_PATHS ?? ""),
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
if (localReviewPaths.length > 0) {
  source = "local-agent";
  if (authorIds.size === 0) {
    findings.push({
      code: "REVIEW_AUTHOR_UNBOUND",
      message:
        "Local independent reviews require QUALITY_AUTHOR_IDS or --author-ids to identify candidate authors",
    });
  }
  for (const path of localReviewPaths) {
    try {
      reviews.push(await readJson<ReviewEvidence>(resolve(root, path)));
    } catch (error) {
      findings.push({
        code: "REVIEW_MALFORMED",
        message: `Review artifact ${path} is missing or malformed: ${String(error)}`,
        path,
      });
    }
  }
} else if (
  process.env.GITHUB_TOKEN &&
  process.env.GITHUB_REPOSITORY &&
  process.env.QUALITY_PULL_REQUEST
) {
  source = "github";
  const response = await fetch(
    `${process.env.GITHUB_API_URL ?? "https://api.github.com"}/repos/${process.env.GITHUB_REPOSITORY}/pulls/${process.env.QUALITY_PULL_REQUEST}/reviews?per_page=100`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );
  if (!response.ok) {
    findings.push({
      code: "REVIEW_READBACK_FAILED",
      message: `GitHub review readback failed with HTTP ${response.status}`,
    });
  } else {
    const githubReviews = (await response.json()) as GithubReview[];
    for (const review of githubReviews) {
      const reviewerId = String(review.user?.id ?? review.user?.login ?? "");
      for (const type of githubReviewTypes(review.body ?? "")) {
        reviews.push({
          review_type: type,
          reviewer_id: reviewerId,
          decision:
            review.state === "APPROVED"
              ? "APPROVE"
              : review.state === "CHANGES_REQUESTED"
                ? "REQUEST_CHANGES"
                : "BLOCKED",
          candidate_sha256: candidateHash,
          commit_sha: review.commit_id ?? "",
          reviewed_at: review.submitted_at ?? "",
          read_only: true,
          source: "github",
          review_id: String(review.id),
          url: review.html_url ?? undefined,
        });
      }
    }
  }
} else if (requirements.quality || requirements.security || requirements.release) {
  findings.push({
    code: "REVIEW_SOURCE_UNAVAILABLE",
    message:
      "Provide exact-candidate local review artifacts with --reviews or authoritative GitHub review readback",
  });
}

if (classification && candidate) {
  findings.push(
    ...validateReviews({
      requirements,
      candidate,
      author_ids: [...authorIds],
      reviews,
    }),
  );
}
const selectedReviews = reviews
  .filter((review) => review.candidate_sha256 === candidateHash)
  .sort((left, right) =>
    `${left.review_type}:${left.reviewer_id}`.localeCompare(
      `${right.review_type}:${right.reviewer_id}`,
    ),
  );
const blockedCodes = new Set([
  "REVIEW_AUTHOR_UNBOUND",
  "REVIEW_REQUIRED",
  "REVIEW_SOURCE_UNAVAILABLE",
  "REVIEW_READBACK_FAILED",
]);
const status =
  findings.length === 0
    ? "PASS"
    : findings.every((finding) => blockedCodes.has(finding.code))
      ? "QUALITY_BLOCKED"
      : "FAIL";
const result = makeResult(
  "independent-review-gate",
  findings,
  {
    candidate: {
      ...candidate?.record,
      sha256: candidateHash,
    },
    requirements,
    source,
    author_ids: [...authorIds],
    reviews: selectedReviews,
  },
  findings.length === 0
    ? `Independent review PASS for ${candidateHash}`
    : `Independent review ${status} with ${findings.length} finding(s)`,
  status,
);
await finishCli(
  result,
  resolve(root, flagString(flags, "output", "artifacts/quality/reviews.json")!),
);
