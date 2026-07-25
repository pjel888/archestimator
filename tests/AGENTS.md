# Test Integrity Contract

This path inherits `AGENTS.md`,
`.ai/00_system/BETA_QUALITY_ENGINEERING_PROTOCOL.md`, and
`.ai/00_system/VALIDATION_MATRIX.md`.

- Match the existing runner, fixtures, and boundary ownership.
- Assert observable behavior and meaningful denial, boundary, failure, and
  recovery cases; snapshot-only or coverage-only assertions are insufficient.
- Prove regression assertions red-before-green when feasible and use mutation or
  an equivalent negative fixture when new evidence strength is uncertain.
- Do not add `.only`, silent skips, order dependence, production endpoints/data,
  blind snapshot updates, retries/timeouts that mask flakes, or mocks of the
  system under test.
- Use deterministic time, randomness, IDs, locale, timezone, network, and data.
- Fix valid failing behavior; never weaken a valid assertion, threshold, glob,
  or exclusion merely to obtain green.
- Record exact commands, results, reports, hashes, skips, flakes, and remaining
  boundaries in the quality manifest.
