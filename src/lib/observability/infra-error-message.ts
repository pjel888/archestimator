/** Default copy for unexpected failures. Safe to show in any client surface. */
export const USER_FACING_INTERNAL_ERROR_MESSAGE = "Something went wrong. Try again in a moment.";

/**
 * Detects messages that name infrastructure, providers, bindings, SQL, or other
 * implementation details that must never reach end users.
 */
export function isUnsafeInfrastructureErrorMessage(message: string): boolean {
  return (
    /\bcloudflare\b/i.test(message) ||
    /\bd1\b/i.test(message) ||
    /\barch_db\b/i.test(message) ||
    /\barch_uploads(?:_r2)?\b/i.test(message) ||
    /\bbetter auth\b/i.test(message) ||
    /\bsupabase\b/i.test(message) ||
    /\bpostgres(?:ql)?\b/i.test(message) ||
    /\bsqlite\b/i.test(message) ||
    /\bsql\b/i.test(message) ||
    /\bwrangler\b/i.test(message) ||
    /\bdurable object\b/i.test(message) ||
    /\br2\b/i.test(message) ||
    /\bcloudflare workers?\b/i.test(message) ||
    /\bworkers proof\b/i.test(message) ||
    /\bnode_modules\b/i.test(message) ||
    /\bservice[_ ]?role\b/i.test(message) ||
    /\beconnrefused\b/i.test(message) ||
    /\bstack trace\b/i.test(message) ||
    /\bduplicate key\b/i.test(message) ||
    /\bviolates unique constraint\b/i.test(message) ||
    /\bforeign key\b/i.test(message) ||
    /\binternal server error\b/i.test(message)
  );
}
