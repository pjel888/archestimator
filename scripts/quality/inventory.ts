import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import {
  finishCli,
  flagString,
  gitArgsWithoutReplacementObjects,
  makeResult,
  parseArgs,
  qualityRoot,
  readJson,
  type QualityFinding,
} from "./common";

const { flags } = parseArgs();
const root = qualityRoot();
const findings: QualityFinding[] = [];
const packageJson = await readJson<{ scripts?: Record<string, string> }>(resolve(root, "package.json"));
const tracked = spawnSync("git", gitArgsWithoutReplacementObjects(["ls-files"]), {
  cwd: root,
  encoding: "utf8",
});
if (tracked.status !== 0) findings.push({ code: "GIT_INVENTORY", message: "Cannot list tracked files" });
const files = tracked.stdout.split(/\r?\n/u).filter(Boolean);
const current = {
  commands: Object.fromEntries(
    Object.entries(packageJson.scripts ?? {}).filter(([name]) =>
      /^(?:quality:|test:|validate:|ops:|cf:)/u.test(name)
    ),
  ),
  files: {
    bun_tests: files.filter((path) => /tests\/bun\/.*\.test\./u.test(path)).length,
    vitest_tests: files.filter((path) => /tests\/vitest\/.*\.test\./u.test(path)).length,
    playwright_specs: files.filter((path) => /e2e\/.*\.spec\./u.test(path)).length,
    storybook_files: files.filter((path) => /\.stories\./u.test(path)).length,
    quality_scripts: files.filter((path) => path.startsWith("scripts/quality/")).length,
  },
  configs: {
    vitest: existsSync(resolve(root, "vitest.config.ts")),
    playwright: existsSync(resolve(root, "playwright.config.ts")),
    stryker: existsSync(resolve(root, "stryker.config.mjs")),
    workflows: files.filter((path) => path.startsWith(".github/workflows/")).sort(),
  },
};
const beforePath = flagString(flags, "before");
if (beforePath) {
  try {
    const before = await readJson<{ data?: { current?: typeof current }; current?: typeof current }>(
      resolve(root, beforePath),
    );
    const prior = before.data?.current ?? before.current;
    if (!prior) throw new Error("before inventory lacks current data");
    for (const [key, count] of Object.entries(prior.files)) {
      if (current.files[key as keyof typeof current.files] < count) {
        findings.push({
          code: "PROOF_INVENTORY_REGRESSION",
          message: `${key} decreased from ${count} to ${current.files[key as keyof typeof current.files]}`,
        });
      }
    }
  } catch (error) {
    findings.push({
      code: "BEFORE_INVENTORY_MALFORMED",
      message: `Before inventory is missing or malformed: ${String(error)}`,
    });
  }
}
const result = makeResult(
  "quality-inventory",
  findings,
  { current },
  findings.length === 0
    ? `Quality inventory PASS: ${Object.keys(current.commands).length} commands`
    : `Quality inventory FAIL with ${findings.length} finding(s)`,
);
await finishCli(
  result,
  resolve(root, flagString(flags, "output", "artifacts/quality/inventory.json")!),
);
