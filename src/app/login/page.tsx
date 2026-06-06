import { Button } from "@/components/ui/button";
import { ControlInput } from "@/components/ui/control-input";
import { signInWithEmail, signInWithGoogle } from "@/lib/auth/actions";
import { getPublicAuthError } from "@/lib/auth/error-mapping";
import { sanitizeNextPath } from "@/lib/auth/redirects";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; sent?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = sanitizeNextPath(params.next);
  const publicError = params.error ? getPublicAuthError(params.error) : null;

  return (
    <main className="min-h-screen bg-surfaceMuted p-2 text-ink">
      <section className="mx-auto flex min-h-[calc(100vh-16px)] max-w-[360px] items-center">
        <div className="w-full rounded-xs border border-hairline bg-white p-2 shadow-[0_18px_60px_-44px_rgba(17,24,39,0.45)]">
          <div className="border-b border-hairline pb-2">
            <p className="text-[8px] font-medium uppercase tracking-normal text-muted">Archestimator</p>
            <h1 className="mt-1 text-[12px] font-medium tracking-normal text-ink">Sign in to Archestimator</h1>
            <p className="mt-1 text-[10px] leading-4 text-muted">
              Continue with Google or get a one-time email link. No password required.
            </p>
          </div>

          {params.sent ? (
            <div
              aria-live="polite"
              className="mt-2 rounded-xs border border-accent/25 bg-accentSoft p-2 text-[10px] leading-4 text-ink"
            >
              Check your email for a sign-in link, then open it on this device to continue.
            </div>
          ) : null}

          {publicError ? (
            <div
              aria-live="polite"
              className="mt-2 rounded-xs border border-dangerSoft bg-dangerSoft/40 p-2 text-[10px] leading-4 text-danger"
            >
              {publicError.message}
            </div>
          ) : null}

          <form action={signInWithGoogle} className="mt-2">
            <input type="hidden" name="next" value={next} />
            <Button type="submit" variant="secondary" size="md" className="h-9 w-full">
              Continue with Google
            </Button>
          </form>

          <div className="my-2 flex items-center gap-2 text-[8px] font-medium uppercase tracking-normal text-muted">
            <span className="h-px flex-1 bg-hairline" />
            Email link
            <span className="h-px flex-1 bg-hairline" />
          </div>

          <form action={signInWithEmail} className="space-y-2">
            <input type="hidden" name="next" value={next} />
            <label className="block space-y-1">
              <span className="text-[9px] font-medium uppercase tracking-normal text-muted">Email</span>
              <ControlInput
                name="email"
                type="email"
                placeholder="name@example.com"
                autoComplete="email"
                required
                className="h-9 px-2"
              />
            </label>
            <Button type="submit" variant="primary" size="md" className="h-9 w-full">
              Send sign-in link
            </Button>
          </form>

          <p className="mt-2 text-[9px] leading-4 text-muted">
            Review the current{" "}
            <a href="/terms" className="font-medium text-ink underline decoration-hairline underline-offset-2">
              closed beta terms
            </a>{" "}
            and{" "}
            <a href="/privacy" className="font-medium text-ink underline decoration-hairline underline-offset-2">
              privacy notice
            </a>
            . Protected workshop access requires affirmative acceptance after sign-in.
          </p>
        </div>
      </section>
    </main>
  );
}
