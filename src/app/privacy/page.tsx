import { PublicPageShell } from "@/components/landing";
import { getLandingAuthState } from "@/lib/landing/get-landing-auth-state";

export default async function PrivacyPage() {
  const isLoggedIn = await getLandingAuthState();

  return (
    <PublicPageShell isLoggedIn={isLoggedIn} isHomePage={false}>
      <section className="bg-[#eeeeec] px-6 py-10">
        <div className="mx-auto max-w-[760px]">
          <p className="text-[9px] font-medium uppercase tracking-normal text-[#ff7a1a]">
            Closed beta privacy notice
          </p>
          <h1 className="mt-3 text-[12px] font-medium leading-4 tracking-normal text-[#111111]">
            Closed beta privacy notice.
          </h1>
          <div className="mt-3 space-y-3 text-[10px] leading-4 text-[#1f201f]">
            <p>
              Archestimator is being tested with invited beta users. This notice summarizes the data used to operate the beta and support testers.
            </p>
            <p>
              Philip should review this copy with counsel before inviting external testers or publishing final production privacy terms.
            </p>
            <section>
              <h2 className="text-[11px] font-medium leading-4 text-[#111111]">Data collected</h2>
              <p className="mt-1">
                The beta may collect account email, profile and workspace details, project and estimate data, component/template usage, feedback, support messages, access logs, and error or usage telemetry.
              </p>
            </section>
            <section>
              <h2 className="text-[11px] font-medium leading-4 text-[#111111]">How data is used</h2>
              <p className="mt-1">
                Data is used to operate the closed beta, secure invite-only access, support users, debug errors, improve estimating workflows, and understand whether exports and library/template tools are useful.
              </p>
            </section>
            <section>
              <h2 className="text-[11px] font-medium leading-4 text-[#111111]">Processors and providers</h2>
              <p className="mt-1">
                Current and planned processors may include Vercel for hosting, Supabase for authentication and data storage, Resend if email delivery is enabled, observability providers if configured, and an external feedback form provider if selected.
              </p>
            </section>
            <section>
              <h2 className="text-[11px] font-medium leading-4 text-[#111111]">Beta data handling</h2>
              <p className="mt-1">
                Archestimator does not sell beta user data. Users should avoid entering highly sensitive client data during beta unless they accept the current testing risk.
              </p>
            </section>
            <section>
              <h2 className="text-[11px] font-medium leading-4 text-[#111111]">Retention and deletion</h2>
              <p className="mt-1">
                To request deletion of beta account or workspace data, contact Philip at <span className="font-medium">support@archestimator.com</span> with the Google email used for beta access.
              </p>
            </section>
          </div>
        </div>
      </section>
    </PublicPageShell>
  );
}
