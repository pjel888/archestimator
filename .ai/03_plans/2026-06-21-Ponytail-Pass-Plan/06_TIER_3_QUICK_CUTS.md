# 06 — Tier 3 Quick Cuts

**Date:** 2026-06-21 · **Last audited:** 2026-06-24 (see `16_AUDIT_LOG_2026-06-24.md`) · **Status:** PLANNING / READINESS ONLY (with drift corrections)

Small over-engineering fixes that don't require owner decisions. Each is a contained edit with a clear verification gate. Execute in Wave 2 (see `07_IMPLEMENTATION_WAVES.md`).

## T3.1 — Remove `src/components/landing/index.ts` barrel

> **⚠️ 2026-06-24 AUDIT:** Barrel still exists but **shrunk from 27 LOC to 8 LOC** — it now re-exports only 8 items (`CookieConsentBanner`, `LandingFooter`, `LandingHeader`, `PublicPageShell`, `ContactForm`, `ClarityScript`, `LandingAnalyticsLoader`, `ABExperimentProvider`). Importer count grew from 7 to **8 source importers**. The barrel is smaller and more focused post-landing-v3 refactor; cut value is reduced but the pattern is still present.

**What:** 8-line pure re-export file (was 27-line at 2026-06-21). Ponytail: "boilerplate nobody asked for."

**Blast radius:**
- Importers: **8 source files** as of 2026-06-24 (was 7 at plan date).
- Update each to direct file import (e.g., `from "@/components/landing/HeroSection"`), then delete the barrel.

**Action:**
```bash
# Pre-check
rg "from ['\"]@/components/landing['\"]" src
# Update the 7 source importers to direct imports, then remove the barrel.

bun run type-check && bun run build
```

**Gate:** `type-check` exit 0, `build` exit 0, no broken imports.

**Risk:** Low — barrel removal just updates import paths. If any importer is missed, `type-check` catches it.

**LOC delta:** −27.

## T3.2 — Remove `src/lib/activity/index.ts` barrel

**What:** 6-line pure re-export file. Same pattern as T3.1.

**Blast radius:**
- Importers: 4 source files (`src/lib/publication/actions.ts`, `src/lib/repositories/project-activity-repository.ts`, `src/app/api/share/[token]/activity/route.ts`, `src/components/workshop/estimate-sheet/activity-history.tsx`) plus 8 tests/fixtures under `tests/vitest/`.

**Action:** Same pattern as T3.1.

**Gate:** Same as T3.1.

**Risk:** Low.

**LOC delta:** −6.

## T3.3 — Fix empty catches in `ProjectEstimatesTable.tsx:99-121`

> **✅ FIXED (2026-06-24 audit).** File-wide `rg "catch\s*\([^)]*\)\s*\{\s*\}"` returns **0 empty catch blocks**. The cited lines 99-121 now contain type definitions and virtualization constants — the localStorage wrappers with empty catches were refactored (likely via reducer consolidation in commits `b3c57c1d`, `372f514a`, or React Doctor cleanup `577dad5f`). **No further action required.** Section retained as historical record.

**What (historical):** localStorage read/write wrappers with empty `catch` blocks (lines 99-121 at 2026-06-21). Ponytail: **data-loss handling is never on the chopping block.** Empty `catch` blocks swallow errors that could lose user data.

**Blast radius:** 1 file (`ProjectEstimatesTable.tsx`). The wrappers are local to the file.

**Action options:**
- **Option A (handle):** Log the error + return a fallback value. The wrapper stays but the error surfaces.
- **Option B (drop the wrapper):** Use `localStorage` directly with a single `try/catch` at each call site. The error is handled at the point of use.

**Recommended:** Option B — ponytail prefers fewer lines. The wrapper adds indirection without value if the error is just going to be logged at the call site anyway.

