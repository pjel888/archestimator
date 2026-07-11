#!/usr/bin/env node
'use strict';

const path = require('path');
const { spawnSync } = require('child_process');
const { accessSync, constants, realpathSync } = require('fs');
const { hookEnabled, readStdin } = require('./adapter');

const SHELL_SEPARATORS = new Set([';', '&&', '||', '|', '|&', '&', '\n']);
const LIST_SEPARATORS = new Set([';', '&&', '||', '\n']);
const GROUP_OPENERS = new Set(['(', '{']);
const GROUP_CLOSERS = new Set([')', '}']);
const NESTED_SHELLS = new Set(['bash', 'dash', 'sh', 'zsh']);
const NESTED_SHELL_VALUE_OPTIONS = new Set(['-O', '-o', '--init-file', '--rcfile']);
const ENV_VALUE_OPTIONS = new Set(['-C', '-S', '-u', '--chdir', '--split-string', '--unset']);
const GIT_GLOBAL_VALUE_OPTIONS = new Set([
  '-C',
  '-c',
  '--config-env',
  '--exec-path',
  '--git-dir',
  '--namespace',
  '--super-prefix',
  '--work-tree',
]);
const GIT_CONFIG_VALUE_OPTIONS = new Set([
  '-f',
  '--blob',
  '--comment-char',
  '--comment-string',
  '--default',
  '--expiry-date',
  '--file',
  '--type',
]);
const GIT_CONFIG_READ_ACTIONS = new Set(['get', 'get-all', 'get-regexp', 'get-urlmatch', 'list']);
const GIT_CONFIG_READ_OPTIONS = new Set([
  '-l',
  '--get',
  '--get-all',
  '--get-color',
  '--get-colorbool',
  '--get-regexp',
  '--get-urlmatch',
  '--list',
]);
const GIT_CONFIG_MUTATION_ACTIONS = new Set(['add', 'replace-all', 'set', 'set-all']);
const VALUE_OPTIONS = new Set([
  '-C', '-c', '-F', '-m', '-S', '-u',
  '--author', '--cleanup', '--date', '--exec', '--file', '--fixup', '--message',
  '--pathspec-from-file', '--push-option', '--receive-pack', '--reedit-message',
  '--repo', '--reuse-message', '--squash', '--strategy', '--strategy-option',
  '--template', '--trailer',
]);
const COMMIT_SHORT_VALUE_OPTIONS = new Set(['C', 'c', 'F', 'm', 'S', 'u']);
const NO_VERIFY_LONG_OPTION_PATTERN = /^--no-veri(?:f(?:y)?)?$/u;
const XARGS_VALUE_OPTIONS = new Set([
  '-E', '-I', '-L', '-P', '-a', '-d', '-n', '-s',
  '--arg-file', '--delimiter', '--eof', '--max-args', '--max-chars',
  '--max-lines', '--max-procs', '--replace',
]);
const FIND_EXEC_OPTIONS = new Set(['-exec', '-execdir', '-ok', '-okdir']);
const RUNNER_VALUE_OPTIONS = new Set([
  '-C',
  '-F',
  '-c',
  '-p',
  '--cache',
  '--config',
  '--cwd',
  '--dir',
  '--filter',
  '--package',
  '--prefix',
  '--registry',
  '--userconfig',
]);
const NODE_VALUE_OPTIONS = new Set([
  '-r',
  '--conditions',
  '--env-file',
  '--env-file-if-exists',
  '--experimental-loader',
  '--import',
  '--loader',
  '--require',
]);
const GIT_ALIAS_CONTEXT_ENV_KEYS = new Set([
  'GIT_CEILING_DIRECTORIES',
  'GIT_COMMON_DIR',
  'GIT_DIR',
  'GIT_DISCOVERY_ACROSS_FILESYSTEM',
  'GIT_WORK_TREE',
  'HOME',
  'XDG_CONFIG_HOME',
]);
const GIT_ALIAS_BASE_ENV_KEYS = new Set([
  ...GIT_ALIAS_CONTEXT_ENV_KEYS,
  'APPDATA',
  'COMSPEC',
  'HOMEDRIVE',
  'HOMEPATH',
  'LANG',
  'LC_ALL',
  'LC_CTYPE',
  'LOCALAPPDATA',
  'SYSTEMROOT',
  'TEMP',
  'TMP',
  'TMPDIR',
  'USERPROFILE',
  'WINDIR',
]);
const GIT_ALIAS_QUERY_VALUE_OPTIONS = new Set([
  '-C',
  '--git-dir',
  '--namespace',
  '--super-prefix',
  '--work-tree',
]);
const GIT_ALIAS_QUERY_FLAG_OPTIONS = new Set([
  '-P',
  '--bare',
  '--glob-pathspecs',
  '--icase-pathspecs',
  '--literal-pathspecs',
  '--no-optional-locks',
  '--no-pager',
  '--no-replace-objects',
  '--noglob-pathspecs',
]);
const GIT_BUILTIN_CACHE = new Map();

function resolveTrustedGitExecutable() {
  const executableNames = process.platform === 'win32' ? ['git.exe', 'git'] : ['git'];
  for (const directory of String(process.env.PATH || '').split(path.delimiter)) {
    if (!directory || !path.isAbsolute(directory)) continue;
    for (const executableName of executableNames) {
      const candidate = path.join(directory, executableName);
      try {
        accessSync(candidate, constants.X_OK);
        return realpathSync(candidate);
      } catch {
        // Keep searching the trusted hook PATH.
      }
    }
  }
  return null;
}

const TRUSTED_GIT_EXECUTABLE = resolveTrustedGitExecutable();

function tokenValue(token) {
  return typeof token === 'string' ? token : token.value;
}

function tokenHasExpansion(token) {
  return typeof token === 'object' && token !== null && token.expanded === true;
}

function dollarStartsExpansion(command, index) {
  return /[A-Za-z0-9_?*@#!$'"{(\-]/u.test(command[index + 1] || '');
}

function braceStartsExpansion(command, index) {
  const closing = command.indexOf('}', index + 1);
  if (closing === -1) return false;
  return /(?:\.\.|,)/u.test(command.slice(index + 1, closing));
}

function bracketStartsExpansion(command, index) {
  for (let cursor = index + 1; cursor < command.length; cursor += 1) {
    if (command[cursor] === ']') return cursor > index + 1;
    if (/\s|[;&|()<>]/u.test(command[cursor])) return false;
  }
  return false;
}

function parenthesizedExpansionEnd(command, openIndex) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let cursor = openIndex; cursor < command.length; cursor += 1) {
    const character = command[cursor];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === '\\') {
      escaped = true;
      continue;
    }
    if (quote) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      continue;
    }
    if (character === '(') depth += 1;
    if (character === ')') {
      depth -= 1;
      if (depth === 0) return cursor;
    }
  }
  return -1;
}

