# E-005 — NPCRS Registration Triage Worksheet

**Evidence ID:** E-005
**Status:** Ready for owner action
**Owner:** Philip Echavez Lewis / DPO
**Blocks production?:** ✅ YES

---

## Mandatory Registration Criteria (per NPC Circular No. 2022-04)

Under NPC Circular No. 2022-04, NPCRS registration is **mandatory** for PICs/PIPs when **any** of:

| # | Criterion | Applies? | Evidence / Notes |
|---|-----------|----------|------------------|
| 1 | Employs **250 or more persons** | ⬜ Yes / ⬜ No / ⬜ TBD | Confirm employee count. |
| 2 | Processes **sensitive personal information of 1,000+ individuals** | ⬜ Yes / ⬜ No / ⬜ TBD | Access telemetry does NOT collect SPI. Confirm other data flows. |
| 3 | Processing **likely to pose a risk to rights and freedoms** | ⬜ Yes / ⬜ No / ⬜ TBD | NPC may consider pseudonymized identifiers (IP hash) and access tracking as "processing likely to pose risk." |
| 4 | Processes personal information for a **government agency** | ⬜ Yes / ⬜ No / ⬜ TBD | Archestimator is a private SaaS platform. |

---

## Registration Decision Tree

```
1. Do any mandatory criteria apply?
   ├── YES → Complete NPCRS registration (Phase 1)
   └── NO or UNCERTAIN → Continue to step 2

2. Is voluntary registration desired?
   ├── YES → Complete NPCRS registration (Phase 1, voluntary category)
   └── NO → Document exemption basis and rationale
```

---

## Entity Identity

| Question | Answer | Status |
|----------|--------|--------|
| Legal entity name | ⬜ | ⬜ |
| Legal entity type | ⬜ Sole proprietor / Corporation / Partnership / Other | ⬜ |
| Philippine SEC/DTI registration number | ⬜ | ⬜ |
| Primary business address (Philippines) | ⬜ | ⬜ |
| Number of employees | ⬜ | ⬜ |
| Website / app URL | archestimator.com (or current domain) | ⬜ Confirm |
| Contact email for privacy matters | ⬜ e.g., privacy@archestimator.com | ⬜ |

---

## Registration Determination

```
Determination: ⬜ Registration required
                ⬜ Registration not required — exempt
                ⬜ Voluntary registration
                ⬜ Deferred (trigger: _______________)

Rationale: ________________________________________
________________________________________
________________________________________

Reference to NPC circular/guideline: ________________________________________

Date of determination: ________________________________________
Determined by: ________________________________________
```

---

## If Registration Required

```
NPC Registration Phase 1 (Data Protection Officer and Data Processing Systems):
- [ ] DPO designated (E-004)
- [ ] DPS inventory completed (E-006)
- [ ] NPCRS Phase 1 form submitted at https://npcrs.npc.gov.ph/
- [ ] Registration acknowledgment received

NPC Registration Phase 2 (Full Compliance — if applicable):
- [ ] Privacy impact assessment completed
- [ ] Privacy management program documented
- [ ] Breach notification procedures established (E-008)

Timeline: Within ___ days of this determination.
```

---

## If Registration Not Required

```
Exemption basis: ________________________________________
Supporting NPC circular/guideline reference: ________________________________________
Date exemption confirmed: ________________________________________
Confirmed by: ________________________________________

Note: Re-evaluate if any trigger condition changes (e.g., employee count exceeds 250,
processing sensitive personal information, or NPC circular update).
```

---

## Completion Criteria

1. Worksheet or memo explicitly states whether NPC registration is required.
2. Rationale references the applicable NPC circular or guideline.
3. Determination is dated.
4. If registration is required, the worksheet includes the registration category and next steps.

---

**Source doc:** `53-dpo-npcrs-and-dps-registration-triage.md` §4
**Gate:** G-05
**Next:** After triage is complete, update `64-access-telemetry-production-evidence-ledger.md` to mark E-005 as Complete.
