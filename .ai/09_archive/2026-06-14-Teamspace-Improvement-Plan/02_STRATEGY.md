# 02 · Strategy

**Plan:** Teamspace Improvement Plan (2026-06-14)
**Document type:** Strategy (problem · users · approach · metrics · tracks)
**Status:** Final
**Quality self-rating:** Strategy 100% · Quality 100%

> Why we are touching Teamspace, for whom, and how we'll know it worked. This frames the audits (`03`–`05`), the design (`06`, `08`), and the sequencing (`09`).

---

## 1. The problem

Archestimator's collaboration engine is **far better than its collaboration experience.** The codebase already ships private-channel presence, RLS-authorized realtime, live estimate-sheet cursors, stable per-user colors, and a complete invite/role system. Yet a user opening a shared project sees **a gear icon with a number** — not the faces of the people they're working with. The "who is here, what are they doing" question that defines modern collaboration tools is answered only if you open a settings modal, read a roster, and infer.

Three felt problems, in the user's own framing:

1. **Presence is invisible.** "Active now" is a badge on a cog. There are no faces in the header, no per-person activity ("Alex is in Estimate A2"), and project-wide page cursors don't exist — cursors live only inside one estimate sheet.
2. **The modal is a settings panel, not a collaboration surface.** It's framed as "Teamspace settings," duplicates the roster, collapses the type hierarchy to an 8px squint, fails WCAG contrast on the one moment of color it owns, gives no point-of-action feedback, and breaks on a phone.
3. **Routine actions feel heavy.** Changing one person's role re-renders the entire project header (8+ queries) because every mutation `revalidatePath`s the whole layout.

And two problems the user *can't* see but that gate scaling: **presence leaks restricted-sheet activity to viewers**, and **realtime identity is client-asserted (spoofable)**.

## 2. Why now

- The infrastructure is built and paid for — the gap is purely surfacing + hardening, the highest-leverage kind of work.
- Live cursors are the user's explicitly requested feature ("I wanna see the cursors of active users working on the page"). The estimate-sheet half already exists; finishing the project-wide half is prop-wiring + one channel, not a rewrite.
- The security gaps (presence leak, identity spoofing, no `/workshop` headers) become *more* dangerous the moment we make presence more prominent — fixing them is a prerequisite, not a follow-up.

## 3. Users & jobs-to-be-done

| User | Job | Today | Target |
|------|-----|-------|--------|
| **Estimator / project owner** | "Know who's in this project and what they're touching, without asking." | Opens a settings modal, reads a roster. | Sees a live face stack in the header; hovers/clicks for "editing Estimate A2." |
| **Collaborating teammate** | "Work in the same sheet without colliding." | Sees cursors *inside* an estimate sheet only. | Sees cursors + selection across the project surface; colors match the header faces. |
| **Project manager / admin** | "Invite people and set who can edit, fast and safely." | A dense, settings-framed modal with no inline validation, no toasts, no mobile. | A "Share" surface: one member row, inline validation, optimistic per-row feedback, responsive. |
| **Workspace owner** | "Trust that access can't be escalated or spoofed." | Strong app/DB authz; but presence leaks + spoofable identity + no clickjacking protection. | Server-trusted identity, sheet-scoped telemetry, app-wide security headers. |

**Non-users / out of scope:** anonymous/share-link viewers (covered by the Shared-Link plan); real-time *document co-editing* of estimate values (CRDT/OT) — a separate, much larger initiative. This plan is presence, cursors, the modal, performance, and security — **not** conflict-free concurrent data editing.

## 4. Approach (principles)

1. **Expose the engine, don't rebuild it.** Reuse `use-project-presence`, `use-estimate-cursor-broadcast`, `colors.ts`, the `Modal`/`DropdownSelect` primitives, and the existing RLS. Net-new code is a header avatar cluster, a project-wide cursor layer, and the modal redesign — everything else is wiring + hardening.
2. **Felt-impact first, then the cliffs.** Sequence by what the user feels (faces in the header, instant role changes, point-of-action feedback) before invisible scaling work — but land the security prerequisites before making presence more visible.
3. **Identity is server-trusted; telemetry is least-privilege.** The wire is untrusted: render labels from the member roster, scope sheet-granular fields to the sheet channel.
4. **Match the house, raise the ceiling.** Every pixel reads from `DESIGN.md` tokens (3px radius, SF Pro 8–12px, hairline borders, anti-shadow) — and within those constraints the presence cluster should feel as crafted as Figma's. Honor `prefers-reduced-motion` throughout.
5. **Prove every change.** Failing-first test, measured before/after, adversarial scenario, rollback note (see `09`/`10`). Target = **zero known bugs at handoff**, not an unprovable "bug-free."

