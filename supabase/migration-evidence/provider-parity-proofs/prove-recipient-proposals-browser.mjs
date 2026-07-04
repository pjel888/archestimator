import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { createCipheriv, createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const repoRoot = process.cwd();
const expectedProjectRef = "ebxxqidacheyapmmzavr";
const artifactRoot = resolve(repoRoot, ".omx/artifacts/recipient-proposals-page");
const stamp = new Date().toISOString().replaceAll(":", "").replace(/\.\d{3}Z$/, "Z");
const artifactDir = join(artifactRoot, `recipient-proposals-browser-${stamp}`);
const externalBaseUrl = process.env.RECIPIENT_PROPOSALS_PROOF_BASE_URL;
const requestedServerMode = process.env.RECIPIENT_PROPOSALS_PROOF_SERVER_MODE;
const serverMode = externalBaseUrl ? "external" : requestedServerMode ?? "dev";

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) return null;
  const index = trimmed.indexOf("=");
  const key = trimmed.slice(0, index).trim();
  let value = trimmed.slice(index + 1).trim();
  if (!/^[A-Z0-9_]+$/.test(key)) return null;
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return [key, value.replace(/\s+#.*$/, "").trim()];
}

async function readLocalEnv() {
  const result = {};
  for (const name of [".env", ".env.local", ".env.development", ".env.development.local", ".env.production.local"]) {
    const file = resolve(repoRoot, name);
    if (!existsSync(file)) continue;
    const text = await readFile(file, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const parsed = parseEnvLine(line);
      if (!parsed) continue;
      const [key, value] = parsed;
      if (result[key] === undefined && process.env[key] === undefined) result[key] = value;
    }
  }
  return result;
}

function projectRefFromUrl(url) {
  try {
    const hostname = new URL(url).hostname;
    if (!hostname.endsWith(".supabase.co")) return "";
    return hostname.split(".")[0] ?? "";
  } catch {
    return "";
  }
}

function sanitizedSupabaseUrl(url) {
  const projectRef = projectRefFromUrl(url);
  return projectRef ? `https://${projectRef}.supabase.co` : "invalid-supabase-url";
}

function redactEnvPresence(env, keys) {
  return Object.fromEntries(keys.map((key) => [key, Boolean(env[key]?.trim())]));
}

async function getFreePort() {
  const server = createServer();
  await new Promise((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolvePromise);
  });
  const address = server.address();
  await new Promise((resolvePromise) => server.close(resolvePromise));
  if (!address || typeof address === "string") throw new Error("Could not allocate a local proof port.");
  return address.port;
}

async function waitForServer(baseUrl, child, label) {
  const deadline = Date.now() + 120_000;
  let lastError = null;
  while (Date.now() < deadline) {
    if (child?.exitCode !== null && child?.exitCode !== undefined) {
      const tail = child.logs?.join("").split(/\r?\n/).slice(-80).join("\n");
      throw new Error(`${label} server exited early with code ${child.exitCode}.${tail ? `\n${tail}` : ""}`);
    }
    try {
      const response = await fetch(baseUrl, { redirect: "manual" });
      if (response.status < 500) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 750));
  }
  throw new Error(`Timed out waiting for ${baseUrl}: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

async function startServer(env, mode) {
  if (mode === "external") return { baseUrl: externalBaseUrl.replace(/\/$/, ""), child: null, owned: false, mode, logs: [] };

  if (mode !== "dev" && mode !== "start") {
    throw new Error(`Unsupported proof server mode: ${mode}`);
  }
  if (mode === "start" && !existsSync(resolve(repoRoot, ".next/BUILD_ID"))) {
    throw new Error("Production proof requires an existing .next build. Run `bun run build` first.");
  }

  const port = await getFreePort();
  const childEnv = {
    ...process.env,
    ...env,
    PORT: String(port),
    NEXT_PUBLIC_PROJECT_LOCATION_MAP_ENABLED: process.env.NEXT_PUBLIC_PROJECT_LOCATION_MAP_ENABLED ?? "0",
    NODE_ENV: mode === "dev" ? "development" : "production",
  };
  const command = mode === "dev"
    ? ["run", "dev", "--", "-p", String(port), "-H", "127.0.0.1"]
    : ["run", "start", "--", "-p", String(port), "-H", "127.0.0.1"];
  const child = spawn("bun", command, {
    cwd: repoRoot,
    env: childEnv,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const logs = [];
  child.stdout.on("data", (chunk) => logs.push(chunk.toString()));
  child.stderr.on("data", (chunk) => logs.push(chunk.toString()));
  child.logs = logs;
  const baseUrl = `http://127.0.0.1:${port}`;
  await waitForServer(baseUrl, child, mode === "dev" ? "Next dev" : "Next start");
  return { baseUrl, child, owned: true, mode, logs };
}

