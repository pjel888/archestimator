export type LegalDocumentMetadata = {
  key: string;
  title: string;
  version: string;
  effectiveDate: string;
  contentHash: `sha256:${string}`;
  privacyPolicyVersion: string;
  summary: string;
  legalReviewStatus: "closed_beta_owner_approved_pending_counsel_review";
};

export type PrivacyNoticeMetadata = {
  key: string;
  title: string;
  version: string;
  effectiveDate: string;
};

export type TermsContentSection = {
  id: string;
  title: string;
  paragraphs: readonly string[];
};

export const CURRENT_PRIVACY_NOTICE: PrivacyNoticeMetadata = {
  key: "privacy-notice",
  title: "Closed Beta Privacy Notice",
  version: "privacy-2026-06-06-beta-v1",
  effectiveDate: "2026-06-06",
};

export const TERMS_ACCEPTANCE_SUMMARY =
  "ArchEstimator is a software tool for organizing estimates, assumptions, reports, templates, calculations, exports, and design-support information. It is not a licensed professional, contractor, estimator-of-record, architect-of-record, engineer-of-record, quantity surveyor, financial adviser, legal adviser, permitting authority, code-compliance authority, or construction authority. Users remain responsible for independently reviewing, verifying, approving, and using every output and project decision.";

export const TERMS_CONTENT_SECTIONS = [
  {
    id: "intro-acceptance",
    title: "Acceptance of these Terms",
    paragraphs: [
      "These closed beta Terms of Service apply when invited professional or business users access ArchEstimator. By selecting the acceptance checkbox and continuing into the protected workshop, you agree to the version and effective date shown on this page.",
      "These Terms are designed for the invite-only closed beta and may be updated before a public or paid launch. Any future material update may require re-acceptance before protected app access continues.",
    ],
  },
  {
    id: "professional-beta-positioning",
    title: "Professional and business beta positioning",
    paragraphs: [
      "ArchEstimator is intended for invited professional, business, design, estimating, contractor, supplier, and proposal-workflow users during the closed beta. It should not be treated as a consumer DIY construction-cost authority.",
      "The current beta is no-payment and invite-only. Paid subscriptions, renewals, invoices, taxes, refunds, cancellation rights, and billing portal terms are future scope unless a separate paid plan is introduced and accepted.",
    ],
  },
  {
    id: "software-tool-only",
    title: "Software tool only; no professional role",
    paragraphs: [
      "ArchEstimator is a software tool. It is not a licensed professional, contractor, quantity surveyor, estimator-of-record, architect-of-record, engineer-of-record, financial adviser, legal adviser, permitting authority, code-compliance authority, or construction authority.",
      "ArchEstimator does not sign, seal, approve, certify, supervise, inspect, or take responsibility for construction documents, professional estimates, procurement decisions, bid submissions, contracts, permits, code compliance, safety compliance, or project execution.",
    ],
  },
  {
    id: "output-review-responsibility",
    title: "User responsibility for outputs and decisions",
    paragraphs: [
      "You remain fully responsible for independently reviewing, verifying, approving, and using any estimates, assumptions, outputs, reports, templates, calculations, material quantities, pricing guidance, schedules, design-support information, recommendations, exports, or project decisions produced with or through ArchEstimator.",
      "Before relying on any output, you must confirm the scope, quantities, measurements, specifications, supplier pricing, labor rates, taxes, permitting requirements, code compliance, local regulations, site conditions, market variability, and project assumptions with appropriate qualified professionals and current project evidence.",
    ],
  },
  {
    id: "accuracy-and-market-variability",
    title: "Accuracy, pricing, and market variability",
    paragraphs: [
      "ArchEstimator may help organize information, but it does not guarantee pricing accuracy, quantity completeness, supplier availability, labor productivity, tax treatment, schedule feasibility, permitting outcomes, local-code compliance, or final project cost.",
      "Construction and proposal outputs can change because of site conditions, specifications, logistics, currency, market rates, supplier quotations, contractor means and methods, change orders, errors, omissions, and professional judgment.",
    ],
  },
  {
    id: "beta-and-automation",
    title: "Beta, automation, and AI-assisted features",
    paragraphs: [
      "The closed beta may contain defects, incomplete features, disabled features, experimental automation, or future AI-assisted functionality. Outputs from automated or AI-assisted workflows must be treated as draft support material requiring independent human review.",
      "Do not use ArchEstimator as the sole basis for bids, contracts, budgets, procurement, financing, legal obligations, permitting, construction, safety, or professional submissions.",
    ],
  },
  {
    id: "accounts-security-use",
    title: "Accounts, security, and acceptable use",
    paragraphs: [
      "You are responsible for keeping your account, email login, devices, and access links secure. You must not share credentials, bypass closed-beta access controls, probe security without written permission, upload unlawful or harmful content, infringe others' rights, or use ArchEstimator to mislead clients, collaborators, suppliers, or public authorities.",
      "ArchEstimator may suspend, revoke, or terminate access to protect users, the service, project data, security, legal obligations, or beta operations.",
    ],
  },
  {
    id: "user-content-ip",
    title: "Project data, user content, and intellectual property",
    paragraphs: [
      "You retain responsibility for the project data, estimate content, files, assumptions, supplier information, and other content you submit. You grant ArchEstimator the limited permission needed to host, process, secure, back up, support, and improve the service during the beta.",
      "ArchEstimator and its underlying product design, software, workflows, interface, documentation, and service marks remain owned by their respective owners. These Terms do not transfer product intellectual property to users.",
    ],
  },
  {
    id: "privacy-and-records",
    title: "Privacy and acceptance records",
    paragraphs: [
      "The Privacy Notice explains how account, project, support, analytics, and operational data may be processed during the closed beta. Terms acceptance records store the accepting user id, Terms version, effective date, content hash, Privacy Notice version, acceptance method, acceptance context, and timestamp.",
      "Raw IP address and raw user-agent strings are not collected for Terms acceptance by default. Any future collection of additional metadata requires privacy review, disclosure in the Privacy Notice, and an approved retention approach.",
    ],
  },
  {
    id: "third-parties-service-availability",
    title: "Third-party services and availability",
    paragraphs: [
      "ArchEstimator may rely on hosting, authentication, database, email, analytics, browser, and integration providers. Third-party availability, outages, limits, policies, and data-processing terms can affect the service.",
      "The beta is provided on an as-is and as-available basis. ArchEstimator may change, pause, restrict, or discontinue features during the beta.",
    ],
  },
  {
    id: "warranty-liability-indemnity",
    title: "Warranty disclaimer, liability limits, and indemnity",
    paragraphs: [
      "To the maximum extent permitted by law, ArchEstimator disclaims warranties of accuracy, completeness, fitness for a particular purpose, non-infringement, uninterrupted availability, error-free operation, professional suitability, and project outcome reliability.",
      "To the maximum extent permitted by law, ArchEstimator's liability is limited according to the final lawyer-reviewed Terms approved for the applicable release. These Terms do not attempt to exclude liability where exclusion is not legally allowed, such as limits restricted by consumer law, fraud, willful misconduct, gross negligence, statutory duties, or public policy.",
      "To the maximum extent permitted by law, users are responsible for claims, losses, costs, or disputes arising from their project data, misuse of the service, breach of these Terms, unlawful conduct, or reliance on unverified outputs.",
    ],
  },
  {
    id: "governing-law-notices",
    title: "Governing law, disputes, and notices",
    paragraphs: [
      "The default closed-beta legal placeholder is the Republic of the Philippines, with venue, dispute process, arbitration or class-action waiver decisions, and final notice language subject to qualified legal counsel review before public or paid launch.",
      "For beta support, deletion requests, data export requests, or legal notices, contact support@archestimator.com unless a dedicated legal notices address is published in a later lawyer-reviewed version.",
    ],
  },
  {
    id: "changes-survival",
    title: "Changes, severability, assignment, force majeure, and survival",
    paragraphs: [
      "ArchEstimator may update these Terms for product, legal, security, beta, or launch-readiness reasons. Material changes may require authenticated users to accept the new version before continuing into protected app surfaces.",
      "If any provision is unenforceable, the remaining provisions should continue to apply to the maximum extent permitted by law. Ownership, privacy, acceptable-use, warranty disclaimer, liability, indemnity, audit-evidence, dispute, and survival provisions are intended to survive termination where legally permitted.",
    ],
  },
] as const satisfies readonly TermsContentSection[];

export const TERMS_CANONICAL_TEXT = TERMS_CONTENT_SECTIONS.map((section) => [
  `## ${section.title}`,
  ...section.paragraphs,
].join("\n\n")).join("\n\n");

export const CURRENT_TERMS: LegalDocumentMetadata = {
  key: "terms-of-service",
  title: "ArchEstimator Closed Beta Terms of Service",
  version: "tos-2026-06-06-beta-v1",
  effectiveDate: "2026-06-06",
  contentHash: "sha256:55b472ffb1aaab0ca1c3a6ddd5363f9113efec37f4007d537d61d30153102444",
  privacyPolicyVersion: CURRENT_PRIVACY_NOTICE.version,
  summary: TERMS_ACCEPTANCE_SUMMARY,
  legalReviewStatus: "closed_beta_owner_approved_pending_counsel_review",
};
