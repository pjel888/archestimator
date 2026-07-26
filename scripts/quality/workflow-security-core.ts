import type { QualityFinding } from "./common";

interface WorkflowRule {
  code: string;
  message: string;
  matches: (text: string) => boolean;
}

const WORKFLOW_RULES: WorkflowRule[] = [
  {
    code: "CONTINUE_ON_ERROR",
    message: "permits a workflow failure",
    matches: (text) => /\bcontinue-on-error\s*:\s*true\b/giu.test(text),
  },
  {
    code: "SHELL_FAILURE_HIDDEN",
    message: "hides a shell failure",
    matches: (text) => /\|\|\s*true\b/gu.test(text),
  },
  {
    code: "UNTRUSTED_WRITE_PERMISSION",
    message: "grants write permission to a pull request workflow",
    matches: hasUntrustedWritePermission,
  },
  {
    code: "UNTRUSTED_SECRET",
    message: "exposes secrets to pull_request_target",
    matches: hasUntrustedSecret,
  },
];

function isLocalAction(action: string): boolean {
  if (action.startsWith("./")) return true;
  return action.startsWith("docker://");
}

function isPinnedAction(action: string): boolean {
  const reference = action.split("@")[1];
  if (!reference) return false;
  return /^[a-f0-9]{40}$/u.test(reference);
}

function mutableActionFindings(path: string, text: string): QualityFinding[] {
  const findings: QualityFinding[] = [];
  for (const match of text.matchAll(/uses:\s*([^\s#]+)/gu)) {
    const action = match[1];
    if (isLocalAction(action)) continue;
    if (isPinnedAction(action)) continue;
    findings.push({
      code: "MUTABLE_ACTION",
      message: `${path} uses mutable action reference ${action}`,
      path,
    });
  }
  return findings;
}

function hasUntrustedWritePermission(text: string): boolean {
  if (!/\bpull_request(?:_target)?\s*:/u.test(text)) return false;
  return /\bpermissions\s*:\s*\n(?:[ \t]+[^\n]+\n)*?[ \t]+\w[\w-]*:\s*write\b/gu.test(text);
}

function hasUntrustedSecret(text: string): boolean {
  if (!/\bpull_request_target\s*:/u.test(text)) return false;
  return /(?:secrets\.|secrets:\s*inherit)/u.test(text);
}

function ruleFindings(path: string, text: string): QualityFinding[] {
  const findings: QualityFinding[] = [];
  for (const rule of WORKFLOW_RULES) {
    if (!rule.matches(text)) continue;
    findings.push({ code: rule.code, message: `${path} ${rule.message}`, path });
  }
  return findings;
}

export function scanWorkflow(path: string, text: string): QualityFinding[] {
  return [...mutableActionFindings(path, text), ...ruleFindings(path, text)];
}
