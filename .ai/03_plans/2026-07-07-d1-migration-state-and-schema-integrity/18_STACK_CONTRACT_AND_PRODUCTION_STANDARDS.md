# 18 — Stack Contract and Production Standards

Consolidates the cross-cutting stack decisions for this plan. Archestimator's active
baseline (per `AGENTS.md` and verified against source): Next.js 16, React 19, Bun,
TypeScript, Tailwind v4, OpenNext on Cloudflare Workers, Cloudflare D1, R2, Durable
Objects, Queues/Cron, Cloudflare Email, Better Auth, TanStack Query, Zustand, repository
boundaries.

For this plan, most stack layers are **out of scope** (it's a D1/ops integrity plan with no
runtime/UI change). Each layer is marked in-scope or n/a with a reason.

---

## 18.1 Next.js App Router / Rendering — n/a

No routes, pages, layouts, route handlers, Server Components, Client Components, Suspense,
metadata, or navigation are touched. The scripts run in Node/Bun via `bunx`, not in the
Next.js runtime. **No Next.js 16 doc consultation was needed** for this plan (the
framework-sensitive surfaces — App Router, caching, Server Actions, Proxy/Middleware — are
untouched). Per the `AGENTS.md` nextjs-agent-rules, doc consultation is "before writing any
code" that touches Next.js; no such code is proposed here.

## 18.2 Cache / Revalidation / Freshness — n/a

No cached or cacheable data path is introduced. The scripts are one-shot CLI invocations.

## 18.3 Server Actions / Forms / Mutations — n/a

No mutations. The scripts are read-only.

## 18.4 React Component Quality — n/a

No components.

## 18.5 Tailwind v4 / Design-System — n/a

No UI. `DESIGN.md` (alpha-stage guide) is not consulted because no design decision is made.

## 18.6 State Management — n/a

No client/server state. The scripts have no state beyond their process lifetime.

## 18.7 TypeScript / Validation / Domain Modeling — in scope (scripts)

The new scripts (`audit-d1-migration-state.ts`, `verify-d1-schema-integrity.ts`) are TypeScript
and must follow repo TS conventions:
- Typed output shapes (the JSON contracts in `06_…` and `09_…`).
- No `any` on the output boundaries; strict parsing of Wrangler JSON.
- Fail-closed on parse failure (union return `{ ok: true, … } | { ok: false, error: string }` or thrown error + non-zero exit).
- `check-doc-migration-counts.mjs` is plain JS (`.mjs`) matching the repo's non-TS utility-script convention (`neutralize-graph-mandate.mjs`, `validate-ai-workflow-adapters.mjs`).

The doc-count guard does NOT need runtime validation (it parses strings); strict regex + fail-closed.

## 18.8 Cloudflare D1 / R2 / Durable Objects / Data Integrity — **core scope**

This is the heart of the plan. Production standards:

- **Resource boundary:** only `ARCH_DB` (`wrangler.jsonc:37-44`). Never legacy Supabase (`ebxxqidacheyapmmzavr`), never the unrelated `archestimator` provider project, never other accounts.
- **Free-tier posture:** no paid add-ons (`AGENTS.md` cost policy). Catalog reads are free-tier-safe.
- **Migration runner:** Wrangler `d1 migrations apply`/`list` is canonical; no custom runner (AD-1, REQ-ARCH-01).
- **Tracker:** Wrangler-internal `d1_migrations`; not introspected by app code; read via Wrangler CLI only.
- **Schema sources (split):** `migrations/*.sql` (69 app tables, 134 indexes, 4 triggers) + `better-auth-proof-router.ts:63-69` (4 auth tables, 3 indexes). Both canonical.
- **Non-idempotent migrations:** 7 (`0021`, `0025`, `0028`, `0029`, `0032`, `0035`, `0037`); fix-forward policy in §7.3; `0035` is the critical-risk rebuild.
- **App authorization:** unchanged by this plan (verifier is read-only at the catalog level; no row-level authz surface).
- **Transaction boundaries:** n/a (read-only catalog queries).
- **Idempotency:** the scripts are inherently idempotent (read-only).
- **Migration order/reversibility/backfill:** §7.2 + §7.3.
- **Query plans/cardinality:** catalog reads; no query-plan risk.
- **Data retention/deletion/audit/recovery:** §7.8 (restore options + runbook).
- **Provider-proof boundary:** local vs `--remote` is the explicit boundary; hosted proof is owner-gated; never claim local = remote.

## 18.9 Better Auth — in scope (schema only)

The plan treats Better Auth's D1 schema as a canonical source (DEC-002). It does NOT touch
Better Auth runtime, sessions, OAuth, magic links, or route gates. The compliance gate
(REQ-SEC-01) checks the `account_security_events` HMAC CHECK constraint (migration `0035`),
which is a security-audit concern adjacent to Better Auth but not a Better Auth runtime concern.

## 18.10 R2 / Durable Objects / Queues / Cron / Email — n/a (mostly)

- **R2:** not touched (the verifier is D1-only).
- **Durable Objects:** not touched. (Note: `wrangler.jsonc:53-58` has a DO-class `migrations`
  array for `CollaborationRoom` — this is NOT D1 SQL and is correctly excluded from the plan's scope.)
- **Queues:** not touched.
- **Cron:** the plan *documents* the three crons (`0 3 * * *`, `15 3 * * *`, `30 3 * * *`)
  and notes `30 3 * * *` drives the retention pass (which writes `data_retention_events`,
  migration `0034`). It does not modify crons.
- **Email:** not touched.

## 18.11 Security / Privacy / Abuse — in scope (narrow)

Covered in `08_…`. The scripts are read-only, do not read `.env*`, do not print secrets,
and verify compliance-table presence (a security control). No new authz surface.

## 18.12 Performance / Scalability / Resource Budgets — n/a (with justification)

§9.1. Catalog reads are constant-time; no budget needed. The directive allows n/a when
justified; this is justified.

## 18.12 Reliability / Observability / Operations — in scope (dev/CI ops)

§9.2-9.4 + §13. Scripts fail-closed; non-zero exit is the alert; evidence artifacts under
documented paths; restore runbook extends the existing one.

## 18.13 Accessibility — n/a

§05. No UI.

## 18.14 Testing Expectations — in scope

§12. Lightest proof: unit tests on fixture Wrangler-output + fixture catalogs; local D1
run; denial tests for false-PASS scenarios. No E2E/browser/perf harness (correctly skipped).

## 18.15 Stack versions (verified at plan time)

- Wrangler: invoked via `bunx wrangler` (`package.json:11,14`); version pinned by the lockfile (not re-verified in-session, but stable).
- Bun: `bun test`, `bun run` (`package.json:79-81`).
- TypeScript: `tsc --noEmit` (`package.json:78`).
- D1: SQLite-backed; catalog is `sqlite_master`.

No framework version was found to conflict with the plan's proposals.
