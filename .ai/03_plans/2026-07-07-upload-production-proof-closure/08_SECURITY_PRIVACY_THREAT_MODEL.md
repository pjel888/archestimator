# 08 — Security, Privacy, and Threat Model

The central security property of this pack is the **no-secrets / no-paths /
no-customer-data contract** on every recorded artifact. Each requirement in
`04` is also a security control: an artifact that leaks is a failed artifact,
regardless of whether its `passed` field is true.

## Trust boundaries

| Boundary | Crossing | Control |
|---|---|---|
| Hosted/live environment → producer script | TLS HTTPS to `www.archestimator.com` or external webhook | Bearer secret in env, never recorded |
| Producer script → artifact file | in-process write to evidence dir | Sanitizer self-checks (`pathSafe`, `secretRedacted`, `payloadPathSafe`, `noRawStoragePaths`) |
| Artifact file → bundle gate | local file read | Gate reads only declared fields; ignores extras |
| Bundle verdict → release gates | local file read | Gate surfaces `productionProofReady` boolean |

## Threat model

### T1. Secret leakage into a committed artifact
- **Asset:** `UPLOAD_*_JOB_SECRET`, `CRON_SECRET`, `UPLOAD_OPERATIONS_ALERT_WEBHOOK_TOKEN`.
- **Actor:** anyone with repo read access (if leaked artifact is committed).
- **Vector:** producer records the raw token/URL.
- **Control:** `verify-upload-alert-delivery.ts` asserts `secretRedacted=true`
  and `payloadPathSafe=true`; the observations sanitizer rejects `bearer `,
  `access_token`, `signed_url`, any URL. The bundle gate fails the requirement
  if these are false.
- **Residual risk:** a producer *without* a sanitizer field could leak. Only the
  alert-delivery and observations producers handle raw secrets/paths; both have
  sanitizers. The hosted operations/runtime producers handle secrets but record
  only `missingAuthenticatedProbeSecrets` (a presence flag, never the value).

### T2. Storage path / customer data leakage via operator observation
- **Asset:** R2 object keys, filenames, workspace/project IDs.
- **Actor:** anyone with repo read access.
- **Vector:** operator types a real path/filename/URL into the observation JSON.
- **Control:** `pathSafeInput` rejects `storage_path`, `filename`,
  `component-attachments/`, `component-images/`, `project-images/`, `private/`,
  `signed_url`, `https?://`. The producer sets `pathSafe=false` → bundle fails.
- **Residual risk:** none if the sanitizer runs; the sanitizer is mandatory
  (runs unconditionally when input is loaded).

### T3. Fake/hosted-impersonation proof
- **Asset:** the `productionProofReady` verdict.
- **Actor:** a producer pointed at a non-production origin.
- **Vector:** executor sets `*_BASE_URL` to a preview/staging origin.
- **Control:** the bundle gate checks `baseUrl === "https://www.archestimator.com"`
  for operations/runtime. The observation producers do *not* check origin (they
  record operator assertions), so the executor must assert hosted origin in the
  observation input by setting `hostedObserved=true` only when actually hosted.
- **Residual risk:** an operator could lie. Mitigation: owner sign-off in Phase 3
  and the requirement that observations be reproducible by an independent reviewer.

### T4. Over-driving a production route during backpressure exercise
- **Asset:** production availability, admission quota of real users.
- **Actor:** the executor running PROOF-REQ-007.
- **Vector:** sending too many requests too fast.
- **Control:** use the lowest-friction route (`/api/component-library/attachments`
  unauthenticated probe is rejected before admission; an *authenticated*
  over-drive should use a test workspace). Drive only to the threshold
  (`MAX_REQUESTS_PER_WINDOW=12`), observe the 429, stop.
- **Residual risk:** brief contention with real traffic. Acceptable for a
  one-time exercise; documented as a Phase 2 prerequisite.

### T5. Stale deployment readback accepted as current
- **Asset:** the correctness of all later hosted gates.
- **Vector:** PROOF-REQ-001 artifact is reused after a new deployment.
- **Control:** re-run the readback in Phase 1; the `deploymentGap` fields assert
  the deployment is not stale relative to the proof routes.

### T6. ClamD service treated as production infrastructure when it is a test fixture
- **Asset:** the meaning of PROOF-REQ-004.
- **Vector:** pointing the producer at a clamd instance that is not the
  production scanner.
- **Control:** this is acceptable *if and only if* the clamd service uses the
  same signature DB and config as production. Document the clamd endpoint
  provenance in the Phase 2 record. The EICAR fixture is a standard test
  signature, not customer data.

## Privacy / data minimization

- Artifacts contain **no customer data, no user IDs, no workspace IDs, no file
  contents, no filenames, no storage paths**. The only recorded values are
  booleans, counts, status codes, and the producer `mode`/`proofBoundary` strings.
- The alert-delivery producer sends a *sanitized* webhook payload (constructed by
  `buildUploadOperationalAlertPayload`), not customer data.
- The bundle verdict records only aggregate totals and per-requirement statuses.

## Credential material taxonomy

| Material | Marker | Created by | Stored in | Read by | Client-visible? | Used for URL/cookie/session? | Rotation/revocation | Proof |
|---|---|---|---|---|---|---|---|---|
| `CRON_SECRET` / `UPLOAD_*_JOB_SECRET` | raw bearer (env) | operator | env only | internal routes | no | no (request auth header) | rotate via operator secret store | never recorded; producer records only presence |
| `UPLOAD_OPERATIONS_ALERT_WEBHOOK_TOKEN` | raw bearer (env) | operator | env only | external webhook | no | no | rotate with webhook config | `secretRedacted=true` self-check |
| `UPLOAD_CLAMD_*` | raw connection params (env) | operator | env only | clamd service | no | no | rotate with clamd config | not recorded |
| Observation input JSON | operator-authored | operator | local file (not committed unless in evidence dir) | observations producer | n/a | n/a | n/a | `pathSafe` sanitizer |

No raw token, hash, encrypted token, session cookie, or public ID is recorded in
any of the 8 artifacts. The bundle gate does not read or store any credential.

## Security testing expectation (for future implementation)

- Denial test: an artifact with a planted secret/path must fail the bundle gate.
  (The sanitizers make this mechanically true; an executor can verify by
  temporarily flipping a `secretRedacted`/`pathSafe` field to `false` and
  re-running the gate — it must report `failed`.)
- Origin test: pointing a hosted producer at a non-`www` origin must fail the
  bundle's `baseUrl` check (for operations/runtime).

## CSP / frame / referrer / download
Not applicable — this pack changes no UI, no headers, no public page.
