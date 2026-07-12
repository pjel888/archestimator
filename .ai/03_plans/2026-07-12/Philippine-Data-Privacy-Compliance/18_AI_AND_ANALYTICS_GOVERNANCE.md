# AI and Analytics Governance

## Current-state grounding

### AI

- **Provider: DeepSeek** (`src/lib/ai/deepseek.ts`); endpoint `api.deepseek.com`; default model
  `deepseek-v4-flash`; gated by `DEEPSEEK_API_KEY` + `ARCHESTIMATOR_AI_ENABLED` (currently off).
- **DeepSeek is a China-based processor** → a sensitive cross-border transfer requiring DPA,
  PIA, and data-use controls before any AI feature ships. Currently **missing from** the
  processor register (`.ai/10_state/compliance/processor-register.md` lists it only as a
  deferred future processor PR-FUT-01).
- **AI audit tables exist:** `ai_action_runs`, `ai_tool_calls`, `ai_data_access_events`
  (`0006`) — capture actor, provider, model, request hashes, redaction status, usage; plus
  `ai_package_apply_commands`, `ai_package_builder_memory_preferences`.
- **Redaction primitives exist** — `redaction_status` column, data-access event blocking.
- **AI retention is declared but NOT enforced** (365d for the three audit classes; no rule in
  `DEFAULT_RETENTION_RULES`).

### Analytics / consent / session replay

- **Consent model:** single dimension `analytics` boolean, cookie
  `archestimator_cookie_consent` (`src/lib/landing/consent.ts`); default-denied
  (`useLandingCookieConsent.ts`).
- **Analytics loader** double-gates on `consent.analytics === true` AND
  `isBetaTelemetryProductionEnabled` (`LandingAnalyticsLoader.tsx:16`).
- **Third-party processors loaded on opt-in:** Cloudflare Web Analytics, **Google Analytics 4**
  (US), **Microsoft Clarity** (US, **session replay**).
- **Beta telemetry registry** — consent-basis, permitted-surfaces, retention (180d), deletion
  behavior per metric (`src/lib/landing/beta-telemetry-registry.ts:36`).
- **Product telemetry tables:** `component_library_telemetry_events` (`0011`),
  `beta_activation_events`/`beta_activation_outbox` (`0067`), `client_portal_analytics_events`
  (`0068`).

## AI Rule

Customer data must not be used to train general models unless the customer and affected data
subjects have a valid, specific legal basis and contractually approved arrangement. Default
must be no training. DeepSeek's data-use terms must be verified and, where contractually
available, training must be prohibited at the API/account level.

## AI Inventory (per feature, before ship)

feature; provider and model; data sent; system prompt; retention; training use; region;
subprocessor; logging; output storage; user control; human review; PIA; fallback; deletion
method.

## AI Data Minimization

redact unnecessary identifiers; exclude credentials and secrets; exclude full project history
unless needed; use field-level allowlists; avoid sending uploads by default; isolate tenants;
prohibit provider-side training where contractually available; apply short retention.

## Analytics Classification (separate categories, each with purpose/basis/notice/retention)

essential operational telemetry; security telemetry; product analytics; session replay (Clarity);
marketing analytics; advertising tracking (none currently).

## Cookie Controls (gap: granularity)

Current model has **one toggle for analytics** that bundles GA4 + Clarity + Cloudflare Web
Analytics. Required: essential cookies always active; non-essential categories disabled until
permitted; separate session-replay consent (Clarity is high-sensitivity); preference storage;
withdrawal; consent versioning where consent applies; script blocking before choice; no dark
patterns.

## Prohibited Analytics

capturing passwords or tokens; unredacted session replay; recording estimate values without
clear necessity; collecting public-share visitor identity beyond declared purpose; cross-customer
behavioral profiles without approval; indefinite event retention.

## Automated Decisions

Any feature that makes or materially influences significant decisions about users must be
documented, explained, tested, and subject to human review.

## Cross-border note

GA4 (Google, US) and Clarity (Microsoft, US) are overseas processors from a Philippine
controller perspective. They need transfer records, DPAs, and ROPA entries (PA-14). DeepSeek
(CN) is the highest-risk transfer and must not go live without a completed PIA + DPA.
