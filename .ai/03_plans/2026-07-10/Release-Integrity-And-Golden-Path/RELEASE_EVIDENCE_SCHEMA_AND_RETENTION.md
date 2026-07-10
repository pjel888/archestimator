# Release Evidence Schema And Retention

This supporting evidence model expands `REQ-005/006/008`, `RISK-003`, and
`UNIT-005/006`. `plan-pack.json` remains plan-state authority; a future generated
`release-readiness.json` becomes release-decision authority only after its own
producer and proof gates execute.

## Evidence Envelope

Every record carries schema/producer version, evidence class, release ID,
candidate SHA, environment/resource identity, producer path/command, collection
time, `expires_at` or explicit validity rule, result/status, artifact digest,
redaction declaration, and dependencies. Browser records add project/browser,
fixture ID, URL hash, step results, accessibility summary, trace/report digests,
and cleanup digest. Hosted control records add endpoint/readback digest and
pagination completeness.

## Retained Bundle Classes

| Class | Minimum retained content | Forbidden content |
|---|---|---|
| Build/candidate | Build log, tool/lock versions, full upload-input manifest, artifact ID | Secret values or reversible secret hashes |
| Browser failure | Trace, bounded screenshot, accessibility, console/network summary, test report | Cookies, authorization headers, raw URLs/tokens, customer content |
| Fixture | Seed/cleanup state and digest, owned IDs/aliases, canary result | Raw credentials, email, object keys, foreign fixture data |
| Hosted smoke/control | Route/check identity, sanitized status, SHA/environment/release match | Raw response bodies or secret-scanning values |
| Cross-pack | Package/manifest/artifact/receipt digests, status, source revision, freshness | Agent status, conversational approval, copied feature evidence |
| Release decision | All required inputs, blockers, final traffic/version state, decision | Manual unlinked readiness claims |

Actual provider artifact expiry must be recorded; a default retention duration is
not assumed. Failure evidence is preserved only for its declared bounded period.
Deleting a workflow run can delete artifacts, so freshness checks use observed
`expires_at` and existence.

## Composition And Rejection

The collector rejects missing, malformed, stale, expired, superseded, unknown
required controls, mixed SHA/environment/release ID, wrong producer version,
migration drift, open high-severity blocker, conflicting cross-pack receipt, an
included out-of-suite capability without a current validated receipt, an exclusion
whose source/revision is present in the candidate, or a newer manual README claim.
Markdown and README are generated renderings of the JSON record; they cannot
override it.

## Proof And Resume

`TEST-005` covers redaction, retention metadata, intentional failures, and smoke
denials. `TEST-006/008` cover release truth, nine-pack composition, and candidate
dependency disposition. On resume,
revalidate every referenced digest and expiry; never refresh a fingerprint over
changed proof.
