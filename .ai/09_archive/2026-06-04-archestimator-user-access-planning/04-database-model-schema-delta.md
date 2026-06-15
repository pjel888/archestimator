# 04 — Database Model & Schema Delta Plan

**Status:** Planning  
**Last updated:** 2026-06-04

---

## 1. Overview

This document defines the exact database changes needed to support Type 3 — Paid Client Archive Subscriber. All changes are **additive** — no existing tables, columns, RLS policies, or functions are dropped or altered in breaking ways.

---

## 2. New Tables

### 2.1 `client_archive_subscriptions`

The canonical subscription record for paid archive access.

```sql
CREATE TYPE public.subscription_status AS ENUM (
  'trialing', 'active', 'past_due', 'canceled', 'expired'
);

CREATE TABLE public.client_archive_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identity
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL CHECK (email = lower(email)),
  
  -- Stripe
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  
  -- Lifecycle
  status public.subscription_status NOT NULL DEFAULT 'trialing',
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX client_archive_subscriptions_user_id_idx
  ON public.client_archive_subscriptions(user_id);
CREATE INDEX client_archive_subscriptions_stripe_customer_idx
  ON public.client_archive_subscriptions(stripe_customer_id);
CREATE INDEX client_archive_subscriptions_status_idx
  ON public.client_archive_subscriptions(status, current_period_end);

-- RLS
ALTER TABLE public.client_archive_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can view own subscription"
  ON public.client_archive_subscriptions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "platform admins can manage all subscriptions"
  ON public.client_archive_subscriptions
  FOR ALL USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- Service role bypass for Stripe webhooks
CREATE POLICY "service role can manage subscriptions"
  ON public.client_archive_subscriptions
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
```

---

### 2.2 `client_archive_snapshots`

Deletion-independent archive of published proposals. **No FK to `projects` or `project_publications`** — survives cascade deletion.

```sql
CREATE TABLE public.client_archive_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Subscriber
  subscription_id UUID NOT NULL
    REFERENCES public.client_archive_subscriptions(id) ON DELETE CASCADE,
  
  -- Source references (nullable — become NULL when source is deleted)
  source_publication_id UUID,  -- NO FK constraint
  source_project_id UUID,      -- NO FK constraint
  source_workspace_id UUID,    -- NO FK constraint
  
  -- Denormalized contractor info (survives contractor deletion)
  contractor_user_id UUID,     -- NO FK constraint
  contractor_name TEXT NOT NULL,
  contractor_email TEXT,
  
  -- Denormalized project info
  project_name TEXT NOT NULL,
  project_code TEXT,
  client_name TEXT,
  location TEXT,
  currency_code TEXT NOT NULL DEFAULT 'PHP',
  
  -- Frozen estimate data (from publication snapshot)
  estimate_data JSONB NOT NULL,
  -- Structure: { estimates: [{ name, revision_label, nodes: [...], row_items: [...], totals: {...} }], activity: [...], comments: [...], decisions: [...] }
  
  -- Lifecycle
  snapshot_version INTEGER NOT NULL DEFAULT 1,
  source_published_at TIMESTAMPTZ,
  source_deleted_at TIMESTAMPTZ,  -- Set when source project is deleted
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX client_archive_snapshots_subscription_idx
  ON public.client_archive_snapshots(subscription_id, created_at DESC);
CREATE INDEX client_archive_snapshots_source_project_idx
  ON public.client_archive_snapshots(source_project_id)
  WHERE source_project_id IS NOT NULL;
CREATE INDEX client_archive_snapshots_contractor_idx
  ON public.client_archive_snapshots(contractor_user_id)
  WHERE contractor_user_id IS NOT NULL;

-- Search index on denormalized text fields
CREATE INDEX client_archive_snapshots_search_idx
  ON public.client_archive_snapshots
  USING gin (to_tsvector('english', coalesce(project_name, '') || ' ' || coalesce(client_name, '') || ' ' || coalesce(contractor_name, '')));

-- RLS
ALTER TABLE public.client_archive_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscribers can view own archive snapshots"
  ON public.client_archive_snapshots
  FOR SELECT USING (
    subscription_id IN (
      SELECT id FROM public.client_archive_subscriptions
      WHERE user_id = auth.uid()
        AND status IN ('trialing', 'active', 'past_due')
    )
  );

CREATE POLICY "platform admins can view all archive snapshots"
  ON public.client_archive_snapshots
  FOR SELECT USING (public.is_platform_admin());

-- No INSERT/UPDATE/DELETE for authenticated users
-- Snapshots are created by service_role (via publication trigger or edge function)
CREATE POLICY "service role can manage archive snapshots"
  ON public.client_archive_snapshots
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Revoke direct access
REVOKE ALL ON TABLE public.client_archive_snapshots FROM public, anon, authenticated;
GRANT SELECT ON TABLE public.client_archive_snapshots TO authenticated;
```