**Action (Option B):**
```typescript
// Before:
function readPrefs(): Prefs | null {
  try {
    return JSON.parse(localStorage.getItem("estimator-prefs") ?? "null");
  } catch (e) {}  // ponytail: empty catch swallows data-loss error
}

// After:
// (delete the wrapper; at each call site:)
try {
  const prefs = JSON.parse(localStorage.getItem("estimator-prefs") ?? "null");
} catch (e) {
  console.warn("estimator-prefs parse failed", e);
  // fallback to defaults
}
```

**Gate:**
```bash
bun run type-check
bun run test:dom   # run tests covering ProjectEstimatesTable
bun run build
# Add a test that throws in localStorage and verify the error surfaces
```

**Risk:** Low — preference storage, not critical path. But the error must be handled, not swallowed.

**LOC delta:** ~−15 (wrapper removed) → ~+5 (inline try/catch at call sites).

## T3.4 — Remove `as unknown as` cast in `reusable-sources/actions.ts:192-217`

> **⚠️ 2026-06-24 AUDIT:** Pattern still present but **moved from line 192-217 to line 207**. A **second cast appeared at line 434** (`source_root_node_id: (input.source.nodeId ?? null) as unknown as string`). File total is 451 LOC. The ponytail action (replace with typed guard) still applies; update line references and address both casts when executing.

**What:** `supabase as unknown as` cast wrapping one optional tab query. Ponytail: **no `as any` / cast escapes.** Plus a second cast at line 434 (new since 2026-06-21).

**Blast radius:** 1 file (`reusable-sources/actions.ts`). The cast wraps a specific optional query.

**Action:** Replace the cast with a typed helper or a simpler branch. If the query is optional, guard with `if (query)`.

**Action:**
```typescript
// Before:
const result = await (supabase as unknown as TypedClient).from("optional_tab").select("*");

// After:
if (!query) return null;  // guard the optional path
const result = await supabase.from("optional_tab").select("*");
// (if the type mismatch is real, fix the type at the source, not with a cast)
```

**Gate:**
```bash
bun run type-check
bun run test:dom   # run tests covering reusable-sources actions
bun run build
# Verify the optional query still handles null/undefined
```

**Risk:** Low — optional path. But the cast removal must not change runtime behavior. Test with the optional tab absent.

**LOC delta:** ~−5 (cast removed) → ~+3 (typed guard).

## T3.5 — Replace hand-rolled HTML stripping in `sanitize-recipient-text.ts` (TRUST BOUNDARY)

**What:** Hand-rolled HTML stripping/entity decoding for share recipient text. Ponytail: **stdlib / native platform feature.** This code runs from route handlers, so browser-only `DOMParser` is not available; use a server-safe sanitizer path.

**Blast radius:** 1 file (`sanitize-recipient-text.ts`). But the function is called on **trust-boundary input** (share recipient text from users). Ponytail explicitly preserves trust-boundary validation. The swap must be at least as robust as the hand-rolled version.

**Action:** Replace with a server-safe sanitizer: configured DOMPurify with a server DOM implementation (`jsdom`) or an isomorphic sanitizer package. Do not use raw browser `DOMParser` in these route-handler paths.

**Action (DOMPurify):**
```bash
bun add dompurify
bun add -d @types/dompurify
# jsdom already exists in package.json; reuse it for the server DOM.
```

```typescript
// Before: hand-rolled entity decoding + tag stripping (fragile)
// After:
import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";

const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);

export function sanitizeRecipientText(input: string): string {
  // ponytail: trust-boundary input — DOMPurify is sanitizer-grade
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}
```

**Gate (HEAVY — trust boundary):**
```bash
bun run type-check
bun run test:dom -- project-publication-comments project-publication-decision share/recipient-content-escaping
bun run build

# XSS payload test suite — verify all stripped:
# - "<script>alert('xss')</script>"
# - "<img src=x onerror=alert('xss')>"
# - "javascript:alert('xss')"
# - "<svg onload=alert('xss')>"
# - "&lt;script&gt;alert('xss')&lt;/script&gt;" (encoded)
# - "<SCRIPT>alert('xss')</SCRIPT>" (case-variant)
# - "<scr<script>ipt>alert('xss')</script>" (nested)
```

