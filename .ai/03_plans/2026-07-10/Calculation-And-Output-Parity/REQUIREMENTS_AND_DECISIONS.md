# Requirements And Decisions

## Outcome Requirements

| ID | Backlog owner | Outcome | Source IDs | Units | Criteria |
|---|---|---|---|---|---|
| REQ-001 | BETA-P0-05 | One hand-authored golden fixture and oracle prove row identity, membership, ordering, cost parts, and named totals across every required surface | SRC-001, SRC-002, SRC-003, SRC-004 | UNIT-001, UNIT-002, UNIT-003, UNIT-004, UNIT-005, UNIT-006 | AC-001, AC-002 |
| REQ-002 | BETA-P0-05 | Existing line-total oracle evolves into the single canonical row cost-parts and total-basis contract with compatibility adapters | SRC-001, SRC-002 | UNIT-001, UNIT-002, UNIT-003 | AC-003, AC-004 |
| DATA-001 | BETA-P0-05 | Currency, safe-integer minor-unit rounding, closed numeric input ranges, D1/API rejection, row scope, quantity contingency, adjustments, labor, misc, sheet adjustment, contingency, VAT, and archived-state rules are explicit and deterministic | SRC-001, SRC-002, SRC-004 | UNIT-001, UNIT-002, UNIT-003, UNIT-005 | AC-005, AC-006 |
| REQ-003 | BETA-P0-05 | Publication snapshot/share reconstruction preserve public-safe identity and exact proposal-included totals without leaking rate/source metadata | SRC-001, SRC-003, SRC-005 | UNIT-001, UNIT-004, UNIT-006 | AC-007, AC-008 |
| SEC-001 | Public snapshot security | New parity fields remain public-safe, versioned, sanitized, and compatible with legacy snapshots | SRC-003, SRC-005 | UNIT-004, UNIT-006, UNIT-007 | AC-008, AC-009 |
| REQ-004 | BETA-P0-05 | Preview, export model, formula-on/off XLSX, cached values, recalculation metadata, native readback, and final totals agree with the fixture | SRC-001, SRC-004, SRC-005 | UNIT-001, UNIT-005, UNIT-006 | AC-010, AC-011 |
| UX-001 | BETA-P0-05 | Screen, share, preview, XLSX, and print identify currency/basis/scope clearly and print the same proposal package totals and included rows | SRC-003, SRC-004, SRC-005 | UNIT-004, UNIT-005, UNIT-006 | AC-012 |
| PERF-001 | Reliability | Canonical adapters and workbook/print generation stay within measured Beta-scale time, memory, payload, and row-count budgets | SRC-002, SRC-004 | UNIT-003, UNIT-005, UNIT-007 | AC-013 |
| REQ-005 | Program-owned BETA-P1-10 contribution | Touched calculation/export state is extracted behind typed adapters without growing shared UI/workbook modules or changing Publisher-owned identity, and this pack emits one receipt to the umbrella evidence gate | SRC-002, SRC-004, SRC-005 | UNIT-002, UNIT-004, UNIT-005, UNIT-006, UNIT-007 | AC-014 |
| OPS-001 | Beta release integrity | Rollout, compatibility, observability, fix-forward, proof freshness, cleanup, and final requirement audit are executable | SRC-001 | UNIT-007 | AC-015 |

## Acceptance Criteria

