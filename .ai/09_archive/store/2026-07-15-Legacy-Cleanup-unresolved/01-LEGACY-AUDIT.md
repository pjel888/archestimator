# Repository-Wide Legacy Audit

## Method and Confidence Rules

This audit combined repository-wide source/reference scans, package/config inspection, Git history, GitNexus query/context/impact analysis, Code Review Graph dead-code and large-file scans, active D1 migration inspection, read-only Vercel project readback, and independent Vercel/Supabase domain audits.

Static dead-code output was treated as candidate generation, not proof. Next.js route entrypoints, middleware/OpenNext adapters, tests, scripts, archived evidence, and externally callable public APIs require separate interpretation. A candidate is `DELETE_NOW` only when current production references are absent and its remaining dependents are test-only, stale tooling, or generated artifacts that can be removed coherently.

Line references are observations from 2026-07-15 and are stale if any listed source, route, provider binding, migration, or plan changes.

## A. Source and Runtime Candidates

| ID | Candidate and evidence | Current dependents | Disposition | Risk / confidence |
|---|---|---|---|---|
| `LC-001` | `src/components/share/SharePageSummaryCard.tsx:1`; current share layout uses the newer hero/overview/financial components. GitNexus impact: one direct caller, `tests/vitest/share/share-summary-card.test.tsx`, zero processes. | Test-only component suite plus historical `.ai` references. | `DELETE_NOW`: delete component and its orphan component-only test; preserve historical documents. | Low / high. |
| `LC-002` | `src/components/workshop/publisher/PublisherProjectMembersPanel.tsx:1` is only a re-export alias of `ProjectMembersAccessPanel`. No production import exists. | `publisher-access-mode.test.tsx` imports the alias; two source-text tests assert the shim exists. | `DELETE_WITH_CALLER_UPDATE`: retarget behavior coverage to `ProjectMembersAccessPanel` and remove compatibility-text assertions. | Low / high. |
| `LC-003` | `EXPRESS_COMPONENTS_FLAG` and `isExpressComponentsAuthoringEnabled` at `src/lib/estimates/express-components.ts:62,78-85` have no production caller. GitNexus impact found one test caller and zero processes. | `tests/vitest/express-components.test.ts` only. | `DELETE_WITH_CALLER_UPDATE`: remove helper/constant and their test-only cases. | Low / high. |
| `LC-004` | `CLIENT_PORTAL_LEGACY_COMPATIBILITY` at `src/lib/client-portal/contracts.ts:159-166` has zero incoming references in source or GitNexus. | None. | `DELETE_NOW`. This descriptive constant is not the live migration corridor. | Low / high. |
| `LC-005` | Ten handlers under `src/app/api/client-portal/[token]/**` duplicate the public Client Portal surface. Current `ClientPortalShell` and related UI fetch `/api/share/[token]/**`; the legacy `session` proxy maps to canonical `/verify`, not `/session`. | No in-repo client fetch; external API callers are unknown. | `PROVE_DEMAND_THEN_DELETE`: decide each method independently from a source-contract matrix plus a complete unsampled 30-day request window. Missing hostnames, retention, or access forces `RETAIN`. | High / medium. |
| `LC-006` | Legacy recipient query parameter support at `src/app/share/[token]/page.tsx:184-187` and `src/app/api/share/[token]/unsubscribe/route.ts:45-52`; canonical issuance uses `recipient`. `shared_link_recipients` stores token hashes, not historical URL-format provenance. | Previously issued `?rt=` links may exist outside the repo and cannot be enumerated safely from D1. | `RETAIN_ACTIVE` for this pack. A future retirement needs an authoritative issuance cutoff/provenance source plus complete demand proof; raw URLs are never exported for cleanup evidence. | High / high on code, medium on demand. |
| `LC-007` | `legacy-migration-actions.ts`, `legacy-migration-service.ts`, `usePublisherDrawer.ts`, and `PublisherDrawer.tsx` expose apply/verify/rollback for legacy publications. | Active Publisher UI and D1 publication data; current service writes `verified` but does not complete the entire cutover/issuance-shutdown corridor. | `RETAIN_ACTIVE`. Do not turn repository cleanup into a hosted migration/observation program; a future dedicated cutover pack must own issuance shutdown, state transitions, rollback, and release proof. | Critical / high. |
| `LC-008` | `client_portal_legacy_mappings` begins at `migrations/0068_client_portal_foundation.sql:419`; later rollout/write-freeze migrations are `0070_client_portal_legacy_migration_rollout.sql` and `0071_client_portal_legacy_write_freeze.sql`. Public reads join the mapping and legacy writes can return `LEGACY_WRITE_FROZEN`. | Legacy public tokens, migration verification, rollback, comments, decisions, recipients, and history. | `RETAIN_ACTIVE` / `RETAIN_EVIDENCE`. Keep schema, joins, branches, and applied lineage while `LC-007` remains active; no forward retirement migration belongs in this pack. | Critical / high. |
| `LC-009` | `src/lib/auth/auth-provider-selection.ts:1-15` accepts `better-auth`, `cloudflare-better-auth`, and `d1-better-auth`; canonical provisioning writes `better-auth`. | Hosted secret values are not safely readable through current tooling, and an alias may still be configured. | `RETAIN_ACTIVE`. The aliases are low-cost and auth-critical; do not mutate secrets or add a configuration-debug endpoint merely to remove them. | High / high on code, unknown environment state. |
| `LC-010` | `wrangler.auth-callback-normalizer.jsonc` routes `archestimator.com` through `cloudflare/auth-callback-normalizer.ts` and forwards via `ARCH_APP` to `archestimator-proof`. Read-only Cloudflare readback on 2026-07-15 confirmed that active zone routes still front all apex/`www` traffic with this Worker even though the deployed main Worker contains corresponding OAuth state-reset handling. | Active custom-domain OAuth callback routing; the current fronted path does not prove independent main-Worker callback behavior. | `RETAIN_ACTIVE`; the owner conditionally authorizes removal only after a controlled direct-main-Worker Google OAuth and `state_mismatch` recovery proof with rollback readiness. | Critical / high. |
| `LC-011` | `LEGACY_BLANK_ROW_MATERIAL` / `LEGACY_BLANK_ROW_TAG` at `express-components.ts:65-66,262-263` are still read; `actions.ts:1833` strips the tag during updates. Activity history has a parallel label/tag contract. | Existing D1 rows and immutable history projections may contain either marker. | `RETAIN_ACTIVE`. Aggregate counts may quantify the boundary, but this pack does not rewrite live rows or historical JSON and therefore cannot safely remove the readers. | High / high. |
| `LC-012` | Current row/template/package paths still fall back from `adjustmentPercentage` to historical `contingencyPercentage`, including `d1-action-client.ts:400`, `estimate-row-tree-patch.ts:143`, and package-builder draft/apply paths. | Relational row/template columns are non-null, but immutable snapshots, templates, AI package drafts, projections, imports, and exports can omit the canonical field. | `RETAIN_ACTIVE`. Do not backfill issued Client Portal content or immutable historical shapes merely to remove a small decoder fallback. | High / high. |
| `LC-013` | `src/middleware.ts` can look deprecated under current Next.js conventions, but the OpenNext adapter still treats it as an active entrypoint. | Runtime routing. | `FALSE_POSITIVE`; retain. | Critical if deleted / high. |
| `LC-014` | Large files such as `d1-action-client.ts`, `workspace-repository.ts`, `component-library/actions.ts`, `estimates/actions.ts`, and the component-library UI index. | Broad current processes. | Not legacy cleanup. Record as decomposition debt only; require a separate refactor plan and symbol-level impact analysis. | High / high. |

