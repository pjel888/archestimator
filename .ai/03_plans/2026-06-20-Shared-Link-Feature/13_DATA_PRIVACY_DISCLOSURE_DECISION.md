# 13 — Data Privacy & Disclosure Decision (DPIA-style record)

Date: 2026-06-21 · Status: **DECISION RECORD (DPIA) — substance behind D2/D3 in [71](71_OPEN_DECISIONS_REGISTER.md); awaiting privacy-owner sign-off**

This is the field-by-field record of exactly what money/PII data the bearer-link public surface
discloses **by design**, why, and what the redaction fallback is if a field is judged a leak. It is
the evidence layer under owner decisions **D2** (expose exact `project.location`?) and **D3** (expose
`clientName` / totals / public IDs?) and the threat-model entries in [12](12_THREAT_MODEL_STRIDE.md).

**Canonical binding:** all finding ids / severities / statuses are bound to
[`75_FINDING_ID_REGISTRY.md`](75_FINDING_ID_REGISTRY.md). If this doc disagrees with 75, **75 wins**.
The findings this doc is built on:

- **SEC-SHARE-07** (P3, **Decision**) — public snapshot exposes exact `project.location`. → **D2**.
- **SEC-SHARE-04** (P2, **Fixed**) — keyed-HMAC telemetry hashes (pepper) vs unsalted log hashes. → telemetry-privacy section.
- **SEC-SHARE-10** (P3, **Fixed**) — OpenGraph `description` previously leaked proposal total + `clientName` on no-password links. `generateMetadata` now returns generic public/protected metadata without resolving the proposal snapshot. Surfaced by this doc; minted as the canonical id in [75 §1](75_FINDING_ID_REGISTRY.md). D3 remains only for broader in-page public disclosure policy.
- (Public-UUID / in-page totals/clientName exposure is the **D3** decision surface, not a separately-minted defect, until the owner rules otherwise.)

---

## 1. Threat model framing (what "public" means here)

The `/share/[token]` surface is a **bearer-capability** surface: possession of the unguessable token
(optionally + password) is the authorization. So "currently public?" below means **"visible to anyone
holding the link"** — and, for the OpenGraph case, **"visible to any link-preview crawler / chat
unfurl that the link is pasted into, with no token-secrecy assumption once pasted."** That OG path is
the single most privacy-sensitive disclosure because it can fan a money figure + client name out to
Slack/iMessage/WhatsApp previews the moment the link is shared.

Source-verified disclosure surfaces:
- In-page receiver render: `SharePageProposalHeader.tsx`, `SharePageSummaryCard.tsx`, hero, tree/grid.
- Snapshot build (what is captured at publish): `src/lib/publication/actions.ts:438-471`, shaped by
  `src/lib/publication/snapshot.ts` and typed by `src/lib/publication/types.ts:100-117`.
- **OpenGraph metadata** (`src/app/share/[token]/page.tsx`) — password-gated and non-password links now return
  generic metadata (`protectedPublicationMetadata` / `publicPublicationMetadata`) without proposal snapshot
  resolution, totals, or client name.

---

## 2. Field-by-field disclosure table

Severity strictly P0–P3, bound to [75](75_FINDING_ID_REGISTRY.md). "Currently public?" = reachable on
the bearer-link surface as committed today.

