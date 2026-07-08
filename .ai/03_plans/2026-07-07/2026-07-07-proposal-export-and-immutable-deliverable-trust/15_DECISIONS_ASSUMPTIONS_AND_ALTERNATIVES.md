# 15 — Decisions, Assumptions, and Alternatives

## Decisions

### DEC-ARCH-1 — One shared trust ledger (`proposal_deliverable_packages`)
- **Problem:** two surfaces (XLSX, snapshot) need immutability + checksum + audit; separate ledgers
  fragment the trust story.
- **Options:** (A) one shared table; (B) two per-surface tables.
- **Advantages (A):** single audit narrative, one checksum shape, future cross-surface content
  binding, one repository to harden.
- **Disadvantages (A):** `package_kind` discriminator; slightly wider rows.
- **Recommended: A.** Reason: trust is a cross-cutting concern; fragmentation is the bigger cost.
- **Rejected alternative (B):** would require two repositories, two audit queries, no path to bind
  an XLSX to a snapshot later.
- **Conditions to revisit:** if XLSX and snapshot diverge into unrelated trust models.

### DEC-STORE-1 — Threshold-based R2 storage; reuse `ARCH_UPLOADS_R2` with a key prefix
- **Problem:** small exports don't need R2; large ones do.
- **Options:** (A) always R2; (B) threshold R2; (C) separate R2 binding.
- **Recommended: B with reuse of `ARCH_UPLOADS_R2` + `proposal-deliverables/` prefix.** Reason:
  free-tier-friendly; no new binding; small exports stay simple (checksum-only or D1-inline bytes
  decision below).
- **Inline bytes vs checksum-only for small packages:** **Recommended: checksum-only + the ability
  to regenerate** (XLSX bytes are reproducible from saved estimate data; snapshot JSON is in
  `project_publications.snapshot_json`). Storing bytes inline in D1 risks row-size bloat. So small
  package rows store `content_sha256` + `storage_ref=null` (regenerable); large rows store R2 ref.
  Trade-off: if source data changes, regeneration reproduces the **same bytes** (deterministic
  builder + canonical JSON) → same hash. **Caveat:** the XLSX builder must be deterministic
  (timestamps embedded!). **Sub-decision DEC-STORE-1a:** the XLSX `generatedAt` and any
  non-deterministic fields must be fixed at package-creation time and stored, so regeneration
  reproduces identical bytes. DISCOVERY: audit `xlsx-workbook.ts` for non-determinism (e.g.,
  creation timestamps in docProps) and freeze them.
- **Conditions to revisit:** if regeneration is proven non-deterministic and cannot be frozen,
  store bytes (R2 for all).

### DEC-FORMAT-1 — XLSX + JSON snapshot trust-bearing; PDF deferred (BLOCKED-EXTERNAL)
- **Problem:** PDF mentioned in brief ("PDF/XLSX decision points"); no renderer/licensing decided.
- **Options:** (A) pick a renderer now; (B) defer PDF, define its contract.
- **Recommended: B.** Reason: renderer choice (and any licensing/cost) is an owner decision; the
  trust mechanics are format-agnostic. The `package_kind='pdf'` seam is defined so a future PDF
  slots in.
- **Owner:** Philip. **Unblock:** owner selects renderer (e.g., a Workers-compatible PDF lib or a
  render service) and approves any cost.
- **Conditions to revisit:** when owner is ready for PDF.

### DEC-STREAM-1 — Three-band size path (inline / stream / async-queue)
- **Problem:** whole-buffer-in-memory + all-or-nothing 413 is unreliable near caps.
- **Options:** (A) always inline; (B) always async; (C) banded.
- **Recommended: C.** Reason: small exports don't justify job overhead; large ones need it.
  Thresholds from measurement (T3.0).
- **Rejected:** (A) fails near caps (existing risk); (B) over-engineers small exports.

### DEC-SIG-1 — SHA-256 content binding, not PKI/qualified e-signature
- **Problem:** should "approval" be a legally binding e-signature?
- **Options:** (A) PKI/qualified signature; (B) SHA-256 content binding + existing
  `signature_intent_hash`.
- **Recommended: B.** Reason: PKI needs key management, identity vetting, legal framework — out of
  scope. SHA-256 proves *what* was approved; the intent hash binds *who/when*. Sufficient for
  "trustworthy enough for real client review."
- **Conditions to revisit:** if a legal e-signature requirement arises.

### DEC-LINK-1 — Do not redesign publication UX; link to the publication pack
- **Problem:** brief says don't conflate publishing UX with file-integrity.
- **Decision:** keep Publisher drawer / `/share` UX shape; this plan adds trust mechanics + a small
  panel/notice only.

### DEC-HASH-1 — Hash the delivered bytes (XLSX) / canonicalized JSON (snapshot)
- **Problem:** hash the model or the bytes?
- **Recommended: bytes.** The recipient receives bytes; the hash must cover what they receive. For
  snapshots (JSON), canonicalize key order first so the hash is reproducible.
- **Rejected:** model hashing — divergence between model and serialized bytes.

### DEC-RECV-1 — Recipient XLSX download is an optional, gated slice (not core)
- **Problem:** recipients today view JSON only; should they download XLSX?
- **Recommended: optional, P2, gated.** The core trust ledger works for the JSON snapshot. A
  recipient XLSX download (with the same checksum guarantee) is a future slice if product wants it.

## Assumptions

- ASSUMP-1: free-tier Cloudflare cost posture (no paid add-ons without owner approval).
- ASSUMP-2: `UPLOAD_JOBS_QUEUE` consumer can host a `proposal_export` kind (DISCOVERY T3.2).
- ASSUMP-3: Web Crypto `crypto.subtle.digest` SHA-256 available in Worker runtime (standard).
- ASSUMP-4: `maxDuration=60` for the route; Queue jobs have their own limits (confirm at impl).
- ASSUMP-5: recipients do not download XLSX today; recipient XLSX is optional (DEC-RECV-1).
- ASSUMP-6: the XLSX builder can be made deterministic (or its non-determinism frozen at package
  time) per DEC-STORE-1a (DISCOVERY).
- ASSUMP-7: existing rate-limit + CSRF + token primitives are sufficient (no new auth primitive).

## Open decisions (OPEN-*)

- OPEN-1: exact internal-field token allowlist (DISCOVERY T0.4, owner review).
- OPEN-2: `source_estimate_revision` field (DISCOVERY T1.1).
- OPEN-3: perf thresholds (DISCOVERY T3.0).
- OPEN-4: PDF renderer (BLOCKED-EXTERNAL, DEC-FORMAT-1, owner).
- OPEN-5: orphan R2 reconcile strategy (DISCOVERY T4.4).
- OPEN-6: whether to store small-package bytes inline or rely on regeneration (DEC-STORE-1a;
  DISCOVERY determinism).
