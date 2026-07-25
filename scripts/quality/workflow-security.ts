import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  finishCli,
  flagString,
  makeResult,
  parseArgs,
  qualityRoot,
  type QualityFinding,
} from "./common";
import { scanWorkflow } from "./workflow-security-core";

const { positionals, flags } = parseArgs();
const root = qualityRoot();
const directory = resolve(root, flagString(flags, "directory", ".github/workflows")!);
const findings: QualityFinding[] = [];
let paths = positionals;
if (paths.length === 0) {
  try {
    paths = (await readdir(directory))
      .filter((file) => /\.ya?ml$/u.test(file))
      .map((file) => resolve(directory, file));
  } catch (error) {
    findings.push({
      code: "WORKFLOW_DIRECTORY_MISSING",
      message: `Workflow directory is unreadable: ${String(error)}`,
    });
  }
}
for (const inputPath of paths) {
  const path = inputPath.startsWith("/") ? inputPath : resolve(root, inputPath);
  try {
    findings.push(...scanWorkflow(path, await readFile(path, "utf8")));
  } catch {
    findings.push({ code: "WORKFLOW_MISSING", message: `Workflow is unreadable: ${path}`, path });
  }
}
if (paths.length === 0) {
  findings.push({ code: "NO_WORKFLOWS", message: "No active workflows were found" });
}
const result = makeResult(
  "workflow-security",
  findings,
  { scanned_workflows: paths.length },
  findings.length === 0
    ? `Workflow security PASS for ${paths.length} workflow(s)`
    : `Workflow security FAIL with ${findings.length} finding(s)`,
);
await finishCli(
  result,
  resolve(root, flagString(flags, "output", "artifacts/quality/workflows.json")!),
);
