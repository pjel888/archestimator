"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { createPublicationCsrfHeaders } from "@/lib/publication/client-csrf";

type Decision = "approved" | "changes_requested" | "declined";

export function ClientPortalDecisionSection({ capabilities, issue, token }: { capabilities: readonly string[]; issue: { contentHash: string; id: string; number: number; versionLabel: string }; token: string }) {
  const [decision, setDecision] = useState<Decision | null>(null);
  const [note, setNote] = useState("");
  const [signerName, setSignerName] = useState("");
  const [state, setState] = useState<"error" | "idle" | "saving" | "success">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const canReview = capabilities.includes("decision:submit_review");
  const canApprove = capabilities.includes("decision:submit_formal");

  async function submit() {
    if (!decision) return;
    setState("saving");
    setMessage(null);
    const response = await fetch(`/api/share/${encodeURIComponent(token)}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "idempotency-key": crypto.randomUUID(), ...createPublicationCsrfHeaders() },
      body: JSON.stringify({ decision, expectedIssueContentHash: issue.contentHash, issueId: issue.id, note, signerName }),
    }).catch(() => null);
    const body = response ? await response.json().catch(() => null) as { error?: string; receipt?: { currencyCode: string; total: number; versionLabel: string } } | null : null;
    if (!response?.ok || !body?.receipt) { setState("error"); setMessage(body?.error ?? "Decision could not be submitted."); return; }
    setState("success");
    setMessage(`Decision recorded for ${body.receipt.versionLabel}: ${new Intl.NumberFormat(undefined, { style: "currency", currency: body.receipt.currencyCode }).format(body.receipt.total)}.`);
  }

  if (!canReview && !canApprove) return <p className="text-[13px] text-secondary">Your recipient role can review this issue but cannot submit a decision.</p>;

  return <section className="mx-auto max-w-2xl space-y-5"><header><p className="text-[10px] font-medium uppercase tracking-wide text-tertiary">Issue-wide decision</p><h3 className="mt-1 text-[20px] font-medium tracking-tight text-ink">{issue.versionLabel}</h3><p className="mt-1 text-[13px] text-secondary">Your choice applies to the whole issued scope, not an individual estimate row or chart.</p></header><div className="grid gap-2 sm:grid-cols-3"><Button variant="secondary" disabled={!canApprove || state === "saving"} onClick={() => setDecision("approved")}>Approve</Button><Button variant="secondary" disabled={!canReview || state === "saving"} onClick={() => setDecision("changes_requested")}>Request changes</Button><Button variant="secondary" disabled={!canReview || state === "saving"} onClick={() => setDecision("declined")}>Decline</Button></div>{decision ? <div className="grid gap-3 border border-hairline bg-surfaceMuted/40 p-4"><p className="text-[13px] text-ink">Selected: <strong>{decision.replace(/_/g, " ")}</strong></p><input value={signerName} onChange={(event) => setSignerName(event.target.value)} placeholder="Signer name (optional)" className="min-h-10 border border-hairline bg-white px-3 text-[13px]" /><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Decision note (optional)" className="min-h-28 border border-hairline bg-white p-3 text-[13px]" /><Button disabled={state === "saving"} onClick={() => void submit()}>Confirm issue-wide decision</Button></div> : null}{message ? <p role={state === "error" ? "alert" : "status"} className={state === "error" ? "text-[13px] text-danger" : "text-[13px] text-success"}>{message}</p> : null}</section>;
}
