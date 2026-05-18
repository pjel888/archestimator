import { Button } from "@/components/ui/button";
import { ControlInput } from "@/components/ui/control-input";
import { signInWithEmail } from "@/lib/auth/actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; sent?: string; email?: string; error?: string }> }) {
  const params = await searchParams;
  const next = params.next?.startsWith("/") && !params.next.startsWith("//") ? params.next : "/workshop/projects";

  return (
    <main className="min-h-screen bg-[#F4F7FA] p-2 text-ink">
      <section className="mx-auto flex min-h-[calc(100vh-16px)] max-w-[360px] items-center">
        <div className="w-full rounded-lg border border-hairline bg-white p-2 shadow-[0_18px_60px_-44px_rgba(17,24,39,0.45)]">
          <div className="border-b border-hairline pb-2">
            <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-muted">Archestimator</p>
            <h1 className="mt-1 text-[12px] font-bold tracking-[-0.02em] text-ink">Sign in to workshop</h1>
            <p className="mt-1 text-[10px] leading-4 text-muted">Use your email to receive a Supabase magic link.</p>
          </div>

          {params.sent ? (
            <div className="mt-2 rounded-md border border-accent/25 bg-accentSoft p-2 text-[10px] leading-4 text-ink">
              Magic link sent to <span className="font-bold">{params.email}</span>. Open it on this device to continue.
            </div>
          ) : null}

          {params.error ? (
            <div className="mt-2 rounded-md border border-dangerSoft bg-dangerSoft/40 p-2 text-[10px] leading-4 text-danger">
              {params.error}
            </div>
          ) : null}

          <form action={signInWithEmail} className="mt-2 space-y-2">
            <input type="hidden" name="next" value={next} />
            <label className="block space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted">Email</span>
              <ControlInput name="email" type="email" placeholder="philipjonlewis@gmail.com" autoComplete="email" required className="h-9 px-2" />
            </label>
            <Button type="submit" variant="primary" size="md" className="h-9 w-full">
              Send magic link
            </Button>
          </form>

          <p className="mt-2 text-[9px] leading-4 text-muted">
            CEO access is automatically assigned to philipjonlewis@gmail.com after Supabase auth creates the user profile.
          </p>
        </div>
      </section>
    </main>
  );
}