function createCookieChunks(key, value, chunkSize = 3180) {
  const encodedValue = encodeURIComponent(value);
  if (encodedValue.length <= chunkSize) return [{ name: key, value }];

  const chunks = [];
  let remaining = encodedValue;
  while (remaining.length > 0) {
    let encodedHead = remaining.slice(0, chunkSize);
    const lastEscapePos = encodedHead.lastIndexOf("%");
    if (lastEscapePos > chunkSize - 3) encodedHead = encodedHead.slice(0, lastEscapePos);

    let head = "";
    while (encodedHead.length > 0) {
      try {
        head = decodeURIComponent(encodedHead);
        break;
      } catch (error) {
        if (error instanceof URIError && encodedHead.at(-3) === "%" && encodedHead.length > 3) {
          encodedHead = encodedHead.slice(0, encodedHead.length - 3);
        } else {
          throw error;
        }
      }
    }
    chunks.push(head);
    remaining = remaining.slice(encodedHead.length);
  }
  return chunks.map((valuePart, index) => ({ name: `${key}.${index}`, value: valuePart }));
}

function storageCookiesForSession({ baseUrl, supabaseUrl, session }) {
  const projectRef = projectRefFromUrl(supabaseUrl);
  const storageKey = `sb-${projectRef}-auth-token`;
  const encodedSession = `base64-${Buffer.from(JSON.stringify(session), "utf8").toString("base64url")}`;
  return createCookieChunks(storageKey, encodedSession).map((cookie) => ({
    name: cookie.name,
    value: cookie.value,
    url: baseUrl,
    sameSite: "Lax",
    httpOnly: false,
    secure: false,
    expires: Math.floor(Date.now() / 1000) + 60 * 60,
  }));
}

function createServiceClient(env) {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { "X-Client-Info": "archestimator-recipient-proposals-browser-proof" } },
  });
}

function toBase64Url(buffer) {
  return buffer.toString("base64url");
}

function deriveKey(secret) {
  return createHash("sha256").update(secret).digest();
}

function readPublicationTokenEncryptionSecret(env) {
  return env.PUBLICATION_TOKEN_ENCRYPTION_SECRET?.trim()
    || env.ARCHESTIMATOR_PUBLICATION_TOKEN_SECRET?.trim()
    || "archestimator-local-publication-token-secret";
}

function readPublicationTokenHashSecret(env) {
  return env.PUBLICATION_TOKEN_HASH_SECRET?.trim()
    || env.ARCHESTIMATOR_PUBLICATION_TOKEN_HASH_SECRET?.trim()
    || "archestimator-local-publication-hash-secret";
}

function createPublicationToken() {
  return toBase64Url(randomBytes(32));
}

function hashPublicationToken(token, secret) {
  const digest = createHmac("sha256", secret).update(token).digest();
  return `hmac-sha256-v1:${toBase64Url(digest)}`;
}

function encryptPublicationToken(token, secret) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `aes-256-gcm-v1:${toBase64Url(iv)}:${toBase64Url(tag)}:${toBase64Url(encrypted)}`;
}

function createAnonClient(env) {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { "X-Client-Info": "archestimator-recipient-proposals-browser-proof" } },
  });
}

