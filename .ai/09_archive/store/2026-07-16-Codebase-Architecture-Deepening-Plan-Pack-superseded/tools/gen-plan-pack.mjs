// @file tools/gen-plan-pack.mjs
// Generates plan-pack.json for the Codebase Architecture Deepening pack.
// Computes artifact + evidence sha256 from the actual doc files and wires all
// bidirectional traceability required by scripts/lib/plan-pack-validator.mjs.
// Risk/decision registers mirror the canonical 06-RISKS-DECISIONS-AND-NON-GOALS.md
// (RISK-ARCH-01..11 -> RISK-001..011; DEC-ARCH-01..09 -> DEC-AUTO-001..009).
//
// Run AFTER all docs exist:  node tools/gen-plan-pack.mjs
// Then validate:            bun run validate:plan-pack -- .   (or --write to refresh manifest hash)
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACK = dirname(HERE);
const sha256 = (b) => createHash("sha256").update(b).digest("hex");
const git = (a) => execSync(`git ${a}`, { cwd: PACK, encoding: "utf8" }).trim();

function deepSort(v) {
  if (Array.isArray(v)) return v.map(deepSort);
  if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).sort().map((k) => [k, deepSort(v[k])]));
  return v;
}
function canonicalManifestBytes(m) {
  const c = structuredClone(m);
  delete c.manifest_sha256;
  return Buffer.from(JSON.stringify(deepSort(c)), "utf8");
}

const DOC_FILES = [
  "00-EXECUTIVE-DIRECTION.md", "01-CURRENT-ARCHITECTURE-AUDIT.md", "02-BLAST-RADIUS-ANALYSIS.md",
  "03-PERFORMANCE-AND-SPEED-STUDY.md", "04-EXECUTION-SIMULATIONS.md", "05-IMPLEMENTATION-ROADMAP.md",
  "06-RISKS-DECISIONS-AND-NON-GOALS.md", "07-TRACEABILITY-MATRIX.md", "README.md",
  "PACK-MANIFEST.md", "LOOP_LEDGER.md", "architecture-review.html",
];
const docHash = {};
for (const f of DOC_FILES) docHash[f] = sha256(readFileSync(join(PACK, f), "utf8"));

const ART = (id, path, role) => ({ id, role, path, sha256: docHash[path] });
const artifacts = [
  ART("ART-001", "00-EXECUTIVE-DIRECTION.md", "direction"),
  ART("ART-002", "01-CURRENT-ARCHITECTURE-AUDIT.md", "supporting"),
  ART("ART-003", "02-BLAST-RADIUS-ANALYSIS.md", "supporting"),
  ART("ART-004", "03-PERFORMANCE-AND-SPEED-STUDY.md", "supporting"),
  ART("ART-005", "04-EXECUTION-SIMULATIONS.md", "supporting"),
  ART("ART-006", "05-IMPLEMENTATION-ROADMAP.md", "canonical-execution"),
  ART("ART-007", "06-RISKS-DECISIONS-AND-NON-GOALS.md", "supporting"),
  ART("ART-008", "07-TRACEABILITY-MATRIX.md", "evidence"),
  ART("ART-009", "README.md", "direction"),
  ART("ART-010", "PACK-MANIFEST.md", "manifest"),
  ART("ART-011", "LOOP_LEDGER.md", "state"),
  ART("ART-012", "architecture-review.html", "source"),
];