function tokenizeShellDetailed(command) {
  const tokens = [];
  let token = '';
  let tokenExpanded = false;
  let quote = null;
  let escaped = false;

  const pushToken = () => {
    if (token) tokens.push({ value: token, expanded: tokenExpanded });
    token = '';
    tokenExpanded = false;
  };

  const pushOperator = value => {
    tokens.push({ value, expanded: false });
  };

  for (let index = 0; index < command.length; index += 1) {
    const character = command[index];

    if (escaped) {
      if (character !== '\n') token += character;
      escaped = false;
      continue;
    }

    if (quote) {
      if (character === quote) {
        quote = null;
      } else if (character === '\\' && quote === '"') {
        escaped = true;
      } else {
        if (quote === '"' && character === '$' && dollarStartsExpansion(command, index)) {
          tokenExpanded = true;
        }
        if (quote === '"' && character === '`') tokenExpanded = true;
        token += character;
      }
      continue;
    }

    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }

    if (character === '\\') {
      escaped = true;
      continue;
    }

    if (['$', '<', '>'].includes(character) && command[index + 1] === '(') {
      const expansionEnd = parenthesizedExpansionEnd(command, index + 1);
      tokenExpanded = true;
      if (expansionEnd === -1) {
        token += command.slice(index);
        index = command.length;
      } else {
        token += command.slice(index, expansionEnd + 1);
        index = expansionEnd;
      }
      continue;
    }

    if (/\s/.test(character)) {
      pushToken();
      if (character === '\n') pushOperator('\n');
      continue;
    }

    if (character === '&' && command[index + 1] === '>') {
      pushToken();
      let operator = '&>';
      index += 1;
      if (command[index + 1] === '>') {
        operator += '>';
        index += 1;
      }
      pushOperator(operator);
      continue;
    }

    if (character === '<' || character === '>') {
      let operator = '';
      if (/^\d+$/u.test(token)) {
        operator = token;
        token = '';
      } else {
        pushToken();
      }
      operator += character;
      const next = command[index + 1];
      if (
        next === character ||
        (character === '>' && (next === '&' || next === '|')) ||
        (character === '<' && (next === '&' || next === '>'))
      ) {
        operator += next;
        index += 1;
        if (operator.endsWith('<<') && ['<', '-'].includes(command[index + 1])) {
          operator += command[index + 1];
          index += 1;
        }
      }
      pushOperator(operator);
      continue;
    }

    const standaloneBrace = (character === '{' || character === '}') && token === '' &&
      /(?:^|[\s;&|()])/u.test(command[index - 1] || '') &&
      /(?:$|[\s;&|()])/u.test(command[index + 1] || '');
    if (character === '(' || character === ')' || standaloneBrace) {
      pushToken();
      pushOperator(character);
      continue;
    }

    if (character === '{' && braceStartsExpansion(command, index)) tokenExpanded = true;
    if (character === '*' || character === '?' ||
      (character === '[' && bracketStartsExpansion(command, index))) {
      tokenExpanded = true;
    }

    if (character === '$' && dollarStartsExpansion(command, index)) tokenExpanded = true;
    if (character === '`') tokenExpanded = true;

    if (character === '|' && command[index + 1] === '&') {
      pushToken();
      pushOperator('|&');
      index += 1;
      continue;
    }

    if (character === ';' || character === '|' || character === '&') {
      pushToken();
      const doubled = command[index + 1] === character;
      pushOperator(doubled ? character + character : character);
      if (doubled) index += 1;
      continue;
    }

    token += character;
  }

  if (escaped) token += '\\';
  pushToken();
  return tokens;
}

function tokenizeShell(command) {
  return tokenizeShellDetailed(command).map(tokenValue);
}

function isRedirectionOperator(token) {
  return /^(?:(?:\d+)?(?:<<<|<<-|<<|<>|>>|>\||>&|<&|>|<)|&(?:>>|>))$/u.test(tokenValue(token));
}

function isInputRedirectionOperator(token) {
  return /^(?:\d+)?(?:<<<|<<-|<<|<>|<&|<)$/u.test(tokenValue(token));
}

function stripRedirections(tokens) {
  const command = [];
  for (let index = 0; index < tokens.length; index += 1) {
    if (isRedirectionOperator(tokens[index])) {
      index += 1;
      continue;
    }
    command.push(tokens[index]);
  }
  return command;
}

function parseClauses(tokens) {
  const clauses = [];
  let clause = [];
  let listStart = 0;
  const groupStarts = [];
  let closedGroupStart = null;
  let stdinFromPipe = false;

  const pushClause = () => {
    const hasInputRedirection = clause.some(isInputRedirectionOperator);
    const command = stripRedirections(clause);
    if (command.length) {
      clauses.push({
        tokens: command.map(tokenValue),
        expansions: command.map(tokenHasExpansion),
        background: false,
        hasInputRedirection,
        stdinFromPipe,
      });
      stdinFromPipe = false;
    }
    clause = [];
  };

  for (const token of tokens) {
    const value = tokenValue(token);
    if (GROUP_OPENERS.has(value)) {
      pushClause();
      groupStarts.push(clauses.length);
      closedGroupStart = null;
      continue;
    }
    if (GROUP_CLOSERS.has(value)) {
      pushClause();
      closedGroupStart = groupStarts.pop() ?? clauses.length;
      continue;
    }
    if (SHELL_SEPARATORS.has(value)) {
      pushClause();
      if (value === '&') {
        const backgroundStart = closedGroupStart ?? listStart;
        for (let index = backgroundStart; index < clauses.length; index += 1) {
          clauses[index].background = true;
        }
        listStart = clauses.length;
      } else if (LIST_SEPARATORS.has(value)) {
        listStart = clauses.length;
      }
      if (value === '|' || value === '|&') stdinFromPipe = true;
      else if (value !== '&') stdinFromPipe = false;
      closedGroupStart = null;
      continue;
    }
    clause.push(token);
  }
  pushClause();
  return clauses;
}

function findHereDocuments(line) {
  const documents = [];
  let quote = null;
  let escaped = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (quote) {
      if (character === quote) quote = null;
      else if (character === '\\' && quote === '"') escaped = true;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }
    if (character === '\\') {
      escaped = true;
      continue;
    }
    if (character !== '<' || line[index + 1] !== '<' || line[index + 2] === '<') continue;

    let cursor = index + 2;
    const stripTabs = line[cursor] === '-';
    if (stripTabs) cursor += 1;
    while (/\s/u.test(line[cursor] || '')) cursor += 1;

    let delimiter = '';
    let quoted = false;
    const delimiterQuote = line[cursor];
    if (delimiterQuote === "'" || delimiterQuote === '"') {
      quoted = true;
      cursor += 1;
      while (cursor < line.length && line[cursor] !== delimiterQuote) {
        delimiter += line[cursor];
        cursor += 1;
      }
    } else {
      while (cursor < line.length && !/[\s;&|()<>]/u.test(line[cursor])) {
        if (line[cursor] === '\\' && cursor + 1 < line.length) {
          quoted = true;
          cursor += 1;
        }
        delimiter += line[cursor];
        cursor += 1;
      }
    }
    if (delimiter) documents.push({ delimiter, quoted, stripTabs });
    index = Math.max(index, cursor - 1);
  }
  return documents;
}

