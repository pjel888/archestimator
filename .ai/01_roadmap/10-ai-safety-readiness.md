# AI Safety & Product Truthfulness Readiness

Last updated: 2026-05-30

---

## 1 — Current AI Capabilities (Truthful Summary)

Archestimator ships two AI surfaces and one optional ranking signal. Neither surface
stores conversations, trusts client-supplied identity, or performs autonomous writes.

### Ask Flip — `/api/ai/ask`

Read-only, account-aware copilot. Derives the authenticated user and workspace
server-side via cookie/session (`workspaceAuth`). Uses a scoped read context assembled
entirely server-side: project-count, buffered project-list, the component-library
catalog, prompt-driven templates, prior rows, chart buckets, and the current-estimate
context (when the user is inside an estimate). Refuses any request that requires
touching the admin DB path (rejects `ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1`). Records
metadata-only audit events: timestamps, workspace id, session id, route, model, token
counts, and latency. Never creates, edits, applies, saves, or mutates records. Never
trusts browser-supplied or model-supplied workspace/user identity tokens.

### Package-Builder — `/api/ai/package-builder`

Confirmation-gated write surface with distinct modes:

- **Draft mode**: returns structured hints and a client preview; performs zero writes.
- **Refine mode**: accepts user feedback for a bounded pre-Apply revision loop; still
  zero writes.
- **Feedback mode**: records rejected drafts for future tuning.
- **Apply mode**: requires explicit user confirmation (checkbox), validates a
  cryptographically signed draft token, enforces idempotency via
  `idempotency_key`, records a metadata-only audit row, and fires an authenticated
  Supabase transactional RPC. The RPC creates project / estimate / tree / rows as an
  atomic unit. For existing estimates the flow uses a target-aware
  `fill_current_estimate` variant. Component-library creation is a separate intent
  path, not entangled with estimate writes.

All modes reject admin-DB bypass. No partial writes, no silent mutations, no
autonomous retries without confirmation.

### Memory — Ranking Hints (Default-Off)

Feature-flagged behind `AI_PACKAGE_BUILDER_MEMORY_ENABLED`. Supplies source-signal
ranking hints to the package-builder prompt — which packages, components, and
templates to score higher — based on historical apply patterns. This is **not**
retrieval memory, conversation memory, or a provider memory surface. It is an
off-by-default ranking signal and nothing more.

---

## 2 — What Is NOT Implemented (Must Not Claim)

| Feature | Status | Why Not Implemented |
|---|---|---|
| Stored AI conversations | NOT IMPLEMENTED | Audit is metadata-only; prompts and completions are never persisted. |
| Vector / RAG | NOT IMPLEMENTED | No vector store exists; ranking hints are the only historical signal. |
| Provider-owned memory | NOT IMPLEMENTED | No provider memory surface is configured or exposed. |
| Broad persistent user memory | NOT IMPLEMENTED | Only the default-off ranking-hint toggle exists; no user-facing memory store. |
| Autonomous AI mutations | NOT IMPLEMENTED | Every write path is confirmation-gated; there is no unattended mutation path. |
| Resettable preference UI | NOT IMPLEMENTED | No UI exists for resetting or clearing AI-side preferences. |
| Multi-step refinement loops beyond bounded pre-Apply revision | NOT IMPLEMENTED | Refine mode accepts one revision round; no endless back-and-forth loop. |
| AI-initiated actions without user confirmation | NOT IMPLEMENTED | Every Apply requires an explicit, user-triggered confirmation. |

---

## 3 — AI Safety Requirements

| Requirement | Status | Evidence | Launch Blocker? |
|---|---|---|---|
| Provider keys are server-only | DONE | All model provider keys live in server-side env vars (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`); never exposed to client bundles. | No |
| AI responses must not leak cross-account / project data | IMPLEMENTED / NEEDS EVIDENCE | Reads are scoped to the authenticated workspace; no automated leakage test suite exists yet. | Pre-production |
| AI audit records are metadata-only | DONE | `ai_audit` rows contain timestamps, route, model, token counts, and latency; no raw prompts or completions. Verified via schema inspection. | No |
| AI apply flows need idempotency | DONE | Every Apply RPC carries an `idempotency_key` column; the RPC guards against duplicate execution. | No |
| AI apply flows need confirmation | DONE | The client requires an explicit checkbox confirmation before firing an Apply request; the server rejects unsigned or missing draft tokens. | No |
| AI apply flows need rollback | PARTIAL | The transactional RPC either fully succeeds or fully rolls back, but no automated rollback drill / forced-failure test exists. | Pre-production |
| AI apply flows need audit | DONE | Every Apply produces a metadata-only audit row independent of any other log system. | No |
| Ask Flip is read-only | DONE | `/api/ai/ask` has zero write paths; no INSERT, UPDATE, DELETE, or state-mutating RPC calls. Verified via route audit. | No |
| Package-builder is confirmation-gated | DONE | The `apply` action requires a signed draft token and explicit user consent; no code path bypasses the gate. | No |
| No autonomous mutations by implication | DONE | Every mutation path traces back to a user-triggered confirmation; there are no cron, webhook, or event-driven write paths for AI. | No |
| Admin DB bypass rejected for AI routes | DONE | Both `/api/ai/ask` and `/api/ai/package-builder` explicitly check and reject `ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1`. | No |
| Broad persistent memory absent | DONE | The only memory-like signal is the default-off `AI_PACKAGE_BUILDER_MEMORY_ENABLED` ranking hint; nothing broader exists. | No |
| Stored conversations absent | DONE | No table, file, or external service stores prompt/response pairs; audit rows are metadata-only. | No |
| Vector / RAG absent | DONE | No `pgvector` extension, no Pinecone / Weaviate / Chroma dependency, no embedding pipeline. | No |
| AI route authorization | DONE | Both AI routes require authenticated workspace context; real provider calls are gated behind valid sessions. | No |

---

## 4 — Launch-Copy Rule

> Archestimator may say it assists with scoped project/account questions and
> reviewable package-builder drafts. It may not say it autonomously estimates,
> remembers everything, or acts as an unrestricted agent.

All public-facing copy (landing pages, docs, changelogs, social posts, demo scripts)
must be reviewed against this rule before publication. Marketing may describe AI as
"assisted" or "reviewable" but never as "autonomous," "fully automated," or
"agentic."

---

## 5 — AI Launch Gate Status

- **Pre-beta**: AI truthfulness audit on all public pages; confirm zero autonomous
  claims in any customer-facing copy.
- **Pre-production**: AI leakage test suite (cross-account read boundary), rollback
  drill (forced RPC failure recovery), and a broader write-path safety review (audit
  every mutation surface reachable from AI routes).
