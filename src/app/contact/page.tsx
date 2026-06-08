import { getLandingAuthState } from "@/lib/landing/get-landing-auth-state";
import { PublicPageShell, ContactForm } from "@/components/landing";
import { MapPin, Envelope, Sparkle } from "@phosphor-icons/react/dist/ssr";

export default async function ContactPage() {
  const isLoggedIn = await getLandingAuthState();

  return (
    <PublicPageShell isLoggedIn={isLoggedIn} isHomePage={false}>
      {/* Hero Header */}
      <section className="bg-gradient-to-b from-[#f5f5f3] to-[#eeeeec] py-20 md:py-24">
        <div className="mx-auto w-full max-w-[1120px] px-6 text-center">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-orange">
            Connect With Us
          </span>
          <h1 className="mt-5 text-[40px] font-normal leading-[1.08] tracking-[-0.04em] text-[#111111] md:text-[56px]">
            Connect with Archestimator.
          </h1>
          <p className="mx-auto mt-6 max-w-[620px] text-[16px] leading-7 text-[#626260] md:text-[18px]">
            Have a question about quote catalogs, supplier pricing, proposal workflows, or document handoff? Send a direct message to our development team.
          </p>
        </div>
      </section>

      {/* Main Section */}
      <section className="bg-[#eeeeec] py-12 md:py-16">
        <div className="mx-auto w-full max-w-[1120px] px-6">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
            
            {/* Info Panel */}
            <div className="flex flex-col justify-between rounded-[16px] border border-[#cfcfca]/60 bg-[#f5f5f3]/40 p-8">
              <div>
                <h2 className="text-[22px] font-semibold tracking-tight text-[#111111]">
                  Quote Workflow Inquiries
                </h2>
                <p className="mt-3 text-[14px] leading-6 text-[#626260]">
                  We are actively learning from suppliers, sales teams, buyers, and estimators who build quotes, proposals, and approval-ready document packages from spreadsheets.
                </p>

                <div className="mt-8 space-y-6">
                  {/* Item 1 */}
                  <div className="flex items-start gap-3.5">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-orange">
                      <Sparkle className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-[14px] font-bold text-[#111111]">
                        Design Partner Program
                      </h3>
                      <p className="mt-1 text-[13px] leading-5 text-[#626260]">
                        Get direct access to early catalog workflows and shape early features.
                      </p>
                    </div>
                  </div>

                  {/* Item 2 */}
                  <div className="flex items-start gap-3.5">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-orange">
                      <Envelope className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-[14px] font-bold text-[#111111]">
                        Direct Support
                      </h3>
                      <p className="mt-1 text-[13px] leading-5 text-[#626260]">
                        Reach us directly at <span className="font-semibold text-[#111111]">support@archestimator.com</span>.
                      </p>
                    </div>
                  </div>

                  {/* Item 3 */}
                  <div className="flex items-start gap-3.5">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-orange">
                      <MapPin className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-[14px] font-bold text-[#111111]">
                        Location & Focus
                      </h3>
                      <p className="mt-1 text-[13px] leading-5 text-[#626260]">
                        Developed with input from teams that price project work, supplier packages, and itemized commercial offers.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-[#cfcfca]/30 text-[12px] leading-5 text-[#626260]">
                <strong>Privacy Promise:</strong> We do not sell or lease your email address. It is strictly used to reply to quote workflow support and access inquiries.
              </div>
            </div>

            {/* Contact Form Wrapper */}
            <div>
              <ContactForm />
            </div>

          </div>
        </div>
      </section>
    </PublicPageShell>
  );
}
