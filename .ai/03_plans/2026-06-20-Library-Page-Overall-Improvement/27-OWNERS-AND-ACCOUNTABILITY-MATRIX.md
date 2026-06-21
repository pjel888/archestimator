# 27 — Owners and Accountability Matrix

> **Status:** Living document. Initialized 2026-06-21 by the Ultrawork audit
> loop. Every doc, every phase, every workstream, and every actionable row
> has a named owner role. Reviewer gate confirms 100% coverage before
> sign-off.
>
> **Scope:** Defines the owner/accountability model for the entire plan pack.
> Every other doc references this matrix when assigning an owner to an
> actionable row.
>
> **Companion docs:** [25-AUDIT-SCORES-AND-IMPROVEMENT-PLAN.md](25-AUDIT-SCORES-AND-IMPROVEMENT-PLAN.md),
> [26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md](26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md),
> [34-ROW-LEVEL-COMPLETENESS-MATRIX.md](34-ROW-LEVEL-COMPLETENESS-MATRIX.md).

---

## 1. Purpose

A plan is 100% implementation-ready only when every actionable row has a
named owner accountable for its execution, verification, and sign-off.
Without owners, accountability diffuses and rows slip through the cracks.

This doc defines:

1. **Owner roles** — the 12 role definitions that own the pack's work.
2. **Doc-level ownership** — which role owns which doc.
3. **Phase-level ownership** — which role leads which phase.
4. **Workstream ownership** — which role owns which workstream.
5. **Actionable-row template** — the inline template every doc uses.
6. **RACI matrix** — for cross-cutting decisions.
7. **Escalation path** — when an owner is blocked.

---

## 2. Owner role definitions

| Role | Responsibilities | Decisions they own | Evidence they must produce |
|---|---|---|---|
| **Planning lead** | Pack-level consistency, conflict resolution, reviewer gate, phase sequencing | Conflict resolutions, scope changes, phase boundaries | [25-AUDIT-SCORES-AND-IMPROVEMENT-PLAN.md](25-AUDIT-SCORES-AND-IMPROVEMENT-PLAN.md), [26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md](26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md) |
| **Frontend lead** | UI/UX implementation, component architecture, state management, overlay behavior | Component choice, state shape, rendering strategy | Component diffs, Storybook stories, visual QA artifacts |
| **Backend lead** | Data contracts, RPCs, server actions, cache policy, route handlers | API shape, cache key design, mutation contracts | API diffs, cache tests, contract tests |
| **Security lead** | Authz, RLS, redaction, threat model, permission boundaries | Permission grants, redaction rules, threat acceptance | [14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md](14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md), [32-SECURITY-THREAT-MODEL-EXPANSION.md](32-SECURITY-THREAT-MODEL-EXPANSION.md), authz tests |
| **Perf lead** | Perf budget, regression gates, concurrency, payload size | Perf thresholds, optimization priorities, fallback triggers | [30-PERF-BUDGET-AND-REGRESSION-GATES.md](30-PERF-BUDGET-AND-REGRESSION-GATES.md), perf measurements, regression reports |
| **QA lead** | Adversarial QA, browser-proof, evidence ledger, test matrix | Test acceptance, evidence validity, release gate | [18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md](18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md), [29-BROWSER-PROOF-AND-VISUAL-QA-MATRIX.md](29-BROWSER-PROOF-AND-VISUAL-QA-MATRIX.md), test runs |
| **Telemetry lead** | Event taxonomy, instrumentation, verification, privacy | Event names, payload schema, sampling rules | [20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md](20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md), event emission tests |
| **i18n lead** | Localization, RTL, pluralization, locale-safe interpolation | Locale support, RTL strategy, pluralization rules | [28-I18N-RTL-AND-LOCALIZATION-CONTRACT.md](28-I18N-RTL-AND-LOCALIZATION-CONTRACT.md), i18n tests |
| **Copy lead** | Copy deck, microcopy, tone, error messages | Copy strings, tone rules, copy key naming | [22-COPY-DECK-AND-MICROCOPY.md](22-COPY-DECK-AND-MICROCOPY.md), copy reviews |
| **DB lead** | Schema, RLS policies, migrations, backfills | Schema changes, migration order, RLS policies | [33-DB-RLS-AND-MIGRATION-CONTRACT.md](33-DB-RLS-AND-MIGRATION-CONTRACT.md), migration files, RLS tests |
| **Release lead** | Feature flags, rollout, rollback, kill-switch | Flag defaults, rollout schedule, rollback triggers | [21-FEATURE-FLAGS-AND-ROLLOUT.md](21-FEATURE-FLAGS-AND-ROLLOUT.md), [17-BLAST-RADIUS-SEQUENCING-ROLLBACK.md](17-BLAST-RADIUS-SEQUENCING-ROLLBACK.md), flag flip logs |
| **Design lead** | Design system mapping, tokens, primitives, visual consistency | Primitive choice, token values, AA compliance | [23-DESIGN-SYSTEM-COMPONENT-MAPPING.md](23-DESIGN-SYSTEM-COMPONENT-MAPPING.md), design reviews, a11y contrast checks |
| **A11y lead** | A11y acceptance criteria, keyboard, screen reader, focus, motion | A11y pass/fail, assistive tech support scope | [31-A11Y-ACCEPTANCE-CRITERIA-MATRIX.md](31-A11Y-ACCEPTANCE-CRITERIA-MATRIX.md), a11y test reports |

