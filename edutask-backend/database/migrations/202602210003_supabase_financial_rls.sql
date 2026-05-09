-- ============================================================================
-- Supabase Financial RLS Baseline (schema-aligned)
-- JWT claims expected:
--   app_user_id : uuid
--   app_role    : student|admin|system
--
-- Security posture:
--   - RLS enabled and forced on financial + core tables.
--   - anon/authenticated have SELECT-only policies.
--   - No client INSERT/UPDATE/DELETE policies are created.
--   - service_role (backend only) bypasses RLS by design.
-- ============================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.current_user_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_claim text;
BEGIN
  v_claim := COALESCE(NULLIF(auth.jwt() ->> 'app_user_id', ''), NULLIF(auth.jwt() ->> 'sub', ''));
  IF v_claim IS NULL THEN
    RETURN NULL;
  END IF;
  BEGIN
    RETURN v_claim::uuid;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;
END;
$$;

CREATE OR REPLACE FUNCTION app.current_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(NULLIF(auth.jwt() ->> 'app_role', ''), 'anonymous');
$$;

CREATE OR REPLACE FUNCTION app.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT app.current_role() = 'admin';
$$;

-- Drop old policies (idempotent re-apply).
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'users',
        'profiles',
        'tasks',
        'wallets',
        'escrows',
        'disputes',
        'ledger_entries',
        'withdrawal_requests',
        'idempotency_keys',
        'audit_logs',
        'transactions'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END $$;

-- Enable + force RLS and revoke table privileges for client roles.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users',
    'profiles',
    'tasks',
    'wallets',
    'escrows',
    'disputes',
    'ledger_entries',
    'withdrawal_requests',
    'idempotency_keys',
    'audit_logs'
  ]
  LOOP
    IF to_regclass(format('public.%s', t)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', t);
    END IF;
  END LOOP;

  -- Optional compatibility if a legacy transactions table exists.
  IF to_regclass('public.transactions') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.transactions FORCE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE ALL ON TABLE public.transactions FROM anon, authenticated';
  END IF;
END $$;

-- USERS
CREATE POLICY users_select_self
ON public.users
FOR SELECT
TO authenticated
USING (id = app.current_user_id());

CREATE POLICY users_select_admin
ON public.users
FOR SELECT
TO authenticated
USING (app.is_admin());

-- PROFILES
CREATE POLICY profiles_select_self
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = app.current_user_id());

CREATE POLICY profiles_select_admin
ON public.profiles
FOR SELECT
TO authenticated
USING (app.is_admin());

-- TASKS
CREATE POLICY tasks_select_scoped
ON public.tasks
FOR SELECT
TO authenticated
USING (
  app.is_admin()
  OR (to_jsonb(tasks) ->> 'poster_id') = app.current_user_id()::text
  OR (to_jsonb(tasks) ->> 'poster_user_id') = app.current_user_id()::text
  OR (to_jsonb(tasks) ->> 'selected_executor_id') = app.current_user_id()::text
  OR (to_jsonb(tasks) ->> 'executor_user_id') = app.current_user_id()::text
  OR status IN ('published', 'application_open')
);

-- WALLETS
CREATE POLICY wallets_select_own
ON public.wallets
FOR SELECT
TO authenticated
USING (user_id = app.current_user_id());

CREATE POLICY wallets_select_admin
ON public.wallets
FOR SELECT
TO authenticated
USING (app.is_admin());

-- ESCROWS
CREATE POLICY escrows_select_involved
ON public.escrows
FOR SELECT
TO authenticated
USING (
  app.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.wallets wp
    WHERE wp.id = escrows.poster_wallet_id
      AND wp.user_id = app.current_user_id()
  )
  OR EXISTS (
    SELECT 1
    FROM public.wallets we
    WHERE we.id = escrows.executor_wallet_id
      AND we.user_id = app.current_user_id()
  )
  OR EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = escrows.task_id
      AND (
        (to_jsonb(t) ->> 'poster_id') = app.current_user_id()::text
        OR (to_jsonb(t) ->> 'poster_user_id') = app.current_user_id()::text
        OR (to_jsonb(t) ->> 'selected_executor_id') = app.current_user_id()::text
        OR (to_jsonb(t) ->> 'executor_user_id') = app.current_user_id()::text
      )
  )
  OR (to_jsonb(escrows) ->> 'poster_user_id') = app.current_user_id()::text
  OR (to_jsonb(escrows) ->> 'executor_user_id') = app.current_user_id()::text
);

-- DISPUTES
CREATE POLICY disputes_select_involved
ON public.disputes
FOR SELECT
TO authenticated
USING (
  app.is_admin()
  OR filed_by_user_id = app.current_user_id()
  OR EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = disputes.task_id
      AND (
        (to_jsonb(t) ->> 'poster_id') = app.current_user_id()::text
        OR (to_jsonb(t) ->> 'poster_user_id') = app.current_user_id()::text
        OR (to_jsonb(t) ->> 'selected_executor_id') = app.current_user_id()::text
        OR (to_jsonb(t) ->> 'executor_user_id') = app.current_user_id()::text
      )
  )
);

-- LEDGER ENTRIES (read-only)
CREATE POLICY ledger_entries_select_scoped
ON public.ledger_entries
FOR SELECT
TO authenticated
USING (
  app.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.wallets w
    WHERE w.id = ledger_entries.wallet_id
      AND w.user_id = app.current_user_id()
  )
  OR EXISTS (
    SELECT 1
    FROM public.escrows e
    JOIN public.wallets wp ON wp.id = e.poster_wallet_id
    LEFT JOIN public.wallets we ON we.id = e.executor_wallet_id
    WHERE e.id = ledger_entries.escrow_id
      AND (
        wp.user_id = app.current_user_id()
        OR we.user_id = app.current_user_id()
      )
  )
);

-- WITHDRAWAL REQUESTS
CREATE POLICY withdrawal_requests_select_own
ON public.withdrawal_requests
FOR SELECT
TO authenticated
USING (user_id = app.current_user_id());

CREATE POLICY withdrawal_requests_select_admin
ON public.withdrawal_requests
FOR SELECT
TO authenticated
USING (app.is_admin());

-- IDEMPOTENCY KEYS
CREATE POLICY idempotency_keys_select_own
ON public.idempotency_keys
FOR SELECT
TO authenticated
USING (
  (to_jsonb(idempotency_keys) ->> 'user_id') = app.current_user_id()::text
  OR (to_jsonb(idempotency_keys) ->> 'actor_user_id') = app.current_user_id()::text
);

CREATE POLICY idempotency_keys_select_admin
ON public.idempotency_keys
FOR SELECT
TO authenticated
USING (app.is_admin());

-- AUDIT LOGS (admin only)
CREATE POLICY audit_logs_select_admin
ON public.audit_logs
FOR SELECT
TO authenticated
USING (app.is_admin());

-- Optional legacy transactions read policy if table exists.
DO $$
BEGIN
  IF to_regclass('public.transactions') IS NOT NULL THEN
    EXECUTE $SQL$
      CREATE POLICY transactions_select_scoped
      ON public.transactions
      FOR SELECT
      TO authenticated
      USING (
        app.is_admin()
        OR (to_jsonb(transactions) ->> 'user_id') = app.current_user_id()::text
      )
    $SQL$;
  END IF;
END $$;

COMMIT;
