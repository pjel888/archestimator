"use client";

import Link from "next/link";
import { useState, type ComponentProps } from "react";
import { useFormStatus } from "react-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TERMS_ACCEPTANCE_SUMMARY, type LegalDocumentMetadata } from "@/lib/legal/terms-content";
import { cn } from "@/lib/ui/cn";

type TermsAcceptancePanelProps = {
  terms: LegalDocumentMetadata;
  returnTo: string;
  acceptAction: ComponentProps<"form">["action"];
  userEmail?: string | null;
  errorCode?: string | null;
  className?: string;
};

function TermsSubmitButton({ checked }: { checked: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" size="md" disabled={!checked || pending} className="h-8 w-full sm:w-auto">
      {pending ? "Saving acceptance..." : "Accept and continue"}
    </Button>
  );
}

function TermsAcceptanceError({ errorCode }: { errorCode?: string | null }) {
  if (!errorCode) return null;

  const message = errorCode === "save_failed"
    ? "We could not save your Terms acceptance. Check your connection and try again. If the issue continues, contact support@archestimator.com."
    : "Review the current Terms version and confirm the checkbox before continuing.";

  return (
    <div aria-live="polite" className="rounded-xs border border-dangerSoft bg-dangerSoft/40 p-2 text-[10px] leading-4 text-danger">
      {message}
    </div>
  );
}

export function TermsAcceptancePanel({
  terms,
  returnTo,
  acceptAction,
  userEmail,
  errorCode,
  className,
}: TermsAcceptancePanelProps) {
  const [checked, setChecked] = useState(false);

  return (
    <section className={cn("mx-auto flex min-h-full max-w-3xl items-center justify-center p-2", className)}>
      <div className="w-full rounded-xs border border-hairline bg-white shadow-[0_18px_60px_-44px_rgba(17,24,39,0.45)]">
        <div className="border-b border-hairline p-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="warning" size="xs">Required</Badge>
            <Badge tone="neutral" size="xs">{terms.version}</Badge>
            <span className="text-[8px] leading-3 text-tertiary">Effective {terms.effectiveDate}</span>
          </div>
          <h1 className="mt-2 text-[12px] font-medium leading-4 tracking-normal text-ink">
            Review and accept Terms
          </h1>
          <p className="mt-1 max-w-2xl text-[10px] leading-4 text-tertiary">
            Protected workshop access requires affirmative acceptance of the current Terms of Service.
            {userEmail ? ` Signed in as ${userEmail}.` : null}
          </p>
        </div>

        <form action={acceptAction} className="space-y-2 p-2">
          <input type="hidden" name="next" value={returnTo} />
          <input type="hidden" name="terms_version" value={terms.version} />
          <input type="hidden" name="terms_key" value={terms.key} />

          <TermsAcceptanceError errorCode={errorCode} />

          <div className="rounded-xs border border-hairline bg-surfaceMuted p-2">
            <h2 className="text-[10px] font-medium leading-4 text-ink">Software tool only</h2>
            <p className="mt-1 text-[10px] leading-4 text-secondary">
              ArchEstimator is a software tool. It is not an architect-of-record, engineer-of-record,
              estimator-of-record, contractor, quantity surveyor, financial adviser, legal adviser,
              permitting authority, code-compliance authority, or construction authority.
            </p>
            <p className="mt-1 text-[10px] leading-4 text-secondary">
              To the maximum extent permitted by law, outputs are provided as support material requiring
              independent professional review.
            </p>
          </div>

          {/* react-doctor-disable-next-line react-doctor/no-noninteractive-tabindex -- Scrollable terms summary is focusable for keyboard scrolling. */}
          <div className="max-h-[34dvh] overflow-y-auto rounded-xs border border-hairline bg-white p-2" tabIndex={0} aria-label="Terms summary">
            <p className="text-[10px] leading-4 text-secondary">{TERMS_ACCEPTANCE_SUMMARY}</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-[10px] leading-4 text-secondary">
              <li>Independently review quantities, pricing, schedules, reports, assumptions, and exports.</li>
              <li>Confirm supplier pricing, labor rates, taxes, permitting, code compliance, site conditions, and project decisions.</li>
              <li>Use the full Terms and Privacy Notice links below for the binding version and data handling summary.</li>
            </ul>
          </div>

          <div className="flex flex-wrap gap-2 text-[10px] leading-4">
            <Link href="/terms" className="font-medium text-ink underline decoration-hairline underline-offset-2">
              Full Terms
            </Link>
            <Link href="/privacy" className="font-medium text-ink underline decoration-hairline underline-offset-2">
              Privacy Notice
            </Link>
          </div>

          <label className="flex items-start gap-2 rounded-xs border border-hairline bg-white p-2 text-[10px] leading-4 text-secondary">
            <input
              type="checkbox"
              name="accepted_responsibility"
              required
              checked={checked}
              onChange={(event) => setChecked(event.currentTarget.checked)}
              className="mt-0.5 size-3.5 rounded-xs border-hairline accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            />
            <span>
              I have read and agree to the current Terms of Service and Privacy Notice, and I understand that I remain
              responsible for independently reviewing, verifying, approving, and using ArchEstimator outputs and project decisions.
            </span>
          </label>

          <div className="flex flex-col gap-2 border-t border-hairline pt-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[9px] leading-4 text-tertiary">
              Acceptance records store user id, Terms version, effective date, content hash, Privacy Notice version, method, context, and timestamp; raw IP and raw user-agent are not stored by default.
            </p>
            <TermsSubmitButton checked={checked} />
          </div>
        </form>
      </div>
    </section>
  );
}
