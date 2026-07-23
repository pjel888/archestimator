import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

// F8 (UNIT-009) Financial readiness — HONEST unavailable state.
// Per the pack contract (DEC-AUTO-*): Admin never fabricates billing, revenue,
// attribution, or provider health. Every financial metric renders an explicit
// "unavailable until a billing provider is connected" state — unavailable is
// NOT zero. When a provider adapter is connected (F8 provider work), these cards
// wire to real reads.
const METRICS = [
  { key: "mrr", label: "MRR (monthly recurring revenue)" },
  { key: "active_subscribers", label: "Active subscribers" },
  { key: "churn", label: "Churn (30d)" },
  { key: "failed_payments", label: "Failed payments (30d)" },
  { key: "open_invoices", label: "Open invoices" },
  { key: "disputes", label: "Open disputes" },
] as const;

export default function AdminFinancialsPage() {
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Admin"
        title="Financials"
        description="Financial readiness. No billing provider is connected — every metric is explicitly unavailable (not zero). Connect a provider to populate these cards."
      />

      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3" aria-label="Financial readiness metrics">
        {METRICS.map((metric) => (
          <Card key={metric.key} className="p-2">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
              <p className="text-[9px] font-medium uppercase leading-3 text-tertiary text-pretty">{metric.label}</p>
              <Badge tone="neutral" size="xs" className="w-fit min-w-0 px-1">
                unavailable
              </Badge>
            </div>
            <p className="mt-2 text-[12px] font-medium leading-5 text-tertiary">—</p>
            <p className="mt-1 text-[9px] leading-3 text-tertiary">
              No billing provider connected. Unavailable is not zero.
            </p>
          </Card>
        ))}
      </section>

      <Card className="p-2">
        <h2 className="text-[11px] font-medium leading-4 text-ink">Connect a billing provider</h2>
        <p className="mt-1 text-[10px] leading-4 text-tertiary">
          Wiring a provider-owned billing read adapter (customers, subscriptions, invoices, failed
          payments, refunds, disputes, MRR movement) is the F8 provider increment. Until then, these
          cards stay honestly unavailable.
        </p>
        <Link
          href="https://dashboard.stripe.com/"
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex cursor-pointer items-center gap-1 text-[10px] font-medium leading-4 text-ink hover:underline"
        >
          Open Stripe <ArrowSquareOut size={16} weight="regular" className="pointer-events-none" aria-hidden="true" />
        </Link>
      </Card>
    </AdminPage>
  );
}