| Field | Source (file:line) | Currently public? | Rationale: intended proposal context vs leak | Recommended default | Redaction fallback |
|---|---|:--:|---|---|---|
| **Proposal grand total** (`totalCost`) | `types.ts:115`; built `snapshot.ts:290`; rendered `SharePageSummaryCard.tsx:64`; OG now generic in `page.tsx` | **Yes** (in-page only; OG fixed) | **Intended** in-page — the proposal's whole purpose is to show the client the price. The prior OG leak path is fixed under **SEC-SHARE-10**. | **Keep in-page; keep money out of OG description.** | OG desc stays neutral ("A client proposal is available for review."). |
| **Per-estimate / per-tab totals** (`PublicationSnapshotEstimate.totalCost`, `…EstimateTab.totalCost`) | `types.ts:81,90`; `snapshot.ts:198,258` | **Yes** (in-page) | **Intended** — line-item breakdown is the proposal. | Keep. | n/a (in-scope by design). |
| **Row totals** (`rowTotal`) | `types.ts:67`; computed `snapshot.ts:62-69,80` | **Yes** (in-page) | **Intended.** Note: snapshot stores **only** `rowTotal`, never raw `unitCost`/`miscCost`/`contingencyPercentage` — those are dropped in `buildSnapshotRow` (`snapshot.ts:71-87`) and stripped from legacy snapshots (`sanitizeSnapshotRow`, `snapshot.ts:95-110`). Cost-structure (margin) is **not** disclosed. | Keep; keep cost-component stripping. | If a future field re-adds components, gate behind a "show pricing detail" publish toggle. |
| **Quantities / units** (`quantity`, `unit`) | `types.ts:65-66`; `snapshot.ts:78-79` | **Yes** (in-page) | **Intended** — scope of work. | Keep. | n/a. |
| **Estimate names / sheet codes** (`name`, `sheetCode`) | `types.ts:88-89`; `snapshot.ts:254-255`; tree `types.ts:53` | **Yes** (in-page) | **Intended** — labels the proposal sections. Low PII. | Keep. | n/a. |
| **`clientName`** | `types.ts:107`; captured `actions.ts:444`; rendered `SharePageProposalHeader.tsx:9`, `SharePageSummaryCard.tsx:51`; OG now generic in `page.tsx` | **Yes** (in-page only; OG fixed) | **Intended** in-page ("Prepared for {clientName}"). The prior OG leak path is fixed under **SEC-SHARE-10**. PII-adjacent (a person/org name). | **Keep in-page; keep client name out of OG description.** | In-page redaction not recommended (defeats the proposal) unless D3 owner policy changes. |
| **`project.location`** (exact address / GPS-precise) | `types.ts:108`; captured `actions.ts:445`; rendered `SharePageProposalHeader.tsx:11` | **Yes** (in-page) | **Decision (SEC-SHARE-07).** Exact site address can be sensitive (private residence, undisclosed site). Whether the client needs the **exact** address on a shareable bearer link, or a coarse locality, is the owner call. | **D2 ruling required.** Recommended interim: **coarse locality** (city/area) unless owner affirms exact address is required. | Truncate to locality at publish in `actions.ts:445` (e.g. strip to last 1–2 comma segments) **or** gate exact address behind a publish toggle. No GPS/lat-long is in the snapshot type today (verified: `types.ts:103-112` has no coordinate field). |
| **Public DB UUIDs** (`project.id`, `estimate.id`, `row.id`, `node.id`, `tab.id`) | `types.ts:104,87,60,52,75`; copied verbatim `snapshot.ts:73,253,142,194` | **Yes** (in-page DOM / snapshot JSON) | Internal opaque identifiers. **Not** secrets (no auth derives from them), but they leak internal record structure and enable cross-referencing if any other surface ever keys on a raw project UUID. | **D3:** ratify exposing internal UUIDs **or** emit per-snapshot opaque ids. Low severity; default = ratify for beta. | If ratified-against: hash ids per snapshot (e.g. `act_…` pattern already used at `activity/route.ts:57`) so no raw `projects.id` reaches the DOM. |
| **Cover image** (`coverImageUrl`) | `types.ts:111`; captured `actions.ts:448-451`; normalized `snapshot.ts:117,279` | **Yes** (in-page hero) | **Intended** — branding/hero. Risk only if the project image itself embeds sensitive content (site photo). | Keep; rely on owner-chosen image. | Publish-time toggle to omit cover; OG image is already deliberately **not** emitted (`page.tsx:316-321`). |
| **Prepared date** (`generatedAt`) | `types.ts:102`; set `actions.ts:439` (`new Date().toISOString()`); rendered `SharePageSummaryCard.tsx:14-17,52` | **Yes** (in-page) | **Intended** — "Prepared on" gives the proposal recency context. Negligible PII. | Keep. | n/a. |

---

## 3. Telemetry-hash privacy & log-vs-DB parity (SEC-SHARE-04)

**Status: Fixed** (bound to [75 §1, SEC-SHARE-04](75_FINDING_ID_REGISTRY.md)). Captured here because
it is the PII story for the **observer** side (who-opened-what), not the recipient-facing render.

- **DB telemetry columns** (`ip_hash`, `user_agent_hash` in `project_publication_events` /
  `shared_link_events`) are written via **keyed HMAC-SHA256 with a server-only pepper** —
  `hashPublicTelemetryValue` → `hashRequestValue` → `createHmac("sha256", readTelemetryHashPepper())`
  (`public-repository.ts:184-191`). Pepper resolves
  `ARCHESTIMATOR_TELEMETRY_HASH_PEPPER` else falls back to the publication token-hash secret
  (`public-repository.ts:176-178`). This makes a stored IP hash **non-reversible without the secret**
  (an unsalted `sha256(ip)` over the small IPv4 space is rainbow-table-recoverable — the documented
  rationale at `public-repository.ts:169-175`).
- **Parity check — DB writers MUST use the peppered path.** Recipient comment/decision routes hash IP
  via `hashPublicTelemetryValue` (`comment/route.ts:14,67`; `decision/route.ts:14,32`) → peppered. ✅
