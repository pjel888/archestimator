# BENCHMARK PROTOCOL — Route Transition Performance

**Status:** Pre-implementation measurement protocol  
**Date:** 2026-05-30  
**Rule:** Do NOT proceed to Phase 1 without baseline data.

---

## Pre-Flight Checks (Before ANY Measurement)

```bash
# Verify clean build state
bun run build          # Must pass
bun run validate       # Must pass

# Verify proxy.ts is running
# Open Chrome DevTools → Network → any page request
# Check response headers for custom headers set by proxy
# OR add temporary console.log to proxy.ts

# Verify Supabase local stack
npx supabase status    # Must show running
```

---

## Scenario 1: Build Output & Bundle Sizes

**Command:**
```bash
bun run build 2>&1 | tee baseline-build.txt
```

**Record for each route:**
| Route | First Load JS (KB) | First Load JS (gzip) | Chunks |
|-------|-------------------|---------------------|--------|
| `/` | ___ KB | ___ KB | ___ |
| `/workshop` | ___ KB | ___ KB | ___ |
| `/workshop/projects` | ___ KB | ___ KB | ___ |
| `/workshop/projects/[projectId]` | ___ KB | ___ KB | ___ |
| `/workshop/projects/[projectId]/estimates` | ___ KB | ___ KB | ___ |
| `/workshop/projects/[projectId]/estimates/[nodeId]` | ___ KB | ___ KB | ___ |
| `/workshop/projects/[projectId]/charts` | ___ KB | ___ KB | ___ |
| `/workshop/library` | ___ KB | ___ KB | ___ |
| `/workshop/templates` | ___ KB | ___ KB | ___ |
| `/workshop/settings` | ___ KB | ___ KB | ___ |
| `/login` | ___ KB | ___ KB | ___ |
| `/share/[token]` | ___ KB | ___ KB | ___ |

**Optional bundle analyzer:**
```bash
npx @next/bundle-analyzer  # if installed
# OR
ANALYZE=true bun run build  # if @next/bundle-analyzer installed
```

---

## Scenario 2: Cold Navigation Timing (No Cache, No Prefetch)

**Setup:**
1. Open Chrome incognito window
2. Open DevTools → Performance tab
3. Network: "Fast 3G" throttling
4. CPU: No throttling (baseline) AND "4x slowdown" (stress test)

**Measure (record 3 runs, take median):**

| Navigation Path | Click→Visible (ms) | Click→Interactive (ms) | Overlay Visible? | Notes |
|----------------|-------------------|----------------------|------------------|-------|
| `/` (landing) → load | ___ | ___ | ___ | |
| `/workshop` → load | ___ | ___ | ___ | |
| `/workshop` → `/workshop/projects` | ___ | ___ | ___ | |
| `/workshop/projects` → `/workshop/projects/[id]` | ___ | ___ | ___ | Use a seeded project |
| Project detail → Estimates list | ___ | ___ | ___ | |
| Estimates → Estimate workspace | ___ | ___ | ___ | |
| Estimates → Charts | ___ | ___ | ___ | |
| `/workshop` → `/workshop/library` | ___ | ___ | ___ | |
| `/workshop` → `/workshop/templates` | ___ | ___ | ___ | |
| `/workshop` → `/workshop/settings` | ___ | ___ | ___ | |
| Non-authed → `/workshop/projects` | ___ | ___ | ___ | Should show redirect |

**Target after optimization:** Cold transitions < 200ms (with skeleton), < 500ms (estimate workspace with skeleton).

---

## Scenario 3: Warm Navigation Timing (With Cache)

**Setup:**
1. Same Chrome incognito window
2. Visit each route once (prime cache)
3. Navigate away, then back

**Measure:**

| Navigation Path | Click→Visible (ms) | Overlay Visible? | Cache Source |
|----------------|-------------------|------------------|-------------|
| Revisit `/workshop/projects` | ___ | ___ | RSC cache |
| Revisit `/workshop/library` | ___ | ___ | RSC cache |
| Revisit estimate workspace | ___ | ___ | React Query cache |
| Revisit within 5 min (staleTime) | ___ | ___ | React Query cache |

**Target after optimization:** Warm transitions < 50ms. No overlay.

---

## Scenario 4: bfcache Back/Forward Navigation

**Setup:**
1. Chrome DevTools → Application → Back/forward cache → "Test back/forward cache"
2. Navigate: `/workshop/projects` → project detail → estimate workspace
3. Press Back twice

