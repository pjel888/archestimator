# 04 — Requirements Specification

Every requirement has a stable ID, source, priority, acceptance criteria (objective/testable), validation method, affected areas, risks, and status. Priorities: P0 = must for the pack to satisfy its stop condition; P1 = strongly recommended; P2 = nice-to-have.

Source-strength legend: `brief` (from PROMPT.md), `repo evidence` (read from current files), `derived` (inferred to satisfy the brief), `official docs` (framework/provider docs), `owner-delegated` (owner decision needed).

## Product / scope

### FR-1 — Canonical operational-facts home (P0)
- **Statement:** A single Markdown file is the canonical home an agent reads first for operational facts (migrations, crons, bindings, Worker/domains, compatibility, provider-exit posture, cost tier, retention posture). It clearly separates *mechanical* facts (generated from substrate) from *posture* facts (curated narrative with a source citation).
- **Rationale:** PROMPT "Define canonical facts". Eliminates multi-artifact ambiguity.
- **Source:** brief + repo evidence (§3.4 overlap). **Priority:** P0.
- **Dependencies:** FR-2 (snapshot) feeds the mechanical section.
- **Acceptance criteria:**
  - AC-FR-1a: The home contains the live cron list verbatim matching `wrangler.jsonc`, with a "source: `wrangler.jsonc`" marker.
  - AC-FR-1b: The home contains the live D1 migration count + latest filename matching `migrations/`, with a "source: `migrations/`" marker.
  - AC-FR-1c: The home lists all seven bindings (D1/R2/DO/Queue+DLQ/Images/Email/Assets) matching `wrangler.jsonc`.
  - AC-FR-1d: The home separates "runtime migration: complete" from "provider-exit closure: OPEN/NOT READY (5 blockers)" and cites the runbook.
  - AC-FR-1e: A fresh agent reading only this file can answer "how many crons run? what is the latest migration? is the provider exit final?" correctly.
- **Validation:** DOC review checklist + FR-9 detector asserts AC-FR-1a/b/c mechanically.
- **Affected areas:** new file (location = OPEN-1). **Risks:** wrong location reduces adoption. **Status:** specified.

### FR-2 — Generated operational-truth snapshot (P0)
- **Statement:** A script generates `operational-truth.snapshot.json` by reading the substrate (`wrangler.jsonc`, `migrations/`, `worker.ts` scheduled branches, `package.json`); no operational number is hand-typed.
- **Rationale:** PROMPT "generated check scripts". Removes the drift class at its root.
- **Source:** brief + derived. **Priority:** P0.
- **Dependencies:** none (reads existing files).
- **Acceptance criteria:**
  - AC-FR-2a: Running the generator produces a JSON with fields `{workerName, customDomains[], compatibility:{date,flags[]}, d1:{binding,databaseName,databaseId, migrationCount, latestMigrationFile, latestMigrationName}, r2:{binding,bucket}, durableObjects:[{binding,class}], queues:[{binding,queue,dlq,consumerConfig}], images, email, assets, crons:[...], cronDispatched:[...] (from worker.ts), scripts:{cf:readiness,cf:release-gates,...}}`.
  - AC-FR-2b: `migrationCount` equals `ls migrations/*.sql | wc -l` exactly.
  - AC-FR-2c: `crons` equals `wrangler.jsonc triggers.crons` exactly (3 entries today).
  - AC-FR-2d: The JSON contains **no secret values** — only binding *names*, ids, counts, and public config (assertion in SEC-1).
  - AC-FR-2e: The generator is deterministic (same inputs → same JSON, byte-stable modulo a generated timestamp field).
- **Validation:** unit test comparing JSON to independently-computed expectations (AC-FR-2b/c); secret-scan test (AC-FR-2d).
- **Affected areas:** new `scripts/generate-operational-truth-snapshot.ts`; new `operational-truth.snapshot.json` (committed, regenerated on substrate change). **Status:** specified.

### FR-3 — Stale-doc drift detector (P0)
- **Statement:** A script asserts the snapshot against the operational-fact claims embedded in narrative docs (`AGENTS.md`, `README.md`, `current-state.md`, the canonical home) and exits non-zero on mismatch.
- **Rationale:** PROMPT "stale-doc detection". Makes drift a failing check.
- **Source:** brief + repo evidence (§3.2). **Priority:** P0.
- **Dependencies:** FR-2.
- **Acceptance criteria:**
  - AC-FR-3a: On current `main` *after* the execution-phase repair, the detector exits 0.
  - AC-FR-3b: Injecting the old "two crons" claim into `AGENTS.md` makes the detector exit non-zero and name the file + line + expected vs. actual.
  - AC-FR-3c: Injecting "29 migrations" into `README.md` makes the detector exit non-zero.
  - AC-FR-3d: The detector asserts the canonical home itself against the snapshot (catches home/snapshot split).
  - AC-FR-3e: The detector reports a per-fact-class pass/fail summary; no silent skip.
- **Validation:** adversarial test suite (AC-FR-3b/c/d) — mutate docs, expect non-zero.
- **Affected areas:** new `scripts/check-operational-truth-drift.mjs`; new test. **Status:** specified.

