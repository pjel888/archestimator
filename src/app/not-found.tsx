import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 py-12 text-ink">
      <section className="w-full max-w-md text-center" aria-label="Page not found">
        <p className="mb-3 text-[9px] font-medium uppercase text-muted">Archestimator</p>
        <h1 className="text-[12px] font-medium text-ink">Page not found</h1>
        <p className="mt-3 text-[10px] leading-5 text-muted">
          The page is unavailable or the link no longer points to an active workspace route.
        </p>
        <Link
          href="/workshop"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-xs border border-ink bg-ink px-4 text-[10px] font-medium text-white transition hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
        >
          Back to workshop
        </Link>
      </section>
    </main>
  );
}
