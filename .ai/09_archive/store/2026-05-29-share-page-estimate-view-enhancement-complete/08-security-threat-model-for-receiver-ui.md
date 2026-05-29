# 08 — Security & Threat Model for Receiver UI Enhancements (Post-Audit Addition)
**Date:** 2026-05-29 (added during 2026-05-29 comprehensive audit)
**Status:** New additive document. Does not modify or delete any content in the original 8-document pack (particularly 00-readiness, 02-blast, or 07-validation).
**Rationale:** The predecessor V2 Shared Link Overhaul included a dedicated `05-security-privacy-auth-plan.md`. This enhancement pack (focused on client-side UI: donut, sub-tabs, reconstructed tree, floating nav) had no equivalent. Audit identified this as a material gap for a public receiver surface handling sensitive commercial estimate data.

---

## 1. Scope of This Model

Applies to all new or modified UI/rendering introduced by the enhancement while the existing V2 security posture (password gate, signed HttpOnly access cookies, CSRF on POSTs, in-mem rate limiting + lockout, CSP headers, no-store on API, metadata-only events, RLS on publication tables) remains unchanged and is **out of scope for modification**.

New attack surface introduced:
- Client-side D3 donut rendering (SVG from aggregated snapshot data).
- Recursive React tree rendering (`ShareEstimateTreeView` + node rows) from reconstructed virtual nodes.
- Floating nav + IntersectionObserver (scroll behavior).
- Per-sheet view mode state + derived memoized data (chart buckets, tree nodes).
- Image thumbnails (already present in Grid Preview; now also in Tree View rows).
- Any hover/focus/keyboard states on new elements.

---

## 2. Threat Model (STRIDE Lite for Read-Only Public Surface)

| Threat | Description | Likelihood (V1) | Impact | Existing Mitigations (V2) | New UI-Specific Mitigations Required | Status in Original Plan |
|--------|-------------|------------------|--------|---------------------------|--------------------------------------|-------------------------|
| **Spoofing** | Attacker crafts malicious share link or snapshot to impersonate legitimate publication. | Low | High (commercial data) | Token hash + encrypted recopy, password scrypt, signed cookies, recipient sessions. | None new (data still comes from server-resolved snapshot). Ensure reconstruction does not invent or alter source attribution. | Not addressed — add to 07 manual QA (M9 password gate + tree/donut after unlock). |
| **Tampering** | Client-side JS mutates rendered totals, labels, or structure to mislead client or owner. | Medium (client-controlled) | Medium (trust erosion) | Snapshot is immutable server JSON; all rendering is from that trusted blob. | 1. Treat all `description`/`designation`/`discipline` as untrusted text (escape/ React text only — already the case in sketches). 2. Never use `dangerouslySetInnerHTML` or raw HTML from snapshot fields. 3. Totals always derived from `rowTotal` (server-precomputed) — never re-sum in a way that could be visually overridden. | Implicit in "read-only" and existing table rendering. Make explicit in 03/05 code sketches + 07 a11y/keyboard tests. |
| **Repudiation** | Client claims "I never saw that line item" or "the total was different when I viewed". | Low | Medium (dispute) | `increment_project_publication_open` + password_attempt + comment/decision events (metadata only). Activity digest to owner. | Tree expand/collapse and donut hover are ephemeral UI state. If auditability of "what the client actually saw" is required later, snapshot the view state at decision time (future). For V1: no change. | Acceptable gap for V1. Log in 12-assumptions-decisions-log.md. |
| **Information Disclosure** | Snapshot rows leak more than intended (internal notes, supplier costs, etc.) via tree or chart labels. | Low (snapshot already curated by owner) | High | Owner selects which estimate sheets to include at publish time. Snapshot is whitelisted DTO. | 1. Reconstruction must not "unhide" rows or fields not present in the snapshot. 2. "Unassigned" / fallback groups must not imply data that wasn't published. 3. Image URLs remain the only external resource (already lazy + remotePatterns audited in V2 P9). | Not explicitly called out. Add to new 10-fidelity doc + 11-interaction matrix. |
| **Denial of Service** | Large snapshot (1000+ rows) or maliciously crafted designation strings cause excessive CPU/memory in aggregation or recursive tree render on client. | Low (typical <100 rows) | Low | None (public surface). | 1. Hard cap or graceful degradation in `aggregateRowsByDiscipline` and `reconstruct*` (e.g., if rows > 500, show "Large sheet — use Grid Preview" and skip heavy tree). 2. Memoize + avoid re-render storms on tab switch. 3. No deep recursion without depth limit (designations with 20+ ">" delimiters). | Plan 04 notes O(n) and "fast at this scale" — good. Add explicit DoS guard + measurement in 07 perf budget + P5. |
| **Elevation of Privilege** | None realistic — receiver has no authenticated write surface and cannot affect workspace data. | N/A | N/A | V2 authz (publication rows + events are service-owned or narrowly granted). | N/A | N/A |

