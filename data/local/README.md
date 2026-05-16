# Local data store

Archestimator starts local-first while the product model is still changing quickly.

- `seed.json` is tracked and provides deterministic starter data.
- Runtime mutable files under `data/local/*.json` are ignored by git, except this README and `seed.json`.
- Data access must go through repository boundaries in `src/lib/local-data/` so future Supabase/Postgres migration does not require rewriting UI components.
- Do not place secrets or private client data in tracked JSON files.
