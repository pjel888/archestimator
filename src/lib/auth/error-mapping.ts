export const AUTH_ERROR_CODES = [
  "email_required",
  "auth_request_failed",
  "google_request_failed",
  "callback_missing_code",
  "callback_exchange_failed",
  "invalid_redirect",
] as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[number];

const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  email_required: "Enter an email address to receive a sign-in link.",
  auth_request_failed: "We could not start sign-in. Try again in a moment.",
  google_request_failed: "Google sign-in could not start. Try again or use an email link.",
  callback_missing_code: "This sign-in link is incomplete. Request a new link to continue.",
  callback_exchange_failed:
    "We could not finish signing you in. Request a new link or try Google again.",
  invalid_redirect: "We reset the sign-in destination to keep your account safe.",
};

export function getPublicAuthError(value?: string | null) {
  const code = isAuthErrorCode(value) ? value : "auth_request_failed";
  return {
    code,
    message: AUTH_ERROR_MESSAGES[code],
  };
}

export function mapAuthErrorToCode({
  fallbackCode,
}: {
  fallbackCode: AuthErrorCode;
  rawError?: unknown;
}) {
  return fallbackCode;
}

export function isAuthErrorCode(value: unknown): value is AuthErrorCode {
  return (
    typeof value === "string" &&
    (AUTH_ERROR_CODES as readonly string[]).includes(value)
  );
}