// ---------- compact spec ----------
const CANDIDATES = [
  { n: 1, label: "UNIT-ARCH-01", title: "Carve Estimate-tree read module out of workspace god-file (+dead seams)", role: "CORE", phase: 1, dep: [], evDoc: "02-BLAST-RADIUS-ANALYSIS.md", risks: [8, 11] },
  { n: 2, label: "UNIT-ARCH-02", title: "Extract Component write-repository out of component-library/actions.ts", role: "CORE", phase: 1, dep: [1], evDoc: "02-BLAST-RADIUS-ANALYSIS.md", risks: [1, 5] },
  { n: 3, label: "UNIT-ARCH-03", title: "Collapse ~40-field row-handler hook into RowMutationCoordinator", role: "CORE", phase: 3, dep: [], evDoc: "02-BLAST-RADIUS-ANALYSIS.md", risks: [2, 5, 7] },
  { n: 4, label: "UNIT-ARCH-04", title: "Give Row commit/dirty/routing rules a tested home", role: "CORE", phase: 2, dep: [], evDoc: "02-BLAST-RADIUS-ANALYSIS.md", risks: [2, 7] },
  { n: 5, label: "UNIT-ARCH-05", title: "Collapse 4-layer handler prop-drilling; delete memo comparators", role: "CORE", phase: 3, dep: [3], evDoc: "03-PERFORMANCE-AND-SPEED-STUDY.md", risks: [6, 7, 9] },
  { n: 6, label: "UNIT-ARCH-06", title: "Delete pass-through field-setter reducer pattern", role: "CORE", phase: 0, dep: [], evDoc: "01-CURRENT-ARCHITECTURE-AUDIT.md", risks: [8] },
  { n: 7, label: "UNIT-ARCH-07", title: "Hoist duplicated Component/Folder mutation layer behind one module", role: "CORE", phase: 4, dep: [2], evDoc: "02-BLAST-RADIUS-ANALYSIS.md", risks: [3, 5] },
  { n: 8, label: "UNIT-ARCH-08", title: "Give the last-owner invariant one home", role: "CORE", phase: 1, dep: [], evDoc: "06-RISKS-DECISIONS-AND-NON-GOALS.md", risks: [4] },
  { n: 9, label: "UNIT-ARCH-09", title: "Collapse six BetaOperatingSourceSnapshot adapters into toSourceSnapshot", role: "CORE", phase: 1, dep: [], evDoc: "01-CURRENT-ARCHITECTURE-AUDIT.md", risks: [10] },
  { n: 10, label: "UNIT-ARCH-A1", title: "(AUX) Unify sheet display-transform pipeline + identity invariant", role: "AUXILIARY", phase: 4, dep: [5], evDoc: "01-CURRENT-ARCHITECTURE-AUDIT.md", risks: [6] },
  { n: 11, label: "UNIT-ARCH-A2", title: "(AUX) Merge two project-activity repositories into one", role: "AUXILIARY", phase: 4, dep: [], evDoc: "01-CURRENT-ARCHITECTURE-AUDIT.md", risks: [] },
  { n: 12, label: "UNIT-ARCH-A3", title: "(AUX) Free source-snapshot sanitizer from estimates/actions.ts", role: "AUXILIARY", phase: 4, dep: [], evDoc: "01-CURRENT-ARCHITECTURE-AUDIT.md", risks: [] },
  { n: 13, label: "UNIT-ARCH-A4", title: "(AUX) Excise image-upload subsystem from material-cell god-file", role: "AUXILIARY", phase: 4, dep: [], evDoc: "01-CURRENT-ARCHITECTURE-AUDIT.md", risks: [] },
  { n: 14, label: "UNIT-ARCH-A5", title: "(AUX) Collapse helpers grab-bag: keep accessors, delete dead half", role: "AUXILIARY", phase: 4, dep: [], evDoc: "01-CURRENT-ARCHITECTURE-AUDIT.md", risks: [11] },
  { n: 15, label: "UNIT-ARCH-A6", title: "(AUX) Deepen corporate-account actions tier; stop leaking Row shapes", role: "AUXILIARY", phase: 4, dep: [], evDoc: "01-CURRENT-ARCHITECTURE-AUDIT.md", risks: [] },
];

