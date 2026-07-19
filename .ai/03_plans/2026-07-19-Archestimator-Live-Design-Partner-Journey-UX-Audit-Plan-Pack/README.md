# Archestimator Live Design-Partner Journey & UX Audit Plan Pack

> **Read [`00-PLAN.md`](./00-PLAN.md) first.** It is the canonical execution
> artifact. This README is a short index only.

## Status tuple

`IMPLEMENTATION_READY / NOT_STARTED / BOUNDARY / ACTIVE / ACTIVE`

- **Baseline HEAD:** `b2a934919ce499c0404e5b9f9a5644f22757c78a` (2026-07-19)
- **Suite version:** `2026-07-12`
- **Profile:** `high-blast-radius`
- **Action ceiling:** `IMPLEMENT_LOCAL` (pack is `PLAN_ONLY` — remediation units await separate execution authorization)
- **Exact next unit:** `UNIT-001` (action-inbox async Server Actions — restores the build; closes the only accepted Critical with no dependencies, `UX-BUILD-001`)

## What this pack is

A live + source-trace design-partner journey & UX audit of `archestimator` at
HEAD `b2a934919`, plus a validator-conformant, implementation-ready plan pack
for every accepted finding.

It is **not**:
- a security audit (Infosec OWASP owns; cross-referenced);
- a numeric / financial-truth audit (Commercial Estimate-Truth owns);
- a visual redesign or cosmetic backlog;
- a hosted/production proof.

## Headline

**At HEAD the codebase does not build.** `src/lib/admin/action-inbox-actions.ts`
declares three `"use server"` exports as non-async functions, violating the
React 19 / Next.js 16 contract. `bun run build` exits 1. The dev server returns
HTTP 500 for `/workshop`, `/admin`, `/admin/today`, `/privacy`, `/security`,
`/access-required`. This single defect (`UX-BUILD-001`) blocks every
authenticated journey and every founder/admin surface.

This is the gating finding. Fixing it (3-line edit) is `UNIT-001`.

## Controlled-beta journey verdict

**Not ready.** Two Critical findings block recruiting:
1. `UX-BUILD-001` — no deployment is possible.
2. `UX-LEAD-001` — the only "Request access" CTA on `/signup` posts to a
   non-existent handler; every beta request is lost.

Combined with `UX-LEAD-002` (contact form is mailto-only; founder never sees
leads), the pre-recruiting funnel captures zero leads at HEAD.

## Accepted findings summary

See [`artifacts/findings.json`](./artifacts/findings.json) for the canonical
machine-readable source (23 findings total).

- **Critical: 2** — `UX-BUILD-001`, `UX-LEAD-001`
- **High: 2** — `UX-ACTIVATE-001`, `UX-CTA-001`
- **Medium: 9**
- **Low: 6**
- **Informational: 4**
- **Rejected / refuted / deferred / blocked:** 7 candidates in
  [`artifacts/rejected-refuted-findings.json`](./artifacts/rejected-refuted-findings.json).

## Reading order

1. [`00-PLAN.md`](./00-PLAN.md) — normative execution artifact
2. [`artifacts/journey-coverage.csv`](./artifacts/journey-coverage.csv) —
   J-01..J-09 disposition matrix
3. [`artifacts/findings.json`](./artifacts/findings.json) — findings register
4. [`artifacts/existing-pack-overlap-matrix.md`](./artifacts/existing-pack-overlap-matrix.md)
5. [`artifacts/second-pass-challenge.md`](./artifacts/second-pass-challenge.md)
6. [`artifacts/ux-state-matrix.md`](./artifacts/ux-state-matrix.md)
7. [`artifacts/founder-rescue-ledger.md`](./artifacts/founder-rescue-ledger.md)
8. [`artifacts/rejected-refuted-findings.json`](./artifacts/rejected-refuted-findings.json)
9. [`units/`](./units/) — remediation unit docs
10. [`PACK-MANIFEST.md`](./PACK-MANIFEST.md) — artifact registry
11. [`LOOP_LEDGER.md`](./LOOP_LEDGER.md) — audit events and validator result
12. [`artifacts/`](./artifacts/) — evidence: build-failure log, dev-server
    runtime log, browser environment, commands run, screenshot index
    (explains why zero screenshots were capturable), persona fixture register,
    console-network summary.
