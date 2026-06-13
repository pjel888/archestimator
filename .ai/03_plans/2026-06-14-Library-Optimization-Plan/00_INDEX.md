# Workshop Library — Comprehensive Audit & Optimization Plan

**Route audited:** `/workshop/library` (+ `/components`, `/templates`, `/templates/[templateId]`)
**Live URL:** http://localhost:3000/workshop/library
**Date:** 2026-06-14
**Type:** Multi-discipline audit + implementation-ready plan (no code changed during planning)
**Status:** ✅ IMPLEMENTED (2026-06-14) on branch `2026-06-14-Library-Optimization-Plan` — P0 (felt-latency) + P1 + P3 (app guards/headers/a11y/error-sanitization/quota) shipped with TDD + type-check + design-lint + full DOM suite green; P2 DB scaling-cliff authored as ready, owner-gated migrations (Q4: not applied to hosted). See `BASELINE.md`, `AFTER_P0/P1/P3.md`, `migrations/`. Deferred-with-rationale: T5 `dynamic()` split (measurement-gated), T12 explicit columns + T14 pagination (pair with the gated P2 RPCs), browser/Playwright + PG17 prove-harness gates (require the owner's authed Chrome session / DB approval).
**Branch:** `2026-06-14-Library-Optimization-Plan` (merged to main)

---

## Why this exists

The user reports the Library feature is "so slow and has loading pages all over — it doesn't feel like a react app." This package answers, with `file:line` evidence across five disciplines (rendering, database, UX/UI, client-state, infosec), **why** that is true, **how to measure it objectively**, and **exactly what to change** — sequenced by felt-impact × risk — to the point where the loading screens are gone and tab switches feel instant.

This is a **planning artifact**. No application code was modified. Every claim below is grounded in a file and line that was read during the audit.

**Important standard:** "100% bug free" is not a claim this plan can honestly guarantee. The executable target is **zero known bugs at handoff**: every changed behavior has a failing-first proof, a measured before/after delta, an adversarial/manual scenario, rollback notes, and a final review that actively tries to falsify the implementation. See `09_PREIMPLEMENTATION_GAP_REVIEW.md`.

---

## The single most important finding (read this first)

The Library is a **tabbed surface built as four separate server route segments** (`/workshop/library`, `/components`, `/templates`, `/templates/[templateId]`), each with its own `loading.tsx`. On top of that sits a **global full-screen blur + spinner overlay** that fires on *every* internal link click and *every* `router.refresh()`, held for a **250 ms minimum**. The felt slowness is **not data volume** — the live workspace has only **154 components, 3 templates, 10 template nodes** (see `02 §Data volume`). It is **three structural defects** that make routine in-app interactions look like full page reloads:

1. **Global blur+spinner overlay fires on every tab click and every mutation refresh.** `NavigationListener` attaches a `document`-level click handler that calls `show(href)` for any internal `<a>` (`src/components/navigation-listener.tsx:38`); `useNavigationRouter` fires it on `push`/`replace`/`refresh` (`src/hooks/use-navigation-router.ts:15,21,27`); the overlay is a full-viewport `bg-white/25 backdrop-blur-md` portal (`src/components/ui/route-loading-overlay.tsx:40`) with a **250 ms floor** (`src/stores/navigation-ui-store.ts:12,46`). Library tabs are `<Link>`s (`LibraryTabsLayoutClient.tsx:50` → `tab-strip.tsx`), so every tab click blurs the whole app. → `01`, `03`.
2. **Tabs are server routes, not client state, and ignore the cache that already exists.** TanStack Query is wired app-wide with a 5-minute `staleTime` (`src/app/providers.tsx:13-27`) but **only the template-editor dock uses it** (`TemplateEditorClient.tsx:121`). The three browse tabs fetch server-side and re-fetch + re-skeleton from scratch on every revisit. A cache seed alone is not enough if the server route still blocks before the client manager mounts; the implementation must either return a client shell immediately or convert the Library tabs to client panels with URL sync before claiming "no revisit skeleton." → `01`, `04`, `09`.
3. **Stacked, mismatched skeletons.** A tab click shows: the blur overlay → the segment `loading.tsx` → (often) a `dynamic()` import fallback → content — 2–3 loading states per tab. The Overview skeleton is the *wrong shape* (grid + right-rail) for its single-column content (`library/loading.tsx:6-21` vs `LibraryOverview.tsx:230-298`), and Templates shows **three** different skeleton shapes in sequence. → `03`.

The database work (a 4-hop serial waterfall, `select("*")` over-fetch of JSONB, a 685-row folder mirror provisioned on the read path, missing `(workspace_id, updated_at)` index, bare `auth.uid()` RLS) is a **scaling cliff and a correctness/over-fetch problem** — invisible at 154 rows today, linear-blowup at thousands. It belongs in the plan and is cheap to fix, but **it is not the cause of today's felt latency.** Sequencing by "most architecturally wrong" would fix the invisible problem first; this plan sequences by **felt-impact**, then closes the cliff.

> ⚠️ **Do not resurrect the `suppressOverlay` flag** (removed as flawed, obs 4623). The correct fix is to scope *what triggers* the overlay and lower the floor — not a per-call opt-out flag. See `07 §P0-1`.

---

## Document map

| Doc | Contents |
|-----|----------|
| `00_INDEX.md` | This file — executive summary, consolidated findings, doc map, acceptance gate |
| `01_AUDIT_RENDERING_AND_WATERFALL.md` | Route-as-tab architecture, per-segment server waterfall, RSC payloads, navigation overlay, prefetch, streaming, round-trip counts |
| `02_AUDIT_DATABASE.md` | Schema, index inventory, the 4-hop components waterfall, over-fetch, aggregation RPC design, RLS cost, data volume, scaling cliff |
| `03_AUDIT_UX_UI.md` | Loading-state inventory, skeleton-flash count, per-operation CRUD UX, CLS/jank, a11y, empty/error states |
| `04_AUDIT_CLIENT_DATA_AND_STATE.md` | TanStack Query usage gap, per-tab fetch model, mutation/optimistic patterns, the SPA-feel unlock |
| `05_AUDIT_INFOSEC.md` | Severity-ranked authZ / data-exposure / headers / rate-limit findings; what RLS already protects |
| `06_MEASUREMENT_METHODOLOGY.md` | How to measure everything: TTFB, FCP/LCP/INP, tab-switch stopwatch, RSC payload, Supabase round-trips, EXPLAIN, repeatable before/after harness, acceptance thresholds |
| `07_IMPLEMENTATION_PLAN.md` | Bite-sized TDD task plan, sequenced P0→P3, exact files, code, commands, expected output |
| `08_DECISIONS_AND_OPEN_QUESTIONS.md` | Resolved design decisions + the 4 owner calls required before/within implementation |
| `09_PREIMPLEMENTATION_GAP_REVIEW.md` | New gap review: missing bug angles, readiness blockers, adversarial scenarios, and added gates before work starts |

---

## Consolidated findings

Severity legend: 🔴 felt-latency / live issue · 🟠 scaling-cliff / security-gap / architecture · 🟡 hardening / polish / a11y.

| # | Finding | Sev | Dimension | Doc |
|---|---------|-----|-----------|-----|
| F1 | Global blur+spinner overlay fires on every internal `<a>` click (incl. tab `<Link>`s) | 🔴 | Rendering/UX | 01,03 |
| F2 | 250 ms `MIN_DISPLAY_MS` floor pads even prefetched/instant navigations | 🔴 | UX | 03 |
| F3 | Tabs are separate server segments → every click = route transition + server fetch + `loading.tsx`; no client cache | 🔴 | Rendering/Client | 01,04 |
| F4 | Overview `loading.tsx` is grid+right-rail; `LibraryOverview` is a single column → wrong-shape flash / CLS | 🔴 | UX | 03 |
| F5 | Stacked skeletons per tab: overlay → route `loading.tsx` → `dynamic()` fallback → content (Templates shows 3 shapes) | 🔴 | UX | 03 |
| F6 | TanStack Query wired app-wide but browse tabs don't use it → re-fetch + re-skeleton every revisit | 🔴 | Client | 04 |
| F7 | `router.refresh()` after optimistic mutation re-fires the overlay + re-runs the whole server segment | 🔴 | Client/UX | 04,03 |
| F8 | Components tab = 4-hop serial waterfall, 10 unbounded queries | 🟠 | DB | 02 |
| F9 | `select("*")` ships JSONB (`metadata`, `variant_metadata`, `image_metadata`, `source_snapshot`) + unused columns | 🟠 | DB/Infosec | 02,05 |
| F10 | `ensureWorkspaceLibraryFolders` provisions a 685-row 1:1 folder mirror on the read path | 🟠 | DB | 02 |
| F11 | Global 685-node taxonomy fetched in full + tree-built in JS on every Components load | 🟠 | DB | 02 |
| F12 | Missing `(workspace_id, updated_at)` index for Overview recents/last-update | 🟠 | DB | 02 |
| F13 | `getLibraryOverview` = 11 parallel + up to 4 follow-up queries; 6 re-scans of one table | 🟠 | DB | 02 |
| F14 | JS-side aggregation (template counts/distinct, discontinued-in-use) that belongs in SQL | 🟡 | DB | 02 |
| F15 | RLS helpers (`is_workspace_member`/`_admin`) use bare `auth.uid()` — no initplan caching | 🟠 | DB/Infosec | 02,05 |
| F16 | No pagination anywhere → unbounded fetch of items × price/version/history graph (scaling cliff) | 🟠 | DB | 02 |
| F17 | Template editor double-fetches: server `getEstimateTemplateById` then client `useQuery` of full library; heavy eager imports | 🟠 | Rendering/Client | 01,04 |
| F18 | `ensureDefaultWorkspace` not `cache()`-wrapped → re-runs its DB queries on every navigation | 🟠 | Rendering/DB | 01 |
| F19 | Workspace `viewer` role can still mutate templates and component child tables; app-layer guards are incomplete | 🟠 | Infosec | 05 |
| F20 | No security headers on `/workshop/*` (no CSP, X-Frame-Options, nosniff, Referrer-Policy) | 🟠 | Infosec | 05 |
| F21 | Insert-into-estimate: 3 sequential server resolves, no optimistic feedback | 🟠 | UX | 03 |
| F22 | Template editor uses native `window.prompt`/`window.confirm` for node add/rename/delete | 🟡 | UX | 03 |
| F23 | Overview "Add component" CTA navigates cross-route instead of opening the add modal | 🟡 | UX | 03 |
| F24 | No rate-limit / quota on template & component creation | 🟡 | Infosec | 05 |
| F25 | Raw Supabase/Postgres `error.message` interpolated into thrown action errors → reaches client | 🟡 | Infosec | 05 |
| F26 | Overlay sets `aria-hidden` on the whole shell for ≥250 ms on every nav | 🟡 | UX/a11y | 03 |
| F27 | Tab strip `idBase` unused → tabs lack `aria-controls`; content isn't a labeled `tabpanel` | 🟡 | UX/a11y | 03 |
| F28 | Template node/row RLS does a per-row correlated `EXISTS` join (denormalize `workspace_id`) | 🟡 | DB | 02 |
| F29 | Template-editor autosave `router.refresh()` per edit re-serializes the whole tree | 🟡 | Client | 04 |

**Not a problem (verified clean — do not spend fix effort here):** `<Link>` prefetch is on (the architecture is *capable* of fast nav; the overlay masks it); `getCurrentUserContext` is `React.cache()`-deduped; read-path fetches are well-parallelized (`Promise.all`); the shared layout is preserved across sibling tab nav; **optimistic UI with rollback already exists** in all three managers (only the trailing `router.refresh()` spoils it); error boundaries exist on all four segments; heavy clients are code-split; skeletons have correct `role="status"`/`aria-label`; cross-workspace **BOLA/BFLA is closed** (workspace id is caller-derived, never client-supplied, double-bound + RLS); `getUser()` (not `getSession()`) used everywhere; upload routes validate magic bytes + scope storage paths; CSRF covered by Next server-action framework. Templates and their indexes are well-modeled. **Volume is not the bottleneck today.**

---

## What "done" looks like (acceptance gate → `06` + `07`)

- A repeatable measurement harness produces **baseline** and **after** numbers for: TTFB per segment, FCP/LCP/INP, a **tab-switch stopwatch** (click → content painted), **skeleton-flash count** per standard session, RSC payload bytes, Supabase round-trips per load, and a "mutation → visible & settled" stopwatch.
- **P0 ships in two gates:** P0a removes the global overlay flash, removes refresh-triggered blur, and reshapes the Overview skeleton. P0b proves the tab architecture can actually avoid route-level revisit skeletons by using an immediate client shell or client-side tab panels with URL sync. **Target: skeleton-flash count for the standard session drops from ~8 to ≤1 (first cold load only); if a server-route `loading.tsx` still appears on a warm revisit, P0b is not done.**
- **P1 ships:** the template-editor double-fetch is removed (library passed as prop / shared cache); `ensureDefaultWorkspace` is `cache()`-wrapped; insert-into-estimate is optimistic; native `prompt`/`confirm` replaced with DS dialogs.
- **P2 ships:** one `get_library_overview` RPC + one `get_component_library_graph` RPC replace the 11-query overview and the 4-hop components waterfall; `select("*")` → explicit columns; `(workspace_id, updated_at)` index added; taxonomy cached + folders seeded out-of-band; components list paginated/virtualized; RLS initplan caching applied — each verified by EXPLAIN before/after on the PG17 prove-harness.
- **P3 ships:** editor mutations gated on `is_workspace_editor` (+ RLS split), `/workshop` security headers (Report-Only CSP first), creation rate-limit, generic action errors, tab/panel a11y wiring.
- **Every change has a failing-test-first step and a measured delta** against the `06` baseline.
- **Every gate in `09` is closed or explicitly deferred with evidence.** In particular, no implementation unit may claim "done" from unit tests alone; the relevant browser, DB, CLI, or Playwright surface must be exercised and recorded in `AFTER_Pn.md`.
