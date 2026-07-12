# 18 — Performance Budget & Dependency Audit

> Round-9 framework check. Covers two authorization-free industry-standard
> frameworks the prior rounds missed: **dependency CVE scanning (OWASP A06)**
> and **Core Web Vitals / performance-budget coverage**. Both are canonical
> startup-readiness requirements, and both are runnable without owner
> authorization.

## 1. Dependency CVE scan (OWASP A06) — CLOSED, clean

**Command run (authorization-free, read-only advisory):**
```
$ bun audit
bun audit v1.3.14 (d1632b29)
No vulnerabilities found
```

**Result:** `bun audit` against `bun.lock` (399 KB) returns **zero vulnerabilities**.

**This closes P3-12 / OWASP A06** with real evidence — I had incorrectly classified `bun audit` as `TEST_TASK`-gated for 2 rounds. It is a read-only advisory scan against the lockfile, not a test-suite execution, so it is not User-Test-Authorization-Gate-scoped. **A06 is PASS.**

**Caveat (honest):** `bun audit` checks the Bun/npm advisory database at run time; it does not replace a full SCA tool (Snyk/OSV/Dependabot) or license scan. For beta this is sufficient; for Enterprise, wire `dependabot`/`osv-scanner` into CI.

## 2. Performance-budget framework — GAP found

The project has a canonical performance-budget framework:
`.ai/01_roadmap/27-performance-budget-and-regression-gates.md`. It defines:

- **Web Vitals targets:** LCP < 2.5s (Beta) / < 2.0s (Enterprise); INP/CLS implied.
- **Per-route bundle/LCP budgets** (table at `:64-70`).
- **A CI perf gate:** `bun run test:e2e:perf` + `scripts/check-route-transition-readiness.ts` (`perf:check-routes`).

### P2-18 · `/workshop/proposals` is NOT in the route-budget table (`PERF`, round 9)
- **Evidence:** `.ai/01_roadmap/27-performance-budget-and-regression-gates.md:64-70` lists budgets for `/` and `/login` only. **No `/workshop/*` route has a budget row.** The CI perf gate (`e2e/route-transition-performance.spec.ts`) covers route *transitions* but its budgets are "loose (multi-second medians)" and "authenticated scenarios skip in CI without dev-auth/storage-state secrets" (`:231`).
- **Impact:** there is no enforced performance budget for the proposals route. A regression that doubles its bundle or adds a 3s blocking fetch would not be caught by the CI gate (which skips authed routes), and has no numeric budget to breach. For a startup preparing for first users, an unbounded perf regression on a core workflow route is a real readiness gap.
- **Severity:** P2. The route is currently small (4 route files + a lean client tree, no heavy deps — confirmed in `10` §1), so there's no *live* regression, but there's no *guard*.
- **Recommended surface:** add `/workshop/proposals` to the route-budget table with a concrete target (e.g. Main Bundle < 80KB gz, LCP < 2.5s authed), and wire the authed-perf scenario into the CI gate (or accept the skip with a documented manual-check cadence).

### P3-13 · No route-segment config on `/workshop/proposals` (`PERF`, round 9)
- **Evidence:** `rg "export const" src/app/workshop/proposals/*.tsx` → none. No `dynamic`, `revalidate`, `fetchCache`, or `runtime` directive.
- **Impact:** the route is implicitly dynamic (correct for authed), but the *intent* is undocumented in code. A future contributor could accidentally make it static or add a long `revalidate` that serves stale authed data. Explicit `export const dynamic = "force-dynamic"` would document the security-correct intent and prevent accidental caching.
- **Severity:** P3 (documentation/guardrail; no live bug).
- **Recommended surface:** add `export const dynamic = "force-dynamic"` and a short comment to `src/app/workshop/proposals/proposals-data.tsx` documenting *why* (cookies/headers/D1 read = always dynamic).

### P3-14 · No bundle-size CI budget (`PERF`, round 9)
- **Evidence:** `.ai/01_roadmap/27-performance-budget-and-regression-gates.md:231` explicitly notes: *"No bundle-size CI budget (size-limit/bundlewatch) exists."*
- **Severity:** P3 (the roadmap already tracks this as deferred; not proposals-specific).
- **Recommended surface:** wire `size-limit` or `bundlewatch` into CI with per-route chunk budgets. Cross-app effort.

## 3. Performance posture summary (proposals route)

| Dimension | Status | Evidence |
|---|---|---|
| Bundle size | GOOD (small, no heavy deps) | `10` §1: 4 route files, lean client tree, no `dynamic()` needed at current size |
| Server-action code-splitting | GOOD | Next.js 16 ships only action ID, not module body (`10` §1.2) |
| Render strategy | CORRECT | Implicitly dynamic (cookies/headers); Suspense shell + skeleton |
| TanStack Query config | APPROPRIATE | `staleTime 30s`, `refetchOnWindowFocus`, `retry:false` (DEC-AUTO-008) |
| Route-segment config | MISSING (P3-13) | no `export const dynamic` |
| Enforced perf budget | MISSING (P2-18) | route not in budget table; CI gate skips authed |
| Bundle CI budget | MISSING (P3-14) | roadmap-tracked, cross-app |
| Dependency CVEs | CLEAN | `bun audit` = 0 vulnerabilities (A06 PASS) |

## 4. What this round adds to the register

| ID | Bug | Severity | Framework |
|---|---|---|---|
| **P2-18** | `/workshop/proposals` not in route-budget table; no enforced perf guard | P2 | Web Vitals / perf budget |
| **P3-13** | No route-segment `dynamic` config (intent undocumented) | P3 | Next.js perf/convention |
| **P3-14** | No bundle-size CI budget (roadmap-tracked) | P3 | Bundle perf |
| ~~P3-12~~ | ~~A06 vulnerable-components scan~~ | **CLOSED** | `bun audit` clean |

**A06 is now PASS** (was the only OWASP category I'd left unchecked). The dependency surface is clean.

## 5. Framework-coverage status (the "all industry-standard requirements" bar)

After rounds 7-9, the frameworks the objective demands are now covered:

| Framework | Artifact | Status |
|---|---|---|
| OWASP Top 10 (2021) | `17` | 10/10 categories checked (A06 now PASS via `bun audit`) |
| RFC email-auth (SPF/DKIM/DMARC) | P0-1 in `02` | CHECKED — found P0 (Namecheap/Cloudflare mismatch) |
| WCAG 2.2 AA | `14` | heuristic-eval done; runtime contrast/focus TEST_TASK-gated |
| RICS NRM 1/2 (construction BOQ) | `08` | covered; 2 beta-recommended content gaps |
| ESIGN/UETA/eIDAS/RA 8792/RA 9184 | `08` | covered; consent-disclosure gap |
| Core Web Vitals / perf budget | `18` | CHECKED — found P2-18/P3-13/P3-14 |
| SaaS recipient-portal patterns | `08` §4 | covered |
| Dependency CVE scan | `18` §1 | `bun audit` clean |

The **only** frameworks that remain categorically outside authorization-free reach are **runtime Lighthouse** (needs a running dev server + browser), **penetration testing** (needs expertise + `TEST_TASK`), and **counsel/QS review** (human authorities). Everything checkable by reading code/config/DNS/lockfile is now checked.