function stripHereDocuments(command) {
  const sourceLines = [];
  const expandableBodies = [];
  const pending = [];

  for (const line of command.split('\n')) {
    if (pending.length) {
      const document = pending[0];
      const comparison = document.stripTabs ? line.replace(/^\t+/u, '') : line;
      if (comparison === document.delimiter) {
        pending.shift();
      } else if (!document.quoted) {
        expandableBodies.push(line);
      }
      continue;
    }
    sourceLines.push(line);
    pending.push(...findHereDocuments(line));
  }

  return { source: sourceLines.join('\n'), expandableBodies };
}

function extractCommandSubstitutions(source) {
  const substitutions = [];
  let quote = null;
  let escaped = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (quote === "'") {
      if (character === "'") quote = null;
      continue;
    }
    if (character === '\\') {
      escaped = true;
      continue;
    }
    if (character === "'") {
      quote = character;
      continue;
    }
    if (character === '"') {
      quote = quote === '"' ? null : '"';
      continue;
    }
    if (character === '`') {
      let cursor = index + 1;
      let innerEscaped = false;
      for (; cursor < source.length; cursor += 1) {
        if (innerEscaped) {
          innerEscaped = false;
          continue;
        }
        if (source[cursor] === '\\') {
          innerEscaped = true;
          continue;
        }
        if (source[cursor] === '`') break;
      }
      if (cursor < source.length) {
        substitutions.push(source.slice(index + 1, cursor));
        index = cursor;
      }
      continue;
    }
    if (character !== '$' || source[index + 1] !== '(') continue;

    let cursor = index + 2;
    let depth = 1;
    let innerQuote = null;
    let innerEscaped = false;
    for (; cursor < source.length; cursor += 1) {
      const inner = source[cursor];
      if (innerEscaped) {
        innerEscaped = false;
        continue;
      }
      if (inner === '\\') {
        innerEscaped = true;
        continue;
      }
      if (innerQuote) {
        if (inner === innerQuote) innerQuote = null;
        continue;
      }
      if (inner === "'" || inner === '"') {
        innerQuote = inner;
        continue;
      }
      if (inner === '(') depth += 1;
      if (inner === ')') {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    if (depth === 0) {
      substitutions.push(source.slice(index + 2, cursor));
      index = cursor;
    }
  }
  return substitutions;
}

function collectShellClauses(command, depth = 0) {
  const { source, expandableBodies } = stripHereDocuments(command);
  const clauses = parseClauses(tokenizeShellDetailed(source));
  if (depth >= 3) return clauses;

  const substitutions = [source, ...expandableBodies]
    .flatMap(extractCommandSubstitutions);
  for (const substitution of substitutions) {
    clauses.push(...collectShellClauses(substitution, depth + 1));
  }
  return clauses;
}

function executableName(token) {
  return path.basename(String(token || '')).replace(/\.exe$/i, '');
}

function commandIndex(clause, { stopBeforeEnv = false } = {}) {
  let index = 0;

  while (index < clause.length && (/^[A-Za-z_][A-Za-z0-9_]*=/.test(clause[index]) || clause[index] === '!')) {
    index += 1;
  }

  while (index < clause.length) {
    const executable = executableName(clause[index]);
    if (executable === 'env') {
      if (stopBeforeEnv) return index;
      index += 1;
      while (index < clause.length) {
        const token = clause[index];
        if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(token)) {
          index += 1;
          continue;
        }
        if (!token.startsWith('-')) break;
        const optionName = token.split('=', 1)[0];
        index += 1;
        if (ENV_VALUE_OPTIONS.has(optionName) && !token.includes('=')) index += 1;
      }
      continue;
    }

    if (!['arch', 'caffeinate', 'command', 'corepack', 'exec', 'nice', 'nohup', 'setsid', 'stdbuf', 'sudo', 'time'].includes(executable)) break;
    const wrapper = executable;
    index += 1;
    while (index < clause.length && clause[index].startsWith('-')) {
      const option = clause[index];
      index += 1;
      if (
        (wrapper === 'sudo' && /^(?:-[CghpRTtu]|--chdir|--group|--host|--prompt|--role|--type|--user)$/u.test(option)) ||
        (wrapper === 'exec' && option === '-a') ||
        (wrapper === 'nice' && ['-n', '--adjustment'].includes(option)) ||
        (wrapper === 'caffeinate' && ['-t', '-w'].includes(option)) ||
        (wrapper === 'arch' && option === '--arch') ||
        (wrapper === 'stdbuf' && ['-e', '-i', '-o'].includes(option))
      ) {
        index += 1;
      }
    }
  }

  return index;
}

function optionConsumesNext(token) {
  if (VALUE_OPTIONS.has(token)) return true;
  return /^-[^-]+[CcFmSu]$/.test(token);
}

function commitShortClusterHasNoVerify(token) {
  if (!/^-[^-]+$/u.test(token)) return false;
  for (const option of token.slice(1)) {
    if (option === 'n') return true;
    if (COMMIT_SHORT_VALUE_OPTIONS.has(option)) return false;
  }
  return false;
}

function gitSubcommandIndex(clause, gitIndex) {
  for (let index = gitIndex + 1; index < clause.length; index += 1) {
    const token = clause[index];
    if (token === '--') return index + 1 < clause.length ? index + 1 : -1;
    if (!token.startsWith('-')) return index;

    const optionName = token.split('=', 1)[0];
    if (GIT_GLOBAL_VALUE_OPTIONS.has(optionName) && !token.includes('=')) index += 1;
  }
  return -1;
}

function envSplitProgram(clause) {
  const envIndex = commandIndex(clause, { stopBeforeEnv: true });
  if (executableName(clause[envIndex]) !== 'env') return null;

  for (let index = envIndex + 1; index < clause.length; index += 1) {
    const token = clause[index];
    if (token === '-S' || token === '--split-string') {
      return index + 1 < clause.length ? clause.slice(index + 1).join(' ') : null;
    }
    if (token.startsWith('--split-string=')) {
      return [token.slice('--split-string='.length), ...clause.slice(index + 1)].join(' ');
    }
    if (token.startsWith('-S') && token.length > 2) {
      return [token.slice(2), ...clause.slice(index + 1)].join(' ');
    }
    if (!token.startsWith('-') && !/^[A-Za-z_][A-Za-z0-9_]*=/.test(token)) break;
    const optionName = token.split('=', 1)[0];
    if (ENV_VALUE_OPTIONS.has(optionName) && !token.includes('=')) index += 1;
  }
  return null;
}

