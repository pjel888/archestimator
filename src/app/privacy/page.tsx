import { PublicPageShell } from "@/components/landing";
import { getLandingAuthState } from "@/lib/landing/get-landing-auth-state";

export default async function PrivacyPage() {
  const isLoggedIn = await getLandingAuthState();

  return (
    <PublicPageShell isLoggedIn={isLoggedIn} isHomePage={false}>
      <section className="bg-[#eeeeec] px-6 py-10">
        <div className="mx-auto max-w-[760px]">
          <p className="text-[9px] font-medium uppercase tracking-normal text-[#ff7a1a]">
            Launch legal status
          </p>
          <h1 className="mt-3 text-[12px] font-medium leading-4 tracking-normal text-[#111111]">
            Privacy Notice pending review.
          </h1>
          <div className="mt-3 space-y-2 text-[10px] leading-4 text-[#1f201f]">
            <p>
              Archestimator&apos;s public self-serve launch is blocked until a reviewed Privacy Notice is published.
            </p>
            <p>
              Do not use this page as a final privacy notice. It exists so the sign-in flow has a truthful legal-status surface while launch evidence is being completed.
            </p>
          </div>
        </div>
      </section>
    </PublicPageShell>
  );
}
