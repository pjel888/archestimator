# 15 — Decisions, Assumptions, and Alternatives

## Major decisions

### DEC-01 — Client-name missing: warn (not block) for v1
- **Problem.** Should a missing `client_name` block Send? A client-facing proposal without a client name looks unfinished, but many closed-beta owners work with informal clients.
- **Constraints.** Avoid false-positive blocking (RISK-01); closed-beta bias to fast iteration.
- **Options.** (a) Block; (b) Warn; (c) Ignore.
- **Advantages.** (a) strongest quality gate; (b) balances quality + speed; (c) simplest.
- **Disadvantages.** (a) blocks legitimate informal workflows; (b) owners can ignore; (c) ships unfinished-looking proposals.
- **Security/Performance/Operational.** None differ materially.
- **Recommended.** (b) Warn for v1; revisit upgrade-to-block after closed-beta feedback.
- **Reason.** Closed-beta owners may have informal clients; warn surfaces the issue without blocking; cheap to upgrade later.
- **Consequences.** FR-02(e) is P1 not P0.
- **Conditions to change.** Closed-beta feedback shows owners routinely miss client names → upgrade to blocker.
- **Type.** owner-delegated planning decision.

### DEC-02 — Persist owner message on `shared_link_recipients`
- **Problem.** Store the owner-composed subject/body or keep it ephemeral per-send?
- **Constraints.** Audit + resend consistency; cheap storage; privacy (PII).
- **Options.** (a) Persist (migration `0037`); (b) Ephemeral (send only).
- **Advantages.** (a) resend consistency + audit trail; (b) no migration, less PII stored.
- **Disadvantages.** (a) nullable columns + PII; (b) resend can't reproduce exact original message.
- **Recommended.** (a) Persist.
- **Reason.** Resend consistency (FR-05c) is much simpler if the message is stored; columns are nullable/reversible; PII is already on the recipient row.
- **Consequences.** Migration `0037` in scope.
- **Conditions to change.** Privacy review prefers ephemeral → flip to (b); columns become unused/harmless.
- **Type.** owner-delegated planning decision.

### DEC-03 — "Proposal" remains a `project_publications` row (no new table)
- **Problem.** Introduce a `proposals` table?
- **Options.** (a) New table; (b) Reuse `project_publications`.
- **Recommended.** (b) Reuse.
- **Reason.** The row already represents a published package (snapshot + recipients + statuses). A new table would duplicate identity and create a sync boundary.
- **Conditions to change.** If proposal-specific fields (cover letter, package version independent of snapshot) become first-class, revisit.
- **Type.** owner-delegated planning decision.

### DEC-04 — Readiness is derived (not persisted)
- **Problem.** Persist a readiness snapshot on the publication row?
- **Recommended.** No — compute at send time + drawer open.
- **Reason.** Persisted readiness goes stale immediately (estimate changes); the gate must re-check at action time anyway.
- **Conditions to change.** None likely.
- **Type.** owner-delegated planning decision.

### DEC-05 — Honest delivery labeling instead of overpromising
- **Problem.** The brief says "delivery proof" but only sent/opened/responded are knowable.
- **Recommended.** Ship honest labels (`sent` = accepted by provider; `opened`; `responded`); isolate `bounced` as BLOCKED-EXTERNAL.
- **Reason.** Overpromising "delivered to inbox" without provider proof is dishonest and a support liability.
- **Conditions to change.** REL-01 unblocks → wire `bounced`.
- **Type.** owner-delegated planning decision.

### DEC-06 — Preflight is a persistent panel, not a tab
- **Problem.** Where does readiness live in the drawer?
- **Options.** (a) New "Readiness" tab; (b) Persistent panel above tabs.
- **Recommended.** (b) Persistent panel.
- **Reason.** A tab can be missed; readiness must be seen before navigating to Recipients/Send.
- **Type.** owner-delegated planning decision.

### DEC-07 — Reuse alert primitives, no new design-system primitive
- **Problem.** Build a "ReadinessCard" component?
- **Recommended.** No — reuse `src/components/ui/` alert variants + list.
- **Reason.** AGENTS.md proportional-verification + reuse-first; a new primitive needs design-lint + Storybook work disproportionate to the value.
- **Type.** owner-delegated planning decision.

### DEC-08 — PDF deferred (out of scope)
- **Problem.** Build PDF generation?
- **Recommended.** No (v1).
- **Reason.** Greenfield (no PDF path exists); PROMPT separates "downloadable deliverables" (XLSX exists) from this owner-workflow pack; the deliverable-trust pack owns export integrity. PDF is a separate large effort.
- **Conditions to change.** Owner asks for PDF → new plan pack.
- **Type.** owner-delegated planning decision.

## Assumptions (revisited from 02)

| ID | Assumption | Status | Notes |
|---|---|---|---|
| ASSUMP-01 | Cloudflare Email remains the provider | Validated (repo) | DEC-05 depends on this |
| ASSUMP-02 | Snapshot stays in D1 JSON | Validated (repo) | No R2 work |
| ASSUMP-03 | Role-rank model is correct authz | Validated (repo) | SEC-03 reuses it |
| ASSUMP-04 | Readiness is derived | Validated (DEC-04) | — |
| ASSUMP-05 | Deliverable-trust pack owns export integrity | Validated (brief) | No overlap |
| ASSUMP-06 | Owner message is plain text | Validated (SEC-01, DEC-02) | — |
| ASSUMP-07 | Bounce ingestion needs provider webhook | Validated (repo) | REL-01 BLOCKED-EXTERNAL |

## Rejected alternatives (summary)

- **New `proposals` table** — rejected (DEC-03); duplicates identity.
- **Persisted readiness** — rejected (DEC-04); goes stale.
- **Overpromise "delivered"** — rejected (DEC-05); dishonest.
- **Readiness as a tab** — rejected (DEC-06); missable.
- **New "ReadinessCard" primitive** — rejected (DEC-07); disproportionate.
- **PDF in v1** — rejected (DEC-08); greenfield, separate effort.
- **Hard block on client-name** — rejected for v1 (DEC-01); false-positive risk.
- **Ephemeral owner message** — rejected (DEC-02); resend inconsistency.
- **A new public API endpoint for readiness** — rejected; readiness is a server-only module consumed by existing Server Actions; no new endpoint/attack surface.
- **R2 for snapshot** — rejected (ASSUMP-02); premature.

## Open decisions (none internal-blocking)

All open items are either external (REL-01) or safe discovery (DATA-04, count-unsaved-import) or owner-delegated-and-decided (DEC-01..08). No unresolved architecture decision blocks implementation.
