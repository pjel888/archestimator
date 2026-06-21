# 05 — Product Strategy Brief: Shared Link (Client Proposal Review)

Date: 2026-06-21 · Status: **Front-of-pack anchor — the "why/what/who" the audit lanes (10–80) verify**

This brief is the missing top of the pack. The engineering lanes assume it but never state it. Everything
below is the *intent* that the audits, the redesign blueprints, and the backlog serve. Structure follows
Rumelt's kernel: **diagnosis → guiding policy → coherent action.**

---

## 1. Diagnosis — the problem

Archestimator's purpose is *"a contractor opens Archestimator, builds an estimate in minutes, and sends a
proposal that the client understands and trusts"* (`PRODUCT.md`). The **send-and-close** half of that
promise is where value is realized — and it is the weakest link.

- **V1 was a bare public link**: a URL to a read-only snapshot. No recipient identity, no decision capture,
  no access control beyond obscurity, no owner feedback. The contractor couldn't tell who saw it or what
  they thought, and the client got a page that looked like the contractor's internal software.
- **The close is a trust event, not a data transfer.** A homeowner approving a six- or seven-figure
  construction estimate on their phone needs to *understand* the offer and *trust* the number and the firm.
  Friction or doubt converts a signature into silence, a phone call, or a lost bid.
