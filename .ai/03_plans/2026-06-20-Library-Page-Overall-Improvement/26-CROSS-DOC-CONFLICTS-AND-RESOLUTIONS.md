# 26 — Cross-Doc Conflicts and Resolutions

> **Status:** Living document. Initialized 2026-06-21 by the Ultrawork audit
> loop. Every conflict has a binding resolution — there are no "Open"
> conflicts. Reviewer gate confirms 0 unresolved before sign-off.
>
> **Scope:** Every cross-doc inconsistency found across the 26 original plan
> docs. Each conflict is logged with docs involved, conflict description,
> binding resolution, required updates, and verification command.
>
> **Companion docs:** [25-AUDIT-SCORES-AND-IMPROVEMENT-PLAN.md](25-AUDIT-SCORES-AND-IMPROVEMENT-PLAN.md),
> [27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md](27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md),
> [34-ROW-LEVEL-COMPLETENESS-MATRIX.md](34-ROW-LEVEL-COMPLETENESS-MATRIX.md).

---

## 1. Purpose

A plan pack of 26+ docs will inevitably develop terminology drift, scope
drift, and duplicated definitions. This doc is the **binding conflict log**:
every cross-doc inconsistency is enumerated, given a binding resolution, and
tracked to verification. A conflict is "Resolved" only when:

1. A binding decision is recorded (which doc wins, what others change).
2. The required updates list names the exact `doc:line → change`.
3. A verification command can confirm the resolution holds.

The pack is internally consistent if and only if this doc shows 0 unresolved
conflicts AND every verification command returns the expected output.

---

## 2. Conflict inventory

| ID | Title | Status | Docs involved |
|---|---|---|---|
| C-001 | `very stale` trust tier mismatch | Resolved | 09, 11, 10, 12, 22 |
| C-002 | `badge` vs `chip` terminology tension | Resolved | 22, 23, 10, README |
| C-003 | `component-library/index.tsx` scope drift | Resolved | 00, 01, 03, 05, 06 |
| C-004 | `library_dense_mode` flag naming ambiguity | Resolved | 21, 16, 19 |
| C-005 | `bun test` vs `bun run test:dom` command confusion | Resolved | 06, 18, 20, 24 |
| C-006 | Phase ordering: 00 vs 05 vs 17 | Resolved | 00, 05, 17, 19 |
| C-007 | Cache key scope: un-scoped vs workspace-scoped | Resolved | 13, 14, 19 |
| C-008 | Template route: query-param vs segment | Resolved | 13, 19 |
| C-009 | Telemetry sink: `console.warn` vs future prod sink | Resolved | 20, 24 |
| C-010 | Feature flag: build-time env vs runtime kill-switch | Resolved | 21, 17 |
| C-011 | Quick Add: schema change vs no schema change | Resolved | 09, 10, 19 |
| C-012 | Trust chip exposure: public snapshot vs live workspace | Resolved | 11, 14, 09 |
| C-013 | Copy: "archive" vs "delete" destructive action language | Resolved | 22, 02, 10 |
| C-014 | A11y: axe harness availability | Resolved | 06, 12, 24 |
| C-015 | Perf: provisional thresholds vs final budgets | Resolved | 16, 05, 24 |
| C-016 | Evidence: planning-readiness vs execution-evidence conflation | Resolved | 08, 24 |
| C-017 | Phase-later residual: `component-library/index.tsx` tracking | Resolved | 05, 00, 03, 06 |
| C-018 | Owner role: missing per-row owner across pack | Resolved | all → 27 |
| C-019 | Rollback: missing per-row rollback across pack | Resolved | all → 17 |
| C-020 | Telemetry event: missing per-row event across pack | Resolved | all → 20 |
| C-021 | `very_stale` 4-tier beta confirmed; helper-extension binding (folds in `agent-sync-audit.md`) | Resolved | 09, 11, 10, 12, 22, 19 |
| C-022 | Glass-shell scope: Library liquid-glass skeleton = Phase 1 (doc 35 vs doc 19 phase label) | Resolved | 35, 19, 05 |

---

## 3. Detailed conflict resolutions

### C-001: `very stale` trust tier mismatch

- **Status:** Resolved
- **Docs involved:** [09-MVP-STRATEGY-AND-SUCCESS-METRICS.md](09-MVP-STRATEGY-AND-SUCCESS-METRICS.md) §61-79, [11-SOURCE-TRUST-STATE-MATRIX.md](11-SOURCE-TRUST-STATE-MATRIX.md) §40-66, [10-LIBRARY-SURFACE-SPECS.md](10-LIBRARY-SURFACE-SPECS.md) §102-118, [12-RESPONSIVE-ACCESSIBILITY-INTERACTION-CONTRACT.md](12-RESPONSIVE-ACCESSIBILITY-INTERACTION-CONTRACT.md) §108-118, [22-COPY-DECK-AND-MICROCOPY.md](22-COPY-DECK-AND-MICROCOPY.md) §154-174
- **Conflict description:** Doc 09 measures trust coverage as `fresh/stale/missing` (3 tiers). Doc 11 introduces a 4th tier `very stale` for pricing freshness. Docs 10 and 12 treat "stale" as a single pricing-freshness state. Doc 22 has copy for "stale" but not "very stale".
- **Resolution:** The `very stale` tier is **beta scope** and must be reflected consistently across the entire pack. Doc 11 is the canonical definition (4 tiers: `fresh`, `stale`, `very stale`, `missing`). All other docs must align to 4 tiers.
- **Required updates:**
  - `09:61-79` → change "trust coverage as `fresh/stale/missing`" to "trust coverage as `fresh/stale/very stale/missing` (4 tiers, per [11-SOURCE-TRUST-STATE-MATRIX.md](11-SOURCE-TRUST-STATE-MATRIX.md))". Add metric row for `very_stale_coverage_pct`.
  - `10:102-118` → add `very stale` state row to component card state coverage. Add visual treatment: "very stale" chip = amber + warning icon, distinct from "stale" chip = amber.
  - `12:108-118` → add `very stale` to live-region announcement contract: "Component pricing is very stale — last verified over 180 days ago."
  - `22:154-174` → add copy keys: `trust.very_stale.label`, `trust.very_stale.tooltip`, `trust.very_stale.announcement`.
  - `11:40-66` → mark `very stale` as "Beta scope — 180-day threshold" (not future extension).
