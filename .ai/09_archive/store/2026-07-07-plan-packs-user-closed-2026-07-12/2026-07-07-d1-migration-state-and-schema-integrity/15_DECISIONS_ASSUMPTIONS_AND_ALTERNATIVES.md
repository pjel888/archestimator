# 15 — Decisions, Assumptions, and Alternatives

## 15.1 Major decisions (load-bearing, with rationale + rejected alternatives)

### DEC-001 — Cover `0033`–`0038`, not just `0033`–`0036`
- **Problem.** The prompt says "inspect `0033` through `0036` first" but the repo has `0037` and `0038` too, both integrity-relevant.
- **Constraints.** Must be evidence-grounded; cannot ignore real migrations.
- **Options considered.**
  - (a) Cover `0033`–`0038` (broader). ✅ Recommended.
  - (b) Cover only `0033`–`0036` (literal prompt scope).
  - (c) Cover all 38 (full re-audit).
- **Advantages of (a).** Captures the two missing recent migrations (0037 data mutation, 0038 triggers) without the cost of re-auditing all 38.
- **Disadvantages of (a).** Slightly broader than the prompt's literal "first" inspection target.
- **Rejected alternatives.** (b) leaves known integrity-relevant migrations uninspected — unsafe. (c) is more thorough but the older 0001–0032 are long-applied and lower-risk; the directive favors proportionality.
- **Security/perf/ops implications.** None (planning scope).
- **Reason.** Integrity must be whole for the recent window; 0037/0038 are recent.
- **Consequences.** The plan's §7.2 table covers all 38 anyway (cheap), but the deep-dive focuses on 0033–0038.
- **Conditions that would change it.** If 0001–0032 were suspected of drift, escalate to (c).

### DEC-002 — Treat Better Auth schema as a first-class canonical source
- **Problem.** Better Auth D1 schema (`user/session/account/verification`) is NOT in the numbered `migrations/`; it's applied out-of-band via `compileCloudflareBetterAuthD1Migrations`. A verifier scoped only to `migrations/` would miss it.
- **Options.** (a) Include auth tables in the verifier from `better-auth-proof-router.ts:63-69`. ✅ (b) Ignore auth tables (out of scope). (c) Move auth DDL into a numbered migration.
- **Rejected.** (b) leaves a 4-table gap. (c) changes the auth-apply workflow (high blast radius; out of scope for a migrations-integrity plan).
- **Reason.** The verifier must reflect the real schema, which includes auth tables.
- **Conditions that would change it.** If auth DDL is later moved into `migrations/`, the verifier auto-includes it via the generator.

### DEC-003 — No edits to existing migrations; fix-forward only
- **Problem.** 7 migrations are non-idempotent. Tempting to retrofit `IF NOT EXISTS` guards.
- **Options.** (a) Fix-forward only (NEW migrations + documented one-off reconciliation). ✅ (b) Retroactively edit `0021`/`0025`/`0028`/`0029`/`0032` to add guards.
- **Rejected.** (b): SQLite has no `ADD COLUMN IF NOT EXISTS`; migrations are plain SQL not scripts; editing breaks the audit trail and the `d1_migrations` tracker identity; `AGENTS.md:41` spirit forbids extending/altering legacy sets.
- **Reason.** Preserve audit trail; match the documented beta-support pattern (`21_DATABASE_CHANGE_BLUEPRINTS.md:70-76`).
- **Consequences.** Operators must follow §7.3 for partial-apply cases (procedural).

### DEC-004 — Local-first, hosted-gated; do not fake hosted proof
- **Problem.** The central objective (remote state) cannot be proven locally.
- **Options.** (a) Local tooling implementation-ready + hosted proof isolated as owner-gated gate; package `CONDITIONALLY READY`. ✅ (b) Claim local = remote (false). (c) Mark the whole plan `NOT READY` until hosted proof is done.
- **Rejected.** (b) violates evidence rules. (c) undersells the implementation-ready local slices.
- **Reason.** Honest evidence boundary; maximize the implementation-ready surface without overstating.

### DEC-005 — Generate expected-schema set at run time (not hardcoded)
- **Problem.** A hardcoded table list drifts (the exact problem being solved).
- **Options.** (a) Generate from `migrations/` + `better-auth-proof-router.ts` at run time. ✅ (b) Hardcode. (c) Generate once and commit.
- **Rejected.** (b) self-defeating. (c) drifts between generations.
- **Reason.** Deterministic generation keeps the verifier in sync with the source of truth automatically (AD-3).

### DEC-006 — Read-only tooling only; no custom migration runner
- **Problem.** Wrangler is the applier but no script reads its tracker.
- **Options.** (a) Read-only ledger/verifier around Wrangler. ✅ (b) Custom runner with own tracker.
- **Rejected.** (b) duplicates Wrangler; risks two-tracker drift; abstraction sprawl.
- **Reason.** The gap is introspection, not application.

## 15.2 Assumptions (labeled, with validation status)

| ID | Assumption | Source strength | Validated | If invalidated |
|---|---|---|---|---|
| ASSUMP-001 | Wrangler `d1 migrations apply`/`list` semantics match documented behavior (tracker marks applied after success; `--remote` targets `archestimator-proof-db`). | official docs + `21_DATABASE_CHANGE_BLUEPRINTS.md:71,81` | Medium (cited, not run in-session) | Ledger parser fails-closed; owner re-checks |
| ASSUMP-002 | The 2026-07-06 `current-state.md:271` "0033/0034/0035 pending remotely" snapshot has not been superseded by a later remote apply. | repo evidence (absence of later entry) | **Weak** (absence of evidence) | Phase 3 readback confirms/refutes; OPEN-DEC-001 |
| ASSUMP-003 | Free-tier D1 limits are sufficient for a schema-verification pass (catalog reads). | derived | Strong (catalog reads are constant-time) | None — even 1000 catalog reads would be trivially within free tier |
| ASSUMP-004 | `0037` was applied remotely (per `current-state.md:65-67`). | repo evidence (state log) | Medium (recorded, not independently re-confirmed) | Phase 3 readback confirms |
| ASSUMP-005 | The top-level `migrations` array in `wrangler.jsonc:53-58` is the DO-class migration, not D1 SQL. | repo evidence + Wrangler docs | Strong | If wrong, the plan's "D1 migrations live in `./migrations/`" premise needs re-check (very low probability) |
| ASSUMP-006 | `README.md` is developer-facing doc (not user-facing product copy), so editing migration counts is safe. | repo evidence | Strong | If product-owned, owner review needed (still safe) |

No assumption is used as proof of a stronger claim. ASSUMP-002 (the weakest) explicitly
feeds OPEN-DEC-001 rather than being treated as fact.

## 15.3 Open decisions

(See README "Blocked decisions table" and `00_AGENT_COORDINATION.md`.)

- **OPEN-DEC-001:** Remote `ARCH_DB` migration-applied state for `0033`–`0038`. Owner-gated. Unblock: run `wrangler d1 migrations list ARCH_DB --remote`.
- **OPEN-DEC-002:** Whether `0035` was applied remotely before/after the "pending" snapshot. Resolves after OPEN-DEC-001.
- **OPEN-DEC-003:** Whether `0036`/`0038` were applied remotely. Resolves after OPEN-DEC-001.

All three are externally blocked (hosted proof), with options, recommendation, owner, and unblock action recorded. No internal decision is left open.
