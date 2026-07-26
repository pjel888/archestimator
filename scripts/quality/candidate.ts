import { resolve } from "node:path";
import { buildCandidate, type CandidateClassification } from "./candidate-core";
import { comparisonBaseFromFlags } from "./comparison-base-core";
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
let candidate;
try {
  const comparisonBase = await comparisonBaseFromFlags({ root, flags });
  const classification = (
    await readJson<{ data: CandidateClassification }>(
      resolve(root, flagString(flags, "classification", "artifacts/quality/classification.json")!),
    )
  ).data;
  candidate = await buildCandidate({
    root,
    comparison_base: comparisonBase,
    classification,
    expected: flagString(flags, "expected"),
  });
} catch (error) {
  findings.push({ code: "CANDIDATE_INVALID", message: String(error) });
}
await finishCli(
  makeResult(
    "quality-candidate",
    findings,
    candidate ?? { record: null, sha256: null },
    candidate ? `Candidate ${candidate.sha256}` : "Candidate construction failed",
  ),
  resolve(root, flagString(flags, "output", "artifacts/quality/candidate.json")!),
);