- **Verification:**
  ```bash
  rg -i "very stale" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/ --count
  # Expected: every doc that references trust states mentions "very stale" OR explicitly defers to doc 11.
  rg -i "fresh/stale/missing" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/
  # Expected: 0 matches — the 3-tier formulation is replaced everywhere by 4-tier.
  ```
- **Owner:** Planning lead

### C-002: `badge` vs `chip` terminology tension

- **Status:** Resolved
- **Docs involved:** [22-COPY-DECK-AND-MICROCOPY.md](22-COPY-DECK-AND-MICROCOPY.md) §154-174, [23-DESIGN-SYSTEM-COMPONENT-MAPPING.md](23-DESIGN-SYSTEM-COMPONENT-MAPPING.md) §100-112 §114-139, [10-LIBRARY-SURFACE-SPECS.md](10-LIBRARY-SURFACE-SPECS.md) §126-133, [README.md](README.md)
- **Conflict description:** Doc 22 uses "badge" language for trust/freshness labels ("trust badge labels"). Doc 23 standardizes the inline primitives as "chips", explicitly NOT Badge components. Doc 10 and README use both terms inconsistently.
- **Resolution:** The canonical term is **"chip"** (inline element, not a Badge component). Doc 23 is the authoritative source for primitive taxonomy. All other docs must use "chip" for trust/freshness/status labels.
- **Required updates:**
  - `22:154-174` → rename section from "Trust Badge Labels" to "Trust Chip Copy". Replace all "badge" with "chip" in this section. Copy keys remain `trust.*` (no key rename needed, just the human-readable term).
  - `10:126-133` → replace "badge" with "chip" in card state descriptions.
  - `README.md` → replace any "badge" with "chip" in the glossary/terminology section.
  - `23:100-112` → add a note: "The canonical term is 'chip'. Docs 22, 10, and README must use 'chip' not 'badge' for trust/freshness/status labels."
- **Verification:**
  ```bash
  rg -i "\bbadge\b" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/ -g "*.md"
  # Expected: 0 matches for "badge" as a UI element term (allowed in "badges" as achievement/credential context, but not for trust/freshness labels).
  rg -i "\bchip\b" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/ -g "*.md" --count
  # Expected: "chip" appears in 22, 23, 10, README, and any doc referencing trust/freshness labels.
  ```
- **Owner:** Design lead

### C-003: `component-library/index.tsx` scope drift

- **Status:** Resolved
- **Docs involved:** [00-PLAN.md](00-PLAN.md), [01-CURRENT-STATE-AUDIT.md](01-CURRENT-STATE-AUDIT.md), [03-MODALS-POPOVERS-AND-OVERLAYS.md](03-MODALS-POPOVERS-AND-OVERLAYS.md), [05-IMPLEMENTATION-ROADMAP.md](05-IMPLEMENTATION-ROADMAP.md), [06-QA-AND-VALIDATION-PLAN.md](06-QA-AND-VALIDATION-PLAN.md)
- **Conflict description:** Doc 00 treats `src/components/workshop/component-library/index.tsx` as "out of primary scope". Doc 01 treats it as "in-scope adjacent work". Doc 05 parks it as "Phase-later residual". Docs 03 and 06 retain in-scope guard coverage for it.
- **Resolution:** The file is **Phase-later residual** — explicitly excluded from phases 0A–5 critical path, but tracked as a guarded residual. Doc 05's framing is canonical. All docs must use the same language: "Phase-later residual — tracked, not in 0A–5 critical path".
- **Required updates:**
  - `00` → change "out of primary scope" to "Phase-later residual — tracked, not in phases 0A–5 critical path. See [05-IMPLEMENTATION-ROADMAP.md](05-IMPLEMENTATION-ROADMAP.md) §Phase-later".
  - `01` → change "in-scope adjacent work" to "Phase-later residual — audited as current-state context, not in 0A–5 critical path".
  - `03` → add note to overlay coverage row: "component-library/index.tsx overlay work is Phase-later residual. Guarded against regression in 0A–5 but no active overlay changes."
  - `06` → add note to test matrix: "component-library/index.tsx is Phase-later residual. Regression tests guard current behavior; no new tests for 0A–5 changes."
  - `05` → canonical definition stays. Add cross-ref: "See [26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md](26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md) C-003".
- **Verification:**
  ```bash
  rg "component-library/index.tsx" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/ -g "*.md" -l
  # Expected: 00, 01, 03, 05, 06 — and every one uses "Phase-later residual" language.
  rg -i "out of primary scope|in-scope adjacent" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/ -g "*.md"
  # Expected: 0 matches for the old conflicting language.
  ```
- **Owner:** Planning lead

### C-004: `library_dense_mode` flag naming ambiguity

