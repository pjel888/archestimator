import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";

const root = process.cwd();
const downloads = resolve(root, process.env.QUALITY_DOWNLOADS ?? "artifacts/quality-downloads");
const output = resolve(root, process.env.QUALITY_JOBS_OUTPUT ?? "artifacts/quality/jobs.json");
const profile = process.env.QUALITY_PROFILE;
const runId = process.env.QUALITY_RUN_ID;
const runAttempt = process.env.QUALITY_RUN_ATTEMPT;

if (!/^Q[0-3]_(CONTRACT_ONLY|CHANGE_GATE|CRITICAL_CHANGE_GATE|RELEASE_GATE)$/u.test(profile ?? "")) {
  throw new Error("QUALITY_PROFILE is missing or malformed");
}
if (!/^\d+$/u.test(runId ?? "") || !/^\d+$/u.test(runAttempt ?? "")) {
  throw new Error("QUALITY_RUN_ID and QUALITY_RUN_ATTEMPT must be numeric");
}

const selectedBddReport = profile === "Q3_RELEASE_GATE" ? "bdd.json" : "bdd-smoke.json";
const selectedE2eReport =
  profile === "Q3_RELEASE_GATE" ? "e2e-matrix.json" : "e2e-smoke.json";
const definitions = [
  ["quality / classify", "CLASSIFY", "classification", "classification.json"],
  ["quality / contracts", "CONTRACTS", "contracts", "contracts.json"],
  ["quality / adapters", "ADAPTERS", "adapters", "adapter-validation.json"],
  ["quality / anti-bypass", "ANTI_BYPASS", "anti-bypass", "anti-bypass.json"],
  ["quality / workflows", "WORKFLOWS", "workflows", "workflows.json"],
  ["quality / review", "REVIEW", "review", "reviews.json"],
  ["quality / enforcement", "ENFORCEMENT", "enforcement", "enforcement.json"],
  ["quality / static", "STATIC", "static", "static.json"],
  ["quality / unit", "UNIT", "unit", "unit.json"],
  ["quality / component", "COMPONENT", "component", "component.json"],
  ["quality / property", "PROPERTY", "property", "property.json"],
  ["quality / workers", "WORKERS", "workers", "workers.json"],
  ["quality / bdd-smoke", "BDD_SMOKE", "bdd", selectedBddReport],
  ["quality / a11y", "A11Y", "a11y", "a11y.json"],
  ["quality / build", "BUILD", "build", "build.json"],
  ["quality / e2e-smoke", "E2E_SMOKE", "e2e", selectedE2eReport],
  ["quality / mutation", "MUTATION", "mutation", "mutation.json"],
  ["quality / security", "SECURITY", "security", "security.json"],
  ["quality / ai-eval", "AI_EVAL", "ai-eval", "ai-eval.json"],
  ["quality / operations", "OPERATIONS", "operations", "operations.json"],
  ["quality / coverage", "COVERAGE", "coverage", "diff-coverage.json"],
];
const expectedKinds = new Map([
  ["quality / classify", "quality-classification"],
  ["quality / contracts", "quality-contracts"],
  ["quality / adapters", "ai-workflow-adapter-validation"],
  ["quality / anti-bypass", "anti-bypass"],
  ["quality / workflows", "workflow-security"],
  ["quality / review", "independent-review-gate"],
  ["quality / enforcement", "enforcement-contract"],
  ["quality / static", "quality-static"],
  ["quality / unit", "command-evidence"],
  ["quality / component", "component-gate"],
  ["quality / property", "command-evidence"],
  ["quality / workers", "command-evidence"],
  ["quality / bdd-smoke", "command-evidence"],
  ["quality / a11y", "command-evidence"],
  ["quality / build", "command-evidence"],
  ["quality / e2e-smoke", "command-evidence"],
  ["quality / mutation", "mutation-gate"],
  ["quality / security", "quality-security"],
  ["quality / ai-eval", "command-evidence"],
  ["quality / operations", "quality-operations"],
  ["quality / coverage", "diff-coverage"],
]);

async function findNamedFiles(directory, basename) {
  const matches = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      matches.push(...(await findNamedFiles(path, basename)));
    } else if (entry.isFile() && entry.name === basename) {
      matches.push(path);
    }
  }
  return matches;
}

const allowedStatuses = new Set(["success", "failure", "skipped", "cancelled"]);
const jobs = [];
for (const [name, statusEnvironment, artifactSlug, reportName] of definitions) {
  const expectedKind = expectedKinds.get(name);
  const rawStatus = process.env[statusEnvironment];
  const status = allowedStatuses.has(rawStatus) ? rawStatus : "failure";
  const artifactDirectory = resolve(
    downloads,
    `quality-${artifactSlug}-${runId}-${runAttempt}`,
  );
  let artifact;
  let evidencePass = false;
  try {
    const matches = await findNamedFiles(artifactDirectory, reportName);
    if (matches.length !== 1) {
      throw new Error(
        `${name} must provide exactly one ${reportName}; found ${matches.length}`,
      );
    }
    const bytes = await readFile(matches[0]);
    const report = JSON.parse(bytes.toString("utf8"));
    evidencePass =
      report?.schema_version === 1 &&
      report?.kind === expectedKind &&
      report?.status === "PASS" &&
      Array.isArray(report?.findings) &&
      report?.data !== null &&
      typeof report?.data === "object";
    if (!evidencePass) {
      throw new Error(`${name} produced a malformed or non-passing ${expectedKind} report`);
    }
    artifact = {
      path: relative(root, matches[0]).split(sep).join("/"),
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
  } catch (error) {
    process.stderr.write(`${String(error)}\n`);
  }
  jobs.push({
    name,
    status,
    conclusion: status === "success" && evidencePass ? "PASS" : "FAIL",
    flaky: false,
    ...(artifact ? { artifact } : {}),
  });
}

await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify({ jobs }, null, 2)}\n`, "utf8");
