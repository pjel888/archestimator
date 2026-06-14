#!/usr/bin/env bash
set -euo pipefail

quarantine_dir="${HOME}/Library/Application Support/ArchestimatorSecurityQuarantine/2026-06-14-com-39825"
plist_path="/Library/LaunchDaemons/com.39825.plist"
quarantined_plist="${quarantine_dir}/com.39825.plist"

sudo launchctl bootout system/com.39825 || true
sudo launchctl disable system/com.39825 || true
sudo mkdir -p "${quarantine_dir}"

if [[ -e "${plist_path}" ]]; then
  sudo mv "${plist_path}" "${quarantined_plist}"
fi

if [[ ! -e "${plist_path}" ]]; then
  rm -f "${HOME}/.uninstalled"
fi

launchctl print system/com.39825 2>&1 || true
test ! -e "${plist_path}"
