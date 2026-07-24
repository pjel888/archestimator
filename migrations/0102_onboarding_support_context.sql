ALTER TABLE support_message_context
  ADD COLUMN onboarding_flow_key TEXT CHECK (
    onboarding_flow_key IS NULL OR onboarding_flow_key IN (
      'core_orientation',
      'collaborator_orientation',
      'first_estimate_value',
      'guided_estimate_practice',
      'estimate_reader_orientation',
      'library_reuse',
      'client_link_publishing'
    )
  );

ALTER TABLE support_message_context
  ADD COLUMN onboarding_flow_version INTEGER CHECK (
    onboarding_flow_version IS NULL
    OR onboarding_flow_version BETWEEN 1 AND 1000
  );

ALTER TABLE support_message_context
  ADD COLUMN onboarding_step_key TEXT CHECK (
    onboarding_step_key IS NULL
    OR length(trim(onboarding_step_key)) BETWEEN 1 AND 80
  );

ALTER TABLE support_message_context
  ADD COLUMN onboarding_reason_code TEXT CHECK (
    onboarding_reason_code IS NULL
    OR length(trim(onboarding_reason_code)) BETWEEN 1 AND 80
  );

ALTER TABLE support_message_context
  ADD COLUMN onboarding_route_key TEXT CHECK (
    onboarding_route_key IS NULL
    OR length(trim(onboarding_route_key)) BETWEEN 1 AND 80
  );

ALTER TABLE support_message_context
  ADD COLUMN onboarding_viewport_class TEXT CHECK (
    onboarding_viewport_class IS NULL
    OR onboarding_viewport_class IN ('mobile', 'desktop')
  );

CREATE INDEX IF NOT EXISTS idx_support_message_context_onboarding_flow
  ON support_message_context(onboarding_flow_key, onboarding_reason_code)
  WHERE onboarding_flow_key IS NOT NULL;
