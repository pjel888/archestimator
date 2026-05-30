# Collaboration & Sharing Audit

**Date:** 2026-05-30
**Status:** Analysis complete. 16 documents written. No code changes made.

This folder contains a comprehensive audit of Archestimator's two sharing features, plus cross-cutting security, performance, acceptance criteria, and implementation prompts.

---

## Cross-Cutting Documents

| File | Purpose |
|------|---------|
| `00-executive-brief-and-north-star.md` | High-level assessment, feature distinction, quality bar, phase overview, quick wins |
| `05-security-threat-model-and-hardening.md` | 9 threat vectors, rate limiting matrix (10 endpoints), token lifecycle, cookie policy, audit event matrix (22 events), fail-closed config |
| `06-performance-and-observability-plan.md` | 15 recommended indexes, query optimization, rate limiter storage architecture, caching strategy, 14 observability metrics, 7 alerting thresholds |
| `07-implementation-acceptance-criteria.md` | Every roadmap item as testable acceptance criteria with objective, files, behaviour, security, UX, performance, and tests |
| `08-codebase-ai-implementation-prompts.md` | 10 self-contained prompt blocks for coding agents, one per phase, with context, prerequisites, and acceptance checks |

---

## Feature 1: Collaboration Invites (Team Access)

| File | Purpose |
|------|---------|
| `collaboration-invite/01-current-inventory.md` | Complete code-level catalog: every route, component, server action, lib module, DB table, RPC, env var, test |
| `collaboration-invite/02-feature-gap-analysis.md` | **33** ranked gaps (3 critical, 12 high, 9 medium, 8 low) — **updated** to include security/rate-limiting gaps |
| `collaboration-invite/03-ux-paths-and-happy-paths.md` | 7 user journeys with surface maps, error states, and friction points |
| `collaboration-invite/04-prioritized-improvement-roadmap.md` | P0–P4 phased plan with code snippets and blast radius |
| `collaboration-invite/appendix-ux-signifiers-and-visibility.md` | 3-perspective signifier audit across all UI surfaces |

### Key Findings
- **System is non-functional** in its current configuration
- 3 critical gaps; **12 high** (up from 6 — added 4 security/rate-limiting + 2 acceptance-flow gaps)
- The auto-grant trigger was deliberately disabled; the custom `/invite/[token]` is the only acceptance path but it's also disabled
- No rate limiting on any invite endpoint; GET-based acceptance mutation risk

---

## Feature 2: Shared Link (View-Only Client Publication)

| File | Purpose |
|------|---------|
| `shared-link/01-current-inventory.md` | Complete code-level catalog: all routes, components, hooks, lib modules, DB tables, security layers, tests |
| `shared-link/02-feature-gap-analysis.md` | **34** ranked gaps (0 critical, 5 high, **12** medium, 17 low) — **updated** to include rate-limiting and audit gaps |
| `shared-link/03-ux-paths-and-happy-paths.md` | 6 user journeys with surface maps, error states, and friction points |
| `shared-link/04-prioritized-improvement-roadmap.md` | P0–P4 phased plan with code snippets and blast radius |
| `shared-link/appendix-industry-comparison.md` | Feature-by-feature comparison against Dropbox, Google Drive, Figma, Notion |
| `shared-link/appendix-technical-analysis.md` | Full architecture: publish flow, view flow, session flow, security model, crypto layer, 10 known issues |

### Key Findings
- **System is functional** — works end-to-end with Resend, CSP, rate limiting, crypto
- 0 critical gaps; 5 high gaps (below industry baseline)
- **New identified gaps:** in-memory rate limiters not durable; public APIs unthrottled; missing audit events for publication lifecycle

---

## Overall Assessment

| Dimension | Collaboration Invites | Shared Link |
|-----------|----------------------|-------------|
| Functional? | ❌ Broken (config) | ✅ Works end-to-end |
| Security | ⚠️ Good crypto, no rate limiting | ✅ Excellent crypto, partial rate limiting |
| Email delivery | ❌ Missing provider config | ✅ Resend with circuit breaker |
| UX signifiers | ❌ Almost none | ⚠️ Missing card badges + activity indicators |
| Industry parity | ❌ Far below | ⚠️ Close, missing visibility features |
| Audit trail | ⚠️ Partial (RPC-only) | ⚠️ Partial (opens only) |
| Rate limiting | ❌ None | ⚠️ In-memory (not durable) |
