import "server-only";

export type D1Value = string | number | boolean | null | ArrayBuffer;

export type D1Result<T = Record<string, unknown>> = {
  results?: T[];
  success?: boolean;
  meta?: {
    changes?: number;
  };
};

export type D1PreparedStatementLike<T = Record<string, unknown>> = {
  bind(...values: D1Value[]): D1PreparedStatementLike<T>;
  first<R = T>(): Promise<R | null>;
  all<R = T>(): Promise<D1Result<R>>;
  run(): Promise<D1Result<T>>;
};

export type D1DatabaseLike = {
  prepare<T = Record<string, unknown>>(sql: string): D1PreparedStatementLike<T>;
  batch?<T = Record<string, unknown>>(statements: D1PreparedStatementLike<T>[]): Promise<D1Result<T>[]>;
};

type CloudflareD1Context = {
  env?: {
    ARCH_DB?: unknown;
  };
};

function isD1Database(value: unknown): value is D1DatabaseLike {
  return Boolean(value && typeof (value as { prepare?: unknown }).prepare === "function");
}

export async function getCloudflareD1Database(): Promise<D1DatabaseLike | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const context = await getCloudflareContext({ async: true }) as CloudflareD1Context;
    const database = context.env?.ARCH_DB;
    return isD1Database(database) ? database : null;
  } catch {
    return null;
  }
}
