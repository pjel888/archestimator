# Workshop Library Page Audit (2026-07-12)

> **Audit / readiness digest. Not an implementation plan.**
> Profile: `high-blast-radius` (cross-cutting audit: UI/UX, data, server actions,
> authz, performance, Cloudflare/Workers/D1/R2/Images/Queue). This is a
> **read-only audit** of `/workshop/library` and everything it touches. No code,
> migrations, config, or provider state was changed to produce this pack.

## Outcome (what this pack delivers)

A comprehensive, evidence-grounded audit of the `/workshop/library` surface that
**comprehends, memorizes, and analyzes everything about it** — UX/UI, data,
server, authz, performance, Cloudflare code, and bugs — so any future agent or
the owner can act on it without rediscovery:

1. **Maps every moving part** — the three library tabs (Overview, Components,
   Templates), their route/server/client boundaries, component trees, the
   repository + server-actions write layer, the four API upload routes, the
   D1/R2/Images/Queue pipeline, and the Cloudflare bindings.
2. **Classifies the surface against current source** — what is live, what is
   legacy-but-live, what is dead/duplicate, what is outdated (stale RLS/Postgres
   comments, empty taxonomy table), and what drifted from the schema.
3. **Registers concrete bugs and risks** with severity and file:line evidence —
   an authz gap, non-atomic write sequences, orphan-prone upload records, render-
   phase setState patterns, perf anti-patterns, and dead code.
4. **States readiness** for first users honestly and prioritizes the work.

This is a planning artifact only. Per the **User Test Authorization Gate**, no
tests/builds/browser automation were run or authorized for this task. All
evidence is source inspection (`rg`, targeted reads) and migration/schema
cross-reference.

## Canonical artifacts in this pack

| Artifact | Role | Purpose |
|---|---|---|
| `README.md` (this file) | entrypoint | Outcome, scope, status, resume pointer |
| `01-CURRENT-STATE-MAP.md` | audit | Full route/client/data/server/authz/perf/cloudflare map with file:line refs |
| `02-BUG-AND-RISK-REGISTER.md` | audit | Every defect/risk found, severity, evidence, recommended surface |
| `03-READINESS-AND-RECOMMENDATIONS.md` | audit | First-user readiness verdict + prioritized recommendations |
| `04-VARIANT-AND-COMPONENT-FLOW.md` | deep-dive | Component create/edit + variant/cost-entry/image/attachment round-trip + the attachment-persistence defect |
| `05-UX-UI-DESIGN-ANALYSIS.md` | deep-dive | Layout, state coverage, interaction patterns, a11y, responsive, design-system, perceived-perf, the Overview skeleton/empty-body problem |
| `06-TEMPLATES-SURFACE.md` | deep-dive | Templates browse + editor + insert-into-estimate + the stale-link blindness defect |
| `07-DOMAIN-AND-INDUSTRY-STANDARDS.md` | deep-dive | Money/float precision, UOM/content-conversion, estimate↔library link, archive lifecycle, concurrency/locking, audit-trail completeness, telemetry — the **industry-standard domain** gaps |
| `08-SCALABILITY-AND-OPERATIONS.md` | deep-dive | Search-at-scale (no FTS5), pagination/unbounded reads, observability, i18n/localization, multi-user cache staleness, bulk-op safety, data export/portability — the **startup-scalability** gaps |

No `plan-pack.json` manifest is emitted because this is an **audit-only** pack
(no implementation units, gates, or status tuple to enforce). Emitting a
manifest would imply an executable plan, which this is not. If the owner wants
these findings turned into an executable plan, a dated implementation pack is
the canonical next step (see `03` §"Turning this into implementation work").

## Scope

### In scope

- `/workshop/library` routes: `src/app/workshop/library/**` (layout + 3 tab pages
  + template-editor sub-route), each with `loading.tsx` / `error.tsx`.
- Client UI: `src/components/workshop/library/**` (overview, components route,
  templates browse, template editor, facet filter, source-trust, surface theming).
- Older-but-live library module: `src/components/workshop/component-library/**`
  (EstimateRightSidebar, helpers, tree) — consumed by the template editor +
  browse managers.
- Components surface: `src/components/workshop/component-library-manager/**`
  (folder tree, add/edit modal, the main manager).
