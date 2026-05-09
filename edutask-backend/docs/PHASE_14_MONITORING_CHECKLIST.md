# Phase 14 Monitoring Checklist

## Financial Safety Alerts
1. `negative_balance_attempt_total > 0`
2. `escrow_double_release_attempt_total > 0`
3. `invalid_state_transition_attempt_total > 0`
4. `transaction_rollbacks_total` spike over baseline

## Database Performance Alerts
1. `slow_query_detected` sustained for 10+ minutes
2. `serializable_transaction_slow` sustained for 10+ minutes
3. DB pool saturation:
   - `active_db_connections >= 80% of PGPOOL_MAX`
   - `db_pool_waiting_clients > 0` sustained

## Reconciliation Alerts
Run `database/ops/reconciliation_checks.sql` and alert if any query returns non-zero mismatches:
1. negative wallet rows
2. wallet-to-locked-escrow mismatch
3. orphan references
4. unbalanced journals

## Deadlock and Retry Visibility
1. Count and alert SQLSTATE `40P01`.
2. Count and alert SQLSTATE `40001`.
3. Track endpoint-level retry counts and failures.

