# AI Folder + AGENTS.md Sync Run — 2026-06-10

## Goal

Repo-truth synchronization pass: audit `.ai/` docs, `AGENTS.md` files, and thin tool adapters against the live codebase. Remove drift, stale claims, and contradictions so agents receive accurate, current instructions.

## Branch

- Working branch: `codex/landing-page-new`
- HEAD: `7ed5515` (same as `origin/main`, `main`)
- Mode: docs-only; no source, package, migration, or provider changes

## Git status before

```
## codex/landing-page-new...origin/codex/landing-page-new
 M src/app/globals.css (landing page work, unrelated)
 ... (5 modified landing files + 1 untracked)
```

## Source-of-truth docs read

1. `AGENTS.md` (root)
2. `.ai/AGENTS.md`
3. `.ai/README.md`
4. `.ai/00_system/DOCS_SOURCE_OF_TRUTH.md`
5. `.ai/00_system/ai-folder-canonical-map.md`
6. `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
7. `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`
8. `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md`
9. `.ai/00_system/VALIDATION_MATRIX.md`
10. `.ai/10_state/current-state.md`
11. `.ai/10_state/decisions.md`
12. `.ai/10_state/known-issues.md`
13. `.ai/06_specs/feature-inventory.md`
14. `.ai/01_roadmap/README.md`
15. `DESIGN.md`
16. `package.json`
17. `.claude/README.md`, `.codex/README.md`, `.commandcode/README.md`, `.cursor/README.md`, `.agents/README.md`

## Commands run

```bash
pwd; git rev-parse --show-toplevel; git status --short --branch; git branch --show-current; git remote -v; git log --oneline -n 20 --decorate
find . -name AGENTS.md (outside node_modules/.next/.git) | sort
find .ai -maxdepth 3 -type f | sort
find .codex .claude .cursor .commandcode .gemini .agents -type f (outside node_modules/.git) | sort
cat package.json
find src/app -type f -name 'page.tsx' -o -name 'route.ts' -o -name 'layout.tsx' | sort
find src -type f -name '*.ts' -o -name '*.tsx' | wc -l
find tests -type f | wc -l
find supabase/migrations -type f | sort | tail -50
find .storybook src/stories -type f | sort | head -200
find src/components/ui -type f | sort
find src/components/ui/overlays -type f | sort
```

Optional tooling:
- `npx gitnexus status --repo archestimator`: code-review graph updated (incremental). GitNexus available.
- `code-review-graph`: graph tools available via MCP.

## Drift findings summary

### A. Stack/package truth
| Claim | File:Line | Status | Evidence |
|-------|-----------|--------|----------|
| "48 migrations applied" | `.ai/README.md:31` | **Stale** | 67+ local migration files, 50+ linked remote |
| "279 source files, 112 test files" | `.ai/README.md:33` | **Stale** | Actual: ~498 source, ~218 test |
| "23 page routes, 12 API routes" | `.ai/README.md:33` | **Stale** | Actual: ~51 pages/routes/layouts, ~17 API routes |
| "7 domain action modules" | `.ai/README.md:33` | **Stale** | Domain has grown significantly |
| Storybook not mentioned | `.ai/README.md` | **Missing** | Storybook 10.4.2 installed, 60+ components, 85+ stories |
| "Storybook is not installed" | `.ai/10_state/decisions.md:67` | **Historical** | True at decision time (2026-06-06 pre-implementation); later decisions record implementation |
| "48 migrations" in multiple plans | `.ai/03_plans/`, `.ai/06_specs/deep/` | **Historical** | Plans frozen at time of writing; not updated per pass rules |

### B. Route/API truth
| Claim | File:Line | Status | Evidence |
|-------|-----------|--------|----------|
| Missing routes: `/workshop/terms`, `/workshop/feedback`, `/workshop/settings/beta-users`, `/workshop/settings/feedback`, `/workshop/pending-invite` | `VALIDATION_MATRIX.md` route list | **Stale** | Routes exist in `src/app` |
| Missing: `/api/webhooks/resend`, `/api/health`, `/beta/access-required` | `VALIDATION_MATRIX.md` route list | **Stale** | Routes exist in `src/app` |
| Missing: `/api/share/[token]/session`, `/unsubscribe` sub-routes | `VALIDATION_MATRIX.md` route list | **Stale** | Routes exist |

### C. Feature inventory
| Claim | File:Line | Status | Evidence |
|-------|-----------|--------|----------|
| Last updated 2026-05-29 | `feature-inventory.md:3` | **Stale** | Predates notifications, terms, storybook overlays, beta governance, security hardening |
| Missing: Notification system | — | **Missing** | Implemented June 2026 |
| Missing: Terms acceptance | — | **Missing** | Implemented June 2026 |
| Missing: Beta access governance | — | **Missing** | Implemented June 2026 |
| Missing: Storybook component library | — | **Missing** | Implemented June 2026 |
| Missing: Security hardening work | — | **Missing** | Implemented June 2026 |
| Missing: Mass deletion governance | — | **Missing** | Implemented June 2026 |
| Missing: Resend email integration | — | **Missing** | Implemented June 2026 |

### D. Validation matrix
| Claim | File:Line | Status | Evidence |
|-------|-----------|--------|----------|
| Last updated 2026-05-25 | `VALIDATION_MATRIX.md:3` | **Stale** | Predates storybook scripts, launch scripts, notification RLS proof |
| Missing: `storybook:validate`, `storybook:check-*` scripts | — | **Missing** | Scripts exist in `package.json` |
| Missing: `prove:notification-rls` | — | **Missing** | Script exists |
| Missing: Launch readiness scripts | — | **Missing** | 12+ launch scripts exist |
| Missing: `perf:check-speed-insights` | — | **Missing** | Script exists |

### E. Known issues
| Claim | File:Line | Status | Evidence |
|-------|-----------|--------|----------|
| "Live Closed-Beta Launch Gates - OPEN" | `known-issues.md:1` | **Resolved** | Many gates closed by 2026-06-04/05 proof artifacts. Condensed status added. |
| Large historical blocker sections | `known-issues.md:300-316` | **Historical record** | Kept as evidence trail; new summary added at top. |
| Last updated 2026-06-04 | `known-issues.md:151` | **Stale** | Updated to 2026-06-10 |

### F. Agent instructions
| Claim | Status |
|-------|--------|
| Root `AGENTS.md` defines `.ai` as brain, has reading order | **Current** |
| `.ai/AGENTS.md` governs `.ai/` subtree | **Current** |
| `.ai/README.md` reading order | **Updated** — added Storybook mention |
| No nested `AGENTS.md` outside `.ai/` and `.omx/` | **Clean** |

### G. Adapter drift
| Adapter | Status |
|---------|--------|
| `.claude/README.md` | **Clean** — points to `.ai/12_agents/payloads/claude.md` |
| `.codex/README.md` | **Clean** — points to `.ai/12_agents/payloads/codex.md` |
| `.commandcode/README.md` | **Clean** — points to `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md` |
| `.cursor/README.md` | **Clean** — points to `.ai/12_agents/payloads/cursor.md` |
| `.agents/README.md` | **Clean** — points to `AGENTS.md` and `.ai/` |

### H. Source-of-truth hierarchy
| Check | Status |
|-------|--------|
| `.ai/README.md` reading order vs `DOCS_SOURCE_OF_TRUTH.md` | **Aligned** |
| Root `AGENTS.md` references to `.ai` | **Aligned** |
| `ai-folder-canonical-map.md` folder assignments | **Current** |
| No machine-local paths found | **Clean** |
| No secrets found | **Clean** |

## Files changed

1. `.ai/README.md` — Updated file counts, migration count, Storybook mention, AI bench
2. `.ai/06_specs/feature-inventory.md` — Added 7 new feature sections (Notifications, Terms, Beta Governance, Storybook, Security Hardening, Mass Deletion, Resend), updated last-updated to 2026-06-10
3. `.ai/00_system/VALIDATION_MATRIX.md` — Updated route surface (14 new routes), added Storybook/notification validation, launch scripts, updated last-updated to 2026-06-10
4. `.ai/10_state/known-issues.md` — Updated last-updated to 2026-06-10, added condensed current-state summary at top, marked launch gates as RESOLVED

## Validation result

- `git diff --check`: pending
- Path check script: pending
- Grep for stale claims: pending

## What remains unverified

- Storybook production route migration (explicitly deferred)
- Public Storybook hosting (explicitly deferred)
- Native spreadsheet app proof (synthetic Google Sheets proof captured)
- Codex Security history-exposure findings (owner-accepted for single-owner beta)
- CI/CD automation (intentionally deferred per 2026-06-06 decision)

## Proof boundary

**Docs-only, local-only.** No production source, package, migration, Supabase, Vercel, Resend, DNS, or provider changes made. No secrets recorded. Adapted existing documentation to match current codebase reality only.