**Risk:** Medium-high — trust-boundary input. If the swap is weaker than the hand-rolled version, XSS is possible via share recipient text. **Test with OWASP XSS payload list.** If any payload is not stripped, revert and use DOMPurify (not DOMParser).

**LOC delta:** ~−24 (hand-rolled logic) → ~+5 (DOMPurify call). +1 dep (`dompurify`).

**Note:** Adding `dompurify` is justified here because this is a trust-boundary sanitizer used by route handlers; reuse existing `jsdom` rather than adding a second DOM implementation. Ponytail's ladder rung 4 (installed dep) applies — but no existing sanitizer dependency does this. A browser-only parser is not implementation-ready for this path.

## Additional quick cuts (from second-pass codebase re-pass — VALIDATED, Agent C 3h31m)

### T3.6 Repeated auth/rate-limit boilerplate in `collaboration/actions.ts:466`

- **Pattern:** Invite flows repeat the same access + rate-limit gate sequence 4 times.
- **Ponytail action:** Extract shared `assertInviteAccess` / `rateLimitInvite` helper. One PR.
- **Risk:** Low — shared helper, no behavior change.
- **LOC delta:** ~−30.

### T3.7 Repeated RBAC/limiter boilerplate in `publication/actions.ts:1205`

> **⚠️ 2026-06-24 AUDIT:** `assertProjectPublicationManager` occurrence count **grew from 7 to 10**. The extraction value increased proportionally. Line 1205 reference should be re-verified before execution (file grew from ~1538 to 1637 LOC).

- **Pattern:** `assertProjectPublicationManager` appears **10 times** as of 2026-06-24 (was 7 at 2026-06-21).
- **Ponytail action:** Extract shared `assertPublicationAccess` helper. (Overlaps with T2.6 mega-file strategy.)
- **Risk:** Low — but publication actions is a Tier 2 mega-file. Diff-by-diff.
- **LOC delta:** ~−40.

### T3.8 Over-fixture'd Storybook stories

- **Pattern:** `src/stories/domain/share/receiver-states.stories.tsx:19` — 400+ lines of static snapshot data, more fixture harness than story. `src/stories/domain/workshop/modal-patterns.stories.tsx:19` — oversized mini-app-style modal fixture.
- **Ponytail action:** Trim to minimum viable fixtures. Move static data to a shared `fixtures/` file.
- **Risk:** Low — Storybook is a review surface, not production.
- **LOC delta:** ~−300 (combined).

### T3.9 Registry-like bridges with one consumer

- **Pattern:** `src/components/workshop/use-estimate-header-actions-store.ts:19` — singleton register/clear bridge, one real register site, 2 consumers. `src/lib/collaboration/realtime-telemetry.ts:30` — sink registry exists but no sink is registered in src (dormant).
- **Ponytail ask:** "Does this need to exist? One consumer — inline it."
- **Ponytail action:** Inline the header-actions bridge. Remove the dormant telemetry sink (or re-evaluate if telemetry is planned for closed beta).
- **Risk:** Low — 2 consumers for header-actions; 0 for telemetry sink.
- **LOC delta:** ~−50.

### T3.10 Trivial hook wrapper

- **Pattern:** `src/hooks/use-is-hydrated.ts:23` — tiny wrapper around `useSyncExternalStore` (1-line hook).
- **Ponytail ask:** "One line? Make it one line. Does the wrapper earn its keep?"
- **Ponytail action:** Inline `useSyncExternalStore` at the call site, OR keep the hook for name clarity (`useIsHydrated` is self-documenting).
- **Risk:** Low — either way, no behavior change. Don't cut if the name IS the value.
- **LOC delta:** ~−10 (or 0 if kept).

### T3.11 Duplicate date formatting

