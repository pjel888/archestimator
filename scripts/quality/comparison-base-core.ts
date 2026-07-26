import { spawnSync } from "node:child_process";

export interface ComparisonBase {
  input_ref: string;
  resolved_sha: string;
}

export function comparisonBaseInput(
  flags: Map<string, string | boolean>,
  environment: Record<string, string | undefined> = process.env,
): string {
  if (flags.has("base")) {
    const value = flags.get("base");
    if (typeof value !== "string" || value.trim() !== value || value.length === 0) {
      throw new Error("--base requires one non-empty value");
    }
    return value;
  }
  const value = environment.QUALITY_BASE;
  if (!value || value.trim() !== value) {
    throw new Error("--base or QUALITY_BASE is required");
  }
  return value;
}

export async function resolveComparisonBase(input: {
  root: string;
  input_ref: string;
  resolved_sha?: string;
}): Promise<ComparisonBase> {
  if (!input.input_ref || input.input_ref.trim() !== input.input_ref) {
    throw new Error("Comparison base ref is missing or malformed");
  }
  if (input.resolved_sha !== undefined && !/^[a-f0-9]{40}$/u.test(input.resolved_sha)) {
    throw new Error("Forwarded comparison base SHA must be 40 lowercase hexadecimal characters");
  }
  if (input.resolved_sha) {
    if (/^[a-f0-9]{40}$/u.test(input.input_ref) && input.input_ref !== input.resolved_sha) {
      throw new Error(
        `Forwarded comparison base SHA ${input.resolved_sha} does not match ${input.input_ref}`,
      );
    }
    return { input_ref: input.input_ref, resolved_sha: input.resolved_sha };
  }
  const run = spawnSync("git", ["rev-parse", "--verify", `${input.input_ref}^{commit}`], {
    cwd: input.root,
    encoding: "utf8",
  });
  const resolved = run.status === 0 ? run.stdout.trim().toLowerCase() : "";
  if (!/^[a-f0-9]{40}$/u.test(resolved)) {
    throw new Error(`Cannot resolve comparison base ${input.input_ref} to a commit`);
  }
  return { input_ref: input.input_ref, resolved_sha: resolved };
}

export async function comparisonBaseFromFlags(input: {
  root: string;
  flags: Map<string, string | boolean>;
  environment?: Record<string, string | undefined>;
}): Promise<ComparisonBase> {
  return resolveComparisonBase({
    root: input.root,
    input_ref: comparisonBaseInput(input.flags, input.environment),
    resolved_sha:
      typeof input.flags.get("base-sha") === "string"
        ? String(input.flags.get("base-sha"))
        : undefined,
  });
}

export function validateReviewForwarding(
  reviews: string | undefined,
  authorIds: string | undefined,
): { reviews: string; author_ids: string } {
  if (!reviews) throw new Error("--reviews is required for critical verification");
  if (!authorIds) throw new Error("--author-ids is required for critical verification");
  const reviewParts = reviews.split(",");
  const authorParts = authorIds.split(",");
  if (
    reviewParts.some(
      (value) =>
        !value ||
        value.trim() !== value ||
        !/^[A-Za-z0-9_./\\-]+$/u.test(value),
    ) ||
    authorParts.some(
      (value) => !value || value.trim() !== value || !/^[A-Za-z0-9_-]+$/u.test(value),
    )
  ) {
    throw new Error("--reviews or --author-ids is malformed");
  }
  return { reviews, author_ids: authorIds };
}

const BASE_AWARE = new Set([
  "quality:classify",
  "quality:static",
  "quality:anti-bypass",
  "quality:diff-coverage",
  "quality:reviews",
  "quality:operations",
  "test:mutation:changed",
  "test:mutation:critical",
  "test:mutation:full",
]);

export function forwardedQualityArgs(
  command: string,
  input: {
    comparison_base: ComparisonBase;
    reviews?: string;
    author_ids?: string;
    expected?: string;
  },
): string[] {
  const [executable, runToken, script, ...rest] = command.split(/\s+/u);
  if (executable !== "bun" || runToken !== "run" || !script) {
    return command.split(/\s+/u).slice(1);
  }
  const args = [runToken, script, ...rest];
  if (BASE_AWARE.has(script)) {
    args.push(
      "--base",
      input.comparison_base.input_ref,
      "--base-sha",
      input.comparison_base.resolved_sha,
    );
  }
  if (script === "quality:reviews") {
    const forwarding = validateReviewForwarding(input.reviews, input.author_ids);
    if (input.expected) args.push("--expected", input.expected);
    args.push("--reviews", forwarding.reviews, "--author-ids", forwarding.author_ids);
  }
  return args;
}