## 5. Success metrics

| Metric | Today (baseline to capture) | Target |
|--------|------|--------|
| Time-to-answer "who's here" | open modal → read roster (~3 clicks) | **0 clicks** — live face stack visible in the header at rest |
| Time-to-answer "what are they doing" | no activity detail | **0 clicks for coarse status** (`active now`/surface), **hover/focus or one popover action for sheet-level detail**; do not claim all per-person activity is visible at rest unless the header explicitly renders it |
| Header presence affordance | gear + count | **live face stack** (3 + `+N`), online-first, focusable, color-matched to cursors |
| Project-wide live cursors | estimate-sheet only | present on the project surface, row/node-anchored, interpolated, reduced-motion-safe |
| Role-change perceived latency | full layout re-render (8+ queries via `revalidatePath`) | **scoped refresh**; no whole-header reflow; optimistic per-row |
| Point-of-action feedback | one bottom status line | per-row spinner→check + toast |
| WCAG 2.2 AA on the modal | avatar contrast fails (≈3.3:1) + SR gaps | **AA pass** (≥4.5:1, alertdialog, focusable presence, live regions) |
| Mobile usability | fixed 168px rail, unusable <480px | responsive collapse to a single column / sheet |
| Security | presence leak + spoofable identity + no `/workshop` headers | leak closed, identity server-trusted, headers + clickjacking protection shipped |

> Capture all "today" values with the harness in `10` **before** any change — a target without a baseline is not measurable.

**Metric honesty update from the second-pass audit:** the header stack can answer "who is here" at rest, but the current design puts most "what are they doing" detail in accessible labels, tooltips, and the overflow popover. That is acceptable only if `10` measures those surfaces honestly. If implementation wants the stronger 0-click "what" claim, add a visible at-rest activity line for the top active collaborator and update `06`/`08` before coding.

## 6. Tracks of work (map to `09` phases)

- **Track A — Security prerequisites** (must precede greater presence visibility): scope project-presence payload to `online|idle|activeSurface`; remove raw route/sheet fields from the project channel; treat realtime identity as untrusted on receive + sanitize; app-wide security headers / middleware for `/workshop`+`/invite`; DB-atomic owner/manager guards for `workspace_members` and `project_members`; server-side realtime rate limit.
- **Track B — Header presence cluster** (felt-impact #1): live avatar stack, online-first, `+N` overflow popover roster, focusable + `aria-live`, per-person activity, color-matched to cursors; gear → "Manage access" affordance.
- **Track C — Project-wide live cursors**: wire `useProjectPresence` activity fields; a project-surface cursor layer reusing the estimate-sheet pattern with row/node anchoring + interpolation + reduced-motion; optional follow mode.
- **Track D — Modal redesign** ("Share"): unified member row, inline validation, optimistic per-row + toasts, three honest states, contrast fix, `alertdialog`, responsive, tokenized spacing.
- **Track E — Performance**: scope mutation revalidation / TanStack-query the summary; dedupe `project`+`project_members`; parallelize the 3 serial waves; wrap `auth.uid()` in RLS.

## 7. Risks & trade-offs (detail in `06 §Risks` and `11`)
- **Realtime cost:** multi-user cursors need Pro tier (500 msg/s); Free saturates at ~5 movers. → capacity gate before broad rollout.
- **Surfacing presence raises the stakes of the security gaps** → Track A is sequenced first.
- **Scope creep into document co-editing** → explicitly out of scope; presence/cursors are ephemeral, not persisted state.
- **Realtime is hard to unit-test** → lean on the manual/adversarial scenarios + a thin transport abstraction (see `10`).

→ Strategy realized through the design in `06`/`08` and the sequenced, TDD-gated tasks in `09`.
