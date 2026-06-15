# Local Machine Security Pass

Date: 2026-06-14

## Verdict

The suspicious `osascript` indicator was not a harmless transient process. It is
backed by a root-owned LaunchDaemon:

- Path: `/Library/LaunchDaemons/com.39825.plist`
- Launchd job: `system/com.39825`
- Owner/mode: `root:wheel`, `-rw-r--r--`
- Size: `8020`
- Mtime: `2025-10-24 22:27:54 +0800`
- SHA-256: `7dabb298cfa5f9a3abb1193cc3f034ee337769bfdc926870ebf39021a7860c66`

`launchctl print system/com.39825` reported a LaunchDaemon using `/bin/bash`
with `osascript` and command-and-control behavior including:

- `xxxblyat`
- `/api/v1/bot/joinsystem`
- `/api/v1/bot/actions`
- `.chost`
- `.username`
- `.botid`
- `.lastaction`
- `.uninstalled`
- `/tmp/socks`
- `enablesocks5`
- `doshell`
- `curl -s http://`

No active `osascript` process was found during the final checks. After owner
admin execution of the helper script, `launchctl print system/com.39825` returns
`Could not find service "com.39825" in domain for system`.

## Quarantine Completed

Quarantine directory:

`/Users/philiplewis/Library/Application Support/ArchestimatorSecurityQuarantine/2026-06-14-com-39825`

Moved into quarantine without printing contents:

| File | SHA-256 |
| --- | --- |
| `.chost` | `a26a7139baaea1e8a224ff4e00c064e57e331c814e379ca94e96e160ccb6f8b5` |
| `.username` | `a89b0a0a8ea9f3cc845a3f2eb3a4750f6dd45c108c634424d82744eb9c14f7af` |
| `.botid` | `ddf9e9fe0e9d56c86f59e0a9020b150c2927cdf5827f97025510357640b75e6f` |
| `.uninstalled` | `a318c24216defe206feeb73ef5be00033fa9c4a74d0b967f6532a26ca5906d3b` |

Because the root-owned LaunchDaemon was still present during initial
containment, a new one-byte `/Users/philiplewis/.uninstalled` sentinel was
recreated as a kill switch:

- Mode: `-rw-------`
- SHA-256: `a318c24216defe206feeb73ef5be00033fa9c4a74d0b967f6532a26ca5906d3b`

After owner admin execution of the helper script, the root LaunchDaemon plist
was moved into the quarantine directory and the sentinel was removed.

## Admin-Gated Removal Completed

The following commands need macOS administrator authority. Non-admin attempts to
boot out, disable, or move the LaunchDaemon returned `Operation not permitted`
or required a sudo password.

```bash
sudo launchctl bootout system/com.39825
sudo launchctl disable system/com.39825
sudo mkdir -p "/Users/philiplewis/Library/Application Support/ArchestimatorSecurityQuarantine/2026-06-14-com-39825"
sudo mv /Library/LaunchDaemons/com.39825.plist "/Users/philiplewis/Library/Application Support/ArchestimatorSecurityQuarantine/2026-06-14-com-39825/com.39825.plist"
rm -f "$HOME/.uninstalled"
```

Continuation check on 2026-06-14:

- `sudo -n launchctl bootout system/com.39825` -> `sudo: a password is required`.
- `sudo -n launchctl disable system/com.39825` -> `sudo: a password is required`.
- `sudo -n mv /Library/LaunchDaemons/com.39825.plist ...` -> `sudo: a password is required`.
- `launchctl bootout system/com.39825` -> `Operation not permitted`.
- `launchctl disable system/com.39825` -> `Operation not permitted`.
- `launchctl print system/com.39825` still reports the job loaded from
  `/Library/LaunchDaemons/com.39825.plist`, with state `spawn scheduled` and
  no active process count during inspection.
- Observed launchd run count increased to `12854`, confirming the daemon still
  schedules while the root plist remains present.

Helper artifact for the admin removal step:

`remove-com-39825-launchdaemon.sh`

Owner terminal run on 2026-06-14 prompted for the macOS password, then returned:

```text
Bad request.
Could not find service "com.39825" in domain for system
```

That message is the expected final `launchctl print` result after the service is
gone.

## Final Checks Run

- `pgrep -x osascript` -> no active `osascript` process.
- Targeted process search for known indicators -> no real process matches.
- Targeted LaunchAgent/LaunchDaemon grep -> only
  `/Library/LaunchDaemons/com.39825.plist`.
- User dotfiles after quarantine -> only the recreated `.uninstalled` sentinel.
- `/tmp/socks` -> not present.
- `crontab -l` -> no user crontab.
- `atq` -> no jobs.
- `/Library/LaunchDaemons/com.39825.plist` -> absent.
- Quarantined root plist -> present at
  `/Users/philiplewis/Library/Application Support/ArchestimatorSecurityQuarantine/2026-06-14-com-39825/com.39825.plist`.
- `/Users/philiplewis/.uninstalled` -> absent after root plist removal.

## Follow-Up

Treat this as compromise evidence because the LaunchDaemon includes remote shell
execution and SOCKS downloader behavior. After removal, rotate sensitive
credentials from a clean session/device.
