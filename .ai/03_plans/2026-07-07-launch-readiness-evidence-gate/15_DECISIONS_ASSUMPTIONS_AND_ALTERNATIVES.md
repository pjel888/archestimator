# 15 — Decisions, Assumptions & Alternatives

## §1. Architectural decisions (ADRs)

### DEC-LG-01 — Thin read-only aggregator, not a re-implementation
- **Problem:** Readiness is fragmented; need one gate.
- **Constraints:** Must not diverge from anchors; must be safe (read-only default).
- **Options:**
  - A) Thin aggregator that reads artifacts / runs anchors (chosen).
  - B) Monolithic gate re-implementing all checks.
  - C) CI-only YAML matrix.
- **A rejected because:** diverges from anchors; high maintenance; violates ARCH-LG-01.
- **C rejected because:** CI is disabled; no help locally; no single status artifact.
- **Security/perf/ops implications:** A is safest (read-only), fastest to build, lowest blast radius.
- **Conditions to revisit:** if an anchor's verdict shape becomes incompatible with the extractor, add a hook (WP-1.2) rather than re-implement.

### DEC-LG-02 — Three-status model GO/CONDITIONAL/NO-GO
- **Problem:** Owner needs one decision signal that still surfaces remaining work.
- **Options:**
  - A) GO/CONDITIONAL/NO-GO mapped to suite labels (chosen).
  - B) Boolean pass/fail.
  - C) 0–100 scorecard.
- **B rejected:** collapses external gates with code defects (FR-LG-03).
- **C rejected:** owner wants a decision, not a number; ambiguous thresholds.
- **Conditions:** none.

### DEC-LG-03 — Hard blockers = code/release-blocking; advisory = external/operator/perf
- **Problem:** Which failures block first users?
- **Options:**
  - A) Hard = code/release-blocking (validate, build, release-gates local, legal, support, provider-exit runtime, D1, DNS, email, hosted routes, etc.); advisory = perf budgets, external operator records, missing sibling-pack anchors (chosen).
  - B) All-or-nothing.
  - C) Perf budget as hard.
- **B rejected:** external operator gates would permanently block; not actionable.
- **C rejected:** a slow cached public route is not unsafe for first users (per owner cost/iteration bias).
- **Conditions:** owner can reclassify via registry edit + `--strict`.

### DEC-LG-04 — Evidence freshness TTL per class
- **Problem:** Stale NO-GO verdict trusted (current-state.md lineage).
- **Options:**
  - A) Per-class TTL; expired = missing-evidence (chosen).
  - B) Trust on-disk artifacts.
- **B rejected:** stale evidence persists; false confidence.
- **TTLs:** local-automated 1 run; local-static 7d; provider-backed 7d; hosted-production 3d; browser-manual 14d.
- **Conditions:** configurable per domain; `--no-freshness` for dev (status ≠ GO).

### DEC-LG-05 — CI integration opt-in per stage; advisory first
- **Problem:** CI is disabled; needs owner decision.
- **Options:**
  - A) Opt-in advisory job → required later (chosen).
  - B) Immediately blocking.
- **B rejected:** CI disabled (OPEN-LG-05); would block nothing or everything.
- **Conditions:** Ring progression in `13` §2.

### DEC-LG-06 — No provider/hosted/production claim from local checks
- **Problem:** Carrier of repo-wide evidence rule.
- **Decision:** enforced by FR-LG-05 + no-promotion test + matrix evidenceClass.
- **Alternatives:** none credible.

### DEC-LG-07 — Conflict precedence: hosted > provider > release-gates composite > local; pessimistic within class
- **Problem:** Overlapping anchors disagree.
- **Decision:** freshest/most-direct observation wins; within class, fail wins.
- **Conditions:** both verdicts surfaced in report.

## §2. Assumptions (and validation status)

| Assumption ID | Statement | Source strength | Validated? |
|---|---|---|---|
| ASSUMP-LG-01 | The 4 anchor scripts behave as documented in `03` §1 | repo evidence (read in full) | ✅ validated |
| ASSUMP-LG-02 | CI is disabled (workflows-disabled/) | repo evidence | ✅ validated |
| ASSUMP-LG-03 | No `launch:gate` exists today | repo evidence (grep) | ✅ validated |
| ASSUMP-LG-04 | Sibling packs marked "(PROMPT only)" lack anchors | inferred from folder contents | ⚠️ medium (folder contents may not reflect in-progress work) |
| ASSUMP-LG-05 | Bun + TypeScript is the right tool for the gate | repo convention | ✅ validated |
| ASSUMP-LG-06 | The historical NO-GO verdict is stale | repo evidence (dates) | ✅ validated |
| ASSUMP-LG-07 | Cloudflare bindings are as in wrangler.jsonc | repo evidence + AGENTS.md | ✅ validated |
| ASSUMP-LG-08 | Owner labels sanitizer is sufficient | repo evidence (sanitizeLegalLabel) | ✅ validated |
| ASSUMP-LG-09 | 2-min local budget is achievable | assumption | ⚠️ to validate at Ring 0 |

## §3. Open decisions (owner-delegated or external)

Carried in `01` §remaining-external-decisions (OPEN-LG-01..06). None are inventable; all are surfaced by the gate.