| ID | Observable criterion | Test IDs | Evidence class |
|---|---|---|---|
| AC-001 | Every active fixture row appears exactly once in the working basis; every proposal-included row appears exactly once in proposal consumers; excluded/by-owner rows never enter proposal totals | TEST-001, TEST-004, TEST-005 | golden unit/contract receipt |
| AC-002 | Editor, Project Data estimate summary/charts, publication/share, preview/model, XLSX, and print values match the expected named basis byte-for-byte in minor units | TEST-001, TEST-003, TEST-004, TEST-005, TEST-006 | cross-surface golden receipt |
| AC-003 | All active calculation consumers delegate to the canonical oracle or an explicit compatibility adapter; duplicate row formulas are absent from touched files | TEST-002, TEST-009 | contract/static receipt |
| AC-004 | Current list/RPC/editor/chart behavior remains compatible for existing fixtures while the known contingency divergence becomes green | TEST-002, TEST-003 | regression receipt |
| AC-005 | Valid quantity contingency, adjustment/discount, labor, misc, sheet adjustment, proposal contingency, VAT, archived rows, and scope produce hand-authored expected parts/totals; invalid ranges or inconsistent quantity facts return typed refusal and never enter an output | TEST-001, TEST-003, TEST-005, TEST-008 | golden/adversarial receipt |
| AC-006 | Currency is normalized without conversion; quantity uses six-decimal normalization; every minor-unit intermediate is a safe integer; overflow returns `amount_out_of_range`; display/XLSX formatting is consistent and deterministic | TEST-001, TEST-005, TEST-007, TEST-008 | unit/workbook receipt |
| AC-007 | New snapshot/share totals use the proposal-included basis and reconcile to stored rows; legacy snapshots still render stored totals safely | TEST-004 | snapshot/share contract receipt |
| AC-008 | Snapshot JSON contains no unit/labor rates, misc, internal supplier/library/source/confidence fields, raw IDs, or unsafe image URLs after additive parity fields | TEST-004, TEST-008 | security/serialization receipt |
| AC-009 | Unknown calculation/snapshot version fails to safe compatibility behavior rather than guessing new semantics | TEST-004, TEST-008 | adversarial receipt |
| AC-010 | Preview model, export model, formulas-on workbook cached values, and formulas-off scalar cells equal the fixture final proposal total | TEST-005 | workbook/model receipt |
| AC-011 | Workbook sets automatic/full recalculation metadata, dynamic currency formats, valid formulas/ranges, and reopens through the native XLSX parser with exact cached values | TEST-005 | native artifact receipt |
| AC-012 | Unsaved edit preview recalculates; save/reload stays equal; print-media package contains every active included row/estimate exactly once with the same total/currency and excludes receiver-only chrome | TEST-006 | DOM/browser receipt |
| AC-013 | 5,000-row calculation and 10,000-row workbook fixtures meet recorded budgets; 50,000-row reasoning proves bounded behavior or explicit refusal | TEST-007 | benchmark receipt |
| AC-014 | Touched modules have focused ownership/tests, existing large-file behavior is preserved, and no Publisher issue-identity/funnel work enters the diff | TEST-009 | static/regression receipt |
| AC-015 | Targeted tests, typecheck, lint, error handling, Cloudflare build, diff check, artifact inspection, freshness, cleanup, and final audit pass | TEST-010 | final audit receipt |

All criteria initially `FAIL`. Passing a narrower total or workbook test cannot
advance the package until the cross-surface fixture and security/print gates pass.

## Calculation Invariants

1. Every numeric input is finite. Missing optional values may use an explicitly
   documented default; supplied invalid numbers are never coerced to zero.
2. `quantity`, material/labor unit cost, and `misc_cost` are non-negative.
   Negative discounts use adjustment percentage, not misc.
3. Quantity is normalized to six decimals. When `quantity_base` is present, a
   signed `quantity_contingency_amount` is valid only when
   `round6(max(0, base + amount)) === round6(quantity)`; mismatch is
   `invalid_calculation_input`. Without base mode, quantity is authoritative.
4. Legacy `contingency_percentage` acts as row adjustment only when quantity-base
   mode is absent. Row/sheet adjustment is in `[-100, 1000]`; proposal
   contingency and VAT are in `[0, 100]`.
5. Material, labor, adjustment, and misc are separately rounded to minor units,
   then summed. Every conversion, product, and addition is a safe integer.
6. Overflow returns `amount_out_of_range` and blocks proposal/export/share; no
   clamping, Infinity, lossy string conversion, or partial output is permitted.
7. A negative adjustment is a discount and rounds symmetrically.
8. Working basis includes active rows independent of proposal scope.
9. Proposal basis includes only explicit `included`; legacy missing scope maps to
   included for compatibility.
10. Archived tabs/nodes/rows never enter active totals.
11. Sheet adjustment applies once after included direct row totals.
12. Proposal contingency/VAT apply in the order defined by existing export
    settings and each step rounds from its immediate base.
13. Currency conversion is forbidden. Mixed currency is not one total.
14. Every aggregate is the sum of canonical minor-unit values, not independently
    recomputed floating-point formulas.
15. Formula cells include canonical cached results; formula-free cells use the
    same values.
16. Public snapshots expose totals and safe scope only, never rates or internal
    provenance.
17. A legacy stored row total remains authoritative for a legacy snapshot read;
    migration-by-read must not reinterpret issued historical content.
18. Server actions/repositories reject new invalid writes. The D1 constraint
    migration runs only after a read-only legacy scan is clean; invalid legacy
    rows block migration/output and are reported for explicit repair, never
    silently mutated.

## State Matrix

