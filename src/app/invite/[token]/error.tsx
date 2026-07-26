"use client";

import { Button, ButtonLink } from "@/components/ui/button";

export default function Error({
  error,
  reset,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  reset?: () => void;
  unstable_retry?: () => void;
}) {
  const retry = unstable_retry ?? reset;
  return (
    <main
      role="alert"
      aria-label="Invite error"
      className="mx-auto flex min-h-[50vh] w-full max-w-md flex-col justify-center gap-3 p-4"
    >
      <h1 className="text-[12px] font-medium text-ink">Invite could not be loaded</h1>
      <p className="text-[10px] text-secondary">
        Something went wrong while opening this invite. Try again, or ask the sender for a new link.
      </p>
      {error.digest ? (
        <p className="text-[10px] text-tertiary">Reference: {error.digest}</p>
      ) : null}
      <div className="flex gap-2">
        {retry ? (
          <Button type="button" size="sm" onClick={() => retry()}>
            Try again
          </Button>
        ) : null}
        <ButtonLink
          href="/login"
          variant="plain"
          size="sm"
          className="inline-flex min-h-8 min-w-0 items-center justify-center rounded-xs border border-divider bg-surface px-2 text-[10px] font-medium text-ink"
        >
          Sign in
        </ButtonLink>
      </div>
    </main>
  );
}