- **Rate-limit keys are intentionally NOT the same thing.** `hashPublicationRateLimitKey`
  (`actions.ts:867-871`) and `hashRateLimitKey` (`public-repository.ts:278-282`) use a **bare**
  `createHash("sha256")` over the IP. This is **acceptable**: the value is an ephemeral throttle-bucket
  key, never persisted as a PII telemetry column, never logged. **Acceptance:** a bare-sha256 IP hash
  is permitted **only** for rate-limit bucketing; it must **never** be written to `*_hash` telemetry
  columns or to logs (enforced narratively at `public-repository.ts:180-183`).
- **Log parity:** the only public-route log on the snapshot GET path is an error string with **no IP**
  (`page.tsx:70` — `console.error("[publication] Failed to record public snapshot open event", error)`).
  **No raw IP or unsalted IP hash is emitted to logs** on this path. ✅

**Verification gate (binary pass/fail):**

```bash
# PASS = no DB *_hash write or log statement uses a bare createHash over an IP outside the
# sanctioned rate-limit helpers. Inspect every hit; any ip_hash/user_agent_hash assignment
# fed by createHash("sha256") (not hashPublicTelemetryValue) is a FAIL.
rg -n "ip_hash|user_agent_hash|createHash\(\"sha256\"\)" src/lib/publication src/app/api/share
bun run type-check
```

---

## 4. Acceptance criteria (per decision)

### AC-PRIV-01 — OG money/PII suppression (binds **SEC-SHARE-10** / D3; SEC-SHARE-04 telemetry pattern reused for stub copy)

- **Given** a published, **non-password** shared link, **When** its URL is unfurled by a link-preview
  crawler, **Then** the OpenGraph `description` MUST NOT contain the proposal total or `clientName`.
- Target: `src/app/share/[token]/page.tsx:314` (and the `openGraph.description` at `:327`).
- Gate (**pass/fail**): the rendered metadata for a no-password link contains neither the formatted
  money string nor the client name.
- Verify:
  ```bash
  bunx vitest run src/app/share --maxWorkers=1   # add/extend a generateMetadata test
  rg -n "formatMoney|clientName" 'src/app/share/[token]/page.tsx'   # confirm not in the OG desc path
  ```
- Owner-lane: **Security/Privacy**. Status until owner rules **D3**: **Open — Decision-gated**.

### AC-PRIV-02 — `project.location` precision (binds D2 / SEC-SHARE-07)

- **Given** the owner has ruled **D2**, **When** a snapshot is built, **Then** `project.location`
  reflects the ruled precision: exact address (ratify) **or** coarse locality (redact at
  `actions.ts:445`).
- Target: `src/lib/publication/actions.ts:445`; render unchanged at `SharePageProposalHeader.tsx:11`.
- Gate (**pass/fail**): snapshot `project.location` matches the D2 ruling for a fixture project; no
  coordinate/GPS field is ever added to `ProjectPublicationSnapshot["project"]` (`types.ts:103-112`).
- Verify:
  ```bash
  bunx vitest run src/lib/publication --maxWorkers=1
  bun run type-check
  ```
- Owner-lane: **Security/Privacy** + **Backend**. Status: **Open — Decision-gated (D2)**.

### AC-PRIV-03 — public-ID ratification (binds D3)

- **Given** the owner ratifies raw UUID exposure (default for beta), **When** a snapshot renders,
  **Then** this DPIA records the ratification and no change ships. **Else** ids are hashed per-snapshot
  before reaching the DOM/JSON.
- Target (if redacting): `src/lib/publication/snapshot.ts` id copies (`:73,253,142,194`).
- Gate (**pass/fail**): decision recorded in [71](71_OPEN_DECISIONS_REGISTER.md); if redacting,
  no raw `projects.id` appears in the share-page DOM snapshot.
- Verify: `bunx vitest run src/lib/publication --maxWorkers=1`
- Owner-lane: **Security/Privacy**. Status: **Open — Decision-gated (D3)**.

---

## 5. Residual / UNVERIFIED

- **UNVERIFIED:** whether any non-`/share` public surface ever keys auth or lookup on the raw
  `projects.id` exposed here (would elevate AC-PRIV-03). Verify:
  `rg -n "projects\\b.*\\bid\\b" src/app/api | rg -i "public|share"`.
- **UNVERIFIED:** that no future OG-image work re-introduces a service-role `projects` read on the
  public route (the current omission is deliberate — `page.tsx:316-321`). Re-check on any OG-image PR.

---

## 6. Privacy owner sign-off

This DPIA is the disclosure record of record for the bearer-link surface. The decisions D2 (location
precision) and D3 (totals / clientName in OG, public IDs) are **owner calls** tracked in
[71](71_OPEN_DECISIONS_REGISTER.md); the threat framing is in [12](12_THREAT_MODEL_STRIDE.md).

- **Privacy owner sign-off:** ______________________  **Date:** __________  **D2 ruling:** ______  **D3 ruling:** ______
  (Signature attests the public-by-design fields above are accepted, and AC-PRIV-01..03 gates are accepted as the conditions of release.)
