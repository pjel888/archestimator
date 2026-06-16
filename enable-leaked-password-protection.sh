#!/usr/bin/env bash
set -euo pipefail

helper=".ai/09_archive/2026-06-14-Database-Migration-Check/evidence/enable-leaked-password-protection.sh"

if [[ ! -x "$helper" ]]; then
  printf 'Could not find helper script at %s\n' "$helper" >&2
  exit 1
fi

exec "$helper"