- **The current V2 surface still reads as an admin tool** to the client (workshop tree, "reconstructed…
  may differ", jargon, a security log) and as a **database settings panel** to the manager (an unlabeled
  share glyph, five tabs, settings that don't visibly save). See [25](25_RECEIVER_UX_REDESIGN_BLUEPRINT.md)
  and [35](35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md). It works, but it does not yet *close*.

## 2. Target users

| Persona | Context | Job-to-be-done | Success looks like |
|---|---|---|---|
| **Manager / estimator** (sender) | Desktop, just finished an estimate; re-opens to monitor. | *"Send my client a trustworthy, controlled link to a polished proposal, and tell me the moment they open it and decide."* | Sends in seconds, feels professional, knows who opened it, gets a decision. |
| **Client** (receiver) | **Phone, no login**, anxious, non-technical, spending a lot of money. | *"Understand exactly what I'm paying for and trust it's fair and complete, so I can confidently approve (or ask one question)."* | Reads a premium document, trusts the number, approves without fear. |

Every audit lane maps to one of these goals: security/privacy (10/12/13) protects the client's trust and
the firm's data; receiver UX (20/25/85) is the client's comprehension-and-trust; manager workflow (30/35)
is the sender's control-and-feedback; performance (50) is "fast enough not to erode either".

## 3. Guiding policy

1. **Trust is the product.** Decision-integrity (a decision is made against the proposal the client
   actually saw — SEC-SHARE-01) and client-data privacy (what a bearer link exposes — SEC-SHARE-07/D2/D3)
   are not "security tickets"; they are the **trust pillars** that make the close credible. Weight them
   above engineering-hygiene severity.
2. **Two registers, one product** (`PRODUCT.md#5`). The receiver is the **editorial public** surface — a
   document that breathes (`proposalPaper`, Source Serif). The manager is **compact private** but must be
   **linear and legible**, not a settings database. Stop pointing the dense app register at clients.
3. **Closed-beta first, GA-gated.** Ship to a controlled set of contractors on a **single-node** topology;
   treat durability (D4), realtime (D7), and snapshot-scale (PERF-06) as **GA blockers**, not beta blockers.
4. **Decide explicitly.** Nothing ships by default-in-code on a money/privacy/security question without an
   owner call ([71](71_OPEN_DECISIONS_REGISTER.md)).

## 4. Goals & non-goals (this iteration)

**Goals**
- Close the decision-integrity and public-API safety gaps so a recipient decision is trustworthy and the
  bearer surface leaks nothing unintended (10/12/13).
- Make the receiver a **premium, trustworthy proposal document** and the manager modal a **calm linear
  Share sheet** (25/35) — the owner's explicit "the UX is bad, fix it" mandate.
- Get the pack to **executable, deployable, decided** state (90/91/71/99) for a closed beta.

**Non-goals (this iteration)**
- Full legal e-signature (D11), realtime owner feed (D7), durable distributed throttling (D4), normalized
  snapshot storage (PERF-06), one-RPC write consolidation (PERF-05), a floating nav rail (D6 — retired).

## 5. Success metrics

The feature is *successful* (not merely *complete*) when these move. Instrumentation substrate already
exists (open-event + session telemetry); wire it up per [92](92_OBSERVABILITY_AND_ALERTING.md).

| | Metric | Why | Source |
|---|---|---|---|
| **Primary** | **Recipient response rate per published link** (approve / decline / request-revision ÷ opened) | The close; the whole point of V2 over V1. | decision events ÷ open events |
| Secondary | Time-to-first-open (publish → first recipient open) | Email/delivery + link clarity. | publish ts → first open event |
| Secondary | Decision latency (first open → decision) | Comprehension + trust friction. | open → decision event |
| Secondary | Comment / question volume per link | Engagement vs confusion proxy. | comment events |
| Secondary | Stale-409 rate (republish-during-review friction, D1) | Whether republish UX hurts. | 409 telemetry ([92](92_OBSERVABILITY_AND_ALERTING.md)) |
| Qualitative | Manager confidence ("looked professional / I knew when they opened it") | The sender's emotional bar. | beta interviews |

**Anti-metric:** raising "links created" without raising **response rate** means the surface still isn't
closing — watch the ratio, not the volume.

## 6. Positioning — V1 → V2 → later

- **V1:** simple public link (read-only snapshot, no identity/decision/control).
- **V2 (this):** recipient management + decisions + comments + access control (password/expiry/rotate/revoke)
  + owner activity + security hardening + a redesigned, trustworthy receiver/manager experience.
- **Later (GA+):** legal e-signature (D11), realtime owner feed (D7), durable throttling (D4), normalized
  snapshot (PERF-06), one-RPC writes (PERF-05), rotate credential-version model (PERF-12).

## 7. Scope cut for this iteration

| In-scope now | Deferred to V2.x / GA | Out-of-scope |
|---|---|---|
| Decision-integrity (SEC-SHARE-01 ✓), public-API safety, sanitization, no-store, CSRF, rate-limit | Durable throttle (D4), realtime feed (D7), normalized snapshot (PERF-06), one-RPC writes (PERF-05) | Full legal e-signature (D11 — GA decision) |
| Receiver + manager UX redesign (25/35), phased | RBAC role-rejection matrix completion (MANAGER-F-01 residual) | Floating nav rail (D6 — retired) |
| Privacy decisions D2/D3, digest fix D9, deploy/migration reconciliation D8 | RLS symmetry on events (D10 — post-launch) | Multi-node/scale-out features |

## 8. Why the landed fixes matter (product weighting)

Not all P1s are equal. **SEC-SHARE-01 (stale-snapshot)** ([75](75_FINDING_ID_REGISTRY.md) — Fixed, source-verified) is the keystone: without it a client could approve
*old* content after the manager republished — the decision wouldn't mean what either party thinks, which is
the feature's core promise. **Location/clientName/OG exposure (D2/D3)** is the privacy pillar. These two get
product weight above equally-severe hygiene fixes.

## 9. Beta → GA gate

**Closed beta is ready when:** D1–D5 + D8–D9 are owner-accepted ([71](71_OPEN_DECISIONS_REGISTER.md))
— D6/D7/D10/D11 ship as **recorded deferrals** per [71](71_OPEN_DECISIONS_REGISTER.md); the
two migrations are provably in canonical history ([90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md)); receiver UX
Phase A + B and manager Phase A + B have passed the [85](85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md) gate;
single-node topology is recorded; and [99](99_QUALITY_SCORECARD_AND_SIGNOFF.md) returns **Go/Conditional-Go**.
**GA adds:** durable throttle, realtime feed (if chosen), snapshot-scale budgets met, e-signature decision,
and the response-rate metric trending up in beta.

Links: backlog [70](70_CONSOLIDATED_FINDINGS_AND_BACKLOG.md) · decisions [71](71_OPEN_DECISIONS_REGISTER.md)
· execution [91](91_FORWARD_EXECUTION_PLAN.md) · scorecard [99](99_QUALITY_SCORECARD_AND_SIGNOFF.md) · id
registry [75](75_FINDING_ID_REGISTRY.md).
