# 18 — Stack Contract and Production Standards

Consolidates the cross-cutting production decisions for the active Archestimator baseline (Next.js 16 + React 19 + Bun + Tailwind v4 + Cloudflare Workers/OpenNext + D1 + R2 + DO + Queues/Cron + Cloudflare Email + Better Auth + TanStack Query + Zustand + repository boundaries).

## 18.1 Next.js App Router / Rendering

- `/workshop` is an async RSC (`WorkshopPage`) that batches homebase data via `getWorkshopHomebaseData()` → `getWorkshopHomebaseDataAppPath()` (`workspace-repository.ts:1776/2129`), a single `Promise.all` wave of 6 reads. The activation milestone read is appended as a **7th parallel arm** in the same wave (6→7 arms, still 1 wave) — no new serialized round trip. The RPC path (`getWorkshopHomebaseDataRpcPath`, L2125) is disabled and out of scope.
- `WorkspaceWelcomePanel` is the smallest `"use client"` boundary (modal open state + dismiss action). Everything activation-logic (`src/lib/activation/**`) is server-only.
- `loading.tsx` already mirrors the bento; add a welcome-skeleton to avoid layout shift (T2.x consideration).
- No new route introduced for closed beta; `/workshop/onboarding` stays a redirect.
- Navigation: existing `router.refresh()` after mutations re-reads milestones (read-your-writes satisfied).
- Metadata/images/fonts: unaffected.

## 18.2 Cache / revalidation / freshness

- There is **no** existing cache layer on the active homebase app path — `getWorkshopHomebaseDataAppPath()` is a plain per-request `Promise.all` in the RSC. Activation does not introduce one; it appends one parallel arm.
- Revalidation: existing `router.refresh()` + `revalidatePath` calls in the rung actions.
- No new `use cache`/`cacheLife`/`cacheTag` introduced.
- Read-your-writes: satisfied by `router.refresh()` after project create.
- Cross-workspace isolation: milestones `workspace_id`-scoped; homebase query already filters by caller's workspace.
- Failure: milestone read fail → `activationMilestones=null`, `firstRun=(projects.length===0)` (null-safe; panel eligible when empty since missing row ⇒ not dismissed).

## 18.3 Server Actions / mutations

- Existing rung actions gain inline `emitActivationEvent` + `markMilestone` calls.
- Authz inside each action (existing); activation inherits it.
- Idempotency: COALESCE upsert for milestones; `milestone_first` flag distinguishes first occurrence in events.
- Non-throwing: all activation calls wrapped try/catch.
- Progressive enhancement: `NewProjectForm` already works as a form action; activation does not change that.
- Cache invalidation: existing `revalidatePath`/`router.refresh()`.
- Audit: activation events → observability log.

## 18.4 React component quality

- `WorkspaceWelcomePanel`: clear ownership; derived `firstRun`; no effect-driven render; one focus-management effect with cleanup; stable (singleton); typed props; reuses `Button`/`EmptyState`.
- Zero states reuse `EmptyState` primitive.

## 18.5 Tailwind v4 / design system

- Reuse existing tokens (`bg-surfaceMuted/60`, `border-divider`, `text-ink`, `text-tertiary`).
- No new design tokens required.
- `DESIGN.md` is alpha-stage; defer to owner.
- Design-lint: run `bun run lint:design-system` for UI changes; not blocking per proportional policy.

## 18.6 State management

- Server-authoritative: milestones in D1.
- Client-only cosmetic: hint chip dismissed state in `localStorage`.
- TanStack Query: unchanged (existing dashboard cache).
- Zustand: not introduced.
- URL state: none added.

## 18.7 TypeScript / validation / domain modeling

- Typed `ActivationMilestones`, `ActivationEventType`, `ActivationEventSource`.
- Runtime enum validation for `source` server-side.
- No `any`, no unsafe casts.
- D1 row model updated for the new table; no Worker Env type change → no `cf:typegen`.

## 18.8 Cloudflare D1 / R2 / DO / Queues / data integrity

- D1 only (new table). R2/DO/Queues/Email/Images untouched.
- Migration ordered (`0039`), additive, reversible (`DROP TABLE`).
- Idempotent COALESCE upsert; reconciliation backfill (§7.7).
- Workspace-scoped authz.
- Provider boundary strict (only `wrangler.jsonc` resources).
- Rollback/fix-forward safe.

## 18.9 Security / privacy / abuse

- Threat model in `08_…`. No new credentials. Event payload typed + redacted. Workspace-scoped. No third-party SDK in `/workshop` for closed beta. Closed-beta allowlist bounds the population.

## 18.10 Performance / scalability / budgets

- Evaluator + budgets in `09_…`. Query-count gate + TTFB p95 gate. Bundle delta minimal. No new dependency.

## 18.11 Reliability / observability / operations

- Failure modes + rollback in `09_…`/`13_…`. Events to observability log with `scope:"activation"`. Optional kill-switch flag. No alerts/dashboards for closed beta (acceptable).

## 18.12 Accessibility / product UX

- Keyboard path, focus management/restoration, SR semantics, live-region, states, responsive, reduced-motion, non-color cues in `05_…`.

## 18.13 Testing for the stack

- Unit (milestone/event schema), DOM (panel/zero states/a11y), integration (action emit + idempotent milestone), security denial, env-gated Playwright e2e, perf query-count test. Lightest proof per claim.