## B. Tooling, Config, and Tracked Artifact Candidates

| ID | Candidate and evidence | Current dependents | Disposition | Risk / confidence |
|---|---|---|---|---|
| `LC-015` | `package.json:109` aliases `lint:font-size` to `lint:design-system`; `scripts/enforce-app-font-size.mjs` only imports the canonical script. | No caller beyond the package alias. | `DELETE_NOW`: remove alias and wrapper. | Low / high. |
| `LC-016` | Root `enable-leaked-password-protection.sh` only prompts for a Supabase token and executes the archived helper under `.ai/09_archive/...`. | No current caller; historical helper remains archived. | `DELETE_NOW`: delete root executable, retain archived evidence. | Low / high. |
| `LC-017` | `scripts/shot-glass-newdesign.mjs` and `scripts/shot-glass-crops.mjs` inject an old WebBridge-extracted Supabase session and fixed June project IDs. | Their generated June screenshots only. | `DELETE_NOW`: delete scripts and exact generated outputs listed below; retain unrelated/current design evidence. | Low / high. |
| `LC-018` | `.playwright-mcp/` contains 53 tracked raw June console/YAML captures (about 752 KiB). Only `eslint.config.mjs` ignores it. | No source/docs consumer. | `DELETE_NOW` atomically; remove the now-useless ESLint ignore. | Low / high. |
| `LC-019` | Root `=` is a tracked empty file; `test-table.tsx` imports `DataTable` but only prints `OK`. | None. | `DELETE_NOW`. | Low / high. |
| `LC-020` | Root screenshots `save-design-full.png`, `v10-full-1440.png`, `v10-final-full-1440.png`, `v10-mobile-375.png`, `v10-hero-1440.png`, `v10-final-hero.png`, and `intercom-hero.png` have no non-`.ai` filename references. | The owner explicitly approved deletion on 2026-07-15. | `DELETE_NOW` as one exact root-screenshot set in `UNIT-002`; do not infer permission for other screenshots. | Low / high. |
| `LC-021` | `predev:turbo` equals `predev`; `dev:turbo` equals `dev`. | `tests/vitest/dev-runtime-memory-safety.test.ts` explicitly asserts both aliases. | `DELETE_WITH_CALLER_UPDATE`: make canonical `dev`/`predev` the contract and remove alias assertions. | Low / high. |
| `LC-022` | `vercel.json` mixes obsolete Vercel-era `regions`/`crons` with `git.deploymentEnabled: false`. A redacted 2026-07-15 read-only Vercel receipt proves the project still exists, retains Archestimator domains, is not the live target, and has a recent ready deployment. | `tests/vitest/cloudflare-scheduled-upload-jobs.test.ts` reads the stale cron block; the deployment-disabled setting still protects a linked project. | `REPAIR_NOW`: remove `regions` and `crons`, move schedule assertions to Worker truth, retain a minimal deployment-disabled guard, restore `.vercel/` ignore protection, and delete the file only after the Vercel project/domains are decommissioned and the guard is unnecessary. | High / high. |
| `LC-023` | `wrangler.next-dev.jsonc` supports current local Cloudflare/Next development. | Active dev tooling. | `RETAIN_ACTIVE`. | High if deleted / high. |
| `LC-024` | `supabase/**` contains 245 tracked provider-exit, migration, parity, and backfill artifacts; `supabase/.temp/**` has no tracked files and `package.json` has no `@supabase/*` runtime package. | Historical proof and comparison tooling only; root `migrations/**` is current D1 truth. | `RETAIN_EVIDENCE`; do not apply, extend, or execute the historical lineage against the legacy project. | High / high. |
| `LC-025` | Root `migrations/**` is the active D1 lineage. | Current and hosted D1 schema. | `RETAIN_ACTIVE`; never edit/delete applied migrations. | Critical / high. |
| `LC-038` | `public/file.svg`, `public/globe.svg`, `public/next.svg`, `public/vercel.svg`, and `public/window.svg` are untouched Next starter assets from the initial scaffold and have zero repository references. | None. | `DELETE_NOW` as one exact starter-asset set; do not generalize this result to other public assets. | Low / high. |
| `LC-039` | Provider-exit/readiness scripts such as `generate-cloudflare-provider-exit-pack.ts`, `generate-cloudflare-migration-inventory.ts`, `generate-provider-cleanup-allowlist.ts`, `check-cloudflare-d1-auth-realtime-readiness.ts`, `generate-cloudflare-better-auth-proof.ts`, and `check-auth-audit-completion-readiness.ts` intentionally scan legacy-provider strings. | Current authentication/provider-exit closure and audit follow-up evidence. | `RETAIN_ACTIVE` until the auth/provider-exit follow-up is reconciled and archived; then re-audit callers rather than deleting the suite by keyword. | High / high. |
| `LC-040` | `perf:collect-live-evidence` and README documentation still invoke `scripts/collect-live-db-performance-evidence.ts`, whose `linked` mode executes `supabase db query --linked` and whose local mode assumes Postgres. Current D1-specific performance proof tooling exists. | Package command, README command, and provider cleanup allowlist. | `DELETE_WITH_CALLER_UPDATE`: delete the collector, command, README line, and allowlist override; do not repoint it. Preserve `cf:d1-runtime-proof`, `cf:d1-performance-proof`, and generated historical evidence. | Medium / high. |
| `LC-041` | `generate-supabase-type-reference-retirement-inventory.ts` now reports zero blocking type references and writes to the older authentication follow-up; its generator and focused test keep each other alive after `src/lib/supabase/types.ts` was deleted. | Completed report, focused test, and auth-follow-up closure state. | `DELETE_WITH_CALLER_UPDATE`: preserve the final report, reconcile the follow-up, then remove the completed generator/test loop. | Medium / high. |
| `LC-042` | `tests/vitest/share/duplicate-decision-race.provider.test.ts` is a gated Supabase/Postgres mutation-capable provider proof. D1 duplicate-decision coverage and archived provider-parity proof now overlap its purpose. | Test discovery and provider cleanup allowlist; no application runtime caller. | `DELETE_WITH_CALLER_UPDATE`: confirm canonical D1 coverage, preserve or move any unique historical proof under `supabase/migration-evidence`, then remove the active provider-capable test entry. | High / medium-high. |
| `LC-043` | `generate-provider-cleanup-allowlist.ts` classifies `tests/vitest/notification-rls-proof.test.ts` and `tests/vitest/upload-storage-denial-proof.test.ts`, but those paths no longer exist; the retained files are under `supabase/migration-evidence/provider-parity-proofs/tests/`, which the scanner intentionally skips. | Provider cleanup allowlist generation and its focused contract test. | `REPAIR_NOW`: remove the two stale entries and their fixtures/assertions; do not repoint them into the skipped historical tree. | Medium / high. |

