import Link from "next/link";

const SUPPORT_EMAIL = "support@archestimator.com";
const SUPPORT_MAILTO =
  "mailto:support@archestimator.com?subject=Archestimator%20access";

export default function BetaAccessRequiredPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  return (
    <main className="min-h-screen bg-surfaceMuted p-2 text-ink">
      <section className="mx-auto flex min-h-[calc(100vh-16px)] max-w-[420px] items-center">
        <div className="w-full rounded-xs border border-hairline bg-white p-3 shadow-[0_18px_60px_-44px_rgba(17,24,39,0.45)]">
          <div className="border-b border-hairline pb-2">
            <p className="text-[8px] font-medium uppercase tracking-normal text-muted">Archestimator</p>
            <h1 className="mt-1 text-[12px] font-medium tracking-normal text-ink">Invite-only access</h1>
            <p className="mt-1 text-[10px] leading-4 text-muted">
              This account is signed in, but it is not currently enabled for access.
            </p>
          </div>

          <BetaAccessStatusCopy searchParams={searchParams} />

          <div className="mt-3 flex gap-2">
            <Link
              href="/login"
              className="inline-flex h-9 flex-1 items-center justify-center rounded-xs border border-hairline bg-white px-3 text-[10px] font-medium text-ink hover:bg-surfaceMuted"
            >
              Use another account
            </Link>
            <a
              href={SUPPORT_MAILTO}
              className="inline-flex h-9 flex-1 items-center justify-center rounded-xs bg-ink px-3 text-[10px] font-medium text-white hover:bg-ink/90"
            >
              Request access
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

async function BetaAccessStatusCopy({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const isRevoked = params.status === "revoked";

  return (
    <div
      aria-live="polite"
      className="mt-2 rounded-xs border border-accent/25 bg-accentSoft p-2 text-[10px] leading-4 text-ink"
    >
      {isRevoked
        ? `Access for this account has been paused. Email ${SUPPORT_EMAIL} if this looks wrong.`
        : `Access is granted manually. Email ${SUPPORT_EMAIL} with the account you want enabled.`}
    </div>
  );
}
