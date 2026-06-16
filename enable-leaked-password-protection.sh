#!/usr/bin/env bash
set -euo pipefail

script_source="${BASH_SOURCE[0]}"
while [[ -L "$script_source" ]]; do
  script_dir="$(cd -P "$(dirname "$script_source")" >/dev/null 2>&1 && pwd)"
  script_source="$(readlink "$script_source")"
  [[ "$script_source" != /* ]] && script_source="$script_dir/$script_source"
done

repo_root="$(cd -P "$(dirname "$script_source")" >/dev/null 2>&1 && pwd)"
helper_relative=".ai/09_archive/2026-06-14-Database-Migration-Check/evidence/enable-leaked-password-protection.sh"
helper="$repo_root/$helper_relative"
helper_real="$(realpath "$helper")"
repo_root_real="$(realpath "$repo_root")"

case "$helper_real" in
  "$repo_root_real/$helper_relative") ;;
  *)
    printf 'Refusing to execute helper outside repository: %s\n' "$helper_real" >&2
    exit 1
    ;;
esac

if [[ ! -x "$helper_real" ]]; then
  printf 'Could not find helper script at %s\n' "$helper_real" >&2
  exit 1
fi

exec "$helper_real"