### Exact `LC-017` Generated Outputs

Delete only:

- `.design-shots/01-glass-newdesign.png`
- `.design-shots/01-glass-newdesign-full.png`
- `.design-shots/03-ref-estimates-list.png`
- `.design-shots/03-ref-estimates-list-full.png`
- `.design-shots/04-ref-project-dashboard.png`
- `.design-shots/05-ref-workshop.png`
- `.design-shots/crops/crop-center.png`
- `.design-shots/crops/crop-footer.png`
- `.design-shots/crops/crop-gutter-left.png`
- `.design-shots/crops/crop-header.png`
- `.design-shots/crops/crop-library.png`
- `.design-shots/crops/crop-mobile.png`
- `.design-shots/crops/crop-node-top.png`
- `.design-shots/crops/crop-tree.png`

Explicitly retain `.design-shots/add-component-modal/**` and the other design shots not produced by the obsolete scripts.

## C. Planning and Documentation Candidates

| ID | Candidate and evidence | Disposition | Risk / confidence |
|---|---|---|---|
| `LC-026` | `.ai/03_plans/README.md:24-45` claims a 2026-06-19 active inventory containing paths that have moved or no longer exist. | `REPAIR_NOW`: regenerate the active index from the filesystem, keep archive pointers, and preserve test-required agent-framework wording. | Medium / high. |
| `LC-027` | `.ai/03_plans/2026-07-13/Shared-Link-Page/plan-pack.json` mixes “implementation complete” language with proposed requirements, open risks, and pending criteria. | Reconcile source/evidence/status first; archive only after the tuple is truthful. | High / high. |
| `LC-028` | `.ai/03_plans/2026-07-12/Workshop-Library-Audit/` has a newer reconciliation document and overlaps the current component/estimate pack, but still owns six distinct unresolved units. | `RETAIN_ACTIVE`: identify the July 14 component pack as overlapping authority while preserving upload authz, atomicity, write-guard, templates, XLSX, and export/import obligations. Do not archive without an exact future crosswalk. | High / high. |
| `LC-029` | `.ai/03_plans/000-Follow Ups/2026-06-14-Estimate-Tree-Unification-Followups/` follows an archived parent and contains old Supabase/apply wording. `correctKinds` still affects share fallback hierarchy because consumers read `node.kind`. | `RETAIN_ACTIVE`: mark FU-4 retained, preserve browser-gated FU-1–FU-3 and historical/future FU-5–FU-6, and leave the follow-up active. | Medium / high. |
| `LC-030` | Templates follow-up material under `000-Follow Ups` remains a current backlog item. | `RETAIN_ACTIVE`; it is not a cleanup false positive. | Low / high. |
| `LC-031` | `.ai/09_archive/2026-06-14-Codebase-Cleanup-Plan/` is an older comprehensive audit whose dependency and file findings have partly been executed. | `RETAIN_EVIDENCE`; do not reactivate or copy its deletion list without current proof. | Medium / high. |
| `LC-044` | Current-authority documents still describe Supabase/Postgres, Supabase Auth/Realtime/types, Vercel hosting/analytics, and deleted source paths as live: `.ai/00_corpus/ARCHESTIMATOR_MASTER.md`, `.ai/00_corpus/archestimator-app-bible.md`, `.ai/00_corpus/feature-flag-and-env-inventory.md`, `.ai/06_specs/deep/architecture-overview.md`, and `.ai/06_specs/feature-inventory.md`. | Agents and maintainers use these files as current architecture/feature authority. | `REPAIR_NOW`: rewrite these exact documents against Better Auth, D1, R2, Durable Objects, Workers/OpenNext, and current source paths; classify broader provider mentions as current repair, historical retention, or archive candidates rather than blanket replacement. | High / high. |
| `LC-045` | `docs/superpowers/plans/2026-05-24-component-variant-assets-and-cost-history.md` remains written as an actionable Supabase migration/type/upload plan even though its provider assumptions are superseded. | Historical implementation lineage; no current execution authority. | `REPAIR_NOW`: mark it historical/superseded or archive it with a current successor pointer; retain the lineage rather than silently rewriting old implementation steps as current. | Medium / high. |