- **Status:** Resolved
- **Docs involved:** [21-FEATURE-FLAGS-AND-ROLLOUT.md](21-FEATURE-FLAGS-AND-ROLLOUT.md) §44-48 §61-74, [16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md](16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md), [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md)
- **Conflict description:** Doc 21 treats `library_dense_mode` as a flag key but its read path is coupled to virtualization env vars. The relationship between the flag and virtualization posture is unclear.
- **Resolution:** `library_dense_mode` is a **build-time env flag** (boolean) that gates the dense-mode UI rendering. Virtualization is a **separate concern** gated by `library_virtualization_enabled` (also build-time env). The two flags are independent: dense mode can render with or without virtualization. Doc 21 is canonical for flag definitions.
- **Required updates:**
  - `21:44-48` → add: "`library_dense_mode` (boolean, default: false) gates dense-mode UI rendering. `library_virtualization_enabled` (boolean, default: false) gates list virtualization. The two are independent — dense mode can render with or without virtualization."
  - `21:61-74` → split the registry row into two rows: one for `library_dense_mode`, one for `library_virtualization_enabled`.
  - `16` → update dense-mode perf section to reference both flags and explain the 4 combinations (sparse+no-virt, sparse+virt, dense+no-virt, dense+virt).
  - `19` → add both flag names to the canonical bindings section with their env-var names and read paths.
- **Verification:**
  ```bash
  rg "library_dense_mode|library_virtualization_enabled" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/ -g "*.md" -l
  # Expected: 16, 19, 21 at minimum, with both flag names appearing.
  ```
- **Owner:** Release lead

### C-005: `bun test` vs `bun run test:dom` command confusion

- **Status:** Resolved
- **Docs involved:** [06-QA-AND-VALIDATION-PLAN.md](06-QA-AND-VALIDATION-PLAN.md) §25-45, [18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md](18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md) §24-27 §96-101, [20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md](20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md) §179-188, [24-EXECUTION-EVIDENCE-LEDGER.md](24-EXECUTION-EVIDENCE-LEDGER.md) §34-38 §50-57
- **Conflict description:** Multiple docs warn against using `bun test` for vitest suites, but the warning is repeated and some docs still reference the wrong command. The correct command is `bun run test:dom` for jsdom vitest suites.
- **Resolution:** The canonical test command is `bun run test:dom` for jsdom vitest suites, `bun run test:e2e` for Playwright. `bun test` must NEVER be used for vitest suites (it picks up the wrong runner). Doc 06 is the canonical command guide.
- **Required updates:**
  - `06:25-45` → keep as canonical command guide. Add a callout box: "NEVER use `bun test` for vitest suites. Use `bun run test:dom` (jsdom) or `bun run test:e2e` (Playwright). See [26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md](26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md) C-005."
  - `18:24-27` → replace any `bun test` reference with `bun run test:dom`.
  - `20:179-188` → replace any `bun test` reference with `bun run test:dom`.
  - `24:34-38` → replace any `bun test` reference with `bun run test:dom`.
  - Every doc with test commands → grep and replace `bun test` → `bun run test:dom` (or `test:e2e` for Playwright).
- **Verification:**
  ```bash
  rg "\bbun test\b" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/ -g "*.md"
  # Expected: 0 matches (or only matches inside quoted warning text that says "NEVER use bun test").
  rg "bun run test:dom|bun run test:e2e" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/ -g "*.md" --count
  # Expected: matches in 06, 18, 20, 24, and any doc with test commands.
  ```
- **Owner:** QA lead

### C-006: Phase ordering: 00 vs 05 vs 17

- **Status:** Resolved
- **Docs involved:** [00-PLAN.md](00-PLAN.md), [05-IMPLEMENTATION-ROADMAP.md](05-IMPLEMENTATION-ROADMAP.md), [17-BLAST-RADIUS-SEQUENCING-ROLLBACK.md](17-BLAST-RADIUS-SEQUENCING-ROLLBACK.md), [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md)
- **Conflict description:** Phase ordering appears in 00, 05, 17, and 19 with slightly different emphasis. Doc 17 explicitly says it resolves the prior ordering conflict with 00/05 by pinning the canonical order to the phase map.
- **Resolution:** Doc 19 is the **canonical phase map** (keystone). Doc 05 is the canonical implementation roadmap that sequences work against the phase map. Doc 17 is the canonical blast-radius/rollback doc that references the phase map. Doc 00 summarizes the phase map but defers to 19 for the authoritative version.
- **Required updates:**
  - `00` → add: "The canonical phase map is [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md). This section is a summary; defer to 19 for the authoritative version."
  - `05` → add: "Phase map is authoritative in [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md). This roadmap sequences work against that map."
  - `17:23-29` → keep as the resolution statement. Add cross-ref to C-006.
  - `19` → add: "This is the canonical phase map. Docs 00, 05, and 17 summarize or sequence against this map."
- **Verification:**
  ```bash
  rg "canonical phase map" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/ -g "*.md" -l
  # Expected: 00, 05, 17, 19.
  ```
- **Owner:** Planning lead

### C-007: Cache key scope: un-scoped vs workspace-scoped

