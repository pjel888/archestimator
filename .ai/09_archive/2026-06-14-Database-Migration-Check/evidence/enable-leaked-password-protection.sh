#!/usr/bin/env bash
set -euo pipefail

project_ref="${SUPABASE_PROJECT_REF:-ebxxqidacheyapmmzavr}"
api_url="https://api.supabase.com/v1/projects/${project_ref}/config/auth"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  cat >&2 <<'EOF'
SUPABASE_ACCESS_TOKEN is required.

Create a Supabase personal access token with project/Auth config write access,
then run this script with:

  SUPABASE_ACCESS_TOKEN='sbp_...' ./enable-leaked-password-protection.sh

The token is read from the environment only and is not written to disk.
EOF
  exit 2
fi

extract_password_hibp_enabled() {
  if command -v jq >/dev/null 2>&1; then
    jq -r '.password_hibp_enabled'
  else
    python3 -c 'import json, sys; print(json.load(sys.stdin).get("password_hibp_enabled"))'
  fi
}

tmp_body="$(mktemp)"
trap 'rm -f "$tmp_body"' EXIT

before="$(curl -fsS \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Accept: application/json" \
  "$api_url" | extract_password_hibp_enabled)"

printf 'Before password_hibp_enabled=%s\n' "$before"

http_status="$(curl -fsS -o "$tmp_body" -w '%{http_code}' \
  -X PATCH \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  --data '{"password_hibp_enabled":true}' \
  "$api_url")"

if [[ "$http_status" != "200" ]]; then
  printf 'Supabase Auth config PATCH failed with HTTP %s\n' "$http_status" >&2
  cat "$tmp_body" >&2
  exit 1
fi

patched="$(extract_password_hibp_enabled < "$tmp_body")"
printf 'PATCH response password_hibp_enabled=%s\n' "$patched"

after="$(curl -fsS \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Accept: application/json" \
  "$api_url" | extract_password_hibp_enabled)"

printf 'After password_hibp_enabled=%s\n' "$after"

if [[ "$after" != "true" ]]; then
  printf 'Expected password_hibp_enabled=true after PATCH.\n' >&2
  exit 1
fi

printf 'Leaked password protection is enabled for project %s.\n' "$project_ref"
