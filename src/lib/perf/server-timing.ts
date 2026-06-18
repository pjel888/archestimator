import { AsyncLocalStorage } from "node:async_hooks";

// Dev-only timing and Supabase request round-trip instrumentation. Dormant unless PERF_TRACE=1.
// Trace records intentionally store safe labels only, never ids, URLs, cookies,
// headers, SQL, or user-provided values.
type PerfTraceKind = "timing" | "supabase";
type SupabaseOperation = "select" | "rpc" | "insert" | "update" | "delete" | "query";

export type PerfTraceEvent = {
  label: string;
  kind: PerfTraceKind;
  elapsedMs: number;
  operation?: SupabaseOperation;
  relation?: string;
};

export type PerfTraceSnapshot = {
  requestId: string;
  scope: string;
  timings: PerfTraceEvent[];
  supabaseRoundTrips: number;
};

type PerfTraceContext = {
  requestId: string;
  scope: string;
  timings: PerfTraceEvent[];
};

const perfTraceStorage = new AsyncLocalStorage<PerfTraceContext>();

function isPerfTraceEnabled() {
  return process.env.PERF_TRACE === "1";
}

function makeRequestId() {
  return `wsh_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function safeTraceValue(value: string) {
  return value.replace(/[^a-zA-Z0-9._:-]/g, "-").slice(0, 96);
}

function recordEvent(event: Omit<PerfTraceEvent, "label"> & { label: string }) {
  const context = perfTraceStorage.getStore();
  if (!context) return;
  context.timings.push({
    ...event,
    label: safeTraceValue(event.label),
    relation: event.relation ? safeTraceValue(event.relation) : undefined,
  });
}

export function getCurrentPerfTraceSnapshot(): PerfTraceSnapshot | null {
  const context = perfTraceStorage.getStore();
  if (!context) return null;
  return {
    requestId: context.requestId,
    scope: context.scope,
    timings: [...context.timings],
    supabaseRoundTrips: context.timings.filter((event) => event.kind === "supabase").length,
  };
}

export async function withPerfTraceRequest<T>(scope: string, fn: () => Promise<T>): Promise<T> {
  if (!isPerfTraceEnabled()) return fn();

  const context: PerfTraceContext = {
    requestId: makeRequestId(),
    scope: safeTraceValue(scope),
    timings: [],
  };

  return perfTraceStorage.run(context, async () => {
    try {
      return await fn();
    } finally {
      const snapshot = getCurrentPerfTraceSnapshot();
      if (snapshot) {
        console.log(`[perf-json] ${JSON.stringify(snapshot)}`);
      }
    }
  });
}

export async function traced<T>(label: string, fn: () => Promise<T>): Promise<T> {
  if (!isPerfTraceEnabled()) return fn();
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const elapsedMs = Number((performance.now() - start).toFixed(1));
    recordEvent({ label, kind: "timing", elapsedMs });
    console.log(`[perf] ${safeTraceValue(label)} ${elapsedMs.toFixed(1)}ms`);
  }
}

export async function traceSupabaseFetch<T>(
  label: string,
  operation: SupabaseOperation,
  relation: string,
  fn: () => Promise<T>,
): Promise<T> {
  if (!isPerfTraceEnabled()) return fn();
  const start = performance.now();
  try {
    return await fn();
  } finally {
    recordEvent({
      label,
      kind: "supabase",
      operation,
      relation,
      elapsedMs: Number((performance.now() - start).toFixed(1)),
    });
  }
}

function readSupabaseRelation(url: string) {
  try {
    const parsed = new URL(url);
    const rpcMatch = parsed.pathname.match(/\/rpc\/([^/]+)/);
    if (rpcMatch?.[1]) return { operation: "rpc" as const, relation: rpcMatch[1] };
    const restMatch = parsed.pathname.match(/\/rest\/v1\/([^/?]+)/);
    if (restMatch?.[1]) return { operation: "select" as const, relation: restMatch[1] };
  } catch {
    // Keep the instrumentation safe and best-effort.
  }
  return { operation: "query" as const, relation: "unknown" };
}

export function instrumentSupabaseFetch(fetchImpl: typeof fetch = fetch): typeof fetch {
  return async (input, init) => {
    if (!isPerfTraceEnabled()) return fetchImpl(input, init);
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const { operation, relation } = readSupabaseRelation(url);
    return traceSupabaseFetch(`supabase.${operation}.${relation}`, operation, relation, () => fetchImpl(input, init));
  };
}
