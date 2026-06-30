# Cloudflare Official Pricing Snapshot

Generated: 2026-06-29T16:44:14.975Z
Pricing captured: 2026-06-30T00:00:00.000+08:00

Official Cloudflare pricing source refresh only. This does not include Archestimator monthly usage, current-provider invoices, hosted Cloudflare usage metrics, provider-dashboard receipts, or production cost approval.

## Readiness

| Gate | Ready |
| --- | --- |
| Official Cloudflare pricing refreshed | yes |
| Production cost decision ready | no |
| Required products covered | 13 |
| Required products missing |  |
| Invalid source URLs | 0 |

## Coverage

| Product | Status | Facts | Sources | Remaining Evidence Needed |
| --- | --- | ---: | --- | --- |
| Workers compute | refreshed | 3 | https://developers.cloudflare.com/workers/platform/pricing/<br>https://developers.cloudflare.com/workers/platform/limits/<br>https://www.cloudflare.com/plans/developer-platform/ | hosted Worker request and CPU metrics; route/action split between dynamic Worker execution and static asset serving |
| Workers Static Assets | refreshed | 2 | https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/<br>https://developers.cloudflare.com/workers/static-assets/ | OpenNext asset routing proof and hosted request classification |
| Workers KV | refreshed | 3 | https://developers.cloudflare.com/workers/platform/pricing/ | explicit cache-only use-case selection |
| D1 | refreshed | 3 | https://developers.cloudflare.com/d1/platform/pricing/<br>https://developers.cloudflare.com/d1/platform/limits/ | D1 query-plan proof for selected domains; restore/time-travel proof; app-layer authorization proof |
| R2 | refreshed | 4 | https://developers.cloudflare.com/r2/pricing/<br>https://www.cloudflare.com/products/r2/ | provider-backed bucket proof; direct signed/TUS replacement proof; hosted upload/read/delete/scan lifecycle proof |
| Queues | refreshed | 1 | https://developers.cloudflare.com/queues/platform/pricing/<br>https://developers.cloudflare.com/queues/platform/limits/<br>https://developers.cloudflare.com/changelog/post/2026-02-04-queues-free-plan/ | Cron/Queue hosted execution proof; retry/dead-letter proof |
| Durable Objects | refreshed | 3 | https://developers.cloudflare.com/workers/platform/pricing/<br>https://developers.cloudflare.com/durable-objects/platform/pricing/<br>https://developers.cloudflare.com/durable-objects/platform/limits/ | Durable Object realtime proof for cursors/presence; hibernation/cost proof under realistic message cadence |
| Cloudflare Images | refreshed | 3 | https://developers.cloudflare.com/images/pricing/ | paid/deployed Images binding proof; decision between Images storage, R2 storage, and hybrid transformation only |
| Email Service and Email Routing | refreshed | 3 | https://developers.cloudflare.com/email-service/<br>https://developers.cloudflare.com/email-service/platform/pricing/<br>https://developers.cloudflare.com/email-service/get-started/send-emails/ | deliverability proof; events/webhooks/bounce handling proof; Cloudflare DNS prerequisite completion |
| Turnstile | refreshed | 1 | https://developers.cloudflare.com/turnstile/plans/ | route-level Turnstile placement and false-positive proof |
| Web Analytics | refreshed | 1 | https://www.cloudflare.com/web-analytics/<br>https://developers.cloudflare.com/pages/how-to/web-analytics/ | provider dashboard receipt proof after traffic; decision on GA4/Clarity/Vercel Analytics retirement |
| Workers Logs | refreshed | 2 | https://developers.cloudflare.com/workers/observability/logs/workers-logs/<br>https://developers.cloudflare.com/workers/platform/pricing/ | hosted Workers Logs proof; sampling/retention decision |
| WAF, rate limiting, DDoS, and zone plan tier | refreshed | 3 | https://www.cloudflare.com/plans/<br>https://developers.cloudflare.com/waf/<br>https://developers.cloudflare.com/waf/get-started/<br>https://developers.cloudflare.com/waf/managed-rules/<br>https://developers.cloudflare.com/waf/custom-rules/<br>https://developers.cloudflare.com/waf/rate-limiting-rules/ | dashboard rule quota confirmation on selected plan; WAF/rate-limit dry-run or preview proof; DNS/nameserver migration proof before relying on zone-level controls |

