# 15 — Decisions, Assumptions, and Alternatives

---

## Decisions

### DEC-MOBILE — Mobile reachability strategy
- **Problem:** sender surface blocked below 768px.
- **Options:** A (full mobile layout), B (desktop guard + deep link + copy-URL), C (hybrid).
- **Recommended:** **B**.
- **Rationale:** aligns with `DESIGN.md:519-524`; cheapest; honest; recoverable; reuses `readDrawerIntent`; safer for destructive actions.
- **Owner-delegated planning decision** (Philip retains final say). Conditions to revisit: beta signal that owners primarily send from phones.
- **Rejected alternatives:** A (cost/divergence from DESIGN.md; cramped destructive actions), C (two mental models; more test surface).

### DEC-ARCH-1 — Keep CSS 768px guard
- Improve the message + add copy-URL + advertise deep link. SSR-safe; no hydration risk. Rejected: JS `useIsMobile` hook (hydration risk, second source of truth).

### DEC-ARCH-2 — No migration, no binding, no store, no cache layer
- Minimal additive change. Rejected: new Zustand store (unnecessary abstraction), mirrored roster into TanStack Query (cache-coherence risk).

### DEC-ARCH-3 — Serialize shared-file edits with workflow pack
- Workflow pack lands first (gate/message/labels), this pack rebases state/a11y/clarity on top. Rejected: merging scope into workflow pack (distinct concern; PROMPT scopes it here).

### DEC-LABELS-1 — Consume workflow-pack honest delivery labels
- This pack does not invent delivery labels; it consumes the workflow pack's (REL-01 honest-`sent`). Graceful fallback label if not yet landed.

### DEC-SCOPE-1 — Confirm-client-access is owner-visibility, not a new action
- `openRecipientProposalAction` is the recipient bridge (existing). This pack surfaces access status to the owner; no new owner action created.

---

## Assumptions (from `02`, validated status)

| ID | Assumption | Status |
|---|---|---|
| ASSUMP-1 | Sender backend fully wired (not stubbed) | VALIDATED (evidence) |
| ASSUMP-2 | Mobile block is pure CSS, no JS media hook | VALIDATED (evidence) |
| ASSUMP-3 | Cloudflare Email is the only live provider; `resend_*` legacy | VALIDATED (evidence) |
| ASSUMP-4 | `delivery_status` can't flip to bounced/opened/responded from provider (no webhook) | VALIDATED (evidence; = workflow pack REL-01) |
| ASSUMP-5 | Philip accepts a documented desktop guard for heavy parts | PARTIAL → DEC-MOBILE (owner-delegated) |
| ASSUMP-6 | Workflow pack's Phase-6 changes will land before this pack's shared-file edits | TREATED AS DEPENDENCY (serialize) |

---

## Alternatives considered (cross-cutting)

| Decision point | Chosen | Rejected | Why rejected |
|---|---|---|---|
| Mobile strategy | Option B guard + recovery | Option A full layout | cost, DESIGN.md divergence, destructive-action safety |
| | | Option C hybrid | two mental models, more tests |
| Mobile detection | CSS guard (keep) | JS `useIsMobile` | hydration risk, dual source of truth |
| Sender state owner | TanStack Query + local state (keep) | new Zustand store | unnecessary abstraction |
| Roster data | RSC + router.refresh (keep) | mirror into TanStack Query | cache-coherence risk |
| Migration | none (delegate `0037` to workflow pack) | new migration here | migration-number collision; workflow pack owns the columns |
| Delivery labels | consume workflow pack | invent here | duplication; single source of truth |
| Scope boundary | own device-operability + sender-clarity + owner error/recovery/audit-proof/a11y | merge into workflow pack | distinct concern; PROMPT scopes here |
| "Copy URL" content | page URL (no raw token) | raw share link | security (`08`) — page URL has no credential |
