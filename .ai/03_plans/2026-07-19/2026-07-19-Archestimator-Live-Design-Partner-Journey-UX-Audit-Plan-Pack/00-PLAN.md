# Archestimator Live Design-Partner Journey & UX Audit — Canonical Execution Plan

> This is the canonical execution artifact. `plan-pack.json` is the
> machine-readable mirror. README.md is a short index only.

## Status tuple

`IMPLEMENTATION_READY / NOT_STARTED / BOUNDARY / ACTIVE / ACTIVE`

- **Baseline HEAD:** `b2a934919ce499c0404e5b9f9a5644f22757c78a` (2026-07-19)
- **Suite version:** `2026-07-12`
- **Profile:** `high-blast-radius`
- **Action ceiling:** `IMPLEMENT_LOCAL` (pack is `PLAN_ONLY` — remediation units await separate execution authorization)
- **Exact next unit:** `UNIT-001` (action-inbox async Server Actions — restores the build; closes the only accepted Critical with no dependencies, `UX-BUILD-001`)

## 1. Outcome and business intent

Answer the master prompt's central question — *can a qualified Philippine AEC
design partner move from first contact to first credible estimate, client
handoff, revision, and reuse with minimal founder rescue, understandable
language, trustworthy feedback, and recoverable failure states?* — with
evidence, and convert only accepted root causes into dependency-ordered
execution units.

**At HEAD the answer is "no".** The codebase does not build (`UX-BUILD-001`),
the closed-beta request-access intake is broken at the source (`UX-LEAD-001`),
and three CTA systems fragment the discovery journey (`UX-CTA-001`).

## 2. Task Contract

- **Objective:** live + source-trace journey & UX audit; produce a
  validator-conformant plan pack; do NOT implement remediation in product code.
- **Scope:** nine mandatory journeys (J-01..J-09), seven personas, the full UX
  state matrix, the existing-pack overlap matrix, and the founder-rescue ledger.
- **Exclusions:** security conclusions (Infosec OWASP owns them), numeric
  financial truth (Commercial Estimate-Truth owns it), cosmetic preferences,
  hosted/production proof.
- **Authority:** `AGENTS.md`, current source, `.ai/00_system`, this prompt.
- **Owner:** lead single-agent (emulated passes labeled per journey; one
  independent adversarial second-pass lane).
- **Stop condition:** every mandatory journey has a disposition; every
  Critical/High finding has source/runtime evidence, an adversarial challenge,
  and one owner; validator passes.

## 3. Scope and explicit non-goals

**In scope:**
- Source-traced and (where reachable) live-browser UX findings for J-01..J-09.
- Dependency-ordered remediation units for accepted findings.
- Honest `EVIDENCE_BLOCKED` classification for journeys blocked by `UX-BUILD-001`.

**Non-goals:**
- Implementing any remediation (pack is `PLAN_ONLY`).
- Security audit (Infosec OWASP owns; cross-referenced).
- Numeric / persistence / financial truth audit (Commercial Estimate-Truth).
- Visual redesign or cosmetic backlog.
- Hosted / production proof.
- Tests (user-gated).

## 4. Baseline and evidence limits

- **Baseline HEAD:** `b2a934919ce499c0404e5b9f9a5644f22757c78a` (clean tree on `main`).
- **Dev server:** `bun x next dev --webpack --port 3020`, `.env.local` loaded,
  `CLOSED_BETA_ACCESS_ENABLED=false`, `ARCHESTIMATOR_DEV_AUTH_BYPASS=1`,
  dev-auth-bypass secret length 64, `ARCHESTIMATOR_DEV_AUTH_ADMIN_DB` NOT SET.
- **Browser tooling:** Playwright 1.61.1, Chromium 1228 (Desktop Chrome baseline;
  matrix projects intentionally not used).
- **Evidence classes actually collected:** `CURRENT_SOURCE_CONFIRMED`,
  `CALL_FLOW_CONFIRMED`, `LOCAL_RUNTIME_CONFIRMED` (build failure log,
  dev-server HTTP 500s, captured HTML titles). `BROWSER_CONFIRMED` is reserved
  for the *signature* of the build break (the Playwright harness's blanket
  goto-timeouts are themselves evidence that no route is servable).
