import { TermsAcceptancePanel } from "@/components/workshop/TermsAcceptancePanel";
import { requireCurrentUserContext } from "@/lib/auth/session";
import { sanitizeNextPath } from "@/lib/auth/redirects";
import { acceptCurrentTermsAction } from "@/lib/legal/actions";
import { CURRENT_TERMS } from "@/lib/legal/terms-content";
import { TERMS_GATE_FALLBACK_NEXT } from "@/lib/legal/terms-gate";

type WorkshopTermsPageProps = {
  searchParams?: Promise<{
    next?: string;
    error?: string;
  }>;
};

export default async function WorkshopTermsPage({ searchParams }: WorkshopTermsPageProps) {
  const params = await searchParams ?? {};
  const context = await requireCurrentUserContext();
  const returnTo = sanitizeNextPath(params.next, TERMS_GATE_FALLBACK_NEXT);

  return (
    <main className="min-h-[100dvh] bg-canvas text-ink">
      <TermsAcceptancePanel
        terms={CURRENT_TERMS}
        returnTo={returnTo}
        acceptAction={acceptCurrentTermsAction}
        userEmail={context.email}
        errorCode={params.error ?? null}
      />
    </main>
  );
}
