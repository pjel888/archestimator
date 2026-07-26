"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowClockwise, PaperPlaneTilt, Plus, X } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { createPublicationCsrfHeaders } from "@/lib/publication/client-csrf";

type PublicRequest = {
  currentVersion: {
    description: string;
    requestedEffectiveDate: string | null;
    title: string;
    versionNumber: number;
  };
  publicRequestId: string;
  requestCode: string;
  requestedAt: string;
  status: string;
};

type RequestPage = { requests: PublicRequest[] };

const FIELD_CLASS = "w-full rounded-xs border border-hairline bg-white px-3 py-2 text-[13px] text-ink outline-none focus:border-ink";
const LABEL_CLASS = "grid gap-1.5 text-[11px] font-medium text-secondary";

function requestPath(token: string, suffix = "") {
  return `/api/share/${encodeURIComponent(token)}/requests${suffix}`;
}

function idempotencyKey() {
  return crypto.randomUUID();
}

async function errorMessage(response: Response, fallback: string) {
  const payload = await response.json().catch(() => null) as { error?: unknown } | null;
  return typeof payload?.error === "string" ? payload.error : fallback;
}

export function ClientPortalRequestSection({ capabilities, token }: { capabilities: readonly string[]; token: string }) {
  const [requests, setRequests] = useState<PublicRequest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [composing, setComposing] = useState(false);
  const [amending, setAmending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const selected = useMemo(
    () => requests.find((request) => request.publicRequestId === selectedId) ?? requests[0] ?? null,
    [requests, selectedId],
  );
  const canCreate = capabilities.includes("request:create");
  const canAmend = capabilities.includes("request:amend_own");
  const canWithdraw = capabilities.includes("request:withdraw_own");

  const load = useCallback(async () => {
    const response = await fetch(requestPath(token), { cache: "no-store" }).catch(() => null);
    if (!response?.ok) {
      setNotice("Requests could not be loaded.");
      setLoading(false);
      return;
    }
    const payload = await response.json() as RequestPage;
    const next = Array.isArray(payload.requests) ? payload.requests : [];
    setRequests(next);
    setSelectedId((current) => current && next.some((request) => request.publicRequestId === current)
      ? current
      : next[0]?.publicRequestId ?? null);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    let active = true;
    void fetch(requestPath(token), { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<RequestPage> : null)
      .then((payload) => {
        if (!active) return;
        const next = Array.isArray(payload?.requests) ? payload.requests : [];
        setRequests(next);
        setSelectedId(next[0]?.publicRequestId ?? null);
        if (!payload) setNotice("Requests could not be loaded.");
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setNotice("Requests could not be loaded.");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSubmitting(true);
    setNotice(null);
    const response = await fetch(requestPath(token), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey(),
        ...createPublicationCsrfHeaders(),
      },
      body: JSON.stringify({
        description: form.get("description"),
        externalReferenceUrl: form.get("externalReferenceUrl"),
        requestedEffectiveDate: form.get("requestedEffectiveDate"),
        title: form.get("title"),
      }),
    }).catch(() => null);
    if (!response?.ok) {
      setNotice(response ? await errorMessage(response, "Request could not be submitted.") : "Request could not be submitted.");
      setSubmitting(false);
      return;
    }
    const payload = await response.json() as { request?: PublicRequest };
    setComposing(false);
    formElement.reset();
    setNotice(payload.request ? `${payload.request.requestCode} was recorded for assessment.` : "Request recorded for assessment.");
    await load();
    setSubmitting(false);
  }

  async function submitAmendment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSubmitting(true);
    setNotice(null);
    const response = await fetch(requestPath(token, `/${encodeURIComponent(selected.publicRequestId)}/versions`), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey(),
        ...createPublicationCsrfHeaders(),
      },
      body: JSON.stringify({
        description: form.get("description"),
        requestedEffectiveDate: form.get("requestedEffectiveDate"),
        title: form.get("title"),
      }),
    }).catch(() => null);
    if (!response?.ok) {
      setNotice(response ? await errorMessage(response, "Request amendment could not be submitted.") : "Request amendment could not be submitted.");
      setSubmitting(false);
      return;
    }
    setAmending(false);
    formElement.reset();
    setNotice("A new immutable request version was recorded.");
    await load();
    setSubmitting(false);
  }

  async function withdraw() {
    if (!selected) return;
    setSubmitting(true);
    setNotice(null);
    const response = await fetch(requestPath(token, `/${encodeURIComponent(selected.publicRequestId)}/withdraw`), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey(),
        ...createPublicationCsrfHeaders(),
      },
      body: JSON.stringify({ note: "Withdrawn by requester." }),
    }).catch(() => null);
    if (!response?.ok) {
      setNotice(response ? await errorMessage(response, "Request could not be withdrawn.") : "Request could not be withdrawn.");
      setSubmitting(false);
      return;
    }
    setNotice("Request withdrawn. Its history remains available.");
    await load();
    setSubmitting(false);
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline pb-4">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-tertiary">Project requests</p>
          <h2 className="mt-1 text-[20px] font-medium tracking-tight">Requests and evidence</h2>
          <p className="mt-2 max-w-2xl text-[12px] leading-5 text-secondary">Record a requested change for assessment without changing the approved baseline or authorizing work.</p>
        </div>
        <div className="flex gap-2">
          <Button aria-label="Refresh requests" onClick={() => void load()} size="icon-sm" variant="ghost"><ArrowClockwise size={15} /></Button>
          {canCreate ? <Button onClick={() => setComposing((value) => !value)} size="sm" variant="primary"><Plus size={14} /> New request</Button> : null}
        </div>
      </div>

      {notice ? <p className="rounded-xs border border-hairline bg-surfaceMuted px-3 py-2 text-[12px] text-secondary" role="status">{notice}</p> : null}

      {composing ? (
        <form className="grid gap-3 rounded-xs border border-hairline bg-white p-4" onSubmit={submitRequest}>
          <div className="flex items-center justify-between"><h3 className="text-[14px] font-medium">New request</h3><Button aria-label="Close request form" onClick={() => setComposing(false)} size="icon-xs" variant="plain"><X size={14} /></Button></div>
          <label className={LABEL_CLASS}>Request title<input className={FIELD_CLASS} maxLength={240} name="title" required /></label>
          <label className={LABEL_CLASS}>Description<textarea className={`${FIELD_CLASS} min-h-28 resize-y`} maxLength={4000} name="description" required /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={LABEL_CLASS}>Desired date<input className={FIELD_CLASS} name="requestedEffectiveDate" type="date" /></label>
            <label className={LABEL_CLASS}>External reference link<input className={FIELD_CLASS} name="externalReferenceUrl" type="url" /></label>
          </div>
          <p className="rounded-xs border border-warningSoft bg-warningSoft px-3 py-2 text-[11px] leading-5 text-warning">Submitting this request records it for assessment. It does not approve cost, alter the current agreement, or authorize work to proceed.</p>
          <Button className="justify-self-start" disabled={submitting} size="sm" type="submit" variant="primary"><PaperPlaneTilt size={14} /> Submit request</Button>
        </form>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <div className="grid content-start gap-1">
          {loading ? <p className="p-3 text-[12px] text-secondary">Loading requests…</p> : null}
          {!loading && requests.length === 0 ? <p className="rounded-xs border border-hairline bg-surfaceMuted p-4 text-[12px] text-secondary">No requests have been recorded.</p> : null}
          {requests.map((request) => (
            <button className={`rounded-xs border p-3 text-left ${selected?.publicRequestId === request.publicRequestId ? "border-dividerSibling bg-surfaceMuted" : "border-hairline bg-white hover:bg-surfaceMuted"}`} key={request.publicRequestId} onClick={() => setSelectedId(request.publicRequestId)} type="button">
              <span className="block text-[10px] font-medium text-tertiary">{request.requestCode}</span>
              <span className="mt-1 block truncate text-[12px] font-medium text-ink">{request.currentVersion.title}</span>
              <span className="mt-1 block text-[10px] capitalize text-secondary">{request.status.replace(/_/g, " ")} · v{request.currentVersion.versionNumber}</span>
            </button>
          ))}
        </div>

        {selected ? (
          <article className="rounded-xs border border-hairline bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline pb-3">
              <div><p className="text-[10px] font-medium text-tertiary">{selected.requestCode}</p><h3 className="mt-1 text-[16px] font-medium">{selected.currentVersion.title}</h3></div>
              <span className="rounded-xs bg-surfaceMuted px-2 py-1 text-[10px] capitalize text-secondary">{selected.status.replace(/_/g, " ")}</span>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-[13px] leading-6 text-secondary">{selected.currentVersion.description}</p>
            {selected.currentVersion.requestedEffectiveDate ? <p className="mt-3 text-[11px] text-tertiary">Desired date: {selected.currentVersion.requestedEffectiveDate}</p> : null}
            <div className="mt-5 flex flex-wrap gap-2">
              {canAmend && !["resolved", "rejected", "withdrawn"].includes(selected.status) ? <Button onClick={() => setAmending((value) => !value)} size="sm" variant="secondary">Amend request</Button> : null}
              {canWithdraw && !["resolved", "rejected", "withdrawn"].includes(selected.status) ? <Button disabled={submitting} onClick={() => void withdraw()} size="sm" variant="danger">Withdraw</Button> : null}
            </div>
            {amending ? (
              <form className="mt-4 grid gap-3 border-t border-hairline pt-4" onSubmit={submitAmendment}>
                <label className={LABEL_CLASS}>Updated title<input className={FIELD_CLASS} defaultValue={selected.currentVersion.title} maxLength={240} name="title" required /></label>
                <label className={LABEL_CLASS}>Updated description<textarea className={`${FIELD_CLASS} min-h-28 resize-y`} defaultValue={selected.currentVersion.description} maxLength={4000} name="description" required /></label>
                <label className={LABEL_CLASS}>Desired date<input className={FIELD_CLASS} defaultValue={selected.currentVersion.requestedEffectiveDate ?? ""} name="requestedEffectiveDate" type="date" /></label>
                <Button className="justify-self-start" disabled={submitting} size="sm" type="submit" variant="primary">Submit amendment</Button>
              </form>
            ) : null}
          </article>
        ) : null}
      </div>
    </div>
  );
}
