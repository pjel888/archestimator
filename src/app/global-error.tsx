"use client";

import { useEffect, useRef } from "react";

import { buildClientErrorPayload, postClientErrorReport } from "@/lib/observability/client-error-report";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  unstable_retry: () => void;
};

export default function GlobalError({ error, unstable_retry }: GlobalErrorProps) {
  const retryButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    retryButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    void postClientErrorReport(buildClientErrorPayload(error, { source: "global-error" })).catch(() => undefined);
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