function packageCallProgram(clause, executableIndex) {
  const executable = executableName(clause[executableIndex]);
  const args = clause.slice(executableIndex + 1);
  let startIndex = 0;

  if (executable === 'npm') {
    const command = runnerPositionalEntries(args, 'npm')[0];
    if (!command || !['exec', 'x'].includes(command.token)) return null;
    startIndex = command.index + 1;
  } else if (executable !== 'npx') {
    return null;
  }

  for (let index = startIndex; index < args.length; index += 1) {
    const token = args[index];
    if (token === '-c' || token === '--call') {
      return index + 1 < args.length ? args[index + 1] : null;
    }
    if (token.startsWith('--call=')) return token.slice('--call='.length);
    if (token.startsWith('-c') && token.length > 2) return token.slice(2);
  }
  return null;
}

function xargsCommand(clause, executableIndex) {
  for (let index = executableIndex + 1; index < clause.length; index += 1) {
    const token = clause[index];
    if (token === '--') return clause.slice(index + 1);
    if (!token.startsWith('-') || token === '-') return clause.slice(index);

    const optionName = token.split('=', 1)[0];
    if (XARGS_VALUE_OPTIONS.has(optionName) && !token.includes('=')) index += 1;
  }
  return [];
}

function findCommandEntries(clause, executableIndex) {
  const commands = [];
  for (let index = executableIndex + 1; index < clause.length; index += 1) {
    if (!FIND_EXEC_OPTIONS.has(clause[index])) continue;
    const startIndex = index + 1;
    const command = [];
    for (index += 1; index < clause.length; index += 1) {
      if (clause[index] === ';' || clause[index] === '+') break;
      command.push(clause[index]);
    }
    if (command.length) commands.push({ startIndex, tokens: command });
  }
  return commands;
}

function findCommands(clause, executableIndex) {
  return findCommandEntries(clause, executableIndex).map(entry => entry.tokens);
}

function directNestedEntry(tokens, expansions) {
  return {
    tokens,
    expansions: Array.isArray(expansions) ? expansions : tokens.map(() => false),
    background: false,
    hasInputRedirection: false,
    stdinFromPipe: false,
  };
}

function nestedShellClauses(clause, expansions = null) {
  const splitProgram = envSplitProgram(clause);
  if (splitProgram !== null) return collectShellClauses(splitProgram);

  const shellIndex = commandIndex(clause);
  const executable = executableName(clause[shellIndex]);
  const callProgram = packageCallProgram(clause, shellIndex);
  if (callProgram !== null) return collectShellClauses(callProgram);

  if (executable === 'xargs') {
    const command = xargsCommand(clause, shellIndex);
    if (!command.length) return [];
    const startIndex = clause.length - command.length;
    return [directNestedEntry(
      command,
      Array.isArray(expansions) ? expansions.slice(startIndex) : null,
    )];
  }
  if (executable === 'find') {
    return findCommandEntries(clause, shellIndex).map(command => directNestedEntry(
      command.tokens,
      Array.isArray(expansions)
        ? expansions.slice(command.startIndex, command.startIndex + command.tokens.length)
        : null,
    ));
  }
  if (executable === 'eval' && shellIndex + 1 < clause.length) {
    return collectShellClauses(clause.slice(shellIndex + 1).join(' '));
  }
  if (!NESTED_SHELLS.has(executable)) return [];

  for (let index = shellIndex + 1; index < clause.length; index += 1) {
    const token = clause[index];
    if (/^-[^-]*c[^-]*$/u.test(token) && index + 1 < clause.length) {
      return collectShellClauses(clause[index + 1]);
    }
  }
  return [];
}

function unresolvedExecutableToken(token) {
  return /\$(?:[A-Za-z_][A-Za-z0-9_]*|\{|\(|$)|`/u.test(String(token || ''));
}

function hasUnresolvedExecutableProgram(clause, depth = 0) {
  if (depth > 5) return true;
  const index = commandIndex(clause);
  if (index < clause.length && unresolvedExecutableToken(clause[index])) return true;
  return nestedShellClauses(clause)
    .some(entry => hasUnresolvedExecutableProgram(entry.tokens, depth + 1));
}

function shellReadsProgramFromStdin(entry) {
  if (!entry.hasInputRedirection && !entry.stdinFromPipe) return false;
  const shellIndex = commandIndex(entry.tokens);
  if (!NESTED_SHELLS.has(executableName(entry.tokens[shellIndex]))) return false;

  for (let index = shellIndex + 1; index < entry.tokens.length; index += 1) {
    const token = entry.tokens[index];
    if (/^-[^-]*c[^-]*$/u.test(token)) return false;
    if (NESTED_SHELL_VALUE_OPTIONS.has(token)) {
      index += 1;
      continue;
    }
    if (token === '--') {
      const scriptPath = entry.tokens[index + 1];
      return !scriptPath || scriptPath === '-' || scriptPath === '/dev/stdin';
    }
    if (token.startsWith('-')) continue;
    return token === '-' || token === '/dev/stdin';
  }
  return true;
}

function hasRuntimeGitAliasInjection(clause, gitIndex, subcommandIndex, depth) {
  const assignments = new Map();
  for (const token of clause.slice(0, gitIndex)) {
    const equalsIndex = token.indexOf('=');
    if (equalsIndex === -1) continue;
    assignments.set(token.slice(0, equalsIndex), token.slice(equalsIndex + 1));
  }

  const runtimeAliases = new Map();
  for (const [key, value] of assignments) {
    const match = key.match(/^GIT_CONFIG_KEY_(\d+)$/u);
    if (!match || !/^alias\./iu.test(value)) continue;
    const aliasName = value.slice('alias.'.length).toLowerCase();
    const aliasValue = assignments.get(`GIT_CONFIG_VALUE_${match[1]}`);
    runtimeAliases.set(aliasName, aliasValue
      ? { opaque: false, value: aliasValue }
      : { opaque: true, value: null });
  }

  if ([...assignments.entries()].some(([key, value]) =>
    key === 'GIT_CONFIG_PARAMETERS' && /(?:^|\s)alias\./iu.test(value))) {
    return true;
  }

  const subcommand = clause[subcommandIndex]?.toLowerCase();
  const alias = runtimeAliases.get(subcommand);
  if (!alias) return false;
  if (alias.opaque) return true;
  return aliasCommandHasHookBypass(
    [alias.value, ...clause.slice(subcommandIndex + 1)].join(' '),
    runtimeAliases,
    new Set([subcommand]),
    depth + 1,
  );
}

function gitInvocationOverridesPath(clause, gitIndex) {
  for (let index = 0; index < gitIndex; index += 1) {
    const token = clause[index];
    if (/^PATH=/u.test(token)) return true;
    if (/^(?:-u|--unset)$/u.test(token) && clause[index + 1] === 'PATH') return true;
    if (/^(?:-uPATH|--unset=PATH)$/u.test(token)) return true;
  }
  return false;
}

function trustedGitExecutable(clause, gitIndex) {
  if (!TRUSTED_GIT_EXECUTABLE || gitInvocationOverridesPath(clause, gitIndex)) return null;
  const requested = clause[gitIndex];
  if (requested === 'git') return TRUSTED_GIT_EXECUTABLE;
  try {
    return realpathSync(requested) === TRUSTED_GIT_EXECUTABLE ? TRUSTED_GIT_EXECUTABLE : null;
  } catch {
    return null;
  }
}

function gitBuiltinCommands() {
  if (!TRUSTED_GIT_EXECUTABLE) return new Set();
  if (GIT_BUILTIN_CACHE.has(TRUSTED_GIT_EXECUTABLE)) {
    return GIT_BUILTIN_CACHE.get(TRUSTED_GIT_EXECUTABLE);
  }
  const result = spawnSync(TRUSTED_GIT_EXECUTABLE, ['--list-cmds=builtins'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: safeGitAliasBaseEnvironment(),
    stdio: ['ignore', 'pipe', 'ignore'],
    timeout: 1000,
  });
  const commands = result.status === 0
    ? new Set(result.stdout.split(/\s+/u).filter(Boolean))
    : new Set();
  GIT_BUILTIN_CACHE.set(TRUSTED_GIT_EXECUTABLE, commands);
  return commands;
}

function safeGitAliasBaseEnvironment() {
  const environment = {};
  for (const [name, value] of Object.entries(process.env)) {
    if (
      GIT_ALIAS_BASE_ENV_KEYS.has(name) ||
      name.startsWith('GIT_CONFIG_') ||
      name.startsWith('LC_')
    ) {
      environment[name] = value;
    }
  }
  return environment;
}

function configuredGitAliasEnvironment(clause, gitIndex) {
  const environment = safeGitAliasBaseEnvironment();
  for (const token of clause.slice(0, gitIndex)) {
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/u.exec(token);
    if (!match) return null;
    const [, name, value] = match;
    if (name === 'PATH') return null;
    if (!name.startsWith('GIT_CONFIG_') && !GIT_ALIAS_CONTEXT_ENV_KEYS.has(name)) continue;
    if (/[$`~*?{}\[]/u.test(value)) return null;
    environment[name] = value;
  }
  return environment;
}

