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
} from "./common";
import {
  classifyFiles,
  PROFILES,
  type QualityProfile,
  type RiskMap,
} from "./classifier-core";
import { buildAttribution } from "./attribution";
import {
  comparisonBaseFromFlags,
  type ComparisonBase,
} from "./comparison-base-core";

function gitChangedFiles(baseSha: string): { files: string[]; error?: string } {
  const diff = spawnSync(
    "git",
    ["diff", "--no-renames", "--name-only", "--diff-filter=ACDMRTUXB", baseSha],
    { encoding: "utf8", cwd: qualityRoot() },
  );
  const untracked = spawnSync("git", ["ls-files", "--others", "--exclude-standard"], {
    encoding: "utf8",
    cwd: qualityRoot(),
  });
  if (diff.status !== 0 || untracked.status !== 0) {
    return { files: [], error: "Unable to read the complete merge-base-to-worktree diff" };
  }
  return {
    files: `${diff.stdout}\n${untracked.stdout}`.split(/\r?\n/u).filter(Boolean),
  };
}

const { positionals, flags } = parseArgs();
const root = qualityRoot();
const riskMapPath = resolve(root, flagString(flags, "risk-map", "quality/risk-map.json")!);
const output = resolve(
  root,
  flagString(flags, "output", "artifacts/quality/classification.json")!,
);
let files: string[] = [];
let classifierError: string | undefined;
let comparisonBase: ComparisonBase | undefined;
try {
  comparisonBase = await comparisonBaseFromFlags({ root, flags });
} catch (error) {
  classifierError = String(error);
}

const fixturePath = flagString(flags, "fixture");
if (fixturePath) {
  const fixture = await readJson<{ files?: string[]; malformed?: boolean }>(
    resolve(root, fixturePath),
  );
  files = fixture.files ?? [];
  if (fixture.malformed) classifierError = "Malformed classifier fixture";
} else if (flagString(flags, "files")) {
  files = flagString(flags, "files")!.split(",").filter(Boolean);
} else if (positionals.length > 0) {
  files = positionals;
} else {
  if (comparisonBase) {
    const changed = gitChangedFiles(comparisonBase.resolved_sha);
    files = changed.files;
    classifierError = classifierError ?? changed.error;
  }
}

let gitNexusRisk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | undefined;
const gitNexusPath = flagString(flags, "gitnexus");
if (gitNexusPath) {
  try {
    const payload = JSON.parse(await readFile(resolve(root, gitNexusPath), "utf8"));
    gitNexusRisk = payload.risk_level ?? payload.risk;
  } catch {
    classifierError = "Malformed GitNexus impact input";
  }
}

const requested = flagString(flags, "profile") as QualityProfile | undefined;
if (requested && !PROFILES.includes(requested)) classifierError = `Unknown profile ${requested}`;
const riskMap = await readJson<RiskMap>(riskMapPath);
const { classification, findings } = classifyFiles(files, riskMap, {
  requestedProfile: requested,
  release: flags.has("release"),
  gitNexusRisk,
  classifierError,
});
let attribution: Record<string, unknown> = {};
if (comparisonBase) {
  attribution = {
    ...await buildAttribution(root, classification.files, comparisonBase.resolved_sha),
    merge_base_ref: comparisonBase.input_ref,
    merge_base: comparisonBase.resolved_sha,
  };
}
const result = makeResult(
  "quality-classification",
  findings,
  {
    ...classification,
    comparison_base: comparisonBase ?? null,
    attribution,
  },
  `${classification.profile}: ${classification.files.length} changed path(s), ${classification.reasons.length} reason(s)`,
);
await finishCli(result, output);
