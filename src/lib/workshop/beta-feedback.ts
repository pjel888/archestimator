export const BETA_FEEDBACK_TYPES = [
  "bug",
  "confusing_ux",
  "missing_feature",
  "export_issue",
  "estimate_accuracy",
  "other",
] as const;

export const BETA_FEEDBACK_SEVERITIES = ["blocker", "high", "medium", "low"] as const;

export type BetaFeedbackType = (typeof BETA_FEEDBACK_TYPES)[number];
export type BetaFeedbackSeverity = (typeof BETA_FEEDBACK_SEVERITIES)[number];

export type BetaFeedbackPayload = {
  feedbackType: BetaFeedbackType;
  message: string;
  pagePath: string | null;
  projectId: string | null;
  severity: BetaFeedbackSeverity;
};

export type BetaFeedbackParseResult =
  | { ok: true; payload: BetaFeedbackPayload }
  | { ok: false; code: "invalid_project" | "invalid_type" | "invalid_severity" | "message_too_short" | "message_too_long" };

const SUPPORT_EMAIL = "support@archestimator.com";
const MAX_MESSAGE_LENGTH = 4000;
const MIN_MESSAGE_LENGTH = 10;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function isFeedbackType(value: string): value is BetaFeedbackType {
  return BETA_FEEDBACK_TYPES.includes(value as BetaFeedbackType);
}

function isSeverity(value: string): value is BetaFeedbackSeverity {
  return BETA_FEEDBACK_SEVERITIES.includes(value as BetaFeedbackSeverity);
}

export function parseBetaFeedbackSubmission(formData: FormData): BetaFeedbackParseResult {
  const feedbackType = readText(formData, "feedbackType");
  if (!isFeedbackType(feedbackType)) return { ok: false, code: "invalid_type" };

  const severity = readText(formData, "severity");
  if (!isSeverity(severity)) return { ok: false, code: "invalid_severity" };

  const message = readText(formData, "message");
  if (message.length < MIN_MESSAGE_LENGTH) return { ok: false, code: "message_too_short" };
  if (message.length > MAX_MESSAGE_LENGTH) return { ok: false, code: "message_too_long" };
  const projectId = readText(formData, "projectId") || null;
  if (projectId && !UUID_PATTERN.test(projectId)) return { ok: false, code: "invalid_project" };

  return {
    ok: true,
    payload: {
      feedbackType,
      message,
      pagePath: readText(formData, "pagePath") || null,
      projectId,
      severity,
    },
  };
}

export function buildBetaFeedbackMailto({
  email,
  feedbackType,
  message,
  pagePath,
  severity,
}: {
  email: string;
  feedbackType: BetaFeedbackType;
  message: string;
  pagePath?: string | null;
  severity: BetaFeedbackSeverity;
}) {
  const subject = `Archestimator beta feedback: ${severity}`;
  const body = [
    `From: ${email}`,
    `Type: ${feedbackType}`,
    `Severity: ${severity}`,
    `Page: ${pagePath?.trim() || "Not provided"}`,
    "",
    "Feedback:",
    message,
  ].join("\n");

  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
