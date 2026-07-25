import type { QualityFinding } from "./common";

export function scanWorkflow(path: string, text: string): QualityFinding[] {
  const findings: QualityFinding[] = [];
  for (const match of text.matchAll(/uses:\s*([^\s#]+)/gu)) {
    const action = match[1];
    if (action.startsWith("./") || action.startsWith("docker://")) continue;
    const reference = action.split("@")[1];
    if (!reference || !/^[a-f0-9]{40}$/u.test(reference)) {
      findings.push({
        code: "MUTABLE_ACTION",
        message: `${path} uses mutable action reference ${action}`,
        path,
      });
    }
  }
  if (/\bcontinue-on-error\s*:\s*true\b/giu.test(text)) {
    findings.push({
      code: "CONTINUE_ON_ERROR",
      message: `${path} permits a workflow failure`,
      path,
    });
  }
  if (/\|\|\s*true\b/gu.test(text)) {
    findings.push({
      code: "SHELL_FAILURE_HIDDEN",
      message: `${path} hides a shell failure`,
      path,
    });
  }
  const untrustedTrigger = /\bpull_request(?:_target)?\s*:/u.test(text);
  if (untrustedTrigger && /\bpermissions\s*:\s*\n(?:[ \t]+[^\n]+\n)*?[ \t]+\w[\w-]*:\s*write\b/gu.test(text)) {
    findings.push({
      code: "UNTRUSTED_WRITE_PERMISSION",
      message: `${path} grants write permission to a pull request workflow`,
      path,
    });
  }
  if (
    /\bpull_request_target\s*:/u.test(text) &&
    /(?:secrets\.|secrets:\s*inherit)/u.test(text)
  ) {
    findings.push({
      code: "UNTRUSTED_SECRET",
      message: `${path} exposes secrets to pull_request_target`,
      path,
    });
  }
  return findings;
}