- **Status:** Resolved
- **Docs involved:** [13-DATA-CONTRACTS-ROUTE-CACHE.md](13-DATA-CONTRACTS-ROUTE-CACHE.md), [14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md](14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md) §195-241, [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md)
- **Conflict description:** Earlier versions of the plan had an un-scoped cache key that risked cross-workspace data bleed. Doc 13 resolves this by preferring the shipped template segment route, and doc 14 aligns on the cache-bleed risk.
- **Resolution:** All cache keys must be **workspace-scoped**. The canonical cache key shape is `library:<workspace_id>:<surface>`. Doc 13 is canonical for cache key definitions. Doc 14 verifies no cross-workspace bleed.
- **Required updates:**
  - `13` → add: "All cache keys MUST be workspace-scoped: `library:<workspace_id>:<surface>`. Un-scoped keys are a no-go (see [14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md](14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md) cache-bleed row)."
  - `14:195-241` → reference 13's cache key shape as the mitigation.
  - `19` → add the canonical cache key shape to the bindings section.
- **Verification:**
  ```bash
  rg "library:<workspace_id>" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/ -g "*.md" -l
  # Expected: 13, 14, 19.
  ```
- **Owner:** Backend lead

### C-008: Template route: query-param vs segment

- **Status:** Resolved
- **Docs involved:** [13-DATA-CONTRACTS-ROUTE-CACHE.md](13-DATA-CONTRACTS-ROUTE-CACHE.md) §59-81, [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md)
- **Conflict description:** Earlier versions of the plan had confusion between query-param (`?template=<id>`) and segment route (`/library/templates/<id>`). Doc 13 resolves this by preferring the shipped segment route.
- **Resolution:** The canonical template route is the **segment route** `/library/templates/<id>` (shipped). Query-param `?template=<id>` is NOT used. Doc 13 §59-81 is the canonical resolution.
- **Required updates:**
  - `13:59-81` → keep as canonical resolution. Add cross-ref to C-008.
  - `19` → add the canonical template route to bindings.
  - Every doc that references template routes → grep for `?template=` and replace with segment route (or remove if not relevant).
- **Verification:**
  ```bash
  rg "\?template=" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/ -g "*.md"
  # Expected: 0 matches (or only in historical context explaining the prior confusion).
  rg "/library/templates/" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/ -g "*.md" -l
  # Expected: 13, 19, and any doc referencing template routes.
  ```
- **Owner:** Backend lead

### C-009: Telemetry sink: `console.warn` vs future prod sink

- **Status:** Resolved
- **Docs involved:** [20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md](20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md) §41-44, [24-EXECUTION-EVIDENCE-LEDGER.md](24-EXECUTION-EVIDENCE-LEDGER.md)
- **Conflict description:** Doc 20 leaves the prod telemetry sink as a future follow-up (currently `console.warn`). Doc 24 expects telemetry to be verifiable. The conflict is: is telemetry "done" for beta or not?
- **Resolution:** For closed beta, `console.warn` is the **sufficient sink**. The prod sink (e.g., Postgres `events` table or analytics platform) is **Phase-later** — not required for beta launch. Telemetry is "done" for beta when events emit correctly to `console.warn` with the correct schema. Doc 20 §41-44 is canonical.
- **Required updates:**
  - `20:41-44` → add: "For closed beta, `console.warn` is the sufficient sink. The prod sink is Phase-later — not required for beta launch. Telemetry is 'done' for beta when events emit correctly to `console.warn` with the correct schema. See [26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md](26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md) C-009."
  - `24` → update telemetry evidence rows to verify `console.warn` emission (not prod sink). Add a Phase-later row for prod sink migration.
- **Verification:**
  ```bash
  rg "console.warn" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/ -g "*.md" -l
  # Expected: 20, 24.
  ```
- **Owner:** Telemetry lead

### C-010: Feature flag: build-time env vs runtime kill-switch

- **Status:** Resolved
- **Docs involved:** [21-FEATURE-FLAGS-AND-ROLLOUT.md](21-FEATURE-FLAGS-AND-ROLLOUT.md) §28-33, [17-BLAST-RADIUS-SEQUENCING-ROLLBACK.md](17-BLAST-RADIUS-SEQUENCING-ROLLBACK.md)
- **Conflict description:** Doc 21 is honest that the repo has no runtime flag store — flags are build-time env inlining only. Doc 17 expects rollback via flag-off behavior. The conflict is: how do you roll back without a runtime kill-switch?
- **Resolution:** Rollback for build-time flags is **redeploy the previous env configuration** (fix-forward, not instant kill). Doc 21 §28-33 is canonical. Doc 17 must acknowledge that rollback is redeploy-based, not instant.
- **Required updates:**
  - `21:28-33` → add: "Rollback for build-time flags is redeploy-based (fix-forward), not instant kill. See [26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md](26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md) C-010."
  - `17` → update rollback rows to say "Redeploy with flag=false (fix-forward, ~5 min)" instead of "flag-off".
  - Add a Phase-later row in 21 for a runtime kill-switch (e.g., Postgres-backed flag store).
- **Verification:**
  ```bash
  rg "redeploy|fix-forward" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/ -g "*.md" -l
  # Expected: 17, 21.
  rg "runtime kill-switch" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/ -g "*.md"
  # Expected: only in Phase-later context, not as a current capability.
  ```
- **Owner:** Release lead

### C-011: Quick Add: schema change vs no schema change

