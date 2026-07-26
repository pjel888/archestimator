import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const shellHook = path.join(projectRoot, ".cursor/hooks/before-shell-execution.js");
const sessionStartHook = path.join(projectRoot, ".cursor/hooks/session-start.js");
const beforeReadHook = path.join(projectRoot, ".cursor/hooks/before-read-file.js");
const beforeTabReadHook = path.join(projectRoot, ".cursor/hooks/before-tab-file-read.js");

function runJsonHook(hookPath: string, input: unknown) {
  return spawnSync(process.execPath, [hookPath], {
    cwd: projectRoot,
    encoding: "utf8",
    input: JSON.stringify(input),
  });
}

function runShellHook(
  commandOrRaw: string,
  options: { env?: Record<string, string>; raw?: boolean; tmux?: boolean } = {},
) {
  const baseEnv = { ...process.env };
  delete baseEnv.TMUX;
  for (const name of Object.keys(baseEnv)) {
    if (/^GIT_CONFIG_(?:COUNT|KEY_\d+|VALUE_\d+)$/u.test(name)) delete baseEnv[name];
  }
  return spawnSync(process.execPath, [shellHook], {
    cwd: projectRoot,
    encoding: "utf8",
    env: {
      ...baseEnv,
      ECC_HOOK_PROFILE: "standard",
      ...options.env,
      ...(options.tmux ? { TMUX: "/tmp/tmux-501/default,1,0" } : {}),
    },
    input: options.raw ? commandOrRaw : JSON.stringify({ command: commandOrRaw }),
  });
}