---

### 2.3 `deletion_tombstones`

Records that a project/estimate was deleted while subscribers existed. Used to mark `source_deleted_at` on archive snapshots and prevent data loss.

```sql
CREATE TYPE public.tombstone_entity_type AS ENUM ('project', 'estimate');

CREATE TABLE public.deletion_tombstones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What was deleted
  entity_type public.tombstone_entity_type NOT NULL,
  entity_id UUID NOT NULL,        -- Original project/estimate ID
  entity_name TEXT NOT NULL,      -- Denormalized name at deletion time
  
  -- Context
  workspace_id UUID,              -- NO FK constraint
  deleted_by UUID,                -- NO FK constraint (references auth.users)
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Affected subscribers
  affected_subscription_ids UUID[] NOT NULL DEFAULT '{}',
  affected_snapshot_count INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  deletion_correlation_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX deletion_tombstones_entity_idx
  ON public.deletion_tombstones(entity_type, entity_id);
CREATE INDEX deletion_tombstones_workspace_idx
  ON public.deletion_tombstones(workspace_id, deleted_at DESC);

-- RLS
ALTER TABLE public.deletion_tombstones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace admins can view tombstones in their workspace"
  ON public.deletion_tombstones
  FOR SELECT USING (
    workspace_id IS NOT NULL
    AND public.is_workspace_admin(workspace_id)
  );

CREATE POLICY "platform admins can view all tombstones"
  ON public.deletion_tombstones
  FOR SELECT USING (public.is_platform_admin());

-- Tombstones are created by service_role only
CREATE POLICY "service role can manage tombstones"
  ON public.deletion_tombstones
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.deletion_tombstones FROM public, anon, authenticated;
GRANT SELECT ON TABLE public.deletion_tombstones TO authenticated;
```

---

### 2.4 `client_archive_subscription_events`

Audit log for subscription lifecycle events (created by Stripe webhooks).

```sql
CREATE TYPE public.subscription_event_type AS ENUM (
  'created', 'updated', 'trial_started', 'trial_ending',
  'payment_succeeded', 'payment_failed', 'canceled', 'expired',
  'reactivated', 'deleted'
);

CREATE TABLE public.client_archive_subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL
    REFERENCES public.client_archive_subscriptions(id) ON DELETE CASCADE,
  event_type public.subscription_event_type NOT NULL,
  stripe_event_id TEXT UNIQUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX client_archive_subscription_events_sub_idx
  ON public.client_archive_subscription_events(subscription_id, created_at DESC);

ALTER TABLE public.client_archive_subscription_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can view own subscription events"
  ON public.client_archive_subscription_events
  FOR SELECT USING (
    subscription_id IN (
      SELECT id FROM public.client_archive_subscriptions
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "service role can manage subscription events"
  ON public.client_archive_subscription_events
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.client_archive_subscription_events FROM public, anon, authenticated;
GRANT SELECT ON TABLE public.client_archive_subscription_events TO authenticated;
```

---

## 3. New Types/Enums

```sql
DO $$
BEGIN
  CREATE TYPE public.subscription_status AS ENUM (
    'trialing', 'active', 'past_due', 'canceled', 'expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.subscription_event_type AS ENUM (
    'created', 'updated', 'trial_started', 'trial_ending',
    'payment_succeeded', 'payment_failed', 'canceled', 'expired',
    'reactivated', 'deleted'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.tombstone_entity_type AS ENUM ('project', 'estimate');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
```

---

## 4. New RPC Functions

### 4.1 `create_archive_snapshot_for_publication`

Called when a publication is created or republished. Creates an independent archive snapshot for all active subscribers who are recipients of this publication.

