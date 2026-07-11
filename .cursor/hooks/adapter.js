#!/usr/bin/env node
'use strict';

const MAX_STDIN = 1024 * 1024;

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => {
      if (data.length < MAX_STDIN) {
        data += chunk.substring(0, MAX_STDIN - data.length);
      }
    });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

function hookEnabled(hookId, allowedProfiles = ['standard', 'strict']) {
  const requested = String(process.env.ECC_HOOK_PROFILE || 'standard').toLowerCase();
  const profile = ['minimal', 'standard', 'strict'].includes(requested) ? requested : 'standard';
  const disabled = new Set(
    String(process.env.ECC_DISABLED_HOOKS || '')
      .split(',')
      .map(value => value.trim().toLowerCase())
      .filter(Boolean),
  );

  return !disabled.has(String(hookId || '').toLowerCase()) && allowedProfiles.includes(profile);
}

module.exports = { hookEnabled, readStdin };