- API upload layer: `src/app/api/component-library/**` (attachments,
  direct-upload, scan-override, images).
- Write layer: `src/lib/component-library/**` (actions, template-editor-actions).
- Read layer: `src/lib/repositories/component-library-repository.ts`.
- Upload pipeline: `src/lib/uploads/**`, `src/lib/cloudflare/upload-job-queue.ts`.
- D1 schema: `migrations/0010, 0011, 0022, 0023, 0024, 0026, 0028, 0036, 0037,
  0038` and the legacy `supabase/migrations` variant file.
- Cloudflare bindings: D1 `ARCH_DB`, R2 `ARCH_UPLOADS_R2`, Images `IMAGES`, Queue
  `UPLOAD_JOBS_QUEUE`.

### Non-goals

- Implementing any fix. This is audit-only.
- The estimate sheet itself (only the EstimateRightSidebar overlap is noted).
- Running tests, builds, browser automation, or provider audits (User Test
  Authorization Gate — not requested).
- Mutating D1, R2, Git, or any provider.

## Status snapshot (2026-07-12)

| Field | Value | Notes |
|---|---|---|
| Audit status | COMPLETE (v10 — R2 lifecycle + orphan-reaping + Images binding + queue/cron failure modes) | Full surface mapped; every claim has file:line evidence. v10 found the orphan-reaping design is structurally incapable of catching the orphans the pack identified (a new P1), the reaper never drains its backlog, DELETE routes don't reconcile DB rows, the upload-jobs DLQ has no consumer/alert; and CONFIRMED the DLQ is configured, IMAGES stores no copies (no cost leak), and poison messages are contained. |
| Bugs found | **81** distinct + ~12 dead/outdated + 5 perf + 8 investigated-absent + 14 confirmed-strong defenses = ~120 findings | **15 P1**, 40 P2, 26 P3 — see `02-BUG-AND-RISK-REGISTER.md` |
| Highest-severity open bugs | **(1)** money-as-float `estimate-row-total.ts:28-33`; **(2)** no outbound propagation on library edit/archive `actions.ts`; **(3)** bulk archive: no audit trail/referential check `actions.ts:1705-1764`; **(4)** templates eager-load query bomb `repository.ts:1291-1328`; **(5)** no live export/import `helpers.ts` + `pricing/page.tsx:14`; **(6)** direct-upload authz `direct-upload/route.ts:486-488`; **(7)** variant attachments never persisted `actions.ts:1012-1180`; **(8)** in-estimate edit local-only `EstimateSheetContent.tsx:1740-1765`; **(9)** template stale-link blindness `repository.ts:988`; **(10)** non-atomic upload writes `upload-records.ts:90-216`; **(11)** Overview skeleton/reality divergence `loading.tsx:7-61`; **(12)** AI library-create bypasses validation+quota `apply.ts:1671-1896`; **(13)** D1 FK enforcement OFF → CASCADEs inert (no `PRAGMA foreign_keys`) `wrangler.jsonc`/`worker.ts`; **(14)** XLSX leaks unit_cost to clients + formula-injection gap `create-proposal-workbook.ts:85-88,381-382` | All 14 P1 |
| Dead code items | 12 | `02` §Dead code |
| First-user readiness | **NOT READY** | The engineering surface is solid; the **domain** layer (money, links, audit) and **scalability** layer (search, pagination, export) are not first-user-ready. This is the gap an engineering-only audit misses. |

### What v3 changed (improvement provenance)

- **Added the industry-domain dimension** (`07`): money/float precision (the
  single highest-stakes risk for an *estimating* SaaS — persisted totals can
  drift between client/server/export), UOM/content-conversion (captured but never
  priced → silent mispricing), estimate↔library link (no outbound propagation),
  archive lifecycle (bulk archive writes no audit trail + no referential check),
  concurrency (version column bumped but never used as a guard → last-write-wins
  + lost audit rows), audit-trail completeness (create/update/bulk gaps), and
  telemetry (zero domain-event coverage on mutations).