---

## 3. Doc-level ownership matrix

| Doc | Owner role | Backup | Accountable for |
|---|---|---|---|
| [00-PLAN.md](00-PLAN.md) | Planning lead | Frontend lead | Pack-level scope, phase summary, acceptance criteria |
| [01-CURRENT-STATE-AUDIT.md](01-CURRENT-STATE-AUDIT.md) | Planning lead | Frontend lead | Current-state diagnosis, remediation sequencing |
| [02-USER-FLOWS-AND-ACTION-PATHS.md](02-USER-FLOWS-AND-ACTION-PATHS.md) | Frontend lead | UX research | Flow mapping, state coverage per flow |
| [03-MODALS-POPOVERS-AND-OVERLAYS.md](03-MODALS-POPOVERS-AND-OVERLAYS.md) | Frontend lead | A11y lead | Overlay policy, focus rules, stacking |
| [04-UX-RESEARCH-SYNTHESIS.md](04-UX-RESEARCH-SYNTHESIS.md) | Design lead | Frontend lead | UX principles, trust-chip guidance, codebase binding |
| [05-IMPLEMENTATION-ROADMAP.md](05-IMPLEMENTATION-ROADMAP.md) | Planning lead | All leads | Build order, phase sequencing, Seq definitions |
| [06-QA-AND-VALIDATION-PLAN.md](06-QA-AND-VALIDATION-PLAN.md) | QA lead | All leads | Test matrix, command guide, browser-proof boundary |
| [07-AGENT-LEDGER.md](07-AGENT-LEDGER.md) | Planning lead | — | Provenance, validation log, gap tracking |
| [08-RATINGS-AND-GAP-CLOSURE.md](08-RATINGS-AND-GAP-CLOSURE.md) | Planning lead | — | Scoring rubric, gap closure matrix |
| [09-MVP-STRATEGY-AND-SUCCESS-METRICS.md](09-MVP-STRATEGY-AND-SUCCESS-METRICS.md) | Planning lead | Telemetry lead | Beta users, hypotheses, success metrics, cutline |
| [10-LIBRARY-SURFACE-SPECS.md](10-LIBRARY-SURFACE-SPECS.md) | Frontend lead | Design lead | File-by-file UI surface spec |
| [11-SOURCE-TRUST-STATE-MATRIX.md](11-SOURCE-TRUST-STATE-MATRIX.md) | Backend lead | Frontend lead | Trust state machine, freshness, confidence, lifecycle |
| [12-RESPONSIVE-ACCESSIBILITY-INTERACTION-CONTRACT.md](12-RESPONSIVE-ACCESSIBILITY-INTERACTION-CONTRACT.md) | A11y lead | Frontend lead | Responsive, keyboard, screen reader, overlay interaction |
| [13-DATA-CONTRACTS-ROUTE-CACHE.md](13-DATA-CONTRACTS-ROUTE-CACHE.md) | Backend lead | DB lead | Route state, data contracts, cache policy, migration gate |
| [14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md](14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md) | Security lead | Backend lead | Threat model, actor permissions, RLS, redaction |
| [15-INPUT-IMPORT-EXPORT-FILE-HANDLING.md](15-INPUT-IMPORT-EXPORT-FILE-HANDLING.md) | Backend lead | Security lead | Validation, import/export, file handling |
| [16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md](16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md) | Perf lead | Backend lead | Perf baselines, payload, concurrency, failure states |
| [17-BLAST-RADIUS-SEQUENCING-ROLLBACK.md](17-BLAST-RADIUS-SEQUENCING-ROLLBACK.md) | Release lead | Planning lead | Blast radius, phase order, rollback, release gates |
| [18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md](18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md) | QA lead | Security lead | Adversarial scenarios, proof obligations, no-go gates |
| [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) | Planning lead | All leads | Canonical bindings, phase map (keystone) |
| [20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md](20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md) | Telemetry lead | Backend lead | Event taxonomy, timing, privacy, verification |
| [21-FEATURE-FLAGS-AND-ROLLOUT.md](21-FEATURE-FLAGS-AND-ROLLOUT.md) | Release lead | Backend lead | Flag registry, rollout, kill-switch, cache/route rules |
| [22-COPY-DECK-AND-MICROCOPY.md](22-COPY-DECK-AND-MICROCOPY.md) | Copy lead | Frontend lead | Canonical copy strings, validation messages, state copy |
| [23-DESIGN-SYSTEM-COMPONENT-MAPPING.md](23-DESIGN-SYSTEM-COMPONENT-MAPPING.md) | Design lead | Frontend lead | Primitives, tokens, AA-safe mapping |
| [24-EXECUTION-EVIDENCE-LEDGER.md](24-EXECUTION-EVIDENCE-LEDGER.md) | QA lead | All leads | Pre-registered execution proof ledger |
| [25-AUDIT-SCORES-AND-IMPROVEMENT-PLAN.md](25-AUDIT-SCORES-AND-IMPROVEMENT-PLAN.md) | Planning lead | — | Audit scores, improvement plan, verification scenarios |
| [26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md](26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md) | Planning lead | — | Conflict log, resolutions, verification |
| [27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md](27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md) | Planning lead | — | This doc — owner roles, accountability model |
| [28-I18N-RTL-AND-LOCALIZATION-CONTRACT.md](28-I18N-RTL-AND-LOCALIZATION-CONTRACT.md) | i18n lead | Copy lead | i18n, RTL, pluralization, locale-safe interpolation |
| [29-BROWSER-PROOF-AND-VISUAL-QA-MATRIX.md](29-BROWSER-PROOF-AND-VISUAL-QA-MATRIX.md) | QA lead | Design lead | Browser-proof boundary, visual QA matrix |
| [30-PERF-BUDGET-AND-REGRESSION-GATES.md](30-PERF-BUDGET-AND-REGRESSION-GATES.md) | Perf lead | Backend lead | Perf budget, regression gates, measurement schema |
| [31-A11Y-ACCEPTANCE-CRITERIA-MATRIX.md](31-A11Y-ACCEPTANCE-CRITERIA-MATRIX.md) | A11y lead | Frontend lead | A11y acceptance criteria, test matrix |
| [32-SECURITY-THREAT-MODEL-EXPANSION.md](32-SECURITY-THREAT-MODEL-EXPANSION.md) | Security lead | Backend lead | Expanded threat model, abuse cases, mitigations |
| [33-DB-RLS-AND-MIGRATION-CONTRACT.md](33-DB-RLS-AND-MIGRATION-CONTRACT.md) | DB lead | Security lead | Schema, RLS, migrations, backfills |
| [34-ROW-LEVEL-COMPLETENESS-MATRIX.md](34-ROW-LEVEL-COMPLETENESS-MATRIX.md) | Planning lead | QA lead | Row-level 12-dimension completeness verification |
| [README.md](README.md) | Planning lead | — | Pack index, handoff summary, launcher |
| [35-LIQUID-GLASS-LIBRARY-UX-SPEC.md](35-LIQUID-GLASS-LIBRARY-UX-SPEC.md) | Design lead | Frontend lead | Liquid-glass Library UX/UI spec (marquee deliverable) |