async function createOwnerSession(env) {
  const email = env.ARCHESTIMATOR_DEV_AUTH_EMAIL?.trim();
  if (!email) throw new Error("ARCHESTIMATOR_DEV_AUTH_EMAIL is required for recipient proposal browser proof.");
  const serviceClient = createServiceClient(env);
  const { data, error } = await serviceClient.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw new Error(`Owner magic-link generation failed: ${error.message}`);

  const properties = data.properties ?? {};
  const anonClient = createAnonClient(env);
  const { data: verified, error: verifyError } = properties.email_otp
    ? await anonClient.auth.verifyOtp({ email, token: properties.email_otp, type: "email" })
    : properties.hashed_token
      ? await anonClient.auth.verifyOtp({ token_hash: properties.hashed_token, type: "magiclink" })
      : (() => {
          throw new Error("Supabase did not return a magic-link token for the owner session.");
        })();

  if (verifyError) throw new Error(`Owner magic-link verification failed: ${verifyError.message}`);
  if (!verified.session) throw new Error("Supabase did not return an owner session.");
  return { email, session: verified.session };
}

function createProofRecipientHash() {
  return createHash("sha256").update(`recipient-proposals-browser-proof:${randomUUID()}`).digest("hex");
}

async function findActivePublicationCandidate(serviceClient, recipientEmail) {
  const { data: candidates, error } = await serviceClient
    .from("project_publications")
    .select("id, project_id, workspace_id, published_at, snapshot_version, status, expires_at, revoked_at")
    .eq("status", "published")
    .is("revoked_at", null)
    .not("encrypted_token", "is", null)
    .order("published_at", { ascending: false })
    .limit(20);

  if (error) throw new Error(`Publication candidate lookup failed: ${error.message}`);

  const now = Date.now();
  for (const publication of candidates ?? []) {
    if (publication.expires_at && Date.parse(publication.expires_at) <= now) continue;

    const existingRecipient = await serviceClient
      .from("shared_link_recipients")
      .select("id, email")
      .eq("publication_id", publication.id)
      .ilike("email", recipientEmail)
      .limit(1)
      .maybeSingle();
    if (existingRecipient.error) {
      throw new Error(`Recipient candidate lookup failed: ${existingRecipient.error.message}`);
    }

    return {
      publication,
      existingRecipient: existingRecipient.data ?? null,
    };
  }

  return null;
}

async function readProjectName(serviceClient, projectId) {
  const { data, error } = await serviceClient
    .from("projects")
    .select("name")
    .eq("id", projectId)
    .maybeSingle();
  if (error) throw new Error(`Project lookup failed: ${error.message}`);
  return data?.name ?? null;
}

function buildProofSnapshot(project) {
  const generatedAt = new Date().toISOString();
  return {
    schemaVersion: 1,
    generatedAt,
    project: {
      id: project.id,
      name: project.name,
      projectCode: project.project_code,
      clientName: project.client_name,
      location: null,
      locationVisibility: "hidden",
      currencyCode: project.currency_code,
      coverImageUrl: null,
    },
    estimateCount: 0,
    rowCount: 0,
    totalCost: 0,
    estimates: [],
  };
}

