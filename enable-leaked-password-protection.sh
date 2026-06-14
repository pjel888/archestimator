#!/usr/bin/env bash
set -euo pipefail

helper=".ai/03_plans/2026-06-14-Database-Migration-Check/evidence/enable-leaked-password-protection.sh"

if [[ ! -x "$helper" ]]; then
  printf 'Could not find helper script at %s\n' "$helper" >&2
  exit 1
fi

printf 'Paste Supabase Management API token, then press Enter: ' >&2
IFS= read -rs SUPABASE_ACCESS_TOKEN
printf '\n' >&2

if [[ -z "$SUPABASE_ACCESS_TOKEN" ]]; then
  printf 'No token provided.\n' >&2
  exit 2
fi

SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" "$helper"