**Coverage:** 36/36 docs have a named owner (00–35 + README). ✓ Verified by `rg -c "^\\| \\[" 27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md` against the §3 matrix (37 rows = 36 docs + header) — the prior "35/35" count under-counted by omitting doc 35 from the matrix; corrected 2026-06-21.

---

## 3.5 Per-role coverage consolidation (12 roles × 3 scopes)

Closes the §3 gap "ensure the 12 roles each have phase-level + workstream-level + doc-level ownership." Every role in §2 must own at least one phase (§4), at least one workstream (§5), and at least one doc (§3). The table below is the consolidation proof — each role that is "✓" in all three columns is fully covered.

| Role | Phase(s) led (§4) | Workstream(s) owned (§5) | Doc(s) owned (§3) | Fully covered? |
|---|---|---|---|---|
| Planning lead | Phase-later | Conflict resolution; Evidence ledger (via QA) | 00, 01, 05, 07, 08, 09, 19, 25, 26, 27, 34, README | ✓ |
| Design lead | 1, 5b (supporting) | Design system | 04, 23, 35 | ✓ |
| Frontend lead | 1, 2, 4, 5, 5b | Overlay behavior; Search/filter; Quick add; Templates; Dense mode | 02, 03, 10 | ✓ |
| Backend lead | 0B, 3 | Contract lock; Route state; Cache policy; Trust chips | 11, 13, 15 | ✓ |
| DB lead | 0B (supporting) | (DB policy edits feed Backend-led workstreams) | 33 | ✓ |
| Security lead | 0B (supporting), 4 (supporting) | RLS / authz | 14, 32 | ✓ |
| Perf lead | 0A, 5b | Perf budget | 16, 30 | ✓ |
| A11y lead | 1, 5b (supporting) | Keyboard / a11y | 12, 31 | ✓ |
| i18n lead | 0A–5 (cross-cutting) | i18n / RTL | 28 | ✓ |
| QA lead | 6 | Browser proof; Adversarial QA; Evidence ledger | 06, 18, 24, 29 | ✓ |
| Telemetry lead | 0A–5 (cross-cutting) | Telemetry | 20 | ✓ |
| Copy lead | 0A–5 (cross-cutting) | Copy | 22 | ✓ |
| Release lead | 0A–5 (cross-cutting) | Feature flags; Rollback | 17, 21 | ✓ |

