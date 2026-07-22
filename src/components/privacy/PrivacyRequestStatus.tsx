"use client";

import { useEffect, useState } from "react";

type PrivacyRequestSummary = {
  createdAt: string;
  id: string;
  kind: string;
  status: string;
  supportExport: {
    createdAt: string | null;
    downloadUrl: string;
    expiresAt: string | null;
  } | null;
};

export function PrivacyRequestStatus() {
  const [requests, setRequests] = useState<PrivacyRequestSummary[] | null>(null);

  useEffect(() => {
    let active = true;
    void fetch("/api/compliance/privacy-requests", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) return null;
        if (!response.ok) throw new Error("privacy_request_status_unavailable");
        return response.json() as Promise<{ requests?: PrivacyRequestSummary[] }>;
      })
      .then((payload) => {
        if (active) setRequests(payload?.requests ?? []);
      })
      .catch(() => {
        if (active) setRequests([]);
      });
    return () => { active = false; };
  }, []);

  if (!requests || requests.length === 0) return null;
  return (
    <section className="border border-[#d9d8d4] bg-white p-3" aria-labelledby="privacy-request-status-title">
      <h2 id="privacy-request-status-title" className="text-[11px] font-medium leading-4 text-[#111111]">
        Your privacy requests
      </h2>
      <div className="mt-2 space-y-2">
        {requests.map((request) => (
          <div key={request.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-[#eeeeec] pt-2 first:border-0 first:pt-0">
            <p className="text-[9px] leading-4 text-[#5f615f]">
              {request.kind} / {request.status} / submitted {new Date(request.createdAt).toLocaleDateString()}
            </p>
            {request.supportExport ? (
              <a
                href={request.supportExport.downloadUrl}
                className="text-[9px] font-medium leading-4 text-[#111111] underline"
              >
                Download support export
                {request.supportExport.expiresAt
                  ? ` before ${new Date(request.supportExport.expiresAt).toLocaleDateString()}`
                  : ""}
              </a>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
