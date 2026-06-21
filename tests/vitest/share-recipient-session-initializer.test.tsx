import { render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SharePageRecipientSessionInitializer } from "@/components/share/SharePageRecipientSessionInitializer";

describe("SharePageRecipientSessionInitializer", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.cookie = "ae_publication_csrf=; Path=/; Max-Age=0";
  });

  it("shows a non-secret alert when personalized recipient session setup fails", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ error: "Invalid recipient token." }), { status: 401 }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <SharePageRecipientSessionInitializer
        recipientToken="raw-recipient-token-secret"
        token="share-token-secret"
      />,
    );

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/could not verify this personalized review link/i);
    expect(alert).toHaveTextContent(/fresh link from the project team/i);
    expect(document.body).not.toHaveTextContent("raw-recipient-token-secret");
    expect(document.body).not.toHaveTextContent("share-token-secret");

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const fetchInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    const fetchHeaders = fetchInit?.headers as Record<string, string>;

    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/share/share-token-secret/session");
    expect(fetchInit).toEqual(
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ recipientToken: "raw-recipient-token-secret" }),
        signal: expect.any(AbortSignal),
      }),
    );
    expect(fetchHeaders).toEqual(
      expect.objectContaining({
        "Content-Type": "application/json",
        "x-archestimator-csrf": expect.any(String),
      }),
    );
    expect(document.cookie).toContain(`ae_publication_csrf=${fetchHeaders["x-archestimator-csrf"]}`);
  });

  it("posts the recipient token with CSRF and uses the sanitized shared-link URL when session setup succeeds", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <SharePageRecipientSessionInitializer
        recipientToken="raw-recipient-token-secret"
        token="share token/secret?x=<script>"
      />,
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/share/share%20token%2Fsecret%3Fx%3D%3Cscript%3E/session",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ recipientToken: "raw-recipient-token-secret" }),
        signal: expect.any(AbortSignal),
      }),
    );
    const fetchInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const fetchHeaders = fetchInit.headers as Record<string, string>;
    expect(fetchHeaders).toEqual(
      expect.objectContaining({
        "Content-Type": "application/json",
        "x-archestimator-csrf": expect.any(String),
      }),
    );
    expect(document.cookie).toContain(`ae_publication_csrf=${fetchHeaders["x-archestimator-csrf"]}`);

    const source = readFileSync("src/components/share/SharePageRecipientSessionInitializer.tsx", "utf8");
    expect(source).toContain("window.location.replace(`/share/${encodeURIComponent(token)}`)");
  });
});