function configuredGitAliasPrefix(clause, gitIndex, subcommandIndex) {
  const prefix = [];
  for (let index = gitIndex + 1; index < subcommandIndex; index += 1) {
    const token = clause[index];
    if (token === '--') continue;
    const optionName = token.split('=', 1)[0];
    if (GIT_ALIAS_QUERY_FLAG_OPTIONS.has(token)) {
      prefix.push(token);
      continue;
    }
    if (token.startsWith('-C') && token.length > 2) {
      if (/[$`~*?{}\[]|[<>]\(/u.test(token.slice(2))) return null;
      prefix.push(token);
      continue;
    }
    if (GIT_ALIAS_QUERY_VALUE_OPTIONS.has(optionName)) {
      if (token.includes('=')) {
        const value = token.slice(token.indexOf('=') + 1);
        if (/[$`~*?{}\[]|[<>]\(/u.test(value)) return null;
        prefix.push(token);
        continue;
      }
      const value = clause[index + 1];
      if (value === undefined || /[$`~*?{}\[]|[<>]\(/u.test(value)) return null;
      prefix.push(token, value);
      index += 1;
      continue;
    }
    return null;
  }
  return prefix;
}

function configuredGitAliases(clause, gitIndex, subcommandIndex) {
  const executable = trustedGitExecutable(clause, gitIndex);
  if (!executable) return { aliases: new Map(), opaque: true };
  const prefix = configuredGitAliasPrefix(clause, gitIndex, subcommandIndex);
  const environment = configuredGitAliasEnvironment(clause, gitIndex);
  if (!prefix || !environment) return { aliases: new Map(), opaque: true };

  const result = spawnSync(executable, [...prefix, 'config', '--null', '--get-regexp', '^alias\.'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: environment,
    stdio: ['ignore', 'pipe', 'ignore'],
    timeout: 1000,
  });
  if (result.status === 1 && !result.stdout) return { aliases: new Map(), opaque: false };
  if (result.status !== 0) return { aliases: new Map(), opaque: true };

  const aliases = new Map();
  for (const record of result.stdout.split('\0')) {
    if (!record) continue;
    const separator = record.indexOf('\n');
    if (separator === -1) return { aliases: new Map(), opaque: true };
    const key = record.slice(0, separator);
    const match = key.match(/^alias\.(.+)$/iu);
    if (!match) continue;
    aliases.set(match[1].toLowerCase(), {
      opaque: false,
      value: record.slice(separator + 1),
    });
  }
  return { aliases, opaque: false };
}

function parseInlineGitAliases(clause, gitIndex, subcommandIndex) {
  const aliases = new Map();

  const record = (entry, opaque) => {
    const equalsIndex = entry.indexOf('=');
    if (equalsIndex === -1) return;
    const key = entry.slice(0, equalsIndex);
    const match = key.match(/^alias\.(.+)$/iu);
    if (!match) return;
    aliases.set(match[1].toLowerCase(), {
      opaque,
      value: opaque ? null : entry.slice(equalsIndex + 1),
    });
  };

  for (let index = gitIndex + 1; index < subcommandIndex; index += 1) {
    const token = clause[index];
    if (token === '-c') {
      if (index + 1 < subcommandIndex) record(clause[index + 1], false);
      index += 1;
      continue;
    }
    if (token.startsWith('-c') && token.length > 2) {
      record(token.slice(2), false);
      continue;
    }
    if (token === '--config-env') {
      if (index + 1 < subcommandIndex) record(clause[index + 1], true);
      index += 1;
      continue;
    }
    if (token.startsWith('--config-env=')) {
      record(token.slice('--config-env='.length), true);
    }
  }
  return aliases;
}

function invocationHasHookBypass(clause, startIndex, commitCommand) {
  for (let index = startIndex; index < clause.length; index += 1) {
    const token = clause[index];
    if (token === '--') break;
    if (
      NO_VERIFY_LONG_OPTION_PATTERN.test(token) ||
      (commitCommand && commitShortClusterHasNoVerify(token))
    ) return true;
    if (optionConsumesNext(token)) index += 1;
  }
  return false;
}

function aliasCommandHasHookBypass(command, aliases, seen, depth) {
  if (depth > 5) return true;

  const rawCommand = String(command).trim();
  if (rawCommand.startsWith('!') || rawCommand.startsWith('-')) return true;
  const executableCommand = rawCommand;
  return collectShellClauses(executableCommand).some(entry => {
    const clause = entry.tokens;
    const commandStart = commandIndex(clause);
    const executable = executableName(clause[commandStart]).toLowerCase();
    if (unresolvedExecutableToken(clause[commandStart])) return true;
    if (executable === 'git') {
      return gitHasExpandedSensitiveArgument(entry) || hasGitNoVerifyFlag(clause, depth + 1);
    }
    if (executable === 'commit') {
      if (entry.expansions?.slice(commandStart + 1).some(Boolean)) return true;
      return invocationHasHookBypass(clause, commandStart + 1, true);
    }
    if (gitBuiltinCommands().has(executable)) {
      return invocationHasHookBypass(clause, commandStart + 1, false);
    }

    const alias = aliases.get(executable);
    if (!alias || seen.has(executable)) return true;
    if (alias.opaque) return true;
    return aliasCommandHasHookBypass(
      [alias.value, ...clause.slice(commandStart + 1)].join(' '),
      aliases,
      new Set([...seen, executable]),
      depth + 1,
    );
  });
}

function aliasCommandTargetsCommit(command, aliases, seen, depth) {
  if (depth > 5) return true;

  const executableCommand = String(command).replace(/^!\s*/u, '');
  return collectShellClauses(executableCommand).some(entry => {
    const clause = entry.tokens;
    const commandStart = commandIndex(clause);
    const executable = executableName(clause[commandStart]).toLowerCase();
    if (unresolvedExecutableToken(clause[commandStart])) return true;
    if (executable === 'commit') return true;
    if (executable === 'git') {
      const subcommandIndex = gitSubcommandIndex(clause, commandStart);
      if (subcommandIndex === -1) return false;
      const subcommand = clause[subcommandIndex].toLowerCase();
      if (subcommand === 'commit') return true;
      const alias = aliases.get(subcommand);
      if (!alias || seen.has(subcommand)) return false;
      if (alias.opaque) return true;
      return aliasCommandTargetsCommit(
        [alias.value, ...clause.slice(subcommandIndex + 1)].join(' '),
        aliases,
        new Set([...seen, subcommand]),
        depth + 1,
      );
    }

    const alias = aliases.get(executable);
    if (!alias || seen.has(executable)) return false;
    if (alias.opaque) return true;
    return aliasCommandTargetsCommit(
      [alias.value, ...clause.slice(commandStart + 1)].join(' '),
      aliases,
      new Set([...seen, executable]),
      depth + 1,
    );
  });
}

function gitConfigWritesDangerousAlias(clause, subcommandIndex, depth) {
  for (let index = subcommandIndex + 1; index < clause.length - 1; index += 1) {
    if (!/^alias\.[A-Za-z0-9._-]+$/iu.test(clause[index])) continue;
    const aliasValue = clause[index + 1];
    return aliasCommandHasHookBypass(aliasValue, new Map(), new Set(), depth + 1) ||
      aliasCommandTargetsCommit(aliasValue, new Map(), new Set(), depth + 1);
  }
  return false;
}

function hasGitNoVerifyFlag(clause, depth = 0) {
  if (depth > 5) return true;
  const gitIndex = commandIndex(clause);
  if (executableName(clause[gitIndex]) === 'git') {
    const subcommandIndex = gitSubcommandIndex(clause, gitIndex);
    if (subcommandIndex === -1) return false;
    const subcommand = clause[subcommandIndex];
    const builtin = gitBuiltinCommands().has(subcommand);
    if (!builtin && hasRuntimeGitAliasInjection(clause, gitIndex, subcommandIndex, depth)) return true;
    if (subcommand === 'config' && gitConfigWritesDangerousAlias(clause, subcommandIndex, depth)) {
      return true;
    }
    const aliases = parseInlineGitAliases(clause, gitIndex, subcommandIndex);
    const alias = builtin ? null : aliases.get(subcommand.toLowerCase());
    if (alias) {
      if (alias.opaque) return true;
      if (aliasCommandHasHookBypass(
        [alias.value, ...clause.slice(subcommandIndex + 1)].join(' '),
        aliases,
        new Set([subcommand.toLowerCase()]),
        depth + 1,
      )) return true;
    }

    let configuredAlias = null;
    if (!builtin && !alias) {
      const configured = configuredGitAliases(clause, gitIndex, subcommandIndex);
      if (configured.opaque) return true;
      configuredAlias = configured.aliases.get(subcommand.toLowerCase()) ?? null;
      if (configuredAlias && aliasCommandHasHookBypass(
        [configuredAlias.value, ...clause.slice(subcommandIndex + 1)].join(' '),
        configured.aliases,
        new Set([subcommand.toLowerCase()]),
        depth + 1,
      )) return true;
    }
    if (!builtin && !alias && !configuredAlias) return true;

    if (invocationHasHookBypass(clause, subcommandIndex + 1, subcommand === 'commit')) return true;
  }

  return nestedShellClauses(clause).some(entry => hasGitNoVerifyFlag(entry.tokens, depth + 1));
}

function runnerPositionals(args, runner = '') {
  return runnerPositionalEntries(args, runner).map(entry => entry.token);
}

function runnerPositionalEntries(args, runner = '') {
  const positional = [];
  const valueOptions = new Set(RUNNER_VALUE_OPTIONS);
  if (runner === 'npm') {
    valueOptions.add('-w');
    valueOptions.add('--workspace');
  }
  if (runner === 'node') {
    for (const option of NODE_VALUE_OPTIONS) valueOptions.add(option);
  }
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === '--') continue;
    const optionName = token.split('=', 1)[0];
    if (valueOptions.has(optionName) && !token.includes('=')) {
      index += 1;
      continue;
    }
    if (token.startsWith('-')) continue;
    positional.push({ token, index });
  }
  return positional;
}

function entryTokenExpanded(entry, index) {
  if (Array.isArray(entry.expansions)) return entry.expansions[index] === true;
  return unresolvedExecutableToken(entry.tokens[index]);
}

function gitConfigLayout(clause, subcommandIndex) {
  const positionals = [];
  let readOnly = false;

  for (let index = subcommandIndex + 1; index < clause.length; index += 1) {
    const token = clause[index];
    if (token === '--') {
      for (index += 1; index < clause.length; index += 1) {
        positionals.push({ index, token: clause[index] });
      }
      break;
    }

    const optionName = token.split('=', 1)[0];
    if (GIT_CONFIG_READ_OPTIONS.has(optionName)) readOnly = true;
    if (token.startsWith('-')) {
      if (GIT_CONFIG_VALUE_OPTIONS.has(optionName) && !token.includes('=')) index += 1;
      continue;
    }
    positionals.push({ index, token });
  }

  const action = positionals[0];
  if (action && GIT_CONFIG_READ_ACTIONS.has(action.token)) {
    return { action, key: positionals[1] ?? null, readOnly: true };
  }
  if (action && GIT_CONFIG_MUTATION_ACTIONS.has(action.token)) {
    return { action, key: positionals[1] ?? null, readOnly };
  }
  return { action: null, key: positionals[0] ?? null, readOnly };
}

function gitConfigHasExpandedAliasMutation(entry, subcommandIndex) {
  const layout = gitConfigLayout(entry.tokens, subcommandIndex);
  if (layout.readOnly) return false;
  if (layout.action && entryTokenExpanded(entry, layout.action.index)) return true;
  if (!layout.key) return false;
  if (entryTokenExpanded(entry, layout.key.index)) return true;
  if (!/^alias\./iu.test(layout.key.token)) return false;

  for (let index = layout.key.index + 1; index < entry.tokens.length; index += 1) {
    if (entryTokenExpanded(entry, index)) return true;
  }
  return false;
}

function gitOptionCarriesValue(token) {
  if (token.startsWith('--') && token.includes('=')) {
    return VALUE_OPTIONS.has(token.slice(0, token.indexOf('=')));
  }
  if (!/^-[^-]+$/u.test(token)) return false;
  for (let index = 1; index < token.length; index += 1) {
    if (COMMIT_SHORT_VALUE_OPTIONS.has(token[index])) return index + 1 < token.length;
  }
  return false;
}

function gitHasExpandedSensitiveArgument(entry) {
  const clause = entry.tokens;
  const gitIndex = commandIndex(clause);
  if (executableName(clause[gitIndex]) !== 'git') return false;
  const subcommandIndex = gitSubcommandIndex(clause, gitIndex);
  if (subcommandIndex === -1) return false;
  const subcommandIsBuiltin = gitBuiltinCommands().has(clause[subcommandIndex]);

  for (let index = 0; index < gitIndex; index += 1) {
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=/u.exec(clause[index]);
    if (!match) continue;
    if (
      (match[1] === 'PATH' || match[1].startsWith('GIT_CONFIG_') || GIT_ALIAS_CONTEXT_ENV_KEYS.has(match[1])) &&
      entryTokenExpanded(entry, index)
    ) return true;
  }

  for (let index = gitIndex + 1; index < subcommandIndex; index += 1) {
    const token = clause[index];
    const optionName = token.split('=', 1)[0];
    if (GIT_GLOBAL_VALUE_OPTIONS.has(optionName) && !token.includes('=')) {
      if (entryTokenExpanded(entry, index)) return true;
      const valueIndex = index + 1;
      if (valueIndex < subcommandIndex && entryTokenExpanded(entry, valueIndex)) {
        const value = clause[valueIndex];
        const configKey = value.slice(0, value.indexOf('='));
        if (!subcommandIsBuiltin) return true;
        if (optionName === '--config-env') return true;
        if (optionName === '-c' && (!value.includes('=') || /^alias\./iu.test(configKey))) return true;
      }
      index += 1;
      continue;
    }
    if (entryTokenExpanded(entry, index)) return true;
  }

  if (entryTokenExpanded(entry, subcommandIndex)) return true;
  if (clause[subcommandIndex] === 'config') {
    return gitConfigHasExpandedAliasMutation(entry, subcommandIndex);
  }
  if (!['commit', 'push'].includes(clause[subcommandIndex])) return false;

  for (let index = subcommandIndex + 1; index < clause.length; index += 1) {
    const token = clause[index];
    if (token === '--') break;
    if (gitOptionCarriesValue(token)) continue;
    if (optionConsumesNext(token)) {
      if (entryTokenExpanded(entry, index)) return true;
      index += 1;
      continue;
    }
    if (entryTokenExpanded(entry, index)) return true;
  }
  return false;
}

function runnerPositionExpanded(entry, executableIndex, positional, position) {
  const argument = positional[position];
  return Boolean(argument) && entryTokenExpanded(entry, executableIndex + 1 + argument.index);
}

function hasExpandedDevTask(entry) {
  const clause = entry.tokens;
  const executableIndex = commandIndex(clause);
  const executable = executableName(clause[executableIndex]);
  const args = clause.slice(executableIndex + 1);
  const positional = runnerPositionalEntries(args, executable);
  const expanded = position => runnerPositionExpanded(entry, executableIndex, positional, position);

  if (isNextPackage(executable)) return expanded(0);
  if (executable === 'node') {
    return expanded(0) || (isNextNodeEntrypoint(positional[0]?.token) && expanded(1));
  }
  if (executable === 'bunx' || executable === 'npx') {
    return expanded(0) || (isNextPackage(positional[0]?.token) && expanded(1));
  }
  if (executable === 'bun') {
    return expanded(0) ||
      (positional[0]?.token === 'run' && expanded(1)) ||
      (positional[0]?.token === 'x' && (expanded(1) || (isNextPackage(positional[1]?.token) && expanded(2))));
  }
  if (executable === 'npm') {
    return expanded(0) ||
      (['run', 'run-script', 'rum', 'urn'].includes(positional[0]?.token) && expanded(1)) ||
      (['exec', 'x'].includes(positional[0]?.token) &&
        (expanded(1) || (isNextPackage(positional[1]?.token) && expanded(2))));
  }
  if (executable === 'pnpm') {
    return expanded(0) ||
      (['run', 'run-script'].includes(positional[0]?.token) && expanded(1)) ||
      (['dlx', 'exec'].includes(positional[0]?.token) &&
        (expanded(1) || (isNextPackage(positional[1]?.token) && expanded(2))));
  }
  if (executable === 'yarn') {
    if (expanded(0)) return true;
    if (['run', 'run-script'].includes(positional[0]?.token)) return expanded(1);
    if (['dlx', 'exec'].includes(positional[0]?.token)) {
      return expanded(1) || (isNextPackage(positional[1]?.token) && expanded(2));
    }
    if (positional[0]?.token === 'workspace') {
      return expanded(1) || expanded(2) ||
        (['run', 'run-script'].includes(positional[2]?.token) && expanded(3));
    }
    if (positional[0]?.token === 'workspaces') {
      return positional.some((_, index) => expanded(index));
    }
  }
  return false;
}

const DEV_COMPLETION_SUFFIXES = [
  ['dev'],
  ['run', 'dev'],
  ['run-script', 'dev'],
  ['rum', 'dev'],
  ['urn', 'dev'],
  ['next', 'dev'],
  ['next@16', 'dev'],
  ['x', 'next', 'dev'],
  ['exec', 'next', 'dev'],
  ['dlx', 'next', 'dev'],
  ['workspace', 'app', 'dev'],
  ['workspace', 'app', 'run', 'dev'],
  ['next dev'],
];

function xargsHasDynamicGitArguments(entry) {
  const xargsIndex = commandIndex(entry.tokens);
  if (executableName(entry.tokens[xargsIndex]) !== 'xargs') return false;
  const command = xargsCommand(entry.tokens, xargsIndex);
  if (hasGitNoVerifyFlag(command)) return false;
  const gitIndex = commandIndex(command);
  if (executableName(command[gitIndex]) !== 'git') return false;
  const subcommandIndex = gitSubcommandIndex(command, gitIndex);
  if (subcommandIndex === -1 || !['commit', 'config', 'push'].includes(command[subcommandIndex])) {
    return false;
  }
  if (command[subcommandIndex] === 'config') {
    const layout = gitConfigLayout(command, subcommandIndex);
    if (layout.readOnly) return false;
    if (layout.key && !/^alias\./iu.test(layout.key.token)) return false;
  }
  return !command.slice(subcommandIndex + 1).includes('--');
}

function xargsCanCompleteDevCommand(entry) {
  const xargsIndex = commandIndex(entry.tokens);
  if (executableName(entry.tokens[xargsIndex]) !== 'xargs') return false;
  const command = xargsCommand(entry.tokens, xargsIndex);
  if (!command.length) return false;
  if (isDevCommand(command)) return false;
  return DEV_COMPLETION_SUFFIXES.some(suffix => isDevCommand([...command, ...suffix]));
}

function hasUninspectableSecurityExpansion(entry, depth = 0, inheritedBackground = false) {
  if (depth > 5) return true;
  const effectiveBackground = inheritedBackground || entry.background;
  const executableIndex = commandIndex(entry.tokens);
  if (entryTokenExpanded(entry, executableIndex)) return true;
  if (gitHasExpandedSensitiveArgument(entry) || xargsHasDynamicGitArguments(entry)) return true;
  if (!effectiveBackground && (hasExpandedDevTask(entry) || xargsCanCompleteDevCommand(entry))) {
    return true;
  }
  return nestedShellClauses(entry.tokens, entry.expansions).some(nested =>
    hasUninspectableSecurityExpansion(nested, depth + 1, effectiveBackground));
}

function isNextPackage(token) {
  return token === 'next' || /^next@[^/]+$/u.test(token);
}

function isNextNodeEntrypoint(token) {
  return /(?:^|\/)node_modules\/(?:\.bin\/next|next\/dist\/bin\/next(?:\.js)?)$/u.test(token);
}

function runnerInvokesNextDev(args, runner) {
  const command = runnerPositionals(args, runner);
  return isNextPackage(command[0]) && command[1] === 'dev';
}

function isDirectDevCommand(clause) {
  const index = commandIndex(clause);
  const executable = executableName(clause[index]);
  const args = clause.slice(index + 1);
  const positional = runnerPositionals(args, executable);

  if (isNextPackage(executable)) return positional[0] === 'dev';
  if (executable === 'node') {
    for (let index = 0; index < args.length; index += 1) {
      if (args[index] === '--run') return args[index + 1] === 'dev';
      if (args[index].startsWith('--run=')) return args[index].slice('--run='.length) === 'dev';
    }
    return isNextNodeEntrypoint(positional[0]) && positional[1] === 'dev';
  }
  if (executable === 'bunx' || executable === 'npx') return runnerInvokesNextDev(args, executable);
  if (executable === 'bun') {
    return positional[0] === 'dev' ||
      (positional[0] === 'run' && positional[1] === 'dev') ||
      (isNextNodeEntrypoint(positional[0]) && positional[1] === 'dev') ||
      (positional[0] === 'run' && isNextNodeEntrypoint(positional[1]) && positional[2] === 'dev') ||
      (positional[0] === 'x' && isNextPackage(positional[1]) && positional[2] === 'dev');
  }
  if (executable === 'npm') {
    return (['run', 'run-script', 'rum', 'urn'].includes(positional[0]) && positional[1] === 'dev') ||
      (positional[0] === 'exec' && isNextPackage(positional[1]) && positional[2] === 'dev');
  }
  if (executable === 'pnpm') {
    return positional[0] === 'dev' ||
      (['run', 'run-script'].includes(positional[0]) && positional[1] === 'dev') ||
      (['dlx', 'exec'].includes(positional[0]) && isNextPackage(positional[1]) && positional[2] === 'dev');
  }
  if (executable === 'yarn') {
    return positional[0] === 'dev' ||
      (['run', 'run-script'].includes(positional[0]) && positional[1] === 'dev') ||
      (positional[0] === 'workspace' && positional[2] === 'dev') ||
      (positional[0] === 'workspace' && ['run', 'run-script'].includes(positional[2]) && positional[3] === 'dev') ||
      (positional[0] === 'workspaces' && positional.includes('foreach') && positional.at(-2) === 'run' && positional.at(-1) === 'dev') ||
      (['dlx', 'exec'].includes(positional[0]) && isNextPackage(positional[1]) && positional[2] === 'dev');
  }
  return false;
}

function isDevCommand(clause, depth = 0) {
  if (depth > 3) return false;
  return isDirectDevCommand(clause) ||
    nestedShellClauses(clause).some(entry => isDevCommand(entry.tokens, depth + 1));
}

function hasForegroundDevCommand(entry, depth = 0) {
  if (depth > 3 || entry.background) return false;
  if (isDirectDevCommand(entry.tokens)) return true;
  return nestedShellClauses(entry.tokens).some(nested => hasForegroundDevCommand(nested, depth + 1));
}

function block(message) {
  process.stderr.write(`[Archestimator] BLOCKED: ${message}\n`);
  process.exit(2);
}

readStdin()
  .then(raw => {
    let input;
    try {
      input = JSON.parse(raw);
    } catch {
      block('beforeShellExecution received invalid JSON; refusing an uninspected command');
    }

    const command = input && (input.command || input.args?.command);
    if (typeof command !== 'string' || !command.trim()) {
      block('beforeShellExecution received no command; refusing an uninspected command');
    }

    const clauses = collectShellClauses(command);

    if (clauses.some(shellReadsProgramFromStdin)) {
      block('shell interpreters receiving executable stdin cannot be inspected safely; use an explicit script or inline -c command');
    }

    if (clauses.some(entry => hasUnresolvedExecutableProgram(entry.tokens))) {
      block('an executable command is generated from unresolved shell expansion and cannot be inspected safely');
    }

    if (clauses.some(entry => hasUninspectableSecurityExpansion(entry))) {
      block('shell-expanded or dynamic security-relevant arguments cannot be inspected safely');
    }

    if (
      hookEnabled('pre:bash:block-no-verify', ['minimal', 'standard', 'strict']) &&
      clauses.some(clause => hasGitNoVerifyFlag(clause.tokens))
    ) {
      block('git --no-verify would bypass repository hooks');
    }

    if (
      hookEnabled('pre:bash:dev-server-block', ['standard', 'strict']) &&
      process.platform !== 'win32' &&
      !process.env.TMUX &&
      clauses.some(hasForegroundDevCommand)
    ) {
      block('run dev servers in tmux, for example: tmux new-session -d -s arch-dev "bun dev"');
    }

    if (
      hookEnabled('pre:bash:tmux-reminder', ['strict']) &&
      process.platform !== 'win32' &&
      !process.env.TMUX &&
      /\b(bun|npm|pnpm|yarn)\s+(install|test)\b|\b(vitest|playwright|docker|pytest)\b/.test(command)
    ) {
      process.stderr.write('[Archestimator] Reminder: tmux preserves logs for long-running commands.\n');
    }

    if (hookEnabled('pre:bash:git-push-reminder', ['strict']) && clauses.some(entry => {
      const clause = entry.tokens;
      const index = commandIndex(clause);
      const subcommandIndex = executableName(clause[index]) === 'git' ? gitSubcommandIndex(clause, index) : -1;
      return subcommandIndex !== -1 && clause[subcommandIndex] === 'push';
    })) {
      process.stderr.write('[Archestimator] Reminder: review the focused diff before pushing.\n');
    }

    process.stdout.write(raw);
  })
  .catch(error => block(`beforeShellExecution could not read input: ${error.message}`));

module.exports = { hasGitNoVerifyFlag, isDevCommand, parseClauses, tokenizeShell };