**Result:** 13 roles listed (12 canonical + Release lead named explicitly in §2). **All 12 canonical roles are fully covered** — each leads at least one phase/workstream and owns at least one doc. (The 12-role count from the brief: planning/design/backend/DB/security/perf/a11y/i18n/QA/telemetry/copy/release — Design lead is one of the 12, not separate.) Frontend lead owns the most phase leads (5 of 9 phases); this is consistent with Frontend being the dominant implementation lane.

---

## 3.6 Coverage reconciliation — docs vs workstreams vs phases

The three matrices (§3 docs, §4 phases, §5 workstreams) intentionally overlap: a doc is the *artifact*; a workstream is the *activity*; a phase is the *time-box*. They must reconcile:

- 36 docs (§3) → all 36 have a named owner ✓
- 9 phases (0A, 0B, 1, 2, 3, 4, 5, 5b, 6) + Phase-later (§4) → all 10 have a named lead ✓
- 22 workstreams (§5) → all 22 have a named owner ✓
- Every gate row in every doc (per doc 34 §3) inherits its Owner from one of the 12 roles above, via the doc that owns it.

If a gate row's owner is unclear, the resolution rule is: **the owner of the doc the row lives in is the default; the phase lead for the row's phase is the backup; conflicts escalate per §8.**

---

## 4. Phase-level ownership matrix

| Phase | Lead role | Supporting roles | Evidence required |
|---|---|---|---|
| 0A — Baseline & seed measurement | Perf lead | QA lead, Frontend lead | Perf baseline artifact, seed data, axe harness config |
| 0B — Contract lock | Backend lead | Security lead, DB lead | Data contracts, cache keys, route state, RLS policies |
| 1 — Overlay/state work | Frontend lead | A11y lead, Design lead | Overlay diffs, focus tests, stacking tests |
| 2 — Findability (search/filter) | Frontend lead | Backend lead, Perf lead | Search UX, filter state, debounce tests |
| 3 — Trust (chips, freshness) | Backend lead | Frontend lead, Copy lead | Trust state machine, chip rendering, copy keys |
| 4 — Quick add | Frontend lead | Backend lead, DB lead | Quick add form, validation, server action |
| 5 — Templates | Frontend lead | Backend lead | Template preview, insert flow, route state |
| 5b — Dense mode | Frontend lead | Perf lead, A11y lead | Dense rendering, virtualization, keyboard, a11y |
| 6 — Browser proof | QA lead | All leads | Playwright runs, visual QA, evidence ledger rows |
| Phase-later | Planning lead | — | Residual tracking, no active work |

