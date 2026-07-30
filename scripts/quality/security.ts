import { spawnSync } from "node:child_process";
import { lstat, readFile, readdir } from "node:fs/promises";
import { relative, resolve } from "node:path";
import {
  finishCli,
  flagString,
  makeResult,
  parseArgs,
  qualityRoot,
  type QualityFinding,
} from "./common";
import {
  evaluateSecurityGate,
  type SecuritySarifInput,
  type SecurityTextInput,
} from "./security-gate-core";
import { isScannableSecurityPath } from "./security-secret-core";

const MAX_SCANNED_FILE_BYTES = 32 * 1024 * 1024;
const { flags } = parseArgs();
const root = qualityRoot();
const outputPath = resolve(
  root,
  flagString(flags, "output", "artifacts/quality/security.json")!,
);

if (flags.has("plan")) {
  await finishCli(
    makeResult(
      "quality-security",
      [],
      {
        mode: "plan",
        checks: [
          "bun audit --json",
          "tracked and untracked source/config secret-pattern scan",
          "active workflow security scan",
          "optional supplied SARIF severity scan",
        ],
        external: { github_code_scanning: "EXTERNAL_PENDING" },
      },
      "Security checks selected; evidence not executed",
      "QUALITY_BLOCKED",
    ),
    outputPath,
  );
}

const findings: QualityFinding[] = [];

const auditStarted = performance.now();
const auditRun = spawnSync("bun", ["audit", "--json"], {
  cwd: root,
  encoding: "utf8",
  timeout: 10 * 60_000,
  maxBuffer: 20 * 1024 * 1024,
});
const auditCommand = {
  command: "bun audit --json",
  exit_code: auditRun.status,
  duration_ms: Math.round(performance.now() - auditStarted),
};
if (auditRun.status === null || ![0, 1].includes(auditRun.status)) {
  findings.push({
    code: "SECURITY_COMMAND_FAILED",
    message: `bun audit --json exited ${auditRun.status ?? "without status"}`,
  });
}
let auditReport: unknown;
try {
  auditReport = JSON.parse(auditRun.stdout.trim());
} catch {
  findings.push({
    code: "AUDIT_OUTPUT_MALFORMED",
    message: "bun audit --json did not emit parseable JSON",
  });
}

async function collectSecretInputs(): Promise<SecurityTextInput[]> {
  const listed = spawnSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    {
      cwd: root,
      encoding: "utf8",
      timeout: 60_000,
      maxBuffer: 20 * 1024 * 1024,
    },
  );
  if (listed.status !== 0) {
    findings.push({
      code: "SECRET_SCAN_FILE_LIST_FAILED",
      message: `git ls-files exited ${listed.status ?? "without status"}`,
    });
    return [];
  }
  const paths = [...new Set(listed.stdout.split("\0").filter(Boolean))]
    .filter(isScannableSecurityPath)
    .sort();
  const inputs: SecurityTextInput[] = [];
  for (const path of paths) {
    const absolutePath = resolve(root, path);
    try {
      const metadata = await lstat(absolutePath);
      if (!metadata.isFile()) {
        findings.push({
          code: "SECRET_SCAN_NON_FILE",
          message: `Secret scan cannot safely read non-file input: ${path}`,
          path,
        });
        continue;
      }
      if (metadata.size > MAX_SCANNED_FILE_BYTES) {
        findings.push({
          code: "SECRET_SCAN_FILE_TOO_LARGE",
          message: `Secret scan input exceeds ${MAX_SCANNED_FILE_BYTES} bytes: ${path}`,
          path,
        });
        continue;
      }
      inputs.push({ path, text: await readFile(absolutePath, "utf8") });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
      findings.push({
        code: "SECRET_SCAN_FILE_UNREADABLE",
        message: `Secret scan input is unreadable: ${path}`,
        path,
      });
    }
  }
  return inputs;
}

async function collectWorkflowInputs(): Promise<SecurityTextInput[]> {
  const directory = resolve(root, ".github/workflows");
  let names: string[];
  try {
    names = (await readdir(directory)).filter((name) => /\.ya?ml$/u.test(name)).sort();
  } catch {
    findings.push({
      code: "WORKFLOW_DIRECTORY_MISSING",
      message: "Active workflow directory is unreadable",
      path: ".github/workflows",
    });
    return [];
  }
  const inputs: SecurityTextInput[] = [];
  for (const name of names) {
    const path = `.github/workflows/${name}`;
    try {
      inputs.push({ path, text: await readFile(resolve(root, path), "utf8") });
    } catch {
      findings.push({
        code: "WORKFLOW_MISSING",
        message: `Workflow is unreadable: ${path}`,
        path,
      });
    }
  }
  return inputs;
}

async function collectSarifInputs(): Promise<SecuritySarifInput[]> {
  const configured = flagString(flags, "sarif");
  if (!configured) return [];
  const inputs: SecuritySarifInput[] = [];
  for (const suppliedPath of configured.split(",").map((path) => path.trim()).filter(Boolean)) {
    const absolutePath = resolve(root, suppliedPath);
    const repositoryPath = relative(root, absolutePath).replaceAll("\\", "/");
    if (
      repositoryPath === ".." ||
      repositoryPath.startsWith("../") ||
      repositoryPath.startsWith("/")
    ) {
      findings.push({
        code: "SARIF_PATH_OUTSIDE_ROOT",
        message: "Supplied SARIF path is outside the repository",
      });
      continue;
    }
    try {
      inputs.push({
        path: repositoryPath,
        report: JSON.parse(await readFile(absolutePath, "utf8")),
      });
    } catch {
      inputs.push({ path: repositoryPath, report: undefined });
    }
  }
  return inputs;
}

const [secretFiles, workflows, sarifReports] = await Promise.all([
  collectSecretInputs(),
  collectWorkflowInputs(),
  collectSarifInputs(),
]);
const evaluation = evaluateSecurityGate({
  auditReport,
  secretFiles,
  workflows,
  sarifReports,
});
findings.push(...evaluation.findings);

const result = makeResult(
  "quality-security",
  findings,
  {
    mode: "execute",
    commands: [auditCommand],
    ...evaluation.data,
  },
  findings.length === 0
    ? "Security PASS"
    : `Security FAIL with ${findings.length} finding(s)`,
);
await finishCli(result, outputPath);
