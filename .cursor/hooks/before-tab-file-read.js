#!/usr/bin/env node
const { readStdin } = require('./adapter');
readStdin().then(raw => {
  try {
    const input = JSON.parse(raw);
    const filePath = input?.file_path;
    if (typeof filePath !== 'string' || !filePath.trim()) {
      console.error('[ECC] BLOCKED: beforeTabFileRead received no inspectable file_path');
      process.exit(2);
    }
    if (/\.(env|key|pem)$|\.env\.|credentials|secret/i.test(filePath)) {
      console.error('[ECC] BLOCKED: Tab cannot read sensitive file: ' + filePath);
      process.exit(2);
    }
  } catch {
    console.error('[ECC] BLOCKED: beforeTabFileRead received invalid JSON');
    process.exit(2);
  }
  process.stdout.write(raw);
}).catch(() => process.exit(2));
