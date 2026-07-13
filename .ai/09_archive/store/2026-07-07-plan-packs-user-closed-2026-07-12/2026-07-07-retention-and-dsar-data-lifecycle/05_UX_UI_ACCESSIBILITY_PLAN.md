# 05 — UX, UI, and Accessibility Plan

The retention engine itself is a backend cron surface with **no user-facing UI**. The user-facing surface in this scope is the **admin triage/console** for DSAR requests. The public DSAR intake already exists (anonymous POST) and has no UI (it is a programmatic form/endpoint). Therefore this document focuses on:

1. The **admin DSAR triage console** (new) — list, read, transition, export, erasure.
2. The **operator retention dashboard** (new, read-only) — cron health, backlog, R2 purge queue.
3. Reuse of existing `src/components/ui/` primitives (no ad hoc UI).

`DESIGN.md` is alpha-stage guidance; defer to Philip on visual decisions. Routine admin-console UX leans on existing workshop admin patterns + `DESIGN.md` tokens without loading a full design workflow.

---

## §1. Primary user journeys

### Journey A — Admin triages a DSAR request
1. Admin signs in (platform-admin role; existing Better Auth session).
2. Opens `/workshop/admin/privacy-requests` (new route; protected).
3. Sees a queue: `submitted` (new) requests first, then `in_triage`/`in_progress`, then `completed`/`rejected` (paginated, status filter).
4. Selects a request → detail drawer/page: requester (hashed email, name, user_id if known), kind, description, metadata, created_at, workspace (if known).
5. Admin transitions status: `submitted → in_triage` (claim), `in_triage → in_progress`, `in_progress → completed | rejected`. Each transition requires a reason (textarea) and is audited.
6. For `access`/`portability`: admin clicks **Build export** → package built → signed download URL (short TTL) or in-app download.
7. For `erasure`: admin clicks **Begin erasure** → typed confirmation phrase dialog (mirrors `validateTypedConfirmationPhrase` from mass-deletion) → propagation runs → receipt + audit.

### Journey B — Operator monitors retention health
1. Operator opens `/workshop/admin/retention` (new route; protected, platform-admin or operations role).
2. Sees: last cron run per class, rows affected, error-skip count, backlog estimate, R2 DSAR purge queue, DSAR queue depth.
3. Reads the runbook inline (collapsible) for incident classes (cron failure, erasure failure, R2 purge failure, legal-hold conflict).

### Journey C — Data subject submits a request (existing, unchanged)
- Public intake at `/api/compliance/privacy-requests` (programmatic) or via `support@archestimator.com` (mailto). No new public UI in this scope. Self-serve portal is out of scope (separate epic).

---

## §2. Screen and component states

### Admin DSAR console
| State | Behavior |
|---|---|
| Loading | Skeleton rows (existing skeleton primitive); route `loading.tsx`. |
| Empty | "No privacy requests" with filter reset. |
| Success (transition) | Toast + row status update; audit row written. |
| Validation error | Inline error on reason field; no transition. |
| Auth denied | 403/404 page (existing pattern); no queue access for non-admins. |
| Conflict (illegal transition) | Inline error: "Request is no longer in <expected status>." |
| Erasure confirmation | Modal with typed phrase input; disabled until phrase matches; "destructive" styling (existing). |
| Export building | Disabled button + spinner; rate-limit aware. |
| Export ready | Download link with TTL countdown. |
| Offline/degraded | Existing error boundary; retries on refocus. |

### Operator retention dashboard
| State | Behavior |
|---|---|
| Loading | Skeleton cards. |
| Healthy | Green indicators per class; last-run timestamp. |
| Attention | Amber: error-skip count > 0 but below critical; backlog > warning threshold. |
| Critical | Red: cron not run in > 36h, or error-skip above critical, or R2 purge backlog > threshold (mirrors `buildUploadCleanupOperationalSnapshot` thresholds). |
| Empty/no data | "No runs yet" for a new deploy (expected pre-30-day-gate). |

---

## §3. Accessibility

- **Keyboard path**: full keyboard operability for queue table (row focus + Enter to open detail), transition buttons, confirmation modal (focus trap + restore on close, existing dialog primitive).
- **Focus order**: queue → filter → detail drawer → action buttons → modal.
- **Focus restoration**: after a transition toast, focus returns to the affected row.
- **Screen-reader semantics**: table roles for the queue; `aria-live` polite region for toasts; status chips use `aria-label` (e.g., "Status: in triage"); modal uses existing Dialog primitive with labelledby.
- **Headings**: one `h1` per page; section `h2` for queue / detail / dashboard sections.
- **Non-color cues**: status chips carry an icon + text label, not color alone.
- **Color contrast**: use existing token palette; no new ad-hoc colors.
- **Reduced motion**: existing `prefers-reduced-motion` handling in primitives; no new animation.
- **Copy hierarchy**: destructive actions (erasure) use clear, non-jargon copy: "This will permanently anonymize the user's data across all workspaces. Type the phrase to confirm."

---

## §4. Responsive behavior
- Admin console is a workshop surface; optimize for desktop (existing workshop layout). Tablet: stack detail drawer to full-width. Mobile: read-only summary (transitions disabled on narrow viewports to prevent accidental destructive action, with a "use desktop" note).

---

## §5. Design-system reuse (no ad hoc primitives)
- Table/List → existing `src/components/ui/` table or list primitive.
- Status chip → existing Badge/Tag.
- Modal/dialog → existing Dialog.
- Toast → existing toast/sonner.
- Skeleton → existing skeleton.
- Buttons → existing Button with `variant="destructive"` for erasure.
- Forms (reason textarea, confirmation input) → existing form primitives.

No Storybook/visual QA is a default gate for this admin surface (proportional verification policy). Targeted DOM tests + keyboard/focus tests suffice; browser proof reserved for the confirmation-modal focus-trap if static review is insufficient.

---

## §6. UX regressions to avoid
- Do not expose raw PII (emails/IPs) in the admin UI; show hashes + masked requester name only (the repo already stores hashes).
- Do not allow erasure without a typed confirmation phrase (mirrors mass-deletion safety).
- Do not show the operator dashboard to non-admins.
- Do not auto-refresh the queue in a way that resets the admin's in-flight transition (use TanStack Query invalidation after action, not polling that clobbers form state).

---

## §7. User-facing documentation implications
- Privacy notice (`/privacy`) should describe the DSAR process + SLA once `OPEN-DEC-002`/`OPEN-DEC-007` resolve. **Not** updated by this planning pack (content is a legal decision).
- Support/contact page already points to `support@archestimator.com` for deletion/export requests (existing).
- No new public-facing copy in this scope.