### FR-4 — Update protocol (P0)
- **Statement:** A per-fact-class protocol names (a) the substrate source, (b) the trigger that requires an update, (c) the owner role, (d) the exact regeneration/update command.
- **Rationale:** PROMPT "update protocol". Prevents drift recurrence.
- **Source:** brief. **Priority:** P0.
- **Dependencies:** FR-1, FR-2.
- **Acceptance criteria:** AC-FR-4a: A table covers every fact-class in FR-2's snapshot fields + provider-exit/cost/retention posture, each with source/trigger/owner/command. AC-FR-4b: The protocol is referenced from `AGENTS.md` (one line pointing to the canonical home) so agents discover it.
- **Validation:** DOC review. **Status:** specified.

### FR-5 — Agent handoff rules (P0)
- **Statement:** A short, normative "agent restart read" and "plan-pack authoring" rule set: agents read the canonical home before relying on an operational fact; plan-pack PROMPTs cite it instead of re-deriving facts.
- **Rationale:** PROMPT "agent handoff rules". Stops drift from re-entering via new PROMPTs (this very PROMPT was stale).
- **Source:** brief + repo evidence (the PROMPT premise was stale). **Priority:** P0.
- **Acceptance criteria:** AC-FR-5a: `AGENTS.md` "minimum restart read" is amended to include the canonical home (one bullet). AC-FR-5b: The rules are stated in the canonical home and in this plan's `13_ROLLOUT…`.
- **Validation:** DOC review + `validate:agents` still passes. **Status:** specified.

### FR-6 — Recurring audit (P1)
- **Statement:** A small recurring audit cadence runs the detector (and regenerates the snapshot) on a schedule and/or pre-merge, with an owner and a failure path.
- **Rationale:** PROMPT "a small recurring audit".
- **Source:** brief. **Priority:** P1.
- **Acceptance criteria:** AC-FR-6a: A cadence is named (recommended: run detector in CI on every PR touching `wrangler.jsonc`/`migrations/`/narrative docs; plus a weekly local regen reminder). AC-FR-6b: Failure path is defined (block merge OR open an issue).
- **Validation:** DOC review; CI wiring proof in execution. **Status:** specified.

### FR-7 — wrangler.next-dev.jsonc documented as dev-only (P1)
- **Statement:** The canonical home explicitly states `wrangler.next-dev.jsonc` is a dev-only subset (no DO, no crons, no DLQ), not a source of truth.
- **Rationale:** §3.2 silent-partial-truth risk.
- **Source:** repo evidence. **Priority:** P1.
- **Acceptance criteria:** AC-FR-7a: Home contains a one-line caveat. **Status:** specified.

## Architecture / data

### ARCH-1 — Single canonical home, snapshot-fed (P0) — see `06_ARCHITECTURE…`
### DATA-1 — Snapshot is derived data, never hand-edited (P0)
- **Acceptance:** AC-DATA-1a: `operational-truth.snapshot.json` carries a header comment/field `"generated": true, "doNotEdit": true`; a pre-commit guard (or the detector) fails if the committed JSON differs from a fresh generation.

## Security / privacy

### SEC-1 — No secrets in snapshot or canonical home (P0)
- **Statement:** The snapshot and home expose only public config (binding names, ids, counts, cron expressions, public vars). Worker secrets, Better Auth secrets, publication/share tokens, etc. are never echoed.
- **Acceptance:** AC-SEC-1a: A secret-pattern scan over the generated JSON + home exits 0 (no matches for known secret prefixes/regexes).
- **Source:** repo evidence (`AGENTS.md` "Never commit secrets"). **Status:** specified.

## Performance

### PERF-1 — Detector + snapshot are cheap (P1)
- **Statement:** Generator + detector run in <2s locally on a warm repo; suitable for pre-commit.
- **Acceptance:** AC-PERF-1a: Manual timing on `main` <2s wall clock. **Status:** specified.

## Reliability / operations

### REL-1 — Detector fails closed (P0)
- **Statement:** On parser failure (e.g. malformed `wrangler.jsonc`), the detector exits non-zero with a clear message rather than silently passing.
- **Acceptance:** AC-REL-1a: Mutating `wrangler.jsonc` to invalid JSON exits non-zero. **Status:** specified.

### OPS-1 — CI/pre-commit wiring decision (P1) — see `13_ROLLOUT…`

## Testing

### TEST-1 — Detector has an adversarial mutation test suite (P0) — see `12_TEST…`

## Documentation

### DOC-1 — Canonical home is the documented entrypoint (P0)
- **Acceptance:** AC-DOC-1a: `AGENTS.md` points to it; `README.md` points to it; sibling plan packs' "source of truth" sections reference it.

## Shadow-path matrix (for the detector + generator, the two new runtime behaviors)

| Flow | Happy path | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Generate snapshot | JSON emitted | `migrations/` missing → error | 0 migrations → count 0 (warn) | malformed `wrangler.jsonc` → error exit | n/a (local) | n/a (local) | n/a (read-only) | deterministic rerun | snapshot file written | unit: field equality |
| Detect drift | exit 0 | narrative doc missing → skip-with-warning | doc has no claim → skip | regex overflows/Unicode → error | n/a | n/a | n/a | deterministic | non-zero on drift, 0 clean | adversarial mutation suite |
| CI runs detector | PR blocked on drift | detector crash → PR blocked (fail-closed) | — | — | — | — | — | — | check run red/green | CI smoke |

## Out-of-scope (explicit)

- Closing provider-exit blockers (sibling).
- Designing observability (sibling).
- D1 schema verifier (sibling).
- Rewriting non-operational prose in narrative docs.
- Any `wrangler.jsonc`/`migrations/`/source change.
