# Existing-Pack Overlap / Disposition Matrix

Every candidate finding ends in exactly one disposition. No accepted
requirement or unit has two active owners. A new unit is justified only when the
outcome, evidence boundary, or owned implementation surface is materially
different from an existing active unit.

## Disposition vocabulary

- `NEW_OWNER_HERE` — this pack owns it; no existing active pack covers the same outcome.
- `CROSS_REFERENCE_ACTIVE_PACK` — the existing pack already owns it; this pack points to it.
- `ALREADY_IMPLEMENTED` — source confirms it is already done; no unit needed.
- `REFUTED_OR_UNREACHABLE` — disproved or unreachable (see rejected-refuted-findings.json).
- `DEFERRED_TO_NAMED_STAGE_OR_OWNER` — out of scope for this pack; named owner.
- `EVIDENCE_BLOCKED` — couldn't be proven at HEAD (see coverage CSV).
- `HISTORICAL_ONLY` — historical provider artifact; not a current defect.

## Matrix

| Finding | Severity | Disposition | Active owner (if not here) |
|---|---|---|---|
| UX-BUILD-001 action-inbox async Server Actions compile break | Critical | NEW_OWNER_HERE | — |
| UX-LEAD-001 closed-beta gate POSTs to non-existent handler | Critical | NEW_OWNER_HERE | — |
| UX-CTA-001 three parallel landing CTA systems (header drops intent on secondary pages) | High (was Critical) | NEW_OWNER_HERE | — |
| UX-CTA-002 A/B experiment 'hero-cta-copy' has no variant B | Medium (was High) | NEW_OWNER_HERE | — |
| UX-ACTIVATE-001 'Publish' checklist step permanently not_available | High | NEW_OWNER_HERE | — |
| UX-EMPTY-001 /workshop/library overview body renders nothing (shell compensates) | Medium (was High) | NEW_OWNER_HERE | — |
| UX-MAGIC-001 magic-link states collapse to one error | Medium | NEW_OWNER_HERE | (security conclusion: Infosec OWASP; usability copy: here) |
| UX-LEAD-002 ContactForm is mailto-only, no persistence | Medium | NEW_OWNER_HERE | (founder visibility: cross-reference UX-ADMIN-001 here) |
| UX-VOCAB-001 hero lacks PH AEC vocabulary | Medium | NEW_OWNER_HERE | — |
| UX-ACTIVATE-002 guided sample under-promoted | Medium | CROSS_REFERENCE_ACTIVE_PACK | MVP Startup Readiness (G-09/G-12 activation) owns guided-sample sequencing; this pack owns the *card-prominence* UX surface |
| UX-EXPORT-001 XLSX export discoverability | Medium | CROSS_REFERENCE_ACTIVE_PACK | MVP Startup Readiness `010-contractor-profile-and-branded-export` owns the export feature; this pack owns the *entry-point discoverability* surface |
| UX-SHARE-001 password lockout omits Retry-After | Medium | NEW_OWNER_HERE | (share hardening: Infosec; lockout UX copy: here) |
| UX-SESSION-001 no workshop session-expiry banner | Medium | NEW_OWNER_HERE | — |
| UX-INVITE-001 already-used state has no sign-in link | Low | NEW_OWNER_HERE | — |
| UX-INVITE-002 invite copy uses tiny fonts | Low | NEW_OWNER_HERE | — |
| UX-LEAD-003 'Start with an estimate' CTA mislabels contact form | Low | NEW_OWNER_HERE | — |
| UX-EMPTY-002 recipient proposals empty state has no CTA | Low | NEW_OWNER_HERE | — |
| UX-SHARE-002 password form touch targets below iOS minimum | Low | NEW_OWNER_HERE | — |
| UX-COPY-001 hardcoded 'Philip' in user-facing copy | Low | NEW_OWNER_HERE | — |
| UX-MAGIC-002 magic-link success banner doesn't echo email | Informational | NEW_OWNER_HERE | — |
| UX-EMPTY-003 viewer first-project zero-state has no CTA | Informational | NEW_OWNER_HERE | — |
| UX-ADMIN-001 founder correlation already wired (positive) | Informational | ALREADY_IMPLEMENTED | depends on UX-LEAD-002 for end-to-end lead visibility |
| UX-BUILD-002 optional CI guard for `use server` async contract | Informational | DEFERRED_TO_NAMED_STAGE_OR_OWNER | Quality Master owns engineering CI/lint guards |

## Active-pack reconciliation summary

### MVP Startup Readiness Audit (`2026-07-18-MVP-Startup-Readiness-Audit`)

Owns acquisition, activation, design-partner operations, import, variants,
retention, branded export, and Stage A/B sequencing. Cross-referenced (not
duplicated) for:

- **UX-ACTIVATE-002** — guided-sample sequencing belongs to MVP; this pack owns only the card-prominence UX.
- **UX-EXPORT-001** — branded-export feature belongs to MVP `010-contractor-profile-and-branded-export`; this pack owns only the entry-point discoverability.
- **UX-VOCAB-001** — MVP acquisition findings are source-only; this pack adds the live-journey lens that the hero vocabulary mismatch impairs a PH AEC visitor's first 5 seconds.

This pack does NOT duplicate MVP's activation/import/variant units. Those are
production engineering units; this pack is a UX/journey audit that surfaced
journey-level UX consequences, some of which point at MVP surfaces.

### Quality Master (`2026-07-19-Archestimator-Whole-Repo-Quality-Master-Plan-Pack`)

Canonical engineering authority. Cross-referenced for:

- **UX-BUILD-002** — a future CI guard for the `use server` async contract is an engineering-CI concern, deferred to Quality Master.
- **UX-BUILD-001** — although the build break is an engineering defect, this pack owns it because (a) no existing pack detected it, (b) it is the gating UX/journey blocker, and (c) the smallest coherent fix is a 3-line edit. Once fixed, no further UX/journey unit depends on engineering ownership.

### Infosec OWASP (`2026-07-19-Archestimator-Whole-Repo-Infosec-OWASP-Audit-Plan-Pack`)

Completed security audit. Cross-referenced for:

- **Security conclusions on auth/invite/share** are NOT in this pack. No new security defect was proven. Security findings like `SEC-COLLAB-003` (realtime token revocation) belong to Infosec.
- **UX-MAGIC-001** and **UX-SHARE-001** own only the *usability copy* consequence of authentication/lockout states, not the underlying security invariant.

### Disposition integrity

- Zero accepted requirements or units have two active owners.
- Every Critical/High finding has a single owner.
- Cross-references point at named units in named packs; no vague "see other pack" handoffs.
