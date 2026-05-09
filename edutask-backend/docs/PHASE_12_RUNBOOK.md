# Phase 12 Operational Runbook

## 1. DB Outage Procedure
1. Confirm DB failure via `/health` and `db_query_failed` logs.
2. Freeze non-critical traffic entry points if needed at gateway level.
3. Verify DB recovery status with infrastructure team.
4. After recovery, validate:
   - `active_db_connections`
   - error-rate metrics
   - dispute/escrow endpoints health.

## 2. Lock Contention Response
1. Check `serializable_transaction_slow` and `slow_query_detected`.
2. Identify hottest endpoints from request logs.
3. If contention is severe, reduce automation concurrency (no behavior change).
4. Keep idempotency and rate-limit protections enabled.

## 3. High Error Rate Response
1. Split by error family:
   - client side (`http_4xx_total`)
   - server side (`http_5xx_total`)
2. Inspect recent deploy and config changes.
3. If regression suspected, execute rollback protocol immediately.

## 4. Rollback Procedure
1. Redeploy previous known-good application artifact.
2. Keep same database schema (Phase 12 has no migrations).
3. Re-validate `/health` and `/metrics` after rollback.

## 5. Automation Disable Steps
1. Set `ENABLE_AUTOMATION=false`.
2. Restart service gracefully.
3. Confirm automation inactivity via logs and `automation_expire_total` plateau.

## 6. Financial Invariant Counters
Any increase in:
1. `escrow_double_release_attempt_total`
2. `negative_balance_attempt_total`
3. `invalid_state_transition_attempt_total`

must trigger incident review and timeline reconstruction using `request_id`.
