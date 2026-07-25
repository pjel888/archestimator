@critical @smoke @api @REQ-CACHE-001 @REQ-PRIVACY-001
Feature: Public cache performance never crosses the shared-proposal privacy boundary
  Public marketing pages may be cached at the edge, while client proposal and
  authentication-recovery responses must remain private and non-cacheable.

  Rule: Only exact marketing routes receive shared edge caching

    @happy
    Scenario: A visitor opens the public landing page
      Given a public visitor requests "/"
      When the edge request policy is applied
      Then the response is cacheable at the edge
      And the response is not marked private

    @boundary
    Scenario: The exact shared-proposal root stays inside the privacy boundary
      Given a public visitor requests "/share"
      When the edge request policy is applied
      Then the response is private and non-cacheable
      And the response is not cacheable at the edge

  Rule: Sensitive routes fail closed and provide a safe recovery path

    @denial
    Scenario: A recipient opens a tokenized shared proposal
      Given a public visitor requests "/share/client-token?recipient=private-recipient"
      When the edge request policy is applied
      Then the response is private and non-cacheable
      And the response does not disclose the recipient token in a redirect

    @failure @REQ-AUTH-RECOVERY-001
    Scenario: An OAuth callback returns with mismatched state
      Given an OAuth callback failure contains state and code secrets
      When the edge request policy is applied
      Then the response is private and non-cacheable
      And the callback secrets are absent from the recovery destination

    @recovery @REQ-AUTH-RECOVERY-001
    Scenario: OAuth state mismatch recovers through a clean login
      Given an OAuth callback failure contains state and code secrets
      When the edge request policy is applied
      Then the response redirects to a clean login recovery
      And browser cache cookies and storage are cleared