async function readOwnerProfileId(serviceClient, recipientEmail) {
  const { data, error } = await serviceClient
    .from("profiles")
    .select("id")
    .ilike("email", recipientEmail)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Owner profile lookup failed: ${error.message}`);
  return data?.id ?? null;
}

async function createTemporaryPublicationFixture(serviceClient, env, recipientEmail) {
  const suffix = randomUUID().slice(0, 8);
  const now = new Date().toISOString();
  const ownerProfileId = await readOwnerProfileId(serviceClient, recipientEmail);
  const workspaceResult = await serviceClient
    .from("workspaces")
    .insert({
      name: `Recipient Proposals Proof ${suffix}`,
      slug: `recipient-proposals-proof-${Date.now()}-${suffix}`,
      created_by: ownerProfileId,
    })
    .select("id, name")
    .single();

  if (workspaceResult.error) {
    throw new Error(`Temporary workspace fixture insert failed: ${workspaceResult.error.message}`);
  }

  const projectResult = await serviceClient
    .from("projects")
    .insert({
      workspace_id: workspaceResult.data.id,
      name: "Recipient Proposal Browser Proof",
      client_name: "Proof Client",
      project_code: `RPP-${suffix.toUpperCase()}`,
      currency_code: "PHP",
      location: null,
      created_by: ownerProfileId,
      metadata: {
        proof: "recipient-proposals-browser",
        generatedAt: now,
      },
    })
    .select("id, workspace_id, name, project_code, client_name, currency_code")
    .single();

  if (projectResult.error) {
    await serviceClient.from("workspaces").delete().eq("id", workspaceResult.data.id);
    throw new Error(`Temporary project fixture insert failed: ${projectResult.error.message}`);
  }

  const token = createPublicationToken();
  const snapshot = buildProofSnapshot(projectResult.data);
  const publicationResult = await serviceClient
    .from("project_publications")
    .insert({
      workspace_id: workspaceResult.data.id,
      project_id: projectResult.data.id,
      token_hash: hashPublicationToken(token, readPublicationTokenHashSecret(env)),
      encrypted_token: encryptPublicationToken(token, readPublicationTokenEncryptionSecret(env)),
      password_hash: null,
      status: "published",
      snapshot_version: 1,
      selected_estimate_ids: [],
      snapshot_json: snapshot,
      published_by: ownerProfileId,
      published_at: now,
      expires_at: null,
      revoked_at: null,
      location_visibility: "hidden",
    })
    .select("id, project_id, workspace_id, published_at, snapshot_version, status, expires_at, revoked_at")
    .single();

  if (publicationResult.error) {
    await serviceClient.from("workspaces").delete().eq("id", workspaceResult.data.id);
    throw new Error(`Temporary publication fixture insert failed: ${publicationResult.error.message}`);
  }

  const recipientResult = await serviceClient
    .from("shared_link_recipients")
    .insert({
      publication_id: publicationResult.data.id,
      email: recipientEmail,
      display_name: "Recipient proposals browser proof",
      recipient_token_hash: createProofRecipientHash(),
      delivery_status: "sent",
      invited_by: ownerProfileId,
    })
    .select("id")
    .single();

  if (recipientResult.error) {
    await serviceClient.from("workspaces").delete().eq("id", workspaceResult.data.id);
    throw new Error(`Temporary recipient fixture insert failed: ${recipientResult.error.message}`);
  }

  return {
    createdRecipientId: recipientResult.data.id,
    createdPublicationId: publicationResult.data.id,
    createdProjectId: projectResult.data.id,
    createdWorkspaceId: workspaceResult.data.id,
    recipientId: recipientResult.data.id,
    publication: publicationResult.data,
    projectName: projectResult.data.name,
    workspaceName: workspaceResult.data.name,
    fixtureStrategy: "temporary-publication",
  };
}

async function ensureRecipientFixture(serviceClient, env, recipientEmail) {
  const candidate = await findActivePublicationCandidate(serviceClient, recipientEmail);
  if (!candidate) return createTemporaryPublicationFixture(serviceClient, env, recipientEmail);

  const projectName = await readProjectName(serviceClient, candidate.publication.project_id);
  if (candidate.existingRecipient?.id) {
    return {
      createdRecipientId: null,
      createdPublicationId: null,
      createdProjectId: null,
      createdWorkspaceId: null,
      recipientId: candidate.existingRecipient.id,
      publication: candidate.publication,
      projectName,
      workspaceName: null,
      fixtureStrategy: "existing-recipient",
    };
  }

  const { data, error } = await serviceClient
    .from("shared_link_recipients")
    .insert({
      publication_id: candidate.publication.id,
      email: recipientEmail,
      display_name: "Recipient proposals browser proof",
      recipient_token_hash: createProofRecipientHash(),
      delivery_status: "sent",
    })
    .select("id")
    .single();

  if (error) throw new Error(`Temporary recipient fixture insert failed: ${error.message}`);
  return {
    createdRecipientId: data.id,
    createdPublicationId: null,
    createdProjectId: null,
    createdWorkspaceId: null,
    recipientId: data.id,
    publication: candidate.publication,
    projectName,
    workspaceName: null,
    fixtureStrategy: "temporary-recipient",
  };
}

async function cleanupRecipientFixture(serviceClient, fixture) {
  if (!fixture) return { deletedTemporaryRecipient: false, deletedTemporaryWorkspace: false, cleanupErrors: [] };

  if (fixture.createdWorkspaceId) {
    const { error } = await serviceClient
      .from("workspaces")
      .delete()
      .eq("id", fixture.createdWorkspaceId);
    return {
      deletedTemporaryRecipient: !error,
      deletedTemporaryWorkspace: !error,
      cleanupErrors: error ? [error.message] : [],
    };
  }

  if (!fixture.createdRecipientId) return { deletedTemporaryRecipient: false, deletedTemporaryWorkspace: false, cleanupErrors: [] };

  const { error } = await serviceClient
    .from("shared_link_recipients")
    .delete()
    .eq("id", fixture.createdRecipientId);
  return {
    deletedTemporaryRecipient: !error,
    deletedTemporaryWorkspace: false,
    cleanupErrors: error ? [error.message] : [],
  };
}

async function collectProposalMetrics(page) {
  return page.evaluate(() => {
    const bodyText = document.body.innerText;
    const rows = Array.from(document.querySelectorAll("article")).map((element) => element.textContent?.replace(/\s+/g, " ").trim() ?? "");
    const buttons = Array.from(document.querySelectorAll("button")).map((element) => element.textContent?.replace(/\s+/g, " ").trim() ?? "");
    return {
      title: document.title,
      pathname: window.location.pathname,
      hasHeading: bodyText.includes("Proposals"),
      hasRecipientList: bodyText.includes("Recipient proposals"),
      hasReviewButton: buttons.includes("Review"),
      rowSamples: rows.slice(0, 5),
    };
  });
}

async function collectShareMetrics(page, expectedProjectName) {
  return page.evaluate((projectName) => {
    const bodyText = document.body.innerText;
    const redactVisibleSample = (value) => value.replaceAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]");
    const mainLabels = Array.from(document.querySelectorAll("main"))
      .map((element) => element.getAttribute("aria-label"))
      .filter(Boolean);
    return {
      mainLabels,
      bodyTextSample: redactVisibleSample(bodyText.slice(0, 500)),
      hasExpectedProjectName: bodyText.includes(projectName),
      hasProposalTotal: bodyText.includes("Proposal total"),
      hasNoEstimatesState: bodyText.includes("No estimates are included in this shared proposal yet"),
      hasPasswordGateText: bodyText.includes("Enter proposal password"),
      hasShareFooter: bodyText.includes("Shared via Archestimator"),
    };
  }, expectedProjectName);
}

function didSharePageRender(metrics) {
  return (
    metrics.mainLabels.includes("Proposal review") ||
    metrics.mainLabels.includes("Proposal review password") ||
    metrics.hasExpectedProjectName ||
    metrics.hasProposalTotal ||
    metrics.hasNoEstimatesState ||
    metrics.hasPasswordGateText ||
    metrics.hasShareFooter
  );
}

async function proveRecipientProposalFlow({ baseUrl, env, fixture }) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  try {
    const { session } = await createOwnerSession(env);
    await context.addCookies(storageCookiesForSession({
      baseUrl,
      supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
      session,
    }));

    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    const response = await page.goto(`${baseUrl}/workshop/proposals`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => undefined);
    await page.getByRole("heading", { name: "Proposals", exact: true }).first().waitFor({ state: "visible", timeout: 30_000 });

    if (fixture.projectName) {
      await page.getByText(fixture.projectName, { exact: false }).first().waitFor({ state: "visible", timeout: 30_000 });
    }
    const reviewButton = page.getByRole("button", { name: "Review" }).first();
    await reviewButton.waitFor({ state: "visible", timeout: 30_000 });
    const beforeMetrics = await collectProposalMetrics(page);

    await reviewButton.click();
    await page.waitForURL((url) => url.pathname.startsWith("/share/"), { timeout: 30_000 });
    await page.waitForLoadState("domcontentloaded", { timeout: 30_000 }).catch(() => undefined);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => undefined);
    await page.locator("main").first().waitFor({ state: "visible", timeout: 30_000 });

    const shareUrl = new URL(page.url());
    const clientTransitionShareMetrics = await collectShareMetrics(page, fixture.projectName);
    let shareMetrics = clientTransitionShareMetrics;
    let reloadedAfterActionRedirect = false;
    if (!didSharePageRender(clientTransitionShareMetrics)) {
      reloadedAfterActionRedirect = true;
      await page.goto(page.url(), { waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => undefined);
      await page.locator("main").first().waitFor({ state: "visible", timeout: 30_000 });
      shareMetrics = await collectShareMetrics(page, fixture.projectName);
    }
    const cookies = await context.cookies(baseUrl);
    const sessionCookies = cookies.filter((cookie) => cookie.name.startsWith("shared_link_session_"));
    const secretSessionCookie = sessionCookies.find((cookie) => !cookie.name.endsWith("_ok"));
    const okCookie = secretSessionCookie
      ? sessionCookies.find((cookie) => cookie.name === `${secretSessionCookie.name}_ok`)
      : null;

    await page.close();

    return {
      routeStatus: response?.status() ?? null,
      beforeMetrics,
      finalPathname: shareUrl.pathname.replace(/\/share\/.+$/, "/share/[token]"),
      landedOnShareRoute: shareUrl.pathname.startsWith("/share/"),
      reloadedAfterActionRedirect,
      clientTransitionShareMetrics,
      shareMetrics,
      sharePageRendered: didSharePageRender(shareMetrics),
      cookieProof: {
        hasHttpOnlySessionCookie: Boolean(secretSessionCookie?.httpOnly),
        hasClientOkCookie: Boolean(okCookie),
        sessionCookieSecure: secretSessionCookie?.secure ?? null,
        okCookieHttpOnly: okCookie?.httpOnly ?? null,
      },
      consoleErrorCount: consoleErrors.length,
      pageErrorCount: pageErrors.length,
    };
  } finally {
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
}

function readServerLogTail(server, lineCount = 120) {
  return server?.logs
    ?.join("")
    .replaceAll(/\/share\/[A-Za-z0-9_-]+/g, "/share/[token]")
    .split(/\r?\n/)
    .slice(-lineCount)
    .join("\n") ?? null;
}

async function writeJson(name, value) {
  await writeFile(join(artifactDir, name), `${JSON.stringify(value, null, 2)}\n`);
}

await mkdir(artifactDir, { recursive: true });

const localEnv = await readLocalEnv();
const effectiveEnv = { ...localEnv, ...process.env };
const requiredKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ARCHESTIMATOR_DEV_AUTH_EMAIL",
];
const envPresence = redactEnvPresence(effectiveEnv, requiredKeys);
const missingKeys = requiredKeys.filter((key) => !effectiveEnv[key]?.trim());
const projectRef = projectRefFromUrl(effectiveEnv.NEXT_PUBLIC_SUPABASE_URL ?? "");

if (missingKeys.length > 0) {
  const blocker = {
    proof: "recipient_proposals_browser",
    status: "blocked",
    generatedAt: new Date().toISOString(),
    routePath: "/workshop/proposals",
    artifactDir,
    envPresence,
    blocker: `Missing local env keys required for provider-backed browser proof: ${missingKeys.join(", ")}`,
  };
  await writeJson("recipient-proposals-browser-blocker.json", blocker);
  console.error(JSON.stringify(blocker, null, 2));
  process.exit(1);
}

if (projectRef !== expectedProjectRef) {
  const blocker = {
    proof: "recipient_proposals_browser",
    status: "blocked",
    generatedAt: new Date().toISOString(),
    routePath: "/workshop/proposals",
    artifactDir,
    envPresence,
    blocker: "Refusing provider-backed proof for unexpected Supabase project.",
    expectedProjectRef,
    projectRef: projectRef || null,
    projectUrl: sanitizedSupabaseUrl(effectiveEnv.NEXT_PUBLIC_SUPABASE_URL),
  };
  await writeJson("recipient-proposals-browser-blocker.json", blocker);
  console.error(JSON.stringify(blocker, null, 2));
  process.exit(1);
}

let server = null;
let serviceClient = null;
let fixture = null;

try {
  serviceClient = createServiceClient(effectiveEnv);
  fixture = await ensureRecipientFixture(serviceClient, effectiveEnv, effectiveEnv.ARCHESTIMATOR_DEV_AUTH_EMAIL.trim());
  server = await startServer(localEnv, serverMode);
  const browserProof = await proveRecipientProposalFlow({
    baseUrl: server.baseUrl,
    env: effectiveEnv,
    fixture,
  });
  const cleanup = await cleanupRecipientFixture(serviceClient, fixture);
  const failures = [];

  if (browserProof.routeStatus !== 200) failures.push(`route status was ${browserProof.routeStatus}`);
  if (!browserProof.beforeMetrics.hasHeading) failures.push("Proposals heading was not visible");
  if (!browserProof.beforeMetrics.hasRecipientList) failures.push("Recipient proposals list was not visible");
  if (!browserProof.beforeMetrics.hasReviewButton) failures.push("Review button was not visible");
  if (!browserProof.landedOnShareRoute) failures.push("Review did not redirect to /share/[token]");
  if (!browserProof.sharePageRendered) failures.push("Share page did not render an expected review/password surface");
  if (!browserProof.cookieProof.hasHttpOnlySessionCookie) failures.push("HttpOnly shared-link session cookie was not set");
  if (!browserProof.cookieProof.hasClientOkCookie) failures.push("Client-visible shared-link session _ok cookie was not set");
  if (browserProof.pageErrorCount > 0) failures.push(`browser page errors: ${browserProof.pageErrorCount}`);
  if (cleanup.cleanupErrors.length > 0) failures.push(`temporary fixture cleanup failed: ${cleanup.cleanupErrors.join("; ")}`);

  const report = {
    proof: "recipient_proposals_browser",
    status: failures.length > 0 ? "failed" : "passed",
    generatedAt: new Date().toISOString(),
    routePath: "/workshop/proposals",
    finalPathname: browserProof.finalPathname,
    artifactDir,
    serverMode: server.mode,
    serverOwnedByScript: server.owned,
    envPresence,
    fixture: {
      strategy: fixture.fixtureStrategy,
      publicationId: fixture.publication.id,
      projectId: fixture.publication.project_id,
      workspaceId: fixture.publication.workspace_id,
      recipientId: fixture.recipientId,
      createdTemporaryRecipient: Boolean(fixture.createdRecipientId),
      createdTemporaryPublication: Boolean(fixture.createdPublicationId),
      createdTemporaryProject: Boolean(fixture.createdProjectId),
      createdTemporaryWorkspace: Boolean(fixture.createdWorkspaceId),
      projectName: fixture.projectName,
      workspaceName: fixture.workspaceName,
    },
    assertions: [
      "authenticated owner email is added or reused as a shared-link recipient",
      "recipient proposals route renders the proposal list and Review action",
      "Review submits the recipient authorization server action",
      "server action sets the HttpOnly shared-link session cookie and non-secret _ok companion",
      "server action redirects to /share/[token] without exposing token or cookie values in the artifact",
      "temporary provider fixture is deleted after proof when created by this script",
    ],
    browserProof,
    cleanup,
    failures,
    serverLogTail: readServerLogTail(server),
  };
  await writeJson("recipient-proposals-browser-proof.json", report);
  if (report.status !== "passed") {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify(report, null, 2));
  }
} catch (error) {
  const cleanup = serviceClient && fixture
    ? await cleanupRecipientFixture(serviceClient, fixture).catch((cleanupError) => ({
        deletedTemporaryRecipient: false,
        cleanupErrors: [cleanupError instanceof Error ? cleanupError.message : String(cleanupError)],
      }))
    : null;
  const blocker = {
    proof: "recipient_proposals_browser",
    status: "blocked",
    generatedAt: new Date().toISOString(),
    routePath: "/workshop/proposals",
    artifactDir,
    envPresence,
    blocker: error instanceof Error ? error.message : String(error),
    cleanup,
    serverMode,
    serverLogTail: readServerLogTail(server, 100),
  };
  await writeJson("recipient-proposals-browser-blocker.json", blocker);
  console.error(JSON.stringify(blocker, null, 2));
  process.exitCode = 1;
} finally {
  if (server?.child && server.owned) {
    server.child.kill("SIGTERM");
    await new Promise((resolvePromise) => {
      const timeout = setTimeout(resolvePromise, 2_000);
      server.child.once("exit", () => {
        clearTimeout(timeout);
        resolvePromise();
      });
    });
  }
}