- **Evidence classes NOT collected:** `PREVIEW_PROVIDER_CONFIRMED`,
  `HOSTED_CONFIRMED`, `OPERATOR_CONFIRMED`. No real email, OAuth, invitations,
  or recipients. No storage state persisted.

**Decisive evidence for `UX-BUILD-001`:**
- `artifacts/build-failure-log.txt` — `bun run build` exit 1, Turbopack
  diagnostic "Server Actions must be async functions" at
  `src/lib/admin/action-inbox-actions.ts:58,61,64`.
- `artifacts/dev-server-runtime-log.txt` — HTTP 500 responses for `/workshop`,
  `/admin`, `/admin/today`, `/privacy`, `/security`, `/access-required`.
- `artifacts/console-network-summary.json` — 28 goto timeouts across every
  probed route (the browser signature of the same compile break).

## 5. Existing-pack reconciliation

See `artifacts/existing-pack-overlap-matrix.md` for the full matrix. Summary:

- **MVP Startup Readiness Audit** — cross-referenced for guided-sample
  sequencing (UX-ACTIVATE-002) and branded-export feature (UX-EXPORT-001).
  This pack owns only the journey-level UX surfaces, not the engineering units.
- **Quality Master** — cross-referenced for the future CI guard for the
  `"use server"` async contract (UX-BUILD-002, deferred).
- **Infosec OWASP** — security conclusions on auth/share are NOT here. Only
  UX-owned copy consequences (UX-MAGIC-001, UX-SHARE-001) are in scope.

Zero accepted requirements or units have two active owners.

## 6. Requirements

13 requirements, one per unit (each unit is the sole owner of its requirement).
All `CORE` (no AUXILIARY requirements in this pack). Full list in
`plan-pack.json#requirements`. IDs: `UX-001` through `UX-013`.

Each CORE requirement maps to exactly one unit and at least one evidence record.

## 7. Decisions

- **DEC-AUTO-001:** Folder name follows the established repo convention
  (`YYYY-MM-DD-<SLUG>`) rather than the master-prompt literal
  (`<ASIA-MANILA-YYYY-MM-DD>-<PACK-SLUG>`). All seven existing packs use the
  date-prefix form; consistency wins. Recorded because the prompt's literal
  instruction conflicts with established convention.
- **DEC-AUTO-002:** Browser-evidence collection was attempted before
  source-tracing, per the master prompt's "live audit method." The build break
  (`UX-BUILD-001`) made Playwright `domcontentloaded` waits time out for every
  route. Source-trace became the strongest collectable evidence class. The
  zero-screenshot outcome is itself evidence (recorded in
  `artifacts/screenshots/INDEX.md`).
- **DEC-AUTO-003:** Severity downgrades from the second-pass adversarial
  challenge are applied to `findings.json` and the disposition matrix. The lead
  owns the final verdicts.

## 8. Authorization boundaries

- **AUTH-001:** No hosted/production proof. The pack's release_status is
  `BOUNDARY` because live-browser proof of every Critical/High finding requires
  a working build (after UNIT-001) and is not collectable at HEAD. AUTH-001 is
  the boundary; it is resolved by implementing UNIT-001 and re-running the
  audit harness, not by any external action.

This is the only active authorization boundary. It does NOT block
implementation of any unit; it bounds the *evidence class* available at HEAD.

## 9. Findings summary

23 accepted findings. After second-pass challenge:

- **Critical: 2** — `UX-BUILD-001`, `UX-LEAD-001`
- **High: 2** — `UX-ACTIVATE-001`, `UX-CTA-001` (was Critical; narrowed)
- **Medium: 9** — `UX-CTA-002` (was High), `UX-EMPTY-001` (was High),
  `UX-MAGIC-001`, `UX-LEAD-002`, `UX-VOCAB-001` (absorbs `UX-VOCAB-002`),
  `UX-ACTIVATE-002`, `UX-EXPORT-001`, `UX-SHARE-001`, `UX-SESSION-001`
- **Low: 6** — `UX-INVITE-001`, `UX-INVITE-002`, `UX-LEAD-003`, `UX-EMPTY-002`,
  `UX-SHARE-002`, `UX-COPY-001`