| State | Expected behavior |
|---|---|
| Empty estimate | Zero in all applicable bases; no phantom rows |
| Unsaved editable changes | Screen and preview use materialized edit state; persisted/public outputs remain last saved until explicit publish/export action contract says otherwise |
| Saving/saved/reload | Optimistic and persisted totals converge; reload reproduces exact minor units |
| Failed save | Persisted/share/export totals remain prior saved state; UI exposes failure |
| Included row | Present in working and proposal bases |
| Excluded/by-owner row | Present in working review and exclusion display; absent from proposal included/final totals |
| Archived tab/node | Absent from active and publication totals |
| Legacy snapshot | Render stored safe row totals and legacy basis marker; do not add inferred rates |
| Unknown snapshot version | Safe failure/compatibility state; no guessed total semantics |
| Mixed currency | Per-currency totals only; no conversion or combined amount |
| Formula mode on/off | Same cached/scalar value and formatting |
| Print before/after | Package mounts synchronously for print and unmounts after; totals unchanged |
| Generation failure | Structured error, no corrupt/partial download presented as success |

## Autonomous Decisions

### DEC-AUTO-001 - Evolve the existing line-total oracle

Question: Which module owns canonical calculation?

Affected IDs: REQ-001, REQ-002, DATA-001, REQ-005.

Evidence: `estimate-row-total.ts` already declares itself the single JS oracle,
while four other surfaces repeat formulas.

Options: new parallel calculation package; keep independent formulas; evolve the
existing oracle with typed cost parts/bases and compatibility wrappers.

Decision: Evolve the existing oracle.

Why: Lowest migration risk and preserves list/RPC callers while eliminating drift.

Rejected alternatives: A second oracle contradicts current ownership; independent
formulas cannot satisfy parity.

Confidence: high.

Consequences: Adapters replace formulas incrementally; existing exports stay
available during migration.

Rollback/revision trigger: If client bundling pulls server-only code, split types
and pure primitives without changing the authoritative API.

Responsible role: calculation integrator.

### DEC-AUTO-002 - Three named total bases

Question: How should screen totals compare with scope-aware proposal totals?

Affected IDs: REQ-001, REQ-002, DATA-001, REQ-003, REQ-004.

Options: force all totals equal; silently exclude scope everywhere; name working,
proposal-included, and final proposal bases and reconcile them.

Decision: Use three named bases.

Why: It preserves useful working-estimate visibility and makes proposal exclusions
and charges explicit.

Rejected alternatives: Forced equality hides real business differences; global
exclusion changes editor semantics without evidence.

Confidence: high.

Consequences: Every DTO/model/snapshot names basis/version; UI labels only where
ambiguity exists.

Rollback/revision trigger: A future product decision may change working scope,
but must version basis semantics and fixtures.

Responsible role: domain architect.

### DEC-AUTO-003 - Integer minor-unit aggregation

Question: Where and how is money rounded?

Affected IDs: DATA-001, REQ-002, REQ-004.

Options: unrounded floats until display; decimal dependency; integer minor units
after each canonical cost part.

Decision: Use integer minor units with symmetric signed rounding and no new
dependency.

Why: It is deterministic, reviewable, compatible with current two-decimal Beta
currencies, and removes repeated accumulation drift.

Rejected alternatives: Display-only rounding permits aggregate mismatch; a new
dependency is unnecessary for the bounded contract.

Confidence: high.

Consequences: Adapters expose both minor units and display number where needed.

Rollback/revision trigger: Add currency-specific scale support before enabling a
zero/three-decimal currency; do not silently force two decimals.

Responsible role: calculation executor.

### DEC-AUTO-004 - No currency conversion; dynamic formatting

Question: How should arbitrary three-letter project currency be handled?

Affected IDs: DATA-001, REQ-004, UX-001.

Options: assume PHP; convert; preserve code and scale/format dynamically.

Decision: Preserve and validate currency, never convert, and derive consistent
display/XLSX format from the canonical currency contract.

Why: No exchange-rate source exists; PHP hard-coding is demonstrably incorrect
for other accepted codes.

Rejected alternatives: PHP assumption mislabels outputs; conversion invents
financial data.

Confidence: high.

Consequences: Unsupported scale is an explicit error until mapped/tested.

Rollback/revision trigger: Expand the supported currency map with fixture proof;
never change existing scale retroactively.

Responsible role: export executor.

### DEC-AUTO-005 - Additive versioned public snapshot fields only

Question: How can proposal scope/basis reach share without leaking rates?

Affected IDs: REQ-003, SEC-001, UX-001.

Options: recompute from private data at read; expose rates; add safe scope/basis/
currency/total fields to immutable snapshot and preserve legacy reads.

Decision: Add only safe versioned fields required for parity.

Why: Snapshot remains immutable/public-safe and does not depend on mutable live
project data.

Rejected alternatives: Live recompute breaks immutability; rates violate current
security contract.

