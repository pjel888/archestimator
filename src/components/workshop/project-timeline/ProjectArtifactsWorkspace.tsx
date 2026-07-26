"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Archive,
  ArrowClockwise,
  FilePdf,
  Plus,
  UploadSimple,
  X,
} from "@phosphor-icons/react";

import { Button, ButtonLink } from "@/components/ui/button";
import { ArtifactViewer } from "@/components/client-portal/ArtifactViewer";
import { projectClientPortalComposeHref } from "@/lib/client-portal/compose-entry";
import {
  PROJECT_ARTIFACT_TYPES,
  type ProjectArtifact,
  type ProjectArtifactType,
} from "@/lib/project-artifacts/contracts";

type UploadedPdf = {
  assetId: string;
  checksumSha256: string;
  contentType: "application/pdf";
  fileName: string;
  scanStatus: string;
  sizeBytes: number;
};

type Notice = { kind: "error" | "success"; message: string } | null;

const FIELD_CLASS = "h-8 w-full rounded-xs border border-hairline bg-white px-2 text-[10px] text-ink outline-none focus:border-ink";
const LABEL_CLASS = "grid gap-1 text-[9px] font-medium uppercase tracking-wide text-tertiary";

function formatBytes(sizeBytes: number) {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function artifactTypeLabel(value: string) {
  return value.replace(/_/g, " ");
}

async function responseMessage(response: Response, fallback: string) {
  const payload = await response.json().catch(() => null) as { error?: unknown } | null;
  return typeof payload?.error === "string" ? payload.error : fallback;
}

export function ProjectArtifactsWorkspace({ projectId }: { projectId: string }) {
  const [artifacts, setArtifacts] = useState<ProjectArtifact[]>([]);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [upload, setUpload] = useState<UploadedPdf | null>(null);
  const [revisionUpload, setRevisionUpload] = useState<UploadedPdf | null>(null);

  const selectedArtifact = useMemo(
    () => artifacts.find((artifact) => artifact.id === selectedArtifactId) ?? artifacts[0] ?? null,
    [artifacts, selectedArtifactId],
  );

  const loadArtifacts = useCallback(async () => {
    const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/artifacts?includeArchived=true`, {
      cache: "no-store",
    }).catch(() => null);
    if (!response?.ok) {
      setNotice({ kind: "error", message: "Project files could not be loaded." });
      setLoading(false);
      return;
    }
    const payload = await response.json() as { artifacts?: ProjectArtifact[] };
    const nextArtifacts = Array.isArray(payload.artifacts) ? payload.artifacts : [];
    setArtifacts(nextArtifacts);
    setSelectedArtifactId((current) => current && nextArtifacts.some((item) => item.id === current)
      ? current
      : nextArtifacts[0]?.id ?? null);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    let active = true;
    void fetch(`/api/projects/${encodeURIComponent(projectId)}/artifacts?includeArchived=true`, { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<{ artifacts?: ProjectArtifact[] }> : null)
      .then((payload) => {
        if (!active) return;
        const nextArtifacts = Array.isArray(payload?.artifacts) ? payload.artifacts : [];
        setArtifacts(nextArtifacts);
        setSelectedArtifactId(nextArtifacts[0]?.id ?? null);
        if (!payload) setNotice({ kind: "error", message: "Project files could not be loaded." });
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setNotice({ kind: "error", message: "Project files could not be loaded." });
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [projectId]);

  async function uploadPdf(file: File) {
    const formData = new FormData();
    formData.set("file", file);
    const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/artifacts/uploads`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) throw new Error(await responseMessage(response, "PDF upload failed."));
    return response.json() as Promise<UploadedPdf>;
  }

  async function choosePdf(file: File | null, mode: "create" | "version") {
    if (!file) return;
    setSubmitting(true);
    setNotice(null);
    try {
      const result = await uploadPdf(file);
      if (mode === "create") setUpload(result);
      else setRevisionUpload(result);
      setNotice({
        kind: "success",
        message: result.scanStatus === "clean"
          ? "PDF is ready. Complete the record details."
          : "PDF uploaded. The record can be completed after the security scan passes.",
      });
    } catch (error) {
      setNotice({ kind: "error", message: error instanceof Error ? error.message : "PDF upload failed." });
    } finally {
      setSubmitting(false);
    }
  }

  async function createRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!upload) return;
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setNotice(null);
    const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/artifacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        artifactCode: form.get("artifactCode"),
        artifactType: form.get("artifactType"),
        contentSha256: upload.checksumSha256,
        description: form.get("description"),
        discipline: form.get("discipline"),
        sourceKind: "internal_upload",
        title: form.get("title"),
        uploadAssetId: upload.assetId,
      }),
    }).catch(() => null);
    if (!response?.ok) {
      setNotice({ kind: "error", message: response
        ? await responseMessage(response, "Project file could not be created.")
        : "Project file could not be created." });
      setSubmitting(false);
      return;
    }
    setUpload(null);
    event.currentTarget.reset();
    setNotice({ kind: "success", message: "Project file created." });
    await loadArtifacts();
    setSubmitting(false);
  }

  async function addVersion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedArtifact || !revisionUpload) return;
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setNotice(null);
    const response = await fetch(
      `/api/projects/${encodeURIComponent(projectId)}/artifacts/${encodeURIComponent(selectedArtifact.id)}/versions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentSha256: revisionUpload.checksumSha256,
          expectedCurrentVersionId: selectedArtifact.currentVersionId,
          revisionLabel: form.get("revisionLabel"),
          sourceKind: "internal_upload",
          uploadAssetId: revisionUpload.assetId,
          versionDescription: form.get("versionDescription"),
        }),
      },
    ).catch(() => null);
    if (!response?.ok) {
      setNotice({ kind: "error", message: response
        ? await responseMessage(response, "File version could not be added.")
        : "File version could not be added." });
      setSubmitting(false);
      return;
    }
    setRevisionUpload(null);
    event.currentTarget.reset();
    setNotice({ kind: "success", message: "New immutable version added." });
    await loadArtifacts();
    setSubmitting(false);
  }

  async function archiveSelected() {
    if (!selectedArtifact) return;
    setSubmitting(true);
    setNotice(null);
    const response = await fetch(
      `/api/projects/${encodeURIComponent(projectId)}/artifacts/${encodeURIComponent(selectedArtifact.id)}/archive`,
      { method: "POST" },
    ).catch(() => null);
    if (!response?.ok) {
      setNotice({ kind: "error", message: response
        ? await responseMessage(response, "Project file could not be archived.")
        : "Project file could not be archived." });
      setSubmitting(false);
      return;
    }
    setNotice({ kind: "success", message: "Project file archived without removing its versions." });
    await loadArtifacts();
    setSubmitting(false);
  }

  return (
    <main className="flex h-full min-h-0 flex-col bg-canvas xl:flex-row" aria-label="Project files">
      <section className="flex min-h-0 min-w-0 flex-1 flex-col border-b border-hairline bg-white xl:border-r xl:border-b-0">
        <header className="flex min-h-12 items-center justify-between gap-3 border-b border-hairline px-3">
          <div>
            <h2 className="text-[12px] font-medium text-ink">Files</h2>
            <p className="text-[9px] text-tertiary">Versioned, scan-gated project PDFs</p>
          </div>
          <Button aria-label="Refresh files" disabled={loading} onClick={() => {
            setLoading(true);
            void loadArtifacts();
          }} size="icon-xs" variant="plain">
            <ArrowClockwise size={14} aria-hidden="true" />
          </Button>
        </header>

        {notice ? (
          <div className={`mx-3 mt-3 rounded-xs border px-2.5 py-2 text-[10px] ${notice.kind === "error" ? "border-dangerSoft bg-dangerSoft text-danger" : "border-successSoft bg-successSoft text-success"}`} role={notice.kind === "error" ? "alert" : "status"}>
            {notice.message}
          </div>
        ) : null}

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(220px,0.36fr)_minmax(0,1fr)]">
          <div className="max-h-64 min-h-0 overflow-y-auto border-b border-hairline p-2 lg:max-h-none lg:border-r lg:border-b-0">
            {loading ? <p className="p-2 text-[10px] text-tertiary">Loading files…</p> : null}
            {!loading && artifacts.length === 0 ? (
              <div className="grid min-h-48 place-items-center p-4 text-center">
                <div>
                  <FilePdf className="mx-auto text-tertiary" size={22} aria-hidden="true" />
                  <p className="mt-2 text-[10px] font-medium text-ink">No project files yet</p>
                  <p className="mt-1 max-w-56 text-[9px] leading-4 text-tertiary">Upload a PDF, wait for its scan, then create the first immutable version.</p>
                </div>
              </div>
            ) : null}
            <div className="grid gap-1">
              {artifacts.map((artifact) => (
                <button
                  className={`w-full rounded-xs border p-2 text-left ${selectedArtifact?.id === artifact.id ? "border-dividerSibling bg-surfaceMuted" : "border-transparent hover:border-hairline hover:bg-surfaceMuted"}`}
                  key={artifact.id}
                  onClick={() => setSelectedArtifactId(artifact.id)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="truncate text-[10px] font-medium text-ink">{artifact.title}</span>
                    <span className="rounded-xs bg-surfaceMuted px-1.5 py-0.5 text-[8px] uppercase text-tertiary">{artifact.status}</span>
                  </div>
                  <p className="mt-1 truncate text-[9px] capitalize text-tertiary">{artifactTypeLabel(artifact.artifactType)} · {artifact.currentVersion ? `v${artifact.currentVersion.versionNumber}` : "No version"}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto p-3">
            {selectedArtifact?.currentVersion ? (
              <div className="grid gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[12px] font-medium text-ink">{selectedArtifact.title}</h3>
                    <p className="mt-1 text-[9px] text-tertiary">{selectedArtifact.currentVersion.fileName} · {formatBytes(selectedArtifact.currentVersion.sizeBytes)} · v{selectedArtifact.currentVersion.versionNumber}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedArtifact.status === "active" ? <ButtonLink href={projectClientPortalComposeHref(projectId, { artifactVersionIds: [selectedArtifact.currentVersion.id] })} size="xs" variant="secondary">Publish to Timeline</ButtonLink> : null}
                    {selectedArtifact.status === "active" ? (
                      <Button disabled={submitting} onClick={() => void archiveSelected()} size="xs" variant="danger">
                        <Archive size={13} aria-hidden="true" /> Archive
                      </Button>
                    ) : null}
                  </div>
                </div>
                <ArtifactViewer
                  contentUrl={`/api/projects/${encodeURIComponent(projectId)}/artifacts/${encodeURIComponent(selectedArtifact.currentVersion.id)}/content`}
                  downloadUrl={`/api/projects/${encodeURIComponent(projectId)}/artifacts/${encodeURIComponent(selectedArtifact.currentVersion.id)}/content?download=1`}
                  fileName={selectedArtifact.currentVersion.fileName}
                  revisionLabel={selectedArtifact.currentVersion.revisionLabel}
                  sizeLabel={formatBytes(selectedArtifact.currentVersion.sizeBytes)}
                  title={selectedArtifact.title}
                />
                {selectedArtifact.status === "active" ? (
                  <form className="grid gap-2 rounded-xs border border-hairline bg-white p-3" onSubmit={addVersion}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-[10px] font-medium text-ink">Add immutable version</h4>
                        <p className="text-[9px] text-tertiary">The current version remains in history.</p>
                      </div>
                      <label className="inline-flex min-h-8 cursor-pointer items-center gap-2 rounded-xs border border-divider bg-white px-2 text-[10px] font-medium text-ink hover:bg-surfaceMuted">
                        <UploadSimple size={13} aria-hidden="true" /> Choose PDF
                        <input accept="application/pdf,.pdf" className="sr-only" onChange={(event) => void choosePdf(event.target.files?.[0] ?? null, "version")} type="file" />
                      </label>
                    </div>
                    {revisionUpload ? <p className="text-[9px] text-secondary">{revisionUpload.fileName} · scan {revisionUpload.scanStatus}</p> : null}
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className={LABEL_CLASS}>Revision label<input className={FIELD_CLASS} name="revisionLabel" placeholder="Rev B" /></label>
                      <label className={LABEL_CLASS}>Version note<input className={FIELD_CLASS} name="versionDescription" placeholder="Issued for review" /></label>
                    </div>
                    <Button className="justify-self-start" disabled={!revisionUpload || submitting} size="sm" type="submit" variant="primary">
                      <Plus size={13} aria-hidden="true" /> Add version
                    </Button>
                  </form>
                ) : null}
              </div>
            ) : (
              <div className="grid min-h-64 place-items-center text-[10px] text-tertiary">Select a file to preview it.</div>
            )}
          </div>
        </div>
      </section>

      <aside className="max-h-[48vh] w-full shrink-0 overflow-y-auto bg-white p-3 xl:max-h-none xl:w-[304px]" aria-label="Create project file">
        <form className="grid gap-3" onSubmit={createRecord}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-[11px] font-medium text-ink">New file record</h3>
              <p className="mt-1 text-[9px] leading-4 text-tertiary">PDF only. Files stay private until explicitly issued to a portal.</p>
            </div>
            {upload ? <Button aria-label="Clear selected upload" onClick={() => setUpload(null)} size="icon-xs" variant="plain"><X size={13} /></Button> : null}
          </div>
          <label className="grid min-h-24 cursor-pointer place-items-center rounded-xs border border-dashed border-dividerSibling bg-surfaceMuted p-3 text-center hover:bg-white">
            <span>
              <UploadSimple className="mx-auto text-secondary" size={18} aria-hidden="true" />
              <span className="mt-2 block text-[10px] font-medium text-ink">{upload ? upload.fileName : "Choose project PDF"}</span>
              <span className="mt-1 block text-[9px] text-tertiary">Up to 25 MB · malware scan required</span>
            </span>
            <input accept="application/pdf,.pdf" className="sr-only" onChange={(event) => void choosePdf(event.target.files?.[0] ?? null, "create")} type="file" />
          </label>
          {upload ? <p className="text-[9px] text-secondary">{formatBytes(upload.sizeBytes)} · scan {upload.scanStatus}</p> : null}
          <label className={LABEL_CLASS}>Title<input className={FIELD_CLASS} maxLength={240} name="title" required /></label>
          <label className={LABEL_CLASS}>File type
            <select className={FIELD_CLASS} defaultValue="drawing" name="artifactType">
              {PROJECT_ARTIFACT_TYPES.map((type: ProjectArtifactType) => <option key={type} value={type}>{artifactTypeLabel(type)}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className={LABEL_CLASS}>Code<input className={FIELD_CLASS} name="artifactCode" placeholder="A-101" /></label>
            <label className={LABEL_CLASS}>Discipline<input className={FIELD_CLASS} name="discipline" placeholder="Architecture" /></label>
          </div>
          <label className={LABEL_CLASS}>Description<textarea className="min-h-20 w-full resize-y rounded-xs border border-hairline bg-white p-2 text-[10px] text-ink outline-none focus:border-ink" name="description" /></label>
          <Button disabled={!upload || submitting} size="sm" type="submit" variant="primary">
            <FilePdf size={13} aria-hidden="true" /> Create file record
          </Button>
        </form>
      </aside>
    </main>
  );
}