- **Informational: 4** — `UX-MAGIC-002`, `UX-EMPTY-003`, `UX-ADMIN-001`,
  `UX-BUILD-002`

(2 + 2 + 9 + 6 + 4 = 23. `findings.json` is the canonical register; counts
above are reconciled to it.)

Rejected/refuted/deferred/blocked: see `artifacts/rejected-refuted-findings.json`
(7 candidates including the `UX-ADMIN-002` "no compile break" claim that this
pack's runtime evidence REFUTED).

## 10. Acyclic dependency graph

```
UNIT-001 (Critical, build break)
   └── UNIT-002 (Critical, lead capture — depends on build for verification)

UNIT-003 (High, CTA unification) — independent
UNIT-004 (Medium, A/B wrapper) — independent
UNIT-005 (High, checklist publish) — independent
UNIT-006 (Medium, guided sample) — independent
UNIT-007 (Medium, library overview) — independent
UNIT-008 (Medium, magic-link + session copy) — independent
UNIT-009 (Medium, XLSX discoverability) — independent
UNIT-010 (Low, invite page) — independent
UNIT-011 (Medium, share password UX) — independent
UNIT-012 (Medium, landing PH vocabulary) — independent
UNIT-013 (Low/Info, polish batch) — independent
```

Only `UNIT-002 → UNIT-001` is a real edge. All other units edit disjoint files
and can be picked in any order. The DAG is acyclic (verified by the validator).

## 11. Execution slices / waves

**SLICE-001 — All units are in one ready slice.** `UNIT-001` is the canonical
`next_unit`. UNIT-002 depends on UNIT-001; all others are dependency-free.

Recommended execution order by priority:
- **Wave 1 (before recruiting):** UNIT-001, UNIT-002
- **Wave 2 (before user #1):** UNIT-003, UNIT-005
- **Wave 3 (before user #5):** UNIT-004, UNIT-006, UNIT-007, UNIT-008,
  UNIT-009, UNIT-011, UNIT-012
- **Wave 4 (before paid MVP):** UNIT-010, UNIT-013

## 12. Risks

- **RISK-001:** `OPEN` — After UNIT-001, a re-audit pass should advance
  source-traced findings to BROWSER_CONFIRMED. Without it, the pack's evidence
  class ceiling stays below the master prompt's preference. Owned by re-running
  the audit harness post-UNIT-001.
- **RISK-002:** `OPEN` — `UX-BUILD-002` (no CI guard for the `"use server"`
  async contract) means the break could recur. Deferred to Quality Master.
- **RISK-003:** `MITIGATED` — Three severity downgrades from the second-pass
  challenge narrowed impact but did not refute the underlying defects.

## 13. Resume state

- **Next ready unit:** `UNIT-001` (READY, no dependencies).
- **Implementation status:** `NOT_STARTED` (pack is `PLAN_ONLY`).
- **Baseline hashes:** recorded in `plan-pack.json#baseline`.
- **Handoff:** none — single lead; second-pass challenge consumed.
- **Cleanup:** dev server was killed; no ephemeral state remains.

## 14. Exact next ready unit

**`UNIT-001`** — make `snoozeActionItem`, `resolveActionItem`,
`dismissActionItem` in `src/lib/admin/action-inbox-actions.ts:58,61,64`
`async`. Run `bun run build`. Expect exit 0.

This unblocks every other unit's verification. It is a 3-line edit.

## 15. Completion and archive conditions

This *plan* is complete when:
- Every mandatory journey has a disposition in `artifacts/journey-coverage.csv`.
- Every Critical/High finding has source/runtime evidence, an adversarial
  challenge entry in `artifacts/second-pass-challenge.md`, and exactly one
  owner in `artifacts/existing-pack-overlap-matrix.md`.
- Cosmetic preferences are excluded (only UX-INVITE-002 font-size retained, and
  only because text-[8px] actively impairs mobile readability).
- The validator passes (run on this folder).
- The final report states what ran, what could not run, and the strongest
  evidence collected.

This *pack* archives only after UNIT-001..UNIT-013 are VERIFIED (or honestly
boundary-blocked) AND the re-audit pass after UNIT-001 advances at least the
Critical/High findings to BROWSER_CONFIRMED.
