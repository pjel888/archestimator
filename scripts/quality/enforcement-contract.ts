import { readdir, readFile } from "node:fs/promises";
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

const { flags } = parseArgs();
const root = qualityRoot();
const findings: QualityFinding[] = [];
const workflowDirectory = resolve(root, ".github/workflows");
let workflowFiles: string[] = [];
try {
  workflowFiles = (await readdir(workflowDirectory)).filter((path) => /\.ya?ml$/u.test(path));
} catch {
  findings.push({ code: "WORKFLOWS_MISSING", message: "Active workflow directory is missing" });
}
const workflowText = (
  await Promise.all(workflowFiles.map((path) => readFile(resolve(workflowDirectory, path), "utf8")))
).join("\n");
const profiles = await readJson<{
  profiles: Record<string, { required_jobs: string[] }>;
}>(resolve(root, "quality/profiles.json"));
const requiredChecks = [
  ...new Set(Object.values(profiles.profiles).flatMap((profile) => profile.required_jobs)),
];
for (const check of requiredChecks) {
  if (!workflowText.includes(check.replace("quality / ", "")) && !workflowText.includes(check)) {
    findings.push({
      code: "CHECK_NOT_EMITTED",
      message: `No active workflow emits required check ${check}`,
    });
  }
}
let remote: Record<string, unknown> | null = null;
const remotePath = flagString(flags, "remote-readback");
if (remotePath) {
  try {
    remote = await readJson(resolve(root, remotePath));
    if (remote.authoritative !== true || remote.required_checks_applied !== true) {
      findings.push({
        code: "REMOTE_ENFORCEMENT_UNPROVEN",
        message: "Remote readback is not authoritative or checks are not applied",
      });
    }
  } catch (error) {
    findings.push({
      code: "REMOTE_READBACK_MALFORMED",
      message: `Remote readback is malformed: ${String(error)}`,
    });
  }
}
const pending = !remotePath;
const result = makeResult(
  "enforcement-contract",
  findings,
  {
    local_workflows: workflowFiles,
    required_checks: requiredChecks,
    ci_contract: findings.filter((finding) => finding.code === "CHECK_NOT_EMITTED").length === 0
      ? "PASS"
      : "FAIL",
    remote_enforcement: pending ? "EXTERNAL_ENFORCEMENT_PENDING" : remote,
  },
  findings.length > 0
    ? `Enforcement contract FAIL with ${findings.length} finding(s)`
    : pending
      ? "Local enforcement contract PASS; remote enforcement is EXTERNAL_ENFORCEMENT_PENDING"
      : findings.length === 0
      ? "Enforcement contract PASS with authoritative remote readback"
      : "Enforcement contract FAIL",
  pending && findings.length === 0 ? "QUALITY_BLOCKED" : undefined,
);
await finishCli(
  result,
  resolve(root, flagString(flags, "output", "artifacts/quality/enforcement.json")!),
);
