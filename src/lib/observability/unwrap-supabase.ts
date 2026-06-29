import {
  AuthPermissionDeniedError,
  AuthRequiredError,
  DatabaseError,
  RateLimitError,
} from "./app-error";

type SupabaseErrorLike = {
  code?: string;
  details?: string;
  hint?: string;
  message?: string;
  status?: number;
};

type SupabaseResult<T> = {
  data: T | null;
  error: SupabaseErrorLike | null;
};

function errorText(error: SupabaseErrorLike) {
  return `${error.code ?? ""} ${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();
}

export function unwrapSupabase<T>(result: SupabaseResult<T>): T {
  if (!result.error) return result.data as T;

  const text = errorText(result.error);
  const code = result.error.code?.toUpperCase();
  if (code === "PGRST301" || text.includes("jwt") || text.includes("auth session")) {
    throw new AuthRequiredError(undefined, { cause: result.error });
  }
  if (code === "42501" || text.includes("row-level security") || text.includes("permission denied")) {
    throw new AuthPermissionDeniedError(undefined, { cause: result.error });
  }
  if (code === "PGRST309" || text.includes("rate limit")) {
    throw new RateLimitError(undefined, { cause: result.error });
  }

  throw new DatabaseError(undefined, { cause: result.error });
}
