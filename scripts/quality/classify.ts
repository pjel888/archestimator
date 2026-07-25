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

function gitChangedFiles(baseRef: string): { files: string[]; error?: string } {
  const mergeBase = spawnSync("git", ["merge-base", baseRef, "HEAD"], {
    encoding: "utf8",
    cwd: qualityRoot(),
  });
  if (mergeBase.status !== 0 || !mergeBase.stdout.trim()) {
    return { files: [], error: `Missing merge base for ${baseRef}` };
  }
  const diff = spawnSync(
    "git",
    ["diff", "--name-only", "--diff-filter=ACMR", mergeBase.stdout.trim()],
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
  const changed = gitChangedFiles(flagString(flags, "base", "main")!);
  files = changed.files;
  classifierError = changed.error;
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
const result = makeResult(
  "quality-classification",
  findings,
  {
    ...classification,
    attribution: await buildAttribution(
      root,
      classification.files,
      flagString(flags, "base", "main")!,
    ),
  },
  `${classification.profile}: ${classification.files.length} changed path(s), ${classification.reasons.length} reason(s)`,
);
await finishCli(result, output);