## Pricing Facts

| Product | Metric | Free Allowance | Paid Allowance | Overage | Unit | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Workers compute | Workers Paid plan minimum | Free plan available | $5 USD/month minimum account charge | Usage over included allotments is metered by product | account/month | Workers Paid is the minimum practical target for production migration because this project needs higher limits, production deploys, and paid-only features. |
| Workers compute | Dynamic Worker requests | 100,000 requests/day | 10 million requests/month included | $0.30 per additional million requests | inbound Worker requests | Cloudflare states subrequests made from a Worker are not billed as Worker requests; WebSocket upgrades count as requests. |
| Workers compute | Worker CPU | Free-plan CPU allowance not used for production modeling in this snapshot | 30 million CPU milliseconds/month included | $0.02 per additional million CPU milliseconds | CPU milliseconds | Requires hosted Worker CPU evidence per route/action before cost decisions. |
| Workers Static Assets | Static asset requests | Free and unlimited | Free and unlimited | None listed for static asset requests | static asset requests | Requests that invoke the Worker script, including SSR paths, are billed according to Workers pricing. |
| Workers Static Assets | Static asset storage | No additional asset storage cost listed | No additional asset storage cost listed | None listed for asset storage | asset storage | If assets.run_worker_first makes matching requests invoke the Worker, those requests follow Worker request limits and billing. |
| Workers KV | KV reads | 100,000/day | 10 million/month included | $0.50 per million reads | read requests | Use only for safe cache/config patterns; do not model KV as a strong-consistency database replacement. |
| Workers KV | KV writes, deletes, and lists | 1,000/day for each operation class | 1 million/month included for each operation class | $5.00 per million writes/deletes/lists | write/delete/list requests | Hot-key and consistency constraints must be modeled separately from cost. |
| Workers KV | KV stored data | 1 GB | 1 GB included | $0.50 per GB-month | GB-month | Storage cost does not prove suitability for authorization, counters, or transactional state. |
| D1 | Rows read | 5 million/day | first 25 billion/month included | $0.001 per million rows | rows read | Requires query plans/indexing proof because row reads are not the same as request counts. |
| D1 | Rows written | 100,000/day | first 50 million/month included | $1.00 per million rows | rows written | Mutations, triggers, deletes, and D1 replacement workflows need row-write estimates. |
| D1 | Storage | 5 GB total | first 5 GB included | $0.75 per GB-month | GB-month | D1 is a redesign target, not a direct Postgres/RLS/RPC port. |
| R2 | Standard storage | 10 GB-month/month | $0.015 per GB-month | $0.015 per GB-month | GB-month | Free tier applies to Standard storage, not Infrequent Access storage. |
| R2 | Standard Class A operations | 1 million/month | $4.50 per million requests | $4.50 per million requests | creates/lists/uploads/lifecycle-like operations | Map uploads, multipart/TUS replacements, lifecycle, and list paths. |
| R2 | Standard Class B operations | 10 million/month | $0.36 per million requests | $0.36 per million requests | reads/download/head-like operations | Private app-brokered reads and scan jobs can make Class B operations material. |
| R2 | Internet egress | Free | Free | No egress charge listed | data transfer to Internet | Egress benefit does not remove Class A/Class B operation costs. |
| Queues | Queue operations | 10,000 operations/day | Metered paid operations | $0.40 per million operations | 64 KB write/read/delete operation units | An operation is counted for each 64 KB of data written, read, or deleted; retries can amplify operation count. |
| Durable Objects | Compute requests | 100,000/day | 1 million/month included | $0.15 per million requests | HTTP requests, RPC sessions, WebSocket messages, alarm invocations | WebSocket message billing uses documented ratios for billing while metrics reflect actual usage. |
| Durable Objects | Compute duration | 13,000 GB-s/day | 400,000 GB-s/month included | $12.50 per million GB-s | GB-seconds | Duration is wall-clock while active or idle but unable to hibernate; WebSocket hibernation is central to realtime cost. |
| Durable Objects | SQLite-backed storage | 5 GB total | 5 GB-month included | $0.20 per GB-month plus D1-like row read/write billing | GB-month plus rows | Storage billing applies until data is removed; each SQLite-backed object is limited separately. |
| Cloudflare Images | Images Transformed | first 5,000 unique transformations included on Images Paid | $0.50 per 1,000 unique transformations/month after included amount | $0.50 per 1,000 unique transformations/month | unique transformations/month | If optimizing images stored outside Images, billing is for transformations only. |
| Cloudflare Images | Images Stored | No free storage amount captured in this snapshot | $5 per 100,000 images stored/month | $5 per 100,000 images stored/month | images stored/month | Only relevant if using Cloudflare Images storage instead of R2/origin storage. |
| Cloudflare Images | Images Delivered | No free delivery amount captured in this snapshot | $1 per 100,000 images delivered/month | $1 per 100,000 images delivered/month | images delivered/month | Delivery counts need hosted proof for thumbnails, attachments, and public project images. |
| Email Service and Email Routing | Outbound arbitrary-recipient email | Not available on Workers Free | 3,000 outbound emails/month included on Workers Paid | $0.35 per 1,000 emails | outbound emails | Sending to arbitrary recipients requires Workers Paid and Cloudflare DNS. |
| Email Service and Email Routing | Verified-destination sending | Free on all plans | Free on all plans | No paid overage captured | emails to verified destination addresses | Not equivalent to Resend transactional arbitrary-recipient workflows. |
| Email Service and Email Routing | Inbound Email Routing | Unlimited inbound routing | Unlimited inbound routing | No paid overage captured | inbound emails | Inbound routing does not prove outbound deliverability, events/webhooks, bounces, retries, or analytics. |
| Turnstile | Plan availability | Free plan available for most production applications | Enterprise plan for advanced/large-account requirements | Enterprise pricing not publicly fixed in this snapshot | Turnstile sites/widgets/account requirements | Model widget/hostname/account needs and false-positive review, not only challenge count. |
| Web Analytics | Web Analytics | Free website analytics | Free website analytics | No paid overage captured | web analytics property | Privacy-first analytics can be enabled without changing DNS or using Cloudflare proxy, but receipt/metrics proof is still required. |
| Workers Logs | Free-plan log events | 200,000 log events/day | Paid plan has monthly included events | Free plan overage not modeled | log events written | Free retention captured by docs is short-lived and not a production observability replacement by itself. |
| Workers Logs | Paid-plan log events | N/A | 20 million/month included | $0.60 per additional million log events | log events written | Retention and sampling settings must be part of the cost model. |
| WAF, rate limiting, DDoS, and zone plan tier | Self-serve zone plans | $0/month Free | Pro: $20/month annually or $25/month monthly; Business: $200/month annually or $250/month monthly; Enterprise: sales-led | Plan-dependent add-ons and Enterprise pricing are not fixed in this snapshot | zone/month | The current dashboard proof shows archestimator.com on Free; production security requirements may require a paid zone plan. |
| WAF, rate limiting, DDoS, and zone plan tier | WAF availability | WAF available on all plans with Free Managed Ruleset | Managed rulesets expand on Pro/Business/Enterprise | Feature availability varies by plan | zone rulesets | Cloudflare Managed Ruleset and OWASP Core Ruleset availability starts at Pro in the captured docs. |
| WAF, rate limiting, DDoS, and zone plan tier | Custom WAF rules | 5 zone-level custom rules | Pro: 20; Business: 100; Enterprise: 1,000 | Account-level custom rulesets require Enterprise | zone custom rules | Rate limiting rules use the Ruleset Engine and must be modeled with the chosen plan's rule budget. |