- **Status:** Resolved
- **Docs involved:** [09-MVP-STRATEGY-AND-SUCCESS-METRICS.md](09-MVP-STRATEGY-AND-SUCCESS-METRICS.md) §106-128, [10-LIBRARY-SURFACE-SPECS.md](10-LIBRARY-SURFACE-SPECS.md) §246-278, [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §402-421
- **Conflict description:** Doc 09 says Quick Add is "specified down to required/optional fields and schema impact", implying schema change. Doc 10 says "Quick Add is sufficiently specified to implement without schema change". Doc 19 has the canonical Quick Add contract.
- **Resolution:** Quick Add **does NOT require a schema change** for beta. It reuses existing columns with required/optional field validation at the application layer. Doc 10 is correct; doc 09's "schema impact" language is misleading. Doc 19 §402-421 is canonical.
- **Required updates:**
  - `09:106-128` → change "schema impact" to "no schema change — reuses existing columns with application-layer validation. See [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §402-421."
  - `10:246-278` → keep as correct. Add cross-ref to C-011.
  - `19:402-421` → add: "Quick Add requires no schema change. Required fields are validated at the application layer; existing columns are reused."
- **Verification:**
  ```bash
  rg -i "quick add.*schema" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/ -g "*.md"
  # Expected: every match says "no schema change".
  ```
- **Owner:** Backend lead

### C-012: Trust chip exposure: public snapshot vs live workspace

- **Status:** Resolved
- **Docs involved:** [11-SOURCE-TRUST-STATE-MATRIX.md](11-SOURCE-TRUST-STATE-MATRIX.md) §184-224, [14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md](14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md), [09-MVP-STRATEGY-AND-SUCCESS-METRICS.md](09-MVP-STRATEGY-AND-SUCCESS-METRICS.md) §130-153
- **Conflict description:** Trust chips show on live workspace surfaces. Do they show on public/shared snapshots? Doc 11 §184-224 has a public exposure rule. Doc 14 covers redaction. Doc 09 covers trust/privacy.
- **Resolution:** Trust chips **are redacted from public/shared snapshots** — only the live workspace shows trust state. Public snapshots show a frozen "snapshot verified on <date>" label instead. Doc 11 §184-224 is canonical.
- **Required updates:**
  - `11:184-224` → keep as canonical public exposure rule. Add cross-ref to C-012.
  - `14` → add: "Trust chips are redacted from public/shared snapshots. See [11-SOURCE-TRUST-STATE-MATRIX.md](11-SOURCE-TRUST-STATE-MATRIX.md) §184-224."
  - `09:130-153` → add: "Public/shared snapshots show 'snapshot verified on <date>' instead of live trust chips."
  - `22` → add copy key `trust.public_snapshot.label` = "Snapshot verified on {date}".
- **Verification:**
  ```bash
  rg "snapshot verified on" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/ -g "*.md" -l
  # Expected: 09, 11, 14, 22.
  ```
- **Owner:** Security lead

### C-013: Copy: "archive" vs "delete" destructive action language

- **Status:** Resolved
- **Docs involved:** [22-COPY-DECK-AND-MICROCOPY.md](22-COPY-DECK-AND-MICROCOPY.md) §112-153, [02-USER-FLOWS-AND-ACTION-PATHS.md](02-USER-FLOWS-AND-ACTION-PATHS.md), [10-LIBRARY-SURFACE-SPECS.md](10-LIBRARY-SURFACE-SPECS.md)
- **Conflict description:** Doc 22 resolves the bulk-archive copy conflict and covers destructive flows. But docs 02 and 10 may use "archive" and "delete" interchangeably in some places.
- **Resolution:** **"Archive"** = soft-delete (recoverable, moves to archived state). **"Delete"** = hard-delete (permanent, irreversible). The two are distinct actions with distinct copy. Doc 22 §112-153 is canonical.
- **Required updates:**
  - `22:112-153` → keep as canonical. Add: "'Archive' = soft-delete (recoverable). 'Delete' = hard-delete (irreversible). The two are distinct actions. See [26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md](26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md) C-013."
  - `02` → audit all destructive action references and ensure "archive" and "delete" are used correctly per the canonical definitions.
  - `10` → audit all destructive action references and ensure correct usage.
- **Verification:**
  ```bash
  rg -i "\barchive\b.*\bdelete\b|\bdelete\b.*\barchive\b" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/ -g "*.md"
  # Expected: any match clarifies the distinction, not conflates them.
  ```
- **Owner:** Copy lead

### C-014: A11y: axe harness availability

- **Status:** Resolved
- **Docs involved:** [06-QA-AND-VALIDATION-PLAN.md](06-QA-AND-VALIDATION-PLAN.md), [12-RESPONSIVE-ACCESSIBILITY-INTERACTION-CONTRACT.md](12-RESPONSIVE-ACCESSIBILITY-INTERACTION-CONTRACT.md) §95-100, [24-EXECUTION-EVIDENCE-LEDGER.md](24-EXECUTION-EVIDENCE-LEDGER.md) §50-57
- **Conflict description:** Doc 06 warns the axe harness is missing. Doc 12 expects automated a11y gates. Doc 24 has evidence rows for a11y. The conflict is: is axe a current gate or a future one?
- **Resolution:** The axe harness is **NOT currently configured** — it is a Phase 0A deliverable. Until axe is configured, a11y is verified via manual keyboard/screen-reader testing + visual review. Doc 06 is canonical for the axe status.
- **Required updates:**
  - `06` → add: "The axe harness is NOT currently configured. It is a Phase 0A deliverable. Until axe is configured, a11y is verified via manual keyboard/screen-reader testing + visual review. See [26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md](26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md) C-014."
  - `12:95-100` → add: "Automated axe gate is Phase 0A. Pre-axe, a11y is manual."
  - `24:50-57` → update a11y evidence rows to show "manual" pre-axe, "axe + manual" post-axe.
- **Verification:**
  ```bash
  rg "axe" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/ -g "*.md" -l
  # Expected: 06, 12, 24, 31 (when created).
  ```
- **Owner:** A11y lead

### C-015: Perf: provisional thresholds vs final budgets

- **Status:** Resolved
- **Docs involved:** [16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md](16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md) §60-75 §270-286, [05-IMPLEMENTATION-ROADMAP.md](05-IMPLEMENTATION-ROADMAP.md) §119-141 §593-600, [24-EXECUTION-EVIDENCE-LEDGER.md](24-EXECUTION-EVIDENCE-LEDGER.md)
- **Conflict description:** Doc 16 has provisional perf thresholds that won't be finalized until Phase 0A baseline measurement. Docs 05 and 24 reference perf budgets. The conflict is: are perf budgets final or provisional?
- **Resolution:** Perf budgets are **provisional until Phase 0A baseline measurement**. Doc 16 is canonical for provisional values. Doc 30 (to be created) will hold the final budgets after Phase 0A. Until then, all perf rows say "provisional — see [30-PERF-BUDGET-AND-REGRESSION-GATES.md](30-PERF-BUDGET-AND-REGRESSION-GATES.md)".
- **Required updates:**
  - `16:60-75` → add: "Provisional until Phase 0A baseline. Final budgets in [30-PERF-BUDGET-AND-REGRESSION-GATES.md](30-PERF-BUDGET-AND-REGRESSION-GATES.md)."
  - `05:119-141` → add: "Perf numbers provisional until Phase 0A (see [30](30-PERF-BUDGET-AND-REGRESSION-GATES.md))."
  - `24` → update perf evidence rows to say "provisional" until Phase 0A.
- **Verification:**
  ```bash
  rg "provisional" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/ -g "*.md" -l
  # Expected: 05, 16, 24, 30 (when created).
  ```
- **Owner:** Perf lead

### C-016: Evidence: planning-readiness vs execution-evidence conflation

- **Status:** Resolved
- **Docs involved:** [08-RATINGS-AND-GAP-CLOSURE.md](08-RATINGS-AND-GAP-CLOSURE.md) §66-145, [24-EXECUTION-EVIDENCE-LEDGER.md](24-EXECUTION-EVIDENCE-LEDGER.md) §3-10 §181-191
- **Conflict description:** Doc 08 distinguishes "execution-inclusive" vs "planning-achievable" scoring but the distinction is easy to misread. Doc 24 distinguishes execution evidence from planning readiness. The conflict is: does "100/100/100" mean the plan is ready to execute, or that execution is complete?
- **Resolution:** "100/100/100" means the **plan is 100% implementation-ready** (ready to hand to an engineer with zero ambiguity). It does NOT mean execution is complete. Execution evidence is tracked separately in doc 24. Doc 08's "planning-achievable" rubric is the correct one for plan docs. Doc 24's "execution evidence" is the post-implementation proof.
- **Required updates:**
  - `08:66-145` → add a one-line decision rule: "Rubric B (planning-achievable) applies to all plan docs. 100/100/100 = implementation-ready, NOT execution-complete. See [26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md](26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md) C-016."
  - `24:3-10` → keep the distinction clear. Add cross-ref to C-016.
- **Verification:**
  ```bash
  rg "implementation-ready|execution-complete" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/ -g "*.md" -l
  # Expected: 08, 24, 25.
  ```
- **Owner:** Planning lead

### C-017: Phase-later residual: `component-library/index.tsx` tracking

- **Status:** Resolved (subset of C-003, logged separately for tracking)
- **Docs involved:** [05-IMPLEMENTATION-ROADMAP.md](05-IMPLEMENTATION-ROADMAP.md) §631-699, [00-PLAN.md](00-PLAN.md), [03-MODALS-POPOVERS-AND-OVERLAYS.md](03-MODALS-POPOVERS-AND-OVERLAYS.md), [06-QA-AND-VALIDATION-PLAN.md](06-QA-AND-VALIDATION-PLAN.md)
- **Conflict description:** Same as C-003 — the Phase-later residual tracking must be consistent.
- **Resolution:** See C-003. The Phase-later residual is tracked in doc 05 §631-699. All docs reference that section.
- **Required updates:** See C-003.
- **Verification:** See C-003.
- **Owner:** Planning lead

### C-018: Owner role: missing per-row owner across pack

- **Status:** Resolved
- **Docs involved:** All 26 original docs
- **Conflict description:** No doc has per-row owner mapping. Every actionable row needs an owner from [27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md](27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md).
- **Resolution:** Doc 27 is the canonical owner matrix. Every actionable row in every doc must either name an owner from doc 27 OR delegate to doc 27 with a section ref.
- **Required updates:**
  - Every doc → add `Owner: <role from doc 27>` to every actionable row (or delegate to doc 27).
  - See [34-ROW-LEVEL-COMPLETENESS-MATRIX.md](34-ROW-LEVEL-COMPLETENESS-MATRIX.md) for per-doc compliance tracking.
- **Verification:**
  ```bash
  rg "Owner:" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/ -g "*.md" --count
  # Expected: every actionable doc has Owner: rows.
  ```
- **Owner:** Planning lead

### C-019: Rollback: missing per-row rollback across pack

- **Status:** Resolved
- **Docs involved:** All 26 original docs
- **Conflict description:** Rollback is referenced but not tabulated per-row.
- **Resolution:** Doc 17 is the canonical rollback doc. Every actionable row in every doc must either name a rollback behavior OR delegate to doc 17 with a section ref.
- **Required updates:**
  - Every doc → add `Rollback: <behavior>` to every actionable row (or delegate to doc 17).
  - See [34-ROW-LEVEL-COMPLETENESS-MATRIX.md](34-ROW-LEVEL-COMPLETENESS-MATRIX.md) for per-doc compliance.
- **Verification:**
  ```bash
  rg "Rollback:" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/ -g "*.md" --count
  # Expected: every actionable doc has Rollback: rows.
  ```
- **Owner:** Release lead

### C-020: Telemetry event: missing per-row event across pack

- **Status:** Resolved
- **Docs involved:** All 26 original docs
- **Conflict description:** Event names exist in doc 20 but not linked per-row.
- **Resolution:** Doc 20 is the canonical telemetry doc. Every actionable row in every doc must either name a telemetry event OR delegate to doc 20 with a section ref.
- **Required updates:**
  - Every doc → add `Telemetry: <event name from doc 20>` to every actionable row (or delegate to doc 20).
  - See [34-ROW-LEVEL-COMPLETENESS-MATRIX.md](34-ROW-LEVEL-COMPLETENESS-MATRIX.md) for per-doc compliance.
- **Verification:**
  ```bash
  rg "Telemetry:" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/ -g "*.md" --count
  # Expected: every actionable doc has Telemetry: rows.
  ```
- **Owner:** Telemetry lead

### C-021: `very_stale` 4-tier beta confirmed; Phase-2 helper-extension binding

> **Folds in the now-deleted `agent-sync-audit.md`** (2026-06-21 apply pass).
> The orphan sync-audit file's single open decision — "C-001 freshness tiers:
> ship 4-tier and make doc 19 note the helper must be extended, OR defer
> `very stale` to Phase-later" — is resolved here as **(a) ship 4-tier**.

- **Status:** Resolved
- **Docs involved:** [09-MVP-STRATEGY-AND-SUCCESS-METRICS.md](09-MVP-STRATEGY-AND-SUCCESS-METRICS.md), [11-SOURCE-TRUST-STATE-MATRIX.md](11-SOURCE-TRUST-STATE-MATRIX.md), [10-LIBRARY-SURFACE-SPECS.md](10-LIBRARY-SURFACE-SPECS.md), [12-RESPONSIVE-ACCESSIBILITY-INTERACTION-CONTRACT.md](12-RESPONSIVE-ACCESSIBILITY-INTERACTION-CONTRACT.md), [22-COPY-DECK-AND-MICROCOPY.md](22-COPY-DECK-AND-MICROCOPY.md), [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md)
- **Conflict description:** Doc 19's `getComponentPricingFreshness` (`component-facet-filter.tsx:61`) returns three values today — `fresh` / `stale` / `missing` — backed by the three 90-day constants (`COMPONENT_FACET_STALE_DAYS`, `LIBRARY_OVERVIEW_STALE_PRICING_DAYS`, the `LibraryOverview.tsx:114` UI string). C-001 mandates a 4th `very stale` (180-day) tier as beta scope. The open question (carried by `agent-sync-audit.md`, now folded here) was whether to (a) ship the 4-tier extension or (b) defer `very stale` to Phase-later. This is the **implementation-binding** companion to C-001 (which fixes the terminology/copy drift).
- **Resolution:** **Ship 4-tier** — option (a). Freshness is `fresh` / `stale` / `very stale` / `missing` (4 tiers) for beta scope. The 4th tier is a **Phase-2 helper-layer extension** that adds a 180-day `very stale` tier by extending, in lockstep and with NO schema change:
  - `getComponentPricingFreshness(item, now)` at `component-facet-filter.tsx:61` (add a `"very stale"` return arm),
  - `getStalenessTone(pricingDate?)` / `getStalenessLabel(pricingDate?)` at `component-library/helpers.ts:667` / `:675`,
  - the THREE 90-day constants (`COMPONENT_FACET_STALE_DAYS` `component-facet-filter.tsx:12`, `LIBRARY_OVERVIEW_STALE_PRICING_DAYS` `component-library-repository.ts:827`, the `LibraryOverview.tsx:114` UI string) — a new `VERY_STALE`-day companion constant plus the existing 90-day `STALE` constant, kept as a single source of truth.
  No fourth source of truth is introduced; the 90-day window remains the `stale` boundary and 180-day becomes the `very stale` boundary.
- **Required updates:**
  - `19` → the "Any new 'very stale' tier …" paragraph in the Confidence and Freshness Models section now records the C-021 Phase-2 binding (4-tier, helper-layer only, no schema change). DONE 2026-06-21.
  - `11` → `very stale` stays canonical 4-tier definition (already per C-001).
  - `09`, `10`, `12`, `22` → see C-001 required updates (4-tier copy/visual/a11y). Any doc presenting a bare `fresh/stale/missing` 3-tier formulation must note it describes the *current* helper return and that Phase-2 extends it to 4-tier.
- **Verification:**
  ```bash
  # 4-tier canonical formulation appears in 19 and 11
  rg "fresh.*stale.*very stale.*missing|fresh / stale / very stale / missing" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/ -g "*.md" -l
  # Expected: 11, 19 (and any doc that quotes the canonical tier list).

  # The orphan sync-audit file is gone
  test ! -f .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/agent-sync-audit.md
  # Expected: exits 0 (file deleted; its finding folded into C-021).

  # Phase-2 extension note is in doc 19
  rg "Phase 2.*very stale|very stale.*Phase 2|C-021" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md
  # Expected: at least one match.
  ```
- **Owner:** Planning lead

### C-022: Glass-shell scope — Library liquid-glass skeleton = Phase 1

- **Status:** Resolved
- **Docs involved:** [35-LIQUID-GLASS-LIBRARY-UX-SPEC.md](35-LIQUID-GLASS-LIBRARY-UX-SPEC.md), [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md), [05-IMPLEMENTATION-ROADMAP.md](05-IMPLEMENTATION-ROADMAP.md)
- **Conflict description:** Doc 35 (the liquid-glass Library UX/UI spec) introduces a per-region glass surface-variant slot system that mirrors the shipped estimate-surface model (`estimate-surface-variant.tsx:21`) and defines a two-posture rollout: Phase 1 = glass skeleton (well + floating rails/paper + chrome + liquid buttons + warm CTA + provider + grids); Phase 2/5 = content-grade card glass. Doc 19's Canonical Phase Map labels Phase 1 purely as "Findability & Applied Filters", with no glass-shell scope. The two phase-1 scopes must be reconciled — does the glass shell land in Phase 1 or later?
- **Resolution:** **The glass shell is Phase 1.** Doc 35's two-posture split is canonical: Phase 1 = glass skeleton (per doc 35 §12.1-12.5), Phase 2 = component card glass, Phase 5 = template card glass. Doc 19's Phase 1 row is **extended** (not replaced) to include the Library workspace glass skeleton — the Phase-1 findability work and the Phase-1 glass skeleton are co-scoped (both are foundational surface work). Card glass stays Phase 2 (components) / Phase 5 (templates). Doc 19 is the canonical phase map; doc 35 binds its slot system to the estimate-surface reference model recorded in doc 19's "Reference glass-surface system" subsection; doc 05 sequences against doc 19's extended Phase 1.
- **Required updates:**
  - `19` → Canonical Phase Map Phase 1 row extended to include "Library workspace glass skeleton (doc 35 §12.1-12.5): glass well + floating rails/paper + chrome + liquid buttons + warm CTA + the `LibrarySurfaceVariantProvider` + workspace/content grids" and a pointer that card glass stays Phase 2/5. Added the "Reference glass-surface system" subsection binding doc 35 to the estimate-surface model. DONE 2026-06-21.
  - `35` → cross-reference doc 19's "Reference glass-surface system" subsection as the binding model; assert the Phase-1 skeleton / Phase-2-5 card split aligns with doc 19's extended Phase 1. (Lead-owned doc — cross-reference only, do not edit.)
  - `05` → note that Phase 1 sequences both findability AND the glass skeleton (per doc 19 extended Phase 1).
- **Verification:**
  ```bash
  # Doc 19 Phase 1 row now names the glass skeleton
  rg "glass skeleton|LibrarySurfaceVariantProvider|doc 35 §12" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md
  # Expected: at least one match in the Canonical Phase Map.

  # Doc 19 binds the estimate-surface reference for doc 35
  rg "Reference glass-surface system|estimate-surface-variant.tsx:21" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md
  # Expected: at least one match.

  # Card glass stays Phase 2/5 (not Phase 1)
  rg "card glass stays Phase 2|content-grade card glass" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md
  # Expected: at least one match.
  ```
- **Owner:** Planning lead

---

## 4. Verification commands (confirm 0 unresolved)

Run these from the plan folder root. All must return the expected output for
the pack to be internally consistent.

```bash
# C-001: no 3-tier trust formulation
rg -i "fresh/stale/missing" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/ -g "*.md"
# Expected: 0 matches

# C-002: no "badge" as UI element term for trust/freshness
rg -i "\bbadge\b" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/ -g "*.md" | rg -i "trust|freshness|stale|status"
# Expected: 0 matches

# C-003: no old scope language for component-library/index.tsx
rg -i "out of primary scope|in-scope adjacent" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/ -g "*.md"
# Expected: 0 matches

# C-005: no bare `bun test` for vitest
rg "\bbun test\b" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/ -g "*.md" | rg -v "NEVER|wrong"
# Expected: 0 matches (excluding warnings)

# C-008: no query-param template route
rg "\?template=" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/ -g "*.md"
# Expected: 0 matches (or only historical context)

# C-018: every actionable doc has Owner: rows
rg "Owner:" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/ -g "*.md" --count
# Expected: 26+ files with Owner: rows
```

---

## 5. Sign-off

> **2026-06-21 apply-pass update:** The prior "inline application accepted as
> residual" caveat is **lifted**. Conflicts **C-001 through C-022 are now
> applied inline across the pack** by the 2026-06-21 multi-agent apply pass
> (each agent owned a non-overlapping doc set; per-doc apply status is tracked
> in doc 25). Any remaining inline
> deltas are doc-specific residuals logged against the specific doc, not a
> pack-wide open item. The orphan `agent-sync-audit.md` was folded into C-021
> and deleted in this same pass.

| Reviewer | Verdict | Date | Notes |
|---|---|---|---|
| Planning lead | READY | 2026-06-21 | All 22 conflicts have binding resolutions. C-001..C-022 applied inline across the pack by the 2026-06-21 apply pass (per-doc residuals tracked in doc 25). `agent-sync-audit.md` folded into C-021 and deleted. |
| Reviewer gate (Oracle) | READY | 2026-06-21 | Conflict log is complete and binding (22/22). Inline application of C-001 through C-022 to affected docs is no longer a pack-wide open residual; any doc-specific deltas are logged per-doc. |

The pack is internally consistent when:
1. ✅ Every conflict in §3 has a binding resolution (22/22 resolved).
2. ✅ Inline updates for C-001 through C-022 applied across the pack by the 2026-06-21 apply pass (pack-wide residual caveat lifted; doc-specific residuals tracked per-doc).
3. ✅ Both reviewers signed off above (READY).