Confidence: high.

Consequences: Snapshot schema version increments and sanitization tests expand.

Rollback/revision trigger: If Publisher pack already adds equivalent fields,
adopt its names after lease integration rather than duplicate them.

Responsible role: publication integrator.

### DEC-AUTO-006 - Workbook proof uses model, XML, and native parser readback

Question: What proves XLSX parity without assuming desktop Excel availability?

Affected IDs: REQ-004, DATA-001, PERF-001.

Options: only model tests; screenshot/manual Excel; generate actual XLSX, inspect
formula/cached values and recalculation metadata, reopen with current XLSX parser,
and compare formula-on/off.

Decision: Use actual artifact generation, ZIP/XML inspection, parser readback,
and formula-on/off parity as the mandatory local proof.

Why: It is deterministic and executable in CI. Desktop spreadsheet smoke remains
release evidence if separately required, not a substitute for artifact proof.

Rejected alternatives: Model tests do not prove workbook serialization; manual
screenshots are non-deterministic and unavailable in many sessions.

Confidence: high.

Consequences: Workbook sets auto/full recalculation flags and correct cached values.

Rollback/revision trigger: If the current parser cannot expose workbook metadata,
inspect XML directly; do not weaken cached-value assertions.

Responsible role: test/export executor.

### DEC-AUTO-007 - Print parity requires targeted browser media proof

Question: Can print parity be proven statically?

Affected IDs: UX-001, REQ-001, REQ-003.

Options: source assertions only; DOM beforeprint tests only; focused browser
`print` media proof over the golden publication.

Decision: Retain unit/DOM tests and add one targeted browser print-media proof.

Why: Browser media/layout and synchronous beforeprint mounting are browser-only
claims. This is a justified exception to the default no-browser guardrail.

Rejected alternatives: Source/DOM proof cannot prove print CSS/browser media.

Confidence: high.

Consequences: No broad visual QA or screenshots are required; inspect text,
visibility, row membership, currency, and total in print media.

Rollback/revision trigger: If browser proof is unavailable, criterion remains
failing with exact repro command; it is not waived.

Responsible role: verifier.

### DEC-AUTO-008 - Serialize shared publication/export files after Publisher

Question: How does parity work coexist with concurrent Publisher implementation?

Affected IDs: REQ-003, REQ-004, UX-001, REQ-005.

Options: parallel overlapping edits; block the whole pack; execute calculation
core first, then wait/re-read/lease shared files for integration.

Decision: Execute UNIT-001 through UNIT-003 locally, then serialize UNIT-004/005
shared edits after Publisher writer completion.

Why: It preserves throughput without overwriting identity/UX work.

Rejected alternatives: Overlapping writes create conflicts; whole-pack blocking
delays independent calculation work.

Confidence: high.

Consequences: Shared integration re-runs both packs' relevant tests.

Rollback/revision trigger: If Publisher exposes an equivalent canonical adapter,
use it and narrow this pack's shared diff.

Responsible role: lead integrator.

## Risk Register

| ID | Status | Risk | Units | Mitigation |
|---|---|---|---|---|
| RISK-001 | OPEN | Canonicalization changes existing totals rather than exposing true divergence | UNIT-001, UNIT-002, UNIT-003 | Hand-authored fixture plus characterization; basis/version migration |
| RISK-002 | OPEN | Scope change hides or bills excluded rows incorrectly | UNIT-001, UNIT-004, UNIT-005 | Separate bases and exact row membership assertions |
| RISK-003 | OPEN | Snapshot changes leak rates/internal provenance or rewrite legacy meaning | UNIT-004, UNIT-007 | Additive safe fields, sanitization/legacy adversarial tests |
| RISK-004 | OPEN | Workbook formulas/cached results/format disagree | UNIT-005, UNIT-007 | Artifact XML/readback and formula-on/off proof |
| RISK-005 | OPEN | Shared Publisher edits conflict or are overwritten | UNIT-004, UNIT-005, UNIT-006 | Wait/re-read/lease/integrate; one shared-file writer |
| RISK-006 | OPEN | Canonical adapter slows large estimates/workbooks | UNIT-003, UNIT-005, UNIT-007 | 5k/10k benchmark, 50k refusal/bounded reasoning |
| RISK-007 | OPEN | Capability extraction expands into unrelated proposal redesign | UNIT-006, UNIT-007 | File/requirement audit and Publisher ownership check |

## Authorization Boundary

No active `AUTH-*` record. Local implementation and targeted browser proof are
within the package ceiling. Production deployment, hosted mutation, and desktop
spreadsheet certification are not required for local implementation completion
and remain separate release evidence.