// Canonical register — mirrors 06-RISKS-DECISIONS-AND-NON-GOALS.md §1 (RISK-ARCH-01..11)
const RISKS_SPEC = [
  { n: 1, statement: "SQL drift or atomicity loss when write SQL is relocated into the write-repository (UNIT-002).", units: [2], like: "M", imp: "H", mit: "Statement-byte-identical relocation first (same SQL text, params, transaction grouping); TEST_PROPOSAL write-parity across the 5 leaked tables." },
  { n: 2, statement: "Optimistic-update / rollback corruption when row-mutation orchestration is rehomed (UNIT-003, UNIT-004).", units: [3, 4], like: "M", imp: "H", mit: "Isolate optimistic+dirty+rollback into the new module; cross-seam behavior test proposed; move as one slice, no half-move." },
  { n: 3, statement: "Generation-tracking rollback race duplicated across two UIs drifts during hoist (UNIT-007).", units: [7], like: "M", imp: "H", mit: "Move generation rollback as one indivisible unit with its mutation; preserve the 31-ref contract verbatim; TEST_PROPOSAL." },
  { n: 4, statement: "Ownership bypass if the last-owner invariant's four encodings diverge (UNIT-008).", units: [8], like: "L", imp: "H", mit: "One SQL predicate + one TS guard behind one function (DEC-009); both remove and update reject last-owner loss; 6 existing tests green." },
  { n: 5, statement: "A 'use server' file exports a non-async function; only next build catches it (UNIT-002, 003, 007).", units: [2, 3, 7], like: "M", imp: "M", mit: "Run next build before claiming these units done; tsc/vitest miss it." },
  { n: 6, statement: "Selector/context seam regresses render perf; deleting comparators before the cause (UNIT-005).", units: [5], like: "H", imp: "M", mit: "Selector/context seam not a smaller prop list (DEC-006); stabilize handler identity (UNIT-003) before deleting comparators; render-probe baseline + guard." },
  { n: 7, statement: "Phase-2/3 shared-file collision on the estimate sheet (UNIT-003/004/005).", units: [3, 4, 5], like: "L", imp: "M", mit: "Disjoint files where possible; LOOP_LEDGER first-writer-wins on any collision (DEC-004)." },
  { n: 8, statement: "Dead-seam / setter deletion order strands a dangling import (UNIT-001, UNIT-006).", units: [1, 6], like: "M", imp: "M", mit: "Delete callers before symbols; re-grep zero-caller symbols immediately before delete." },
  { n: 9, statement: "Contract test asserts comparator anchor strings, not behavior — false confidence (UNIT-005).", units: [5], like: "M", imp: "M", mit: "Replace the anchor-string assertion with a behavior assertion at the seam." },
  { n: 10, statement: "Adapter collapse drops or mis-maps a snapshot field (UNIT-009).", units: [9], like: "L", imp: "M", mit: "Behavior-preserving bar = identical overview snapshot output; admin-only surface." },
  { n: 11, statement: "Audit-time-dead symbols gain a caller before execution (UNIT-001, UNIT-014).", units: [1, 14], like: "L", imp: "M", mit: "Re-grep zero-caller/zero-importer symbols immediately before delete; audit-time dead != merge-time dead." },
];

// Mirrors 06 §3 + 00 §9/10 (DEC-ARCH-01..09)
const DECISIONS_SPEC = [
  { n: 1, statement: "Plan pack warranted: high-blast-radius, codebase-wide architecture refactor.", affected: ["REQ-001","REQ-002","REQ-003","REQ-004","REQ-005","REQ-006","REQ-007","REQ-008","REQ-009"] },
  { n: 2, statement: "Default test_requirement NOT_REQUIRED; TEST_PROPOSAL recorded (not executed) for high-blast units.", affected: ["AC-002","AC-003","AC-004","AC-007","AC-008"] },
  { n: 3, statement: "Deletion over compatibility (alpha/pre-beta) for dead seams and pass-through reducers.", affected: ["UNIT-001","UNIT-006","UNIT-014"] },
  { n: 4, statement: "One writer per shared file; disjoint-file units parallelize; LOOP_LEDGER first-writer-wins on collision.", affected: ["UNIT-003","UNIT-005","UNIT-006","UNIT-010"] },
  { n: 5, statement: "Read-side (UNIT-001) precedes write-side (UNIT-002) so the action/repository layering is legible first.", affected: ["UNIT-001","UNIT-002"] },
  { n: 6, statement: "UNIT-005 seam is selector/context, not a smaller prop list.", affected: ["UNIT-005"] },
  { n: 7, statement: "Keep the logic-encoding componentLibrarySheetReducer; delete only pass-through reducers.", affected: ["UNIT-006"] },
  { n: 8, statement: "Behavior-preserving bar: observable outputs unchanged; tsc + next build clean (build is a surface, not a gate, unless authorized).", affected: ["REQ-001","REQ-002","REQ-003","REQ-004","REQ-005","REQ-006","REQ-007","REQ-008","REQ-009"] },
  { n: 9, statement: "UNIT-008 target: one SQL predicate + one TS guard behind one function.", affected: ["UNIT-008"] },
];

