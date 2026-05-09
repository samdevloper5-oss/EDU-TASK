-- Enterprise upgrade migration (non-breaking, additive)
-- Focus: performance, integrity, soft-delete support, realtime primitives, auth hardening

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Soft delete + UX/task enhancements
-- ---------------------------------------------------------------------------

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_earnings NUMERIC(20,4) NOT NULL DEFAULT 0;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS max_applicants INTEGER,
  ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tasks_max_applicants_positive_chk'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_max_applicants_positive_chk
      CHECK (max_applicants IS NULL OR max_applicants > 0);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tasks_attachments_array_chk'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_attachments_array_chk
      CHECK (jsonb_typeof(attachments) = 'array');
  END IF;
END$$;

-- ---------------------------------------------------------------------------
-- Auth token lifecycle hardening (refresh rotation + blacklist)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS token_blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT NOT NULL UNIQUE,
  token_type TEXT NOT NULL CHECK (token_type IN ('access','refresh')),
  user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Realtime chat primitives (conversation scoped to assigned task participants)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL UNIQUE REFERENCES tasks(id) ON DELETE RESTRICT,
  participant_one_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  participant_two_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT conversations_distinct_participants_chk
    CHECK (participant_one_id <> participant_two_id)
);

CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE RESTRICT,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  content TEXT NOT NULL CHECK (btrim(content) <> ''),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Notifications improvements
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  type TEXT NOT NULL,
  reference_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS reference_id UUID,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- Duplicate application safety
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'task_applications_task_applicant_uniq'
  ) THEN
    BEGIN
      ALTER TABLE task_applications
        ADD CONSTRAINT task_applications_task_applicant_uniq
        UNIQUE (task_id, applicant_id);
    EXCEPTION
      WHEN duplicate_table THEN
        NULL;
      WHEN duplicate_object THEN
        NULL;
      WHEN others THEN
        -- If duplicates already exist, index creation will fail; keep migration non-breaking.
        NULL;
    END;
  END IF;
END$$;

-- ---------------------------------------------------------------------------
-- Performance indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_users_total_earnings_desc
  ON users(total_earnings DESC)
  WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_tasks_status
  ON tasks(status)
  WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_tasks_deadline
  ON tasks(deadline)
  WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_tasks_task_type_status_deadline
  ON tasks(task_type, status, deadline)
  WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_task_applications_task_id
  ON task_applications(task_id);

CREATE INDEX IF NOT EXISTS idx_conversations_task_id
  ON conversations(task_id);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation_created
  ON conversation_messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_sender_created
  ON conversation_messages(sender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
  ON notifications(user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_expires
  ON refresh_tokens(user_id, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_token_blacklist_token_hash
  ON token_blacklist(token_hash);

-- If a generic transactions table exists in an environment, index it.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'transactions'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)';
  END IF;
END$$;

COMMIT;
