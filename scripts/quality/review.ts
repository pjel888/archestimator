import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
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
import type { QualityProfile } from "./classifier-core";
import {
  candidateSha256,
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
const commitSha =
  flagString(flags, "commit-sha") ??
  process.env.QUALITY_CANDIDATE_SHA ??
  spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).stdout.trim();

let classification: {
  profile: QualityProfile;
  files: string[];
  affected_capabilities: string[];
} | undefined;
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
} catch (error) {
  findings.push({
    code: "CLASSIFICATION_MALFORMED",
    message: `Review classification is missing or malformed: ${String(error)}`,
  });
}
if (!/^[a-f0-9]{40}$/u.test(commitSha)) {
  findings.push({
    code: "REVIEW_COMMIT_SHA",
    message: "Review candidate commit SHA must contain exactly 40 lowercase hexadecimal characters",
  });
}

const targetFiles = [];
for (const path of [...(classification?.files ?? [])].sort()) {
  const absolute = resolve(root, path);
  targetFiles.push({
    path,
    sha256: existsSync(absolute) ? sha256(await readFile(absolute)) : sha256("DELETED"),
  });
}
const candidateHash =
  classification && /^[a-f0-9]{40}$/u.test(commitSha)
    ? candidateSha256({
        commit_sha: commitSha,
        profile: classification.profile,
        changed_files: targetFiles,
        affected_capabilities: classification.affected_capabilities,
      })
    : "0".repeat(64);
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
          commit_sha: review.commit_id ?? undefined,
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

if (classification) {
  findings.push(
    ...validateReviews({
      requirements,
      candidate_sha256: candidateHash,
      commit_sha: commitSha,
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
      commit_sha: commitSha,
      sha256: candidateHash,
      files: targetFiles,
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