**Measure:**

| Action | Restore Time (ms) | Overlay Visible? | bfcache Hit? |
|--------|-------------------|------------------|-------------|
| Back 1: Estimate → Project detail | ___ | ___ | ✅/❌ |
| Back 2: Project detail → Projects | ___ | ___ | ✅/❌ |

**Target:** < 50ms restore time. No overlay. `pageshow.persisted === true`.

---

## Scenario 5: Overlay Visibility Rate

**Setup:**
1. Normal browsing: navigate between 10 workshop pages
2. Record how many show the overlay

**Measure:**

| Navigation # | From → To | Overlay Visible? | Duration (ms) |
|-------------|-----------|------------------|---------------|
| 1 | | ✅/❌ | ___ |
| 2 | | ✅/❌ | ___ |
| ... | | | |
| 10 | | ✅/❌ | ___ |

**Overlay rate:** ___ / 10 = ___%

**Target after optimization:** < 20% of navigations show overlay (eventually < 5%).

---

## Scenario 6: Peak-Load Performance

**Setup:**
1. Seed test data: 50 projects, 30 estimates each, 200 rows per estimate
2. Run: `bun run scripts/seed-performance-test-data.ts` (create if not exists)

**Measure:**

| Route | Items | Load Time (ms) | Scroll Jank? | Notes |
|-------|-------|---------------|-------------|-------|
| Projects list | 50 cards | ___ | ___ | |
| Estimates list | 30 sheets | ___ | ___ | |
| Estimate workspace | 200 rows | ___ | ___ | |
| Library | 500 items | ___ | ___ | |

---

## Scenario 7: Slow Network (3G Fallback)

**Setup:**
1. Chrome DevTools → Network → "Slow 3G" throttling
2. Navigate through all routes

**Measure:**

| Navigation | Skeleton Visible? | Overlay Visible? | Total Load (ms) | Acceptable? |
|-----------|-------------------|------------------|-----------------|-------------|
| Landing → Workshop | ___ | ___ | ___ | ___ |
| Projects → Estimate workspace | ___ | ___ | ___ | ___ |

**Target:** Skeleton within 100ms. Overlay within 300ms. Full content within 3s.

---

## Scenario 8: Manual Browser Tests

| Test | Steps | Expected | Pass/Fail |
|------|-------|----------|-----------|
| Auth redirect | Visit `/workshop/projects` while logged out | Redirect to `/login?next=...` | |
| OAuth callback | Login via Google OAuth | Redirect to `/workshop` | |
| Invite flow | Visit `/invite/[token]` | Accept invite, join workspace | |
| Share route | Visit `/share/[token]` | View shared estimate | |
| bfcache restore | Back button after multi-page nav | Instant restore, no overlay | |
| Keyboard nav | Tab through sidebar, Enter to navigate | Works, no visual glitches | |
| Screen reader | Navigate with VoiceOver/NVDA | "Loading page" announced when overlay shows | |

---

## Baseline Metrics Table (Fill After Measurement)

| Metric | Current Value | Target | Phase |
|--------|-------------|--------|-------|
| Landing page First Load JS | ___ KB | < 150 KB | P4 |
| Workshop First Load JS | ___ KB | < 150 KB | P4 |
| Cold transition (median) | ___ ms | < 200 ms | P3 |
| Warm transition (median) | ___ ms | < 50 ms | P1 |
| bfcache restore time | ___ ms | < 50 ms | P1 |
| Overlay visibility rate | ___ % | < 20% (event. < 5%) | P1 |
| Estimate workspace cold load | ___ ms | < 500 ms (with skeleton) | P3 |
| Lighthouse Performance (workshop) | ___ | ≥ 90 | P7 |
| CLS | ___ | < 0.1 | P1 |

---

## Go/No-Go Checklist

Before proceeding to Phase 1 implementation:

- [ ] `bun run build` passes
- [ ] `bun run validate` passes
- [ ] Baseline metrics table is COMPLETELY filled
- [ ] All 8 benchmark scenarios executed
- [ ] bfcache verified working in Chrome DevTools
- [ ] proxy.ts verified running (check request flow)
- [ ] Owner approves Phase 1 scope
- [ ] Branch created: `feat/route-transition-perf`

**Rule: Do not proceed if baseline is incomplete.**
