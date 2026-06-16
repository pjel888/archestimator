#!/usr/bin/env bash
set -euo pipefail

project_ref="${SUPABASE_PROJECT_REF:-ebxxqidacheyapmmzavr}"
api_url="https://api.supabase.com/v1/projects/${project_ref}/config/auth"

token=""
if [[ -n "${SUPABASE_ACCESS_TOKEN_FILE:-}" ]]; then
  if [[ ! -r "$SUPABASE_ACCESS_TOKEN_FILE" ]]; then
    printf 'SUPABASE_ACCESS_TOKEN_FILE is not readable: %s\n' "$SUPABASE_ACCESS_TOKEN_FILE" >&2
    exit 2
  fi
  IFS= read -r token < "$SUPABASE_ACCESS_TOKEN_FILE" || [[ -n "$token" ]]
elif [[ -n "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  cat >&2 <<'EOF_ENV'
Warning: SUPABASE_ACCESS_TOKEN is accepted for CI/backward compatibility, but
process environments can be observable by same-user tooling on some systems.
Prefer the interactive prompt or SUPABASE_ACCESS_TOKEN_FILE.
EOF_ENV
  token="$SUPABASE_ACCESS_TOKEN"
else
  cat >&2 <<'EOF_USAGE'
Paste a Supabase Management API token with project/Auth config write access,
then press Enter. Input is hidden and is not written to shell history.

Non-interactive use:
  SUPABASE_ACCESS_TOKEN_FILE=/path/to/token-file ./enable-leaked-password-protection.sh

Do not put the token inline in the shell command.
EOF_USAGE
  printf 'Supabase Management API token: ' >&2
  IFS= read -rs token
  printf '\n' >&2
fi

if [[ -z "$token" ]]; then
  printf 'No token provided.\n' >&2
  exit 2
fi

python3 -c '
import json
import sys
import urllib.error
import urllib.request

api_url = sys.argv[1]
project_ref = sys.argv[2]
token = sys.stdin.readline().rstrip("\n")

if not token:
    print("No token provided.", file=sys.stderr)
    raise SystemExit(2)

headers = {
    "Authorization": f"Bearer {token}",
    "Accept": "application/json",
}

def request(method, data=None):
    body = None
    request_headers = dict(headers)
    if data is not None:
        body = json.dumps(data).encode("utf-8")
        request_headers["Content-Type"] = "application/json"
    req = urllib.request.Request(api_url, data=body, headers=request_headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            response_body = response.read().decode("utf-8")
            payload = json.loads(response_body) if response_body else {}
            return response.status, payload, response_body
    except urllib.error.HTTPError as exc:
        response_body = exc.read().decode("utf-8", errors="replace")
        return exc.code, None, response_body

status, payload, raw = request("GET")
if status != 200 or payload is None:
    print(f"Supabase Auth config GET failed with HTTP {status}", file=sys.stderr)
    print(raw, file=sys.stderr)
    raise SystemExit(1)

before = payload.get("password_hibp_enabled")
print(f"Before password_hibp_enabled={str(before).lower()}")

status, payload, raw = request("PATCH", {"password_hibp_enabled": True})
if status != 200 or payload is None:
    print(f"Supabase Auth config PATCH failed with HTTP {status}", file=sys.stderr)
    print(raw, file=sys.stderr)
    raise SystemExit(1)

patched = payload.get("password_hibp_enabled")
print(f"PATCH response password_hibp_enabled={str(patched).lower()}")

status, payload, raw = request("GET")
if status != 200 or payload is None:
    print(f"Supabase Auth config verification GET failed with HTTP {status}", file=sys.stderr)
    print(raw, file=sys.stderr)
    raise SystemExit(1)

after = payload.get("password_hibp_enabled")
print(f"After password_hibp_enabled={str(after).lower()}")

if after is not True:
    print("Expected password_hibp_enabled=true after PATCH.", file=sys.stderr)
    raise SystemExit(1)

print(f"Leaked password protection is enabled for project {project_ref}.")
' "$api_url" "$project_ref" <<< "$token"