- **Added the startup-scalability dimension** (`08`): search-at-scale (LIKE-based,
  no FTS5 on D1, won't scale past ~5-10k), templates eager-load query bomb
  (~300k rows worst case), observability gaps (errors lose context, repository
  untraced), i18n (currency hardcoded PHP, binary collation mis-sorts Filipino
  Ñ/Ng), multi-user cache staleness (5-min window, no realtime), and data
  export/portability (none live; pricing page overpromises).
- **Corrected** the v2 note that the components route lacked perf tracing — it IS
  traced (`LibraryComponentsRoute.tsx:30-39`); the gap is in the repository/
  actions layer, not the route.

### Coverage matrix — what the pack now covers

| Dimension | Covered in | Verdict |
|---|---|---|
| Route/server/client architecture | `01` | solid |
| API/upload authz + atomicity | `01`, `02` (P1-01/02) | 2 P1s |
| Component create/edit + variants | `04` | 2 P1s (attachments, in-estimate edit) |
| Templates browse/editor/insert | `06` | 1 P1 (stale-link) |
| UX/UI/design/a11y | `05` | 1 P1 (Overview skeleton) |
| **Money/precision (estimating-critical)** | `07` | **1 P1 (float)** |
| **Estimate↔library link integrity** | `07` | **1 P1 (no outbound)** |
| **Archive lifecycle/audit** | `07` | **1 P1 (bulk archive)** |
| **Search at scale** | `08` | 1 P2 |
| **Pagination/unbounded reads** | `08` | **1 P1 (templates bomb)** |
| **Data export/portability** | `08` | **1 P1 (none; overpromises)** |
| Concurrency/locking | `07` | 1 P2 |
| Observability/logging | `08` | 1 P2 |
| i18n/localization (PH-first) | `08` | 2 P3 |
| Multi-user cache staleness | `08` | 1 P2 |
| Performance (indexes/queries) | `02` PERF-01..05 | 5 findings |
| DB schema/integrity | `02` DATA-02/03 | documented |
| Dead/outdated code | `02` DEAD/OUTDATED | 12 items |

## One-line architecture (detail in `01-CURRENT-STATE-MAP.md`)

```
/workshop/library (layout: WorkshopRouteHeader + tabs)
├─ Overview tab      LibraryOverview (intentionally cleared) + LibraryOverviewSearch (⌘K combobox)
├─ Components tab    LibraryComponentsRoute (RSC) → ComponentLibraryManager (~2900L client)
│                    └─ LibraryFolderTree + AddComponentModal + ComponentInspectorDock + EditComponentDrawer
│                    └─ virtualized table + catalogue grid; query-cache coherence callbacks
│                    └─ variants: AddComponentModal (create) is multi-variant; EditComponentDrawer (edit) is single-variant
└─ Templates tab     TemplatesBrowsePageClient (warm TanStack cache) → TemplatesBrowseManager (~1200L)
   └─ TemplateGallery + SelectedTemplatePreview + InsertIntoEstimatePicker
   └─ /templates/[id] TemplateEditorClient (sheet + structure tree + right sidebar)

Data:
  Reads  component-library-repository.ts (workspace-scoped SELECT *, bounded vs workspace-wide paths)
  Writes component-library/actions.ts + template-editor-actions.ts (server actions, isWorkspaceEditorInD1)
  Uploads /api/component-library/{attachments,attachments/direct-upload,images,attachments/scan-override}
          → R2 (component-attachments / component-images buckets) + D1 upload_sessions/assets/events
          → UPLOAD_JOBS_QUEUE (cron) → scan → /api/internal/upload-scan

Critical round-trip contract (resolved in 04 §3):
  variant fields (sku, dims, mass, image path, etc.) persist INTO metadata_json (priceOptionSnapshot)
  and read BACK OUT of metadata_json (normalizePriceOption) — NOT as D1 columns.
```

## Resume pointer

- **Start here for bugs:** `02-BUG-AND-RISK-REGISTER.md` — sorted by severity.
- **Start here for architecture:** `01-CURRENT-STATE-MAP.md`.
- **Start here for the component/variant value stream:** `04-VARIANT-AND-COMPONENT-FLOW.md`.
- **Start here for UX/UI/design:** `05-UX-UI-DESIGN-ANALYSIS.md`.
- **Start here for templates/insert:** `06-TEMPLATES-SURFACE.md`.
- **Start here for estimating-domain risks (money/units/links/audit):** `07-DOMAIN-AND-INDUSTRY-STANDARDS.md`.
- **Start here for startup-scalability risks (search/scale/export):** `08-SCALABILITY-AND-OPERATIONS.md`.
- **Start here for "what do we do about it":** `03-READINESS-AND-RECOMMENDATIONS.md`.

## Provenance

- Audit performed: 2026-07-12.
- **v1:** lead + 3 parallel read-only lanes (UI, API + repository, DB schema).
- **v2 (improvement):** lead + 3 deep-dive lanes (variant/component flow,
  UX/UI/design, templates surface).
- **v3 (domain + scalability):** lead + 2 deep-dive lanes (industry-domain
  money/UOM/concurrency/audit/links, startup-scalability search/pagination/
  observability/i18n/cache/bulk/export); lead verified every headline claim
  against source.
- Baseline HEAD: confirm with `git rev-parse HEAD` before any fix work.
- Test decision: `NOT_REQUIRED` for this audit task (User Test Authorization
  Gate). Where a bug warrants a test, `02` records a `TEST_PROPOSAL` and waits
  for explicit owner authorization.

## Honest coverage self-assessment

No audit is exhaustive. This pack covers the dimensions below to source-evidenced
depth. Items marked ⚠ are **intentionally out of scope** or would need a
user-authorized testing/visual pass to prove — flagged for the owner, not
silently omitted.

**Covered (source-evidenced):**
- ✅ Route/server/client architecture + state management (`01`)
- ✅ API/upload authz + atomicity + path traversal + MIME sniffing (`01`, `02`)
- ✅ SQL injection (bound `?` everywhere) + formula-injection defense (`quick-add-validation.ts:58`)
- ✅ Component/variant create/edit value stream + cost-entry/image/attachment (`04`)
- ✅ Templates browse/editor/insert + stale-link gating (`06`)
- ✅ UX/UI/a11y structure (ARIA, keyboard, focus, reduced-motion gap) (`05`)
- ✅ **Money/float precision** (estimating-critical) (`07`)
- ✅ **Units of measure + content conversion** (`07`)
- ✅ **Estimate↔library bidirectional link + outbound propagation** (`07`)
- ✅ **Archive lifecycle + soft-delete + referential integrity** (`07`)
- ✅ **Concurrency / optimistic locking** (`07`)
- ✅ **Audit-trail completeness** (price/state/version history) (`07`)
- ✅ **VAT/tax handling** (export-only, hardcoded 12%, not configurable — BUG-DOM-09) (`07` §8.1)
- ✅ **Retention/retainage/progress billing** (feature absent — BUG-DOM-10, product-scope) (`07` §8.2)
- ✅ **Contingency vs adjustment semantics** (overlapping + legacy bridge — BUG-DOM-11) (`07` §8.3)
- ✅ **Cost-type separation** (partial material/labor in metadata_json, no `cost_type` enum, no equipment/subcontractor — BUG-DOM-13) (`07` §10)
- ✅ **Duplicate detection** (client-side only, server bypassable — BUG-DOM-14) (`07` §11)
- ✅ **Supplier/brand management** (tables exist, no CRUD/merge actions — BUG-DOM-15) (`07` §11)
- ✅ **Currency consistency** (projects default USD, estimates PHP, library PHP, no conversion — BUG-DOM-16) (`07` §11)
- ✅ **Change-order marketing vs model** (marketed on landing page, no backing entity — BUG-DOM-17) (`07` §11)
- ✅ **Mutation rate limiting** (absent on library actions unlike estimates/collab/publication — BUG-DOM-12) (`07` §9)
- ✅ **8 niche construction features** (bonds/liens/certified-payroll/LEED/BIM/RFIs/overhead/escalation) — investigated and recorded as **absent/deferred-future scope** (`07` §12)
- ✅ **AI-copilot (Ask Flip) ↔ library integration** — AI create bypasses validation+quota (BUG-DOM-18 P1); provenance tracked but UI-invisible + `created_by` masked (BUG-DOM-19); prompt-injection instruction-level only (BUG-DOM-20)
- ✅ **Change-order/variation modeling** — data-capture plumbing ~70% (versions/events/deltas/comparison engine), domain layer 0%; marketed on landing page (BUG-DOM-21)
- ✅ **Proposal financial model** — no profit/overhead/indirect-cost; GFA from soft JSONB; reserved-but-nonexistent redacted fields; no rounding mode (BUG-DOM-22)
- ✅ **A11y landmark/heading/⌘K depth** (beyond `05`) — no skip link, weak landmarks, duplicate `<main>` in modal (BUG-UX-05); template-editor route has no `<h1>`; zero `aria-keyshortcuts` repo-wide (BUG-UX-06); bulk-archive progress not announced (BUG-UX-07)
- ✅ **Security edge cases** (IDOR, polyglot, SSRF, mass-assignment, authz bypass) — IDOR workspace-scoping **confirmed clean on every object id** (folder/component/bulk/node/row/attachment); polyglot **neutralized** (WebP re-encode + nosniff + attachment disposition + magic-byte sniff on server-mediated route); mass-assignment **not exploitable** (privileged columns server-set); AI HITL **HMAC-enforced** server-side. New gaps filed: BUG-SEC-01 (direct-upload content-type confusion), BUG-SEC-02 (latent SSRF blocklist), BUG-SEC-03 (free-text URL field).
- ✅ **Observability depth** (structured logs, alerting, redaction, incidents, perf gate) — library actions log 0 structured errors; no alert scenarios cover library; supplier/price/URL PII not redacted (violates the project's own PII rule); incidents human-declared only; library route excluded from CI perf budget (BUG-OPS-10/11/12).
- ✅ **Estimate↔library reverse-sync** — exhaustively confirmed BUG-DOM-04 (zero outbound propagation; no cron; no resync action beyond full replace) AND found the sharper BUG-DOM-23: `link_state='source-changed'` is a read-only phantasm — the entire "Source changed" trust UX renders for a state no server code can ever write.
- ✅ **Proposal/publication export path** (XLSX formula injection + audience gate + client-portal exposure) — audience gate **confirmed robust** (server-derived, unbypassable, fail-closed); but XLSX leaks `unit_cost`/labor/misc to client audience while the portal hides them (BUG-SEC-05 P1), `notes` always leak to client XLSX but never to portal (BUG-SEC-06), and formula-injection defense is producer-side-only with most text fields unguarded.
- ✅ **Data-migration + versioning safety** — D1 FK enforcement is OFF (BUG-SEC-04 P1: every `ON DELETE CASCADE` is inert); migration 0037 is an irreversible unguarded purge (BUG-DOM-24); schema-drift broader than DATA-DRIFT-01 reported (~15 TS columns have no D1 backing, BUG-DOM-25); active D1 version table has no size cap + no immutability guard (BUG-DOM-26). **Corrected BUG-DOM-21**: the version-snapshot/delta/restore plumbing is legacy Postgres, NOT active D1.
- ✅ **`metadata_json` JSON-blob integrity** — DB enforces `json_valid`+object on all 4 tables (sound); read-hydration coercion is SAFE (no type-confusion/prototype-pollution — verified); `metadata_json` free-text does NOT reach the LLM (only numeric `laborUnitCost`). Gap: NO byte cap on `metadata_json` (inconsistent with the 64KB `draft_json` cap) — BUG-DOM-27.
- ✅ **Cloudflare Workers runtime limits** — no `[limits]` block configured; unbounded reads have no `AbortController`/deadline/iteration guard; memory (128MB) is the realistic first failure for the templates ~300k load + components "Load all" (BUG-OPS-13). Subrequests NOT binding on Paid (10k/invocation).
- ✅ **Auth/session surface** — **CONFIRMED robust**: per-action `requireCurrentUserContext` uniform across 30+ actions + 4 routes; `disableCookieCache` + `cookieCache.enabled:false` → no stale-session window, immediate revocation; membership probed per-call (no cross-request cache); Server Action CSRF origin checks NOT disabled; zero `dangerouslySetInnerHTML` in the library surface (no XSS-to-cookie-theft); AI draft HMAC token sound (`timingSafeEqual` + binding). Gaps: images-GET skips editor gate (BUG-SEC-07); direct-upload implicit gate (BUG-P1-01); cookie attrs rely on BA defaults (P3).
- ✅ **Search at scale** (LIKE vs FTS5) (`08`)
- ✅ **Pagination / unbounded reads** (`08`)
- ✅ **Observability** (perf tracing, error context, telemetry) (`07`/`08`)
- ✅ **i18n/localization** (PHP currency, Filipino collation) (`08`)
- ✅ **Multi-user cache staleness** (`08`)
- ✅ **Bulk-operation safety** (`08`)
- ✅ **Data export/portability** (`08`)
- ✅ Security headers on uploads (`X-Content-Type-Options: nosniff`), rate limiting on uploads
- ✅ **Backup/restore coverage** — D1 backup is whole-database (table-agnostic, so all library tables are covered by definition); a dedicated `generate-cloudflare-d1-component-library-proof.ts` + `check-cloudflare-d1-recovery-readiness.ts` exist in `scripts/`; `cf:d1-restore-rehearsal` is wired (`package.json:54`). Resolved from ⚠.

**Intentionally out of scope / would need authorized testing:**
- ⚠ **Rendered visual/contrast/perceived-timing proof** — source inspection cannot prove rendered contrast, real jank, or exact pixel behavior; `05` flags where a user-authorized visual QA pass would confirm severity.
- ⚠ **WCAG conformance level** — `05` assesses a11y structure (solid) but does not claim a formal AA/AAA conformance level; that requires the user-gated browser/audit pass.
- ⚠ **Construction taxonomy strategy** (CSI MasterFormat/Uniformat) — flagged as a product decision (dead `component_category_nodes`), not an engineering bug.
- ⚠ **Performance at the documented 10k/2k caps under load** — the perf budget doc only targets 1 000 items; `08` flags the gaps but load-testing is user-gated.

If the owner wants any of the ⚠ items turned into source-evidenced findings,
authorize the matching testing/visual/load surface and this pack will extend.

## Bounded completion criterion (replaces "100% quality")

> The original instruction "100% quality / all possible industry requirements"
> is asymptotic — there is always another niche construction concern
> (insurance/bonding, lien waivers, certified payroll, LEED/sustainability
> tagging, BIM integration, etc.). This pack declares completion against a
> **bounded, verifiable** bar instead, and names exactly what is accepted as
> out-of-scope vs what would re-open the audit.

**The audit pack is COMPLETE against this criterion:**

1. **All 11 P1 defects have file:line source evidence** (verified: every P1
   entry in `02` cites at least one `src/` or `migrations/` path with a line
   number) and a recommended fix surface. ✅
2. **All P2/P3 defects are filed with evidence and a recommended surface.** ✅
3. **Every dimension in the coverage matrix has been investigated to
   source-evidenced depth** (20 ✅ items above), including the estimating-domain
   layer (money, UOM, links, archive, concurrency, audit) and the
   construction-financial layer (VAT, retention, contingency). ✅
4. **The 4 residual ⚠ items are explicitly accepted as out-of-scope for a
   read-only source audit**, each with the unlock condition that would re-open
   it:
   - **Rendered visual/WCAG proof** → re-opens on owner-authorized visual QA /
     browser automation (User Test Authorization Gate).
   - **Construction taxonomy strategy (CSI/Uniformat)** → re-opens on owner
     product decision (not an engineering finding).
   - **Load-testing at 10k/2k caps** → re-opens on owner-authorized load test.
   - **Further niche industry concerns** (insurance/bonding, lien waivers,
     certified payroll, LEED, BIM, RFIs/submittals, overhead/profit/markup,
     price-escalation) → **investigated and recorded as absent/deferred-future
     scope** in `07` §12 (8 features, grep-confirmed). These belong to
     contract-administration / enterprise phases beyond the pre-launch cost-
     library surface. Re-opens only if the owner expands the audit's surface
     boundary or shifts the MVP scope to include them.

**What "complete" means here:** the pack is a faithful, evidence-grounded map of
every defect and risk discoverable by source inspection of `/workshop/library`
and its direct data/action/upload surfaces, across engineering + estimating-
domain + startup-scalability + construction-financial dimensions. It does not
claim to enumerate every hypothetical industry concern — it claims that every
concern *within the audited surface and the MVP scope* is filed, and that the
edges are honestly named.

**To re-open the audit:** authorize one of the ⚠ unlock conditions above, or
expand the surface boundary (e.g. "also audit the project-management module"),
or request a specific industry-concern investigation.
