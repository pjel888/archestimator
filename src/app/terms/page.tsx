import { PublicPageShell } from "@/components/landing";
import { getLandingAuthState } from "@/lib/landing/get-landing-auth-state";

export default async function TermsPage() {
  const isLoggedIn = await getLandingAuthState();

  return (
    <PublicPageShell isLoggedIn={isLoggedIn} isHomePage={false}>
      <section className="bg-[#eeeeec] px-6 py-10">
        <div className="mx-auto max-w-[760px]">
          <p className="text-[9px] font-medium uppercase tracking-normal text-[#ff7a1a]">
            Closed beta terms
          </p>
          <h1 className="mt-3 text-[12px] font-medium leading-4 tracking-normal text-[#111111]">
            Closed beta terms for invited users.
          </h1>
          <div className="mt-3 space-y-3 text-[10px] leading-4 text-[#1f201f]">
            <p>
              Archestimator is in an invite-only access closed beta. These terms explain the current beta status and do not create a public self-serve SaaS or paid subscription offer.
            </p>
            <p>
              Philip should review this copy with counsel before inviting external testers or using it as final commercial terms.
            </p>
            <section>
              <h2 className="text-[11px] font-medium leading-4 text-[#111111]">Invite-only access</h2>
              <p className="mt-1">
                Access is limited to approved beta testers, investors, and incubator reviewers. Access may be paused, revoked, or changed while the product is being tested.
              </p>
            </section>
            <section>
              <h2 className="text-[11px] font-medium leading-4 text-[#111111]">No payment or subscription contract</h2>
              <p className="mt-1">
                No payment is collected during closed beta. There is no checkout, invoice, paid plan, billing portal, uptime service level, or commercial subscription contract active for beta users.
              </p>
            </section>
            <section>
              <h2 className="text-[11px] font-medium leading-4 text-[#111111]">Beta use and data responsibility</h2>
              <p className="mt-1">
                The beta may contain defects. Users remain responsible for entered project, supplier, client, and estimate data and should avoid highly sensitive client information unless they accept beta risk.
              </p>
            </section>
            <section>
              <h2 className="text-[11px] font-medium leading-4 text-[#111111]">Construction estimate accuracy</h2>
              <p className="mt-1">
                Archestimator helps organize estimate data and exports. It does not guarantee final pricing, scope completeness, code compliance, supplier pricing, labor rates, tax treatment, or bid accuracy.
              </p>
            </section>
            <section>
              <h2 className="text-[11px] font-medium leading-4 text-[#111111]">Feedback and acceptable use</h2>
              <p className="mt-1">
                Beta feedback may be used to improve the product. Users must not abuse the service, share credentials, bypass the allowlist, upload unlawful content, or test security without written permission.
              </p>
            </section>
            <section>
              <h2 className="text-[11px] font-medium leading-4 text-[#111111]">Support and deletion requests</h2>
              <p className="mt-1">
                For access issues, data deletion requests, export problems, or beta feedback, contact Philip at <span className="font-medium">support@archestimator.com</span>.
              </p>
            </section>
          </div>
        </div>
      </section>
    </PublicPageShell>
  );
}
