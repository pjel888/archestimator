import Link from "next/link";

import { PublicPageShell } from "@/components/landing";
import {
  CURRENT_PRIVACY_NOTICE,
  CURRENT_TERMS,
  TERMS_CONTENT_SECTIONS,
} from "@/lib/legal/terms-content";

export const dynamic = "force-static";

export default function TermsPage() {
  return (
    <PublicPageShell isHomePage={false}>
      <section className="bg-[#eeeeec] px-6 py-10">
        <div className="mx-auto max-w-[820px]">
          <p className="text-[9px] font-medium uppercase tracking-normal text-brand-orange">
            Closed beta terms
          </p>
          <h1 className="mt-3 text-[12px] font-medium leading-4 tracking-normal text-[#111111]">
            {CURRENT_TERMS.title}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2 text-[9px] leading-4 text-[#5f615f]">
            <span>Version {CURRENT_TERMS.version}</span>
            <span aria-hidden="true">/</span>
            <span>Effective {CURRENT_TERMS.effectiveDate}</span>
            <span aria-hidden="true">/</span>
            <span>Privacy Notice {CURRENT_PRIVACY_NOTICE.version}</span>
          </div>

          <div className="mt-4 space-y-4 text-[10px] leading-4 text-[#1f201f]">
            <p>{CURRENT_TERMS.summary}</p>
            <p>
              These Terms are written for invite-only professional/business beta use. They support authenticated clickwrap acceptance and append-only acceptance records, may be updated before any public or paid launch, and final public or paid launch Terms must be reviewed by qualified legal counsel.
            </p>
            <p>
              For beta feedback, access issues, deletion requests, export problems, or Terms questions, contact support@archestimator.com.
            </p>

            {TERMS_CONTENT_SECTIONS.map((section) => (
              <section key={section.id} className="space-y-1">
                <h2 className="text-[11px] font-medium leading-4 text-[#111111]">{section.title}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </section>
            ))}

            <section className="space-y-1 border-t border-[#d9d8d4] pt-3">
              <h2 className="text-[11px] font-medium leading-4 text-[#111111]">Privacy Notice</h2>
              <p>
                The current Privacy Notice is available at{" "}
                <Link href="/privacy" className="font-medium text-[#111111] underline decoration-[#d9d8d4] underline-offset-2">
                  /privacy
                </Link>
                . Terms acceptance records store the accepting user id, Terms version, effective date, content hash, Privacy Notice version, acceptance method, acceptance context, and timestamp. Raw IP address and raw user-agent strings are not stored for Terms acceptance by default.
              </p>
            </section>

            <p className="border-t border-[#d9d8d4] pt-3 text-[9px] leading-4 text-[#5f615f]">
              Last updated for closed beta review: June 6, 2026. Closed beta version {CURRENT_TERMS.version}. Content hash {CURRENT_TERMS.contentHash}. Support and legal notices during beta: support@archestimator.com.
            </p>
          </div>
        </div>
      </section>
    </PublicPageShell>
  );
}
