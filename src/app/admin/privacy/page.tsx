import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { Card } from "@/components/ui/card";
import { requireAdminContext } from "@/lib/admin/require-admin";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { listPrivacyRequests } from "@/lib/compliance/privacy-request-repository";

import { PrivacyRequestControls } from "./PrivacyRequestControls";

export const dynamic = "force-dynamic";

export default async function AdminPrivacyPage() {
  await requireAdminContext();
  const database = await getCloudflareD1Database();
  const requests = database ? await listPrivacyRequests({ limit: 200 }, database) : [];

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Governance"
        title="Privacy requests"
        description="Verify a subject, then execute support export or erasure with revision and privacy-fence controls. Delivery stays manual and no email is sent."
      />
      {!database ? (
        <p role="alert" className="rounded-xs border border-dangerSoft bg-dangerSoft/30 p-2 text-[10px] text-danger">
          Privacy request storage is unavailable.
        </p>
      ) : null}
      <section className="space-y-2" aria-label="Privacy request register">
        {requests.length === 0 ? (
          <Card className="p-3 text-[10px] leading-4 text-secondary">No privacy requests are recorded.</Card>
        ) : requests.map((request) => {
          const verified = Boolean(request.subject_verified_at && request.requester_user_id);
          const executable = request.request_kind === "access"
            || request.request_kind === "portability"
            || request.request_kind === "erasure";
          return (
            <Card key={request.id} className="space-y-2 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium leading-4 text-ink">{request.request_kind}</p>
                  <p className="break-all text-[9px] leading-3 text-tertiary">{request.id}</p>
                </div>
                <div className="text-right text-[9px] leading-3 text-secondary">
                  <p>{request.status}</p>
                  <p>Revision {request.execution_revision}</p>
                </div>
              </div>
              <p className="whitespace-pre-wrap text-[10px] leading-4 text-secondary">{request.description}</p>
              <dl className="grid gap-1 text-[9px] leading-3 text-secondary sm:grid-cols-2">
                <div><dt className="inline text-tertiary">Subject: </dt><dd className="inline break-all">{request.requester_user_id ?? "unverified"}</dd></div>
                <div><dt className="inline text-tertiary">Verification: </dt><dd className="inline">{request.subject_verification_method ?? "pending"}</dd></div>
                <div><dt className="inline text-tertiary">Created: </dt><dd className="inline">{request.created_at}</dd></div>
                <div><dt className="inline text-tertiary">Last code: </dt><dd className="inline">{request.execution_error_code ?? "none"}</dd></div>
              </dl>
              <PrivacyRequestControls
                executable={executable && request.status !== "completed" && request.status !== "rejected"}
                expectedRevision={request.execution_revision}
                privacyRequestId={request.id}
                verified={verified}
              />
            </Card>
          );
        })}
      </section>
    </AdminPage>
  );
}
