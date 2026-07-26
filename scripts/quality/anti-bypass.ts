import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
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
  compareThresholds,
  scanAntiBypass,
  validateWaiver,
  type ScannableFile,
} from "./anti-bypass-core";
import {
  comparisonBaseFromFlags,
  type ComparisonBase,
} from "./comparison-base-core";

const { positionals, flags } = parseArgs();
const root = qualityRoot();
const findings: QualityFinding[] = [];
const files: ScannableFile[] = [];
let scanPaths = positionals;
let comparisonBase: ComparisonBase | undefined;
try {
  comparisonBase = await comparisonBaseFromFlags({ root, flags });
} catch (error) {
  findings.push({ code: "COMPARISON_BASE", message: String(error) });
}
if (scanPaths.length === 0 && !flagString(flags, "fixture") && comparisonBase) {
  try {
    const changed = spawnSync(
      "git",
      [
        "diff", "--no-renames", "--name-only", "--diff-filter=ACDMRTUXB",
        comparisonBase.resolved_sha,
      ],
      { cwd: root, encoding: "utf8" },
    );
    const untracked = spawnSync("git", ["ls-files", "--others", "--exclude-standard"], {
      cwd: root,
      encoding: "utf8",
    });
    if (changed.status !== 0 || untracked.status !== 0) {
      findings.push({ code: "DIFF_SCOPE", message: "Cannot derive anti-bypass scan scope" });
    } else {
      scanPaths = `${changed.stdout}\n${untracked.stdout}`
        .split(/\r?\n/u)
        .filter((path) => /\.(?:[cm]?[jt]sx?|json|ya?ml|feature)$/u.test(path))
        .filter(
          (path) =>
            !path.startsWith("quality/fixtures/") &&
            !path.startsWith("tests/vitest/quality/"),
        );
    }
  } catch (error) {
    findings.push({ code: "DIFF_SCOPE", message: String(error) });
  }
}
for (const path of scanPaths) {
  try {
    files.push({ path, text: await readFile(resolve(root, path), "utf8") });
  } catch {
    findings.push({ code: "SCAN_FILE_MISSING", message: `Cannot read ${path}`, path });
  }
}
const fixturePath = flagString(flags, "fixture");
if (fixturePath) {
  try {
    const fixture = await readJson<{ files: ScannableFile[] }>(resolve(root, fixturePath));
    if (!Array.isArray(fixture.files)) throw new Error("files must be an array");
    files.push(...fixture.files);
  } catch (error) {
    findings.push({
      code: "FIXTURE_MALFORMED",
      message: `Anti-bypass fixture is malformed: ${String(error)}`,
    });
  }
}
if (files.length === 0) {
  findings.push({ code: "SCAN_SCOPE_EMPTY", message: "At least one scan file or fixture is required" });
}
findings.push(...scanAntiBypass(files));

const beforePath = flagString(flags, "before-thresholds");
const afterPath = flagString(flags, "after-thresholds");
if (beforePath || afterPath) {
  try {
    if (!beforePath || !afterPath) throw new Error("both threshold paths are required");
    findings.push(
      ...compareThresholds(
        await readJson(resolve(root, beforePath)),
        await readJson(resolve(root, afterPath)),
      ),
    );
  } catch (error) {
    findings.push({
      code: "THRESHOLD_INPUT_MALFORMED",
      message: `Threshold comparison failed: ${String(error)}`,
    });
  }
}

for (const waiverPath of flags.has("waiver")
  ? String(flagString(flags, "waiver")).split(",")
  : []) {
  try {
    findings.push(...validateWaiver(await readJson(resolve(root, waiverPath))));
  } catch (error) {
    findings.push({
      code: "WAIVER_MALFORMED",
      message: `Waiver is missing or malformed: ${String(error)}`,
    });
  }
}

const result = makeResult(
  "anti-bypass",
  findings,
  { comparison_base: comparisonBase ?? null, scanned_files: files.map((file) => file.path) },
  findings.length === 0
    ? `Anti-bypass PASS for ${files.length} file(s)`
    : `Anti-bypass FAIL with ${findings.length} finding(s)`,
);
await finishCli(
  result,
  resolve(root, flagString(flags, "output", "artifacts/quality/anti-bypass.json")!),
);