const reqId = (n) => `REQ-${String(n).padStart(3, "0")}`;
const unitId = (n) => `UNIT-${String(n).padStart(3, "0")}`;
const acId = (n) => `AC-${String(n).padStart(3, "0")}`;
const evidId = (n) => `EVID-${String(n).padStart(3, "0")}`;
const riskId = (n) => `RISK-${String(n).padStart(3, "0")}`;
const decId = (n) => `DEC-AUTO-${String(n).padStart(3, "0")}`;

const sources = [
  { id: "SRC-001", status: "CURRENT", artifact_path: "architecture-review.html", affected_ids: [], _reqs: [1,2,3,4,5,6,7,8,9] },
  { id: "SRC-002", status: "CURRENT", artifact_path: "01-CURRENT-ARCHITECTURE-AUDIT.md", affected_ids: [], _reqs: CANDIDATES.map((c) => c.n) },
];

const requirements = CANDIDATES.map((c) => ({
  id: reqId(c.n), label: c.label, status: "ACCEPTED", completion_role: c.role,
  statement: `Deepen: ${c.title}.`,
  artifact_path: "01-CURRENT-ARCHITECTURE-AUDIT.md",
  source_ids: [], unit_ids: [], criterion_ids: [],
}));

const criteria = CANDIDATES.map((c) => ({
  id: acId(c.n), status: "N/A",
  requirement_ids: [reqId(c.n)],
  test_requirement: "NOT_REQUIRED", test_trigger: "NONE",
  test_rationale: `Acceptance criterion for ${c.label}: behavior-preserving deepen; evaluation deferred to execution (planning pack).`,
  test_ids: [], evidence_ids: [], authorization_boundary_id: null,
  artifact_path: "05-IMPLEMENTATION-ROADMAP.md",
}));

const units = CANDIDATES.map((c) => ({
  id: unitId(c.n), label: c.label, title: c.title, status: "PLANNED",
  depends_on: c.dep.map(unitId),
  requirement_ids: [], risk_ids: [], evidence_ids: [],
  goal: "Deepen the module so its interface shrinks and its behaviour concentrates (locality + leverage).",
  owned_paths: "see 02-BLAST-RADIUS-ANALYSIS.md and 05-IMPLEMENTATION-ROADMAP.md",
  implementation: "Move-only carve/extraction first; verify behavior-preserving; then narrow the interface.",
  acceptance_evidence: "Observable outputs unchanged; module testable through its interface; no new Row/SQL-shape leakage.",
  recovery: "Revert the unit; the prior shallow module is restored from git.",
  artifact_path: "02-BLAST-RADIUS-ANALYSIS.md",
}));

const evidence = CANDIDATES.map((c) => ({
  id: evidId(c.n), status: "PLANNED",
  claim_ids: [],
  source_revision: `git HEAD ${git("rev-parse --short HEAD")} + architecture-review 20260716`,
  valid_until: null,
  sha256: docHash[c.evDoc],
  artifact_path: c.evDoc,
  method: `Code audit + grep verification (see ${c.evDoc}).`,
  expected_signal: "Deletion-test verdict + caller graph + risk level recorded for this unit.",
}));

const risks = RISKS_SPEC.map((r) => ({
  id: riskId(r.n), status: "OPEN", statement: r.statement, likelihood: r.like, impact: r.imp, mitigation: r.mit,
  unit_ids: r.units.map(unitId),
  criterion_ids: r.units.map((u) => acId(u)),
  artifact_path: "06-RISKS-DECISIONS-AND-NON-GOALS.md",
}));