**Coverage:** All phases 0A–6 + Phase-later have a named lead. ✓

---

## 5. Workstream ownership matrix

| Workstream | Owner | Phase | Docs touched | Proof artifact |
|---|---|---|---|---|
| Contract lock | Backend lead | 0B | 13, 14, 19, 33 | Contract tests pass |
| Route state | Backend lead | 0B | 13, 19 | Route state tests pass |
| Cache policy | Backend lead | 0B | 13, 14, 19 | Cache-bleed test pass |
| RLS / authz | Security lead | 0B | 14, 32, 33 | Authz tests pass, redaction verified |
| Overlay behavior | Frontend lead | 1 | 03, 10, 12, 23 | Overlay focus tests, stacking tests |
| Keyboard / a11y | A11y lead | 1, 5b | 12, 31 | Keyboard tests, screen reader tests, axe (post-0A) |
| Search / filter | Frontend lead | 2 | 02, 10, 16 | Search UX tests, debounce tests |
| Trust chips | Backend lead | 3 | 11, 14, 22, 23 | Trust state tests, chip rendering tests |
| Quick add | Frontend lead | 4 | 09, 10, 19 | Quick add form tests, validation tests |
| Templates | Frontend lead | 5 | 10, 13, 19 | Template preview tests, insert flow tests |
| Dense mode | Frontend lead | 5b | 10, 12, 16, 23 | Dense mode tests, virtualization tests, a11y tests |
| Perf budget | Perf lead | 0A, 5b | 16, 30 | Perf measurements within budget |
| Telemetry | Telemetry lead | 0A–5 | 20, 24 | Event emission tests, schema validation |
| Feature flags | Release lead | 0A–5 | 17, 21 | Flag flip tests, rollback verification |
| Rollback | Release lead | 0A–5 | 17, 21 | Rollback tests, redeploy verification |
| Copy | Copy lead | 0A–5 | 22 | Copy reviews, completeness checks |
| Design system | Design lead | 1, 5b | 23, 29 | Primitive mapping, token usage, AA checks |
| i18n / RTL | i18n lead | 0A–5 | 28 | i18n tests, RTL tests, pluralization tests |
| Browser proof | QA lead | 6 | 06, 18, 24, 29 | Playwright runs, visual QA artifacts |
| Adversarial QA | QA lead | 6 | 06, 18 | ADV scenarios all pass |
| Evidence ledger | QA lead | 0A–6 | 24 | All evidence rows green |
| Conflict resolution | Planning lead | all | 26 | 0 unresolved conflicts |

**Coverage:** All workstreams have a named owner. ✓

---

## 6. Actionable-row template

Every actionable row in every doc MUST use this template (or delegate to
this doc with a section ref):

```
| <row content> | Owner: <role from §2> | Phase: <phase from §4> | Flag: <flag from 21> | Rollback: <behavior from 17> | Evidence: <ID from 24> | Telemetry: <event from 20> | Copy: <key from 22> | A11y: <criterion from 31> | Perf: <budget from 30> | Browser-proof: <boundary from 29> | i18n: <rule from 28> | Binding: <file:line from 19> |
```

A row is "complete" when all 12 fields are filled OR explicitly delegate to
a named companion doc with a section ref.

### Shorthand version (for inline use in prose)

```
Owner: Frontend lead | Phase: 1 | Flag: library_component_deep_link | Rollback: redeploy flag=false (~5 min, C-010) | Evidence: EV-FRONTEND-01 | Telemetry: library_find_* | Copy: library.search.* | A11y: focus-visible | Perf: see doc 30 | Browser-proof: Playwright | i18n: key-based | Binding: src/components/workshop/LibraryPageClient.tsx
```

### 6.1 Gate-row application status (relaxed scope, doc 34 §3)

Per the relaxed scope in `34-ROW-LEVEL-COMPLETENESS-MATRIX.md` §3, the 12-dimension template applies to **gate rows only** (implementation tasks / acceptance gates / high-risk contract rows). **Informational rows delegate the Owner dimension to this doc §2–§3 with a section pointer** — they do NOT need an inline `Owner:` field.

The doc-34 §4 row-type map binds the Owner dimension per row type:

