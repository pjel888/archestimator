# Performance Evidence Folder

Place future redacted performance artifacts here using the naming convention from `../06-test-spec-and-validation-protocol.md` and the registry in `../21-evidence-index.md`.

Do not store secrets, raw share/invite tokens, session cookies, password values, or unredacted customer data here.

Suggested subfolder pattern:

```text
YYYY-MM-DD-<hypothesis-id>-<surface>-baseline/
YYYY-MM-DD-<hypothesis-id>-<surface>-after/
```

Each subfolder should include a short `README.md` with:

- route bucket,
- metric,
- deployment/commit,
- command(s),
- device/throttle/window,
- summary result,
- cleanup/redaction notes.
