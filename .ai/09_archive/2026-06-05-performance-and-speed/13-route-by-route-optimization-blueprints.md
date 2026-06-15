<!-- Docs-only performance planning pack. Added 2026-06-05. No application code implementation in this folder. -->

# Route-by-Route Optimization Blueprints

These blueprints convert the ranked scorecard into implementation-ready slices. Future workers should choose one blueprint per PR unless the changes are trivially linked by the same measurement proof.

## Blueprint A: Public marketing routes

**Routes:** `/`, `/about`, `/features`, `/pricing`, `/contact`, `/privacy`, `/terms`

**Likely bottlenecks:** root client providers, global CSS (`react-complex-tree`, Lenis), four global fonts, landing canvas, Lenis, consent-gated analytics scripts, restrictive cache headers.

**Primary metrics:** mobile LCP, INP, TTFB, first-load JS, long tasks.

**First proof:**

1. `ANALYZE=true bun run build` route chunk comparison.
2. Lighthouse mobile trace for `/` with consent off and on.
3. `curl -I` / `vercel httpstat` for cache/TTFB headers.
4. Speed Insights route/device p75 for public routes.

**Likely safe changes if proof supports them:**

- Move workshop-only providers out of global public path or split public/workshop shells.
- Stop loading workshop-only CSS globally if route-level import is safe.
- Lazy/idle-load landing canvas and Lenis or provide mobile/reduced-motion fallback.
- Evaluate less restrictive cache headers only for non-sensitive public marketing pages.
- Scope non-critical fonts away from first paint if visual regression review passes.

**Guardrails:**

- Cookie consent must still block GA/Clarity before consent.
- Public pages must keep CSP behavior.
- No share/invite/protected caching changes in this blueprint.
- Visual screenshots for hero/marketing pages must pass.

## Blueprint B: Auth/proxy and protected navigation

**Routes:** `/login`, `/auth/callback`, `/workshop`, `/workshop/*`

**Likely bottlenecks:** proxy auth waterfall, Supabase `getUser()`, closed-beta access lookup, protected route server data loads.

**Primary metrics:** TTFB, redirect latency, route transition readiness.

**First proof:**

1. `vercel httpstat` for public vs protected routes.
2. Hosted auth verifier where credentials are available.
3. Route transition perf scripts with auth fixture.
4. GitNexus impact analysis for any auth/proxy symbol before implementation.

**Likely safe changes if proof supports them:**

- Keep public-route fast path early return.
- Improve public marketing cache policy without touching protected routes.
- Add server timing/log attribution around protected route data loads if safe.
- Only consider closed-beta lookup caching with explicit security review.

**Non-negotiables:**

- Do not replace `supabase.auth.getUser()` with `getSession()` in proxy auth.
- Do not weaken closed-beta allowlist logic.
- Do not cache personalized/protected responses.

## Blueprint C: Workshop dashboard/library/template routes

**Routes:** `/workshop`, `/workshop/projects`, `/workshop/library`, `/workshop/templates`, `/workshop/components`

**Likely bottlenecks:** repository query fan-out, component/template history loads, chart data loads, client bundle shared by workshop shell.

**Primary metrics:** TTFB, route transition, query count, payload size.

**First proof:**

1. Route query inventory from repository calls.
2. Supabase EXPLAIN/provider logs for slow reads.
3. `bun run test:e2e:perf` and `bun run perf:check-routes`.
4. Bundle analyzer for workshop chunks.

**Likely safe changes if proof supports them:**

- Narrow selects and payload size.
- Add explicit pagination/limits where UX supports it.
- Consolidate proven fan-out only after RLS tests.
- Lazy-load chart/library/history-only panels if bundle/profiler evidence supports it.

**Guardrails:**

- RLS and role checks must pass.
- Library/template version history cannot silently disappear.
- Closed-beta entry and workshop navigation must remain intact.

## Blueprint D: Estimate workspace and large-sheet editing

**Routes:** estimate sheet/project node routes under workshop.

**Likely bottlenecks:** large `EstimateSheetContent`, `EstimateSheetTree`, modal/panel co-location, pointer-move collaboration broadcasts, DnD/tree rerenders.

**Primary metrics:** INP, React render duration, route-transition peak load, heap, interaction latency.

**First proof:**

1. Large seeded estimate fixture.
2. React Profiler interactions: select node, edit cost, drag tree row, open history, open proposal preview, use context menu.
3. `bun run perf:profile-peak-load`.
4. DOM/vitest coverage for touched UI.

**Likely safe changes if proof supports them:**

- Lazy-load heavy modals/panels that are not needed at first interaction.
- Stabilize props/callbacks only where profiler shows render churn.
- Throttle collaboration cursor broadcasting if pointer events are a measurable bottleneck.
- Consider tree virtualization/windowing only after DnD/accessibility guardrails are explicit.

**Guardrails:**

- Cost input editing, blur commit, keyboard navigation, DnD, context menus, search, version control, proposal preview, and collaboration cursors must all pass focused tests.
- Do not introduce generic memoization without profiler evidence.

## Blueprint E: Public share and publication APIs

**Routes:** `/share/[token]`, `/api/share/[token]/*`

**Likely bottlenecks:** force-dynamic page, password/session checks, publication snapshot load, analytics/event writes, activity/comment/decision API fan-out.

**Primary metrics:** TTFB, API latency, security correctness.

**First proof:**

1. Redacted share route `httpstat`.
2. API latency/query-count harness for activity/comment/decision flows.
3. Publication tests for password/session/security behavior.
4. Response headers: no-store and security headers.

**Likely safe changes if proof supports them:**

- Tighten pagination/cursors.
- Consolidate recipient display-name lookup only with RLS/security proof.
- Defer non-critical analytics/event work only if semantics remain correct.

**Non-negotiables:**

- No CDN/browser caching of tokenized or password/session-sensitive responses.
- No raw token/recipient/password values in analytics, docs, or evidence files.

## Blueprint F: Proposal export

**Routes:** XLSX proposal export API.

**Likely bottlenecks:** synchronous ExcelJS workbook generation, tree load limits, buffer memory, hosted function runtime.

**Primary metrics:** latency, memory, success/error shape, timeout rate.

**First proof:**

1. `scripts/benchmark-proposal-workbook.ts` representative fixture.
2. `bun run launch:verify-hosted-export` where hosted env is available.
3. Existing proposal export route/workbook tests.

**Likely safe changes if proof supports them:**

- Optimize workbook generation hot spots.
- Preserve server-only ExcelJS import.
- Consider streaming/async export only if benchmark exceeds accepted latency/memory budgets.

**Guardrails:**

- Generated workbook content and filename behavior must remain identical.
- Large-estimate 413 limits must stay intentional and documented.