const decisions = DECISIONS_SPEC.map((d) => ({
  id: decId(d.n), status: "ACTIVE", statement: d.statement,
  affected_ids: d.affected,
  artifact_path: "00-EXECUTIVE-DIRECTION.md",
}));

// ---- wire reciprocity ----
for (const s of sources) {
  s.affected_ids = s._reqs.map(reqId);
  delete s._reqs;
  for (const id of s.affected_ids) requirements[Number(id.slice(4)) - 1].source_ids.push(s.id);
}
for (const c of CANDIDATES) {
  requirements[c.n - 1].unit_ids.push(unitId(c.n));
  requirements[c.n - 1].criterion_ids.push(acId(c.n));
  units[c.n - 1].requirement_ids.push(reqId(c.n));
}
for (const c of CANDIDATES) {
  units[c.n - 1].evidence_ids.push(evidId(c.n));
  evidence[c.n - 1].claim_ids.push(unitId(c.n));
}
for (const r of risks) {
  for (const u of r.unit_ids) units[Number(u.slice(5)) - 1].risk_ids.push(r.id);
}

const gate = (id, nums, doc) => ({
  id, status: "N/A", criterion_ids: nums.map(acId), evidence_ids: [], authorization_boundary_id: null, artifact_path: doc,
});
const gates = [
  gate("GATE-CONTRACT-01", [1,2,3,4,5,7], "00-EXECUTIVE-DIRECTION.md"),
  gate("GATE-NEXT-01", [2,3,4,5,7], "00-EXECUTIVE-DIRECTION.md"),
  gate("GATE-PERF-01", [3,4,5,7], "03-PERFORMANCE-AND-SPEED-STUDY.md"),
  gate("GATE-CLEAN-01", [1,6,14], "00-EXECUTIVE-DIRECTION.md"),
  gate("GATE-VERIFY-01", [1,2,3,4,5,6,7,8,9], "00-EXECUTIVE-DIRECTION.md"),
];

const assumptions = [
  { id: "ASSUMP-001", status: "ACTIVE", statement: "Every unit is behavior-preserving: current observable outputs are the regression baseline.", affected_ids: CANDIDATES.filter((c) => c.role === "CORE").map((c) => reqId(c.n)), artifact_path: "00-EXECUTIVE-DIRECTION.md" },
];

const head = git("rev-parse HEAD");
const manifest = {
  schema_version: "1.0",
  suite_version: "2026-07-12",
  package_id: "PLAN-2026-07-16-codebase-architecture-deepening",
  profile: "high-blast-radius",
  package_action_ceiling: "IMPLEMENT_LOCAL",
  last_observed_run_scope: "PLAN_ONLY",
  package_status: "NOT_READY",
  implementation_status: "NOT_STARTED",
  release_status: "NOT_EVALUATED",
  plan_lifecycle: "ACTIVE",
  terminal_status: "ACTIVE",
  baseline: { head, scoped_status_sha256: sha256(""), scoped_diff_sha256: sha256("") },
  canonical_execution_artifact: "05-IMPLEMENTATION-ROADMAP.md",
  updated_at: new Date().toISOString(),
  stale_triggers: [
    "hot-belt churn: EstimateSheetContent.tsx, component-library/actions.ts, workspace-repository.ts actively edited",
    "Estimate-row handler/rollback contract changes (UNIT-003/004)",
    "component-library write-path SQL changes (UNIT-002)",
  ],
  next_unit: null,
  artifacts, sources, requirements, assumptions, risks, criteria, tests: [],
  gates, units, decisions, authorization_boundaries: [], evidence_index: evidence, ready_slices: [],
};
manifest.manifest_sha256 = sha256(canonicalManifestBytes(manifest));

writeFileSync(join(PACK, "plan-pack.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`wrote plan-pack.json · ${artifacts.length} artifacts, ${requirements.length} reqs, ${units.length} units, ${risks.length} risks, ${decisions.length} decisions, ${gates.length} gates · manifest_sha256=${manifest.manifest_sha256.slice(0, 12)}`);
