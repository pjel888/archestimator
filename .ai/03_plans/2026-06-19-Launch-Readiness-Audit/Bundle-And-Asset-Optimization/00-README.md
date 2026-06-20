# Launch-Readiness Audit — Bundle & Asset Optimization

> Canonical status override: before implementing from this pack, read
> `../03-LAUNCH-GATE-DECISION-REGISTER.md` and `../08-IMPLEMENTATION-HANDOFF.md`.
> Pack-local blocker counts are historical/domain-scoped; the root register is authoritative
> for wider/external beta.

**Part of the consolidated 2026-06-19 Launch-Readiness Audit** (sibling pack to the
other domain audits under `.ai/03_plans/2026-06-19-Launch-Readiness-Audit/<Pack>/`).
This is a **deletable plan-pack header** per repo rules.

## Owner / user job

Philip is taking Archestimator into closed-beta on Vercel. This pack answers one question for the **bundle & asset** lane: *does the JS we ship to browsers and the static assets we deploy contain anything that is a launch blocker, and what is the cheap-but-real cleanup backlog before/just-after exposing real users?*

It is an **audit + backlog** pack, not an implementation pack. No source is edited here; this folder is the only writable surface.

## Scope (this domain)

- Client JS weight: heavy libs (`three`, `d3`, `exceljs`, `roughjs`/`rough-notation`, `lenis`, `@firecms/neat`), code-splitting / `next/dynamic` coverage, `optimizePackageImports`, server-only libs leaking client-side.
- Asset/image/font: `public/**` weight, `next/image` vs raw `<img>`, `next/font` strategy, dead/orphaned assets shipped in `public/`.
- Build wiring: `@next/bundle-analyzer`, `next.config.ts` image/package config.

## Routes / screens affected by remediation (if accepted)

- `/` and the public marketing routes (`/about`,`/features`,`/pricing`,`/contact`) — landing animation libs + hero/og imagery.
- Every authenticated `/workshop/*` page — the sidebar background texture asset.
- `/workshop/projects/[id]/data` (charts) and the `proposal.xlsx` export route — d3-shape / exceljs boundaries (verified clean; no change needed).
- Deploy artifact size only (no route) — orphaned `public/` assets + unused `three` dependency.

## Non-goals

- Runtime rendering perf (React render/hydration cost) — owned by Domain 5 (Frontend Rendering Performance) and the existing Performance-Refactor pack.
- Data-fetching/RSC/caching — Domain 8.
- CSP/headers/nonce pipeline — Domain 7 (Next.js/Vercel/Headers).
- Image *route* security/normalizer correctness (private bucket) — noted in cross-domain, owned by Domain 4/2.
- DESIGN.md visual decisions — alpha guide, defer to Philip.

## Files expected to change during remediation (if Philip accepts)

- `package.json` (remove unused `three` + `@types/three`; add explicit `d3-shape` + `@types/d3-shape`, drop full `d3`/`@types/d3` if nothing else uses it).
- `public/` (delete confirmed-orphan assets; re-encode `sidebar-BG.png`).
- `src/app/globals.css` (point `--sidebar-texture` at the re-encoded asset).
- `next.config.ts` (optional: widen `optimizePackageImports`).
- Lockfile.

## Validation gate

- `bun run type-check` + `bun run lint` clean (note: `bun run validate` is **known-red on main** for unrelated reasons — charts set-state-in-effect, ProposalExportPreviewDialog design-lint — so gate on type-check/lint/targeted tests, not full validate).
- `grep` proof of zero references for every deleted asset and for `three` before removal.
- `ANALYZE=true next build --webpack` treemap (or `next build` route-JS table) before/after for any lib-level change.
- App boots; landing + `/workshop` + share render; export still produces a valid `.xlsx`.

## Deletion criteria (if Philip rejects)

Delete this folder. It introduces no code and no migration; nothing depends on it. The findings are reproducible from the evidence cited in `01-AUDIT-FINDINGS.md`.

## Loop-surface selection

Audit/backlog work = **lightweight in-session loop, no LOOP_LEDGER**. Remediation of the *dependency removals* (`three`, `d3`) and *asset deletes* is low-blast-radius and reversible → direct edits + proportional verification when scheduled. No dated plan pack or Codex gate required unless bundled into a larger refactor.

## Durable-state path

Findings roll up into the parent `2026-06-19-Launch-Readiness-Audit` aggregation. Anything accepted for action should be recorded in `.ai/10_state/decisions.md` at implementation time. The pre-existing backlog items this pack reconciles against live in `.ai/03_plans/2026-06-14-Overall-Site-Performance-And-Optimization/` (items AS03/AS04/AS10 + INV10/INV11).
