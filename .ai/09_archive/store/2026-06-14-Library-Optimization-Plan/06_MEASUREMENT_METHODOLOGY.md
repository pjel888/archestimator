# 06 — Measurement Methodology

**Principle:** capture the **baseline first**, then prove every fix against it with a measured delta. The complaint ("slow, loading everywhere") is perceptual; this doc turns it into numbers so "significant performance boost / no loading screens" is verifiable, not asserted.

> Environment: dev server is the user's own Chrome session (dev-auth bypass is disabled; a second `next dev` will not start — see project memory). Run measurements against the running app at http://localhost:3000. Use nvm Node v25.8.0 for tooling; don't run heavy workflows alongside the full DOM suite.

---

## A. Metrics & targets

| Metric | How | Baseline (capture) | Target after P0 | Target after P2 |
|---|---|---|---|---|
| **Skeleton-flash count** (standard session, §B) | Playwright trace + manual/browser count | ~8 (per `03 §C`) | **≤1** (cold load only; no route `loading.tsx` on warm revisit) | ≤1 |
| **Overlay count** (standard session) | count `[data-route-overlay]` mounts | ~5 | **0** for intra-Library nav/mutations | 0 |
| **Tab-switch stopwatch** (click → content painted) | `performance.mark` (§C) | capture per tab | **< 100 ms warm** (cache hit) | <100 ms |
| **CLS on Overview cold load** | Web Vitals (§D) | capture | ~0 (skeleton matches) | ~0 |
| **TTFB per segment** | `server-timing` / Navigation Timing | capture | — | ↓ via RPC |
| **FCP / LCP / INP** | web-vitals lib (§D) | capture | LCP ↓, INP ↓ | ↓ |
| **Supabase round-trips / load** | server log count (§E) | Components ~10+folders; Overview ~11–15 | — | **Overview→1, Components→~2** |
| **RSC payload bytes / tab** | DevTools Network (§F) | capture | ↓ (no over-fetch) | ↓↓ (explicit cols) |
| **Mutation → visible & settled** | stopwatch (§C) | edit/create/delete | visible **instant** (optimistic), settled silently | same |
| **DB query plans** | EXPLAIN on prove-harness (§G) | capture | — | index used, no seq-scan |

Record every value in a `BASELINE.md` (and `AFTER_Pn.md`) appended to this plan dir as each phase lands.

---

## B. The standard session (the repeatable script)

Always measure the **same** click-path so before/after are comparable:

1. Hard-navigate to `/workshop/library` (cold; clear router cache: full reload).
2. Click **Components** tab. Wait for content.
3. Click **Templates** tab. Wait for content.
4. Click **Overview** tab (revisit). Wait for content.
5. Click **Components** tab again (revisit — this is the cache-hit test).
6. Open a template → editor. Wait for dock.
7. Back to Templates; edit one component's name in the Components tab (one CRUD op).

Count overlays + skeletons seen, and stopwatch steps 5 (revisit) and 7 (mutation). Step 5 is the headline SPA-feel metric: after P0 it must show **no skeleton, no overlay, instant content**.

---

## C. Tab-switch & mutation stopwatch (client instrumentation)

Add a dev-only timing probe (no shipping behavior). In the browser console or a temporary `useEffect`:

```ts
// Tab-switch: mark on click, measure on content-painted.
// Paste in console before clicking a tab:
performance.clearMarks(); performance.clearMeasures();
document.addEventListener("click", (e) => {
  const a = (e.target as HTMLElement).closest("a[href^='/workshop/library']");
  if (a) performance.mark("tab-click");
}, { capture: true, once: true });
// After content visible, in console:
performance.mark("tab-painted");
performance.measure("tab-switch", "tab-click", "tab-painted");
performance.getEntriesByName("tab-switch")[0].duration; // ms
```

For mutation latency, mark on the save click and again when the optimistic row visibly changes vs when the network settles (watch the Network panel for the server action POST + any refetch).

---

## D. Web Vitals (FCP/LCP/INP/CLS)

The repo already ships a `PerformanceMonitor` (`src/components/performance-monitor.tsx`, mounted in `providers.tsx:37`). Confirm what it logs; if it doesn't emit FCP/LCP/INP/CLS, temporarily add `web-vitals`:

```ts
import { onCLS, onINP, onLCP, onFCP, onTTFB } from "web-vitals";
[onCLS, onINP, onLCP, onFCP, onTTFB].forEach((fn) => fn(console.log));
```

Capture on cold load of each segment and after each tab switch. **CLS on Overview** is the key F4 metric — the wrong-shape skeleton should produce a visible layout-shift value at baseline that drops to ~0 after the skeleton is reshaped.

---

## E. Supabase round-trip counting