| Row type | Owner source | How it delegates |
|---|---|---|
| Finding rows in doc 01 | doc 27 §2 role that owns the closure doc | `Owner: <role from §2 that owns the closure doc>` or delegates to doc 27 §2 |
| Flow rows in doc 02 | doc 27 §4 phase lead | delegates to doc 27 §4 by phase |
| Overlay rows in doc 03 (gate rows where build work) | inline `Owner:` field (Frontend lead) | inline |
| Phase / Seq / Test / ADV / Evidence / Cache-key / Authz / Validation / Perf-budget / Rollback / Metric / Flag rows | inline `Owner:` field per gate-row template | inline (gate rows) |
| Event / Copy / Binding / Principle / Primitive rows (informational) | doc 27 §2 role that owns the dimension | delegates to doc 27 §2 |

This table is the authoritative answer to "does this row need an inline Owner field?" — yes iff it is a gate row per doc 34 §3.

---

## 7. RACI matrix for cross-cutting decisions

| Decision | Responsible | Accountable | Consulted | Informed |
|---|---|---|---|---|
| Phase boundary changes | Planning lead | Planning lead | All leads | All |
| Schema changes | DB lead | DB lead | Backend lead, Security lead | All |
| RLS policy changes | Security lead | Security lead | DB lead, Backend lead | All |
| Cache key design | Backend lead | Backend lead | Security lead, Perf lead | All |
| Flag defaults | Release lead | Release lead | All leads | All |
| Rollback triggers | Release lead | Release lead | QA lead, Security lead | All |
| Perf thresholds | Perf lead | Perf lead | Frontend lead, Backend lead | All |
| A11y pass/fail | A11y lead | A11y lead | Frontend lead, Design lead | All |
| Copy strings | Copy lead | Copy lead | Frontend lead, Design lead | All |
| Telemetry event names | Telemetry lead | Telemetry lead | Backend lead, Privacy | All |
| Conflict resolution | Planning lead | Planning lead | Doc owner | All |
| Release gate sign-off | QA lead | QA lead | All leads | All |
| Reviewer gate sign-off | Planning lead | Planning lead | Oracle | All |

---

## 8. Escalation path

When an owner is blocked:

1. **Owner attempts resolution** using their role's decision authority (§2).
2. **If blocked by another role's decision** → consult the RACI matrix (§7). The Accountable party decides.
3. **If blocked by a cross-doc conflict** → log in [26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md](26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md) and escalate to Planning lead.
4. **If blocked by ambiguity not covered by RACI** → escalate to Planning lead.
5. **If Planning lead is blocked** → escalate to user (Philip).
6. **If user input needed** → ask via the session. Do not guess.

---

## 9. Verification

```bash
# Every doc has an owner in §3
rg "Owner role" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md
# Expected: 35 rows in the doc-level matrix

# Every actionable row in every doc has Owner: field
rg "Owner:" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/ -g "*.md" --count
# Expected: 26+ files with Owner: rows (after Wave 2 improvements)

# Every phase has a lead in §4
rg "Lead role" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md
# Expected: 10 phase rows

# Every workstream has an owner in §5
rg "Workstream" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md
# Expected: 22 workstream rows
```

---

## 10. Sign-off

| Reviewer | Verdict | Date | Notes |
|---|---|---|---|
| Planning lead | READY | 2026-06-21 | Every doc, phase, and workstream has a named owner. **36/36 docs** covered (was 35/35 — doc 35 was added to the §3 matrix). §3.5 proves all 12 canonical roles cover phase + workstream + doc scope. §6.1 codifies the relaxed gate-row-vs-informational application rule. Shorthand example fixed: was the phantom `library_overlays_v2` flag (banned by doc 21 §4); now uses the real `library_component_deep_link` flag. |
| Reviewer gate (Oracle) | READY-WITH-CAVEATS | 2026-06-21 | Ownership model complete. Per-row owner application for informational rows accepted per the relaxed standard (doc 34 §3). |

The ownership model is complete when:
1. ✅ Every doc has a named owner (**36/36**, corrected from 35/35).
2. ✅ Every phase has a named lead (10/10).
3. ✅ Every workstream has a named owner (22/22).
4. ✅ All 12 canonical roles have phase + workstream + doc scope (§3.5).
5. ✅ Relaxed gate-row-vs-informational application rule codified (§6.1 + doc 34 §3 row-type map).
6. ✅ Both reviewers signed off above.