```sql
CREATE OR REPLACE FUNCTION public.create_archive_snapshot_for_publication(
  p_publication_id UUID
)
RETURNS SETOF UUID  -- Returns created snapshot IDs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pub public.project_publications;
  v_recipient RECORD;
  v_sub RECORD;
  v_snapshot_id UUID;
BEGIN
  -- Get publication
  SELECT * INTO v_pub
  FROM public.project_publications
  WHERE id = p_publication_id;

  IF v_pub IS NULL THEN
    RAISE EXCEPTION 'Publication not found.';
  END IF;

  -- For each recipient who has an active subscription
  FOR v_recipient IN
    SELECT r.email, r.display_name
    FROM public.shared_link_recipients r
    WHERE r.publication_id = p_publication_id
  LOOP
    -- Find active subscription for this email
    FOR v_sub IN
      SELECT s.id, s.user_id
      FROM public.client_archive_subscriptions s
      WHERE s.email = v_recipient.email
        AND s.status IN ('trialing', 'active', 'past_due')
    LOOP
      -- Create archive snapshot
      INSERT INTO public.client_archive_snapshots (
        subscription_id,
        source_publication_id,
        source_project_id,
        source_workspace_id,
        contractor_user_id,
        contractor_name,
        contractor_email,
        project_name,
        project_code,
        client_name,
        location,
        currency_code,
        estimate_data,
        snapshot_version,
        source_published_at
      ) VALUES (
        v_sub.id,
        v_pub.id,
        v_pub.project_id,
        v_pub.workspace_id,
        v_pub.published_by,
        coalesce((SELECT p.display_name FROM public.profiles p WHERE p.id = v_pub.published_by), 'Unknown Contractor'),
        (SELECT p.email FROM public.profiles p WHERE p.id = v_pub.published_by),
        (SELECT p.name FROM public.projects p WHERE p.id = v_pub.project_id),
        (SELECT p.project_code FROM public.projects p WHERE p.id = v_pub.project_id),
        (SELECT p.client_name FROM public.projects p WHERE p.id = v_pub.project_id),
        (SELECT p.location FROM public.projects p WHERE p.id = v_pub.project_id),
        coalesce((SELECT p.currency_code FROM public.projects p WHERE p.id = v_pub.project_id), 'PHP'),
        v_pub.snapshot_json,
        v_pub.snapshot_version,
        v_pub.published_at
      )
      RETURNING id INTO v_snapshot_id;

      RETURN NEXT v_snapshot_id;
    END LOOP;
  END LOOP;

  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.create_archive_snapshot_for_publication(UUID) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_archive_snapshot_for_publication(UUID) TO service_role;
```

---

### 4.2 `mark_archive_snapshots_source_deleted`

Called when a project or estimate is deleted. Updates all affected archive snapshots to record the deletion.

```sql
CREATE OR REPLACE FUNCTION public.mark_archive_snapshots_source_deleted(
  p_entity_type public.tombstone_entity_type,
  p_entity_id UUID,
  p_entity_name TEXT,
  p_workspace_id UUID,
  p_deleted_by UUID,
  p_correlation_id UUID DEFAULT gen_random_uuid()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_affected_ids UUID[];
  v_tombstone_id UUID;
  v_sub_count INTEGER;
BEGIN
  -- Find affected snapshots
  IF p_entity_type = 'project' THEN
    SELECT array_agg(id) INTO v_affected_ids
    FROM public.client_archive_snapshots
    WHERE source_project_id = p_entity_id;
  ELSE
    -- For estimates: estimate_data carries the estimate IDs inside JSONB
    -- This is a simplified check; production would extract from JSONB
    SELECT array_agg(id) INTO v_affected_ids
    FROM public.client_archive_snapshots
    WHERE source_project_id IN (
      SELECT e.project_id FROM public.estimates e WHERE e.id = p_entity_id
    );
  END IF;

  v_sub_count := cardinality(coalesce(v_affected_ids, '{}'::UUID[]));

  -- Mark snapshots
  IF v_sub_count > 0 THEN
    UPDATE public.client_archive_snapshots
    SET source_deleted_at = now()
    WHERE id = ANY(v_affected_ids);
  END IF;

  -- Create tombstone
  INSERT INTO public.deletion_tombstones (
    entity_type, entity_id, entity_name,
    workspace_id, deleted_by,
    affected_subscription_ids,
    affected_snapshot_count,
    deletion_correlation_id
  ) VALUES (
    p_entity_type, p_entity_id, p_entity_name,
    p_workspace_id, p_deleted_by,
    COALESCE((
      SELECT array_agg(DISTINCT subscription_id)
      FROM public.client_archive_snapshots
      WHERE id = ANY(v_affected_ids)
    ), '{}'::UUID[]),
    v_sub_count,
    p_correlation_id
  )
  RETURNING id INTO v_tombstone_id;

  RETURN jsonb_build_object(
    'ok', true,
    'tombstone_id', v_tombstone_id,
    'affected_snapshot_count', v_sub_count,
    'correlation_id', p_correlation_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.mark_archive_snapshots_source_deleted(
  public.tombstone_entity_type, UUID, TEXT, UUID, UUID, UUID
) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_archive_snapshots_source_deleted(
  public.tombstone_entity_type, UUID, TEXT, UUID, UUID, UUID
) TO service_role;
```