- **Pattern:** `src/components/workshop/ProjectDashboardClient.tsx:52` — `formatDate` duplicated across workshop, share, and dashboard surfaces.
- **Ponytail action:** Extract one shared `formatDate` helper in `src/lib/ui/` or `src/lib/workshop/`. Update callers.
- **Risk:** Low — pure function, no side effects.
- **LOC delta:** ~−15 net.

### T3.12 Duplicate query-string parsing

- **Pattern:** `src/components/workshop/project-data/ProjectDataClient.tsx:42` — `URLSearchParams` parsing is duplicated. Same pattern in `ComponentLibraryManager.tsx`.
- **Ponytail action:** Extract shared `parseUrlParams` or `useSearchParam` helper. The parsing logic is what's duplicated, not the API.
- **Risk:** Low — pure function.
- **LOC delta:** ~−10.

### T3.13 Hand-rolled debounce in two hooks — NOT YET a cut

- **Pattern:** `src/hooks/use-prefetch-on-hover.ts:24` — hand-rolled debounce timer. Similar logic in `use-estimate-cursor-broadcast.ts`.
- **Ponytail ruling:** "Don't build a utility until 3+ callers." Only 2 callers. Keep inline. Add `ponytail:` comment noting: "// ponytail: setTimeout is the debounce; extract shared when 3+ callers need it."
- **LOC delta:** 0 (no action yet).

### T3.14 API routes with zero client callers — EVALUATE, DON'T AUTO-CUT

- **Finding:** 5 routes with no src client callers:
  - `src/app/api/health/route.ts:7` — health check, ops-only → **keep** (infrastructure)
  - `src/app/api/webhooks/resend/route.ts:18` — webhook-only → **keep** (infrastructure)
  - `src/app/api/share/[token]/events/route.ts:17` — server telemetry → verify indirect access; if unused, cut
  - `src/app/api/share/[token]/unsubscribe/route.ts:54` — email/server-only → verify indirect access; if unused, cut
  - `src/app/api/share/[token]/route.ts:18` — public snapshot API → verify indirect access; if unused, cut
- **Ponytail ask:** "Does this need to exist?" Health + webhook: yes. Share routes: verify before cutting.
- **Risk:** Low (health/webhook — expected to have no client callers) to Medium (share routes — may be reachable via server-to-server calls or email links).
- **LOC delta:** 0 (keep health + webhook; evaluate share routes with owner).
- **Public-share route contract:** before deleting or simplifying any `src/app/api/share/[token]/*` route, prove valid/invalid/expired/revoked token behavior, password/recipient requirements, no-store/cache headers, rate limits, body validation, anonymous write limits for events/comments/decisions, unsubscribe token authority, and email/server indirect callers. See `14_SECURITY_AND_NETWORK_CONTRACTS.md`.

## Execution order

These quick cuts are independent only after their listed security/test preconditions are met. Execute in separate commits:

1. T3.1, T3.2 (barrels) — fastest, lowest risk
2. T3.3 (empty catches) — needs a test
3. T3.4 (cast removal) — needs a targeted test
4. T3.5 (HTML stripping) — needs XSS payload suite + DOMPurify dep
5. T3.6-T3.7 — security-sensitive helper extraction; use the invariant checklist in `14_SECURITY_AND_NETWORK_CONTRACTS.md`
6. T3.8-T3.13 — validated backlog quick cuts; each needs the file/test/rollback row in `07_IMPLEMENTATION_WAVES.md`
7. T3.14 — evaluate only; never auto-cut public share routes from client-caller absence

T3.5 is the highest-risk quick cut because it's a trust boundary. Don't rush it.

## What NOT to cut

These are NOT quick cuts — they're Tier 2 (mega-files) or Tier 4 (leave alone):

- Anything in `src/components/workshop/EstimateSheetContent.tsx` (Tier 2 — diff-by-diff only)
- Anything in `src/lib/supabase/types.ts` (Tier 4 — generated)
- Anything in `supabase/migrations/*` (Tier 4 — schema source of truth)
- Test files (Tier 4 — ponytail preserves tests)
- `.agents/`, `.claude/`, `.github/` skill scripts (Tier 4 — third-party)