describe("Cursor hook contracts", () => {
  it("keeps one compact always-loaded project rule", () => {
    const rulesDir = path.join(projectRoot, ".cursor/rules");
    const alwaysLoaded = readdirSync(rulesDir)
      .filter((fileName) => fileName.endsWith(".mdc"))
      .filter((fileName) => readFileSync(path.join(rulesDir, fileName), "utf8").includes("alwaysApply: true"));

    expect(alwaysLoaded).toEqual(["00-archestimator-project-brain.mdc"]);
    expect(statSync(path.join(rulesDir, alwaysLoaded[0])).size).toBeLessThanOrEqual(8 * 1024);

    for (const removedRule of [
      "01-shared-worktree-safety.mdc",
      "02-validation-and-evidence.mdc",
      "03-agent-orchestration.mdc",
    ]) {
      expect(existsSync(path.join(rulesDir, removedRule)), removedRule).toBe(false);
    }
  });

  it("keeps Cursor agent descriptions opt-in and core roles on current providers", () => {
    const agentsDir = path.join(projectRoot, ".cursor/agents");
    const forcedActivation = /\b(?:PROACTIVELY|MUST BE USED|automatically activated|use immediately after)\b/i;

    for (const fileName of readdirSync(agentsDir).filter((name) => name.endsWith(".md"))) {
      const content = readFileSync(path.join(agentsDir, fileName), "utf8");
      const frontmatter = content.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
      const description = frontmatter.match(/^description:\s*(.+)$/m)?.[1] ?? "";
      expect(description, fileName).not.toMatch(forcedActivation);
    }

    for (const fileName of ["ecc-architect.md", "ecc-planner.md", "ecc-database-reviewer.md"]) {
      const content = readFileSync(path.join(agentsDir, fileName), "utf8");
      expect(content, fileName).not.toMatch(/Next\.js 15|Vercel|Supabase|PostgreSQL|\bRLS\b/i);
    }
  });

  it("configures only the five truthful local hook events", () => {
    const config = JSON.parse(readFileSync(path.join(projectRoot, ".cursor/hooks.json"), "utf8"));
    const events = Object.keys(config.hooks).sort();

    expect(events).toEqual([
      "beforeReadFile",
      "beforeShellExecution",
      "beforeSubmitPrompt",
      "beforeTabFileRead",
      "sessionStart",
    ]);

    for (const entries of Object.values(config.hooks) as Array<Array<{ command: string }>>) {
      for (const entry of entries) {
        const script = entry.command.replace(/^node\s+/, "");
        expect(existsSync(path.join(projectRoot, script)), entry.command).toBe(true);
      }
    }

    for (const event of ["beforeShellExecution", "beforeTabFileRead"]) {
      expect(config.hooks[event][0].failClosed, event).toBe(true);
    }
    expect(config.hooks.sessionStart[0].failClosed, "sessionStart").toBe(false);

    expect(readFileSync(path.join(projectRoot, ".cursor/hooks/adapter.js"), "utf8")).not.toContain(
      "runExistingHook",
    );
  });

  it("continues session startup in degraded mode when Supermemory cannot run", () => {
    const input = JSON.stringify({ hook_event_name: "sessionStart" });
    const result = spawnSync(process.execPath, [sessionStartHook], {
      cwd: projectRoot,
      encoding: "utf8",
      env: { ...process.env, PATH: "" },
      input,
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toBe(input);
    expect(result.stderr).toContain("DEGRADED");
    expect(result.stderr).toContain("Supermemory preflight failed");
  });

  it("blocks real git hook-bypass flags", () => {
    for (const command of [
      "git commit --no-verify -m fix",
      "git commit --no-veri -m fix",
      "git commit --no-verif -m fix",
      "git push origin main --no-verify",
      "git push origin main --no-veri",
      "git commit -n -m fix",
      "git commit -an -m fix",
      "git commit -anm fix",
      "env -u GIT_CONFIG git commit -n -m fix",
      "env --unset GIT_CONFIG git commit --no-verify -m fix",
      "env -C /tmp git commit -n -m fix",
      "/usr/bin/env git commit -n -m fix",
      'env -S "git commit -n -m fix"',
      "env -S git commit -n -m fix",
      'command env --split-string "git commit --no-verify -m fix"',
      "env --split-string git commit --no-verify -m fix",
      "env --split-string=git commit -n -m fix",
      'eval "git commit -n -m fix"',
      'sh -c "git commit -n -m fix"',
      'git -c "alias.nc=commit --no-verify" nc --dry-run',
      'git -c "alias.nc=commit -n" nc -m fix',
      "git -c alias.nc=commit nc -n -m fix",
      "git --config-env=alias.nc=ARC_ALIAS nc",
      "npm exec -c 'git commit -n -m fix'",
      "npm x --call 'git commit --no-verify -m fix'",
      "npx -c 'git commit -n -m fix'",
      "npx --call 'git commit --no-verify -m fix'",
      "xargs git commit -n -m fix",
      "find . -exec git commit -n -m fix {} +",
      "find . -execdir git commit -n -m fix {} +",
      "find . -ok git commit -n -m fix {} +",
      "find . -okdir git commit -n -m fix {} +",
      "nice -n 5 git commit -n -m fix",
      "caffeinate git commit --no-verify -m fix",
      "arch -arm64 git commit -n -m fix",
      "git commit --no-\\\nverify -m fix",
      "git commit \"--no-\\\nverify\" -m fix",
      '{ git commit -n -m fix; }',
      '(git commit --no-verify -m fix)',
      'x="$(git commit -n -m fix)"',
      'printf "%s" "$(git commit --no-verify -m fix)"',
      'printf "%s" "`git commit -n -m fix`"',
    ]) {
      const result = runShellHook(command);
      expect(result.status, command).toBe(2);
      expect(result.stderr, command).toContain("git --no-verify");
    }
  });

  it("does not mistake a quoted commit message for a bypass flag", () => {
    const result = runShellHook('git commit -m "document --no-verify behavior"');
    const exactValue = runShellHook('git commit -am "--no-verify"');
    const attachedValue = runShellHook("git commit -amnarrative");

    expect(result.status).toBe(0);
    expect(exactValue.status).toBe(0);
    expect(attachedValue.status).toBe(0);
  });

  it("honors Git value and post-double-dash data boundaries", () => {
    expect(runShellHook("git push -n origin main").status).toBe(0);
    expect(runShellHook("git commit -- -n").status).toBe(0);
    expect(runShellHook("git commit -m fix -- --no-verify").status).toBe(0);
    expect(runShellHook("git push origin -- --no-veri").status).toBe(0);
  });

  it("blocks shell-expanded security-relevant Git flags and dev tasks", () => {
    for (const command of [
      'FLAG=--no-verify; git commit "$FLAG" -m fix',
      "git commit $'--no-verify' -m fix",
      'git commit "$(printf -- --no-verify)" -m fix',
      'git commit --no-ver${EMPTY}ify -m fix',
      "git commit --no-ver{i..i}fy -m fix",
      'FLAG=--no-verify; git push origin main "$FLAG"',
      'sh -c \'git commit "$FLAG" -m fix\'',
      "touch -- --no-verify; git commit --no-ver* -m fix",
      'FLAG=--no-verify git -c \'alias.nc=!git commit "$FLAG"\' nc -m fix',
      'GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=alias.nc GIT_CONFIG_VALUE_0=\'!git commit "$FLAG"\' FLAG=--no-verify git nc -m fix',
      "GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=alias.nc GIT_CONFIG_VALUE_0=commit git nc -n -m fix",
      "GIT_CONFIG_COUNT=2 GIT_CONFIG_KEY_0=alias.a GIT_CONFIG_VALUE_0=b GIT_CONFIG_KEY_1=alias.b GIT_CONFIG_VALUE_1=commit git a -n -m fix",
      'git config alias.nc \'!git commit "$FLAG"\'; FLAG=--no-verify git nc -m fix',
      "git config alias.nc commit; git nc -n -m fix",
      "git config alias.nc '!git commit'; git nc -n -m fix",
      'export PAIR=alias.nc=ARC_ALIAS ARC_ALIAS=\'commit --no-verify\'; git --config-env "$PAIR" nc -m fix',
      'TASK=dev; bun "$TASK"',
      "bun $'dev'",
      'bun "$(printf dev)"',
      "bun d{e..e}v",
      "touch dev; bun d?v",
      'TASK=dev; npm run "$TASK"',
      'TASK=dev; npm exec next "$TASK"',
      'sh -c \'bun "$TASK"\'',
    ]) {
      const result = runShellHook(command);
      expect(result.status, command).toBe(2);
      expect(result.stderr, command).toMatch(/dynamic security-relevant arguments|git --no-verify/);
    }
  });

  it("blocks dynamic xargs arguments that can create a bypass or foreground dev launch", () => {
    for (const command of [
      "printf '%s\\n' --no-verify | xargs git commit -m fix",
      "printf '%s\\n' -n | xargs git commit -m fix",
      "printf '%s\\n' dev | xargs bun",
      "printf '%s\\n' dev | xargs npm run",
      "printf '%s\\n' 'next dev' | xargs npm exec -c",
    ]) {
      const result = runShellHook(command);
      expect(result.status, command).toBe(2);
      expect(result.stderr, command).toContain("dynamic security-relevant arguments");
    }
  });

  it("blocks runtime Git aliases that introduce hook bypasses", () => {
    for (const command of [
      "GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=alias.nc GIT_CONFIG_VALUE_0='commit --no-verify' git nc -m fix",
      "GIT_CONFIG_PARAMETERS='alias.nc=commit --no-verify' git nc -m fix",
      "git config alias.nc 'commit --no-verify'; git nc -m fix",
      "git config foo.ci commit; git config --rename-section foo alias; git ci -n --dry-run",
    ]) {
      const result = runShellHook(command);
      expect(result.status, command).toBe(2);
      expect(result.stderr, command).toContain("git --no-verify");
    }
  });

  it("resolves ambient Git aliases and composes them with invocation arguments", () => {
    const ambient = (aliases: string[]) => Object.fromEntries([
      ["GIT_CONFIG_COUNT", String(aliases.length)],
      ...aliases.flatMap((alias, index) => {
        const separator = alias.indexOf("=");
        return [
          [`GIT_CONFIG_KEY_${index}`, `alias.${alias.slice(0, separator)}`],
          [`GIT_CONFIG_VALUE_${index}`, alias.slice(separator + 1)],
        ];
      }),
    ]);

    for (const [command, aliases] of [
      ["git ci -n --dry-run", ["ci=commit"]],
      ["git ci --dry-run", ["ci=commit --no-verify"]],
      ["git a -n --dry-run", ["a=b", "b=commit"]],
      ["git ci -n --dry-run", ["ci=!git commit"]],
    ] as const) {
      const result = runShellHook(command, { env: ambient([...aliases]) });
      expect(result.status, command).toBe(2);
      expect(result.stderr, command).toContain("git --no-verify");
    }

    expect(runShellHook("git st -n", { env: ambient(["st=status"]) }).status).toBe(0);
    expect(runShellHook("git status -n", { env: ambient(["status=commit --no-verify"]) }).status).toBe(0);
    expect(runShellHook("git ci -n", { env: ambient(["ci=!sh -c 'git commit \"$@\"' -"]) }).status).toBe(2);
    expect(runShellHook("git ci -n", { env: ambient(["ci=-c user.name=x commit"]) }).status).toBe(2);
    expect(runShellHook("git -c alias.ci=foo ci -n", { env: ambient(["foo=commit"]) }).status).toBe(2);
  });

  it("never executes an untrusted Git-shaped path during ambient alias inspection", () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "archestimator-cursor-hook-git-"));
    const fakeGit = path.join(tempDir, "git");
    const marker = path.join(tempDir, "executed");
    writeFileSync(fakeGit, `#!/bin/sh\ntouch ${JSON.stringify(marker)}\nexit 0\n`);
    chmodSync(fakeGit, 0o755);

    try {
      const direct = runShellHook(`${JSON.stringify(fakeGit)} ci -n`);
      const pathOverride = runShellHook(`PATH=${JSON.stringify(tempDir)} git ci -n`);

      expect(direct.status).toBe(2);
      expect(pathOverride.status).toBe(2);
      expect(existsSync(marker)).toBe(false);
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  it("does not honor side-effecting command assignments during Git alias inspection", () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "archestimator-cursor-hook-trace-"));
    const leadingMarker = path.join(tempDir, "git-trace-leading.json");
    const inheritedMarker = path.join(tempDir, "git-trace-inherited.json");
    const inlineMarker = path.join(tempDir, "git-trace-inline.json");
    const configEnvMarker = path.join(tempDir, "git-trace-config-env.json");
    try {
      const leading = runShellHook(
        `GIT_TRACE2_EVENT=${JSON.stringify(leadingMarker)} git archestimator-definitely-not-an-alias -n`,
        { env: { GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" } },
      );
      const inherited = runShellHook("git archestimator-definitely-not-an-alias -n", {
        env: {
          GIT_CONFIG_GLOBAL: "/dev/null",
          GIT_CONFIG_NOSYSTEM: "1",
          GIT_TRACE2_EVENT: inheritedMarker,
        },
      });
      const inline = runShellHook(
        `git -c trace2.eventTarget=${JSON.stringify(inlineMarker)} archestimator-definitely-not-an-alias -n`,
        { env: { GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" } },
      );
      const configEnv = runShellHook(
        "git --config-env=trace2.eventTarget=ARC_TRACE_TARGET archestimator-definitely-not-an-alias -n",
        {
          env: {
            ARC_TRACE_TARGET: configEnvMarker,
            GIT_CONFIG_GLOBAL: "/dev/null",
            GIT_CONFIG_NOSYSTEM: "1",
          },
        },
      );

      expect(leading.status).toBe(2);
      expect(inherited.status).toBe(2);
      expect(inline.status).toBe(2);
      expect(configEnv.status).toBe(2);
      for (const marker of [leadingMarker, inheritedMarker, inlineMarker, configEnvMarker]) {
        expect(existsSync(marker), marker).toBe(false);
      }
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  it("blocks dynamic Git alias context before ambient inspection", () => {
    for (const command of [
      "HOME=/tmp/$(printf x) git ci -n",
      "HOME=<(printf /tmp) git ci -n",
      "HOME=$((1+1)) git ci -n",
      "GIT_CONFIG_GLOBAL=<(printf /tmp/config) git ci -n",
      "git -C <(printf /tmp) ci -n",
    ]) {
      const result = runShellHook(command, {
        env: { GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" },
      });
      expect(result.status, command).toBe(2);
      expect(result.stderr, command).toContain("dynamic security-relevant arguments");
    }
  });

  it("preserves Git -C context when resolving repository-local aliases", () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "archestimator-cursor-hook-repo-"));
    try {
      expect(spawnSync("git", ["init", "--quiet", tempDir]).status).toBe(0);
      expect(spawnSync("git", ["-C", tempDir, "config", "alias.ci", "commit"]).status).toBe(0);

      const commandPrefix = `git -C ${JSON.stringify(tempDir)}`;
      expect(runShellHook(`${commandPrefix} ci -n`).status).toBe(2);
      expect(runShellHook(`${commandPrefix} status -n`).status).toBe(0);
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  it("passes unrelated commands", () => {
    for (const command of [
      'printf "%s\\n" "--no-verify"',
      "npm exec echo dev",
      "npx echo next dev",
      "env -S git --version",
      "git -c 'user.name=literal --no-verify' status",
      "git -c alias.st=status st",
      "git -c 'alias.nc=commit -- --no-verify' nc",
      "npm exec -c 'next --version'",
      "npm x --call 'printf safe'",
      "npx -c 'printf safe'",
      "find . -exec printf safe {} +",
      "sh -c 'printf safe'",
      "sh -c 'printf \"$HOME\"'",
      'git commit -m "$MSG"',
      'git commit --message="$MSG"',
      'git commit -m"$MSG"',
      'git commit -- "$PATH"',
      'git push origin -- "$REF"',
      'git -C "$DIR" status',
      'git -c "user.name=$NAME" status',
      'git add "$FILE"',
      'git diff "$REF"',
      'git switch "$BRANCH"',
      'git fetch "$REMOTE"',
      'git config user.name "$NAME"',
      "git config alias.st status",
      "GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=alias.st GIT_CONFIG_VALUE_0=status git st",
      "GIT_CONFIG_PARAMETERS='user.name=Example' git status",
      "git commit '$FLAG' -m fix",
      "git commit '--no-ver*' -m fix",
      "bun '$TASK'",
      'bun "d{e..e}v"',
      "bun 'd?v'",
      'printf "%s" "$HOME"',
      "npm run build -- --label dev",
      'npm run build -- --label "$MSG"',
      "printf '%s\\n' path | xargs git commit -m fix --",
      "printf '%s\\n' label | xargs bun build",
      "printf value | xargs git config user.name",
      "printf value | xargs bun 'd?v'",
      "find . -exec bun 'd?v' {} +",
      'TASK=dev; bun "$TASK" &',
      "next-router dev",
      'printf "%s" "$(date)"',
      "cat <<'EOF'\ngit commit -n -m fix\nbun dev\nEOF",
      "cat <<EOF\ngit commit -n -m fix\nbun dev\nEOF",
      "printf '%s' 'git commit --no-\\\nverify'",
    ]) {
      expect(runShellHook(command).status, command).toBe(0);
    }
  });

  it("blocks foreground dev servers on tmux-capable hosts and permits Windows, tmux, and background launches", () => {
    for (const command of [
      "bun dev",
      "bun run dev",
      "bun dev 2>&1",
      "bun dev >/tmp/archestimator-dev.log 2>&1",
      "bun dev |& tee /tmp/archestimator-dev.log",
      "npx next dev",
      "npx next@16 dev",
      "bunx next dev",
      "next dev",
      "npm --silent run dev",
      "npm run --silent dev",
      "npm run-script dev",
      "npm --prefix app run-script dev",
      "npm -w app run dev",
      "npm --workspace app run dev",
      "pnpm --silent dev",
      "pnpm -w dev",
      "pnpm run-script dev",
      "yarn --silent dev",
      "yarn workspace app dev",
      "yarn workspace app run dev",
      "corepack pnpm dev",
      "corepack yarn dev",
      "node node_modules/next/dist/bin/next dev",
      "node --run dev",
      "node --run=dev",
      "node -r ./preload.js node_modules/next/dist/bin/next dev",
      "node --require ./preload.js node_modules/next/dist/bin/next dev",
      "node --import ./preload.js node_modules/next/dist/bin/next dev",
      "node --env-file .env.local node_modules/next/dist/bin/next dev",
      "bun node_modules/next/dist/bin/next dev",
      "bun run node_modules/next/dist/bin/next dev",
      "bun node_modules/.bin/next dev",
      "npm rum dev",
      "npm urn dev",
      "env -u NODE_ENV bun dev",
      "env --unset NODE_ENV bun dev",
      "env -C /tmp bun dev",
      "/usr/bin/env bun dev",
      'env -S "bun dev"',
      "env -S bun dev",
      'command env --split-string "bun dev"',
      "env --split-string bun dev",
      "env --split-string=bun dev",
      'eval "bun dev"',
      'sh -c "bun dev"',
      "npm exec -c 'next dev'",
      "npm exec --call 'next dev'",
      "npm x -c 'next dev'",
      "npm x --call 'next dev'",
      "npx -c 'next dev'",
      "npx --call 'next dev'",
      "xargs bun dev",
      "find . -exec bun dev {} +",
      "find . -execdir bun dev {} +",
      "nice -n 5 bun dev",
      "caffeinate bun dev",
      "arch -arm64 bun dev",
      "bun \\\ndev",
      "npm run \\\ndev",
      "next \\\ndev",
      '{ bun dev; }',
      '(bun dev)',
      'x="$(bun dev)"',
      'printf "%s" "`bun dev`"',
      "cat <<EOF\n$(bun dev)\nEOF",
    ]) {
      const foreground = runShellHook(command);
      if (process.platform === "win32") {
        expect(foreground.status, command).toBe(0);
        expect(foreground.stderr, command).not.toContain("run dev servers in tmux");
      } else {
        expect(foreground.status, command).toBe(2);
        expect(foreground.stderr, command).toContain("run dev servers in tmux");
      }
    }

    const launcher = runShellHook('tmux new-session -d -s arch-dev "bun dev"');
    const existingTmux = runShellHook("bun run dev", { tmux: true });
    const background = runShellHook("bun dev &");
    const nestedBackground = runShellHook('sh -c "bun dev &"');
    const splitBackground = runShellHook('env -S "bun dev" &');
    const redirectedBackground = runShellHook("bun dev >/tmp/archestimator-dev.log 2>&1 &");
    const groupedBackground = runShellHook("{ bun dev; } &");
    const pipedBackground = runShellHook("bun dev |& tee /tmp/archestimator-dev.log &");
    const wrappedBackground = runShellHook("nice bun dev &");
    const callBackground = runShellHook("npm exec -c 'next dev' &");
    const nativeRunnerBackground = [
      "node --run dev",
      "node -r ./preload.js node_modules/next/dist/bin/next dev",
      "bun node_modules/.bin/next dev",
      "npm rum dev",
    ].map(command => runShellHook(`${command} &`));
    const nativeRunnerTmux = [
      "node --run=dev",
      "node --import ./preload.js node_modules/next/dist/bin/next dev",
      "bun run node_modules/next/dist/bin/next dev",
      "npm urn dev",
    ].map(command => runShellHook(command, { tmux: true }));

    expect(launcher.status).toBe(0);
    expect(existingTmux.status).toBe(0);
    expect(background.status).toBe(0);
    expect(nestedBackground.status).toBe(0);
    expect(splitBackground.status).toBe(0);
    expect(redirectedBackground.status).toBe(0);
    expect(groupedBackground.status).toBe(0);
    expect(pipedBackground.status).toBe(0);
    expect(wrappedBackground.status).toBe(0);
    expect(callBackground.status).toBe(0);
    expect(nativeRunnerBackground.every(result => result.status === 0)).toBe(true);
    expect(nativeRunnerTmux.every(result => result.status === 0)).toBe(true);
  });

  it("fails closed when an executable program is generated by unresolved shell expansion", () => {
    for (const command of [
      "CMD='git commit -n -m fix'; sh -c \"$CMD\"",
      "CMD='bun dev'; eval \"$CMD\"",
      "sh -c \"$(printf 'git commit -n -m fix')\"",
      "eval \"$(printf 'bun dev')\"",
      "npm exec -c \"$CMD\"",
      "env -S \"$CMD\"",
    ]) {
      const result = runShellHook(command);
      expect(result.status, command).toBe(2);
      expect(result.stderr, command).toContain("unresolved shell expansion");
    }
  });

  it("fails closed when a shell interpreter receives its program through stdin", () => {
    for (const command of [
      "sh <<'EOF'\ngit commit -n -m fix\nEOF",
      "bash <<EOF\ngit commit --no-verify -m fix\nEOF",
      "zsh <<'EOF'\nbun dev\nEOF",
      "sh <<< 'git commit -n -m fix'",
      "bash -s <<< 'bun dev'",
      "printf 'git commit -n -m fix\\n' | sh",
    ]) {
      const result = runShellHook(command);
      expect(result.status, command).toBe(2);
      expect(result.stderr, command).toContain("shell interpreters receiving executable stdin");
    }

    expect(runShellHook("sh -c 'cat' <<'EOF'\nbun dev\nEOF").status).toBe(0);
    expect(runShellHook("printf 'data\\n' | sh ./scripts/read-stdin.sh").status).toBe(0);
  });

  it("uses Cursor's official file_path field for read-hook warnings and blocks", () => {
    const warning = runJsonHook(beforeReadHook, { file_path: "/tmp/.env.local" });
    const warningPass = runJsonHook(beforeReadHook, { file_path: "/tmp/readme.md" });
    const blocked = runJsonHook(beforeTabReadHook, { file_path: "/tmp/credentials.json" });
    const blockPass = runJsonHook(beforeTabReadHook, { file_path: "/tmp/readme.md" });

    expect(warning.status).toBe(0);
    expect(warning.stderr).toContain("WARNING: Reading sensitive file");
    expect(warningPass.status).toBe(0);
    expect(warningPass.stderr).not.toContain("WARNING");
    expect(blocked.status).toBe(2);
    expect(blocked.stderr).toContain("BLOCKED: Tab cannot read sensitive file");
    expect(blockPass.status).toBe(0);
  });

  it("fails closed on invalid or missing command input", () => {
    const invalid = runShellHook("{not-json", { raw: true });
    const missing = runShellHook("{}", { raw: true });

    expect(invalid.status).toBe(2);
    expect(invalid.stderr).toContain("invalid JSON");
    expect(missing.status).toBe(2);
    expect(missing.stderr).toContain("received no command");
  });

  it("fails the Tab read boundary closed without an official inspectable file_path", () => {
    for (const input of [{}, { file_path: "" }, { file_path: 123 }, { path: "/tmp/readme.md" }]) {
      const result = runJsonHook(beforeTabReadHook, input);
      expect(result.status, JSON.stringify(input)).toBe(2);
      expect(result.stderr, JSON.stringify(input)).toContain("no inspectable file_path");
    }
  });
});
