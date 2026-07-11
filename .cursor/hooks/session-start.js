#!/usr/bin/env node
'use strict';

const { spawnSync } = require('child_process');
const path = require('path');
const { readStdin } = require('./adapter');

const projectRoot = path.resolve(__dirname, '..', '..');

readStdin()
  .then(raw => {
    const result = spawnSync('bun', ['run', 'supermemory:ensure'], {
      cwd: projectRoot,
      encoding: 'utf8',
      env: process.env,
      maxBuffer: 1024 * 1024,
      timeout: 30000,
    });

    if (result.error || result.status !== 0) {
      const detail = result.error
        ? result.error.message
        : String(result.stderr || result.stdout || '').trim().split('\n').at(-1);
      process.stderr.write(`[Archestimator] DEGRADED: Supermemory preflight failed${detail ? `: ${detail}` : ''}; continuing with canonical .ai state\n`);
    }

    process.stdout.write(raw);
  })
  .catch(error => {
    process.stderr.write(`[Archestimator] DEGRADED: Cursor session preflight could not read input: ${error.message}; continuing without hook context\n`);
    process.exit(0);
  });