---

## 3. Specific New UI Risks & Mitigations

1. **D3 SVG Injection via Labels:** `label` and `id` in `CostBucket` come from `discipline` strings in snapshot.
   - **Mitigation:** D3 text rendering uses standard SVG `<text>` (React/D3 will escape). Never construct `innerHTML` or `foreignObject` with raw data. Add unit test: malicious string ("<script>alert(1)</script>") renders as literal text.
2. **Tree Node Label Rendering:** Same as above for `description`, `designation`.
   - **Mitigation:** All rendering in proposed `ShareTreeNodeRow` and row items uses `{node.label}` / `{row.description}` in JSX text positions (safe).
3. **Image Thumbnails in Tree View:** New surface (previously only Grid).
   - **Mitigation:** Reuse existing `<Image loading="lazy" ...>` pattern + same remotePatterns. No new bucket or src construction.
4. **State/Observer Side Effects:** IntersectionObserver + scrollIntoView on floating nav.
   - **Mitigation:** Passive, read-only. No network or storage writes beyond existing sessionStorage for active tab. Clean up observers on unmount.
5. **Keyboard Focus Management:** New tree + sub-tabs + donut slices (focusable per 03 a11y).
   - **Mitigation:** Follow existing roving tabindex + arrow key patterns in SharePageTabs. Test with real screen reader (VoiceOver) in P5. ARIA live regions for tab/chart/tree changes (already planned in 03).

---

## 4. Required Additions to Existing Plan Docs (Additive Only)

- **07-validation-and-testing-plan.md §2.3 / §3:** Add explicit "Security & Injection" test cases (malicious label strings, large row counts, focus management).
- **07 §5 Performance Budget:** Add "Large snapshot DoS guard" measurement.
- **03-ux-ui-spec.md §4.6 / §8:** Add note under reconstruction: "All labels treated as untrusted text; no HTML interpretation."
- **05-component-architecture-plan.md §2.2:** In `ShareTreeNodeRow` and row item sketches, comment: "XSS-safe: values rendered as React children text only."
- **12-assumptions-decisions-log.md:** Record A11 (no new vectors beyond existing snapshot) + any owner decisions on future view-state auditing.

These will be executed as patches in the improvement session.

---

## 5. Owner / Legal / Compliance Note

The share receiver remains a **view-only commercial review surface**, not a signed contract or immutable record. Security posture is "best-effort transparency + owner-controlled snapshot curation" rather than formal e-signature / audit log of every pixel the client saw. This is consistent with V2 and the current proposal-package-system.md (which still treats issued proposals as future immutable snapshots).

If future legal requirements demand stronger non-repudiation of the exact view (e.g., "client saw these exact 47 line items with these exact totals"), that is a separate decision logged in 12- and would likely involve snapshotting the rendered view state at decision time.

---

**This document closes the security documentation gap identified in the 2026-05-29 audit.** It is additive and cross-references the original plan's "read-only" and "no new DB/API" constraints. Implementation must satisfy both the original plans and the mitigations here before any public exposure of the enhanced receiver.

See also: new `00-POST-AUDIT...md`, `09-ui-primitive...md`, `11-cross-feature-interaction-matrix.md` (when created), and V2's `05-security-privacy-auth-plan.md` for the unchanged foundation.