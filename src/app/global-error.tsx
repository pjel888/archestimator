"use client";

import { useEffect, useRef } from "react";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  unstable_retry: () => void;
};

function sanitizeClientErrorText(value: string | undefined, maxLength: number) {
  if (!value) return undefined;
  return value
    .slice(0, maxLength)
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[EMAIL]")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED_TOKEN]")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[REDACTED_JWT]")
    .replace(/([?&](?:password|token|api_key|secret)=)([^&#\\\s]*)/gi, "$1[REDACTED]")
    .replace(/\b(?:password|token|api_key|secret|service_role_key|supabase_service_role_key)=[^\s,;&\\]+/gi, (match) => {
      const [key] = match.split("=");
      return `${key}=[REDACTED]`;
    })
    .replace(/[\r\n\t]/g, " ");
}

function buildClientErrorPayload(error: GlobalErrorProps["error"]) {
  return {
    digest: sanitizeClientErrorText(error.digest, 160),
    message: sanitizeClientErrorText(error.message, 2000),
    name: sanitizeClientErrorText(error.name, 120),
    source: "global-error",
    stack: sanitizeClientErrorText(error.stack, 6000),
  };
}

export default function GlobalError({ error, unstable_retry }: GlobalErrorProps) {
  const retryButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    retryButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    void fetch("/api/internal/client-error", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(buildClientErrorPayload(error)),
    }).catch(() => undefined);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-ink antialiased">
        <main className="flex min-h-screen items-center justify-center px-6 py-12">
          <section className="w-full max-w-md text-center">
            <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-muted">Archestimator</p>
            <h1 className="text-2xl font-semibold tracking-normal text-ink">Something went wrong</h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              The workspace could not finish loading. Try again, or return after a moment.
            </p>
            <button
              ref={retryButtonRef}
              type="button"
              className="mt-6 inline-flex h-10 items-center justify-center rounded-xs border border-ink bg-ink px-4 text-sm font-medium text-white transition hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
              onClick={() => unstable_retry()}
            >
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