Count actual DB round-trips per load (don't infer):
- Add a temporary request-scoped counter, or use the Supabase dashboard's API logs / `pg_stat_statements` for the test window.
- Alternatively wrap `createSupabaseServerClient` in dev to log each `.from(...).select(...)` call with the route. Count per segment load:
  - **Overview baseline:** expect ~11 + up to 4 follow-ups (`02 F13`).
  - **Components baseline:** expect the 4-hop / ~10 queries + the folder ensure (`02 F8`).
- After P2 RPCs: **Overview → 1**, **Components → ~2** (graph RPC + taxonomy cache hit).

---

## F. RSC payload & bundle

- **RSC payload:** DevTools → Network → filter the `?_rsc=` / route document requests on tab nav; record transferred bytes per tab. After `select("*")` → explicit columns (`02 F9`), the Components payload should shrink measurably.
- **Bundle:** `ANALYZE=true bun run build` (or the repo's analyze script) before/after the editor eager-import change (`01 F17`) to confirm the editor chunk shrinks.

---

## G. Database query plans (gated — P2 only)

`EXPLAIN (ANALYZE, BUFFERS)` could not be run during the audit (`02 §method note`). Before any P2 DB change ships:
1. Restore DB access (refresh pooler password / use the **PG17 prove-harness** per project memory).
2. Run `get_advisors(type:"performance")` and `get_advisors(type:"security")` — confirm the `auth_rls_initplan` lint count for F15 and re-confirm no new lints after the RPC/index changes.
3. Capture `EXPLAIN (ANALYZE, BUFFERS)` for: the Overview recents query (before/after the `(workspace_id, updated_at)` index, F12); the components item scan (before/after explicit columns); a template node access decision (before/after the initplan rewrite F15 and the `workspace_id` denormalization F28).
4. **RLS initplan rewrite (F15) requires a before/after access-decision proof** — assert the same rows are visible/invisible to the same principal before and after, on the prove-harness, before applying to hosted. (Mirror the Estimates plan's RLS-rewrite gate.)

---

## H. Acceptance harness (CI-checkable)

Where possible, encode metrics as tests so regressions are caught:
- A **Playwright spec** that performs the standard session (§B) and asserts: on the Components **revisit** (step 5) no `[role="status"]` skeleton and no `[data-route-overlay]` appear, and content is present within a budget (e.g. `expect(locator).toBeVisible({ timeout: 150 })`). Extend the existing `e2e/workshop-library-routes.spec.ts`.
- This Playwright spec is mandatory before P0 exit. Attach trace/screenshots or JSON metrics, and treat "content eventually appears after a route `loading.tsx`" as a failure for the warm-revisit claim.
- A **vitest** assertion that the Overview skeleton and `LibraryOverview` render the same top-level layout regions (single column, no right rail) so F4 can't regress.
- A **count test** (unit) that the repository's overview path issues one RPC call, not 11 selects, after P2.

These belong in the per-task TDD steps in `07`.

## I. Adversarial scenario matrix (required before implementation)

The implementation cannot rely on the happy-path standard session alone. Create `AFTER_P0.md`, `AFTER_P1.md`, etc. with a scenario matrix row for each class below. Mark a class "not applicable" only with a one-line reason and the file evidence that made it inapplicable.

| Class | Scenario | Evidence |
|---|---|---|
| Normal path | Standard session steps in `06 §B` | Playwright trace or browser transcript plus overlay/skeleton counts |
| Warm-cache revisit | Components and Templates revisited within the 5-minute `staleTime` | No `[data-route-overlay]`, no segment `loading.tsx`, no manager fallback skeleton, content visible within budget |
| Stale cache | Mutate a component/template in one tab, revisit another Library route, verify cache and server data converge | `setQueryData`/`invalidateQueries` assertion plus browser proof |
| Failed mutation rollback | Force a server action rejection for create/edit/delete/move and verify optimistic state rolls back without `router.refresh()` | Vitest or Playwright failure-path proof |
| Permission boundary | Viewer principal cannot create/edit/delete components, templates, template nodes, or folders | PG prove-harness/RLS denial transcript |
| Large dataset | Synthetic large component library exercises pagination/virtualization and lazy detail graph | Prove-harness seed + browser/perf transcript |
| Dirty worktree | Work starts and ends without touching unrelated existing changes | `git status --short --branch` before/after |
| Misleading success output | Commands are treated as passing only if exit code is 0 and the expected assertion ran | Command line plus key assertion output |
| Accessibility | Tabs expose `tablist`/`tab`/`tabpanel` relationships, overlay does not hide the shell on fast tab switches, DS dialogs retain focus | Testing-library roles plus browser check |
| Form alignment | Add Component modal at 390px and 1440px preserves label/input/helper alignment, dropdown affordance padding, clear-button inset, and focus return | Playwright screenshots or DOM alignment assertions |