---

### 4.3 `check_project_has_active_subscribers`

Blocks deletion when subscribers have active archives from this project.

```sql
CREATE OR REPLACE FUNCTION public.check_project_has_active_subscribers(
  p_project_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.client_archive_snapshots s
    JOIN public.client_archive_subscriptions sub
      ON sub.id = s.subscription_id
    WHERE s.source_project_id = p_project_id
      AND sub.status IN ('trialing', 'active', 'past_due')
      AND s.source_deleted_at IS NULL
  );
$$;

REVOKE ALL ON FUNCTION public.check_project_has_active_subscribers(UUID) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.check_project_has_active_subscribers(UUID) TO authenticated;
```

---

## 5. Migration to Existing `preview_bulk_delete_projects`

The existing deletion preview function must be extended to check for active archive subscribers:

```sql
-- ADD this check inside the CTE in preview_bulk_delete_projects:
-- After the existing active_publications CTE:

active_subscribers AS (
  SELECT DISTINCT s.source_project_id AS project_id
  FROM public.client_archive_snapshots s
  JOIN public.client_archive_subscriptions sub
    ON sub.id = s.subscription_id
  JOIN requested r ON r.id = s.source_project_id
  WHERE sub.status IN ('trialing', 'active', 'past_due')
    AND s.source_deleted_at IS NULL
),

-- Then in the classified CTE, add:
WHEN asp.project_id IS NOT NULL THEN 'blocked'
-- becomes:
WHEN ap.project_id IS NOT NULL THEN 'blocked'
WHEN asp.project_id IS NOT NULL THEN 'blocked'

-- And the message:
'Project has an active published shared link.'
-- add after it:
'Project has active paid client archive subscribers. Revoke access or wait for subscriptions to expire before deleting.'

-- In the eligible case, also call mark_archive_snapshots_source_deleted
-- for eligible projects AFTER deletion, via execute_bulk_delete_projects
```

---

## 6. Stripe Webhook Route

New API route to handle Stripe webhooks:

```
POST /api/webhooks/stripe
```

**Purpose:** Receives Stripe events (`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`) and updates `client_archive_subscriptions` accordingly.

**Implementation pattern:** Follow the existing Resend webhook pattern (`/api/webhooks/resend`) — verify Stripe signature using `STRIPE_WEBHOOK_SECRET`, parse event, update subscription state.

---

## 7. New Columns (Existing Tables)

### `project_publications`

No changes needed. The existing `snapshot_json` column is sufficient — archive snapshots are created from it.

### `shared_link_recipients`

Add a nullable FK hint for identity upgrade:

```sql
ALTER TABLE public.shared_link_recipients
  ADD COLUMN IF NOT EXISTS upgraded_to_user_id UUID
    REFERENCES auth.users(id) ON DELETE SET NULL;
```

This tracks when a recipient upgrades from Type 4 to Type 3.

---

## 8. Migration File Plan

All changes should be applied as a single sequenced migration:

```
supabase/migrations/20260604XX0000_client_archive_subscription_core.sql
```

Order within the migration:
1. New types/enums
2. `client_archive_subscriptions` table + indexes + RLS
3. `client_archive_snapshots` table + indexes + RLS
4. `deletion_tombstones` table + indexes + RLS
5. `client_archive_subscription_events` table + indexes + RLS
6. RPC: `create_archive_snapshot_for_publication`
7. RPC: `mark_archive_snapshots_source_deleted`
8. RPC: `check_project_has_active_subscribers`
9. `shared_link_recipients.upgraded_to_user_id` column
10. `preview_bulk_delete_projects` update (add subscriber check)
11. `execute_bulk_delete_projects` update (call `mark_archive_snapshots_source_deleted` after successful deletion)
12. Grants and revokes

---

## 9. Data Integrity Guarantees

1. **Archive snapshots are immutable** — no UPDATE policy for authenticated users
2. **Only `source_deleted_at` is mutable** — and only by service_role via `mark_archive_snapshots_source_deleted`
3. **No FK to source tables** — `source_project_id`, `source_publication_id`, `source_workspace_id` have NO foreign key constraints; they intentionally become dangling references when source is deleted
4. **Cascade only within archive domain** — `client_archive_snapshots` cascades from `client_archive_subscriptions`, which cascades from `auth.users`. No cross-domain cascades to project/estimate tables.
5. **Subscription status gates** — archive reads check subscription status; expired/canceled subscriptions cannot read archives
6. **Tombstone audit trail** — every source deletion that affects subscribers is permanently recorded
