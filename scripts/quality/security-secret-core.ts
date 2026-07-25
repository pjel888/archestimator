import type { QualityFinding } from "./common";

interface SecretRule {
  code: string;
  label: string;
  pattern: RegExp;
  validate?: (match: RegExpMatchArray) => boolean;
}

const SECRET_RULES: SecretRule[] = [
  {
    code: "SECRET_PRIVATE_KEY",
    label: "private key",
    pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/gu,
  },
  {
    code: "SECRET_AWS_ACCESS_KEY",
    label: "AWS access key",
    pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/gu,
  },
  {
    code: "SECRET_GITHUB_TOKEN",
    label: "GitHub token",
    pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{36,255}|github_pat_[A-Za-z0-9_]{60,255})\b/gu,
  },
  {
    code: "SECRET_GOOGLE_API_KEY",
    label: "Google API key",
    pattern: /\bAIza[A-Za-z0-9_-]{35}\b/gu,
  },
  {
    code: "SECRET_SLACK_TOKEN",
    label: "Slack token",
    pattern: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/gu,
  },
  {
    code: "SECRET_STRIPE_LIVE_KEY",
    label: "Stripe live key",
    pattern: /\b(?:sk|rk)_live_[A-Za-z0-9]{16,}\b/gu,
  },
  {
    code: "SECRET_GENERIC_TOKEN",
    label: "assigned credential",
    pattern:
      /\b(?:api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|password|private[_-]?key|secret|token)\b\s*[:=]\s*["'`]([A-Za-z0-9_+./=-]{24,})["'`]/giu,
    validate: (match) => {
      const value = match[1] ?? "";
      const classes = [
        /[a-z]/u.test(value),
        /[A-Z]/u.test(value),
        /\d/u.test(value),
        /[_+./=-]/u.test(value),
      ].filter(Boolean).length;
      return classes >= 3;
    },
  },
];

const SOURCE_CONFIG_EXTENSION =
  /\.(?:[cm]?[jt]sx?|mdx?|txt|rst|adoc|asciidoc|csv|tsv|jsonc?|ya?ml|toml|env|ini|conf|config|tf|tfvars|hcl|pem|key|sh|bash|zsh|ps1|xml|html?|css|scss|sass|less|properties|sql|graphql|gql|proto|py|rb|go|rs|java|kt|kts|swift|c|cc|cpp|h|hpp|php|pl|lua|exs?|erl|fsx?|vue|svelte)$/iu;
const SOURCE_CONFIG_NAME =
  /(?:^|\/)(?:Dockerfile(?:\.[^/]*)?|Makefile|Procfile|\.npmrc|\.yarnrc|\.env(?:\.[^/]*)?|\.gitignore|\.dockerignore|\.editorconfig|\.prettierrc|\.eslintrc)$/u;
const EXCLUDED_TEXT_PATH_PREFIXES = [
  ".ai/09_archive/",
  ".git/",
  ".gitnexus/",
  ".next/",
  "artifacts/",
  "build/",
  "coverage/",
  "dist/",
  "node_modules/",
  "playwright-report/",
  "test-results/",
];
const SYNTHETIC_FIXTURE_PATH = /^tests\/fixtures\/security\//u;
const SYNTHETIC_MARKER = "quality-secret-scan: synthetic-fixture";

export function isScannableSecurityPath(path: string): boolean {
  const normalized = path.replaceAll("\\", "/");
  if (
    EXCLUDED_TEXT_PATH_PREFIXES.some((prefix) => normalized.startsWith(prefix)) ||
    normalized.includes("/artifacts/")
  ) {
    return false;
  }
  return SOURCE_CONFIG_EXTENSION.test(normalized) || SOURCE_CONFIG_NAME.test(normalized);
}

function lineAt(text: string, offset: number): number {
  let line = 1;
  for (let index = 0; index < offset; index += 1) {
    if (text.charCodeAt(index) === 10) line += 1;
  }
  return line;
}

function isExplicitSyntheticFixture(path: string, text: string): boolean {
  return (
    SYNTHETIC_FIXTURE_PATH.test(path.replaceAll("\\", "/")) &&
    text.split(/\r?\n/u, 5).some((line) => line.includes(SYNTHETIC_MARKER))
  );
}

export function scanSecretText(path: string, text: string): QualityFinding[] {
  if (isExplicitSyntheticFixture(path, text)) return [];
  const findings: QualityFinding[] = [];
  const seen = new Set<string>();
  for (const rule of SECRET_RULES) {
    for (const match of text.matchAll(rule.pattern)) {
      if (rule.validate && !rule.validate(match)) continue;
      const line = lineAt(text, match.index);
      const identity = `${rule.code}\0${line}`;
      if (seen.has(identity)) continue;
      seen.add(identity);
      findings.push({
        code: rule.code,
        message: `Potential ${rule.label} at ${path}:${line}`,
        path,
        detail: { rule: rule.code, line },
      });
    }
  }
  return findings;
}
