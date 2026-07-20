-- 0094_enable_admin_dashboard.sql
-- Close-beta operators need /admin (allowlist, users, flags). The 0043 seed
-- left admin_dashboard_enabled at 0, which redirects platform admins to
-- /workshop. Enable the master switch; non-admins remain blocked by
-- isPlatformAdmin in src/app/admin/layout.tsx.

UPDATE feature_flags
SET enabled = 1,
    updated_at = datetime('now'),
    updated_by = NULL
WHERE key = 'admin_dashboard_enabled';