## D. Repository-Boundary Assets

| ID | Asset | Current evidence | Disposition |
|---|---|---|---|
| `LC-032` | `archestimator_pitch deck/` | 158 tracked files, roughly 98 MiB; intentional business collateral. | `RETAIN_OWNER_ASSET`; the owner explicitly directed that it remain untouched on 2026-07-15. |
| `LC-033` | `claude-design-reference/` | 154 tracked files, roughly 18 MiB; intentional design reference corpus. | `RETAIN_OWNER_ASSET`; the owner explicitly directed that it remain untouched on 2026-07-15. |
| `LC-034` | `archestimator_executive_summary/` | 6 tracked files, roughly 152 KiB. | `RETAIN_OWNER_ASSET`; the owner explicitly directed that it remain untouched on 2026-07-15. |
| `LC-035` | `philip-lewis-cv/` | 5 tracked files, roughly 240 KiB; personal collateral. | `RETAIN_OWNER_ASSET`; the owner explicitly directed that it remain untouched on 2026-07-15. |

## E. Additional Legacy-Looking Surfaces Retained Pending Proof

| ID | Candidate and evidence | Disposition | Risk / confidence |
|---|---|---|---|
| `LC-036` | `.github/workflows-disabled/**` contains current-looking and dated disabled CI, release, dependency-review, CodeQL, Dependabot, and React Doctor workflows while `.github/workflows/**` has no active workflow. Deleting or re-enabling them changes repository governance, not runtime code. | `RETAIN_ACTIVE`: the owner explicitly directed on 2026-07-15 that workflows remain disabled and untouched. | High if changed / high. |
| `LC-037` | `public/Screenshot 2026-05-18 at 9.00.39 PM.png` is a legacy-looking public asset with no proven current source reference; its filename contains U+202F before `PM`, and `/public` assets can be externally addressed. | `RETAIN_ACTIVE` for this pack. Filename scans do not prove demand or provenance; a separate public-asset task may re-evaluate it. | Medium / medium. |

