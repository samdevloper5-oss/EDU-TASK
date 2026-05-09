-- Operational hardening recommendations
-- Review each statement before applying in production.
-- These are non-business-logic safety settings.

-- ============================================================================
-- 1) Session safety defaults for backend role
-- Replace app_backend with your actual backend DB role.
-- ============================================================================
-- ALTER ROLE app_backend SET lock_timeout = '2s';
-- ALTER ROLE app_backend SET statement_timeout = '8s';
-- ALTER ROLE app_backend SET idle_in_transaction_session_timeout = '15s';

-- ============================================================================
-- 2) Idempotency hot-path index
-- ============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_idempotency_in_progress_hot
ON idempotency_keys (user_id, endpoint, idempotency_key, created_at DESC)
WHERE status = 'in_progress';

-- ============================================================================
-- 3) Escrow terminal-state immutability
-- ============================================================================
CREATE OR REPLACE FUNCTION enforce_escrow_terminal_immutability()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IN ('released', 'refunded') THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.amount IS DISTINCT FROM OLD.amount
       OR NEW.poster_wallet_id IS DISTINCT FROM OLD.poster_wallet_id
       OR NEW.executor_wallet_id IS DISTINCT FROM OLD.executor_wallet_id
       OR NEW.release_type IS DISTINCT FROM OLD.release_type
       OR NEW.task_id IS DISTINCT FROM OLD.task_id THEN
      RAISE EXCEPTION 'terminal escrow rows are immutable';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS escrows_terminal_immutability_guard ON escrows;
CREATE TRIGGER escrows_terminal_immutability_guard
BEFORE UPDATE ON escrows
FOR EACH ROW EXECUTE FUNCTION enforce_escrow_terminal_immutability();

