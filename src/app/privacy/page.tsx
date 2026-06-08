import { PublicPageShell } from "@/components/landing";
import { CURRENT_PRIVACY_NOTICE, CURRENT_TERMS } from "@/lib/legal/terms-content";
import { getLandingAuthState } from "@/lib/landing/get-landing-auth-state";

export default async function PrivacyPage() {
  const isLoggedIn = await getLandingAuthState();

  return (
    <PublicPageShell isLoggedIn={isLoggedIn} isHomePage={false}>
      <section className="bg-[#eeeeec] px-6 py-10">
        <div className="mx-auto max-w-[760px]">
          <p className="text-[9px] font-medium uppercase tracking-normal text-brand-orange">
            Closed beta privacy notice
          </p>
          <h1 className="mt-3 text-[12px] font-medium leading-4 tracking-normal text-[#111111]">
            {CURRENT_PRIVACY_NOTICE.title}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2 text-[9px] leading-4 text-[#5f615f]">
            <span>Version {CURRENT_PRIVACY_NOTICE.version}</span>
            <span aria-hidden="true">/</span>
            <span>Effective {CURRENT_PRIVACY_NOTICE.effectiveDate}</span>
          </div>
          <div className="mt-3 space-y-3 text-[10px] leading-4 text-[#1f201f]">
            <p>
              ArchEstimator is being tested with invited professional/business beta users. This notice summarizes the data used to operate the beta and support testers.
            </p>
            <p>
              This closed-beta privacy notice supports the current Terms version {CURRENT_TERMS.version} and may be updated before any public or paid launch.
            </p>
            <section>
              <h2 className="text-[11px] font-medium leading-4 text-[#111111]">Data collected</h2>
              <p className="mt-1">
                The beta may collect account email, profile and workspace details, project and estimate data, component/template usage, shared-link activity, feedback, support messages, access logs, security events, error diagnostics, and limited analytics or operational telemetry.
              </p>
            </section>
            <section>
              <h2 className="text-[11px] font-medium leading-4 text-[#111111]">Terms acceptance records</h2>
              <p className="mt-1">
                When authenticated users accept the Terms, ArchEstimator stores the accepting user id, Terms version, Terms effective date, Terms content hash, Privacy Notice version, acceptance method, acceptance context, and timestamp. Raw IP address and raw user-agent strings are not stored for Terms acceptance by default.
              </p>
            </section>
            <section>
              <h2 className="text-[11px] font-medium leading-4 text-[#111111]">How data is used</h2>
              <p className="mt-1">
                Data is used to operate the closed beta, secure invite-only access, support users, preserve audit evidence, troubleshoot errors, improve estimate and proposal workflows, and prepare a reviewed legal/privacy baseline for later launch stages.
              </p>
            </section>
            <section>
              <h2 className="text-[11px] font-medium leading-4 text-[#111111]">Service providers</h2>
              <p className="mt-1">
                The product may rely on providers such as Supabase/Postgres for auth and database storage, Vercel for hosting, Resend for email, and privacy-reviewed analytics or diagnostic providers when enabled.
              </p>
            </section>
            <section>
              <h2 className="text-[11px] font-medium leading-4 text-[#111111]">User responsibility and sensitive data</h2>
              <p className="mt-1">
                Users remain responsible for the project, client, supplier, cost, and estimate data they enter. Do not submit highly sensitive client data during beta unless you accept the current testing risk and have authority to process it.
              </p>
            </section>
            <section>
              <h2 className="text-[11px] font-medium leading-4 text-[#111111]">Retention, deletion, and legal evidence</h2>
              <p className="mt-1">
                To request deletion of beta account or workspace data, contact support@archestimator.com with the Google email used for beta access. Minimal legal/audit records may need to be retained or anonymized subject to legal review, valid obligations, and abuse-prevention needs.
              </p>
            </section>
            <p className="border-t border-[#d9d8d4] pt-3 text-[9px] leading-4 text-[#5f615f]">
              Last updated for closed beta review: June 6, 2026. Closed beta privacy version {CURRENT_PRIVACY_NOTICE.version}. Support and privacy requests: support@archestimator.com.
            </p>
          </div>
        </div>
      </section>
    </PublicPageShell>
  );
}