These assets may ultimately belong in a separate collateral repository or external document store, but moving them is not a code-cleanup decision and is not authorized by this pack.

## F. Tool Findings That Must Not Drive Deletion Alone

- Code Review Graph returned hundreds of dead-code candidates, including expected framework entrypoints, tests, scripts, and generated adapters. Only independently proven candidates appear in the `DELETE_*` set.
- GitNexus can miss framework and re-export edges. `PublisherProjectMembersPanel` was not resolved as a symbol, so direct source/test reference evidence controls its disposition.
- “Zero in-repo consumers” is not proof that a public URL or API route has no external consumer.
- A large file is not obsolete. Decomposition and cleanup are separate programs.
- Archived plans and provider-exit evidence are not executable runtime code, but they remain useful lineage unless a reconciliation unit explicitly supersedes and archives them.

## G. Audit Coverage and Negative-Result Matrix

Covered domains:

- product routes, components, public APIs, and compatibility UI;
- D1 migrations, legacy publication mappings, auth/provider selection, and data-shape fallbacks;
- package scripts, configs, root files, screenshots, raw captures, and generated artifacts;
- active plans, follow-ups, archived plans, and stale index pointers;
- graph dead-code candidates, large files, framework false positives, and transitive callers.

| Domain | Current evidence | Result / exclusion |
|---|---|---|
| Runtime and development dependencies | `package.json` currently declares 24 runtime and 24 development dependencies; source/graph scans did not provide dependency-level deletion proof. | No package removal promoted. A dedicated dependency audit is required before changing the manifest or lockfile. |
| Environment and examples | `.env.example`, `.dev.vars.example`, `wrangler*.jsonc`, and provider-selection code were screened without reading secret values. | Auth aliases are `RETAIN_ACTIVE`; no secret/local environment file is a cleanup artifact and no debug endpoint is justified. |
| CI and deployment linkage | Disabled workflow trees, Cloudflare deploy/check scripts, `wrangler*.jsonc`, `vercel.json`, and a redacted live Vercel project receipt were inventoried. | Cloudflare files remain active; disabled workflows are owner/hosted-policy gated; stale Vercel regions/crons can be removed, but the deployment-disabled guard remains active while the linked project exists. |
| Ignored and generated outputs | `.gitignore`, ESLint ignores, tracked `.playwright-mcp`, `.design-shots`, root screenshots, coverage, `.next`, and screenshot harnesses were screened. | Only exact tracked raw captures and script-owned outputs are local-ready; provenance-uncertain screenshots remain. |
| Public assets | 128 files under `public/` were filename-inventoried; component thumbnails, logos, fonts, landing media, and favicon assets have plausible runtime or externally addressed use. The five untouched Next starter SVGs have zero references and scaffold provenance. | No broad public-asset deletion. Only the exact `LC-038` starter set is local-ready; `LC-037` remains provenance/demand gated. |
| Previous provider exit | The completed 2026-07-05 Vercel/Supabase cleanup archive, current package dependencies, local environment key names, Supabase historical tree, provider-exit scripts, and focused legacy-provider tests were reconciled. | No Supabase application runtime or local provider keys remain. Historical lineage and still-consumed closure tooling remain; obsolete live-collector/type-retirement/test capability is handled by `LC-039`–`LC-043`. |
| Current authority documents | Five current corpus/spec files and one executable-style historical plan were checked against current source/provider truth. | Repair current authority in `UNIT-004`; retain or clearly supersede historical lineage rather than bulk-rewriting every provider mention. |
| D1 schema, indexes, and triggers | Active applied migrations, Client Portal tables/indexes, component-draft and account-integrity triggers, and historical drop operations were screened. | No index/trigger/table deletion is authorized. Any retirement requires a new exact forward migration after current-reference and retention proof. |
| Provider bindings and resources | `ARCH_DB`, `ARCH_UPLOADS_R2`, `COLLAB_ROOMS`, `GLOBAL_PRESENCE`, `SUPPORT_INBOX`, both queues, Images, Email, crons, assets, and `ARCH_APP` were inventoried from Wrangler configs. | No bound resource is classified obsolete. Callback-normalizer retirement remains provider-proof and authorization gated. |
| Repository-boundary collateral | Pitch, executive-summary, design-reference, CV, disabled workflows, and screenshot evidence were separated from executable code. | Retain the four named owner-asset directories and leave workflows disabled/untouched; delete only the seven exact root screenshots in `LC-020`. |

Residual uncertainty is concentrated in public API consumers, issued legacy links, hosted D1 row distributions, configured auth-provider aliases, the separate public-screenshot provenance/demand question, Cloudflare route precedence, and provider callback behavior. This pack resolves uncertainty safely: incomplete proof yields `RETAIN`, not a new migration program or internal blocker. Vercel is fully detached from runtime architecture, but its dormant external project record still exists; `UNIT-003` minimizes the guard, while final administrative decommission remains a separate external task.
