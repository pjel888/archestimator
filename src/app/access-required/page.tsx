import Link from "next/link";

const SUPPORT_EMAIL = "support@archestimator.com";
const SUPPORT_MAILTO =
  "mailto:support@archestimator.com?subject=Archestimator%20access";

export default function BetaAccessRequiredPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; reason?: string }>;
}) {
  return (
    <main className="min-h-screen bg-surfaceMuted p-2 text-ink">
      <section className="mx-auto flex min-h-[calc(100vh-16px)] max-w-[420px] items-center">
        <div className="w-full rounded-xs border border-hairline bg-white p-3 shadow-[0_18px_60px_-44px_rgba(17,24,39,0.45)]">
          <div className="border-b border-hairline pb-2">
            <p className="text-[8px] font-medium uppercase tracking-normal text-muted">Archestimator</p>
            <h1 className="mt-1 text-[12px] font-medium tracking-normal text-ink">Access unavailable</h1>
            <p className="mt-1 text-[10px] leading-4 text-muted">
              This account is signed in, but it cannot use the workshop right now.
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
              Contact support
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
  searchParams: Promise<{ status?: string; reason?: string }>;
}) {
  const params = await searchParams;
  const reason = params.reason;
  const isRevoked = params.status === "revoked";

  let copy = `Access is granted manually. Email ${SUPPORT_EMAIL} with the account you want enabled.`;
  if (reason === "deleted") {
    copy = `This account was closed. Sign up again with the same email to start a fresh empty account, or email ${SUPPORT_EMAIL} if you need help.`;
  } else if (reason === "banned") {
    copy = `This account has been banned. Email ${SUPPORT_EMAIL} if this looks wrong.`;
  } else if (reason === "suspended") {
    copy = `This account has been suspended. Email ${SUPPORT_EMAIL} if this looks wrong.`;
  } else if (isRevoked) {
    copy = `Access for this account has been paused. Email ${SUPPORT_EMAIL} if this looks wrong.`;
  }

  return (
    <div
      aria-live="polite"
      className="mt-2 rounded-xs border border-accent/25 bg-accentSoft p-2 text-[10px] leading-4 text-ink"
    >
      {copy}
    </div>
  );
}
