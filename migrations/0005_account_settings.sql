CREATE TABLE IF NOT EXISTS user_onboarding_profiles (
  user_id TEXT PRIMARY KEY CHECK (length(trim(user_id)) > 0),
  display_name TEXT NOT NULL CHECK (length(trim(display_name)) BETWEEN 1 AND 120),
  user_category TEXT NOT NULL CHECK (
    user_category IN (
      'architect',
      'contractor',
      'engineer',
      'quantity_surveyor',
      'owner_developer',
      'student_educator',
      'other'
    )
  ),
  country_region TEXT NOT NULL CHECK (length(trim(country_region)) BETWEEN 1 AND 80),
  primary_use TEXT CHECK (
    primary_use IS NULL
    OR primary_use IN (
      'project_estimating',
      'cost_library',
      'proposal_packages',
      'learning',
      'other'
    )
  ),
  student_educator_detail TEXT CHECK (
    student_educator_detail IS NULL
    OR length(trim(student_educator_detail)) <= 160
  ),
  marketing_consent_at TEXT,
  onboarding_completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_onboarding_profiles_completed
  ON user_onboarding_profiles(user_id, onboarding_completed_at);

CREATE TABLE IF NOT EXISTS workspace_account_settings (
  workspace_id TEXT PRIMARY KEY CHECK (length(trim(workspace_id)) > 0),
  organization_name TEXT NOT NULL CHECK (length(trim(organization_name)) BETWEEN 1 AND 160),
  organization_type TEXT NOT NULL CHECK (
    organization_type IN (
      'architecture_design',
      'construction_contractor',
      'engineering_consultancy',
      'quantity_surveying',
      'owner_developer',
      'education',
      'solo_practice',
      'other'
    )
  ),
  country_region TEXT NOT NULL CHECK (length(trim(country_region)) BETWEEN 1 AND 80),
  company_size TEXT CHECK (
    company_size IS NULL
    OR company_size IN ('solo', '2_10', '11_50', '51_200', '201_plus')
  ),
  default_currency TEXT NOT NULL DEFAULT 'PHP' CHECK (
    length(default_currency) = 3
    AND default_currency = upper(default_currency)
  ),
  primary_use TEXT CHECK (
    primary_use IS NULL
    OR primary_use IN (
      'project_estimating',
      'cost_library',
      'proposal_packages',
      'learning',
      'other'
    )
  ),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workspace_account_settings_country
  ON workspace_account_settings(country_region);
